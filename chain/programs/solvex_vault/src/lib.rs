use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("8oi1inxaWoWmY7FjEEERuCdbGdCQpfgAg2KHyXFYAkP8");

pub const JUPITER_V6_ID: Pubkey = pubkey!("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");
pub const MAX_QUOTE_TTL_SECONDS: i64 = 300;
pub const SECONDS_PER_DAY: i64 = 86_400;

#[program]
pub mod solvex_vault {
    use super::*;

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        agent: Pubkey,
        limits: VaultLimits,
    ) -> Result<()> {
        require!(agent != Pubkey::default(), VaultError::InvalidAgent);
        require!(
            ctx.accounts.base_mint.key() != ctx.accounts.quote_mint.key(),
            VaultError::IdenticalMints
        );
        limits.validate()?;

        let vault = &mut ctx.accounts.vault_state;
        vault.version = 1;
        vault.owner = ctx.accounts.owner.key();
        vault.agent = agent;
        vault.base_mint = ctx.accounts.base_mint.key();
        vault.quote_mint = ctx.accounts.quote_mint.key();
        vault.base_custody = ctx.accounts.base_custody.key();
        vault.quote_custody = ctx.accounts.quote_custody.key();
        vault.max_principal_base = limits.max_principal_base;
        vault.max_trade_base = limits.max_trade_base;
        vault.max_trade_quote = limits.max_trade_quote;
        vault.max_daily_base = limits.max_daily_base;
        vault.max_daily_quote = limits.max_daily_quote;
        vault.deposited_principal_base = 0;
        vault.daily_spent_base = 0;
        vault.daily_spent_quote = 0;
        vault.day_bucket = current_day(Clock::get()?.unix_timestamp);
        vault.execution_nonce = 0;
        vault.paused = true;
        vault.bump = ctx.bumps.vault_state;

        emit!(VaultInitialized {
            vault: vault.key(),
            owner: vault.owner,
            agent,
            base_mint: vault.base_mint,
            quote_mint: vault.quote_mint,
            max_principal_base: vault.max_principal_base,
        });
        Ok(())
    }

    pub fn set_agent(ctx: Context<OwnerControl>, new_agent: Pubkey) -> Result<()> {
        require!(new_agent != Pubkey::default(), VaultError::InvalidAgent);
        let old_agent = ctx.accounts.vault_state.agent;
        ctx.accounts.vault_state.agent = new_agent;
        emit!(AgentChanged {
            vault: ctx.accounts.vault_state.key(),
            old_agent,
            new_agent,
        });
        Ok(())
    }

    pub fn set_limits(ctx: Context<OwnerControl>, limits: VaultLimits) -> Result<()> {
        limits.validate()?;
        let vault = &mut ctx.accounts.vault_state;
        require!(
            limits.max_principal_base >= vault.deposited_principal_base,
            VaultError::LimitBelowDepositedPrincipal
        );
        vault.max_principal_base = limits.max_principal_base;
        vault.max_trade_base = limits.max_trade_base;
        vault.max_trade_quote = limits.max_trade_quote;
        vault.max_daily_base = limits.max_daily_base;
        vault.max_daily_quote = limits.max_daily_quote;
        emit!(LimitsChanged {
            vault: vault.key(),
            limits,
        });
        Ok(())
    }

    pub fn set_paused(ctx: Context<OwnerControl>, paused: bool) -> Result<()> {
        ctx.accounts.vault_state.paused = paused;
        emit!(PauseChanged {
            vault: ctx.accounts.vault_state.key(),
            paused,
        });
        Ok(())
    }

    pub fn deposit_base(ctx: Context<DepositBase>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);
        let vault = &mut ctx.accounts.vault_state;
        require!(!vault.paused, VaultError::VaultPaused);
        let new_principal = vault
            .deposited_principal_base
            .checked_add(amount)
            .ok_or(VaultError::MathOverflow)?;
        require!(
            new_principal <= vault.max_principal_base,
            VaultError::PrincipalLimitExceeded
        );

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.owner_base_account.to_account_info(),
                    to: ctx.accounts.base_custody.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            amount,
        )?;
        vault.deposited_principal_base = new_principal;
        emit!(BaseDeposited {
            vault: vault.key(),
            amount,
            deposited_principal_base: new_principal,
        });
        Ok(())
    }

    pub fn withdraw_base(ctx: Context<WithdrawBase>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);
        require!(
            amount <= ctx.accounts.base_custody.amount,
            VaultError::InsufficientCustodyBalance
        );
        transfer_from_vault(
            &ctx.accounts.vault_state,
            &ctx.accounts.base_custody,
            &ctx.accounts.owner_base_account,
            &ctx.accounts.token_program,
            amount,
        )?;
        let vault = &mut ctx.accounts.vault_state;
        vault.deposited_principal_base = vault.deposited_principal_base.saturating_sub(amount);
        emit!(BaseWithdrawn {
            vault: vault.key(),
            amount,
            deposited_principal_base: vault.deposited_principal_base,
        });
        Ok(())
    }

    pub fn withdraw_quote(ctx: Context<WithdrawQuote>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);
        require!(
            amount <= ctx.accounts.quote_custody.amount,
            VaultError::InsufficientCustodyBalance
        );
        transfer_from_vault(
            &ctx.accounts.vault_state,
            &ctx.accounts.quote_custody,
            &ctx.accounts.owner_quote_account,
            &ctx.accounts.token_program,
            amount,
        )?;
        emit!(QuoteWithdrawn {
            vault: ctx.accounts.vault_state.key(),
            amount,
        });
        Ok(())
    }

    pub fn reconcile_empty_vault(ctx: Context<ReconcileEmptyVault>) -> Result<()> {
        require!(
            ctx.accounts.base_custody.amount == 0 && ctx.accounts.quote_custody.amount == 0,
            VaultError::VaultNotEmpty
        );
        ctx.accounts.vault_state.deposited_principal_base = 0;
        Ok(())
    }

    pub fn execute_jupiter_swap<'a, 'b, 'c: 'info, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, ExecuteJupiterSwap<'info>>,
        amount_in: u64,
        min_amount_out: u64,
        quote_expires_at: i64,
        decision_hash: [u8; 32],
        swap_data: Vec<u8>,
    ) -> Result<()> {
        require!(amount_in > 0 && min_amount_out > 0, VaultError::ZeroAmount);
        require!(!swap_data.is_empty(), VaultError::EmptySwapData);

        let now = Clock::get()?.unix_timestamp;
        require!(quote_expires_at >= now, VaultError::QuoteExpired);
        require!(
            quote_expires_at <= now.saturating_add(MAX_QUOTE_TTL_SECONDS),
            VaultError::QuoteTtlTooLong
        );

        let vault = &mut ctx.accounts.vault_state;
        require!(!vault.paused, VaultError::VaultPaused);
        require_keys_eq!(ctx.accounts.agent.key(), vault.agent, VaultError::UnauthorizedAgent);
        require_keys_eq!(
            ctx.accounts.jupiter_program.key(),
            JUPITER_V6_ID,
            VaultError::InvalidJupiterProgram
        );

        let direction = validate_custody_pair(
            vault,
            &ctx.accounts.input_custody,
            &ctx.accounts.output_custody,
        )?;
        roll_day_if_needed(vault, now);
        apply_trade_limits(vault, direction, amount_in)?;
        require!(
            ctx.accounts.input_custody.amount >= amount_in,
            VaultError::InsufficientCustodyBalance
        );

        let input_before = ctx.accounts.input_custody.amount;
        let output_before = ctx.accounts.output_custody.amount;
        let mut metas = Vec::with_capacity(ctx.remaining_accounts.len());
        let mut infos = Vec::with_capacity(ctx.remaining_accounts.len() + 1);
        for account in ctx.remaining_accounts.iter() {
            let is_vault_signer = account.key() == vault.key();
            if account.is_writable {
                metas.push(anchor_lang::solana_program::instruction::AccountMeta::new(
                    account.key(),
                    account.is_signer || is_vault_signer,
                ));
            } else {
                metas.push(anchor_lang::solana_program::instruction::AccountMeta::new_readonly(
                    account.key(),
                    account.is_signer || is_vault_signer,
                ));
            }
            infos.push(account.clone());
        }
        infos.push(ctx.accounts.jupiter_program.to_account_info());

        let instruction = Instruction {
            program_id: JUPITER_V6_ID,
            accounts: metas,
            data: swap_data,
        };
        let owner = vault.owner;
        let signer_seeds: &[&[u8]] = &[b"vault", owner.as_ref(), &[vault.bump]];
        invoke_signed(&instruction, &infos, &[signer_seeds])?;

        ctx.accounts.input_custody.reload()?;
        ctx.accounts.output_custody.reload()?;
        let amount_spent = input_before
            .checked_sub(ctx.accounts.input_custody.amount)
            .ok_or(VaultError::InvalidSwapBalanceChange)?;
        let amount_received = ctx
            .accounts
            .output_custody
            .amount
            .checked_sub(output_before)
            .ok_or(VaultError::InvalidSwapBalanceChange)?;
        require!(amount_spent > 0 && amount_spent <= amount_in, VaultError::InputLimitExceeded);
        require!(amount_received >= min_amount_out, VaultError::MinimumOutputNotMet);

        vault.execution_nonce = vault
            .execution_nonce
            .checked_add(1)
            .ok_or(VaultError::MathOverflow)?;
        emit!(SwapExecuted {
            vault: vault.key(),
            agent: ctx.accounts.agent.key(),
            input_mint: ctx.accounts.input_custody.mint,
            output_mint: ctx.accounts.output_custody.mint,
            amount_spent,
            amount_received,
            decision_hash,
            execution_nonce: vault.execution_nonce,
        });
        Ok(())
    }
}

fn transfer_from_vault<'info>(
    vault: &Account<'info, VaultState>,
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
    amount: u64,
) -> Result<()> {
    let owner = vault.owner;
    let signer_seeds: &[&[u8]] = &[b"vault", owner.as_ref(), &[vault.bump]];
    token::transfer(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            Transfer {
                from: from.to_account_info(),
                to: to.to_account_info(),
                authority: vault.to_account_info(),
            },
            &[signer_seeds],
        ),
        amount,
    )
}

fn validate_custody_pair(
    vault: &VaultState,
    input: &TokenAccount,
    output: &TokenAccount,
) -> Result<SwapDirection> {
    if input.mint == vault.base_mint && output.mint == vault.quote_mint {
        return Ok(SwapDirection::BaseToQuote);
    }
    if input.mint == vault.quote_mint && output.mint == vault.base_mint {
        return Ok(SwapDirection::QuoteToBase);
    }
    err!(VaultError::InvalidCustodyPair)
}

fn current_day(timestamp: i64) -> i64 {
    timestamp.div_euclid(SECONDS_PER_DAY)
}

fn roll_day_if_needed(vault: &mut VaultState, timestamp: i64) {
    let day = current_day(timestamp);
    if day != vault.day_bucket {
        vault.day_bucket = day;
        vault.daily_spent_base = 0;
        vault.daily_spent_quote = 0;
    }
}

fn apply_trade_limits(vault: &mut VaultState, direction: SwapDirection, amount: u64) -> Result<()> {
    let (per_trade, daily_limit, daily_spent) = match direction {
        SwapDirection::BaseToQuote => (
            vault.max_trade_base,
            vault.max_daily_base,
            &mut vault.daily_spent_base,
        ),
        SwapDirection::QuoteToBase => (
            vault.max_trade_quote,
            vault.max_daily_quote,
            &mut vault.daily_spent_quote,
        ),
    };
    require!(amount <= per_trade, VaultError::TradeLimitExceeded);
    let next_daily = daily_spent.checked_add(amount).ok_or(VaultError::MathOverflow)?;
    require!(next_daily <= daily_limit, VaultError::DailyLimitExceeded);
    *daily_spent = next_daily;
    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct VaultLimits {
    pub max_principal_base: u64,
    pub max_trade_base: u64,
    pub max_trade_quote: u64,
    pub max_daily_base: u64,
    pub max_daily_quote: u64,
}

impl VaultLimits {
    fn validate(&self) -> Result<()> {
        require!(self.max_principal_base > 0, VaultError::InvalidLimits);
        require!(
            self.max_trade_base > 0
                && self.max_trade_quote > 0
                && self.max_daily_base > 0
                && self.max_daily_quote > 0,
            VaultError::InvalidLimits
        );
        require!(
            self.max_trade_base <= self.max_principal_base
                && self.max_trade_base <= self.max_daily_base
                && self.max_trade_quote <= self.max_daily_quote,
            VaultError::InvalidLimits
        );
        Ok(())
    }
}

#[derive(Clone, Copy)]
enum SwapDirection {
    BaseToQuote,
    QuoteToBase,
}

#[account]
pub struct VaultState {
    pub version: u8,
    pub owner: Pubkey,
    pub agent: Pubkey,
    pub base_mint: Pubkey,
    pub quote_mint: Pubkey,
    pub base_custody: Pubkey,
    pub quote_custody: Pubkey,
    pub max_principal_base: u64,
    pub deposited_principal_base: u64,
    pub max_trade_base: u64,
    pub max_trade_quote: u64,
    pub max_daily_base: u64,
    pub max_daily_quote: u64,
    pub daily_spent_base: u64,
    pub daily_spent_quote: u64,
    pub day_bucket: i64,
    pub execution_nonce: u64,
    pub paused: bool,
    pub bump: u8,
}

impl VaultState {
    pub const LEN: usize = 8 + 320;
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = owner,
        space = VaultState::LEN,
        seeds = [b"vault", owner.key().as_ref()],
        bump,
    )]
    pub vault_state: Account<'info, VaultState>,
    #[account(
        init,
        payer = owner,
        associated_token::mint = base_mint,
        associated_token::authority = vault_state,
    )]
    pub base_custody: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = owner,
        associated_token::mint = quote_mint,
        associated_token::authority = vault_state,
    )]
    pub quote_custody: Account<'info, TokenAccount>,
    pub base_mint: Account<'info, Mint>,
    pub quote_mint: Account<'info, Mint>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct OwnerControl<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault_state.bump,
        has_one = owner @ VaultError::UnauthorizedOwner,
    )]
    pub vault_state: Account<'info, VaultState>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DepositBase<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault_state.bump,
        has_one = owner @ VaultError::UnauthorizedOwner,
        has_one = base_custody,
    )]
    pub vault_state: Account<'info, VaultState>,
    #[account(mut, token::mint = vault_state.base_mint, token::authority = owner)]
    pub owner_base_account: Account<'info, TokenAccount>,
    #[account(mut, token::mint = vault_state.base_mint, token::authority = vault_state)]
    pub base_custody: Account<'info, TokenAccount>,
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawBase<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault_state.bump,
        has_one = owner @ VaultError::UnauthorizedOwner,
        has_one = base_custody,
    )]
    pub vault_state: Account<'info, VaultState>,
    #[account(mut, token::mint = vault_state.base_mint, token::authority = owner)]
    pub owner_base_account: Account<'info, TokenAccount>,
    #[account(mut, token::mint = vault_state.base_mint, token::authority = vault_state)]
    pub base_custody: Account<'info, TokenAccount>,
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawQuote<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault_state.bump,
        has_one = owner @ VaultError::UnauthorizedOwner,
        has_one = quote_custody,
    )]
    pub vault_state: Account<'info, VaultState>,
    #[account(mut, token::mint = vault_state.quote_mint, token::authority = owner)]
    pub owner_quote_account: Account<'info, TokenAccount>,
    #[account(mut, token::mint = vault_state.quote_mint, token::authority = vault_state)]
    pub quote_custody: Account<'info, TokenAccount>,
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ReconcileEmptyVault<'info> {
    #[account(
        mut,
        seeds = [b"vault", owner.key().as_ref()],
        bump = vault_state.bump,
        has_one = owner @ VaultError::UnauthorizedOwner,
        has_one = base_custody,
        has_one = quote_custody,
    )]
    pub vault_state: Account<'info, VaultState>,
    pub base_custody: Account<'info, TokenAccount>,
    pub quote_custody: Account<'info, TokenAccount>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteJupiterSwap<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault_state.owner.as_ref()],
        bump = vault_state.bump,
    )]
    pub vault_state: Account<'info, VaultState>,
    #[account(mut, token::authority = vault_state)]
    pub input_custody: Account<'info, TokenAccount>,
    #[account(mut, token::authority = vault_state)]
    pub output_custody: Account<'info, TokenAccount>,
    pub agent: Signer<'info>,
    /// CHECK: Address is pinned to the canonical Jupiter v6 program in the handler.
    pub jupiter_program: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[event]
pub struct VaultInitialized {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub agent: Pubkey,
    pub base_mint: Pubkey,
    pub quote_mint: Pubkey,
    pub max_principal_base: u64,
}

#[event]
pub struct AgentChanged {
    pub vault: Pubkey,
    pub old_agent: Pubkey,
    pub new_agent: Pubkey,
}

#[event]
pub struct LimitsChanged {
    pub vault: Pubkey,
    pub limits: VaultLimits,
}

#[event]
pub struct PauseChanged {
    pub vault: Pubkey,
    pub paused: bool,
}

#[event]
pub struct BaseDeposited {
    pub vault: Pubkey,
    pub amount: u64,
    pub deposited_principal_base: u64,
}

#[event]
pub struct BaseWithdrawn {
    pub vault: Pubkey,
    pub amount: u64,
    pub deposited_principal_base: u64,
}

#[event]
pub struct QuoteWithdrawn {
    pub vault: Pubkey,
    pub amount: u64,
}

#[event]
pub struct SwapExecuted {
    pub vault: Pubkey,
    pub agent: Pubkey,
    pub input_mint: Pubkey,
    pub output_mint: Pubkey,
    pub amount_spent: u64,
    pub amount_received: u64,
    pub decision_hash: [u8; 32],
    pub execution_nonce: u64,
}

#[error_code]
pub enum VaultError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Agent authority is invalid")]
    InvalidAgent,
    #[msg("Base and quote mints must differ")]
    IdenticalMints,
    #[msg("Vault limits are inconsistent")]
    InvalidLimits,
    #[msg("New principal limit is below already deposited principal")]
    LimitBelowDepositedPrincipal,
    #[msg("Vault is paused")]
    VaultPaused,
    #[msg("Principal limit exceeded")]
    PrincipalLimitExceeded,
    #[msg("Caller is not the vault owner")]
    UnauthorizedOwner,
    #[msg("Caller is not the configured agent")]
    UnauthorizedAgent,
    #[msg("Custody balance is insufficient")]
    InsufficientCustodyBalance,
    #[msg("Vault custody accounts must both be empty")]
    VaultNotEmpty,
    #[msg("Only the canonical Jupiter v6 program is allowed")]
    InvalidJupiterProgram,
    #[msg("Input and output must be the configured base/quote custody pair")]
    InvalidCustodyPair,
    #[msg("Jupiter instruction data cannot be empty")]
    EmptySwapData,
    #[msg("Quote has expired")]
    QuoteExpired,
    #[msg("Quote expiry is too far in the future")]
    QuoteTtlTooLong,
    #[msg("Per-trade limit exceeded")]
    TradeLimitExceeded,
    #[msg("Daily turnover limit exceeded")]
    DailyLimitExceeded,
    #[msg("Swap spent more input than approved")]
    InputLimitExceeded,
    #[msg("Swap returned less than the minimum approved output")]
    MinimumOutputNotMet,
    #[msg("Swap produced an invalid custody balance change")]
    InvalidSwapBalanceChange,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn state() -> VaultState {
        VaultState {
            version: 1,
            owner: Pubkey::new_unique(),
            agent: Pubkey::new_unique(),
            base_mint: Pubkey::new_unique(),
            quote_mint: Pubkey::new_unique(),
            base_custody: Pubkey::new_unique(),
            quote_custody: Pubkey::new_unique(),
            max_principal_base: 1_000,
            deposited_principal_base: 500,
            max_trade_base: 100,
            max_trade_quote: 1_000_000,
            max_daily_base: 250,
            max_daily_quote: 2_000_000,
            daily_spent_base: 0,
            daily_spent_quote: 0,
            day_bucket: 10,
            execution_nonce: 0,
            paused: false,
            bump: 255,
        }
    }

    #[test]
    fn enforces_trade_and_daily_limits() {
        let mut vault = state();
        assert!(apply_trade_limits(&mut vault, SwapDirection::BaseToQuote, 100).is_ok());
        assert_eq!(vault.daily_spent_base, 100);
        assert!(apply_trade_limits(&mut vault, SwapDirection::BaseToQuote, 101).is_err());
        assert!(apply_trade_limits(&mut vault, SwapDirection::BaseToQuote, 100).is_ok());
        assert!(apply_trade_limits(&mut vault, SwapDirection::BaseToQuote, 51).is_err());
    }

    #[test]
    fn resets_daily_counters_on_new_utc_day() {
        let mut vault = state();
        vault.daily_spent_base = 200;
        vault.daily_spent_quote = 500;
        roll_day_if_needed(&mut vault, 11 * SECONDS_PER_DAY);
        assert_eq!(vault.day_bucket, 11);
        assert_eq!(vault.daily_spent_base, 0);
        assert_eq!(vault.daily_spent_quote, 0);
    }
}

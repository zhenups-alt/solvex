import React, { useCallback, useEffect, useState } from 'react';
import { Card, Button, Badge } from '../components/UI';
import { Monitor, Globe, Languages, Pause, Play, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import { usePhantom } from '../components/WalletContextProvider';
import { useLanguage } from '../i18n';
import { controlPaper, getPaperAccount, PaperAccount } from '../lib/paperApi';
import { ensureWalletSession } from '../lib/solvexApi';
import { loadVaultState, VaultOnChainState } from '../lib/vaultClient';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { address, publicKey, connection, network, signMessage } = usePhantom();
  const { language, setLanguage, tr } = useLanguage();

  const [paperAccount, setPaperAccount] = useState<PaperAccount | null>(null);
  const [vaultState, setVaultState] = useState<VaultOnChainState | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [pausingAgent, setPausingAgent] = useState(false);
  const [confirmingPause, setConfirmingPause] = useState(false);

  const refreshState = useCallback(async () => {
    if (!address) {
      setPaperAccount(null);
      setVaultState(null);
      return;
    }
    setLoadingStatus(true);
    try {
      const [paperRes, vaultRes] = await Promise.all([
        getPaperAccount(address).catch(() => ({ account: null })),
        publicKey ? loadVaultState(connection, publicKey).catch(() => null) : Promise.resolve(null),
      ]);
      setPaperAccount(paperRes.account);
      setVaultState(vaultRes);
    } finally {
      setLoadingStatus(false);
    }
  }, [address, publicKey, connection]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const handlePauseAgent = async () => {
    if (!address) {
      toast.error(tr('Connect wallet first', 'Сначала подключите кошелёк'));
      return;
    }
    if (!paperAccount) {
      toast.error(tr('No active autopilot session found for this wallet.', 'Для этого кошелька не найдено активной сессии автопилота.'));
      return;
    }

    const nextAction = paperAccount.status === 'running' ? 'pause' : 'resume';
    setPausingAgent(true);
    try {
      await ensureWalletSession(address, signMessage);
      await controlPaper(address, nextAction);
      toast.success(
        nextAction === 'pause'
          ? tr('Agent paused successfully. Future rebalancing cycles halted.', 'Агент успешно приостановлен. Циклы ребалансировки остановлены.')
          : tr('Agent resumed successfully.', 'Агент успешно возобновлён.')
      );
      setConfirmingPause(false);
      await refreshState();
    } catch (error) {
      toast.error(
        tr('Failed to update agent state', 'Не удалось изменить состояние агента'),
        { description: error instanceof Error ? error.message : undefined }
      );
    } finally {
      setPausingAgent(false);
    }
  };

  const isAgentRunning = paperAccount?.status === 'running';

  return (
    <div className="p-4 md:p-8 max-w-4xl space-y-12">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">{tr('Settings', 'Настройки')}</h1>
        <p className="text-text-secondary mt-1">{tr('Manage your account and application preferences.', 'Управляйте настройками аккаунта и приложения.')}</p>
      </header>

      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">{tr('Appearance', 'Интерфейс')}</h2>
          <Card className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Monitor className="text-text-muted" size={20} />
              <div>
                <div className="text-sm font-medium">{tr('Theme', 'Тема')}</div>
                <div className="text-xs text-text-muted">{tr('Dark mode is the default for Solvex.', 'Тёмная тема используется в Solvex по умолчанию.')}</div>
              </div>
            </div>
            <Badge>{tr('Dark Only', 'Только тёмная')}</Badge>
          </Card>
          <Card className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Languages className="text-text-muted" size={20} />
              <div>
                <div className="text-sm font-medium">{tr('Interface language', 'Язык интерфейса')}</div>
                <div className="text-xs text-text-muted">{tr('The choice is saved in this browser.', 'Выбор сохраняется в этом браузере.')}</div>
              </div>
            </div>
            <div className="flex rounded-md border border-border-default p-1">
              <button onClick={() => setLanguage('ru')} className={`rounded px-3 py-1 text-xs font-bold ${language === 'ru' ? 'bg-accent text-bg-base' : 'text-text-muted'}`}>RU</button>
              <button onClick={() => setLanguage('en')} className={`rounded px-3 py-1 text-xs font-bold ${language === 'en' ? 'bg-accent text-bg-base' : 'text-text-muted'}`}>EN</button>
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">{tr('Network', 'Сеть')}</h2>
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Globe className="text-text-muted" size={20} />
                <div>
                  <div className="text-sm font-medium">{tr('Cluster', 'Кластер')}</div>
                  <div className="text-xs text-text-muted">{tr(`Currently connected to Solana ${network}.`, `Сейчас подключена сеть Solana ${network}.`)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-accent-dim border border-accent-border rounded-md">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="text-[11px] font-mono text-accent uppercase font-bold">{network}</span>
              </div>
            </div>
            <div className="pt-4 border-t border-border-subtle">
              <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">{tr('Custom RPC Endpoint', 'Собственный RPC-адрес')}</label>
              <input 
                type="text" 
                placeholder="https://api.devnet.solana.com"
                className="w-full bg-bg-elevated border border-border-default rounded-md h-10 px-4 text-sm font-mono focus:outline-none focus:border-accent"
              />
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-negative">{tr('Danger Zone & Safety Controls', 'Опасная зона и контроль безопасности')}</h2>
            {address && (
              <Badge variant={isAgentRunning ? 'positive' : 'warning'}>
                {loadingStatus
                  ? tr('Checking status…', 'Проверка статуса…')
                  : isAgentRunning
                  ? tr('Autopilot Active', 'Автопилот активен')
                  : paperAccount
                  ? tr('Autopilot Paused', 'Автопилот на паузе')
                  : tr('No Active Session', 'Нет активной сессии')}
              </Badge>
            )}
          </div>

          <Card className="p-6 border-negative/20 bg-negative-dim/5 space-y-6">
            {/* Pause / Resume Agent */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-text-primary flex items-center gap-2">
                    {tr('Emergency Pause Agent', 'Аварийная остановка агента')}
                    {paperAccount && (
                      <Badge variant={isAgentRunning ? 'positive' : 'warning'}>
                        {isAgentRunning ? tr('Running', 'Работает') : tr('Paused', 'На паузе')}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {tr(
                      'Immediately halts the autopilot cycle worker for this wallet. No further proposals or virtual orders will be scheduled.',
                      'Немедленно останавливает фоновый воркер автопилота для этого кошелька. Новые предложения и ордера не будут создаваться.'
                    )}
                  </div>
                </div>

                {!confirmingPause ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pausingAgent || !address || !paperAccount}
                    onClick={() => setConfirmingPause(true)}
                    className="border-negative text-negative hover:bg-negative-dim shrink-0 gap-2"
                  >
                    {isAgentRunning ? <Pause size={14} /> : <Play size={14} />}
                    {isAgentRunning ? tr('Pause Agent', 'Приостановить') : tr('Resume Agent', 'Возобновить')}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmingPause(false)}
                      disabled={pausingAgent}
                    >
                      {tr('Cancel', 'Отмена')}
                    </Button>
                    <Button
                      size="sm"
                      disabled={pausingAgent}
                      onClick={() => void handlePauseAgent()}
                      className="bg-negative hover:bg-negative/90 text-white font-bold gap-2"
                    >
                      {pausingAgent ? tr('Processing…', 'Обработка…') : tr('Confirm', 'Подтвердить')}
                    </Button>
                  </div>
                )}
              </div>

              {!address && (
                <div className="p-3 rounded-lg bg-bg-card border border-border-subtle text-xs text-warning">
                  {tr('Connect your Phantom wallet to manage agent lifecycle.', 'Подключите кошелёк Phantom для управления агентом.')}
                </div>
              )}
            </div>

            {/* Vault Lifecycle Management */}
            <div className="pt-6 border-t border-negative/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-text-primary flex items-center gap-2">
                    {tr('Vault Account Lifecycle', 'Жизненный цикл аккаунта Vault')}
                    {vaultState && (
                      <Badge variant={vaultState.paused ? 'warning' : 'positive'}>
                        {vaultState.paused ? tr('On-chain Paused', 'Ончейн на паузе') : tr('On-chain Active', 'Ончейн активен')}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {tr(
                      'The deployed on-chain program (solvex_vault v1) does not implement account burning/closing. Full closure is executed by pausing the vault and withdrawing 100% of custody funds.',
                      'Развёрнутая ончейн-программа (solvex_vault v1) не поддерживает удаление PDA-аккаунта. Полное закрытие позиций выполняется через ончейн-паузу и 100% вывод средств.'
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link to="/vault">
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink size={14} /> {tr('Manage in Vault', 'Управление в Vault')}
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-bg-card border border-border-subtle text-xs text-text-secondary space-y-2">
                <div className="flex items-center gap-2 text-text-primary font-medium">
                  <Info size={14} className="text-accent" />
                  {tr('Supported On-Chain Actions:', 'Поддерживаемые ончейн-операции:')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-text-muted">
                  <div>• <strong className="text-text-secondary">{tr('Withdraw All Funds:', 'Полный вывод средств:')}</strong> {tr('Reclaims 100% deposited SOL and quote USDC from vault custody.', 'Возвращает 100% внесённого SOL и USDC из кастоди хранилища.')}</div>
                  <div>• <strong className="text-text-secondary">{tr('On-chain Set Paused:', 'Ончейн-пауза:')}</strong> {tr('Sets vault.paused = true; blocks all agent swaps deterministically.', 'Устанавливает vault.paused = true; блокирует любые сделки агента.')}</div>
                </div>
                {vaultState && (
                  <div className="pt-2 border-t border-border-subtle flex justify-between text-[11px]">
                    <span className="text-text-muted">{tr('Custody Balances:', 'Баланс в кастоди:')}</span>
                    <span className="font-mono text-text-primary">{vaultState.baseBalance} SOL · {vaultState.quoteBalance} USDC</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}


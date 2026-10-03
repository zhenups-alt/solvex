import asyncio
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update

from app.config import get_settings
from app.db import SessionFactory
from app.domain.types import TradeAction
from app.models import PaperAccountRecord, PaperEventRecord
from app.services.gemini_agent import GeminiPortfolioAgent
from app.services.market_data import SolMarketDataService
from app.services.paper_engine import PaperState, ai_context, hold, run_paper_cycle

logger = logging.getLogger(__name__)


async def run_account(wallet: str, factory=SessionFactory, market_service=None) -> bool:
    """Lease a due tick, then persist ledger + balances atomically using a version CAS.

    A 45-second due-time lease prevents duplicate model calls and expires after a crash. A pause
    increments the version and invalidates in-flight work. Failed market requests never fill.
    """
    now = datetime.now(UTC)
    async with factory() as session:
        row = await session.scalar(
            select(PaperAccountRecord).where(
                PaperAccountRecord.wallet_address == wallet,
                PaperAccountRecord.status == "running",
                PaperAccountRecord.next_run_at <= now,
            )
        )
        if row is None:
            return False
        version = row.version
        state = PaperState.model_validate(row.state)
    async with factory() as session:
        claimed = await session.execute(
            update(PaperAccountRecord)
            .where(
                PaperAccountRecord.wallet_address == wallet,
                PaperAccountRecord.version == version,
                PaperAccountRecord.status == "running",
                PaperAccountRecord.next_run_at <= now,
            )
            .values(version=version + 1, next_run_at=now + timedelta(seconds=45))
        )
        if claimed.rowcount != 1:
            await session.rollback()
            return False
        await session.commit()
    version += 1
    try:
        market = await (market_service or SolMarketDataService()).get_snapshot()
        advisor = None
        if state.decision_source == "gemini":
            planned, snapshot, context = ai_context(state, market, datetime.now(UTC))
            if planned.action != TradeAction.HOLD:
                try:
                    advisor = await asyncio.wait_for(
                        GeminiPortfolioAgent(get_settings()).propose(
                            state.profile,
                            snapshot,
                            context,
                            language=state.language,
                        ),
                        timeout=20,
                    )
                except TimeoutError:
                    advisor = hold("Gemini request timed out; no virtual trade.")
        state, event = run_paper_cycle(state, market, datetime.now(UTC), advisor)
    except Exception:
        logger.warning("Paper cycle postponed: market or calculation unavailable", exc_info=True)
        state.last_error = (
            "Market data unavailable or invalid. No virtual trade was made; retry scheduled."
        )
        event = {
            "kind": "error",
            "mode": "paper",
            "status": "data_unavailable",
            "message": state.last_error,
            "at": datetime.now(UTC).isoformat(),
            "live_execution_allowed": False,
        }
    next_run = datetime.now(UTC) + timedelta(seconds=state.interval_seconds)
    async with factory() as session:
        changed = await session.execute(
            update(PaperAccountRecord)
            .where(
                PaperAccountRecord.wallet_address == wallet,
                PaperAccountRecord.version == version,
                PaperAccountRecord.status == "running",
            )
            .values(
                state=state.model_dump(mode="json"),
                version=version + 1,
                next_run_at=next_run,
            )
        )
        if changed.rowcount != 1:
            await session.rollback()
            return False
        session.add(PaperEventRecord(wallet_address=wallet, version=version + 1, data=event))
        await session.commit()
    return True


async def worker_loop(stop: asyncio.Event) -> None:
    while not stop.is_set():
        try:
            async with SessionFactory() as session:
                wallets = (
                    await session.scalars(
                        select(PaperAccountRecord.wallet_address)
                        .where(
                            PaperAccountRecord.status == "running",
                            PaperAccountRecord.next_run_at <= datetime.now(UTC),
                        )
                        .order_by(PaperAccountRecord.next_run_at)
                        .limit(50)
                    )
                ).all()
            for wallet in wallets:
                if stop.is_set():
                    break
                await run_account(wallet)
        except Exception:
            logger.exception("Paper worker tick failed; retrying")
        try:
            await asyncio.wait_for(stop.wait(), timeout=5)
        except TimeoutError:
            pass

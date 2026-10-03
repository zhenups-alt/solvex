import asyncio
import time
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

import httpx


@dataclass(frozen=True)
class SolMarketSnapshot:
    price_usd: Decimal
    change_24h_pct: Decimal
    source: str
    captured_at: float


class MarketDataUnavailable(RuntimeError):
    pass


class SolMarketDataService:
    """Small fail-closed market adapter with a short in-process cache."""

    _cached: SolMarketSnapshot | None = None
    _fetched_at = 0.0
    _retry_after = 0.0
    _lock = asyncio.Lock()
    cache_seconds = 60
    endpoint = "https://api.coingecko.com/api/v3/simple/price"

    async def get_snapshot(self) -> SolMarketSnapshot:
        async with self._lock:
            return await self._fetch_snapshot()

    async def _fetch_snapshot(self) -> SolMarketSnapshot:
        now = time.time()
        if (
            self._cached
            and now - self._fetched_at < self.cache_seconds
            and 0 <= now - self._cached.captured_at <= 180
        ):
            return self._cached
        if now < self._retry_after:
            raise MarketDataUnavailable("market data is temporarily unavailable; retry shortly")

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    self.endpoint,
                    params={
                        "ids": "solana",
                        "vs_currencies": "usd",
                        "include_24hr_change": "true",
                        "include_last_updated_at": "true",
                    },
                )
                response.raise_for_status()
                payload = response.json()["solana"]
                snapshot = SolMarketSnapshot(
                    price_usd=Decimal(str(payload["usd"])),
                    change_24h_pct=Decimal(str(payload.get("usd_24h_change", 0))),
                    source="CoinGecko",
                    captured_at=float(payload["last_updated_at"]),
                )
                age = time.time() - snapshot.captured_at
                if (
                    not snapshot.price_usd.is_finite()
                    or snapshot.price_usd <= 0
                    or not snapshot.change_24h_pct.is_finite()
                    or age > 180
                    or age < -30
                ):
                    raise ValueError("Invalid or stale market data")
        except (httpx.HTTPError, KeyError, TypeError, ValueError, InvalidOperation) as error:
            type(self)._retry_after = time.time() + 15
            raise MarketDataUnavailable("current SOL market data is unavailable") from error

        type(self)._cached = snapshot
        type(self)._fetched_at = time.time()
        type(self)._retry_after = 0.0
        return snapshot

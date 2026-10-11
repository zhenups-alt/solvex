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
    """Fail-closed market adapter with CoinGecko primary and Coinbase fallback."""

    _cached: SolMarketSnapshot | None = None
    _fetched_at = 0.0
    _retry_after = 0.0
    _lock = asyncio.Lock()
    cache_seconds = 60
    endpoint = "https://api.coingecko.com/api/v3/simple/price"
    fallback_endpoint = "https://api.coinbase.com/v2/prices/SOL-USD/spot"

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

        # 1. Attempt Primary: CoinGecko
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
                self._validate_snapshot(snapshot)
                self._record_cache(snapshot)
                return snapshot
        except Exception as primary_error:
            # Primary failed or rate limited; attempt Fallback (Coinbase)
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    fb_response = await client.get(self.fallback_endpoint)
                    fb_response.raise_for_status()
                    fb_data = fb_response.json()["data"]
                    fb_price = Decimal(str(fb_data["amount"]))
                    fb_time = time.time()
                    snapshot = SolMarketSnapshot(
                        price_usd=fb_price,
                        change_24h_pct=Decimal("0"),
                        source="Coinbase",
                        captured_at=fb_time,
                    )
                    self._validate_snapshot(snapshot)
                    self._record_cache(snapshot)
                    return snapshot
            except Exception as fallback_error:
                type(self)._retry_after = time.time() + 15
                raise MarketDataUnavailable("current SOL market data is unavailable from all providers") from fallback_error

    @classmethod
    def _validate_snapshot(cls, snapshot: SolMarketSnapshot) -> None:
        age = time.time() - snapshot.captured_at
        if (
            not snapshot.price_usd.is_finite()
            or snapshot.price_usd <= 0
            or not snapshot.change_24h_pct.is_finite()
            or age > 180
            or age < -30
        ):
            raise ValueError("Invalid or stale market data")

    @classmethod
    def _record_cache(cls, snapshot: SolMarketSnapshot) -> None:
        cls._cached = snapshot
        cls._fetched_at = time.time()
        cls._retry_after = 0.0

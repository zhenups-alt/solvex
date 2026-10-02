import time
from dataclasses import dataclass
from decimal import Decimal

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
    cache_seconds = 60
    endpoint = "https://api.coingecko.com/api/v3/simple/price"

    async def get_snapshot(self) -> SolMarketSnapshot:
        now = time.time()
        if self._cached and now - self._cached.captured_at < self.cache_seconds:
            return self._cached

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    self.endpoint,
                    params={
                        "ids": "solana",
                        "vs_currencies": "usd",
                        "include_24hr_change": "true",
                    },
                )
                response.raise_for_status()
                payload = response.json()["solana"]
                snapshot = SolMarketSnapshot(
                    price_usd=Decimal(str(payload["usd"])),
                    change_24h_pct=Decimal(str(payload.get("usd_24h_change", 0))),
                    source="CoinGecko",
                    captured_at=now,
                )
        except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
            raise MarketDataUnavailable("current SOL market data is unavailable") from error

        self._cached = snapshot
        return snapshot

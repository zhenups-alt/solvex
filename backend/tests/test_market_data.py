import time

import httpx
import pytest

from app.services.market_data import MarketDataUnavailable, SolMarketDataService


@pytest.fixture
def market_client(monkeypatch):
    SolMarketDataService._cached = None
    SolMarketDataService._fetched_at = 0
    SolMarketDataService._retry_after = 0
    original = httpx.AsyncClient

    def install(handler):
        monkeypatch.setattr(
            httpx,
            "AsyncClient",
            lambda **kwargs: original(
                transport=httpx.MockTransport(handler),
                **kwargs,
            ),
        )

    yield install
    SolMarketDataService._cached = None
    SolMarketDataService._fetched_at = 0
    SolMarketDataService._retry_after = 0


@pytest.mark.asyncio
async def test_cache_shared_between_instances_and_provider_time_preserved(market_client):
    calls = []
    source_time = time.time() - 90

    def handler(request):
        calls.append(request)
        assert request.url.params["include_last_updated_at"] == "true"
        return httpx.Response(
            200,
            json={
                "solana": {
                    "usd": 120,
                    "usd_24h_change": 2,
                    "last_updated_at": source_time,
                }
            },
        )

    market_client(handler)
    first = await SolMarketDataService().get_snapshot()
    second = await SolMarketDataService().get_snapshot()
    assert first == second
    assert first.captured_at == source_time
    assert len(calls) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize("value", [0, -1, "NaN", "Infinity"])
async def test_invalid_prices_are_unavailable(market_client, value):
    market_client(
        lambda _: httpx.Response(
            200,
            json={
                "solana": {
                    "usd": value,
                    "usd_24h_change": 1,
                    "last_updated_at": time.time(),
                }
            },
        )
    )
    with pytest.raises(MarketDataUnavailable):
        await SolMarketDataService().get_snapshot()


@pytest.mark.asyncio
async def test_old_provider_price_is_not_refreshed_by_fetch_time(market_client):
    market_client(
        lambda _: httpx.Response(
            200,
            json={
                "solana": {
                    "usd": 120,
                    "usd_24h_change": 1,
                    "last_updated_at": time.time() - 600,
                }
            },
        )
    )
    with pytest.raises(MarketDataUnavailable):
        await SolMarketDataService().get_snapshot()

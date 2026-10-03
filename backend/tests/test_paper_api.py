import asyncio
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import httpx
import pytest
import pytest_asyncio
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi import FastAPI
from sqlalchemy import event as sql_event
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api import router as api_router
from app.auth import BASE58
from app.auth import router as auth_router
from app.db import Base, get_session
from app.models import PaperAccountRecord, PaperEventRecord, WalletChallengeRecord
from app.paper_api import router as paper_router
from app.services.market_data import SolMarketSnapshot
from app.services.paper_worker import run_account


def encode58(value):
    number = int.from_bytes(value, "big")
    result = ""
    while number:
        number, remainder = divmod(number, 58)
        result = BASE58[remainder] + result
    return "1" * (len(value) - len(value.lstrip(b"\0"))) + result


@pytest_asyncio.fixture
async def api(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'test.db'}")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def sessions():
        async with factory() as session:
            yield session

    app = FastAPI()
    app.include_router(api_router)
    app.include_router(auth_router)
    app.include_router(paper_router)
    app.dependency_overrides[get_session] = sessions
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app), base_url="http://test"
    ) as client:
        yield client, factory
    await engine.dispose()


async def sign_in(client):
    key = Ed25519PrivateKey.generate()
    wallet = encode58(key.public_key().public_bytes_raw())
    challenge = (
        await client.post(
            "/api/v1/auth/challenge",
            json={
                "wallet_address": wallet,
            },
        )
    ).json()
    payload = {
        "wallet_address": wallet,
        "signature": encode58(
            key.sign(
                challenge["message"].encode(),
            )
        ),
    }
    response = await client.post("/api/v1/auth/verify", json=payload)
    assert response.status_code == 200, response.text
    return wallet, {"Authorization": f"Bearer {response.json()['token']}"}, payload


async def start(client):
    wallet, headers, _ = await sign_in(client)
    profile = {
        "wallet_address": wallet,
        "investment_cap_usd": "100",
        "max_single_trade_usd": "10",
        "max_daily_turnover_usd": "50",
    }
    saved = await client.put(f"/api/v1/profiles/{wallet}", json=profile, headers=headers)
    assert saved.status_code == 200, saved.text
    created = await client.post(
        f"/api/v1/paper/{wallet}/start",
        headers=headers,
        json={
            "initial_usd": "100",
            "interval_seconds": 60,
            "acknowledge_virtual": True,
        },
    )
    assert created.status_code == 201, created.text
    return wallet, headers, profile


class FreshMarket:
    async def get_snapshot(self):
        return SolMarketSnapshot(
            Decimal("100"), Decimal("0"), "test", datetime.now(UTC).timestamp()
        )


@pytest.mark.asyncio
async def test_auth_replay_expiry_and_wrong_wallet(api):
    client, factory = api
    wallet, headers, proof = await sign_in(client)
    assert (await client.post("/api/v1/auth/verify", json=proof)).status_code == 401
    assert (await client.get(f"/api/v1/paper/{wallet}")).status_code == 401
    other, _, _ = await sign_in(client)
    assert (await client.get(f"/api/v1/paper/{other}", headers=headers)).status_code == 403
    await client.post("/api/v1/auth/challenge", json={"wallet_address": wallet})
    assert (await client.post("/api/v1/auth/verify", json=proof)).status_code == 401
    async with factory() as session:
        await session.execute(
            update(WalletChallengeRecord)
            .where(
                WalletChallengeRecord.wallet_address == wallet,
            )
            .values(expires_at=datetime.now(UTC) - timedelta(minutes=1))
        )
        await session.commit()
    assert (await client.post("/api/v1/auth/verify", json=proof)).status_code == 401


@pytest.mark.asyncio
async def test_start_requires_saved_cap_and_acknowledgment(api):
    client, _ = api
    wallet, headers, _ = await start(client)
    duplicate = await client.post(
        f"/api/v1/paper/{wallet}/start",
        headers=headers,
        json={
            "initial_usd": 100,
            "acknowledge_virtual": True,
        },
    )
    assert duplicate.status_code == 409
    assert (
        await client.post(
            f"/api/v1/paper/{wallet}/start",
            headers=headers,
            json={
                "initial_usd": 100,
                "acknowledge_virtual": False,
            },
        )
    ).status_code == 422


@pytest.mark.asyncio
async def test_worker_restart_pause_resume_and_limit_changes(api):
    client, factory = api
    wallet, headers, profile = await start(client)
    assert await run_account(wallet, factory, FreshMarket())
    assert not await run_account(wallet, factory, FreshMarket())  # Due time survives restart.
    data = (await client.get(f"/api/v1/paper/{wallet}", headers=headers)).json()["account"]
    assert data["state"]["trade_count"] == 1
    assert data["live_execution_allowed"] is False
    profile["max_single_trade_usd"] = "5"
    assert (
        await client.put(f"/api/v1/profiles/{wallet}", json=profile, headers=headers)
    ).status_code == 200
    data = (await client.get(f"/api/v1/paper/{wallet}", headers=headers)).json()["account"]
    assert data["status"] == "paused"
    assert not await run_account(wallet, factory, FreshMarket())
    resumed = await client.post(f"/api/v1/paper/{wallet}/resume", headers=headers)
    assert resumed.status_code == 200, resumed.text
    assert Decimal(resumed.json()["account"]["state"]["profile"]["max_single_trade_usd"]) == 5


@pytest.mark.asyncio
async def test_concurrent_cycles_commit_only_one_fill(api):
    client, factory = api
    wallet, headers, _ = await start(client)
    ready, finish = asyncio.Event(), asyncio.Event()

    class BarrierMarket(FreshMarket):
        calls = 0

        async def get_snapshot(self):
            self.calls += 1
            ready.set()
            await asyncio.wait_for(finish.wait(), 5)
            return await super().get_snapshot()

    market = BarrierMarket()
    first = asyncio.create_task(run_account(wallet, factory, market))
    await asyncio.wait_for(ready.wait(), 5)
    assert not await run_account(wallet, factory, market)
    finish.set()
    assert await first
    assert market.calls == 1
    events = (await client.get(f"/api/v1/paper/{wallet}/events", headers=headers)).json()["items"]
    assert sum(event["kind"] == "cycle" for event in events) == 1


@pytest.mark.asyncio
async def test_pause_cancels_an_inflight_cycle(api):
    client, factory = api
    wallet, headers, _ = await start(client)
    fetching, finish = asyncio.Event(), asyncio.Event()

    class SlowMarket(FreshMarket):
        async def get_snapshot(self):
            fetching.set()
            await finish.wait()
            return await super().get_snapshot()

    task = asyncio.create_task(run_account(wallet, factory, SlowMarket()))
    await asyncio.wait_for(fetching.wait(), 5)
    assert (await client.post(f"/api/v1/paper/{wallet}/pause", headers=headers)).status_code == 200
    finish.set()
    assert not await task
    data = (await client.get(f"/api/v1/paper/{wallet}", headers=headers)).json()["account"]
    assert data["state"]["trade_count"] == 0
    assert data["status"] == "paused"


@pytest.mark.asyncio
async def test_market_failure_logs_without_changing_balances(api):
    client, factory = api
    wallet, _, _ = await start(client)

    class BrokenMarket:
        async def get_snapshot(self):
            raise ValueError("stale price")

    assert await run_account(wallet, factory, BrokenMarket())
    async with factory() as session:
        account = await session.get(PaperAccountRecord, wallet)
        assert Decimal(account.state["cash_usd"]) == 100
        assert account.state["trade_count"] == 0
        assert account.state["last_error"]
        events = (
            await session.scalars(
                select(PaperEventRecord).where(
                    PaperEventRecord.wallet_address == wallet,
                )
            )
        ).all()
        assert len(events) == 2


@pytest.mark.asyncio
async def test_ledger_write_failure_rolls_back_balances_and_lease_expires(api):
    client, factory = api
    wallet, _, _ = await start(client)
    sync_engine = factory.kw["bind"].sync_engine

    def fail_ledger(conn, cursor, statement, parameters, context, executemany):
        if statement.startswith("INSERT INTO paper_events"):
            raise RuntimeError("injected ledger failure")

    sql_event.listen(sync_engine, "before_cursor_execute", fail_ledger)
    try:
        with pytest.raises(RuntimeError, match="injected ledger failure"):
            await run_account(wallet, factory, FreshMarket())
    finally:
        sql_event.remove(sync_engine, "before_cursor_execute", fail_ledger)
    async with factory() as session:
        account = await session.get(PaperAccountRecord, wallet)
        assert account.state["trade_count"] == 0
        assert Decimal(account.state["cash_usd"]) == 100
        # Emulate recovery after the persisted lease expires, without resetting history.
        await session.execute(
            update(PaperAccountRecord)
            .where(
                PaperAccountRecord.wallet_address == wallet,
            )
            .values(next_run_at=datetime.now(UTC) - timedelta(seconds=1))
        )
        await session.commit()
    assert await run_account(wallet, factory, FreshMarket())

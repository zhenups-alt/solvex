import subprocess
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app import serve
from app.config import Settings
from app.main import readiness


def cloud_settings(**overrides):
    values = {
        "SOLVEX_ENVIRONMENT": "production",
        "SOLVEX_DATABASE_URL": "postgresql+asyncpg://user:test%25pass@db.example/test?ssl=verify-full",
        "SOLVEX_AUTO_CREATE_TABLES": False,
        "SOLVEX_EXECUTION_ENABLED": False,
        "SOLVEX_SOLANA_CLUSTER": "devnet",
        "SOLVEX_CORS_ORIGINS": "https://solvex.example",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def test_cloud_settings_accept_persistent_postgres_and_exact_origins():
    assert serve.validate_deployment(cloud_settings(), "10000") == 10000
    assert serve.validate_deployment(cloud_settings(
        SOLVEX_CORS_ORIGINS="https://solvex.example,https://preview.solvex.example",
    ), "8080") == 8080


@pytest.mark.parametrize("overrides", [
    {"SOLVEX_ENVIRONMENT": "development"},
    {"SOLVEX_AUTO_CREATE_TABLES": True},
    {"SOLVEX_EXECUTION_ENABLED": True},
    {"SOLVEX_SOLANA_CLUSTER": "mainnet-beta"},
    {"SOLVEX_DATABASE_URL": "sqlite+aiosqlite:///local.db"},
    {"SOLVEX_DATABASE_URL": "postgresql://user:secret@db.example/test"},
    {"SOLVEX_DATABASE_URL": "not-a-url-secret"},
    {"SOLVEX_DATABASE_URL": "postgresql+asyncpg://user:secret@db.example/test?sslmode=require"},
    {"SOLVEX_CORS_ORIGINS": ""},
    {"SOLVEX_CORS_ORIGINS": "http://localhost:3000"},
    {"SOLVEX_CORS_ORIGINS": "https://localhost"},
    {"SOLVEX_CORS_ORIGINS": "https://solvex.example/"},
    {"SOLVEX_CORS_ORIGINS": "https://*.vercel.app"},
    {"SOLVEX_CORS_ORIGINS": "https://user:secret@solvex.example"},
])
def test_cloud_startup_rejects_unsafe_configuration_without_echoing_secrets(overrides):
    with pytest.raises(ValueError) as error:
        serve.validate_deployment(cloud_settings(**overrides), "8080")
    assert "secret" not in str(error.value)
    assert "test%25pass" not in str(error.value)


@pytest.mark.parametrize("port", ["0", "-1", "65536", "not-a-number"])
def test_cloud_startup_rejects_invalid_port(port):
    with pytest.raises(ValueError, match="PORT"):
        serve.validate_deployment(cloud_settings(), port)


def test_migration_failure_prevents_server_start(monkeypatch):
    monkeypatch.setattr(serve, "Settings", cloud_settings)
    migrate = Mock(side_effect=subprocess.CalledProcessError(1, "alembic"))
    start = Mock()
    monkeypatch.setattr(serve.subprocess, "run", migrate)
    monkeypatch.setattr(serve.os, "execv", start)
    with pytest.raises(subprocess.CalledProcessError):
        serve.main()
    assert migrate.call_args.kwargs["check"] is True
    start.assert_not_called()


def test_cloud_startup_migrates_before_single_worker_server(monkeypatch):
    monkeypatch.setattr(serve, "Settings", cloud_settings)
    monkeypatch.setenv("PORT", "10000")
    calls = []
    monkeypatch.setattr(serve.subprocess, "run", lambda *a, **k: calls.append((a, k)))
    monkeypatch.setattr(serve.os, "execv", lambda *a: calls.append((a, {})))
    serve.main()
    assert calls[0][0][0][-2:] == ["upgrade", "head"]
    server_args = calls[1][0][1]
    assert server_args[server_args.index("--port") + 1] == "10000"
    assert server_args[server_args.index("--workers") + 1] == "1"


def request_with_worker(done=False):
    return SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(
        paper_worker=SimpleNamespace(done=lambda: done),
    )))


@pytest.mark.asyncio
async def test_readiness_requires_database_and_running_worker():
    session = SimpleNamespace(execute=AsyncMock())
    result = await readiness(request_with_worker(), session)
    assert result == {"ok": True, "database": "ready", "paper_worker": "running"}
    session.execute.assert_awaited_once()
    with pytest.raises(HTTPException) as error:
        await readiness(request_with_worker(done=True), session)
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_readiness_redacts_database_failure():
    session = SimpleNamespace(execute=AsyncMock(side_effect=OperationalError(
        "secret query", {}, Exception("secret connection details"),
    )))
    with pytest.raises(HTTPException) as error:
        await readiness(request_with_worker(), session)
    assert error.value.status_code == 503
    assert error.value.detail == "Database is not ready"

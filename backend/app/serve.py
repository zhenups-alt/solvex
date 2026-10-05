"""Cloud entry point for the Devnet/paper MVP. Run from the repository root."""

import os
import subprocess
import sys
from urllib.parse import urlsplit

from sqlalchemy.engine import make_url

from app.config import Settings


def validate_deployment(settings: Settings, port: str) -> int:
    if settings.environment != "production":
        raise ValueError("Cloud startup requires SOLVEX_ENVIRONMENT=production")
    if settings.execution_enabled or settings.solana_cluster != "devnet":
        raise ValueError("This release supports only Devnet/paper trading; live execution is off")
    if settings.auto_create_tables:
        raise ValueError("Set SOLVEX_AUTO_CREATE_TABLES=false; cloud startup applies migrations")
    try:
        database = make_url(settings.database_url)
    except Exception:
        raise ValueError("SOLVEX_DATABASE_URL is not a valid database URL") from None
    if database.drivername != "postgresql+asyncpg" or not database.host:
        raise ValueError("Use a persistent PostgreSQL database with a postgresql+asyncpg URL")
    if "sslmode" in database.query or "channel_binding" in database.query:
        raise ValueError("Use the asyncpg connection format (ssl=verify-full, not libpq options)")
    if not settings.cors_origin_list:
        raise ValueError("Set SOLVEX_CORS_ORIGINS to the public frontend HTTPS origin")
    for origin in settings.cors_origin_list:
        parsed = urlsplit(origin)
        if (
            parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password
            or parsed.path or parsed.query or parsed.fragment or "*" in parsed.netloc
            or parsed.hostname in {"localhost", "127.0.0.1", "::1", "*"}
        ):
            raise ValueError("CORS must contain exact HTTPS origins, without paths or wildcards")
    try:
        parsed_port = int(port)
    except ValueError:
        raise ValueError("PORT must be an integer between 1 and 65535") from None
    if not 1 <= parsed_port <= 65535:
        raise ValueError("PORT must be an integer between 1 and 65535")
    return parsed_port


def main() -> None:
    settings = Settings()
    try:
        port = validate_deployment(settings, os.environ.get("PORT", "8080"))
    except ValueError as error:
        raise SystemExit(str(error)) from None
    # Migration failure must stop deployment, never start against a partial schema.
    subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "backend/alembic.ini", "upgrade", "head"],
        check=True,
    )
    os.execv(sys.executable, [
        sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0",
        "--port", str(port), "--workers", "1", "--no-access-log",
    ])


if __name__ == "__main__":
    main()

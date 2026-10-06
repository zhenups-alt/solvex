"""Shared TLS options for application and migration database connections."""

import ssl

import certifi
from sqlalchemy.engine import make_url


def database_connect_args(database_url: str) -> dict:
    url = make_url(database_url)
    if url.drivername == "postgresql+asyncpg" and url.query.get("ssl") == "verify-full":
        # asyncpg's string mode expects ~/.postgresql/root.crt. Cloud hosts do
        # not provide that file; an explicit context verifies against public CAs.
        return {"ssl": ssl.create_default_context(cafile=certifi.where())}
    return {}

import ssl

import pytest

from app.database_tls import database_connect_args


def test_cloud_tls_verifies_certificate_and_hostname_with_a_ca_bundle():
    options = database_connect_args(
        "postgresql+asyncpg://user:secret%25@db.example/app?ssl=verify-full",
    )
    context = options["ssl"]
    assert isinstance(context, ssl.SSLContext)
    assert context.check_hostname is True
    assert context.verify_mode == ssl.CERT_REQUIRED
    assert context.cert_store_stats()["x509_ca"] > 0


@pytest.mark.parametrize("url", [
    "sqlite+aiosqlite:///:memory:",
    "postgresql+asyncpg://user:secret@localhost/app",
])
def test_local_database_connections_are_unchanged(url):
    assert database_connect_args(url) == {}

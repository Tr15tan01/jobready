"""
Managed Postgres providers hand out connection strings in several
formats. These tests pin down that all of them normalize to asyncpg,
since getting this wrong surfaces as a confusing `No module named
'psycopg2'` error at import time rather than a clear config error.
"""
from app.db.session import to_async_url


def test_plain_postgresql_scheme():
    assert to_async_url("postgresql://u:p@host:5432/db") == "postgresql+asyncpg://u:p@host:5432/db"


def test_short_postgres_scheme():
    """Heroku-style and several managed providers use `postgres://`."""
    assert to_async_url("postgres://u:p@host:5432/db") == "postgresql+asyncpg://u:p@host:5432/db"


def test_psycopg_scheme_from_our_env_example():
    assert to_async_url("postgresql+psycopg://u:p@host:5432/db") == "postgresql+asyncpg://u:p@host:5432/db"


def test_psycopg2_scheme():
    assert to_async_url("postgresql+psycopg2://u:p@host:5432/db") == "postgresql+asyncpg://u:p@host:5432/db"


def test_already_asyncpg_is_unchanged():
    assert to_async_url("postgresql+asyncpg://u:p@host:5432/db") == "postgresql+asyncpg://u:p@host:5432/db"


def test_sslmode_is_stripped():
    """asyncpg rejects sslmode as a query param (it's a libpq option) and
    negotiates SSL on its own, so it must be removed."""
    assert to_async_url("postgresql://u:p@host:5432/db?sslmode=require") == "postgresql+asyncpg://u:p@host:5432/db"


def test_sslmode_stripped_among_other_params():
    result = to_async_url("postgresql://u:p@host/db?sslmode=require&application_name=jobready")
    assert "sslmode" not in result
    assert "application_name=jobready" in result
    assert result.startswith("postgresql+asyncpg://")
    assert "?application_name" in result  # no dangling '&' where '?' should be


def test_sslmode_stripped_when_not_first_param():
    result = to_async_url("postgresql://u:p@host/db?application_name=jobready&sslmode=require")
    assert result == "postgresql+asyncpg://u:p@host/db?application_name=jobready"


def test_password_with_special_characters_preserved():
    url = "postgresql://user:p%40ss-w0rd%21@host.example.dev:5432/db"
    assert to_async_url(url) == "postgresql+asyncpg://user:p%40ss-w0rd%21@host.example.dev:5432/db"

import re
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


def to_async_url(url: str) -> str:
    """Normalize any Postgres URL to the asyncpg driver.

    Managed providers hand out plain `postgresql://` (or `postgres://`)
    strings, and SQLAlchemy would default those to psycopg2 - a driver
    this project doesn't install. Rather than making the user rewrite the
    scheme by hand, accept whatever form they paste and coerce it.

    Also strips `sslmode`, which is a libpq/psycopg option that asyncpg
    rejects as a query parameter; asyncpg negotiates SSL automatically,
    so dropping it is safe. Many hosted providers append
    `?sslmode=require` to the URL they give you.
    """
    url = re.sub(r"^postgres(ql)?(\+\w+)?://", "postgresql+asyncpg://", url)
    url = re.sub(r"[?&]sslmode=[^&]*", "", url)
    url = url.rstrip("?&")
    # If stripping sslmode left the first param starting with '&', fix it.
    url = re.sub(r"\?&", "?", url)
    if "?" not in url and "&" in url:
        url = url.replace("&", "?", 1)
    return url


_async_url = to_async_url(settings.DATABASE_URL)

engine = create_async_engine(_async_url, pool_pre_ping=True, echo=settings.DEBUG)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.progress import AICache

DEFAULT_TTL_DAYS = 90


async def get_cached(db: AsyncSession, cache_key: str) -> Optional[dict]:
    result = await db.execute(select(AICache).where(AICache.cache_key == cache_key))
    row = result.scalar_one_or_none()
    if row is None:
        return None
    if row.expires_at and row.expires_at < datetime.now(timezone.utc):
        return None
    return row.result


async def set_cached(
    db: AsyncSession, cache_key: str, feature: str, input_hash: str, result: dict, model: str,
    ttl_days: int = DEFAULT_TTL_DAYS,
) -> None:
    existing = await db.execute(select(AICache).where(AICache.cache_key == cache_key))
    row = existing.scalar_one_or_none()
    expires_at = datetime.now(timezone.utc) + timedelta(days=ttl_days)
    if row:
        row.result = result
        row.model = model
        row.expires_at = expires_at
    else:
        db.add(AICache(
            cache_key=cache_key, feature=feature, input_hash=input_hash,
            result=result, model=model, expires_at=expires_at,
        ))
    await db.commit()

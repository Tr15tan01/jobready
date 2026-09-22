"""
Optional embedding layer (section 13). When EMBEDDINGS_ENABLED=0 this
module is simply not called by anything — the app works fully without
it. When enabled, embeddings are cached (via ai_cache) so unchanged text
is never re-embedded.
"""
import math
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.ai.gemini_client import hash_input
from app.services.cache.ai_cache import get_cached, set_cached


async def embed_text(db: AsyncSession, text: str) -> Optional[list[float]]:
    if not settings.EMBEDDINGS_ENABLED or not text.strip():
        return None

    cache_key = hash_input("embedding", settings.GEMINI_EMBEDDING_MODEL, text)
    cached = await get_cached(db, cache_key)
    if cached is not None:
        return cached.get("vector")

    from google import genai  # lazy import — only needed when embeddings are on

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    result = client.models.embed_content(
        model=settings.GEMINI_EMBEDDING_MODEL,
        contents=text,
        # gemini-embedding-001 defaults to 3072 dims; request the
        # configured size explicitly so it always matches the pgvector column.
        config={"output_dimensionality": settings.GEMINI_EMBEDDING_DIM},
    )
    vector = list(result.embeddings[0].values)

    await set_cached(
        db, cache_key, feature="embedding", input_hash=cache_key,
        result={"vector": vector}, model=settings.GEMINI_EMBEDDING_MODEL,
    )
    return vector


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)

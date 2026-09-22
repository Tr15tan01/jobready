"""
Lists the Gemini models your API key can actually use, and checks every
model configured in .env against that list.

Run with:  python -m app.scripts.list_models

Why this exists: Google closes older models to NEW API keys well before
their published shutdown date, so the public deprecation schedule is not
a reliable guide to what will work for you. A configured-but-unavailable
model fails at request time with a 404 buried in a stack trace. This
turns that into a one-command check.
"""
import sys

from app.core.config import settings

# Maps the setting name to a short description of what it's used for.
CONFIGURED_MODELS = {
    "GEMINI_MODEL_DEFAULT": "general fallback",
    "GEMINI_MODEL_RESUME": "resume extraction",
    "GEMINI_MODEL_JOB_ANALYSIS": "job extraction + matching",
    "GEMINI_MODEL_CHAT": "chat",
    "GEMINI_MODEL_INTERVIEW": "interview question generation",
    "GEMINI_MODEL_EVALUATION": "answer scoring",
    "GEMINI_MODEL_FAST": "cheap rewrite/suggestion tasks",
    "SPEECH_MODEL": "voice transcription",
}


def main() -> int:
    if not settings.GEMINI_API_KEY:
        print("GEMINI_API_KEY is not set in your .env — nothing to check.")
        print("Get a free key at https://aistudio.google.com/apikey")
        print("Or set AI_PROVIDER=mock to develop without AI.")
        return 1

    from google import genai

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    try:
        available = list(client.models.list())
    except Exception as exc:  # noqa: BLE001 - diagnostic script, show anything
        print(f"Could not list models: {exc}")
        return 1

    # The API returns names like "models/gemini-3.6-flash".
    generate_capable: set[str] = set()
    embed_capable: set[str] = set()
    for m in available:
        short = m.name.removeprefix("models/")
        actions = set(getattr(m, "supported_actions", None) or [])
        if "embedContent" in actions:
            embed_capable.add(short)
        # Some responses omit supported_actions; default to treating it as
        # generation-capable rather than hiding it from the listing.
        if not actions or "generateContent" in actions:
            generate_capable.add(short)

    print("=" * 62)
    print("MODELS AVAILABLE TO YOUR API KEY")
    print("=" * 62)
    for name in sorted(generate_capable):
        print(f"  {name}")
    if embed_capable:
        print("\nEmbedding models:")
        for name in sorted(embed_capable):
            print(f"  {name}")

    print("\n" + "=" * 62)
    print("YOUR CONFIGURED MODELS")
    print("=" * 62)
    problems = []
    for setting_name, purpose in CONFIGURED_MODELS.items():
        configured = getattr(settings, setting_name, "")
        ok = configured in generate_capable
        print(f"  {'OK  ' if ok else 'FAIL'}  {setting_name}={configured}  ({purpose})")
        if not ok:
            problems.append((setting_name, configured))

    embedding = settings.GEMINI_EMBEDDING_MODEL
    if settings.EMBEDDINGS_ENABLED:
        ok = embedding in embed_capable
        print(f"  {'OK  ' if ok else 'FAIL'}  GEMINI_EMBEDDING_MODEL={embedding}")
        if not ok:
            problems.append(("GEMINI_EMBEDDING_MODEL", embedding))
    else:
        print(f"  SKIP  GEMINI_EMBEDDING_MODEL={embedding} (EMBEDDINGS_ENABLED=0)")

    if problems:
        print("\n" + "=" * 62)
        print(f"{len(problems)} model(s) unavailable to your key. Update your .env:")
        for setting_name, configured in problems:
            print(f"  {setting_name}  (currently '{configured}')")
        print("\nPick a replacement from the available list above.")
        return 1

    print("\nAll configured models are available to your key.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

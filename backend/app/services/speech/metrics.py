"""
Derives objective speech metrics from a transcript. Deliberately does
NOT attempt to detect or score accent, pronunciation "correctness" for a
non-native speaker, or anything that would penalize a candidate merely
for having an accent (section 17) — only pace and filler-word usage,
which are language-specific but accent-independent.
"""
import re

FILLER_WORDS = {
    "en": ["um", "uh", "like", "you know", "sort of", "kind of", "basically", "actually", "i mean"],
    "es": ["eh", "este", "o sea", "bueno", "pues", "tipo", "digamos"],
    "ka": ["ემმ", "ანუ", "მაგარია", "სახეობის"],
}


def compute_speech_metrics(transcript: str, duration_seconds: float | None, locale: str) -> dict:
    words = re.findall(r"\b[\w'-]+\b", transcript, flags=re.UNICODE)
    word_count = len(words)

    words_per_minute = None
    if duration_seconds and duration_seconds > 0:
        words_per_minute = round(word_count / (duration_seconds / 60), 1)

    fillers = FILLER_WORDS.get(locale, FILLER_WORDS["en"])
    lower_transcript = transcript.lower()
    filler_word_count = sum(len(re.findall(rf"\b{re.escape(f)}\b", lower_transcript)) for f in fillers)

    # Repeated consecutive words ("the the", "I I") — a simple, language-
    # agnostic clarity signal that doesn't require timestamps.
    repeated_word_count = len(re.findall(r"\b(\w+)\s+\1\b", lower_transcript, flags=re.UNICODE))

    return {
        "word_count": word_count,
        "words_per_minute": words_per_minute,
        "filler_word_count": filler_word_count,
        "repeated_word_count": repeated_word_count,
        "language": locale,
    }

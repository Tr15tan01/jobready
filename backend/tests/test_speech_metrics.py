from app.services.speech.metrics import compute_speech_metrics


def test_words_per_minute_computed_from_duration():
    transcript = "This is a test answer with exactly ten words total"
    result = compute_speech_metrics(transcript, duration_seconds=30, locale="en")
    assert result["word_count"] == 10
    assert result["words_per_minute"] == 20.0  # 10 words / 0.5 min


def test_words_per_minute_none_without_duration():
    result = compute_speech_metrics("hello world", duration_seconds=None, locale="en")
    assert result["words_per_minute"] is None


def test_filler_word_detection_is_language_aware_english():
    transcript = "So, um, I think, like, this was, uh, a good experience you know"
    result = compute_speech_metrics(transcript, duration_seconds=10, locale="en")
    assert result["filler_word_count"] >= 3


def test_filler_word_detection_is_language_aware_spanish():
    transcript = "Bueno, o sea, yo creo que, este, fue una buena experiencia"
    result = compute_speech_metrics(transcript, duration_seconds=10, locale="es")
    assert result["filler_word_count"] >= 2


def test_filler_detection_never_flags_normal_words_as_fillers():
    """'like' is a filler in casual English but this ensures words that
    merely CONTAIN filler substrings aren't wrongly matched (word
    boundaries respected) — important so accent/dialect variation in
    unrelated words isn't penalized."""
    transcript = "I liked the likelihood of success in this likable project"
    result = compute_speech_metrics(transcript, duration_seconds=10, locale="en")
    # "like" as a standalone filler word should not match inside "liked"/"likelihood"/"likable"
    assert result["filler_word_count"] == 0


def test_repeated_word_detection():
    transcript = "I I really think the the answer is correct"
    result = compute_speech_metrics(transcript, duration_seconds=10, locale="en")
    assert result["repeated_word_count"] == 2


def test_metrics_never_reference_accent_or_pronunciation():
    """Documents the design constraint: the metrics dict only contains
    pace/filler/repetition signals, nothing accent- or pronunciation-based."""
    result = compute_speech_metrics("any transcript here", duration_seconds=5, locale="en")
    assert set(result.keys()) == {
        "word_count", "words_per_minute", "filler_word_count", "repeated_word_count", "language",
    }

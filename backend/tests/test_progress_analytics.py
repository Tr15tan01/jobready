from datetime import date, datetime, timedelta

from app.services.progress_analytics import AnswerRecord, SessionRecord, build_activity, compute_streaks

TODAY = date(2026, 9, 25)


def at(days_ago: int, hour: int = 12) -> datetime:
    d = TODAY - timedelta(days=days_ago)
    return datetime(d.year, d.month, d.day, hour)


def test_streak_counts_consecutive_days_including_today():
    days = {TODAY, TODAY - timedelta(days=1), TODAY - timedelta(days=2), TODAY - timedelta(days=5)}
    assert compute_streaks(days, TODAY) == (3, 3)


def test_streak_survives_until_today_ends():
    days = {TODAY - timedelta(days=1), TODAY - timedelta(days=2)}
    assert compute_streaks(days, TODAY) == (2, 2)


def test_streak_breaks_after_a_missed_day():
    days = {TODAY - timedelta(days=2), TODAY - timedelta(days=3), TODAY - timedelta(days=4), TODAY - timedelta(days=5)}
    assert compute_streaks(days, TODAY) == (0, 4)


def test_empty_history_is_safe():
    out = build_activity([], [], TODAY, days=30)
    assert out["streak"]["current"] == 0
    assert len(out["daily"]) == 30
    assert out["totals"]["answers"] == 0
    assert out["insights"]  # always at least one line


def test_daily_window_and_breakdown():
    answers = [
        AnswerRecord(at=at(0), session_id="s1", session_type="speech_practice", mode="impromptu",
                     duration_seconds=90, score=6, wpm=180, fillers=6),
        AnswerRecord(at=at(0), session_id="s1", session_type="speech_practice", mode="impromptu",
                     duration_seconds=60, score=7, wpm=175, fillers=5),
        AnswerRecord(at=at(1), session_id="s2", session_type="interview", mode="behavioral", score=4),
        AnswerRecord(at=at(1), session_id="s2", session_type="interview", mode="behavioral", score=5),
        AnswerRecord(at=at(40), session_id="s3", session_type="interview", mode="hr", score=9),
    ]
    sessions = [
        SessionRecord(at=at(0), session_type="speech_practice", mode="impromptu", completed=True),
        SessionRecord(at=at(1), session_type="interview", mode="behavioral", completed=True),
        SessionRecord(at=at(40), session_type="interview", mode="hr", completed=False),
    ]
    out = build_activity(answers, sessions, TODAY, days=30)
    assert out["daily"][-1] == {"day": TODAY.isoformat(), "sessions": 1, "answers": 2, "minutes": 2.5, "avg_score": 6.5}
    # 40 days ago is outside the 30-day chart but still in totals.
    assert out["totals"]["answers"] == 5
    assert out["totals"]["best_score"] == 9
    assert out["streak"]["current"] == 2
    labels = {t["label"]: t for t in out["by_type"]}
    assert labels["Impromptu"]["avg_score"] == 6.5
    assert labels["Behavioral interview"]["avg_score"] == 4.5
    assert sum(b["count"] for b in out["score_distribution"]) == 5
    texts = " ".join(i["text"] for i in out["insights"])
    assert "streak" in texts
    assert "fast" in texts  # recent pace is ~178 wpm


def test_improving_scores_produce_a_positive_trend_insight():
    answers = [
        AnswerRecord(at=at(20 - i), session_id=f"s{i}", session_type="speech_practice", mode="debate", score=s)
        for i, s in enumerate([4, 4, 5, 4, 5, 7, 7, 8, 7, 8])
    ]
    out = build_activity(answers, [], TODAY)
    assert any(i["tone"] == "positive" and "rose" in i["text"] for i in out["insights"])

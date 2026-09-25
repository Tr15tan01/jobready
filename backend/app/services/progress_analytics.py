"""
Activity analytics for the Progress page: daily activity, streaks, a
breakdown by practice type, score distribution, delivery trends and plain-
language insights.

Pure functions over plain records, so the logic is unit-tested without a
database. Everything is deterministic arithmetic — no AI call, no cost.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from statistics import mean
from typing import Iterable, Optional

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

SPEECH_LABELS = {
    "persuasive": "Persuasive", "impromptu": "Impromptu", "storytelling": "Storytelling",
    "presentation": "Presentation", "debate": "Debate", "pitch": "Elevator pitch",
}
INTERVIEW_LABELS = {
    "behavioral": "Behavioral interview", "domain": "Domain interview", "hr": "HR interview",
    "general": "General interview", "custom": "Custom interview", "technical": "Technical interview",
    "system_design": "System design interview",
}

# Comfortable conversational pace for presenting, in words per minute.
PACE_LOW, PACE_HIGH = 120, 165


@dataclass
class AnswerRecord:
    at: datetime  # already shifted to the user's local time
    session_id: str
    session_type: str  # "interview" | "speech_practice"
    mode: str
    duration_seconds: Optional[int] = None
    score: Optional[float] = None
    wpm: Optional[float] = None
    fillers: Optional[int] = None
    eye_contact: Optional[float] = None


@dataclass
class SessionRecord:
    at: datetime  # local time
    session_type: str
    mode: str
    completed: bool


def _r(x: Optional[float], nd: int = 1) -> Optional[float]:
    return None if x is None else round(x, nd)


def type_label(session_type: str, mode: str) -> str:
    if session_type == "speech_practice":
        return SPEECH_LABELS.get(mode, mode.title())
    return INTERVIEW_LABELS.get(mode, f"{mode.title()} interview")


def compute_streaks(active_days: set[date], today: date) -> tuple[int, int]:
    """(current, longest). The current streak still counts if today has no
    practice yet but yesterday did — the day isn't over."""
    if not active_days:
        return 0, 0
    longest = run = 0
    prev: Optional[date] = None
    for d in sorted(active_days):
        run = run + 1 if prev is not None and d - prev == timedelta(days=1) else 1
        longest = max(longest, run)
        prev = d
    start = today if today in active_days else today - timedelta(days=1)
    current = 0
    while start in active_days:
        current += 1
        start -= timedelta(days=1)
    return current, longest


def build_activity(
    answers: Iterable[AnswerRecord],
    sessions: Iterable[SessionRecord],
    today: date,
    days: int = 30,
) -> dict:
    answers = sorted(answers, key=lambda a: a.at)
    sessions = list(sessions)

    # ---- Daily activity for the chart window ------------------------------
    start = today - timedelta(days=days - 1)
    per_day: dict[date, dict] = {
        start + timedelta(days=i): {"sessions": 0, "answers": 0, "minutes": 0.0, "scores": []}
        for i in range(days)
    }
    for s in sessions:
        d = s.at.date()
        if d in per_day:
            per_day[d]["sessions"] += 1
    for a in answers:
        d = a.at.date()
        if d in per_day:
            per_day[d]["answers"] += 1
            per_day[d]["minutes"] += (a.duration_seconds or 0) / 60
            if a.score is not None:
                per_day[d]["scores"].append(a.score)
    daily = [
        {
            "day": d.isoformat(),
            "sessions": v["sessions"],
            "answers": v["answers"],
            "minutes": _r(v["minutes"]),
            "avg_score": _r(mean(v["scores"])) if v["scores"] else None,
        }
        for d, v in per_day.items()
    ]

    # ---- Streaks and totals (whole history passed in) ---------------------
    active_days = {s.at.date() for s in sessions} | {a.at.date() for a in answers}
    current, longest = compute_streaks(active_days, today)
    scored = [a for a in answers if a.score is not None]
    totals = {
        "sessions": len(sessions),
        "completed_sessions": sum(1 for s in sessions if s.completed),
        "answers": len(answers),
        "scored_answers": len(scored),
        "practice_minutes": _r(sum((a.duration_seconds or 0) for a in answers) / 60),
        "active_days": len(active_days),
        "best_score": max((a.score for a in scored), default=None),
        "average_score": _r(mean(a.score for a in scored)) if scored else None,
        "active_days_last_7": sum(1 for d in active_days if (today - d).days < 7),
    }

    # ---- By practice type --------------------------------------------------
    groups: dict[tuple[str, str], dict] = defaultdict(lambda: {"sessions": set(), "scores": []})
    for a in answers:
        g = groups[(a.session_type, a.mode)]
        g["sessions"].add(a.session_id)
        if a.score is not None:
            g["scores"].append(a.score)
    session_counts: dict[tuple[str, str], int] = defaultdict(int)
    for s in sessions:
        session_counts[(s.session_type, s.mode)] += 1
    by_type = sorted(
        (
            {
                "kind": "speech" if st == "speech_practice" else "interview",
                "mode": mode,
                "label": type_label(st, mode),
                "sessions": max(session_counts.get((st, mode), 0), len(g["sessions"])),
                "answers": len(g["scores"]),
                "avg_score": _r(mean(g["scores"])) if g["scores"] else None,
            }
            for (st, mode), g in groups.items()
        ),
        key=lambda x: -x["sessions"],
    )

    # ---- Score distribution -------------------------------------------------
    buckets = [("0–2", 0, 2), ("2–4", 2, 4), ("4–6", 4, 6), ("6–8", 6, 8), ("8–10", 8, 10.01)]
    distribution = [
        {"range": label, "count": sum(1 for a in scored if lo <= a.score < hi)}
        for label, lo, hi in buckets
    ]

    # ---- Weekday pattern ----------------------------------------------------
    weekday_counts = [0] * 7
    for a in answers:
        weekday_counts[a.at.weekday()] += 1
    weekdays = [{"day": WEEKDAYS[i][:3], "answers": weekday_counts[i]} for i in range(7)]

    # ---- Weekly delivery trend (last 8 weeks) -------------------------------
    week_start = today - timedelta(days=today.weekday())
    weeks = [week_start - timedelta(weeks=i) for i in range(7, -1, -1)]
    wk: dict[date, dict] = {w: {"wpm": [], "fillers": [], "eye": [], "scores": []} for w in weeks}
    for a in answers:
        w = a.at.date() - timedelta(days=a.at.weekday())
        if w in wk:
            if a.wpm is not None:
                wk[w]["wpm"].append(a.wpm)
            if a.fillers is not None:
                wk[w]["fillers"].append(a.fillers)
            if a.eye_contact is not None:
                wk[w]["eye"].append(a.eye_contact)
            if a.score is not None:
                wk[w]["scores"].append(a.score)
    weekly = [
        {
            "week": w.isoformat(),
            "avg_score": _r(mean(v["scores"])) if v["scores"] else None,
            "wpm": _r(mean(v["wpm"]), 0) if v["wpm"] else None,
            "fillers": _r(mean(v["fillers"])) if v["fillers"] else None,
            "eye_contact": _r(mean(v["eye"]), 0) if v["eye"] else None,
        }
        for w, v in wk.items()
    ]

    return {
        "days": days,
        "daily": daily,
        "streak": {"current": current, "longest": longest, "practised_today": today in active_days},
        "totals": totals,
        "by_type": by_type,
        "score_distribution": distribution,
        "weekdays": weekdays,
        "weekly": weekly,
        "insights": build_insights(answers, by_type, current, longest, weekday_counts, today in active_days),
    }


def build_insights(
    answers: list[AnswerRecord],
    by_type: list[dict],
    current_streak: int,
    longest_streak: int,
    weekday_counts: list[int],
    practised_today: bool,
) -> list[dict]:
    """Short, factual observations. Each has a tone for the UI:
    positive, tip or neutral. Never judgements about the person."""
    out: list[dict] = []
    scored = [a for a in answers if a.score is not None]

    # Trend: recent answers vs the ones before.
    if len(scored) >= 6:
        n = min(10, len(scored) // 2)
        recent = mean(a.score for a in scored[-n:])
        before = mean(a.score for a in scored[-2 * n:-n])
        delta = recent - before
        if delta >= 0.3:
            out.append({"tone": "positive", "text": f"Your average score rose from {before:.1f} to {recent:.1f} across your last {2 * n} answers."})
        elif delta <= -0.3:
            out.append({"tone": "tip", "text": f"Your average dipped from {before:.1f} to {recent:.1f} recently — revisit the feedback on your last few answers."})
        else:
            out.append({"tone": "neutral", "text": f"Your scores are steady at around {recent:.1f}/10. Try a harder topic or a new style to keep growing."})

    # Streak.
    if current_streak >= 2:
        msg = f"You're on a {current_streak}-day streak"
        msg += " — practise today to keep it going." if not practised_today else ". Nice consistency!"
        out.append({"tone": "positive", "text": msg})
    elif longest_streak >= 3:
        out.append({"tone": "tip", "text": f"Your best streak is {longest_streak} days. Short daily sessions beat occasional long ones."})

    # Strongest / weakest type.
    typed = [t for t in by_type if t["avg_score"] is not None and t["answers"] >= 2]
    if len(typed) >= 2:
        best = max(typed, key=lambda t: t["avg_score"])
        worst = min(typed, key=lambda t: t["avg_score"])
        if best["avg_score"] - worst["avg_score"] >= 0.5:
            out.append({"tone": "neutral", "text": f"{best['label']} is your strongest ({best['avg_score']}/10); {worst['label']} has the most room to grow ({worst['avg_score']}/10)."})

    # Pace.
    recent_wpm = [a.wpm for a in answers[-10:] if a.wpm is not None]
    if len(recent_wpm) >= 2:
        wpm = mean(recent_wpm)
        if wpm > PACE_HIGH:
            out.append({"tone": "tip", "text": f"Your recent pace averages {wpm:.0f} words per minute — a little fast. Aim for {PACE_LOW}–{PACE_HIGH} and pause after key points."})
        elif wpm < PACE_LOW:
            out.append({"tone": "tip", "text": f"Your recent pace averages {wpm:.0f} words per minute — on the slow side. Aim for {PACE_LOW}–{PACE_HIGH} for more energy."})
        else:
            out.append({"tone": "positive", "text": f"Your pace ({wpm:.0f} wpm) sits in the comfortable {PACE_LOW}–{PACE_HIGH} range."})

    # Fillers trend.
    fill = [a.fillers for a in answers if a.fillers is not None]
    if len(fill) >= 6:
        half = len(fill) // 2
        early, late = mean(fill[:half]), mean(fill[half:])
        if late < early - 0.5:
            out.append({"tone": "positive", "text": f"Filler words dropped from {early:.1f} to {late:.1f} per answer."})
        elif late > 4:
            out.append({"tone": "tip", "text": f"You average {late:.1f} filler words per answer. When you feel an “um” coming, pause silently instead."})

    # Favourite day.
    if sum(weekday_counts) >= 5:
        top = max(range(7), key=lambda i: weekday_counts[i])
        out.append({"tone": "neutral", "text": f"You practise most on {WEEKDAYS[top]}s."})

    if not out:
        out.append({"tone": "neutral", "text": "Complete a few more practice answers to unlock personalised insights."})
    return out[:6]

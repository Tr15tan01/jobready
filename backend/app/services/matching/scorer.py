"""
Transparent job-match scoring (section 12). Never a single opaque
embedding-similarity number — combines several explainable signals:

  1. required_requirements_score  — deterministic: fraction of required
     skills the candidate has (fuzzy string match).
  2. experience_score             — deterministic: candidate years vs
     the role's stated minimum.
  3. technical_skills_score       — structured skill overlap, optionally
     nudged by embedding cosine similarity when enabled (semantic signal
     is a refinement, never the sole mechanism — section 13).
  4. responsibilities_score       — AI qualitative judgment of how well
     experience descriptions cover the role's actual responsibilities.
  5. preferred_score              — deterministic: fraction of preferred
     skills present.

Weights come from `settings` (configurable, section 12), not hard-coded
here beyond the combination formula itself.

Works identically for any profession — nothing here assumes a specific
skill vocabulary; it only ever compares whatever skill strings the job
and resume actually contain.
"""
from difflib import SequenceMatcher

from app.core.config import settings


def _normalize(s: str) -> str:
    return s.strip().lower()


def _fuzzy_contains(candidate_skills: list[str], target: str, threshold: float = 0.82) -> bool:
    """True if `target` matches one of the candidate's skills closely
    enough to count as the same thing (handles minor wording differences
    like "clinical supervision" vs "clinical supervisor experience")."""
    t = _normalize(target)
    for skill in candidate_skills:
        s = _normalize(skill)
        if t == s or t in s or s in t:
            return True
        if SequenceMatcher(None, t, s).ratio() >= threshold:
            return True
    return False


def score_skill_list(candidate_skills: list[str], required: list[str]) -> tuple[float, list[str], list[str]]:
    """Returns (fraction_matched, matched, missing)."""
    if not required:
        return 1.0, [], []
    matched = [r for r in required if _fuzzy_contains(candidate_skills, r)]
    missing = [r for r in required if r not in matched]
    return len(matched) / len(required), matched, missing


def score_experience(candidate_years: float, min_years: float | None) -> float:
    if not min_years or min_years <= 0:
        return 1.0
    if candidate_years >= min_years:
        return 1.0
    return max(0.0, candidate_years / min_years)


def combine_scores(
    required_requirements_score: float,
    experience_score: float,
    technical_skills_score: float,
    responsibilities_score: float,
    preferred_score: float,
) -> float:
    weights = {
        "required": settings.MATCH_WEIGHT_REQUIRED_REQUIREMENTS,
        "experience": settings.MATCH_WEIGHT_EXPERIENCE,
        "technical": settings.MATCH_WEIGHT_TECHNICAL_SKILLS,
        "responsibilities": settings.MATCH_WEIGHT_RESPONSIBILITIES,
        "preferred": settings.MATCH_WEIGHT_PREFERRED,
    }
    total = (
        required_requirements_score * weights["required"]
        + experience_score * weights["experience"]
        + technical_skills_score * weights["technical"]
        + responsibilities_score * weights["responsibilities"]
        + preferred_score * weights["preferred"]
    )
    return round(total * 100, 1)  # percentage, e.g. 81.0

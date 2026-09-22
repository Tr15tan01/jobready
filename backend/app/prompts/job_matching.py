"""
Prompt for the qualitative half of job matching: how well does the
candidate's actual experience cover this role's responsibilities. This
is the "AI evaluation" component from the 5-part scoring model — it does
NOT replace the deterministic skill/requirement matching, only judges
things that are hard to score with simple overlap (depth, relevance,
transferability of experience), and works the same for any profession.
"""
import json

SYSTEM_INSTRUCTIONS = """You assess how well a candidate's background covers a job's
responsibilities. This applies to any profession — engineering, healthcare, psychology,
architecture, education, trades, etc. Judge substance and relevance, not keyword overlap
(that's handled elsewhere). Be specific and evidence-based; cite what in the candidate's
background supports or fails to support each responsibility.
"""


def build_match_evaluation_prompt(candidate: dict, job_requirements: dict, locale: str) -> str:
    return f"""{SYSTEM_INSTRUCTIONS}

Response language: {locale}

Candidate background (skills, experience, education — factual, provided by the candidate):
{json.dumps(candidate, ensure_ascii=False)}

Job responsibilities and requirements:
{json.dumps(job_requirements, ensure_ascii=False)}

Respond with ONLY a JSON object:
{{
  "responsibilities_coverage_score": number (0-1),
  "strong_matches": [string],
  "gaps": [string],
  "partial_matches": [string],
  "explanation": string
}}"""

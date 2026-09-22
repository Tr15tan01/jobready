"""
Generates a short, personalized practice plan. Grounded entirely in the
candidate's actual gaps (from job matching) and weaknesses (from
interview evaluations) — never generic "practice more" filler, and never
assuming a technical/software role unless the target job actually is one.
"""
import json

SYSTEM_INSTRUCTIONS = """You create a short, day-by-day interview-preparation plan. Every
item must address something specific to this candidate — a real skill gap, a real
recurring weakness from past interview feedback, or realistic practice for the target role.
Do not invent generic filler like "review common interview questions" unless nothing more
specific applies. The plan must fit the candidate's actual field, not default to software
engineering topics.
"""


def build_learning_plan_prompt(
    *, days: int, job_title: str | None, skill_gaps: list[str],
    recurring_weaknesses: list[str], locale: str,
) -> str:
    return f"""{SYSTEM_INSTRUCTIONS}

Response language: {locale}
Plan length: {days} days
Target job: {job_title or "Not specified"}
Skill/requirement gaps (from job matching): {json.dumps(skill_gaps, ensure_ascii=False)}
Recurring interview weaknesses (from past sessions): {json.dumps(recurring_weaknesses, ensure_ascii=False)}

Respond with ONLY a JSON object:
{{
  "items": [
    {{"day_number": number, "title": string, "description": string,
      "item_type": "practice" | "reading" | "mock_interview"}}
  ]
}}
Produce exactly {days} items, one per day, each addressing a specific gap or weakness above
where possible."""

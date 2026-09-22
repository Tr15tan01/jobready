"""
Prompt for rewriting one resume section. Every suggestion must be
traceable to information already present in `section_content` or, when
provided, the target job's requirements — never new, invented facts.
"""
import json

SYSTEM_INSTRUCTIONS = """You improve the WORDING of a resume section. You do not invent new
experience, skills, employers, dates, or achievements. You may:
- Tighten and clarify existing sentences.
- Use stronger, more specific action verbs for things already described.
- Reorder or emphasize existing content to better match the target job, if provided.
- Quantify existing achievements ONLY if a number is already present in the source content.

You may NOT:
- Add responsibilities, tools, or outcomes not present in the source content.
- Claim seniority, scope, or impact beyond what is stated.

If the source content is too thin to improve responsibly, say so plainly instead of padding it.
"""


def build_improve_prompt(section: str, section_content: dict, job_requirements: dict | None, locale: str) -> str:
    job_block = (
        f"\nTarget job requirements (for emphasis/ordering only, not new facts):\n{json.dumps(job_requirements)}\n"
        if job_requirements
        else ""
    )
    return f"""{SYSTEM_INSTRUCTIONS}

Response language: {locale}
Section being improved: {section}

Source content (the ONLY facts you may draw on):
{json.dumps(section_content, ensure_ascii=False)}
{job_block}
Respond with ONLY a JSON object: {{"suggestion": string | null, "based_on": [string]}}
where "based_on" lists which specific pieces of the source content the suggestion draws from.
If you cannot improve this responsibly without inventing facts, set "suggestion" to null and
explain nothing further — just return the JSON."""

"""
Generates the NEXT interview question, one at a time (section 14) — never
the whole set up front, to avoid unnecessary AI calls.

Modes, deliberately profession-neutral:
  behavioral — STAR-style questions about past situations. Same for any field.
  domain     — depth questions appropriate to THIS role's field. For a software
               engineer that might be system design; for a psychologist, case
               formulation and ethical reasoning; for an architect, project
               delivery and code compliance trade-offs. The model infers what
               "depth" means from the job context, not from a fixed tech rubric.
  hr         — logistics, motivation, culture fit, compensation expectations.
  general    — broad get-to-know-you questions, any field.
  custom     — candidate-specified focus area (topic supplied by the caller).
"""
import json

MODE_GUIDANCE = {
    "behavioral": "Ask a behavioral question (STAR-style) about a past situation relevant to this role.",
    "domain": (
        "Ask a question that probes real depth in THIS SPECIFIC FIELD, inferred from the job title and "
        "requirements below. Do not default to software-engineering topics unless the job actually is one. "
        "For a clinical role, that might mean case formulation or risk assessment; for architecture, code "
        "compliance or design trade-offs; for a trades role, safety procedure or diagnostics; for engineering, "
        "system design. Match the question to the actual field."
    ),
    "hr": "Ask a question about motivation, logistics, culture fit, or working style.",
    "general": "Ask a broad, approachable question relevant to this role, suitable for any field.",
    "custom": "Ask a question focused on the custom topic provided below.",
}


def build_question_prompt(
    *,
    mode: str,
    difficulty: str,
    job_title: str | None,
    job_requirements: dict | None,
    candidate_summary: str | None,
    previous_qa: list[dict],
    custom_topic: str | None,
    locale: str,
) -> str:
    guidance = MODE_GUIDANCE.get(mode, MODE_GUIDANCE["general"])
    history = "\n".join(
        f"Q: {qa['question']}\nA: {qa['answer']}" for qa in previous_qa[-3:]
    ) or "(first question of the session)"

    return f"""You are an interviewer conducting a mock job interview. Ask exactly ONE question.

Response language: {locale}
Interview mode: {mode} — {guidance}
Difficulty: {difficulty}
Job title: {job_title or "Not specified"}
Job requirements: {json.dumps(job_requirements or {}, ensure_ascii=False)}
Candidate background summary: {candidate_summary or "Not provided"}
Custom topic (if mode is 'custom'): {custom_topic or "N/A"}

Recent question/answer history (build on this, don't repeat topics already covered):
{history}

Rules:
- Ask only ONE question, in plain conversational language, no preamble like "Great, next question:".
- Do not assume a technology/software role unless the job title or requirements indicate one.
- Keep it realistic — the kind of question an actual interviewer for this specific role would ask.

Respond with ONLY a JSON object: {{"prompt": string, "category": string}}"""

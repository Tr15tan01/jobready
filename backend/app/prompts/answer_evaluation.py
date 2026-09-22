"""
Evaluates one interview answer. Criteria are phrased generically enough
to apply to any field — "correctness, depth, reasoning, trade-offs,
practical knowledge" means something different for a psychologist than
for a software engineer, but the shape of good evaluation is the same.
The model is trusted to apply the criteria to the actual field/question,
not to a fixed technical rubric.
"""
import json

CRITERIA_BY_MODE = {
    "behavioral": "relevance, specificity, structure (STAR), evidence, clarity",
    "domain": "correctness, depth, reasoning, trade-offs, and practical knowledge — judged for THIS field, not assumed to be software",
    "hr": "relevance, honesty/self-awareness, clarity, professionalism",
    "general": "relevance, clarity, structure, conciseness",
    "custom": "relevance, depth, and clarity relative to the custom topic",
    # Speech Practice modes — general communication coaching, not tied to any job.
    "persuasive": "persuasiveness, use of evidence/reasoning, emotional appeal, structure, clarity",
    "impromptu": "coherence under time pressure, structure, clarity, conciseness",
    "storytelling": "narrative arc, engagement, relevance of detail, clarity",
    "presentation": "clarity, structure, audience awareness, pacing of ideas",
    "debate": "strength of argument, quality of rebuttal, use of evidence, clarity",
    "pitch": "conciseness, persuasiveness, a clear hook, clarity of the ask",
}


def build_evaluation_prompt(*, mode: str, question: str, answer: str, locale: str) -> str:
    criteria = CRITERIA_BY_MODE.get(mode, CRITERIA_BY_MODE["general"])
    return f"""You evaluate one interview answer. Judge it against these criteria, adapted to
whatever field the question is actually about (do not assume software engineering unless the
question is about one): {criteria}.

Response language: {locale}
Question: {question}
Candidate's answer: {answer}

Never comment on the candidate's accent, first language, or non-native phrasing as a flaw in
itself — only on clarity and structure. Never infer personality, honesty as a psychological
fact, or protected characteristics.

Respond with ONLY a JSON object:
{{
  "score": number (0-10),
  "strengths": [string],
  "improvements": [string],
  "missing_points": [string],
  "suggested_answer": string,
  "practice_focus": string,
  "criteria_breakdown": {{"criterion_name": number}}
}}"""

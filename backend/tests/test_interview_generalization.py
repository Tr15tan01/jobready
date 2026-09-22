from app.prompts.answer_evaluation import build_evaluation_prompt
from app.prompts.interview_question import build_question_prompt
from app.schemas.interview import AnswerEvaluationResult, GeneratedQuestion


def test_domain_mode_prompt_does_not_hardcode_software():
    """The 'domain' mode (replacing the old software-specific
    'system_design' mode) must explicitly avoid assuming a tech role."""
    prompt = build_question_prompt(
        mode="domain", difficulty="medium", job_title="Clinical Psychologist",
        job_requirements={"required_skills": ["CBT", "Risk assessment"]},
        candidate_summary=None, previous_qa=[], custom_topic=None, locale="en",
    )
    assert "Clinical Psychologist" in prompt
    assert "Do not default to software-engineering topics" in prompt
    assert "case formulation" in prompt or "risk assessment" in prompt.lower()


def test_domain_mode_prompt_adapts_to_architect_job():
    prompt = build_question_prompt(
        mode="domain", difficulty="hard", job_title="Senior Architect",
        job_requirements={"required_skills": ["AutoCAD", "Revit", "Building codes"]},
        candidate_summary=None, previous_qa=[], custom_topic=None, locale="en",
    )
    assert "Senior Architect" in prompt
    assert "AutoCAD" in prompt


def test_evaluation_criteria_generalize_for_domain_mode():
    prompt = build_evaluation_prompt(
        mode="domain", question="How would you assess suicide risk in a first session?",
        answer="I'd use a structured risk assessment tool and safety planning.", locale="en",
    )
    assert "judged for THIS field, not assumed to be software" in prompt


def test_behavioral_mode_is_identical_regardless_of_field():
    prompt_swe = build_question_prompt(
        mode="behavioral", difficulty="medium", job_title="Software Engineer",
        job_requirements=None, candidate_summary=None, previous_qa=[], custom_topic=None, locale="en",
    )
    prompt_psych = build_question_prompt(
        mode="behavioral", difficulty="medium", job_title="Psychologist",
        job_requirements=None, candidate_summary=None, previous_qa=[], custom_topic=None, locale="en",
    )
    # Same guidance text for both — only the job title context differs.
    assert "STAR-style" in prompt_swe and "STAR-style" in prompt_psych


def test_generated_question_schema_defaults():
    q = GeneratedQuestion.model_validate({})
    assert q.prompt == ""
    assert q.category == "general"


def test_answer_evaluation_schema_defaults_are_safe():
    ev = AnswerEvaluationResult.model_validate({})
    assert ev.score == 0.0
    assert ev.strengths == []
    assert ev.criteria_breakdown == {}

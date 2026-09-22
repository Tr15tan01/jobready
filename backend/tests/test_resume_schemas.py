import pytest

from app.schemas.resume import StructuredResume
from app.services.ai.base import MockAIService


def test_structured_resume_accepts_string_skills():
    """AI sometimes returns skills as bare strings — must be normalized,
    not rejected (see StructuredResume.coerce_skill_strings)."""
    parsed = StructuredResume.model_validate({
        "full_name": "Jane Doe",
        "skills": ["Python", {"name": "React", "category": "framework"}],
    })
    assert parsed.skills[0].name == "Python"
    assert parsed.skills[1].category == "framework"


def test_structured_resume_defaults_missing_fields_to_none():
    """Anti-hallucination: missing info must be None/empty, never a guess."""
    parsed = StructuredResume.model_validate({})
    assert parsed.full_name is None
    assert parsed.work_experience == []
    assert parsed.education == []


@pytest.mark.asyncio
async def test_mock_ai_extract_resume_never_invents_experience():
    ai = MockAIService()
    result = await ai.extract_resume(db=None, user_id=None, raw_text="anything", locale="en")
    assert result.work_experience == []
    assert result.education == []


@pytest.mark.asyncio
async def test_mock_ai_improve_suggestion_shape():
    ai = MockAIService()
    result = await ai.generate_resume_suggestion(
        db=None, user_id=None, section="summary",
        section_content={"summary": "Built things."}, job_requirements=None, locale="en",
    )
    assert result.suggestion is None
    assert result.based_on == []

"""
AIService: the ONLY place in the codebase that talks to Gemini.

Every operation:
  1. Hashes its input and checks AICache first (never re-runs on unchanged input).
  2. Picks its model from `settings` (never hard-coded).
  3. Validates the AI's JSON response against a Pydantic schema (see gemini_client).
  4. Logs an AIRequest row (tokens, cost, cache_hit) for cost tracking.
  5. Falls back gracefully on invalid output — never crashes the caller's request.

Concrete prompts live in app/prompts/. Operations not yet wired for the
current phase raise NotImplementedError with a pointer to when they land.
"""
from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.prompts.answer_evaluation import build_evaluation_prompt
from app.prompts.interview_question import build_question_prompt
from app.prompts.job_extraction import build_job_extraction_prompt
from app.prompts.job_matching import build_match_evaluation_prompt
from app.prompts.learning_plan import build_learning_plan_prompt
from app.prompts.resume_extraction import build_extraction_prompt
from app.prompts.resume_generation import build_generation_prompt
from app.prompts.resume_optimization import build_improve_prompt
from app.schemas.interview import AnswerEvaluationResult, GeneratedQuestion
from app.schemas.job import JobExtraction, MatchEvaluation
from app.schemas.progress import LearningPlanGeneration
from app.schemas.resume import StructuredResume
from app.services.ai.gemini_client import generate_structured, hash_input
from app.services.cache.ai_cache import get_cached, set_cached

from pydantic import BaseModel, Field


class ImproveSuggestion(BaseModel):
    suggestion: Optional[str] = None
    based_on: list[str] = Field(default_factory=list)


class AIService(ABC):
    """Interface — swap the implementation without touching callers."""

    @abstractmethod
    async def extract_resume(self, db: AsyncSession, user_id: Optional[UUID], raw_text: str, locale: str) -> StructuredResume: ...

    @abstractmethod
    async def extract_job(self, db: AsyncSession, user_id: Optional[UUID], raw_description: str, locale: str) -> JobExtraction: ...

    @abstractmethod
    async def match_candidate(
        self, db: AsyncSession, user_id: Optional[UUID], candidate: dict, job_requirements: dict, locale: str,
    ) -> MatchEvaluation: ...

    @abstractmethod
    async def generate_question(
        self, db: AsyncSession, user_id: Optional[UUID], *, mode: str, difficulty: str,
        job_title: Optional[str], job_requirements: Optional[dict], candidate_summary: Optional[str],
        previous_qa: list[dict], custom_topic: Optional[str], locale: str,
    ) -> GeneratedQuestion: ...

    @abstractmethod
    async def evaluate_answer(
        self, db: AsyncSession, user_id: Optional[UUID], *, mode: str, question: str, answer: str, locale: str,
    ) -> AnswerEvaluationResult: ...

    @abstractmethod
    async def generate_learning_plan(
        self, db: AsyncSession, user_id: Optional[UUID], *, days: int, job_title: Optional[str],
        skill_gaps: list[str], recurring_weaknesses: list[str], locale: str,
    ) -> LearningPlanGeneration: ...

    @abstractmethod
    async def generate_resume(
        self, db: AsyncSession, user_id: Optional[UUID], answers: dict, locale: str,
    ) -> StructuredResume: ...

    @abstractmethod
    async def generate_resume_suggestion(
        self, db: AsyncSession, user_id: Optional[UUID], section: str,
        section_content: dict, job_requirements: Optional[dict], locale: str,
    ) -> ImproveSuggestion: ...


class GeminiAIService(AIService):
    """Production implementation. Model choice per-operation comes from
    settings (GEMINI_MODEL_RESUME, etc.) so changing models never
    requires a code change."""

    async def extract_resume(self, db: AsyncSession, user_id: Optional[UUID], raw_text: str, locale: str) -> StructuredResume:
        cache_key = hash_input("resume_extraction", raw_text, locale)
        cached = await get_cached(db, cache_key)
        if cached is not None:
            return StructuredResume.model_validate(cached)

        prompt = build_extraction_prompt(raw_text, locale)
        result = await generate_structured(
            db, prompt=prompt, model=settings.GEMINI_MODEL_RESUME,
            schema=StructuredResume, feature="resume_extraction", user_id=user_id, max_output_tokens=3000,
        )
        await set_cached(
            db, cache_key, feature="resume_extraction",
            input_hash=cache_key, result=result.model_dump(mode="json"),
            model=settings.GEMINI_MODEL_RESUME,
        )
        return result

    async def extract_job(self, db: AsyncSession, user_id: Optional[UUID], raw_description: str, locale: str) -> JobExtraction:
        cache_key = hash_input("job_extraction", raw_description, locale)
        cached = await get_cached(db, cache_key)
        if cached is not None:
            return JobExtraction.model_validate(cached)

        prompt = build_job_extraction_prompt(raw_description, locale)
        result = await generate_structured(
            db, prompt=prompt, model=settings.GEMINI_MODEL_JOB_ANALYSIS,
            schema=JobExtraction, feature="job_extraction", user_id=user_id, max_output_tokens=1500,
        )
        await set_cached(
            db, cache_key, feature="job_extraction",
            input_hash=cache_key, result=result.model_dump(mode="json"),
            model=settings.GEMINI_MODEL_JOB_ANALYSIS,
        )
        return result

    async def match_candidate(
        self, db: AsyncSession, user_id: Optional[UUID], candidate: dict, job_requirements: dict, locale: str,
    ) -> MatchEvaluation:
        cache_key = hash_input(
            "match_evaluation", str(sorted(candidate.items())), str(sorted(job_requirements.items())), locale,
        )
        cached = await get_cached(db, cache_key)
        if cached is not None:
            return MatchEvaluation.model_validate(cached)

        prompt = build_match_evaluation_prompt(candidate, job_requirements, locale)
        result = await generate_structured(
            db, prompt=prompt, model=settings.GEMINI_MODEL_JOB_ANALYSIS,
            schema=MatchEvaluation, feature="job_matching", user_id=user_id, max_output_tokens=1000,
        )
        await set_cached(
            db, cache_key, feature="job_matching",
            input_hash=cache_key, result=result.model_dump(mode="json"),
            model=settings.GEMINI_MODEL_JOB_ANALYSIS,
        )
        return result

    async def generate_question(
        self, db: AsyncSession, user_id: Optional[UUID], *, mode: str, difficulty: str,
        job_title: Optional[str], job_requirements: Optional[dict], candidate_summary: Optional[str],
        previous_qa: list[dict], custom_topic: Optional[str], locale: str,
    ) -> GeneratedQuestion:
        # Not cached — each question depends on session-specific history,
        # so there's nothing deterministic to reuse (section 25 still
        # applies via the AIRequest log for cost visibility, just no cache).
        prompt = build_question_prompt(
            mode=mode, difficulty=difficulty, job_title=job_title, job_requirements=job_requirements,
            candidate_summary=candidate_summary, previous_qa=previous_qa, custom_topic=custom_topic, locale=locale,
        )
        return await generate_structured(
            db, prompt=prompt, model=settings.GEMINI_MODEL_INTERVIEW,
            schema=GeneratedQuestion, feature="interview_question", user_id=user_id, max_output_tokens=300,
        )

    async def evaluate_answer(
        self, db: AsyncSession, user_id: Optional[UUID], *, mode: str, question: str, answer: str, locale: str,
    ) -> AnswerEvaluationResult:
        prompt = build_evaluation_prompt(mode=mode, question=question, answer=answer, locale=locale)
        return await generate_structured(
            db, prompt=prompt, model=settings.GEMINI_MODEL_EVALUATION,
            schema=AnswerEvaluationResult, feature="answer_evaluation", user_id=user_id, max_output_tokens=1200,
        )

    async def generate_learning_plan(
        self, db: AsyncSession, user_id: Optional[UUID], *, days: int, job_title: Optional[str],
        skill_gaps: list[str], recurring_weaknesses: list[str], locale: str,
    ) -> LearningPlanGeneration:
        # Not cached — personalized to the candidate's current gaps, which
        # are expected to change session to session.
        prompt = build_learning_plan_prompt(
            days=days, job_title=job_title, skill_gaps=skill_gaps,
            recurring_weaknesses=recurring_weaknesses, locale=locale,
        )
        return await generate_structured(
            db, prompt=prompt, model=settings.GEMINI_MODEL_DEFAULT,
            schema=LearningPlanGeneration, feature="learning_plan", user_id=user_id, max_output_tokens=1500,
        )

    async def generate_resume(
        self, db: AsyncSession, user_id: Optional[UUID], answers: dict, locale: str,
    ) -> StructuredResume:
        # Cached on the exact answers: re-submitting an unchanged
        # questionnaire (e.g. a double-click, or going back and
        # regenerating) costs nothing.
        import json as _json
        cache_key = hash_input("resume_generation", _json.dumps(answers, sort_keys=True), locale)
        cached = await get_cached(db, cache_key)
        if cached is not None:
            return StructuredResume.model_validate(cached)

        prompt = build_generation_prompt(answers, locale)
        result = await generate_structured(
            db, prompt=prompt, model=settings.GEMINI_MODEL_RESUME,
            schema=StructuredResume, feature="resume_generation", user_id=user_id,
            max_output_tokens=3000,
        )
        await set_cached(
            db, cache_key, feature="resume_generation",
            input_hash=cache_key, result=result.model_dump(mode="json"),
            model=settings.GEMINI_MODEL_RESUME,
        )
        return result

    async def generate_resume_suggestion(
        self, db: AsyncSession, user_id: Optional[UUID], section: str,
        section_content: dict, job_requirements: Optional[dict], locale: str,
    ) -> ImproveSuggestion:
        # Deterministic on (section content + job requirements) — re-running
        # with unchanged inputs is served from cache (section 25).
        cache_key = hash_input(
            "resume_suggestion", section, str(sorted(section_content.items())),
            str(job_requirements or {}), locale,
        )
        cached = await get_cached(db, cache_key)
        if cached is not None:
            return ImproveSuggestion.model_validate(cached)

        prompt = build_improve_prompt(section, section_content, job_requirements, locale)
        result = await generate_structured(
            db, prompt=prompt, model=settings.GEMINI_MODEL_FAST,
            schema=ImproveSuggestion, feature="resume_suggestion", user_id=user_id, max_output_tokens=500,
        )
        await set_cached(
            db, cache_key, feature="resume_suggestion",
            input_hash=cache_key, result=result.model_dump(mode="json"),
            model=settings.GEMINI_MODEL_FAST,
        )
        return result


class MockAIService(AIService):
    """Deterministic fake used by the test suite (section 38) — no real
    Gemini calls are ever required to run the tests."""

    async def extract_resume(self, db: AsyncSession, user_id: Optional[UUID], raw_text: str, locale: str) -> StructuredResume:
        return StructuredResume(summary=None, skills=[], work_experience=[], education=[])

    async def extract_job(self, db: AsyncSession, user_id: Optional[UUID], raw_description: str, locale: str) -> JobExtraction:
        return JobExtraction()

    async def match_candidate(
        self, db: AsyncSession, user_id: Optional[UUID], candidate: dict, job_requirements: dict, locale: str,
    ) -> MatchEvaluation:
        return MatchEvaluation()

    async def generate_question(
        self, db: AsyncSession, user_id: Optional[UUID], *, mode: str, difficulty: str,
        job_title: Optional[str], job_requirements: Optional[dict], candidate_summary: Optional[str],
        previous_qa: list[dict], custom_topic: Optional[str], locale: str,
    ) -> GeneratedQuestion:
        return GeneratedQuestion(prompt="Tell me about a challenging situation you handled well.", category=mode)

    async def evaluate_answer(
        self, db: AsyncSession, user_id: Optional[UUID], *, mode: str, question: str, answer: str, locale: str,
    ) -> AnswerEvaluationResult:
        return AnswerEvaluationResult(score=5.0)

    async def generate_learning_plan(
        self, db: AsyncSession, user_id: Optional[UUID], *, days: int, job_title: Optional[str],
        skill_gaps: list[str], recurring_weaknesses: list[str], locale: str,
    ) -> LearningPlanGeneration:
        return LearningPlanGeneration(items=[])

    async def generate_resume(
        self, db: AsyncSession, user_id: Optional[UUID], answers: dict, locale: str,
    ) -> StructuredResume:
        # Mock mode maps the answers straight across with no rewriting, so
        # the wizard is fully usable without an API key.
        return StructuredResume(
            full_name=answers.get("full_name"),
            email=answers.get("email"),
            phone=answers.get("phone"),
            location=answers.get("location"),
            headline=answers.get("target_role"),
            summary=answers.get("summary"),
            skills=[{"name": s} for s in answers.get("skills", []) if s],
            work_experience=answers.get("experience", []),
            education=answers.get("education", []),
            languages=answers.get("languages", []),
            certifications=answers.get("certifications", []),
        )

    async def generate_resume_suggestion(
        self, db: AsyncSession, user_id: Optional[UUID], section: str,
        section_content: dict, job_requirements: Optional[dict], locale: str,
    ) -> ImproveSuggestion:
        return ImproveSuggestion(suggestion=None, based_on=[])


def get_ai_service() -> AIService:
    """Returns the configured AI provider.

    Fails fast with a clear, actionable 503 when Gemini is selected but
    unconfigured — otherwise the missing key surfaces deep inside the
    SDK as an opaque 500 (section 36: never leak internals, always give
    the caller something useful).
    """
    if settings.ENVIRONMENT == "test" or settings.AI_PROVIDER == "mock":
        return MockAIService()

    if settings.AI_PROVIDER != "gemini":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unknown AI_PROVIDER '{settings.AI_PROVIDER}'. Use 'gemini' or 'mock'.",
        )

    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "AI features are not configured. Set GEMINI_API_KEY in your .env "
                "(get one at https://aistudio.google.com/apikey), or set "
                "AI_PROVIDER=mock to run without AI while developing."
            ),
        )

    return GeminiAIService()

import hashlib
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.data.example_jobs import get_example, list_examples
from app.db.session import get_db
from app.models.job import Job, JobMatch, JobRequirement
from app.models.resume import ResumeVersion
from app.models.user import User
from app.schemas.job import JobCreate, JobMatchOut, JobOut, MatchRequest
from app.services.ai.base import get_ai_service
from app.services.ai.embeddings import cosine_similarity, embed_text
from app.services.auth.jwt import get_current_user
from app.services.matching.scorer import combine_scores, score_experience, score_skill_list
from app.services.usage import check_and_increment_usage

router = APIRouter()


def _hash_description(text: str) -> str:
    return hashlib.sha256(text.strip().lower().encode("utf-8")).hexdigest()


async def _get_owned_job(db: AsyncSession, user: User, job_id: uuid.UUID) -> Job:
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.user_id == user.id).options(selectinload(Job.requirements))
    )
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: JobCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Job:
    description_hash = _hash_description(payload.raw_description)

    # Cache check at the row level too: if this exact description was
    # already ingested by this user, reuse it instead of re-extracting
    # (section 25 — never regenerate job analysis when unchanged).
    existing = (await db.execute(
        select(Job).where(Job.user_id == user.id, Job.description_hash == description_hash)
        .options(selectinload(Job.requirements))
    )).scalar_one_or_none()
    if existing:
        return existing

    ai = get_ai_service()
    extraction = await ai.extract_job(db, user.id, payload.raw_description, user.locale)

    job = Job(
        user_id=user.id,
        title=payload.title or extraction.title or "Untitled role",
        company=payload.company,
        location=extraction.location,
        seniority=extraction.seniority,
        raw_description=payload.raw_description,
        description_hash=description_hash,
    )
    db.add(job)
    await db.flush()

    if settings.EMBEDDINGS_ENABLED:
        job.embedding = await embed_text(db, payload.raw_description)

    requirement = JobRequirement(
        job_id=job.id,
        required_skills=extraction.required_skills,
        preferred_skills=extraction.preferred_skills,
        experience_requirements=extraction.experience_requirements.model_dump(),
        education_requirements=extraction.education_requirements,
        responsibilities=extraction.responsibilities,
        languages=extraction.languages,
        technologies=extraction.technologies,
        other_qualifications=extraction.other_qualifications,
    )
    db.add(requirement)
    await db.commit()
    await db.refresh(job, attribute_names=["requirements"])
    return job


@router.get("", response_model=list[JobOut])
async def list_jobs(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Job]:
    result = await db.execute(
        select(Job).where(Job.user_id == user.id).options(selectinload(Job.requirements))
    )
    return list(result.scalars().all())


@router.get("/examples")
async def list_example_jobs() -> list[dict]:
    """Curated sample postings across professions. Public and static —
    no auth, no DB, no AI cost. Registered before /{job_id} on purpose:
    FastAPI matches routes in order, and /{job_id} would otherwise
    swallow "examples" and fail UUID validation."""
    return list_examples()


@router.post("/examples/{example_id}", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def add_example_job(
    example_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Job:
    """Adds an example posting to the user's own jobs. Goes through the
    normal create path, so extraction is cached by description hash: the
    first user to add a given example pays for extraction, everyone after
    reuses the cached result."""
    example = get_example(example_id)
    if example is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Example job not found")
    return await create_job(
        JobCreate(raw_description=example["description"], title=example["title"], company=example["company"]),
        user, db,
    )


@router.get("/{job_id}", response_model=JobOut)
async def get_job(
    job_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Job:
    return await _get_owned_job(db, user, job_id)


@router.post("/{job_id}/match", response_model=JobMatchOut, status_code=status.HTTP_201_CREATED)
async def match_job(
    job_id: uuid.UUID,
    payload: MatchRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JobMatch:
    job = await _get_owned_job(db, user, job_id)
    if job.requirements is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Job has no extracted requirements")

    version = (await db.execute(
        select(ResumeVersion).join(ResumeVersion.resume).where(
            ResumeVersion.id == payload.resume_version_id,
        )
    )).scalar_one_or_none()
    if version is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume version not found")

    plan = user.subscription.plan if user.subscription else "free"
    await check_and_increment_usage(db, user.id, plan, "job_match")

    content = version.content or {}
    candidate_skills = [s.get("name", "") for s in content.get("skills", []) if s.get("name")]
    candidate_years = _estimate_years_experience(content.get("work_experience", []))

    req = job.requirements
    required_score, matched_required, missing_required = score_skill_list(candidate_skills, req.required_skills or [])
    preferred_score, matched_preferred, _ = score_skill_list(candidate_skills, req.preferred_skills or [])
    technical_score, matched_tech, missing_tech = score_skill_list(candidate_skills, req.technologies or [])

    min_years = (req.experience_requirements or {}).get("min_years")
    experience_score = score_experience(candidate_years, min_years)

    # Semantic refinement — only applied when embeddings are enabled; the
    # deterministic scores above already stand on their own without it.
    if settings.EMBEDDINGS_ENABLED and job.embedding is not None:
        candidate_text = " ".join(candidate_skills) + " " + " ".join(
            we.get("description", "") for we in content.get("work_experience", [])
        )
        candidate_embedding = await embed_text(db, candidate_text)
        if candidate_embedding:
            similarity = cosine_similarity(job.embedding, candidate_embedding)
            technical_score = round((technical_score + similarity) / 2, 3)

    ai = get_ai_service()
    evaluation = await ai.match_candidate(
        db, user.id,
        candidate={"skills": candidate_skills, "work_experience": content.get("work_experience", [])},
        job_requirements={"responsibilities": req.responsibilities, "required_skills": req.required_skills},
        locale=user.locale,
    )

    overall = combine_scores(
        required_requirements_score=required_score,
        experience_score=experience_score,
        technical_skills_score=technical_score,
        responsibilities_score=evaluation.responsibilities_coverage_score,
        preferred_score=preferred_score,
    )

    match = JobMatch(
        job_id=job.id,
        resume_version_id=version.id,
        overall_score=overall,
        required_requirements_score=round(required_score * 100, 1),
        experience_score=round(experience_score * 100, 1),
        technical_skills_score=round(technical_score * 100, 1),
        responsibilities_score=round(evaluation.responsibilities_coverage_score * 100, 1),
        preferred_score=round(preferred_score * 100, 1),
        strong_matches=list(set(matched_required + matched_tech + evaluation.strong_matches)),
        gaps=list(set(missing_required + missing_tech + evaluation.gaps)),
        partial_matches=evaluation.partial_matches,
        explanation=evaluation.explanation or _default_explanation(required_score, experience_score, technical_score),
    )
    db.add(match)
    await db.commit()
    await db.refresh(match)
    return match


def _estimate_years_experience(work_experience: list[dict]) -> float:
    """Rough deterministic estimate from stated date ranges — never
    inferred beyond what the candidate's own resume states."""
    total_months = 0
    for entry in work_experience:
        start = entry.get("start_date")
        end = entry.get("end_date")
        if not start:
            continue
        try:
            sy, sm = (int(x) for x in (start + "-01").split("-")[:2])
        except (ValueError, IndexError):
            continue
        if entry.get("is_current") or not end:
            from datetime import date
            ey, em = date.today().year, date.today().month
        else:
            try:
                ey, em = (int(x) for x in (end + "-01").split("-")[:2])
            except (ValueError, IndexError):
                continue
        total_months += max(0, (ey - sy) * 12 + (em - sm))
    return round(total_months / 12, 1)


def _default_explanation(required: float, experience: float, technical: float) -> str:
    return (
        f"Required requirements matched: {round(required * 100)}%. "
        f"Experience relative to the role's stated minimum: {round(experience * 100)}%. "
        f"Skill/tool overlap: {round(technical * 100)}%."
    )

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.rate_limit import ai_rate_limit, limiter
from app.db.session import get_db
from app.models.job import Job, JobRequirement
from app.models.resume import Resume, ResumeVersion
from app.models.user import User
from app.schemas.resume import (
    CreateVersionRequest,
    ImproveSectionRequest,
    ImproveSectionResponse,
    ResumeOut,
    ResumeUpdate,
    ResumeVersionOut,
    ResumeVersionUpdate,
    ResumeWizardRequest,
)
from app.services.ai.base import get_ai_service
from app.services.auth.jwt import get_current_user
from app.services.parsing.resume_extractor import extract_text, read_and_validate_upload
from app.services.usage import check_and_increment_usage

router = APIRouter()


async def _get_owned_resume(db: AsyncSession, user: User, resume_id: uuid.UUID) -> Resume:
    result = await db.execute(
        select(Resume)
        .where(Resume.id == resume_id, Resume.user_id == user.id)
        .options(selectinload(Resume.versions))
    )
    resume = result.scalar_one_or_none()
    if resume is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return resume


@router.post("", response_model=ResumeOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(ai_rate_limit)
async def upload_resume(
    request: Request,
    file: UploadFile,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Resume:
    plan = user.subscription.plan if user.subscription else "free"
    await check_and_increment_usage(db, user.id, plan, "resume_analysis")

    data, kind = await read_and_validate_upload(file)
    text = extract_text(data, kind)  # original bytes are discarded after this line (section 9)

    ai = get_ai_service()
    structured = await ai.extract_resume(db, user.id, text, user.locale)

    is_first = (await db.execute(select(Resume).where(Resume.user_id == user.id))).first() is None

    resume = Resume(
        user_id=user.id,
        title=structured.headline or file.filename or "My Resume",
        source="upload",
        original_filename=file.filename,
        extracted_text=text,
        is_primary=is_first,
    )
    db.add(resume)
    await db.flush()

    version = ResumeVersion(
        resume_id=resume.id,
        version_number=1,
        label="Original",
        template="minimal",
        content=structured.model_dump(mode="json"),
    )
    db.add(version)
    await db.commit()
    await db.refresh(resume, attribute_names=["versions"])
    return resume


@router.post("/generate", response_model=ResumeOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(ai_rate_limit)
async def generate_resume(
    request: Request,
    payload: ResumeWizardRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Resume:
    """Builds a resume from questionnaire answers. Counted against its own
    'resume_generation' allowance (2/month on Free), separate from
    uploading and parsing an existing resume."""
    plan = user.subscription.plan if user.subscription else "free"
    await check_and_increment_usage(db, user.id, plan, "resume_generation")

    ai = get_ai_service()
    structured = await ai.generate_resume(db, user.id, payload.model_dump(mode="json"), user.locale)

    is_first = (await db.execute(select(Resume).where(Resume.user_id == user.id))).first() is None
    resume = Resume(
        user_id=user.id,
        title=payload.target_role or structured.headline or f"{payload.full_name} — Resume",
        source="builder",
        is_primary=is_first,
    )
    db.add(resume)
    await db.flush()

    db.add(ResumeVersion(
        resume_id=resume.id, version_number=1, label="Generated",
        template="minimal", content=structured.model_dump(mode="json"),
    ))
    await db.commit()
    await db.refresh(resume, attribute_names=["versions"])
    return resume


@router.get("", response_model=list[ResumeOut])
async def list_resumes(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Resume]:
    result = await db.execute(
        select(Resume).where(Resume.user_id == user.id).options(selectinload(Resume.versions))
    )
    return list(result.scalars().all())


@router.get("/{resume_id}", response_model=ResumeOut)
async def get_resume(
    resume_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Resume:
    return await _get_owned_resume(db, user, resume_id)


@router.patch("/{resume_id}", response_model=ResumeOut)
async def update_resume(
    resume_id: uuid.UUID,
    payload: ResumeUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Resume:
    resume = await _get_owned_resume(db, user, resume_id)
    if payload.title is not None:
        resume.title = payload.title
    if payload.is_primary:
        # Only one primary resume per user.
        others = await db.execute(
            select(Resume).where(Resume.user_id == user.id, Resume.id != resume.id)
        )
        for other in others.scalars().all():
            other.is_primary = False
        resume.is_primary = True
    await db.commit()
    await db.refresh(resume, attribute_names=["versions"])
    return resume


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    resume = await _get_owned_resume(db, user, resume_id)
    await db.delete(resume)
    await db.commit()


@router.post("/{resume_id}/versions", response_model=ResumeVersionOut, status_code=status.HTTP_201_CREATED)
async def create_version(
    resume_id: uuid.UUID,
    payload: CreateVersionRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ResumeVersion:
    resume = await _get_owned_resume(db, user, resume_id)

    content: dict = {}
    if payload.copy_from_version_id:
        source = next((v for v in resume.versions if v.id == payload.copy_from_version_id), None)
        if source is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source version not found")
        content = dict(source.content)

    if payload.tailored_for_job_id:
        job = (await db.execute(
            select(Job).where(Job.id == payload.tailored_for_job_id, Job.user_id == user.id)
        )).scalar_one_or_none()
        if job is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    next_number = max((v.version_number for v in resume.versions), default=0) + 1
    version = ResumeVersion(
        resume_id=resume.id,
        version_number=next_number,
        label=payload.label or f"Version {next_number}",
        template=payload.template,
        tailored_for_job_id=payload.tailored_for_job_id,
        content=content,
    )
    db.add(version)
    await db.commit()
    await db.refresh(version)
    return version


@router.patch("/{resume_id}/versions/{version_id}", response_model=ResumeVersionOut)
async def update_version(
    resume_id: uuid.UUID,
    version_id: uuid.UUID,
    payload: ResumeVersionUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ResumeVersion:
    resume = await _get_owned_resume(db, user, resume_id)
    version = next((v for v in resume.versions if v.id == version_id), None)
    if version is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    if payload.label is not None:
        version.label = payload.label
    if payload.template is not None:
        version.template = payload.template
    if payload.content is not None:
        # The candidate accepting/editing content directly — this is the
        # user's own edit, not an unreviewed AI write (section 10).
        version.content = payload.content

    await db.commit()
    await db.refresh(version)
    return version


@router.post("/{resume_id}/versions/{version_id}/improve", response_model=ImproveSectionResponse)
async def improve_section(
    resume_id: uuid.UUID,
    version_id: uuid.UUID,
    payload: ImproveSectionRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ImproveSectionResponse:
    """Returns a suggestion only — never mutates the resume. The candidate
    must explicitly accept it via PATCH .../versions/{id} (section 10)."""
    resume = await _get_owned_resume(db, user, resume_id)
    version = next((v for v in resume.versions if v.id == version_id), None)
    if version is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    job_requirements: Optional[dict] = None
    if payload.job_id:
        req = (await db.execute(
            select(JobRequirement).where(JobRequirement.job_id == payload.job_id)
        )).scalar_one_or_none()
        if req:
            job_requirements = {
                "required_skills": req.required_skills, "preferred_skills": req.preferred_skills,
                "responsibilities": req.responsibilities,
            }

    ai = get_ai_service()
    result = await ai.generate_resume_suggestion(
        db, user.id, payload.section, payload.section_content, job_requirements, user.locale,
    )
    return ImproveSectionResponse(suggestion=result.suggestion, based_on=result.based_on)

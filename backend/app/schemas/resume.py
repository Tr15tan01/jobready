"""
Schemas for the resume domain.

`StructuredResume` is the schema the AI's JSON extraction output is
validated against (section 9/42/43) — anything the model returns that
doesn't fit this shape is rejected, never silently trusted. Missing
fields are represented as `None`/empty lists, never guessed.
"""
from datetime import date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ExtractedWorkExperience(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None  # "YYYY-MM" or None — AI must not invent precision it doesn't have
    end_date: Optional[str] = None
    is_current: bool = False
    description: Optional[str] = None
    technologies: list[str] = Field(default_factory=list)


class ExtractedEducation(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class ExtractedSkill(BaseModel):
    name: str
    category: Optional[str] = None  # language|framework|tool|soft


class StructuredResume(BaseModel):
    """The contract the AI extraction operation must return. Validated
    with Pydantic before it's ever stored or shown to the user."""

    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    headline: Optional[str] = None
    summary: Optional[str] = None
    links: dict[str, str] = Field(default_factory=dict)
    skills: list[ExtractedSkill] = Field(default_factory=list)
    work_experience: list[ExtractedWorkExperience] = Field(default_factory=list)
    education: list[ExtractedEducation] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)

    @field_validator("skills", mode="before")
    @classmethod
    def coerce_skill_strings(cls, v):
        # The model sometimes returns skills as plain strings — normalize
        # rather than reject, since the meaning is unambiguous.
        if isinstance(v, list):
            return [{"name": s} if isinstance(s, str) else s for s in v]
        return v


# ---- API request/response models -----------------------------------------

class ResumeVersionOut(BaseModel):
    id: UUID
    version_number: int
    label: Optional[str]
    template: str
    tailored_for_job_id: Optional[UUID]
    content: dict

    model_config = {"from_attributes": True}


class ResumeOut(BaseModel):
    id: UUID
    title: str
    source: str
    original_filename: Optional[str]
    is_primary: bool
    versions: list[ResumeVersionOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    is_primary: Optional[bool] = None


class ResumeVersionUpdate(BaseModel):
    label: Optional[str] = None
    template: Optional[str] = None
    content: Optional[dict] = None


class CreateVersionRequest(BaseModel):
    """Create a new version, optionally tailored to a job and/or copied
    from an existing version (section 10)."""
    label: Optional[str] = None
    copy_from_version_id: Optional[UUID] = None
    tailored_for_job_id: Optional[UUID] = None
    template: str = "minimal"


class ImproveSectionRequest(BaseModel):
    """'Improve with AI' for one resume section (section 10). The AI may
    only reword using data already present in `section_content` and,
    optionally, the target job's requirements — never invent new facts."""
    section: str  # summary|experience|skills|education
    section_content: dict
    job_id: Optional[UUID] = None


class ImproveSectionResponse(BaseModel):
    suggestion: Optional[str]
    based_on: list[str] = Field(default_factory=list)
    cached: bool = False


# ---- Resume wizard -------------------------------------------------------

class WizardExperience(BaseModel):
    company: str = Field(max_length=200)
    title: str = Field(max_length=200)
    start_date: Optional[str] = Field(default=None, max_length=20)
    end_date: Optional[str] = Field(default=None, max_length=20)
    is_current: bool = False
    description: Optional[str] = Field(default=None, max_length=3000)


class WizardEducation(BaseModel):
    institution: str = Field(max_length=200)
    degree: Optional[str] = Field(default=None, max_length=200)
    field_of_study: Optional[str] = Field(default=None, max_length=200)
    end_date: Optional[str] = Field(default=None, max_length=20)


class ResumeWizardRequest(BaseModel):
    """Questionnaire answers. Length caps bound input-token cost per
    generation, and are generous enough for any real resume."""
    full_name: str = Field(min_length=1, max_length=200)
    email: Optional[str] = Field(default=None, max_length=320)
    phone: Optional[str] = Field(default=None, max_length=50)
    location: Optional[str] = Field(default=None, max_length=200)
    target_role: Optional[str] = Field(default=None, max_length=200)
    summary: Optional[str] = Field(default=None, max_length=2000)
    experience: list[WizardExperience] = Field(default_factory=list, max_length=15)
    education: list[WizardEducation] = Field(default_factory=list, max_length=8)
    skills: list[str] = Field(default_factory=list, max_length=60)
    languages: list[str] = Field(default_factory=list, max_length=15)
    certifications: list[str] = Field(default_factory=list, max_length=20)

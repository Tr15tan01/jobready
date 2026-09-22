from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ExperienceRequirements(BaseModel):
    min_years: Optional[float] = None
    description: Optional[str] = None


class JobExtraction(BaseModel):
    """Contract the AI job-extraction operation must return. Deliberately
    profession-neutral — see prompts/job_extraction.py."""

    title: Optional[str] = None
    seniority: Optional[str] = None
    location: Optional[str] = None
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    experience_requirements: ExperienceRequirements = Field(default_factory=ExperienceRequirements)
    education_requirements: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    other_qualifications: list[str] = Field(default_factory=list)


class MatchEvaluation(BaseModel):
    """AI-judged qualitative component of the match score (section 12)."""
    responsibilities_coverage_score: float = 0.0
    strong_matches: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    partial_matches: list[str] = Field(default_factory=list)
    explanation: str = ""


# ---- API request/response models -----------------------------------------

class JobCreate(BaseModel):
    raw_description: str
    title: Optional[str] = None
    company: Optional[str] = None


class JobRequirementOut(BaseModel):
    required_skills: list[str]
    preferred_skills: list[str]
    experience_requirements: Optional[dict]
    education_requirements: list[str]
    responsibilities: list[str]
    languages: list[str]
    technologies: list[str]
    other_qualifications: list[str]

    model_config = {"from_attributes": True}


class JobOut(BaseModel):
    id: UUID
    title: str
    company: Optional[str]
    location: Optional[str]
    seniority: Optional[str]
    requirements: Optional[JobRequirementOut]

    model_config = {"from_attributes": True}


class MatchRequest(BaseModel):
    resume_version_id: UUID


class JobMatchOut(BaseModel):
    id: UUID
    overall_score: float
    required_requirements_score: float
    experience_score: float
    technical_skills_score: float
    responsibilities_score: float
    preferred_score: float
    strong_matches: list[str]
    gaps: list[str]
    partial_matches: list[str]
    explanation: Optional[str]

    model_config = {"from_attributes": True}

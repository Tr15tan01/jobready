from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, billing, interviews, jobs, learning_plan, me, progress, resumes, speech_practice, usage

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(me.router, prefix="/me", tags=["me"])
api_router.include_router(resumes.router, prefix="/resumes", tags=["resumes"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
api_router.include_router(interviews.router, prefix="/interviews", tags=["interviews"])
api_router.include_router(speech_practice.router, prefix="/speech-practice", tags=["speech-practice"])
api_router.include_router(progress.router, prefix="/progress", tags=["progress"])
api_router.include_router(learning_plan.router, prefix="/learning-plan", tags=["learning-plan"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(usage.router, prefix="/usage", tags=["usage"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])

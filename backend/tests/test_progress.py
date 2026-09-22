from app.api.v1.endpoints.progress import _recommend_next_action
from app.schemas.progress import LearningPlanGeneration


class FakeMatch:
    def __init__(self, gaps):
        self.gaps = gaps


class FakeProgress:
    def __init__(self, overall_score=None, communication_score=None, technical_score=None):
        self.overall_score = overall_score
        self.communication_score = communication_score
        self.technical_score = technical_score


def test_recommends_matching_when_no_match_yet():
    assert "job description" in _recommend_next_action(None, None, [])


def test_recommends_baseline_interview_when_no_progress_yet():
    match = FakeMatch(gaps=["Kubernetes"])
    assert "baseline" in _recommend_next_action(match, None, [])


def test_recommends_weakest_area_when_available():
    match = FakeMatch(gaps=["Kubernetes"])
    progress = FakeProgress(overall_score=7.0)
    rec = _recommend_next_action(match, progress, ["Give more concrete examples"])
    assert "Give more concrete examples" in rec


def test_falls_back_to_resume_gap_when_no_weaknesses():
    match = FakeMatch(gaps=["Kubernetes"])
    progress = FakeProgress(overall_score=7.0)
    rec = _recommend_next_action(match, progress, [])
    assert "Kubernetes" in rec


def test_learning_plan_generation_defaults_to_empty_items():
    plan = LearningPlanGeneration.model_validate({})
    assert plan.items == []

from app.services.matching.scorer import combine_scores, score_experience, score_skill_list


def test_skill_matching_is_profession_neutral_psychologist():
    candidate_skills = ["Cognitive Behavioral Therapy", "Clinical Supervision", "DSM-5 Assessment"]
    required = ["CBT", "Clinical supervision experience", "Trauma-informed care"]
    # "CBT" won't fuzzy-match "Cognitive Behavioral Therapy" (different strings) —
    # this documents current behavior: exact/substring/near-miss only, not
    # synonym resolution. That's a known limitation, not a tech-specific bug.
    score, matched, missing = score_skill_list(candidate_skills, required)
    assert "Clinical supervision experience" in matched
    assert "Trauma-informed care" in missing
    assert 0.0 <= score <= 1.0


def test_skill_matching_is_profession_neutral_architect():
    candidate_skills = ["AutoCAD", "Revit", "Structural Analysis", "Building Codes"]
    required = ["AutoCAD", "Revit", "LEED Certification"]
    score, matched, missing = score_skill_list(candidate_skills, required)
    assert "AutoCAD" in matched
    assert "Revit" in matched
    assert "LEED Certification" in missing
    assert abs(score - (2 / 3)) < 0.01


def test_skill_matching_software_engineer_unaffected():
    candidate_skills = ["Node.js", "PostgreSQL", "REST APIs"]
    required = ["Node.js", "PostgreSQL", "Kubernetes"]
    score, matched, missing = score_skill_list(candidate_skills, required)
    assert "Kubernetes" in missing
    assert len(matched) == 2


def test_no_required_skills_scores_full():
    score, matched, missing = score_skill_list(["anything"], [])
    assert score == 1.0
    assert matched == [] and missing == []


def test_experience_scoring_partial_and_full():
    assert score_experience(2, 4) == 0.5
    assert score_experience(5, 4) == 1.0
    assert score_experience(0, None) == 1.0  # no minimum stated


def test_combine_scores_uses_configured_weights():
    overall = combine_scores(
        required_requirements_score=1.0,
        experience_score=1.0,
        technical_skills_score=1.0,
        responsibilities_score=1.0,
        preferred_score=1.0,
    )
    assert overall == 100.0  # all weights sum to 1.0, perfect match -> 100%

    zero = combine_scores(0, 0, 0, 0, 0)
    assert zero == 0.0

"""
Admins see behaviour and aggregates, never candidate content (spec
section 28). Pins that boundary so content fields can't creep into the
admin API later.
"""
from app.schemas.admin import AdminUserDetail, RecentSession

FORBIDDEN = {"transcript", "extracted_text", "raw_description", "content", "answer", "summary",
             "hashed_password", "token_version"}


def _all_fields(model) -> set[str]:
    return set(model.model_fields)


def test_user_detail_exposes_no_candidate_content():
    leaked = _all_fields(AdminUserDetail) & FORBIDDEN
    assert not leaked, f"admin detail exposes content fields: {leaked}"


def test_recent_sessions_exclude_transcripts():
    leaked = _all_fields(RecentSession) & FORBIDDEN
    assert not leaked, f"admin session list exposes content: {leaked}"


def test_admin_user_view_excludes_credentials():
    from app.schemas.admin import AdminUserOut
    assert not (_all_fields(AdminUserOut) & {"hashed_password", "token_version"})

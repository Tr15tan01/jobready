"""
Guards the database schema against problems that only surface at
migration time (i.e. after `alembic upgrade head` is already half-run),
which are painful to debug and easy to reintroduce.
"""
import warnings

from sqlalchemy.schema import sort_tables

from app.db.base import Base
import app.models  # noqa: F401  registers every model on Base.metadata


def test_no_circular_foreign_key_dependencies():
    """Two tables with FKs pointing at each other have no valid CREATE
    TABLE ordering, so `alembic upgrade head` fails partway through with
    'relation X does not exist'. The fix is use_alter=True on one side,
    which defers that constraint to a separate ALTER TABLE.

    This caught a real bug: interview_questions.generated_from_answer_id
    and interview_answers.question_id referenced each other.
    """
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        sort_tables(Base.metadata.tables.values())

    cycle_warnings = [
        str(w.message) for w in caught
        if "cycle" in str(w.message).lower() or "circular" in str(w.message).lower()
    ]
    assert not cycle_warnings, (
        "Circular FK dependency detected — add use_alter=True (with an explicit "
        f"constraint name) to one side:\n{cycle_warnings}"
    )


def test_interview_tables_order_correctly():
    """The specific pair that broke: questions must be creatable before
    answers, with the back-reference deferred via use_alter."""
    ordered = [t.name for t in sort_tables(Base.metadata.tables.values())]
    assert ordered.index("interview_questions") < ordered.index("interview_answers")


def test_every_table_has_a_primary_key():
    missing = [name for name, t in Base.metadata.tables.items() if not t.primary_key.columns]
    assert not missing, f"Tables without a primary key: {missing}"


def test_expected_table_count():
    """Sanity check that the model registry is fully imported — if a
    models module stops being imported, autogenerate would silently emit
    an incomplete migration."""
    assert len(Base.metadata.tables) == 27, (
        f"Expected 27 tables, found {len(Base.metadata.tables)}: "
        f"{sorted(Base.metadata.tables)}"
    )


def test_all_datetime_columns_are_timezone_aware():
    """Every datetime written by this app is timezone-aware
    (datetime.now(timezone.utc)). A column declared as bare
    `Mapped[datetime]` becomes TIMESTAMP WITHOUT TIME ZONE, which asyncpg
    rejects at insert time with 'can't subtract offset-naive and
    offset-aware datetimes'.

    This caught a real bug: 6 columns (candidate_progress.recorded_at,
    learning_items.completed_at, ai_cache.expires_at,
    users.email_verified_at, subscriptions.current_period_end,
    notifications.read_at) were all naive.
    """
    from sqlalchemy import DateTime

    naive = []
    for table_name, table in Base.metadata.tables.items():
        for col in table.columns:
            if isinstance(col.type, DateTime) and not col.type.timezone:
                naive.append(f"{table_name}.{col.name}")

    assert not naive, (
        "These datetime columns are timezone-naive — add "
        f"DateTime(timezone=True):\n{naive}"
    )


def test_user_subscription_is_eagerly_loaded():
    """`user.subscription` is read on every plan-gated endpoint from the
    User that get_current_user returns, which isn't eager-loaded
    per-query. Under async SQLAlchemy, lazily loading a relationship
    outside a greenlet context raises MissingGreenlet at runtime — so
    this must stay eager.

    This caught a real bug: every usage-limited endpoint (interviews,
    jobs, resumes, speech practice, /me) crashed with MissingGreenlet.
    """
    from sqlalchemy import inspect

    from app.models.user import User

    rel = inspect(User).relationships["subscription"]
    assert rel.lazy == "selectin", (
        "User.subscription must use lazy='selectin' — a lazy load here "
        "raises MissingGreenlet under the async engine."
    )

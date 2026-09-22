from app.api.v1.endpoints import admin
from app.services.auth.jwt import get_current_admin


def _all_dependant_call_names(route) -> set:
    """Collects the names of every callable FastAPI will call as a
    dependency for this route (including nested sub-dependencies)."""
    names = set()

    def walk(dependant):
        if dependant.call is not None:
            names.add(dependant.call)
        for sub in dependant.dependencies:
            walk(sub)

    walk(route.dependant)
    return names


def test_every_admin_route_requires_admin_dependency():
    """Regression guard: if a future admin endpoint is added without
    Depends(get_current_admin), this test fails loudly instead of
    shipping an unprotected admin route."""
    assert len(admin.router.routes) > 0, "Admin router has no routes — test may be stale"
    for route in admin.router.routes:
        dependants = _all_dependant_call_names(route)
        assert get_current_admin in dependants, (
            f"Admin route {route.path} does not depend on get_current_admin"
        )

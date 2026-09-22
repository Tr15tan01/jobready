"""
Consistent error handling (section 36) and structured logging (section
37). Every request gets a correlation id; unhandled exceptions are
logged with full detail server-side but the client only ever sees a
generic message plus that id, never a stack trace.
"""
import logging
import sys
import time
import uuid

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(
        '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}'
    ))
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attaches a correlation id to every request/response and logs
    basic timing — the minimum viable request tracing without pulling in
    a full APM agent."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        request.state.request_id = request_id
        start = time.monotonic()

        try:
            response = await call_next(request)
        except Exception as exc:  # noqa: BLE001 - deliberate catch-all
            # Catching here, rather than relying on Starlette's built-in
            # error handler, matters for CORS: that handler sits OUTSIDE
            # CORSMiddleware, so its 500 response carries no
            # Access-Control-Allow-Origin header and the browser reports a
            # misleading "blocked by CORS policy" error instead of the real
            # failure. This middleware sits inside CORSMiddleware, so the
            # response it returns gets the right headers.
            logging.getLogger("jobready.errors").exception(
                "Unhandled exception [%s] on %s %s", request_id, request.method, request.url.path
            )
            duration_ms = int((time.monotonic() - start) * 1000)
            logging.getLogger("jobready.request").info(
                "%s %s 500 %dms [%s]", request.method, request.url.path, duration_ms, request_id
            )
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "detail": "An unexpected error occurred. Please try again.",
                    "request_id": request_id,
                },
                headers={"X-Request-ID": request_id},
            )

        duration_ms = int((time.monotonic() - start) * 1000)
        response.headers["X-Request-ID"] = request_id
        logging.getLogger("jobready.request").info(
            "%s %s %s %dms [%s]",
            request.method, request.url.path, response.status_code, duration_ms, request_id,
        )
        return response


def register_exception_handlers(app: FastAPI) -> None:
    logger = logging.getLogger("jobready.errors")

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        # Pydantic validation errors are safe to return as-is — they only
        # describe the shape of the client's own request.
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors(), "request_id": getattr(request.state, "request_id", None)},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", None)
        logger.exception("Unhandled exception [%s]: %s", request_id, exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "An unexpected error occurred. Please try again.",
                "request_id": request_id,
            },
        )

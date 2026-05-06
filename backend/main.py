# Optimized by Skills Agent for RecruitAI
# FastAPI application entrypoint
"""
RecruitAI Backend – Application Factory
========================================
Creates and configures the FastAPI application with all routers,
middleware, and lifecycle hooks.

Run with::

    uvicorn backend.main:app --reload
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.core.config import get_settings
from backend.core.database import engine, Base
from backend.api.upload import router as upload_router, init_upload_deps
from backend.api.match import router as match_router
from backend.api.chatbot import router as chatbot_router
from backend.api.auth import router as auth_router
from backend.api.email_cv import router as email_cv_router, init_email_cv_deps

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-28s │ %(levelname)-7s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("recruitai.main")


# ── Lifespan ───────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown hooks."""
    settings = get_settings()
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)

    # Initialise upload dependencies (storage, worker, job store)
    init_upload_deps()
    logger.info("Upload dependencies initialised")
    init_email_cv_deps()
    logger.info("Email CV plugin initialised")
    # Create DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized")

    yield  # ← app runs here

    logger.info("Shutting down %s", settings.APP_NAME)


# ── App Factory ────────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=f"{settings.APP_NAME} API",
        version=settings.APP_VERSION,
        description=(
            "RecruitAI – PDF tabanlı CV'leri otomatik analiz eden "
            "IK ön eleme asistanı backend API'si."
        ),
        lifespan=lifespan,
    )

    # ── CORS ───────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Tighten in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ────────────────────────────────────────────────────
    app.include_router(auth_router, prefix=settings.API_PREFIX)
    app.include_router(upload_router, prefix=settings.API_PREFIX)
    app.include_router(match_router, prefix=settings.API_PREFIX)
    app.include_router(chatbot_router, prefix=f"{settings.API_PREFIX}/chatbot")
    app.include_router(email_cv_router, prefix=settings.API_PREFIX)

    # ── Health check ───────────────────────────────────────────────
    @app.get("/health", tags=["system"])
    async def health():
        return {"status": "ok", "service": settings.APP_NAME, "version": settings.APP_VERSION}

    # ── Frontend Static Files ──────────────────────────────────────
    frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
    if frontend_dir.exists():
        # Serve static assets (CSS, JS)
        app.mount("/static", StaticFiles(directory=str(frontend_dir / "static")), name="static")
        # Serve index.html at root (html=True auto-serves index.html)
        app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

    return app


# ── Module-level app instance (for uvicorn) ────────────────────────────────
app = create_app()

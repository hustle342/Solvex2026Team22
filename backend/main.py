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

from backend.core.config import get_settings
from backend.api.upload import router as upload_router, init_upload_deps
from backend.api.match import router as match_router
from backend.api.chat import router as chat_router

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
    app.include_router(upload_router, prefix=settings.API_PREFIX)
    app.include_router(match_router, prefix=settings.API_PREFIX)
    app.include_router(chat_router, prefix=settings.API_PREFIX)

    dashboard_dir = Path(__file__).resolve().parent.parent / "apps" / "dashboard"
    if dashboard_dir.exists():
        app.mount("/dashboard", StaticFiles(directory=str(dashboard_dir), html=True), name="dashboard")

    # ── Health check ───────────────────────────────────────────────
    @app.get("/health", tags=["system"])
    async def health():
        return {"status": "ok", "service": settings.APP_NAME, "version": settings.APP_VERSION}

    return app


# ── Module-level app instance (for uvicorn) ────────────────────────────────
app = create_app()

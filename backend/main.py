import os
import sys
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

# Setup path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.database import init_db
from app.core.job_queue import job_queue
from app.core.logging import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Initialize database
    init_db()
    logger.info("Database initialized")
    
    # Start job queue workers
    await job_queue.start()
    logger.info("Job queue started")
    
    yield
    
    # Shutdown
    logger.info("Shutting down VIRA AI backend")

app = FastAPI(
    title="VIRA AI",
    description="AI-powered video creation platform",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for media
from pathlib import Path
storage_dir = settings.STORAGE_DIR
app.mount("/storage", StaticFiles(directory=str(storage_dir)), name="storage")

# Include routers
from app.api.routes import projects, video, youtube, voiceover, subtitles, text_to_video, export_routes, system

app.include_router(projects.router, prefix="/api/v1")
app.include_router(video.router, prefix="/api/v1")
app.include_router(youtube.router, prefix="/api/v1")
app.include_router(voiceover.router, prefix="/api/v1")
app.include_router(subtitles.router, prefix="/api/v1")
app.include_router(text_to_video.router, prefix="/api/v1")
app.include_router(export_routes.router, prefix="/api/v1")
app.include_router(system.router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"error": str(exc)})

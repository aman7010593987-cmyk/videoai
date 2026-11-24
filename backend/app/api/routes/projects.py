from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.models.project import Project, ProjectStatus
from pydantic import BaseModel
import uuid
from datetime import datetime

router = APIRouter(prefix="/projects", tags=["projects"])

class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    project_type: str = "general"
    tags: List[str] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None

@router.get("/")
def list_projects(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    project_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Project).filter(Project.status == ProjectStatus.ACTIVE)
    if search:
        query = query.filter(Project.name.contains(search))
    if project_type:
        query = query.filter(Project.project_type == project_type)
    projects = query.order_by(Project.updated_at.desc()).offset(skip).limit(limit).all()
    return {"projects": [p.to_dict() for p in projects], "total": query.count()}

@router.post("/")
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.description,
        project_type=data.project_type,
        tags=data.tags,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project.to_dict()

@router.get("/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project.to_dict()

@router.put("/{project_id}")
def update_project(project_id: str, data: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    if data.tags is not None:
        project.tags = data.tags
    db.commit()
    db.refresh(project)
    return project.to_dict()

@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.status = ProjectStatus.DELETED
    db.commit()
    return {"success": True}

@router.get("/stats/summary")
def get_stats(db: Session = Depends(get_db)):
    from app.models.export import Export, VideoClip
    from app.models.job import ProcessingJob
    import os
    from app.core.config import settings
    
    total_projects = db.query(Project).filter(Project.status == ProjectStatus.ACTIVE).count()
    total_exports = db.query(Export).count()
    total_clips = db.query(VideoClip).count()
    running_jobs = db.query(ProcessingJob).filter(ProcessingJob.status == "running").count()
    
    # Storage usage
    storage_bytes = 0
    for d in [settings.UPLOADS_DIR, settings.OUTPUTS_DIR]:
        for root, _, files in os.walk(d):
            for f in files:
                try:
                    storage_bytes += os.path.getsize(os.path.join(root, f))
                except:
                    pass
    
    recent = db.query(Project).filter(
        Project.status == ProjectStatus.ACTIVE
    ).order_by(Project.updated_at.desc()).limit(5).all()
    
    return {
        "total_projects": total_projects,
        "videos_generated": total_exports,
        "shorts_created": total_clips,
        "processing_jobs": running_jobs,
        "storage_bytes": storage_bytes,
        "storage_mb": round(storage_bytes / 1024 / 1024, 2),
        "recent_projects": [p.to_dict() for p in recent],
    }

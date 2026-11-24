import asyncio
import uuid
import json
from typing import Dict, Optional, Callable, Any
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class Job:
    def __init__(self, job_id: str, job_type: str, metadata: dict = None):
        self.id = job_id
        self.type = job_type
        self.status = JobStatus.PENDING
        self.progress = 0
        self.message = "Queued..."
        self.result = None
        self.error = None
        self.created_at = datetime.utcnow()
        self.started_at = None
        self.completed_at = None
        self.metadata = metadata or {}
        self._task: Optional[asyncio.Task] = None
    
    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "status": self.status,
            "progress": self.progress,
            "message": self.message,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "metadata": self.metadata,
        }

class JobQueue:
    def __init__(self, max_concurrent: int = 2):
        self._jobs: Dict[str, Job] = {}
        self._queue: asyncio.Queue = asyncio.Queue()
        self._max_concurrent = max_concurrent
        self._running = 0
        self._workers = []
    
    async def start(self):
        for i in range(self._max_concurrent):
            worker = asyncio.create_task(self._worker(i))
            self._workers.append(worker)
        logger.info(f"JobQueue started with {self._max_concurrent} workers")
    
    async def _worker(self, worker_id: int):
        while True:
            try:
                job_id, coro_fn, args, kwargs = await self._queue.get()
                job = self._jobs.get(job_id)
                if not job or job.status == JobStatus.CANCELLED:
                    self._queue.task_done()
                    continue
                
                job.status = JobStatus.RUNNING
                job.started_at = datetime.utcnow()
                self._running += 1
                logger.info(f"Worker {worker_id} starting job {job_id} ({job.type})")
                
                try:
                    result = await coro_fn(job, *args, **kwargs)
                    if job.status != JobStatus.CANCELLED:
                        job.status = JobStatus.COMPLETED
                        job.result = result
                        job.progress = 100
                        job.message = "Completed"
                        job.completed_at = datetime.utcnow()
                        logger.info(f"Job {job_id} completed")
                except Exception as e:
                    logger.error(f"Job {job_id} failed: {e}", exc_info=True)
                    if job.status != JobStatus.CANCELLED:
                        job.status = JobStatus.FAILED
                        job.error = str(e)
                        job.message = f"Failed: {str(e)}"
                        job.completed_at = datetime.utcnow()
                finally:
                    self._running -= 1
                    self._queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}", exc_info=True)
    
    def submit(self, job_type: str, coro_fn: Callable, *args, metadata: dict = None, **kwargs) -> str:
        job_id = str(uuid.uuid4())
        job = Job(job_id, job_type, metadata)
        self._jobs[job_id] = job
        self._queue.put_nowait((job_id, coro_fn, args, kwargs))
        logger.info(f"Job {job_id} ({job_type}) submitted")
        return job_id
    
    def get_job(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)
    
    def cancel_job(self, job_id: str) -> bool:
        job = self._jobs.get(job_id)
        if job and job.status in (JobStatus.PENDING, JobStatus.RUNNING):
            job.status = JobStatus.CANCELLED
            job.message = "Cancelled by user"
            return True
        return False
    
    def list_jobs(self) -> list:
        return [j.to_dict() for j in self._jobs.values()]
    
    def cleanup_old_jobs(self, max_age_hours: int = 24):
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)
        to_delete = [
            jid for jid, j in self._jobs.items()
            if j.completed_at and j.completed_at < cutoff
        ]
        for jid in to_delete:
            del self._jobs[jid]

# Global queue instance
job_queue = JobQueue(max_concurrent=2)

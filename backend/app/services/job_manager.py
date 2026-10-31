import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models import ResearchSession, InvestigationJob
from app.services.event_stream import sse_manager

logger = logging.getLogger("proofpath.job_manager")


class JobManager:
    def __init__(self):
        # Maps job_id to asyncio.Task
        self._running_tasks: Dict[str, asyncio.Task] = {}
        # Concurrency semaphore for active investigations
        self._semaphore = asyncio.Semaphore(5)

    def is_job_running(self, job_id: str) -> bool:
        task = self._running_tasks.get(job_id)
        return task is not None and not task.done()

    def get_session_active_job(self, session_id: str, db: Session) -> Optional[InvestigationJob]:
        return (
            db.query(InvestigationJob)
            .filter(
                InvestigationJob.session_id == session_id,
                InvestigationJob.status.in_(["pending", "running"])
            )
            .order_by(InvestigationJob.created_at.desc())
            .first()
        )

    def get_session_latest_job(self, session_id: str, db: Session) -> Optional[InvestigationJob]:
        return (
            db.query(InvestigationJob)
            .filter(InvestigationJob.session_id == session_id)
            .order_by(InvestigationJob.created_at.desc())
            .first()
        )

    def start_investigation_job(self, session_id: str, force_rerun: bool = False) -> Tuple[InvestigationJob, bool]:
        """
        Idempotent job starter:
        - If an investigation is already pending or running, returns existing job (no duplicate processing).
        - If an investigation is already completed and force_rerun is False, returns existing completed job.
        - Otherwise, creates a new persisted job and spawns an asynchronous worker.
        Does NOT block the main API request.
        """
        db = SessionLocal()
        try:
            # 1. Check for existing active job to avoid duplicate processing
            existing_job = self.get_session_active_job(session_id, db)
            if existing_job:
                logger.info(f"Session {session_id} already has active job {existing_job.id}. Skipping duplicate launch.")
                return existing_job, False

            session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
            if not session:
                raise ValueError(f"Research session {session_id} not found.")

            # 2. Check if already completed and not force_rerun
            if not force_rerun:
                latest_job = self.get_session_latest_job(session_id, db)
                if latest_job and latest_job.status == "completed":
                    logger.info(f"Session {session_id} already completed with job {latest_job.id}. Skipping duplicate launch.")
                    return latest_job, False

            # Create new persisted InvestigationJob
            job = InvestigationJob(
                session_id=session_id,
                status="pending",
                current_stage="QUEUED",
                stage_index=0,
                total_stages=15,
                progress_percent=0.0,
                message="Investigation job queued for processing.",
                retry_count=0,
                max_retries=2,
                started_at=datetime.now(timezone.utc),
                heartbeat_at=datetime.now(timezone.utc)
            )
            db.add(job)
            session.status = "processing"
            db.commit()
            db.refresh(job)

            # Spawn asynchronous worker task
            job_id = job.id
            task = asyncio.create_task(self._run_worker(job_id=job_id, session_id=session_id))
            self._running_tasks[job_id] = task

            logger.info(f"Spawned background investigation job {job_id} for session {session_id}.")
            return job, True

        finally:
            db.close()

    async def _run_worker(self, job_id: str, session_id: str) -> None:
        """
        Background worker executing the 15-stage pipeline under concurrency control.
        """
        async with self._semaphore:
            from app.services.pipeline_orchestrator import PipelineOrchestrator

            db = SessionLocal()
            try:
                job = db.query(InvestigationJob).filter(InvestigationJob.id == job_id).first()
                if not job:
                    logger.error(f"Job {job_id} not found in database.")
                    return

                job.status = "running"
                job.heartbeat_at = datetime.now(timezone.utc)
                db.commit()

                orchestrator = PipelineOrchestrator(
                    db=db,
                    session_id=session_id,
                    job_id=job_id
                )
                await orchestrator.run_15_stage_pipeline()

            except Exception as e:
                logger.exception(f"Unhandled worker error in job {job_id}: {e}")
                try:
                    job = db.query(InvestigationJob).filter(InvestigationJob.id == job_id).first()
                    session = db.query(ResearchSession).filter(ResearchSession.id == session_id).first()
                    if job:
                        job.status = "failed"
                        job.error_message = str(e)
                        job.completed_at = datetime.now(timezone.utc)
                    if session:
                        session.status = "failed"
                    db.commit()

                    await sse_manager.broadcast(
                        session_id=session_id,
                        stage="INVESTIGATION_FAILED",
                        progress=-1,
                        message=f"Investigation failed: {str(e)}",
                        event_type="investigation_failed"
                    )
                except Exception as inner_e:
                    logger.error(f"Error persisting job failure: {inner_e}")
            finally:
                db.close()
                self._running_tasks.pop(job_id, None)


job_manager = JobManager()

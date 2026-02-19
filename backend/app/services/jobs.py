from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Job

JOB_SYNC_EVENT = "sync_event"
JOB_CLUSTER_EVENT = "cluster_event"
JOB_MATCH_GUEST = "match_guest"

JOB_STATUS_QUEUED = "queued"
JOB_STATUS_RUNNING = "running"
JOB_STATUS_CANCEL_REQUESTED = "cancel_requested"
JOB_STATUS_CANCELED = "canceled"
JOB_STATUS_COMPLETED = "completed"
JOB_STATUS_FAILED = "failed"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def create_job(
    db: Session,
    *,
    job_type: str,
    event_id: str | None = None,
    query_id: str | None = None,
    payload: dict | None = None,
    stage: str = "queued",
) -> Job:
    job = Job(
        job_type=job_type,
        event_id=event_id,
        query_id=query_id,
        payload=payload or {},
        status=JOB_STATUS_QUEUED,
        stage=stage,
        progress_percent=0.0,
    )
    db.add(job)
    db.flush()
    return job


def acquire_next_job(db: Session) -> Job | None:
    stmt = select(Job).where(Job.status == JOB_STATUS_QUEUED).order_by(Job.created_at.asc()).limit(1)
    try:
        stmt = stmt.with_for_update(skip_locked=True)
    except Exception:
        pass
    job = db.execute(stmt).scalar_one_or_none()
    if not job:
        return None
    job.status = JOB_STATUS_RUNNING
    job.started_at = utc_now()
    job.locked_at = utc_now()
    job.attempts = int(job.attempts or 0) + 1
    job.stage = "running"
    return job


def mark_job_progress(db: Session, job: Job, *, progress_percent: float, stage: str) -> None:
    job.progress_percent = float(max(0.0, min(100.0, progress_percent)))
    job.stage = stage
    job.updated_at = utc_now()
    db.add(job)


def upsert_job_payload(job: Job, updates: dict | None = None) -> None:
    payload = dict(job.payload or {})
    if updates:
        payload.update(updates)
    job.payload = payload


def mark_job_completed(db: Session, job: Job, *, stage: str = "completed", payload: dict | None = None) -> None:
    job.status = JOB_STATUS_COMPLETED
    job.progress_percent = 100.0
    job.stage = stage
    if payload is not None:
        job.payload = payload
    job.completed_at = utc_now()
    job.updated_at = utc_now()
    db.add(job)


def mark_job_failed(db: Session, job: Job, message: str) -> None:
    job.status = JOB_STATUS_FAILED
    job.stage = "failed"
    job.error_text = str(message or "Job failed")
    job.updated_at = utc_now()
    db.add(job)


def mark_job_canceled(db: Session, job: Job, reason: str = "Canceled by admin") -> None:
    job.status = JOB_STATUS_CANCELED
    job.stage = "canceled"
    job.error_text = str(reason or "Canceled")
    job.updated_at = utc_now()
    job.completed_at = utc_now()
    db.add(job)


def request_job_cancel(db: Session, job: Job, reason: str = "Cancel requested by admin") -> Job:
    if job.status in {JOB_STATUS_COMPLETED, JOB_STATUS_FAILED, JOB_STATUS_CANCELED}:
        return job
    if job.status == JOB_STATUS_QUEUED:
        mark_job_canceled(db, job, reason=reason)
        return job
    if job.status == JOB_STATUS_RUNNING:
        job.status = JOB_STATUS_CANCEL_REQUESTED
        job.stage = "cancel_requested"
        job.error_text = str(reason or "Cancel requested by admin")
        job.updated_at = utc_now()
        db.add(job)
        return job
    if job.status == JOB_STATUS_CANCEL_REQUESTED:
        return job
    mark_job_canceled(db, job, reason=reason)
    return job

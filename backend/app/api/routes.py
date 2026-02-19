from __future__ import annotations

import hmac
import re
from datetime import datetime, timezone
from datetime import timedelta

from fastapi import APIRouter, Depends, File, Form, Header, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import extract_bearer_token, generate_guest_code, generate_token, hash_secret, verify_secret
from app.config import Settings, get_settings
from app.db import get_db
from app.errors import APIException
from app.models import Event, Face, GuestQuery, GuestResult, Job, Photo
from app.schemas import (
    AdminEventCounters,
    AdminEventOverview,
    AdminEventsResponse,
    AdminPhotoLink,
    AdminQuerySummary,
    EventCreateRequest,
    EventCreateResponse,
    EventResponse,
    GuestMatchResponse,
    GuestPhotoResponse,
    GuestResolveRequest,
    GuestResolveResponse,
    JobResponse,
)
from app.services.jobs import JOB_MATCH_GUEST, JOB_SYNC_EVENT, create_job
from app.services.storage import save_selfie
from app.utils.drive import extract_drive_folder_id

router = APIRouter()


@router.post("/events", response_model=EventCreateResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreateRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> EventCreateResponse:
    folder_id = extract_drive_folder_id(payload.drive_link)
    if not folder_id:
        raise APIException("invalid_drive_link", "Invalid Google Drive folder link", status.HTTP_400_BAD_REQUEST)
    if not settings.google_drive_api_key:
        raise APIException(
            "missing_drive_key",
            "GOOGLE_DRIVE_API_KEY is not configured on the backend",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    slug = _resolve_slug(db=db, source=payload.slug or payload.name)
    guest_code = generate_guest_code(8)
    admin_token = generate_token(24)

    event = Event(
        name=payload.name.strip(),
        slug=slug,
        drive_link=payload.drive_link.strip(),
        drive_folder_id=folder_id,
        guest_code_hash=hash_secret(guest_code),
        admin_token_hash=hash_secret(admin_token),
        status="syncing",
    )
    db.add(event)
    db.flush()

    initial_job = create_job(
        db,
        job_type=JOB_SYNC_EVENT,
        event_id=event.id,
        payload={"trigger": "event_create"},
        stage="queued_for_sync",
    )
    db.commit()

    guest_url = ""
    return EventCreateResponse(
        event_id=event.id,
        slug=event.slug,
        guest_code=guest_code,
        admin_token=admin_token,
        guest_url=guest_url,
        status=event.status,
        initial_job_id=initial_job.id,
    )


@router.get("/events/{event_id}", response_model=EventResponse)
def get_event(
    event_id: str,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> EventResponse:
    event = _get_event_or_404(db=db, event_id=event_id)
    _require_event_admin(event=event, authorization=authorization)
    jobs = (
        db.execute(select(Job).where(Job.event_id == event_id).order_by(Job.created_at.desc()).limit(20))
        .scalars()
        .all()
    )
    guest_ready = event.status == "ready"
    guest_url = f"{settings.public_frontend_url.rstrip('/')}/g/{event.slug}" if guest_ready else ""
    return EventResponse(
        event_id=event.id,
        name=event.name,
        slug=event.slug,
        drive_link=event.drive_link,
        drive_folder_id=event.drive_folder_id,
        status=event.status,
        guest_ready=guest_ready,
        guest_url=guest_url,
        created_at=event.created_at,
        updated_at=event.updated_at,
        jobs=[_job_response(item) for item in jobs],
    )


@router.post("/events/{event_id}/resync", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
def resync_event(
    event_id: str,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> JobResponse:
    event = _get_event_or_404(db=db, event_id=event_id)
    _require_event_admin(event=event, authorization=authorization)
    event.status = "syncing"
    job = create_job(
        db,
        job_type=JOB_SYNC_EVENT,
        event_id=event.id,
        payload={"trigger": "manual_resync"},
        stage="queued_for_sync",
    )
    db.commit()
    return _job_response(job)


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> JobResponse:
    job = db.get(Job, job_id)
    if not job:
        raise APIException("job_not_found", "Job not found", status.HTTP_404_NOT_FOUND)

    if job.event_id:
        event = db.get(Event, job.event_id)
        if not event:
            raise APIException("event_not_found", "Event not found for this job", status.HTTP_404_NOT_FOUND)
        _require_event_admin(event=event, authorization=authorization)
    return _job_response(job)


@router.post("/guest/events/resolve", response_model=GuestResolveResponse)
def resolve_guest_event(payload: GuestResolveRequest, db: Session = Depends(get_db)) -> GuestResolveResponse:
    event = db.execute(select(Event).where(Event.slug == payload.slug.strip().lower())).scalar_one_or_none()
    if not event:
        raise APIException("event_not_found", "Event not found", status.HTTP_404_NOT_FOUND)
    if event.status != "ready":
        raise APIException(
            "event_not_ready",
            "Event is still processing images. Try again after processing completes.",
            status.HTTP_409_CONFLICT,
        )
    if not verify_secret(payload.guest_code.strip().upper(), event.guest_code_hash):
        raise APIException("invalid_guest_code", "Invalid guest code", status.HTTP_401_UNAUTHORIZED)
    return GuestResolveResponse(event_id=event.id, slug=event.slug, status=event.status)


@router.post("/guest/matches", response_model=GuestMatchResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_guest_match(
    slug: str = Form(...),
    guest_code: str = Form(...),
    selfie: UploadFile = File(...),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> GuestMatchResponse:
    normalized_slug = slug.strip().lower()
    event = db.execute(select(Event).where(Event.slug == normalized_slug)).scalar_one_or_none()
    if not event:
        raise APIException("event_not_found", "Event not found", status.HTTP_404_NOT_FOUND)
    if event.status != "ready":
        raise APIException(
            "event_not_ready",
            "Event is still processing images. Try again after processing completes.",
            status.HTTP_409_CONFLICT,
        )
    if not verify_secret(guest_code.strip().upper(), event.guest_code_hash):
        raise APIException("invalid_guest_code", "Invalid guest code", status.HTTP_401_UNAUTHORIZED)
    if not selfie.content_type or not selfie.content_type.startswith("image/"):
        raise APIException("invalid_selfie", "Upload a valid image file", status.HTTP_400_BAD_REQUEST)

    payload = await selfie.read()
    if not payload:
        raise APIException("invalid_selfie", "Selfie file is empty", status.HTTP_400_BAD_REQUEST)

    query = GuestQuery(
        event_id=event.id,
        status="queued",
        selfie_path="",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.selfie_retention_hours),
        message="Selfie received. Processing started.",
    )
    db.add(query)
    db.flush()

    relative_selfie = save_selfie(settings=settings, query_id=query.id, file_name=selfie.filename or "selfie.jpg", payload=payload)
    query.selfie_path = relative_selfie
    db.add(query)

    create_job(
        db,
        job_type=JOB_MATCH_GUEST,
        event_id=event.id,
        query_id=query.id,
        payload={"trigger": "guest_upload"},
        stage="queued_for_match",
    )
    db.commit()
    return GuestMatchResponse(
        query_id=query.id,
        status=query.status,
        cluster_id=None,
        confidence=0.0,
        photos=[],
        message=query.message,
    )


@router.get("/guest/matches/{query_id}", response_model=GuestMatchResponse)
def get_guest_match(query_id: str, db: Session = Depends(get_db)) -> GuestMatchResponse:
    query = db.get(GuestQuery, query_id)
    if not query:
        raise APIException("query_not_found", "Guest query not found", status.HTTP_404_NOT_FOUND)

    if query.status in {"queued", "running"}:
        return GuestMatchResponse(
            query_id=query.id,
            status=query.status,
            cluster_id=query.cluster_id,
            confidence=float(query.confidence or 0.0),
            photos=[],
            message=query.message or "Processing selfie...",
        )

    rows = (
        db.execute(
            select(GuestResult, Photo)
            .join(Photo, Photo.id == GuestResult.photo_id)
            .where(GuestResult.query_id == query.id)
            .order_by(GuestResult.rank.asc())
        )
        .all()
    )
    photos = [
        GuestPhotoResponse(
            photo_id=photo.id,
            file_name=photo.file_name,
            thumbnail_url=f"/storage/{photo.thumbnail_path}",
            web_view_link=photo.web_view_link,
            download_url=photo.download_url,
            score=float(result.score),
            rank=int(result.rank),
        )
        for result, photo in rows
    ]
    return GuestMatchResponse(
        query_id=query.id,
        status=query.status,
        cluster_id=query.cluster_id,
        confidence=float(query.confidence or 0.0),
        photos=photos,
        message=query.message or "Done",
    )


@router.get("/health")
def health() -> dict[str, str | bool]:
    return {"ok": True, "service": "grabpic-api"}


@router.get("/admin/events", response_model=AdminEventsResponse)
def admin_events_overview(
    limit: int = 40,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AdminEventsResponse:
    _require_system_admin(authorization=authorization, settings=settings)

    safe_limit = max(1, min(200, int(limit)))
    total_events = int(db.execute(select(func.count(Event.id))).scalar_one() or 0)
    events = db.execute(select(Event).order_by(Event.created_at.desc()).limit(safe_limit)).scalars().all()

    response_items: list[AdminEventOverview] = []
    for event in events:
        photos_count = int(db.execute(select(func.count(Photo.id)).where(Photo.event_id == event.id)).scalar_one() or 0)
        faces_count = int(db.execute(select(func.count(Face.id)).where(Face.event_id == event.id)).scalar_one() or 0)
        jobs_count = int(db.execute(select(func.count(Job.id)).where(Job.event_id == event.id)).scalar_one() or 0)
        running_jobs = int(
            db.execute(select(func.count(Job.id)).where(Job.event_id == event.id, Job.status == "running")).scalar_one() or 0
        )
        failed_jobs = int(
            db.execute(select(func.count(Job.id)).where(Job.event_id == event.id, Job.status == "failed")).scalar_one() or 0
        )
        guest_queries = int(
            db.execute(select(func.count(GuestQuery.id)).where(GuestQuery.event_id == event.id)).scalar_one() or 0
        )
        completed_queries = int(
            db.execute(
                select(func.count(GuestQuery.id)).where(GuestQuery.event_id == event.id, GuestQuery.status == "completed")
            ).scalar_one()
            or 0
        )
        matched_photos = int(
            db.execute(
                select(func.count(GuestResult.id))
                .join(GuestQuery, GuestQuery.id == GuestResult.query_id)
                .where(GuestQuery.event_id == event.id)
            ).scalar_one()
            or 0
        )

        latest_jobs = (
            db.execute(select(Job).where(Job.event_id == event.id).order_by(Job.created_at.desc()).limit(6)).scalars().all()
        )
        latest_queries = (
            db.execute(select(GuestQuery).where(GuestQuery.event_id == event.id).order_by(GuestQuery.created_at.desc()).limit(8))
            .scalars()
            .all()
        )

        query_summaries: list[AdminQuerySummary] = []
        for query in latest_queries:
            rows = (
                db.execute(
                    select(GuestResult, Photo)
                    .join(Photo, Photo.id == GuestResult.photo_id)
                    .where(GuestResult.query_id == query.id)
                    .order_by(GuestResult.rank.asc())
                    .limit(8)
                ).all()
            )
            links = [
                AdminPhotoLink(
                    photo_id=photo.id,
                    file_name=photo.file_name,
                    thumbnail_url=f"/storage/{photo.thumbnail_path}",
                    web_view_link=photo.web_view_link,
                    download_url=photo.download_url,
                    score=float(result.score),
                )
                for result, photo in rows
            ]
            query_summaries.append(
                AdminQuerySummary(
                    query_id=query.id,
                    status=query.status,
                    confidence=float(query.confidence or 0.0),
                    message=query.message or "",
                    created_at=query.created_at,
                    completed_at=query.completed_at,
                    match_count=len(links),
                    links=links,
                )
            )

        guest_ready = event.status == "ready"
        guest_url = f"{settings.public_frontend_url.rstrip('/')}/g/{event.slug}" if guest_ready else ""
        response_items.append(
            AdminEventOverview(
                event_id=event.id,
                name=event.name,
                slug=event.slug,
                status=event.status,
                drive_link=event.drive_link,
                drive_folder_id=event.drive_folder_id,
                guest_ready=guest_ready,
                guest_url=guest_url,
                created_at=event.created_at,
                updated_at=event.updated_at,
                counters=AdminEventCounters(
                    photos=photos_count,
                    faces=faces_count,
                    jobs=jobs_count,
                    running_jobs=running_jobs,
                    failed_jobs=failed_jobs,
                    guest_queries=guest_queries,
                    completed_queries=completed_queries,
                    matched_photos=matched_photos,
                ),
                latest_jobs=[_job_response(item) for item in latest_jobs],
                latest_queries=query_summaries,
            )
        )

    return AdminEventsResponse(total_events=total_events, events=response_items)


def _resolve_slug(db: Session, source: str) -> str:
    cleaned = re.sub(r"[^a-z0-9-]+", "-", str(source).strip().lower())
    cleaned = re.sub(r"-{2,}", "-", cleaned).strip("-")
    base = cleaned or "event"
    candidate = base[:95]
    suffix_counter = 1
    while db.execute(select(Event).where(Event.slug == candidate)).scalar_one_or_none():
        candidate = f"{base[:85]}-{suffix_counter:02d}"
        suffix_counter += 1
    return candidate


def _get_event_or_404(db: Session, event_id: str) -> Event:
    event = db.get(Event, event_id)
    if not event:
        raise APIException("event_not_found", "Event not found", status.HTTP_404_NOT_FOUND)
    return event


def _require_event_admin(*, event: Event, authorization: str | None) -> None:
    token = extract_bearer_token(authorization)
    if not token:
        raise APIException("admin_token_required", "Admin token required", status.HTTP_401_UNAUTHORIZED)
    if not verify_secret(token, event.admin_token_hash):
        raise APIException("invalid_admin_token", "Invalid admin token", status.HTTP_403_FORBIDDEN)


def _require_system_admin(*, authorization: str | None, settings: Settings) -> None:
    expected = str(settings.admin_dashboard_key or "").strip()
    if not expected:
        raise APIException(
            "admin_dashboard_key_missing",
            "ADMIN_DASHBOARD_KEY is not configured on the backend",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    token = extract_bearer_token(authorization)
    if not token:
        raise APIException("admin_key_required", "Admin dashboard key required", status.HTTP_401_UNAUTHORIZED)
    if not hmac.compare_digest(token, expected):
        raise APIException("invalid_admin_key", "Invalid admin dashboard key", status.HTTP_403_FORBIDDEN)


def _job_response(job: Job) -> JobResponse:
    return JobResponse(
        job_id=job.id,
        type=job.job_type,
        status=job.status,
        progress_percent=float(job.progress_percent or 0.0),
        stage=job.stage or "",
        error=job.error_text or "",
        payload=dict(job.payload or {}),
        created_at=job.created_at,
        updated_at=job.updated_at,
    )

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
from app.local_auth import get_local_user_by_id, list_local_users, update_local_user_role
from app.models import Event, EventMembership, Face, GuestQuery, GuestResult, Job, Photo
from app.rbac import (
    AppUser,
    get_current_user_optional,
    require_event_access,
    require_event_owner_or_super_admin,
    require_role,
)
from app.roles import Role
from app.schemas import (
    AdminEventStatusItem,
    AdminJobRow,
    AdminEventCounters,
    AdminEventOverview,
    AdminEventsResponse,
    AdminPhotoLink,
    AdminQuerySummary,
    EventGuestsResponse,
    EventGuestInfo,
    EventMembershipResponse,
    EventPhotoSafeResponse,
    GuestJoinLinkRequest,
    EventCreateRequest,
    EventCreateResponse,
    EventProcessingStatusResponse,
    EventUpdateRequest,
    EventResponse,
    GuestEventListItem,
    GuestEventSummary,
    GuestMyPhotoItem,
    GuestMyPhotosResponse,
    GlobalStatsResponse,
    GuestMatchResponse,
    GuestPhotoResponse,
    GuestResolveRequest,
    GuestResolveResponse,
    JobResponse,
    PhotographerEventListItem,
    UpdateUserRoleRequest,
    UserSummaryResponse,
)
from app.services.jobs import JOB_MATCH_GUEST, JOB_SYNC_EVENT, create_job
from app.services.jobs import (
    JOB_CLUSTER_EVENT,
    JOB_STATUS_CANCELED,
    JOB_STATUS_CANCEL_REQUESTED,
    JOB_STATUS_COMPLETED,
    JOB_STATUS_FAILED,
    JOB_STATUS_QUEUED,
    JOB_STATUS_RUNNING,
    request_job_cancel,
)
from app.services.storage import save_selfie
from app.utils.drive import extract_drive_folder_id

router = APIRouter()


@router.post("/events", response_model=EventCreateResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreateRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN, Role.PHOTOGRAPHER])),
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

    owner_user_id = current_user.user_id
    if current_user.role == Role.SUPER_ADMIN and payload.owner_user_id:
        owner = get_local_user_by_id(payload.owner_user_id.strip())
        if not owner:
            raise APIException("invalid_owner", "owner_user_id does not exist", status.HTTP_400_BAD_REQUEST)
        owner_user_id = owner.user_id
    elif current_user.role == Role.PHOTOGRAPHER:
        owner_user_id = current_user.user_id

    event = Event(
        name=payload.name.strip(),
        slug=slug,
        drive_link=payload.drive_link.strip(),
        drive_folder_id=folder_id,
        owner_user_id=owner_user_id,
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
    current_user: AppUser | None = Depends(get_current_user_optional),
) -> EventResponse:
    event = _get_event_or_404(db=db, event_id=event_id)
    if current_user:
        require_event_access(db=db, event=event, user=current_user)
        if current_user.role == Role.GUEST:
            jobs: list[Job] = []
        else:
            jobs = (
                db.execute(select(Job).where(Job.event_id == event_id).order_by(Job.created_at.desc()).limit(20))
                .scalars()
                .all()
            )
    else:
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
        owner_user_id=event.owner_user_id,
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
    current_user: AppUser | None = Depends(get_current_user_optional),
) -> JobResponse:
    event = _get_event_or_404(db=db, event_id=event_id)
    if current_user:
        require_event_owner_or_super_admin(event=event, user=current_user)
    else:
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


@router.get("/events/{event_id}/status", response_model=EventProcessingStatusResponse)
def event_processing_status(
    event_id: str,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
    current_user: AppUser | None = Depends(get_current_user_optional),
) -> EventProcessingStatusResponse:
    event = _get_event_or_404(db=db, event_id=event_id)
    if current_user:
        require_event_owner_or_super_admin(event=event, user=current_user)
    else:
        _require_event_admin(event=event, authorization=authorization)
    return _build_event_processing_status(db=db, event=event)


@router.post("/events/{event_id}/cancel", response_model=EventProcessingStatusResponse)
def cancel_event_processing(
    event_id: str,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
    current_user: AppUser | None = Depends(get_current_user_optional),
) -> EventProcessingStatusResponse:
    event = _get_event_or_404(db=db, event_id=event_id)
    if current_user:
        require_event_owner_or_super_admin(event=event, user=current_user)
    else:
        _require_event_admin(event=event, authorization=authorization)

    job = _latest_cancelable_event_job(db=db, event_id=event.id)
    if job:
        request_job_cancel(db, job, reason="Canceled by admin")
        _apply_cancellation_side_effects(db=db, job=job)
        db.commit()
        db.refresh(event)
    return _build_event_processing_status(db=db, event=event)


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user: AppUser | None = Depends(get_current_user_optional),
) -> JobResponse:
    job = db.get(Job, job_id)
    if not job:
        raise APIException("job_not_found", "Job not found", status.HTTP_404_NOT_FOUND)

    if job.event_id:
        event = db.get(Event, job.event_id)
        if not event:
            raise APIException("event_not_found", "Event not found for this job", status.HTTP_404_NOT_FOUND)
        if current_user:
            require_event_owner_or_super_admin(event=event, user=current_user)
        else:
            _require_event_admin(event=event, authorization=authorization)
    elif current_user and current_user.role != Role.SUPER_ADMIN:
        raise APIException("forbidden", "You do not have access to this job", status.HTTP_403_FORBIDDEN)
    elif not current_user:
        _require_system_admin(authorization=authorization, settings=settings)
    return _job_response(job)


@router.post("/jobs/{job_id}/cancel", response_model=JobResponse)
def cancel_job(
    job_id: str,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user: AppUser | None = Depends(get_current_user_optional),
) -> JobResponse:
    job = db.get(Job, job_id)
    if not job:
        raise APIException("job_not_found", "Job not found", status.HTTP_404_NOT_FOUND)

    if job.event_id:
        event = db.get(Event, job.event_id)
        if not event:
            raise APIException("event_not_found", "Event not found for this job", status.HTTP_404_NOT_FOUND)
        if current_user:
            require_event_owner_or_super_admin(event=event, user=current_user)
        elif not _is_system_admin(authorization=authorization, settings=settings):
            _require_event_admin(event=event, authorization=authorization)
    else:
        if current_user and current_user.role != Role.SUPER_ADMIN:
            raise APIException("forbidden", "You do not have access to this job", status.HTTP_403_FORBIDDEN)
        elif not current_user:
            _require_system_admin(authorization=authorization, settings=settings)

    request_job_cancel(db, job, reason="Canceled by admin")
    _apply_cancellation_side_effects(db=db, job=job)
    db.commit()
    return _job_response(job)


@router.patch("/events/{event_id}", response_model=EventResponse)
def update_event(
    event_id: str,
    payload: EventUpdateRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN, Role.PHOTOGRAPHER])),
) -> EventResponse:
    event = _get_event_or_404(db=db, event_id=event_id)
    require_event_owner_or_super_admin(event=event, user=current_user)

    if payload.name is not None:
        event.name = payload.name.strip()
    if payload.slug is not None:
        event.slug = _resolve_slug(db=db, source=payload.slug)
    if payload.drive_link is not None:
        folder_id = extract_drive_folder_id(payload.drive_link)
        if not folder_id:
            raise APIException("invalid_drive_link", "Invalid Google Drive folder link", status.HTTP_400_BAD_REQUEST)
        event.drive_link = payload.drive_link.strip()
        event.drive_folder_id = folder_id
    db.add(event)
    db.commit()
    jobs = db.execute(select(Job).where(Job.event_id == event_id).order_by(Job.created_at.desc()).limit(20)).scalars().all()
    guest_ready = event.status == "ready"
    guest_url = f"{settings.public_frontend_url.rstrip('/')}/g/{event.slug}" if guest_ready else ""
    return EventResponse(
        event_id=event.id,
        name=event.name,
        slug=event.slug,
        drive_link=event.drive_link,
        drive_folder_id=event.drive_folder_id,
        owner_user_id=event.owner_user_id,
        status=event.status,
        guest_ready=guest_ready,
        guest_url=guest_url,
        created_at=event.created_at,
        updated_at=event.updated_at,
        jobs=[_job_response(item) for item in jobs],
    )


@router.delete("/events/{event_id}")
def delete_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN, Role.PHOTOGRAPHER])),
) -> dict[str, bool]:
    event = _get_event_or_404(db=db, event_id=event_id)
    require_event_owner_or_super_admin(event=event, user=current_user)
    db.delete(event)
    db.commit()
    return {"deleted": True}


@router.get("/events/{event_id}/photos", response_model=list[EventPhotoSafeResponse])
def list_event_photos(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN, Role.PHOTOGRAPHER])),
) -> list[EventPhotoSafeResponse]:
    event = _get_event_or_404(db=db, event_id=event_id)
    require_event_owner_or_super_admin(event=event, user=current_user)
    photos = db.execute(select(Photo).where(Photo.event_id == event_id).order_by(Photo.created_at.desc())).scalars().all()
    return [
        EventPhotoSafeResponse(
            photo_id=photo.id,
            file_name=photo.file_name,
            thumbnail_url=f"/storage/{photo.thumbnail_path}",
            web_view_link=photo.web_view_link,
            download_url=photo.download_url,
        )
        for photo in photos
    ]


@router.get("/events/{event_id}/guests", response_model=EventGuestsResponse)
def list_event_guests(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN, Role.PHOTOGRAPHER])),
) -> EventGuestsResponse:
    event = _get_event_or_404(db=db, event_id=event_id)
    require_event_owner_or_super_admin(event=event, user=current_user)
    rows = (
        db.execute(select(EventMembership).where(EventMembership.event_id == event.id).order_by(EventMembership.created_at.desc()))
        .scalars()
        .all()
    )
    guests: list[EventGuestInfo] = []
    for row in rows:
        user = get_local_user_by_id(row.user_id)
        guests.append(EventGuestInfo(user_id=row.user_id, email=user.email if user else row.user_id, joined_at=row.created_at))
    return EventGuestsResponse(event_id=event.id, guests=guests)


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
    return GuestResolveResponse(event_id=event.id, slug=event.slug, status=event.status)


@router.post("/guest/events/{event_id}/join", response_model=EventMembershipResponse, status_code=status.HTTP_201_CREATED)
def join_event_as_guest(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.GUEST, Role.SUPER_ADMIN])),
) -> EventMembershipResponse:
    event = _get_event_or_404(db=db, event_id=event_id)
    membership = db.execute(
        select(EventMembership).where(EventMembership.event_id == event.id, EventMembership.user_id == current_user.user_id).limit(1)
    ).scalar_one_or_none()
    if not membership:
        membership = EventMembership(event_id=event.id, user_id=current_user.user_id)
        db.add(membership)
        db.commit()
        db.refresh(membership)
    return EventMembershipResponse(event_id=membership.event_id, user_id=membership.user_id, joined_at=membership.created_at)


@router.post("/guest/events/join-link", response_model=EventMembershipResponse, status_code=status.HTTP_201_CREATED)
def join_event_from_link(
    payload: GuestJoinLinkRequest,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.GUEST, Role.SUPER_ADMIN])),
) -> EventMembershipResponse:
    event = db.execute(select(Event).where(Event.slug == payload.slug.strip().lower()).limit(1)).scalar_one_or_none()
    if not event:
        raise APIException("event_not_found", "Event not found", status.HTTP_404_NOT_FOUND)
    membership = db.execute(
        select(EventMembership).where(EventMembership.event_id == event.id, EventMembership.user_id == current_user.user_id).limit(1)
    ).scalar_one_or_none()
    if not membership:
        membership = EventMembership(event_id=event.id, user_id=current_user.user_id)
        db.add(membership)
        db.commit()
        db.refresh(membership)
    return EventMembershipResponse(event_id=membership.event_id, user_id=membership.user_id, joined_at=membership.created_at)


@router.post("/guest/matches", response_model=GuestMatchResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_guest_match(
    slug: str = Form(...),
    guest_code: str | None = Form(default=None),
    selfie: UploadFile = File(...),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user: AppUser | None = Depends(get_current_user_optional),
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
    if current_user:
        if current_user.role != Role.GUEST:
            raise APIException("forbidden", "Only guests can upload selfies", status.HTTP_403_FORBIDDEN)
        membership = db.execute(
            select(EventMembership).where(EventMembership.event_id == event.id, EventMembership.user_id == current_user.user_id).limit(1)
        ).scalar_one_or_none()
        if not membership:
            raise APIException("forbidden", "Join this event before uploading a selfie", status.HTTP_403_FORBIDDEN)
    if not selfie.content_type or not selfie.content_type.startswith("image/"):
        raise APIException("invalid_selfie", "Upload a valid image file", status.HTTP_400_BAD_REQUEST)

    payload = await selfie.read()
    if not payload:
        raise APIException("invalid_selfie", "Selfie file is empty", status.HTTP_400_BAD_REQUEST)
    return _enqueue_guest_match(
        db=db,
        settings=settings,
        event=event,
        payload=payload,
        file_name=selfie.filename or "selfie.jpg",
        guest_user_id=current_user.user_id if current_user else None,
    )


@router.get("/guest/matches/{query_id}", response_model=GuestMatchResponse)
def get_guest_match(
    query_id: str,
    db: Session = Depends(get_db),
    current_user: AppUser | None = Depends(get_current_user_optional),
) -> GuestMatchResponse:
    query = db.get(GuestQuery, query_id)
    if not query:
        raise APIException("query_not_found", "Guest query not found", status.HTTP_404_NOT_FOUND)
    if query.guest_user_id:
        if not current_user:
            raise APIException("not_authenticated", "Authentication required", status.HTTP_401_UNAUTHORIZED)
        if current_user.role != Role.SUPER_ADMIN and current_user.user_id != query.guest_user_id:
            raise APIException("forbidden", "You cannot access this guest result", status.HTTP_403_FORBIDDEN)

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
            web_view_link="",
            download_url="",
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
    current_user: AppUser | None = Depends(get_current_user_optional),
) -> AdminEventsResponse:
    if current_user:
        if current_user.role != Role.SUPER_ADMIN:
            raise APIException("forbidden", "Super admin access required", status.HTTP_403_FORBIDDEN)
    else:
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


@router.get("/admin/users", response_model=list[UserSummaryResponse])
def admin_list_users(current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN]))) -> list[UserSummaryResponse]:
    _ = current_user
    return [
        UserSummaryResponse(
            user_id=user.user_id,
            email=user.email,
            role=user.role,
            created_at=user.created_at,
        )
        for user in list_local_users()
    ]


@router.patch("/admin/users/{user_id}/role", response_model=UserSummaryResponse)
def admin_change_user_role(
    user_id: str,
    payload: UpdateUserRoleRequest,
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN])),
) -> UserSummaryResponse:
    _ = current_user
    updated = update_local_user_role(user_id=user_id, role=payload.role)
    if not updated:
        raise APIException("user_not_found", "User not found", status.HTTP_404_NOT_FOUND)
    return UserSummaryResponse(
        user_id=updated.user_id,
        email=updated.email,
        role=updated.role,
        created_at=updated.created_at,
    )


@router.get("/admin/stats", response_model=GlobalStatsResponse)
def admin_global_stats(
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN])),
) -> GlobalStatsResponse:
    _ = current_user
    return GlobalStatsResponse(
        users=len(list_local_users()),
        events=int(db.execute(select(func.count(Event.id))).scalar_one() or 0),
        photos=int(db.execute(select(func.count(Photo.id))).scalar_one() or 0),
        jobs=int(db.execute(select(func.count(Job.id))).scalar_one() or 0),
        memberships=int(db.execute(select(func.count(EventMembership.id))).scalar_one() or 0),
    )


@router.get("/admin/system/metrics", response_model=GlobalStatsResponse)
def admin_system_metrics(
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN])),
) -> GlobalStatsResponse:
    return admin_global_stats(db=db, current_user=current_user)


@router.get("/admin/jobs", response_model=list[AdminJobRow])
def admin_jobs(
    limit: int = 80,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN])),
) -> list[AdminJobRow]:
    _ = current_user
    safe_limit = max(1, min(300, int(limit)))
    jobs = db.execute(select(Job).order_by(Job.created_at.desc()).limit(safe_limit)).scalars().all()
    return [
        AdminJobRow(
            job_id=job.id,
            event_id=job.event_id,
            query_id=job.query_id,
            type=job.job_type,
            status=job.status,
            stage=job.stage or "",
            attempts=int(job.attempts or 0),
            error=job.error_text or "",
            created_at=job.created_at,
            updated_at=job.updated_at,
        )
        for job in jobs
    ]


@router.get("/admin/events/status", response_model=list[AdminEventStatusItem])
def admin_events_status(
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN])),
) -> list[AdminEventStatusItem]:
    _ = current_user
    events = db.execute(select(Event).order_by(Event.updated_at.desc())).scalars().all()
    rows: list[AdminEventStatusItem] = []
    for event in events:
        status_row = _build_event_processing_status(db=db, event=event)
        owner = get_local_user_by_id(event.owner_user_id or "")
        rows.append(
            AdminEventStatusItem(
                event_id=event.id,
                event_name=event.name,
                owner_email=owner.email if owner else (event.owner_user_id or "unassigned"),
                status=status_row.status,
                processed_photos=status_row.processed_photos,
                total_photos=status_row.total_photos,
                failed_photos=status_row.failed_photos,
                progress_percentage=status_row.progress_percentage,
                last_updated=status_row.updated_at,
                job_id=status_row.job_id,
            )
        )
    return rows


@router.post("/admin/events/{event_id}/cancel", response_model=EventProcessingStatusResponse)
def admin_cancel_event_processing(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN])),
) -> EventProcessingStatusResponse:
    _ = current_user
    event = _get_event_or_404(db=db, event_id=event_id)
    job = _latest_cancelable_event_job(db=db, event_id=event.id)
    if job:
        request_job_cancel(db, job, reason="Canceled by admin")
        _apply_cancellation_side_effects(db=db, job=job)
        db.commit()
        db.refresh(event)
    return _build_event_processing_status(db=db, event=event)


@router.get("/photographer/events", response_model=list[PhotographerEventListItem])
def photographer_events(
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN, Role.PHOTOGRAPHER])),
) -> list[PhotographerEventListItem]:
    stmt = select(Event).order_by(Event.created_at.desc())
    if current_user.role == Role.PHOTOGRAPHER:
        stmt = stmt.where(Event.owner_user_id == current_user.user_id)
    events = db.execute(stmt).scalars().all()

    rows: list[PhotographerEventListItem] = []
    for event in events:
        photo_count = int(db.execute(select(func.count(Photo.id)).where(Photo.event_id == event.id)).scalar_one() or 0)
        guest_count = int(
            db.execute(select(func.count(EventMembership.id)).where(EventMembership.event_id == event.id)).scalar_one() or 0
        )
        last_sync_job = (
            db.execute(
                select(Job)
                .where(Job.event_id == event.id, Job.job_type == JOB_SYNC_EVENT)
                .order_by(Job.updated_at.desc())
                .limit(1)
            )
            .scalars()
            .first()
        )
        rows.append(
            PhotographerEventListItem(
                event_id=event.id,
                name=event.name,
                slug=event.slug,
                status=event.status,
                owner_user_id=event.owner_user_id,
                photo_count=photo_count,
                guest_count=guest_count,
                last_sync_at=last_sync_job.updated_at if last_sync_job else None,
                created_at=event.created_at,
                updated_at=event.updated_at,
            )
        )
    return rows


@router.post("/photographer/events", response_model=EventCreateResponse, status_code=status.HTTP_201_CREATED)
def photographer_create_event(
    payload: EventCreateRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN, Role.PHOTOGRAPHER])),
) -> EventCreateResponse:
    return create_event(payload=payload, db=db, settings=settings, current_user=current_user)


@router.get("/photographer/events/{event_id}", response_model=EventResponse)
def photographer_event_details(
    event_id: str,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN, Role.PHOTOGRAPHER])),
) -> EventResponse:
    event = _get_event_or_404(db=db, event_id=event_id)
    require_event_owner_or_super_admin(event=event, user=current_user)
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
        owner_user_id=event.owner_user_id,
        status=event.status,
        guest_ready=guest_ready,
        guest_url=guest_url,
        created_at=event.created_at,
        updated_at=event.updated_at,
        jobs=[_job_response(item) for item in jobs],
    )


@router.get("/photographer/events/{event_id}/status", response_model=EventProcessingStatusResponse)
def photographer_event_status(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN, Role.PHOTOGRAPHER])),
) -> EventProcessingStatusResponse:
    event = _get_event_or_404(db=db, event_id=event_id)
    require_event_owner_or_super_admin(event=event, user=current_user)
    return _build_event_processing_status(db=db, event=event)


@router.post("/photographer/events/{event_id}/sync", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
def photographer_sync_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN, Role.PHOTOGRAPHER])),
) -> JobResponse:
    event = _get_event_or_404(db=db, event_id=event_id)
    require_event_owner_or_super_admin(event=event, user=current_user)
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


@router.post("/photographer/events/{event_id}/cancel", response_model=EventProcessingStatusResponse)
def photographer_cancel_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN, Role.PHOTOGRAPHER])),
) -> EventProcessingStatusResponse:
    event = _get_event_or_404(db=db, event_id=event_id)
    require_event_owner_or_super_admin(event=event, user=current_user)
    job = _latest_cancelable_event_job(db=db, event_id=event.id)
    if job:
        request_job_cancel(db, job, reason="Canceled by owner")
        _apply_cancellation_side_effects(db=db, job=job)
        db.commit()
        db.refresh(event)
    return _build_event_processing_status(db=db, event=event)


@router.get("/photographer/events/{event_id}/guests", response_model=EventGuestsResponse)
def photographer_event_guests(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN, Role.PHOTOGRAPHER])),
) -> EventGuestsResponse:
    return list_event_guests(event_id=event_id, db=db, current_user=current_user)


@router.get("/photographer/events/{event_id}/photos", response_model=list[EventPhotoSafeResponse])
def photographer_event_photos(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.SUPER_ADMIN, Role.PHOTOGRAPHER])),
) -> list[EventPhotoSafeResponse]:
    return list_event_photos(event_id=event_id, db=db, current_user=current_user)


@router.get("/guest/events", response_model=list[GuestEventListItem])
def guest_joined_events(
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.GUEST, Role.SUPER_ADMIN])),
) -> list[GuestEventListItem]:
    if current_user.role == Role.SUPER_ADMIN:
        events = db.execute(select(Event).order_by(Event.created_at.desc()).limit(120)).scalars().all()
        return [
            GuestEventListItem(
                event_id=event.id,
                name=event.name,
                slug=event.slug,
                status=event.status,
                joined_at=event.created_at,
            )
            for event in events
        ]
    memberships = (
        db.execute(
            select(EventMembership).where(EventMembership.user_id == current_user.user_id).order_by(EventMembership.created_at.desc())
        )
        .scalars()
        .all()
    )
    items: list[GuestEventListItem] = []
    for membership in memberships:
        event = db.get(Event, membership.event_id)
        if not event:
            continue
        items.append(
            GuestEventListItem(
                event_id=event.id,
                name=event.name,
                slug=event.slug,
                status=event.status,
                joined_at=membership.created_at,
            )
        )
    return items


@router.get("/guest/events/{event_id}", response_model=GuestEventSummary)
def guest_event_summary(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.GUEST, Role.SUPER_ADMIN])),
) -> GuestEventSummary:
    event = _get_event_or_404(db=db, event_id=event_id)
    membership = db.execute(
        select(EventMembership).where(EventMembership.event_id == event.id, EventMembership.user_id == current_user.user_id).limit(1)
    ).scalar_one_or_none()
    joined = current_user.role == Role.SUPER_ADMIN or membership is not None
    if current_user.role == Role.GUEST and not joined:
        raise APIException("forbidden", "Join this event first", status.HTTP_403_FORBIDDEN)
    return GuestEventSummary(
        event_id=event.id,
        name=event.name,
        slug=event.slug,
        status=event.status,
        joined=joined,
        joined_at=membership.created_at if membership else None,
    )


@router.post("/guest/events/{event_id}/selfie", response_model=GuestMatchResponse, status_code=status.HTTP_202_ACCEPTED)
async def guest_event_selfie(
    event_id: str,
    selfie: UploadFile = File(...),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    current_user: AppUser = Depends(require_role([Role.GUEST, Role.SUPER_ADMIN])),
) -> GuestMatchResponse:
    event = _get_event_or_404(db=db, event_id=event_id)
    if event.status != "ready":
        raise APIException(
            "event_not_ready",
            "Event is still processing images. Try again after processing completes.",
            status.HTTP_409_CONFLICT,
        )
    if current_user.role == Role.GUEST:
        membership = db.execute(
            select(EventMembership).where(EventMembership.event_id == event.id, EventMembership.user_id == current_user.user_id).limit(1)
        ).scalar_one_or_none()
        if not membership:
            raise APIException("forbidden", "Join this event before uploading a selfie", status.HTTP_403_FORBIDDEN)
    if not selfie.content_type or not selfie.content_type.startswith("image/"):
        raise APIException("invalid_selfie", "Upload a valid image file", status.HTTP_400_BAD_REQUEST)
    payload = await selfie.read()
    if not payload:
        raise APIException("invalid_selfie", "Selfie file is empty", status.HTTP_400_BAD_REQUEST)
    return _enqueue_guest_match(
        db=db,
        settings=settings,
        event=event,
        payload=payload,
        file_name=selfie.filename or "selfie.jpg",
        guest_user_id=None if current_user.role == Role.SUPER_ADMIN else current_user.user_id,
    )


@router.get("/guest/events/{event_id}/my-photos", response_model=GuestMyPhotosResponse)
def guest_my_photos(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(require_role([Role.GUEST, Role.SUPER_ADMIN])),
) -> GuestMyPhotosResponse:
    event = _get_event_or_404(db=db, event_id=event_id)
    if current_user.role == Role.GUEST:
        membership = db.execute(
            select(EventMembership).where(EventMembership.event_id == event.id, EventMembership.user_id == current_user.user_id).limit(1)
        ).scalar_one_or_none()
        if not membership:
            raise APIException("forbidden", "Join this event before viewing photos", status.HTTP_403_FORBIDDEN)
        query = (
            db.execute(
                select(GuestQuery)
                .where(GuestQuery.event_id == event.id, GuestQuery.guest_user_id == current_user.user_id)
                .order_by(GuestQuery.created_at.desc())
                .limit(1)
            )
            .scalars()
            .first()
        )
    else:
        query = (
            db.execute(select(GuestQuery).where(GuestQuery.event_id == event.id).order_by(GuestQuery.created_at.desc()).limit(1))
            .scalars()
            .first()
        )

    if not query:
        return GuestMyPhotosResponse(event_id=event.id, query_id=None, status="no_query", photos=[], message="No selfie match yet.")

    if query.status in {"queued", "running"}:
        return GuestMyPhotosResponse(
            event_id=event.id,
            query_id=query.id,
            status=query.status,
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
        GuestMyPhotoItem(
            photo_id=photo.id,
            thumbnail_url=f"/storage/{photo.thumbnail_path}",
            download_url=photo.download_url,
        )
        for result, photo in rows
    ]
    return GuestMyPhotosResponse(
        event_id=event.id,
        query_id=query.id,
        status=query.status,
        photos=photos,
        message=query.message or "Done",
    )


def _enqueue_guest_match(
    *,
    db: Session,
    settings: Settings,
    event: Event,
    payload: bytes,
    file_name: str,
    guest_user_id: str | None,
) -> GuestMatchResponse:
    query = GuestQuery(
        event_id=event.id,
        guest_user_id=guest_user_id,
        status="queued",
        selfie_path="",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.selfie_retention_hours),
        message="Selfie received. Processing started.",
    )
    db.add(query)
    db.flush()

    relative_selfie = save_selfie(settings=settings, query_id=query.id, file_name=file_name, payload=payload)
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


def _is_system_admin(*, authorization: str | None, settings: Settings) -> bool:
    expected = str(settings.admin_dashboard_key or "").strip()
    if not expected:
        return False
    token = extract_bearer_token(authorization)
    if not token:
        return False
    return hmac.compare_digest(token, expected)


def _latest_event_processing_job(db: Session, event_id: str) -> Job | None:
    return (
        db.execute(
            select(Job)
            .where(Job.event_id == event_id, Job.job_type.in_([JOB_SYNC_EVENT, JOB_CLUSTER_EVENT]))
            .order_by(Job.created_at.desc())
            .limit(1)
        )
        .scalars()
        .first()
    )


def _latest_cancelable_event_job(db: Session, event_id: str) -> Job | None:
    return (
        db.execute(
            select(Job)
            .where(
                Job.event_id == event_id,
                Job.job_type.in_([JOB_SYNC_EVENT, JOB_CLUSTER_EVENT]),
                Job.status.in_([JOB_STATUS_QUEUED, JOB_STATUS_RUNNING, JOB_STATUS_CANCEL_REQUESTED]),
            )
            .order_by(Job.created_at.desc())
            .limit(1)
        )
        .scalars()
        .first()
    )


def _normalize_processing_status(raw_status: str, *, event_status: str) -> str:
    value = str(raw_status or "").strip().lower()
    if value == JOB_STATUS_QUEUED:
        return "QUEUED"
    if value == JOB_STATUS_RUNNING:
        return "RUNNING"
    if value == JOB_STATUS_COMPLETED:
        return "COMPLETED"
    if value == JOB_STATUS_FAILED:
        return "FAILED"
    if value in {JOB_STATUS_CANCELED, JOB_STATUS_CANCEL_REQUESTED}:
        return "CANCELLED"
    if value in {"syncing", "processing_clusters"}:
        return "RUNNING"
    if value in {"ready"}:
        return "COMPLETED"
    if value in {"failed"}:
        return "FAILED"
    if value in {"canceled", "cancelled"}:
        return "CANCELLED"
    fallback = str(event_status or "").strip().upper()
    return fallback or "QUEUED"


def _build_event_processing_status(*, db: Session, event: Event) -> EventProcessingStatusResponse:
    job = _latest_event_processing_job(db=db, event_id=event.id)
    payload = dict(job.payload or {}) if job else {}

    total_photos = int(payload.get("total_listed") or payload.get("total_photos") or 0)
    processed_photos = int(payload.get("completed") or payload.get("processed") or 0)
    failed_photos = int(payload.get("failures") or payload.get("failed_photos") or 0)

    if total_photos <= 0:
        total_photos = int(db.execute(select(func.count(Photo.id)).where(Photo.event_id == event.id)).scalar_one() or 0)
    if processed_photos <= 0 and total_photos > 0 and event.status == "ready":
        processed_photos = total_photos

    progress_percentage = float(job.progress_percent if job else (100.0 if event.status == "ready" else 0.0))
    progress_percentage = float(max(0.0, min(100.0, progress_percentage)))

    status_source = job.status if job else event.status
    normalized = _normalize_processing_status(status_source, event_status=event.status)
    updated_at = job.updated_at if job else event.updated_at

    return EventProcessingStatusResponse(
        event_id=event.id,
        status=normalized,
        total_photos=max(0, total_photos),
        processed_photos=max(0, processed_photos),
        failed_photos=max(0, failed_photos),
        progress_percentage=progress_percentage,
        job_id=job.id if job else None,
        updated_at=updated_at,
    )


def _apply_cancellation_side_effects(*, db: Session, job: Job) -> None:
    if job.status not in {JOB_STATUS_CANCELED, JOB_STATUS_CANCEL_REQUESTED}:
        return

    if job.event_id and job.job_type in {JOB_SYNC_EVENT, JOB_CLUSTER_EVENT}:
        event = db.get(Event, job.event_id)
        if event:
            if job.status == JOB_STATUS_CANCELED:
                event.status = "canceled"
            else:
                event.status = "cancel_requested"
            db.add(event)

    if job.query_id and job.job_type == JOB_MATCH_GUEST:
        query = db.get(GuestQuery, job.query_id)
        if query:
            if job.status == JOB_STATUS_CANCELED:
                query.status = "failed"
                query.error_text = "Canceled by admin"
                query.message = "Matching was canceled by admin."
            else:
                query.status = "running"
                query.message = "Cancel requested by admin..."
            db.add(query)


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

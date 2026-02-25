from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.roles import Role


class APIError(BaseModel):
    code: str
    message: str


class ErrorEnvelope(BaseModel):
    error: APIError


class EventCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    drive_link: str = Field(min_length=10, max_length=1200)
    slug: str | None = Field(default=None, max_length=120)
    owner_user_id: str | None = Field(default=None, max_length=80)
    guest_auth_required: bool = False


class EventUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    drive_link: str | None = Field(default=None, min_length=10, max_length=1200)
    slug: str | None = Field(default=None, max_length=120)
    guest_auth_required: bool | None = None


class JobResponse(BaseModel):
    job_id: str
    type: str
    status: str
    progress_percent: float
    stage: str
    error: str
    payload: dict
    created_at: datetime
    updated_at: datetime


class EventCreateResponse(BaseModel):
    event_id: str
    slug: str
    guest_code: str
    admin_token: str
    guest_url: str
    status: str
    initial_job_id: str


class EventResponse(BaseModel):
    event_id: str
    name: str
    slug: str
    drive_link: str
    drive_folder_id: str
    owner_user_id: str | None
    status: str
    guest_auth_required: bool
    guest_ready: bool
    guest_url: str
    created_at: datetime
    updated_at: datetime
    jobs: list[JobResponse]


class EventProcessingStatusResponse(BaseModel):
    event_id: str
    status: str
    total_photos: int
    processed_photos: int
    failed_photos: int
    progress_percentage: float
    job_id: str | None
    updated_at: datetime


class GuestResolveRequest(BaseModel):
    slug: str = Field(min_length=2, max_length=120)
    guest_code: str | None = Field(default=None, min_length=4, max_length=20)


class GuestJoinLinkRequest(BaseModel):
    slug: str = Field(min_length=2, max_length=120)


class GuestResolveResponse(BaseModel):
    event_id: str
    slug: str
    status: str
    requires_auth: bool


class GuestPhotoResponse(BaseModel):
    photo_id: str
    file_name: str
    thumbnail_url: str
    web_view_link: str
    download_url: str
    score: float
    rank: int


class GuestMatchResponse(BaseModel):
    query_id: str
    status: str
    cluster_id: str | None
    confidence: float
    photos: list[GuestPhotoResponse]
    message: str


class AuthLoginRequest(BaseModel):
    email: str = Field(min_length=4, max_length=240)
    password: str = Field(min_length=4, max_length=120)


class AuthSignupRequest(BaseModel):
    email: str = Field(min_length=4, max_length=240)
    password: str = Field(min_length=8, max_length=120)
    name: str = Field(default="", max_length=160)


class AuthLoginResponse(BaseModel):
    user_id: str
    email: str
    name: str
    role: Role
    access_token: str


class AuthGoogleRequest(BaseModel):
    id_token: str = Field(min_length=20, max_length=4096)


class AuthMeResponse(BaseModel):
    user_id: str
    email: str
    name: str
    role: Role
    created_at: datetime


class UserSummaryResponse(BaseModel):
    user_id: str
    email: str
    name: str
    role: Role
    is_active: bool
    created_at: datetime


class UpdateUserRoleRequest(BaseModel):
    role: Role


class CreateUserRequest(BaseModel):
    email: str = Field(min_length=4, max_length=240)
    name: str = Field(default="", max_length=160)
    role: Role
    password: str = Field(default="password123", min_length=8, max_length=120)


class GlobalStatsResponse(BaseModel):
    users: int
    events: int
    photos: int
    jobs: int
    memberships: int


class AdminJobRow(BaseModel):
    job_id: str
    event_id: str | None
    query_id: str | None
    type: str
    status: str
    stage: str
    attempts: int
    error: str
    created_at: datetime
    updated_at: datetime


class AdminEventStatusItem(BaseModel):
    event_id: str
    event_name: str
    owner_email: str
    status: str
    processed_photos: int
    total_photos: int
    failed_photos: int
    progress_percentage: float
    last_updated: datetime
    job_id: str | None


class PhotographerEventListItem(BaseModel):
    event_id: str
    name: str
    slug: str
    status: str
    owner_user_id: str | None
    photo_count: int
    guest_count: int
    last_sync_at: datetime | None
    created_at: datetime
    updated_at: datetime


class GuestEventListItem(BaseModel):
    event_id: str
    name: str
    slug: str
    status: str
    joined_at: datetime


class GuestEventSummary(BaseModel):
    event_id: str
    name: str
    slug: str
    status: str
    joined: bool
    joined_at: datetime | None


class GuestMyPhotoItem(BaseModel):
    photo_id: str
    thumbnail_url: str
    download_url: str


class GuestMyPhotosResponse(BaseModel):
    event_id: str
    query_id: str | None
    status: str
    photos: list[GuestMyPhotoItem]
    message: str


class EventMembershipResponse(BaseModel):
    event_id: str
    user_id: str
    joined_at: datetime


class EventGuestInfo(BaseModel):
    user_id: str
    email: str
    joined_at: datetime


class EventGuestsResponse(BaseModel):
    event_id: str
    guests: list[EventGuestInfo]


class EventPhotoSafeResponse(BaseModel):
    photo_id: str
    file_name: str
    thumbnail_url: str
    web_view_link: str
    download_url: str


class AdminPhotoLink(BaseModel):
    photo_id: str
    file_name: str
    thumbnail_url: str
    web_view_link: str
    download_url: str
    score: float


class AdminQuerySummary(BaseModel):
    query_id: str
    status: str
    confidence: float
    message: str
    created_at: datetime
    completed_at: datetime | None
    match_count: int
    links: list[AdminPhotoLink]


class AdminEventCounters(BaseModel):
    photos: int
    faces: int
    jobs: int
    running_jobs: int
    failed_jobs: int
    guest_queries: int
    completed_queries: int
    matched_photos: int


class AdminEventOverview(BaseModel):
    event_id: str
    name: str
    slug: str
    status: str
    drive_link: str
    drive_folder_id: str
    guest_ready: bool
    guest_url: str
    created_at: datetime
    updated_at: datetime
    counters: AdminEventCounters
    latest_jobs: list[JobResponse]
    latest_queries: list[AdminQuerySummary]


class AdminEventsResponse(BaseModel):
    total_events: int
    events: list[AdminEventOverview]

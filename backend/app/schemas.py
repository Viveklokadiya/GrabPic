from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class APIError(BaseModel):
    code: str
    message: str


class ErrorEnvelope(BaseModel):
    error: APIError


class EventCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    drive_link: str = Field(min_length=10, max_length=1200)
    slug: str | None = Field(default=None, max_length=120)


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
    status: str
    guest_ready: bool
    guest_url: str
    created_at: datetime
    updated_at: datetime
    jobs: list[JobResponse]


class GuestResolveRequest(BaseModel):
    slug: str = Field(min_length=2, max_length=120)
    guest_code: str = Field(min_length=4, max_length=20)


class GuestResolveResponse(BaseModel):
    event_id: str
    slug: str
    status: str


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

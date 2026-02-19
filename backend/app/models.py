from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.types import EmbeddingVector


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    drive_link: Mapped[str] = mapped_column(Text, nullable=False)
    drive_folder_id: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    owner_user_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    guest_code_hash: Mapped[str] = mapped_column(String(300), nullable=False)
    admin_token_hash: Mapped[str] = mapped_column(String(300), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="queued")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    jobs: Mapped[list["Job"]] = relationship(back_populates="event", cascade="all, delete-orphan")
    photos: Mapped[list["Photo"]] = relationship(back_populates="event", cascade="all, delete-orphan")
    clusters: Mapped[list["FaceCluster"]] = relationship(back_populates="event", cascade="all, delete-orphan")
    guest_queries: Mapped[list["GuestQuery"]] = relationship(back_populates="event", cascade="all, delete-orphan")
    memberships: Mapped[list["EventMembership"]] = relationship(back_populates="event", cascade="all, delete-orphan")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    event_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=True, index=True)
    query_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("guest_queries.id", ondelete="CASCADE"), nullable=True, index=True)
    job_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="queued", index=True)
    progress_percent: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    stage: Mapped[str] = mapped_column(String(180), nullable=False, default="queued")
    error_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    event: Mapped["Event | None"] = relationship(back_populates="jobs")
    query: Mapped["GuestQuery | None"] = relationship(back_populates="jobs")


class Photo(Base):
    __tablename__ = "photos"
    __table_args__ = (UniqueConstraint("event_id", "drive_file_id", name="uq_photo_event_drive_file"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    drive_file_id: Mapped[str] = mapped_column(String(200), nullable=False)
    file_name: Mapped[str] = mapped_column(String(400), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    web_view_link: Mapped[str] = mapped_column(Text, nullable=False)
    preview_url: Mapped[str] = mapped_column(Text, nullable=False)
    download_url: Mapped[str] = mapped_column(Text, nullable=False)
    thumbnail_path: Mapped[str] = mapped_column(Text, nullable=False)
    content_stamp: Mapped[str] = mapped_column(String(400), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="ok")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    event: Mapped["Event"] = relationship(back_populates="photos")
    faces: Mapped[list["Face"]] = relationship(back_populates="photo", cascade="all, delete-orphan")
    guest_results: Mapped[list["GuestResult"]] = relationship(back_populates="photo", cascade="all, delete-orphan")


class Face(Base):
    __tablename__ = "faces"
    __table_args__ = (UniqueConstraint("photo_id", "face_index", name="uq_face_photo_idx"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    photo_id: Mapped[str] = mapped_column(String(36), ForeignKey("photos.id", ondelete="CASCADE"), nullable=False, index=True)
    face_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    embedding: Mapped[list[float]] = mapped_column(EmbeddingVector(512), nullable=False)
    area_ratio: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    det_confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    sharpness: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    bbox_x: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    bbox_y: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    bbox_w: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    bbox_h: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cluster_label: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    photo: Mapped["Photo"] = relationship(back_populates="faces")


class FaceCluster(Base):
    __tablename__ = "face_clusters"
    __table_args__ = (UniqueConstraint("event_id", "cluster_label", name="uq_cluster_event_label"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    cluster_label: Mapped[int] = mapped_column(Integer, nullable=False)
    centroid: Mapped[list[float]] = mapped_column(EmbeddingVector(512), nullable=False)
    face_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cover_photo_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("photos.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    event: Mapped["Event"] = relationship(back_populates="clusters")


class GuestQuery(Base):
    __tablename__ = "guest_queries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    guest_user_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="queued", index=True)
    selfie_path: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cluster_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("face_clusters.id", ondelete="SET NULL"), nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=False, default="")
    error_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    event: Mapped["Event"] = relationship(back_populates="guest_queries")
    jobs: Mapped[list["Job"]] = relationship(back_populates="query", cascade="all, delete-orphan")
    results: Mapped[list["GuestResult"]] = relationship(back_populates="query", cascade="all, delete-orphan")


class GuestResult(Base):
    __tablename__ = "guest_results"
    __table_args__ = (UniqueConstraint("query_id", "photo_id", name="uq_guest_result_query_photo"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    query_id: Mapped[str] = mapped_column(String(36), ForeignKey("guest_queries.id", ondelete="CASCADE"), nullable=False, index=True)
    photo_id: Mapped[str] = mapped_column(String(36), ForeignKey("photos.id", ondelete="CASCADE"), nullable=False, index=True)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    rank: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    query: Mapped["GuestQuery"] = relationship(back_populates="results")
    photo: Mapped["Photo"] = relationship(back_populates="guest_results")


class EventMembership(Base):
    __tablename__ = "event_memberships"
    __table_args__ = (UniqueConstraint("event_id", "user_id", name="uq_event_membership"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    event: Mapped["Event"] = relationship(back_populates="memberships")

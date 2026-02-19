"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-02-19 13:40:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("drive_link", sa.Text(), nullable=False),
        sa.Column("drive_folder_id", sa.String(length=200), nullable=False),
        sa.Column("guest_code_hash", sa.String(length=300), nullable=False),
        sa.Column("admin_token_hash", sa.String(length=300), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_events_slug", "events", ["slug"], unique=True)
    op.create_index("ix_events_drive_folder_id", "events", ["drive_folder_id"], unique=False)

    op.create_table(
        "photos",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("event_id", sa.String(length=36), nullable=False),
        sa.Column("drive_file_id", sa.String(length=200), nullable=False),
        sa.Column("file_name", sa.String(length=400), nullable=False),
        sa.Column("mime_type", sa.String(length=120), nullable=False),
        sa.Column("web_view_link", sa.Text(), nullable=False),
        sa.Column("preview_url", sa.Text(), nullable=False),
        sa.Column("download_url", sa.Text(), nullable=False),
        sa.Column("thumbnail_path", sa.Text(), nullable=False),
        sa.Column("content_stamp", sa.String(length=400), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", "drive_file_id", name="uq_photo_event_drive_file"),
    )
    op.create_index("ix_photos_event_id", "photos", ["event_id"], unique=False)
    op.create_index("ix_photos_content_stamp", "photos", ["content_stamp"], unique=False)

    op.create_table(
        "face_clusters",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("event_id", sa.String(length=36), nullable=False),
        sa.Column("cluster_label", sa.Integer(), nullable=False),
        sa.Column("centroid", Vector(512), nullable=False),
        sa.Column("face_count", sa.Integer(), nullable=False),
        sa.Column("cover_photo_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["cover_photo_id"], ["photos.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", "cluster_label", name="uq_cluster_event_label"),
    )
    op.create_index("ix_face_clusters_event_id", "face_clusters", ["event_id"], unique=False)

    op.create_table(
        "guest_queries",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("event_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("selfie_path", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("cluster_id", sa.String(length=36), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("error_text", sa.Text(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["cluster_id"], ["face_clusters.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_guest_queries_event_id", "guest_queries", ["event_id"], unique=False)
    op.create_index("ix_guest_queries_status", "guest_queries", ["status"], unique=False)
    op.create_index("ix_guest_queries_expires_at", "guest_queries", ["expires_at"], unique=False)

    op.create_table(
        "jobs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("event_id", sa.String(length=36), nullable=True),
        sa.Column("query_id", sa.String(length=36), nullable=True),
        sa.Column("job_type", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("progress_percent", sa.Float(), nullable=False),
        sa.Column("stage", sa.String(length=180), nullable=False),
        sa.Column("error_text", sa.Text(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["query_id"], ["guest_queries.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_jobs_event_id", "jobs", ["event_id"], unique=False)
    op.create_index("ix_jobs_query_id", "jobs", ["query_id"], unique=False)
    op.create_index("ix_jobs_job_type", "jobs", ["job_type"], unique=False)
    op.create_index("ix_jobs_status", "jobs", ["status"], unique=False)

    op.create_table(
        "faces",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("event_id", sa.String(length=36), nullable=False),
        sa.Column("photo_id", sa.String(length=36), nullable=False),
        sa.Column("face_index", sa.Integer(), nullable=False),
        sa.Column("embedding", Vector(512), nullable=False),
        sa.Column("area_ratio", sa.Float(), nullable=False),
        sa.Column("det_confidence", sa.Float(), nullable=False),
        sa.Column("sharpness", sa.Float(), nullable=False),
        sa.Column("bbox_x", sa.Float(), nullable=False),
        sa.Column("bbox_y", sa.Float(), nullable=False),
        sa.Column("bbox_w", sa.Float(), nullable=False),
        sa.Column("bbox_h", sa.Float(), nullable=False),
        sa.Column("cluster_label", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["photo_id"], ["photos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("photo_id", "face_index", name="uq_face_photo_idx"),
    )
    op.create_index("ix_faces_event_id", "faces", ["event_id"], unique=False)
    op.create_index("ix_faces_photo_id", "faces", ["photo_id"], unique=False)
    op.create_index("ix_faces_cluster_label", "faces", ["cluster_label"], unique=False)

    op.create_table(
        "guest_results",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("query_id", sa.String(length=36), nullable=False),
        sa.Column("photo_id", sa.String(length=36), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["photo_id"], ["photos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["query_id"], ["guest_queries.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("query_id", "photo_id", name="uq_guest_result_query_photo"),
    )
    op.create_index("ix_guest_results_query_id", "guest_results", ["query_id"], unique=False)
    op.create_index("ix_guest_results_photo_id", "guest_results", ["photo_id"], unique=False)


def downgrade() -> None:
    op.drop_table("guest_results")
    op.drop_table("faces")
    op.drop_table("jobs")
    op.drop_table("guest_queries")
    op.drop_table("face_clusters")
    op.drop_table("photos")
    op.drop_table("events")


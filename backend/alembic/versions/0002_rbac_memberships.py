"""rbac ownership and memberships

Revision ID: 0002_rbac_memberships
Revises: 0001_initial
Create Date: 2026-02-19 20:30:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0002_rbac_memberships"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("events", sa.Column("owner_user_id", sa.String(length=80), nullable=True))
    op.create_index("ix_events_owner_user_id", "events", ["owner_user_id"], unique=False)

    op.add_column("guest_queries", sa.Column("guest_user_id", sa.String(length=80), nullable=True))
    op.create_index("ix_guest_queries_guest_user_id", "guest_queries", ["guest_user_id"], unique=False)

    op.create_table(
        "event_memberships",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("event_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", "user_id", name="uq_event_membership"),
    )
    op.create_index("ix_event_memberships_event_id", "event_memberships", ["event_id"], unique=False)
    op.create_index("ix_event_memberships_user_id", "event_memberships", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_event_memberships_user_id", table_name="event_memberships")
    op.drop_index("ix_event_memberships_event_id", table_name="event_memberships")
    op.drop_table("event_memberships")

    op.drop_index("ix_guest_queries_guest_user_id", table_name="guest_queries")
    op.drop_column("guest_queries", "guest_user_id")

    op.drop_index("ix_events_owner_user_id", table_name="events")
    op.drop_column("events", "owner_user_id")

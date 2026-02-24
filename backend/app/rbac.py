from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, Header, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import extract_bearer_token
from app.db import get_db
from app.errors import APIException
from app.local_auth import AppUser, ensure_default_users, get_user_by_token
from app.models import Event, EventMembership
from app.roles import Role


def is_local_auth_enabled() -> bool:
    return True


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> AppUser:
    ensure_default_users(db)
    token = extract_bearer_token(authorization)
    if not token:
        raise APIException("not_authenticated", "Authentication required", status.HTTP_401_UNAUTHORIZED)
    user = get_user_by_token(db, token)
    if not user:
        raise APIException("invalid_token", "Invalid or expired access token", status.HTTP_401_UNAUTHORIZED)
    return user


def get_current_user_optional(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> AppUser | None:
    token = extract_bearer_token(authorization)
    if not token:
        return None
    ensure_default_users(db)
    user = get_user_by_token(db, token)
    return user


def require_auth(current_user: AppUser = Depends(get_current_user)) -> AppUser:
    return current_user


def require_role(roles: list[Role]) -> Callable[[AppUser], AppUser]:
    accepted = set(roles)

    def _dependency(current_user: AppUser = Depends(get_current_user)) -> AppUser:
        if current_user.role not in accepted:
            raise APIException("forbidden", "You do not have permission to perform this action", status.HTTP_403_FORBIDDEN)
        return current_user

    return _dependency


def can_access_event(*, db: Session, event: Event, user: AppUser) -> bool:
    if user.role in {Role.SUPER_ADMIN, Role.ADMIN}:
        return True
    if user.role == Role.PHOTOGRAPHER:
        return bool(event.owner_user_id and event.owner_user_id == user.user_id)
    if user.role == Role.GUEST:
        membership = db.execute(
            select(EventMembership).where(EventMembership.event_id == event.id, EventMembership.user_id == user.user_id).limit(1)
        ).scalar_one_or_none()
        return membership is not None
    return False


def require_event_access(*, db: Session, event: Event, user: AppUser) -> None:
    if not can_access_event(db=db, event=event, user=user):
        raise APIException("forbidden", "You do not have access to this event", status.HTTP_403_FORBIDDEN)


def require_event_owner_or_super_admin(*, event: Event, user: AppUser) -> None:
    if user.role in {Role.SUPER_ADMIN, Role.ADMIN}:
        return
    if user.role == Role.PHOTOGRAPHER and event.owner_user_id == user.user_id:
        return
    raise APIException("forbidden", "You do not have permission to modify this event", status.HTTP_403_FORBIDDEN)

from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends, Header, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import extract_bearer_token
from app.config import Settings, get_settings
from app.errors import APIException
from app.local_auth import AppUser, get_user_by_token
from app.models import Event, EventMembership
from app.roles import Role


def is_local_auth_enabled(settings: Settings) -> bool:
    return str(settings.app_env or "").strip().lower() == "local"


def get_current_user(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> AppUser:
    if not is_local_auth_enabled(settings):
        raise APIException("auth_disabled", "Local auth is disabled in this environment", status.HTTP_401_UNAUTHORIZED)
    token = extract_bearer_token(authorization)
    if not token:
        raise APIException("not_authenticated", "Authentication required", status.HTTP_401_UNAUTHORIZED)
    user = get_user_by_token(token)
    if not user:
        raise APIException("invalid_token", "Invalid or expired access token", status.HTTP_401_UNAUTHORIZED)
    return user


def get_current_user_optional(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> AppUser | None:
    token = extract_bearer_token(authorization)
    if not token:
        return None
    if not is_local_auth_enabled(settings):
        return None
    user = get_user_by_token(token)
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
    if user.role == Role.SUPER_ADMIN:
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
    if user.role == Role.SUPER_ADMIN:
        return
    if user.role == Role.PHOTOGRAPHER and event.owner_user_id == user.user_id:
        return
    raise APIException("forbidden", "You do not have permission to modify this event", status.HTTP_403_FORBIDDEN)

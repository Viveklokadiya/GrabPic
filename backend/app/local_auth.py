from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from threading import RLock
from uuid import uuid4

from app.roles import Role


@dataclass(frozen=True)
class AppUser:
    user_id: str
    email: str
    role: Role
    created_at: datetime


@dataclass
class _StoredUser:
    user_id: str
    email: str
    password: str
    role: Role
    created_at: datetime


_BASE_CREATED_AT = datetime(2026, 1, 1, tzinfo=timezone.utc)
_INITIAL_USERS: tuple[_StoredUser, ...] = (
    _StoredUser(
        user_id="u-superadmin",
        email="superadmin@grabpic.com",
        password="password123",
        role=Role.SUPER_ADMIN,
        created_at=_BASE_CREATED_AT,
    ),
    _StoredUser(
        user_id="u-studio-1",
        email="studio1@grabpic.com",
        password="password123",
        role=Role.PHOTOGRAPHER,
        created_at=_BASE_CREATED_AT + timedelta(minutes=1),
    ),
    _StoredUser(
        user_id="u-studio-2",
        email="studio2@grabpic.com",
        password="password123",
        role=Role.PHOTOGRAPHER,
        created_at=_BASE_CREATED_AT + timedelta(minutes=2),
    ),
    _StoredUser(
        user_id="u-guest-1",
        email="guest1@grabpic.com",
        password="password123",
        role=Role.GUEST,
        created_at=_BASE_CREATED_AT + timedelta(minutes=3),
    ),
    _StoredUser(
        user_id="u-guest-2",
        email="guest2@grabpic.com",
        password="password123",
        role=Role.GUEST,
        created_at=_BASE_CREATED_AT + timedelta(minutes=4),
    ),
)

_LOCK = RLock()
_USERS_BY_ID: dict[str, _StoredUser] = {}
_USER_ID_BY_EMAIL: dict[str, str] = {}
_SESSIONS: dict[str, str] = {}


def _load_initial_users() -> None:
    _USERS_BY_ID.clear()
    _USER_ID_BY_EMAIL.clear()
    for user in _INITIAL_USERS:
        cloned = _StoredUser(
            user_id=user.user_id,
            email=user.email,
            password=user.password,
            role=user.role,
            created_at=user.created_at,
        )
        _USERS_BY_ID[cloned.user_id] = cloned
        _USER_ID_BY_EMAIL[cloned.email.lower()] = cloned.user_id


def reset_local_auth_state() -> None:
    with _LOCK:
        _SESSIONS.clear()
        _load_initial_users()


def authenticate_and_create_session(*, email: str, password: str) -> tuple[str, AppUser] | None:
    normalized_email = str(email or "").strip().lower()
    if not normalized_email or not password:
        return None
    with _LOCK:
        user_id = _USER_ID_BY_EMAIL.get(normalized_email)
        if not user_id:
            return None
        stored = _USERS_BY_ID.get(user_id)
        if not stored or stored.password != password:
            return None
        token = str(uuid4())
        _SESSIONS[token] = stored.user_id
        return token, AppUser(
            user_id=stored.user_id,
            email=stored.email,
            role=stored.role,
            created_at=stored.created_at,
        )


def get_user_by_token(token: str) -> AppUser | None:
    with _LOCK:
        user_id = _SESSIONS.get(str(token or "").strip())
        if not user_id:
            return None
        stored = _USERS_BY_ID.get(user_id)
        if not stored:
            return None
        return AppUser(
            user_id=stored.user_id,
            email=stored.email,
            role=stored.role,
            created_at=stored.created_at,
        )


def list_local_users() -> list[AppUser]:
    with _LOCK:
        values = [
            AppUser(user_id=u.user_id, email=u.email, role=u.role, created_at=u.created_at)
            for u in _USERS_BY_ID.values()
        ]
    return sorted(values, key=lambda item: item.email.lower())


def get_local_user_by_id(user_id: str) -> AppUser | None:
    with _LOCK:
        stored = _USERS_BY_ID.get(str(user_id or "").strip())
        if not stored:
            return None
        return AppUser(
            user_id=stored.user_id,
            email=stored.email,
            role=stored.role,
            created_at=stored.created_at,
        )


def update_local_user_role(*, user_id: str, role: Role) -> AppUser | None:
    with _LOCK:
        stored = _USERS_BY_ID.get(str(user_id or "").strip())
        if not stored:
            return None
        stored.role = role
        return AppUser(
            user_id=stored.user_id,
            email=stored.email,
            role=stored.role,
            created_at=stored.created_at,
        )


_load_initial_users()

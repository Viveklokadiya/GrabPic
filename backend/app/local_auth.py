from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import generate_token, hash_secret, verify_secret
from app.models import AuthIdentity, AuthSession, User
from app.roles import Role


@dataclass(frozen=True)
class AppUser:
    user_id: str
    email: str
    role: Role
    created_at: datetime
    name: str


_SEED_USERS: tuple[tuple[str, str, Role, str], ...] = (
    ("superadmin@grabpic.com", "password123", Role.SUPER_ADMIN, "Super Admin"),
    ("admin1@grabpic.com", "password123", Role.ADMIN, "Platform Admin"),
    ("studio1@grabpic.com", "password123", Role.PHOTOGRAPHER, "Studio One"),
    ("studio2@grabpic.com", "password123", Role.PHOTOGRAPHER, "Studio Two"),
    ("guest1@grabpic.com", "password123", Role.GUEST, "Guest One"),
    ("guest2@grabpic.com", "password123", Role.GUEST, "Guest Two"),
)


def ensure_default_users(db: Session) -> None:
    current_total = int(db.execute(select(func.count(User.id))).scalar_one() or 0)
    if current_total > 0:
        return
    now = datetime.now(timezone.utc)
    for email, password, role, name in _SEED_USERS:
        db.add(
            User(
                email=_normalize_email(email),
                name=name,
                role=role.value,
                password_hash=hash_secret(password),
                is_active=True,
                created_at=now,
                updated_at=now,
            )
        )
    db.flush()


def create_local_user(
    db: Session,
    *,
    email: str,
    password: str,
    role: Role,
    name: str = "",
    is_active: bool = True,
) -> AppUser:
    normalized = _normalize_email(email)
    if not normalized:
        raise ValueError("Email is required")
    if role not in {Role.SUPER_ADMIN, Role.ADMIN, Role.PHOTOGRAPHER, Role.GUEST}:
        raise ValueError("Invalid role")
    existing = db.execute(select(User).where(User.email == normalized).limit(1)).scalar_one_or_none()
    if existing:
        raise ValueError("Email already exists")
    now = datetime.now(timezone.utc)
    user = User(
        email=normalized,
        name=(name or "").strip(),
        role=role.value,
        password_hash=hash_secret(password),
        is_active=bool(is_active),
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    db.flush()
    return _to_app_user(user)


def authenticate_and_create_session(
    db: Session,
    *,
    email: str,
    password: str,
    session_ttl_hours: int = 24 * 14,
    user_agent: str = "",
    ip_address: str = "",
) -> tuple[str, AppUser] | None:
    normalized = _normalize_email(email)
    if not normalized or not password:
        return None
    ensure_default_users(db)
    user = db.execute(select(User).where(User.email == normalized).limit(1)).scalar_one_or_none()
    if not user or not user.is_active:
        return None
    if not user.password_hash or not verify_secret(password, user.password_hash):
        return None
    token = _create_session_token(
        db,
        user=user,
        session_ttl_hours=session_ttl_hours,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    db.flush()
    return token, _to_app_user(user)


def upsert_google_user_and_create_session(
    db: Session,
    *,
    provider_sub: str,
    email: str,
    name: str,
    email_verified: bool,
    session_ttl_hours: int = 24 * 14,
    user_agent: str = "",
    ip_address: str = "",
) -> tuple[str, AppUser]:
    ensure_default_users(db)
    normalized = _normalize_email(email)
    identity = db.execute(
        select(AuthIdentity).where(AuthIdentity.provider == "google", AuthIdentity.provider_sub == provider_sub).limit(1)
    ).scalar_one_or_none()
    user: User | None = None
    if identity:
        user = db.get(User, identity.user_id)
    if not user:
        user = db.execute(select(User).where(User.email == normalized).limit(1)).scalar_one_or_none()
    if not user:
        now = datetime.now(timezone.utc)
        user = User(
            email=normalized,
            name=(name or "").strip(),
            role=Role.GUEST.value,
            password_hash="",
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        db.add(user)
        db.flush()
    if not user.is_active:
        raise ValueError("User account is disabled")

    if not identity:
        identity = AuthIdentity(
            user_id=user.id,
            provider="google",
            provider_sub=provider_sub,
            email=normalized,
            email_verified=bool(email_verified),
        )
        db.add(identity)
    else:
        identity.email = normalized
        identity.email_verified = bool(email_verified)
        identity.updated_at = datetime.now(timezone.utc)
        db.add(identity)

    if name and not user.name:
        user.name = name.strip()
    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    token = _create_session_token(
        db,
        user=user,
        session_ttl_hours=session_ttl_hours,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.flush()
    return token, _to_app_user(user)


def get_user_by_token(db: Session, token: str) -> AppUser | None:
    raw = str(token or "").strip()
    if not raw:
        return None
    now = datetime.now(timezone.utc)
    session = db.execute(
        select(AuthSession).where(
            AuthSession.token_hash == _token_hash(raw),
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > now,
        )
    ).scalar_one_or_none()
    if not session:
        return None
    user = db.get(User, session.user_id)
    if not user or not user.is_active:
        return None
    session.last_seen_at = now
    db.add(session)
    db.flush()
    return _to_app_user(user)


def revoke_session_by_token(db: Session, token: str) -> bool:
    raw = str(token or "").strip()
    if not raw:
        return False
    session = db.execute(select(AuthSession).where(AuthSession.token_hash == _token_hash(raw)).limit(1)).scalar_one_or_none()
    if not session:
        return False
    if session.revoked_at is None:
        session.revoked_at = datetime.now(timezone.utc)
        db.add(session)
        db.flush()
    return True


def list_local_users(db: Session) -> list[AppUser]:
    ensure_default_users(db)
    users = db.execute(select(User).order_by(User.email.asc())).scalars().all()
    return [_to_app_user(item) for item in users if item.is_active]


def get_local_user_by_id(db: Session, user_id: str) -> AppUser | None:
    user = db.get(User, str(user_id or "").strip())
    if not user or not user.is_active:
        return None
    return _to_app_user(user)


def get_local_user_by_email(db: Session, email: str) -> AppUser | None:
    normalized = _normalize_email(email)
    if not normalized:
        return None
    user = db.execute(select(User).where(User.email == normalized).limit(1)).scalar_one_or_none()
    if not user or not user.is_active:
        return None
    return _to_app_user(user)


def update_local_user_role(db: Session, *, user_id: str, role: Role) -> AppUser | None:
    user = db.get(User, str(user_id or "").strip())
    if not user or not user.is_active:
        return None
    user.role = role.value
    user.updated_at = datetime.now(timezone.utc)
    db.add(user)
    db.flush()
    return _to_app_user(user)


def set_local_user_password(db: Session, *, user_id: str, password: str) -> AppUser | None:
    user = db.get(User, str(user_id or "").strip())
    if not user or not user.is_active:
        return None
    user.password_hash = hash_secret(password)
    user.updated_at = datetime.now(timezone.utc)
    db.add(user)
    db.flush()
    return _to_app_user(user)


def _normalize_email(value: str) -> str:
    return str(value or "").strip().lower()


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _create_session_token(
    db: Session,
    *,
    user: User,
    session_ttl_hours: int,
    user_agent: str,
    ip_address: str,
) -> str:
    token = generate_token(32)
    now = datetime.now(timezone.utc)
    session = AuthSession(
        user_id=user.id,
        token_hash=_token_hash(token),
        expires_at=now + timedelta(hours=max(1, int(session_ttl_hours))),
        revoked_at=None,
        last_seen_at=now,
        created_at=now,
        user_agent=str(user_agent or "")[:400],
        ip_address=str(ip_address or "")[:80],
    )
    db.add(session)
    db.flush()
    return token


def _to_app_user(user: User) -> AppUser:
    role_value = str(user.role or "").strip().upper()
    role = Role(role_value if role_value in {item.value for item in Role} else Role.GUEST.value)
    return AppUser(
        user_id=user.id,
        email=user.email,
        role=role,
        created_at=user.created_at,
        name=user.name or "",
    )

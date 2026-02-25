from __future__ import annotations

from fastapi import APIRouter, Depends, Header, Request, status

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.auth import extract_bearer_token
from app.config import Settings, get_settings
from app.db import get_db
from app.errors import APIException
from app.local_auth import (
    AppUser,
    authenticate_and_create_session,
    create_local_user,
    ensure_default_users,
    get_user_by_token,
    revoke_session_by_token,
    update_local_user_role,
    upsert_google_user_and_create_session,
)
from app.roles import Role
from app.schemas import AuthGoogleRequest, AuthLoginRequest, AuthLoginResponse, AuthMeResponse, AuthSignupRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthLoginResponse)
def login(
    payload: AuthLoginRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> AuthLoginResponse:
    ensure_default_users(db)
    result = authenticate_and_create_session(
        db,
        email=payload.email,
        password=payload.password,
        session_ttl_hours=settings.auth_session_ttl_hours,
        user_agent=request.headers.get("user-agent", ""),
        ip_address=request.client.host if request.client else "",
    )
    if not result:
        raise APIException("invalid_credentials", "Invalid email or password", status.HTTP_401_UNAUTHORIZED)
    token, user = result
    db.commit()
    return _auth_response(user=user, access_token=token)


@router.post("/signup", response_model=AuthLoginResponse, status_code=status.HTTP_201_CREATED)
def signup(
    payload: AuthSignupRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> AuthLoginResponse:
    ensure_default_users(db)
    try:
        create_local_user(
            db,
            email=payload.email,
            password=payload.password,
            role=Role.GUEST,
            name=payload.name,
        )
    except ValueError as exc:
        raise APIException("invalid_signup_payload", str(exc), status.HTTP_400_BAD_REQUEST)

    result = authenticate_and_create_session(
        db,
        email=payload.email,
        password=payload.password,
        session_ttl_hours=settings.auth_session_ttl_hours,
        user_agent=request.headers.get("user-agent", ""),
        ip_address=request.client.host if request.client else "",
    )
    if not result:
        raise APIException("signup_failed", "Unable to create authenticated session", status.HTTP_500_INTERNAL_SERVER_ERROR)
    token, user = result
    db.commit()
    return _auth_response(user=user, access_token=token)


@router.post("/google", response_model=AuthLoginResponse)
def login_with_google(
    payload: AuthGoogleRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> AuthLoginResponse:
    if not settings.google_oauth_client_id:
        raise APIException(
            "google_oauth_not_configured",
            "GOOGLE_OAUTH_CLIENT_ID is not configured on backend",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    try:
        token_info = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            settings.google_oauth_client_id,
        )
    except Exception:
        raise APIException("invalid_google_token", "Google sign-in token is invalid", status.HTTP_401_UNAUTHORIZED)

    email = str(token_info.get("email") or "").strip().lower()
    sub = str(token_info.get("sub") or "").strip()
    if not email or not sub:
        raise APIException("invalid_google_profile", "Google account is missing required claims", status.HTTP_401_UNAUTHORIZED)
    full_name = str(token_info.get("name") or "").strip()
    email_verified = bool(token_info.get("email_verified"))
    if not email_verified:
        raise APIException("email_not_verified", "Google email is not verified", status.HTTP_401_UNAUTHORIZED)

    try:
        access_token, user = upsert_google_user_and_create_session(
            db,
            provider_sub=sub,
            email=email,
            name=full_name,
            email_verified=email_verified,
            session_ttl_hours=settings.auth_session_ttl_hours,
            user_agent=request.headers.get("user-agent", ""),
            ip_address=request.client.host if request.client else "",
        )
    except ValueError as exc:
        raise APIException("account_disabled", str(exc), status.HTTP_403_FORBIDDEN)
    db.commit()
    return _auth_response(user=user, access_token=access_token)


@router.get("/me", response_model=AuthMeResponse)
def me(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> AuthMeResponse:
    ensure_default_users(db)
    token = extract_bearer_token(authorization)
    if not token:
        raise APIException("not_authenticated", "Authentication required", status.HTTP_401_UNAUTHORIZED)
    user = get_user_by_token(db, token)
    if not user:
        raise APIException("invalid_token", "Invalid or expired access token", status.HTTP_401_UNAUTHORIZED)
    db.commit()
    return AuthMeResponse(
        user_id=user.user_id,
        email=user.email,
        name=user.name,
        role=user.role,
        created_at=user.created_at,
    )


@router.post("/become-photographer", response_model=AuthMeResponse)
def become_photographer(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> AuthMeResponse:
    token = extract_bearer_token(authorization)
    if not token:
        raise APIException("not_authenticated", "Authentication required", status.HTTP_401_UNAUTHORIZED)

    current = get_user_by_token(db, token)
    if not current:
        raise APIException("invalid_token", "Invalid or expired access token", status.HTTP_401_UNAUTHORIZED)

    next_user = current
    if current.role == Role.GUEST:
        updated = update_local_user_role(db, user_id=current.user_id, role=Role.PHOTOGRAPHER)
        if not updated:
            raise APIException("user_not_found", "User not found", status.HTTP_404_NOT_FOUND)
        next_user = updated

    db.commit()
    return AuthMeResponse(
        user_id=next_user.user_id,
        email=next_user.email,
        name=next_user.name,
        role=next_user.role,
        created_at=next_user.created_at,
    )


@router.post("/logout")
def logout(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> dict[str, bool]:
    token = extract_bearer_token(authorization)
    if not token:
        raise APIException("not_authenticated", "Authentication required", status.HTTP_401_UNAUTHORIZED)
    revoked = revoke_session_by_token(db, token)
    if not revoked:
        raise APIException("invalid_token", "Invalid or expired access token", status.HTTP_401_UNAUTHORIZED)
    db.commit()
    return {"ok": True}


def _auth_response(*, user: AppUser, access_token: str) -> AuthLoginResponse:
    return AuthLoginResponse(
        user_id=user.user_id,
        email=user.email,
        name=user.name,
        role=user.role,
        access_token=access_token,
    )

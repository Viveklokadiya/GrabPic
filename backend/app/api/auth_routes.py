from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.config import Settings, get_settings
from app.errors import APIException
from app.local_auth import authenticate_and_create_session
from app.rbac import is_local_auth_enabled
from app.schemas import AuthLoginRequest, AuthLoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthLoginResponse)
def login(payload: AuthLoginRequest, settings: Settings = Depends(get_settings)) -> AuthLoginResponse:
    if not is_local_auth_enabled(settings):
        raise APIException("auth_disabled", "Local login is disabled in this environment", status.HTTP_403_FORBIDDEN)
    result = authenticate_and_create_session(email=payload.email, password=payload.password)
    if not result:
        raise APIException("invalid_credentials", "Invalid email or password", status.HTTP_401_UNAUTHORIZED)
    token, user = result
    return AuthLoginResponse(user_id=user.user_id, email=user.email, role=user.role, access_token=token)

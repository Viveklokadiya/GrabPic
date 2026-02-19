from __future__ import annotations

from fastapi import status

from app.schemas import APIError, ErrorEnvelope


class APIException(Exception):
    def __init__(self, code: str, message: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def error_response(code: str, message: str) -> ErrorEnvelope:
    return ErrorEnvelope(error=APIError(code=code, message=message))


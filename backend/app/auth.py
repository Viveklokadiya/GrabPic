from __future__ import annotations

import hashlib
import hmac
import secrets
from base64 import urlsafe_b64encode


def generate_token(bytes_len: int = 24) -> str:
    return secrets.token_urlsafe(bytes_len)


def generate_guest_code(length: int = 8) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def hash_secret(secret: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", secret.encode("utf-8"), salt, 220_000)
    return f"{urlsafe_b64encode(salt).decode('ascii')}${urlsafe_b64encode(digest).decode('ascii')}"


def verify_secret(secret: str, hashed: str) -> bool:
    try:
        salt_b64, digest_b64 = hashed.split("$", 1)
        salt = _b64_decode(salt_b64)
        expected = _b64_decode(digest_b64)
    except Exception:
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", secret.encode("utf-8"), salt, 220_000)
    return hmac.compare_digest(candidate, expected)


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        return ""
    parts = authorization.split(" ", 1)
    if len(parts) != 2:
        return ""
    scheme, token = parts[0].strip().lower(), parts[1].strip()
    if scheme != "bearer" or not token:
        return ""
    return token


def _b64_decode(value: str) -> bytes:
    padded = value + "=" * (-len(value) % 4)
    return __import__("base64").urlsafe_b64decode(padded)


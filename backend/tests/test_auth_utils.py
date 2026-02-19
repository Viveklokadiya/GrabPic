from __future__ import annotations

from app.auth import extract_bearer_token, hash_secret, verify_secret


def test_hash_and_verify_secret_roundtrip() -> None:
    secret = "top-secret-token"
    hashed = hash_secret(secret)
    assert hashed != secret
    assert verify_secret(secret, hashed) is True
    assert verify_secret("wrong-token", hashed) is False


def test_extract_bearer_token() -> None:
    assert extract_bearer_token("Bearer abc123") == "abc123"
    assert extract_bearer_token("bearer xyz") == "xyz"
    assert extract_bearer_token("Token abc") == ""
    assert extract_bearer_token(None) == ""


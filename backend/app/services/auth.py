from datetime import UTC, datetime, timedelta

import jwt
from fastapi import HTTPException, status

from app.config import get_settings


def _build_token(phone_number: str, token_type: str, expires_in_hours: int) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": phone_number,
        "type": token_type,
        "iat": now,
        "exp": now + timedelta(hours=expires_in_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def create_session_token(phone_number: str) -> str:
    settings = get_settings()
    return _build_token(phone_number, "session", settings.session_expire_hours)


def create_registration_token(phone_number: str) -> str:
    return _build_token(phone_number, "registration", 1)


def decode_token(token: str, expected_type: str) -> str:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        ) from exc

    token_type = payload.get("type")
    phone_number = payload.get("sub")
    if token_type != expected_type or not isinstance(phone_number, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication context.",
        )

    return phone_number

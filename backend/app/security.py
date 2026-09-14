from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pwdlib import PasswordHash

from .config import get_settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(subject: str, token_version: int = 0) -> str:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    return jwt.encode({"sub": subject, "ver": token_version, "exp": expires_at}, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> int:
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    return int(payload["sub"])


def decode_token_version(token: str) -> int:
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    return int(payload.get("ver", 0))


def decode_supabase_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    if settings.supabase_jwks_url:
        signing_key = jwt.PyJWKClient(settings.supabase_jwks_url).get_signing_key_from_jwt(token).key
        payload = jwt.decode(token, signing_key, algorithms=["RS256", "ES256"], audience="authenticated", options={"verify_iss": False})
    elif settings.supabase_jwt_secret:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_iss": False},
        )
    else:
        raise ValueError("Supabase JWT verification is not configured")
    return payload

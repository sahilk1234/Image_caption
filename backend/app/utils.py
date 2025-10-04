from __future__ import annotations

import os
import time
import datetime as dt
from typing import Optional, Tuple

import jwt  
from passlib.hash import pbkdf2_sha256
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
from sqlmodel import select
from .models import Image as DBImage


# --- Config ---
JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me")
JWT_EXPIRE_MIN: int = int(os.getenv("JWT_EXPIRE_MINUTES", "43200"))  

# --- Password hashing (PBKDF2-SHA256) ---
def hash_pw(pw: str) -> str:
    """Hash a password with PBKDF2-SHA256 (salted)."""
    return pbkdf2_sha256.hash(pw)

def verify_pw(pw: str, hashed: str) -> bool:
    """Verify a password against its PBKDF2-SHA256 hash."""
    return pbkdf2_sha256.verify(pw, hashed)

# --- JWT helpers ---
bearer = HTTPBearer(auto_error=False)  

def create_access_token(
    sub: str | int,
    *,
    guest: bool = False,
    ttl_min: Optional[int] = None,
    extra: Optional[dict] = None,
) -> str:
    """
    Create a signed HS256 JWT.
    - sub: user id (int/str) or guest id (str)
    - guest: True if token is for anonymous/guest
    - ttl_min: override expiry minutes; defaults to JWT_EXPIRE_MIN
    - extra: any additional public claims to embed
    """
    now = int(time.time())
    exp = now + 60 * (ttl_min if ttl_min is not None else JWT_EXPIRE_MIN)
    payload = {
        "sub": str(sub),
        "guest": bool(guest),
        "iat": now,
        "exp": exp,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_token(raw: str) -> dict:
    """Decode & validate a JWT, raising HTTP 401 on failure."""
    try:
        return jwt.decode(raw, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_identity(
    request: Request,
    token: HTTPAuthorizationCredentials = Depends(bearer),
) -> Tuple[Optional[int], Optional[str]]:
    """
    Returns (user_id, guest_id).
      - If an authenticated user token: (user_id, None)
      - If a guest token: (None, guest_id)
      - If no/invalid token: (None, None)
    Also supports a 'guest_token' cookie fallback.
    """
    raw = token.credentials if token and token.credentials else request.cookies.get("guest_token")
    if not raw:
        return (None, None)
    try:
        data = jwt.decode(raw, JWT_SECRET, algorithms=["HS256"])
        if data.get("guest"):
            return (None, data["sub"])
        return (int(data["sub"]), None)
    except Exception:
        return (None, None)

def require_user(token: HTTPAuthorizationCredentials = Depends(HTTPBearer())) -> int:
    """
    Dependency: require a *non-guest* user and return the user_id (int).
    Raises 401 for missing/invalid/guest tokens.
    """
    data = decode_token(token.credentials)
    if data.get("guest"):
        raise HTTPException(status_code=401, detail="Guest token not allowed")
    try:
        return int(data["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid subject claim")


def claim_guest_history(session: Session, user_id: int, guest_id: str):
    """Reassign guest images (last 24h) to this user and clear anon_id."""
    cutoff = datetime.utcnow() - timedelta(days=1)
    q = select(DBImage).where(
        DBImage.anon_id == guest_id,
        DBImage.created_at >= cutoff
    )
    images = session.exec(q).all()
    for img in images:
        img.user_id = user_id
        img.anon_id = None
        session.add(img)
    session.commit()
    return len(images)

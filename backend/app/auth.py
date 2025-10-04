from __future__ import annotations
import uuid

from fastapi import APIRouter, Response, Depends, Request, HTTPException
from sqlmodel import Session, select

from .db import get_session
from .models import User
from .schemas import RegisterIn, LoginIn
from .utils import (
    claim_guest_history,
    hash_pw,
    verify_pw,
    create_access_token,
    decode_token,
)


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/guest")
def guest_login(request: Request, response: Response):
    raw = request.cookies.get("guest_token")
    if raw:
        try:
            data = decode_token(raw)
            if data.get("guest"):
                return {"access": raw, "user": {"id": data["sub"], "email": None, "name": "Guest"}}
        except Exception:
            pass

    anon_id = f"guest-{uuid.uuid4().hex[:12]}"
    access = create_access_token(sub=anon_id, guest=True, ttl_min=60*24)  

    response.set_cookie(
        "guest_token", access,
        max_age=60*60*24, httponly=True, samesite="Lax", secure=False, path="/",
    )
    return {"access": access, "user": {"id": anon_id, "email": None, "name": "Guest"}}

@router.post("/register")
def register(
    data: RegisterIn,
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
):
    email = data.email.lower()

    # ensure uniqueness
    exists = session.exec(select(User).where(User.email == email)).first()
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")

    # create user
    user = User(
        email=email,
        name=(data.name or "").strip(),
        password_hash=hash_pw(data.password[:128]),
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # merge guest history if guest cookie exists
    guest_raw = request.cookies.get("guest_token")
    if guest_raw:
        try:
            guest_claims = decode_token(guest_raw)
            if guest_claims.get("guest"):
                claim_guest_history(session, user.id, guest_claims["sub"])
        except Exception:
            # ignore merge errors; user still gets created
            pass

    # clear guest cookie once merged
    response.delete_cookie("guest_token", path="/")

    # issue user token
    token = create_access_token(sub=user.id, guest=False)
    return {"access": token, "user": {"id": user.id, "email": user.email, "name": user.name}}


@router.post("/login")
def login(
    data: LoginIn,
    request: Request,
    response: Response,
    session: Session = Depends(get_session),
):
    email = data.email.lower()
    user = session.exec(select(User).where(User.email == email)).first()
    if not user or not verify_pw(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # merge guest history if present
    guest_raw = request.cookies.get("guest_token")
    if guest_raw:
        try:
            guest_claims = decode_token(guest_raw)
            if guest_claims.get("guest"):
                claim_guest_history(session, user.id, guest_claims["sub"])
        except Exception:
            pass

    # clear guest cookie
    response.delete_cookie("guest_token", path="/")

    token = create_access_token(sub=user.id, guest=False)
    return {"access": token, "user": {"id": user.id, "email": user.email, "name": user.name}}

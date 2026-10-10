"""Sign in with Google + per-user storage for notes, reminders, to-dos and goals.

Only the person's Google identity (id, email, name, picture) is used — the app
never asks for access to their Gmail. Set GOOGLE_CLIENT_ID to turn it on.
"""
import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import AuthSession, User, UserData

router = APIRouter(prefix="/api")

SESSION_DAYS = 60
MAX_DATA_BYTES = 2 * 1024 * 1024


def _client_id() -> str:
    return os.environ.get("GOOGLE_CLIENT_ID", "").strip()


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def verify_google_credential(credential: str) -> dict:
    """Verify a Google Identity Services ID token and return its claims."""
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    try:
        claims = id_token.verify_oauth2_token(credential, google_requests.Request(), _client_id())
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google sign-in")
    if claims.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(status_code=401, detail="Invalid Google sign-in")
    if not claims.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google email is not verified")
    return claims


def current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not signed in")
    session = db.get(AuthSession, _hash(authorization[7:].strip()))
    if not session or session.created_at < datetime.utcnow() - timedelta(days=SESSION_DAYS):
        raise HTTPException(status_code=401, detail="Session expired")
    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Not signed in")
    return user


def user_to_dict(u: User) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "picture": u.picture}


@router.get("/auth/config")
def auth_config():
    return {"google_client_id": _client_id() or None}


class GoogleLogin(BaseModel):
    credential: str


@router.post("/auth/google")
def google_login(body: GoogleLogin, db: Session = Depends(get_db)):
    if not _client_id():
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    claims = verify_google_credential(body.credential)

    user = db.query(User).filter(User.google_sub == claims["sub"]).first()
    if not user:
        user = User(google_sub=claims["sub"], email=claims["email"])
        db.add(user)
    user.email = claims["email"]
    user.name = claims.get("name") or claims["email"].split("@")[0]
    user.picture = claims.get("picture")
    db.commit()
    db.refresh(user)

    token = secrets.token_urlsafe(32)
    db.add(AuthSession(token_hash=_hash(token), user_id=user.id))
    db.commit()
    return {"token": token, "user": user_to_dict(user)}


@router.get("/auth/me")
def me(user: User = Depends(current_user)):
    return user_to_dict(user)


@router.post("/auth/logout")
def logout(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if authorization and authorization.lower().startswith("bearer "):
        session = db.get(AuthSession, _hash(authorization[7:].strip()))
        if session:
            db.delete(session)
            db.commit()
    return {"ok": True}


@router.get("/me/data")
def get_my_data(user: User = Depends(current_user), db: Session = Depends(get_db)):
    row = db.get(UserData, user.id)
    return {"data": json.loads(row.data) if row else None}


class DataBody(BaseModel):
    data: dict


@router.put("/me/data")
def put_my_data(body: DataBody, user: User = Depends(current_user), db: Session = Depends(get_db)):
    raw = json.dumps(body.data)
    if len(raw.encode()) > MAX_DATA_BYTES:
        raise HTTPException(status_code=413, detail="Notebook is too large to sync")
    row = db.get(UserData, user.id)
    if row:
        row.data = raw
        row.updated_at = datetime.utcnow()
    else:
        db.add(UserData(user_id=user.id, data=raw))
    db.commit()
    return {"ok": True}

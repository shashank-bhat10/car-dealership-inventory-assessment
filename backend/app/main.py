import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_session
from app.models import User

app = FastAPI(title="Car Dealership Inventory API")
password_hash = PasswordHash.recommended()
SECRET_KEY = os.getenv("SECRET_KEY", "development-key-change-me")
if os.getenv("ENVIRONMENT") == "production" and SECRET_KEY == "development-key-change-me":
    raise RuntimeError("Set SECRET_KEY to a unique value in production")


class RegistrationRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


def create_access_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


@app.post("/api/auth/register", status_code=201)
def register_account(data: RegistrationRequest, session: Session = Depends(get_session)):
    email = str(data.email).lower()
    if session.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email already registered")
    admin_email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "").lower()
    user = User(
        email=email,
        password_hash=password_hash.hash(data.password),
        is_admin=bool(admin_email and email == admin_email),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"id": user.id, "email": user.email, "is_admin": user.is_admin}


@app.post("/api/auth/login")
def login(
    credentials: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    email = credentials.username.lower()
    user = session.scalar(select(User).where(User.email == email))
    if user is None or not password_hash.verify(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"access_token": create_access_token(user), "token_type": "bearer"}

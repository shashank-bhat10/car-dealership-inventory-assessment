import os

import jwt
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_session
from app.models import User

app = FastAPI(title="Car Dealership Inventory API")
password_hash = PasswordHash.recommended()


class RegistrationRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


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


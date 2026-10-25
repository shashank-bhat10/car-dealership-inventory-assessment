import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import jwt
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pwdlib import PasswordHash
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.database import get_session
from app.models import User, Vehicle

app = FastAPI(title="Car Dealership Inventory API")
password_hash = PasswordHash.recommended()
SECRET_KEY = os.getenv("SECRET_KEY", "development-key-change-me")
if os.getenv("ENVIRONMENT") == "production" and SECRET_KEY == "development-key-change-me":
    raise RuntimeError("Set SECRET_KEY to a unique value in production")
oauth_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class RegistrationRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class VehicleRequest(BaseModel):
    make: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=60)
    price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    quantity: int = Field(ge=0, le=100000)

    @field_validator("make", "model", "category")
    @classmethod
    def trim_and_reject_blank(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("must not be blank")
        return normalized


class RestockRequest(BaseModel):
    quantity: int = Field(gt=0, le=100000)


class VehicleResponse(VehicleRequest):
    model_config = ConfigDict(from_attributes=True)

    id: int


def create_access_token(user: User) -> str:
    payload = {"sub": str(user.id), "exp": datetime.now(timezone.utc) + timedelta(minutes=60)}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def get_current_user(
    token: str = Depends(oauth_scheme), session: Session = Depends(get_session)
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Administrator access required")
    return user


def vehicle_statement(
    make: str | None,
    model: str | None,
    category: str | None,
    min_price: Decimal | None,
    max_price: Decimal | None,
):
    statement = select(Vehicle)
    if make:
        statement = statement.where(Vehicle.make.ilike(f"%{make.strip()}%"))
    if model:
        statement = statement.where(Vehicle.model.ilike(f"%{model.strip()}%"))
    if category:
        statement = statement.where(Vehicle.category.ilike(f"%{category.strip()}%"))
    if min_price is not None:
        statement = statement.where(Vehicle.price >= min_price)
    if max_price is not None:
        statement = statement.where(Vehicle.price <= max_price)
    return statement.order_by(Vehicle.id)


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
    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "is_admin": user.is_admin,
    }


@app.get("/api/vehicles", response_model=list[VehicleResponse])
def list_vehicles(
    make: str | None = None,
    model: str | None = None,
    category: str | None = None,
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    statement = vehicle_statement(make, model, category, min_price, max_price)
    return list(session.scalars(statement).all())


@app.get("/api/vehicles/search", response_model=list[VehicleResponse])
def search_vehicles(
    make: str | None = None,
    model: str | None = None,
    category: str | None = None,
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    statement = vehicle_statement(make, model, category, min_price, max_price)
    return list(session.scalars(statement).all())


@app.post("/api/vehicles", response_model=VehicleResponse, status_code=201)
def create_vehicle(
    data: VehicleRequest,
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    vehicle = Vehicle(**data.model_dump())
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


@app.put("/api/vehicles/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(
    vehicle_id: int,
    data: VehicleRequest,
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    vehicle = session.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    for field, value in data.model_dump().items():
        setattr(vehicle, field, value)
    session.commit()
    session.refresh(vehicle)
    return vehicle


@app.delete("/api/vehicles/{vehicle_id}", status_code=204)
def delete_vehicle(
    vehicle_id: int,
    session: Session = Depends(get_session),
    _admin: User = Depends(require_admin),
):
    vehicle = session.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    session.delete(vehicle)
    session.commit()


@app.post("/api/vehicles/{vehicle_id}/restock", response_model=VehicleResponse)
def restock_vehicle(
    vehicle_id: int,
    data: RestockRequest,
    session: Session = Depends(get_session),
    _admin: User = Depends(require_admin),
):
    result = session.execute(
        update(Vehicle)
        .where(
            Vehicle.id == vehicle_id,
            Vehicle.quantity + data.quantity <= 100000,
        )
        .values(quantity=Vehicle.quantity + data.quantity)
    )
    if result.rowcount == 0:
        if session.get(Vehicle, vehicle_id) is None:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        raise HTTPException(status_code=422, detail="Stock limit exceeded")
    session.commit()
    return session.get(Vehicle, vehicle_id)


@app.post("/api/vehicles/{vehicle_id}/purchase", response_model=VehicleResponse)
def purchase_vehicle(
    vehicle_id: int,
    session: Session = Depends(get_session),
    _user: User = Depends(get_current_user),
):
    result = session.execute(
        update(Vehicle)
        .where(Vehicle.id == vehicle_id, Vehicle.quantity > 0)
        .values(quantity=Vehicle.quantity - 1)
    )
    if result.rowcount == 0:
        if session.get(Vehicle, vehicle_id) is None:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        raise HTTPException(status_code=409, detail="Vehicle is out of stock")
    session.commit()
    return session.get(Vehicle, vehicle_id)

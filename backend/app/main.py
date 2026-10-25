from datetime import datetime, timedelta, timezone
from decimal import Decimal
import os
import jwt
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pwdlib import PasswordHash
from sqlalchemy import Boolean, Integer, Numeric, String, create_engine, select, update
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./inventory.db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
if SECRET_KEY == "dev-only-change-me" and os.getenv("ENVIRONMENT") == "production":
    raise RuntimeError("SECRET_KEY must be set in production")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite")
    else {},
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
password_hash = PasswordHash.recommended()
oauth = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)


class Vehicle(Base):
    __tablename__ = "vehicles"
    id: Mapped[int] = mapped_column(primary_key=True)
    make: Mapped[str] = mapped_column(String(80), index=True)
    model: Mapped[str] = mapped_column(String(100), index=True)
    category: Mapped[str] = mapped_column(String(60), index=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    quantity: Mapped[int] = mapped_column(Integer)


class Register(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class VehicleIn(BaseModel):
    make: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=60)
    price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    quantity: int = Field(ge=0, le=100000)

    @field_validator("make", "model", "category")
    @classmethod
    def nonblank(cls, value):
        if not value.strip():
            raise ValueError("must not be blank")
        return value.strip()


class VehicleOut(VehicleIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class QuantityIn(BaseModel):
    quantity: int = Field(gt=0, le=100000)


def db_session():
    with SessionLocal() as session:
        yield session


def current_user(token: str = Depends(oauth), db: Session = Depends(db_session)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user = db.scalar(select(User).where(User.id == int(payload["sub"])))
        if not user:
            raise ValueError
        return user
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def admin_user(user: User = Depends(current_user)):
    if not user.is_admin:
        raise HTTPException(403, "Administrator access required")
    return user


def token_for(user):
    return jwt.encode(
        {
            "sub": str(user.id),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        },
        SECRET_KEY,
        algorithm="HS256",
    )


app = FastAPI(title="Dealership Inventory API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/register", status_code=201)
def register(data: Register, db: Session = Depends(db_session)):
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Email already registered")
    admin_email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "").lower()
    user = User(
        email=email,
        password_hash=password_hash.hash(data.password),
        is_admin=bool(admin_email and email == admin_email),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "is_admin": user.is_admin}


@app.post("/api/auth/login")
def login(
    form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(db_session)
):
    user = db.scalar(select(User).where(User.email == form.username.lower()))
    if not user or not password_hash.verify(form.password, user.password_hash):
        raise HTTPException(
            401, "Incorrect email or password", headers={"WWW-Authenticate": "Bearer"}
        )
    return {
        "access_token": token_for(user),
        "token_type": "bearer",
        "is_admin": user.is_admin,
    }


@app.get("/api/vehicles", response_model=list[VehicleOut])
def vehicles(
    make: str | None = None,
    model: str | None = None,
    category: str | None = None,
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    db: Session = Depends(db_session),
    user: User = Depends(current_user),
):
    q = select(Vehicle)
    if make:
        q = q.where(Vehicle.make.ilike(f"%{make.strip()}%"))
    if model:
        q = q.where(Vehicle.model.ilike(f"%{model.strip()}%"))
    if category:
        q = q.where(Vehicle.category.ilike(f"%{category.strip()}%"))
    if min_price is not None:
        q = q.where(Vehicle.price >= min_price)
    if max_price is not None:
        q = q.where(Vehicle.price <= max_price)
    return list(db.scalars(q.order_by(Vehicle.id)).all())


@app.get("/api/vehicles/search", response_model=list[VehicleOut])
def search(
    make: str | None = None,
    model: str | None = None,
    category: str | None = None,
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    db: Session = Depends(db_session),
    user: User = Depends(current_user),
):
    return vehicles(make, model, category, min_price, max_price, db, user)


@app.post("/api/vehicles", response_model=VehicleOut, status_code=201)
def create_vehicle(
    data: VehicleIn,
    db: Session = Depends(db_session),
    user: User = Depends(current_user),
):
    v = Vehicle(**data.model_dump())
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@app.put("/api/vehicles/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(
    vehicle_id: int,
    data: VehicleIn,
    db: Session = Depends(db_session),
    user: User = Depends(current_user),
):
    v = db.get(Vehicle, vehicle_id)
    if not v:
        raise HTTPException(404, "Vehicle not found")
    for key, value in data.model_dump().items():
        setattr(v, key, value)
    db.commit()
    db.refresh(v)
    return v


@app.delete("/api/vehicles/{vehicle_id}", status_code=204)
def delete_vehicle(
    vehicle_id: int, db: Session = Depends(db_session), user: User = Depends(admin_user)
):
    v = db.get(Vehicle, vehicle_id)
    if not v:
        raise HTTPException(404, "Vehicle not found")
    db.delete(v)
    db.commit()


@app.post("/api/vehicles/{vehicle_id}/purchase", response_model=VehicleOut)
def purchase(
    vehicle_id: int,
    db: Session = Depends(db_session),
    user: User = Depends(current_user),
):
    result = db.execute(
        update(Vehicle)
        .where(Vehicle.id == vehicle_id, Vehicle.quantity > 0)
        .values(quantity=Vehicle.quantity - 1)
    )
    if result.rowcount == 0:
        if not db.get(Vehicle, vehicle_id):
            raise HTTPException(404, "Vehicle not found")
        raise HTTPException(409, "Vehicle is out of stock")
    db.commit()
    return db.get(Vehicle, vehicle_id)


@app.post("/api/vehicles/{vehicle_id}/restock", response_model=VehicleOut)
def restock(
    vehicle_id: int,
    data: QuantityIn,
    db: Session = Depends(db_session),
    user: User = Depends(admin_user),
):
    result = db.execute(
        update(Vehicle)
        .where(Vehicle.id == vehicle_id)
        .values(quantity=Vehicle.quantity + data.quantity)
    )
    if result.rowcount == 0:
        raise HTTPException(404, "Vehicle not found")
    db.commit()
    return db.get(Vehicle, vehicle_id)

"""Seed a local development database with fictional vehicle inventory."""

import os

from sqlalchemy import select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.database import DATABASE_URL, SessionLocal
from app.models import Vehicle

DEMO_VEHICLES = (
    {"make": "Toyota", "model": "Corolla", "category": "Sedan", "price": "24000.00", "quantity": 5},
    {"make": "Honda", "model": "Civic", "category": "Sedan", "price": "22900.00", "quantity": 1},
    {"make": "Ford", "model": "Mustang", "category": "Coupe", "price": "42500.00", "quantity": 3},
    {"make": "Tesla", "model": "Model 3", "category": "Electric", "price": "38900.00", "quantity": 0},
    {"make": "Subaru", "model": "Outback", "category": "Wagon", "price": "31900.00", "quantity": 4},
    {"make": "BMW", "model": "X3", "category": "SUV", "price": "45900.00", "quantity": 2},
)


def validate_seed_target(environment: str | None, database_url: str) -> None:
    """Reject unsafe targets before opening a database session."""
    if environment != "development":
        raise RuntimeError("Demo seeding requires ENVIRONMENT=development")

    url = make_url(database_url)
    if url.drivername not in {"sqlite", "sqlite+pysqlite"}:
        raise RuntimeError("Demo seeding only supports a local SQLite database")

    database = url.database or ""
    if not database or database == ":memory:" or database.startswith(("//", "\\\\")):
        raise RuntimeError("Demo seeding requires a local SQLite file database")
    if url.query.get("mode") == "memory" or database.startswith("file:"):
        raise RuntimeError("Demo seeding requires a local SQLite file database")


def seed_demo_vehicles(session: Session) -> tuple[int, int]:
    """Insert missing demo make/model pairs without modifying existing rows."""
    existing = set(session.execute(select(Vehicle.make, Vehicle.model)).all())
    added = 0
    skipped = 0

    for vehicle_data in DEMO_VEHICLES:
        key = (vehicle_data["make"], vehicle_data["model"])
        if key in existing:
            skipped += 1
            continue
        session.add(Vehicle(**vehicle_data))
        existing.add(key)
        added += 1

    if added:
        session.commit()
    return added, skipped


def main() -> None:
    database_url = os.environ.get("DATABASE_URL", DATABASE_URL)
    try:
        validate_seed_target(os.environ.get("ENVIRONMENT"), database_url)
    except (RuntimeError, ValueError) as error:
        raise SystemExit(str(error)) from error

    if database_url != DATABASE_URL:
        raise SystemExit("DATABASE_URL changed after the database engine was configured")

    with SessionLocal() as session:
        added, skipped = seed_demo_vehicles(session)
    print(f"Added {added} demo vehicles; skipped {skipped} existing vehicles.")


if __name__ == "__main__":
    main()

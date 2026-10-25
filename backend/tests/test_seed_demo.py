import os
import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[1]
EXPECTED_VEHICLES = {
    ("Toyota", "Corolla", "Sedan", "24000.00", 5),
    ("Honda", "Civic", "Sedan", "22900.00", 1),
    ("Ford", "Mustang", "Coupe", "42500.00", 3),
    ("Tesla", "Model 3", "Electric", "38900.00", 0),
    ("Subaru", "Outback", "Wagon", "31900.00", 4),
    ("BMW", "X3", "SUV", "45900.00", 2),
}


@pytest.fixture
def migrated_demo_database(tmp_path: Path) -> tuple[Path, str, dict[str, str]]:
    database_path = tmp_path / "demo.sqlite3"
    database_url = f"sqlite:///{database_path.as_posix()}"
    environment = os.environ.copy()
    environment.update(
        {
            "DATABASE_URL": database_url,
            "ENVIRONMENT": "development",
            "SECRET_KEY": "test-only-seed-demo-secret",
        }
    )
    migration = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
        timeout=30,
    )
    assert migration.returncode == 0, migration.stderr
    return database_path, database_url, environment


def run_seeder(environment: dict[str, str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "app.seed_demo"],
        cwd=BACKEND,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
        timeout=15,
    )


def read_vehicles(database_path: Path) -> list[tuple[str, str, str, str, int]]:
    with sqlite3.connect(database_path) as connection:
        return connection.execute(
            "SELECT make, model, category, printf('%.2f', price), quantity "
            "FROM vehicles ORDER BY make, model"
        ).fetchall()


def test_demo_seed_adds_expected_fictional_inventory(migrated_demo_database):
    database_path, _, environment = migrated_demo_database

    result = run_seeder(environment)

    assert result.returncode == 0, result.stderr
    assert "Added 6 demo vehicles; skipped 0 existing vehicles." in result.stdout
    assert set(read_vehicles(database_path)) == EXPECTED_VEHICLES


def test_demo_seed_is_idempotent_and_preserves_existing_user_data(
    migrated_demo_database,
):
    database_path, _, environment = migrated_demo_database
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            "INSERT INTO users (email, password_hash, is_admin) VALUES (?, ?, ?)",
            ("customer@example.test", "existing-password-hash", 0),
        )

    first_run = run_seeder(environment)
    second_run = run_seeder(environment)

    assert first_run.returncode == second_run.returncode == 0
    assert "Added 6 demo vehicles; skipped 0 existing vehicles." in first_run.stdout
    assert "Added 0 demo vehicles; skipped 6 existing vehicles." in second_run.stdout
    assert len(read_vehicles(database_path)) == 6
    with sqlite3.connect(database_path) as connection:
        user = connection.execute(
            "SELECT email, password_hash, is_admin FROM users"
        ).fetchone()
    assert user == ("customer@example.test", "existing-password-hash", 0)


def test_demo_seed_skips_matching_vehicle_without_overwriting_it(
    migrated_demo_database,
):
    database_path, _, environment = migrated_demo_database
    with sqlite3.connect(database_path) as connection:
        connection.execute(
            "INSERT INTO vehicles (make, model, category, price, quantity) "
            "VALUES (?, ?, ?, ?, ?)",
            ("Toyota", "Corolla", "Pre-owned", 10000, 7),
        )

    result = run_seeder(environment)

    assert result.returncode == 0, result.stderr
    assert "Added 5 demo vehicles; skipped 1 existing vehicles." in result.stdout
    rows = read_vehicles(database_path)
    assert len(rows) == 6
    assert ("Toyota", "Corolla", "Pre-owned", "10000.00", 7) in rows


def test_demo_seed_refuses_non_development_mode(migrated_demo_database):
    _, _, environment = migrated_demo_database
    environment["ENVIRONMENT"] = "production"

    result = run_seeder(environment)

    assert result.returncode != 0
    assert "ENVIRONMENT=development" in result.stderr


def test_demo_seed_refuses_nonlocal_database_even_in_development(
    migrated_demo_database,
):
    _, _, environment = migrated_demo_database
    environment["DATABASE_URL"] = (
        "postgresql+psycopg://demo:demo@database.example.invalid:5432/dealership"
    )

    result = run_seeder(environment)

    assert result.returncode != 0
    assert "local SQLite" in result.stderr

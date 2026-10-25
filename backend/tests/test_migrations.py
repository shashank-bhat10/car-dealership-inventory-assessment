import os
import sqlite3
import subprocess
import sys
from pathlib import Path
from tempfile import gettempdir
from uuid import uuid4

import pytest


def test_fresh_sqlite_database_migrates_purchase_history():
    database = Path(gettempdir()) / f"dealership_migration_{uuid4().hex}.db"
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite:///{database.as_posix()}"

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=Path(__file__).parents[1],
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    with sqlite3.connect(database) as connection:
        tables = {
            row[0]
            for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")
        }
        revision = connection.execute("SELECT version_num FROM alembic_version").fetchone()[0]
    assert {"users", "vehicles", "purchases", "alembic_version"} <= tables
    assert revision == "0003_purchase_history"
    with sqlite3.connect(database) as connection:
        columns = {row[1]: row for row in connection.execute("PRAGMA table_info(purchases)")}
        vehicle_foreign_key = connection.execute("PRAGMA foreign_key_list(purchases)").fetchall()
    assert {"id", "purchaser_id", "vehicle_id", "make", "model", "unit_price", "purchased_at"} <= columns.keys()
    assert columns["vehicle_id"][3] == 0
    assert any(row[2] == "vehicles" and row[6].upper() == "SET NULL" for row in vehicle_foreign_key)
    with sqlite3.connect(database) as connection:
        for price, quantity in ((0, 1), (-1, 1), (1, -1), (1, 100001)):
            with pytest.raises(sqlite3.IntegrityError):
                connection.execute(
                    "INSERT INTO vehicles (make, model, category, price, quantity) VALUES (?, ?, ?, ?, ?)",
                    ("Test", f"invalid-{price}-{quantity}", "Test", price, quantity),
                )


@pytest.mark.parametrize(
    "database_url",
    [
        "postgres://user:password@localhost/dealership",
        "postgresql://user:password@localhost/dealership?sslmode=require",
    ],
)
def test_alembic_offline_migration_accepts_raw_postgresql_urls(database_url):
    env = os.environ.copy()
    env["DATABASE_URL"] = database_url

    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head", "--sql"],
        cwd=Path(__file__).parents[1],
        env=env,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    assert "PostgresqlImpl" in result.stderr
    assert "CREATE TABLE users" in result.stdout
    assert "0003_purchase_history" in result.stdout

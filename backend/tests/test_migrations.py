import os
import sqlite3
import subprocess
import sys
from pathlib import Path
from tempfile import gettempdir
from uuid import uuid4

import pytest


def test_fresh_sqlite_database_migrates_users_and_vehicles():
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
    assert {"users", "vehicles", "alembic_version"} <= tables
    assert revision == "0002_vehicle_constraints"
    with sqlite3.connect(database) as connection:
        for price, quantity in ((0, 1), (-1, 1), (1, -1), (1, 100001)):
            with pytest.raises(sqlite3.IntegrityError):
                connection.execute(
                    "INSERT INTO vehicles (make, model, category, price, quantity) VALUES (?, ?, ?, ?, ?)",
                    ("Test", f"invalid-{price}-{quantity}", "Test", price, quantity),
                )

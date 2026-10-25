import os
import subprocess
import sys
from pathlib import Path


def test_test_configuration_respects_postgresql_database_url():
    backend = Path(__file__).parents[1]
    env = os.environ.copy()
    env["DATABASE_URL"] = "postgresql+psycopg://ci:ci@127.0.0.1:5432/dealership"
    script = (
        "import runpy; runpy.run_path('tests/conftest.py'); "
        "from app.database import engine; print(engine.dialect.name)"
    )

    result = subprocess.run(
        [sys.executable, "-c", script], cwd=backend, env=env, capture_output=True, text=True
    )

    assert result.returncode == 0, result.stdout + result.stderr
    assert result.stdout.strip() == "postgresql"

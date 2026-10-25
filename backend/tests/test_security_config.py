import os
import subprocess
import sys

import pytest


def import_application(environment=None, secret_key=None):
    child_environment = os.environ.copy()
    child_environment.pop("ENVIRONMENT", None)
    child_environment.pop("SECRET_KEY", None)
    child_environment["DATABASE_URL"] = "sqlite:///:memory:"
    if environment is not None:
        child_environment["ENVIRONMENT"] = environment
    if secret_key is not None:
        child_environment["SECRET_KEY"] = secret_key
    return subprocess.run(
        [sys.executable, "-c", "from app.main import app"],
        capture_output=True,
        text=True,
        env=child_environment,
    )


def test_missing_environment_and_secret_fail_closed():
    result = import_application()
    assert result.returncode != 0
    assert "SECRET_KEY" in result.stderr


def test_production_requires_a_configured_jwt_secret():
    result = import_application(environment="production")
    assert result.returncode != 0
    assert "SECRET_KEY" in result.stderr


@pytest.mark.parametrize(
    "secret",
    ["short", "development-key-change-me", "x" * 40, "replace-with-a-long-random-secret"],
)
def test_production_rejects_weak_or_placeholder_jwt_secrets(secret):
    result = import_application(environment="production", secret_key=secret)
    assert result.returncode != 0, result.stderr
    assert "SECRET_KEY" in result.stderr


def test_production_accepts_a_long_non_placeholder_jwt_secret():
    secret = "c89bc708f3db7045860e8403d06dad190851773af114710b7a46782bd8323c57"
    result = import_application(environment="production", secret_key=secret)
    assert result.returncode == 0, result.stderr


def test_explicit_development_mode_can_use_the_local_default_secret():
    result = import_application(environment="development")
    assert result.returncode == 0, result.stderr

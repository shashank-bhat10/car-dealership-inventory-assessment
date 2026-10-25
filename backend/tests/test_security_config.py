import pytest

from app.security import configured_secret_key


def test_production_requires_a_configured_jwt_secret():
    with pytest.raises(RuntimeError, match="SECRET_KEY is required"):
        configured_secret_key("production", None)


@pytest.mark.parametrize(
    "secret",
    ["short", "development-key-change-me", "x" * 40, "replace-with-a-long-random-secret"],
)
def test_production_rejects_weak_or_placeholder_jwt_secrets(secret):
    with pytest.raises(RuntimeError, match="SECRET_KEY must be at least"):
        configured_secret_key("production", secret)


def test_production_accepts_a_long_non_placeholder_jwt_secret():
    secret = "c89bc708f3db7045860e8403d06dad190851773af114710b7a46782bd8323c57"
    assert configured_secret_key("production", secret) == secret


def test_development_can_use_a_local_default_secret():
    assert configured_secret_key("development", None) == "development-key-change-me"

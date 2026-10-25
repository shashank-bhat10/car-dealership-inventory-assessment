import os
from pathlib import Path
from tempfile import gettempdir
from uuid import uuid4

import pytest

TEST_DB = Path(gettempdir()) / f"dealership_tdd_{uuid4().hex}.db"
if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
if os.environ["DATABASE_URL"].startswith("sqlite:"):
    os.environ["TEST_DATABASE_PATH"] = str(TEST_DB)
else:
    os.environ.pop("TEST_DATABASE_PATH", None)


@pytest.fixture(autouse=True)
def fresh_database():
    from app.database import Base, engine
    import app.models  # noqa: F401

    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)

os.environ["ENVIRONMENT"] = "development"
os.environ["SECRET_KEY"] = "test-secret-key-for-jwt-signing"


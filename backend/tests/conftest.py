import os
from pathlib import Path
from tempfile import gettempdir
from uuid import uuid4

TEST_DB = Path(gettempdir()) / f"dealership_tdd_{uuid4().hex}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
os.environ["TEST_DATABASE_PATH"] = str(TEST_DB)

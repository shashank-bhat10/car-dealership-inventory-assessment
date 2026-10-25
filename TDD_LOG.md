# Test-driven development log

Every red result below was observed before the implementation commit for that behavior. Commit IDs are filled in as commits are created; no results are backdated.

## Registration and password storage

- Red tests: `backend/tests/test_registration.py`
- Command: `python -m pytest -q tests/test_registration.py` (working directory `backend`, `PYTHONPATH=.`)
- Observed result against the empty FastAPI harness: **4 failed, 1 warning**. Each route assertion received HTTP 404. The warning was Starlette's upstream deprecation for `anyio.abc.BlockingPortal`.
- Test-first commit: created in this commit.
- Passing implementation result: pending.

- Passing rerun before implementation commit: python -m pytest -q tests/test_registration.py — **4 passed, 1 upstream Starlette warning**.

## JWT login

- Red tests: `backend/tests/test_login.py`
- Command: `python -m pytest -q tests/test_login.py` (working directory `backend`, `PYTHONPATH=.`)
- Observed result before login implementation: **2 failed, 1 warning**. Both login scenarios received HTTP 404 because the endpoint was not implemented.
- Test-first commit: recorded by the commit containing these tests.
- Passing implementation result: pending.

- Passing rerun before login implementation commit: python -m pytest -q tests/test_login.py tests/test_registration.py — **6 passed, 1 upstream warning**.

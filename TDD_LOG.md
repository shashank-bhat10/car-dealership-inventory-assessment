# Test-driven development log

Every red result below was observed before the implementation commit for that behavior. Commit IDs are filled in as commits are created; no results are backdated.

## Registration and password storage

- Red tests: `backend/tests/test_registration.py`
- Command: `python -m pytest -q tests/test_registration.py` (working directory `backend`, `PYTHONPATH=.`)
- Observed result against the empty FastAPI harness: **4 failed, 1 warning**. Each route assertion received HTTP 404. The warning was Starlette's upstream deprecation for `anyio.abc.BlockingPortal`.
- Test-first commit: created in this commit.
- Passing implementation result: pending.

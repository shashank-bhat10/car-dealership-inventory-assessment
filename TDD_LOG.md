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

## Protected vehicle CRUD, validation, and search

- Red tests: `backend/tests/test_vehicles.py`
- Command: `python -m pytest -q tests/test_vehicles.py` (working directory `backend`, `PYTHONPATH=.`)
- Observed result before endpoint implementation: **3 failed, 1 passed, 1 warning**. Missing list/create/search endpoints returned HTTP 404; the absent update endpoint test unexpectedly passed its expected 404. The warning was the same upstream Starlette deprecation.
- Test-first commit: recorded by the commit containing these tests.
- Passing implementation result: pending.

- Passing rerun before vehicle implementation commit: python -m pytest -q tests/test_vehicles.py tests/test_login.py tests/test_registration.py — **10 passed, 1 upstream warning**.

## Administrator deletion and restocking

- Red tests: `backend/tests/test_admin.py`
- Command: `python -m pytest -q tests/test_admin.py` (working directory `backend`, `PYTHONPATH=.`)
- Observed result before admin implementation: **3 failed, 1 warning**. Delete returned 405 because the vehicle resource had only a PUT route; restock returned 404. The warning was the upstream Starlette deprecation.
- Test-first commit: recorded by the commit containing these tests.
- Passing implementation result: pending.

## Restock quantity ceiling

- Red test: `test_restock_cannot_exceed_the_vehicle_stock_limit` in `backend/tests/test_admin.py`
- Command: `python -m pytest -q tests/test_admin.py::test_restock_cannot_exceed_the_vehicle_stock_limit` (working directory `backend`, `PYTHONPATH=.`)
- Observed result before restock implementation: **1 failed, 1 warning**. The missing endpoint returned HTTP 404 instead of the expected 422 and did not yet expose the post-restock stock assertion.
- Test-first commit: recorded by the commit containing this test.
- Passing implementation result: pending.

- Passing rerun before admin implementation commit: python -m pytest -q tests/test_admin.py tests/test_vehicles.py tests/test_login.py tests/test_registration.py — **14 passed, 1 upstream warning**.

## Protected purchase and concurrent stock boundaries

- Red tests: `backend/tests/test_purchases.py`
- Command: `python -m pytest -q tests/test_purchases.py` (working directory `backend`, `PYTHONPATH=.`)
- Observed result before purchase implementation: **2 failed, 1 warning**. A valid purchase received HTTP 404; the concurrency test observed no successful purchases because the endpoint was absent. The warning was the upstream Starlette deprecation.
- Test-first commit: recorded by the commit containing these tests.
- Passing implementation result: pending.

- Passing rerun before purchase implementation commit: python -m pytest -q tests/test_purchases.py — **2 passed, 1 upstream warning**. Eight parallel SQLite HTTP requests for three units yielded three 200 responses and five 409 responses.

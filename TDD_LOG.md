# Test-driven development log

Every red result below was observed before the implementation commit for that behavior. Commit IDs are filled in as commits are created; no results are backdated.

## Registration and password storage

- Red tests: `backend/tests/test_registration.py`
- Command: `python -m pytest -q tests/test_registration.py` (working directory `backend`, `PYTHONPATH=.`)
- Observed result against the empty FastAPI harness: **4 failed, 1 warning**. Each route assertion received HTTP 404. The warning was Starlette's upstream deprecation for `anyio.abc.BlockingPortal`.
- Test-first commit: created in this commit.
- Passing rerun: `pnpm exec vitest run -t 'loads protected inventory'` — **1 passed, 4 skipped**. Request helper sends the bearer token and dashboard renders inventory data.

## Inventory search and stock boundary UI

- Red tests: search request parameters and disabled zero-stock purchase control in `frontend/src/App.test.jsx`.
- Command: `pnpm exec vitest run -t 'searches vehicles|prevents a customer purchase'`.
- Observed result before implementation: **2 failed, 5 skipped**. Search controls and purchase button did not exist.
- Test-first commit: recorded by the commit containing these tests.
- Passing implementation result: pending.

- Passing rerun: `pnpm exec vitest run -t 'searches vehicles|prevents a customer purchase'` — **2 passed, 5 skipped**; `pnpm lint` and `pnpm build` passed.
- Admin controls rerun: `pnpm test` — **7 passed, 1 failed**. The register/login UI now correctly triggered a third protected inventory request; the old test expectation of two calls was stale. The assertion was updated to verify the bearer header and three calls before committing the app.

## Administrator inventory controls

- Red test: admin-only dashboard controls in `frontend/src/App.test.jsx`.
- Command: `pnpm exec vitest run -t 'shows administrator inventory controls'`.
- Observed result before implementation: **1 failed, 7 skipped**. The administrator dashboard did not expose an add-vehicle form.
- Test-first commit: recorded by the commit containing this test.
- Passing implementation result: pending.

### Authentication role response

- Red test: `test_login_identifies_bootstrap_administrator` in `backend/tests/test_login.py`
- Command: `python -m pytest -q tests/test_login.py` (using the workspace Python runtime in `backend`)
- Observed result before implementation: **1 failed, 2 passed**. Login returned HTTP 200 but omitted `is_admin` (`KeyError`). Starlette emitted one AnyIO deprecation warning.
- Test-first commit: recorded by the commit containing this test.
- Passing rerun before implementation commit: `python -m pytest -q tests/test_login.py` — **3 passed**, one Starlette/AnyIO deprecation warning.

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

## Fresh database migrations

- Red test: `backend/tests/test_migrations.py`
- Command: `python -m pytest -q tests/test_migrations.py` (working directory `backend`, `PYTHONPATH=.`)
- Observed result before migration implementation: **1 failed**. Alembic returned `No config file 'alembic.ini' found, or file has no '[alembic]' section`.
- Test-first commit: recorded by the commit containing this test.
- Passing implementation result: pending.

- Passing rerun before migration implementation commit: `python -m pytest -q tests/test_migrations.py` — **1 passed**; created SQLite schema contains `users`, `vehicles`, and `alembic_version` at `0001_initial`.

## Frontend account forms

- Red tests: `frontend/src/App.test.jsx`
- Command: `pnpm test` (working directory `frontend`)
- Observed result against the empty React screen: **2 failed**. The sign-in label and registration switch button were absent.
- Test-first commit: recorded by the commit containing these tests.
- Passing implementation result: pending.

### Registration and login UI flow

- Tests: `frontend/src/App.test.jsx` covers successful register-then-login token storage and rejected-login feedback.
- Command: `pnpm test` (working directory `frontend`)
- Observed result before the account UI implementation: **4 failed**. The empty app lacked the account controls, so registration and error-state interactions could not proceed.
- Test-first commit: recorded by the commit containing these added tests.
- Passing implementation result: pending.

- Passing rerun before frontend account implementation commit: pnpm test — **4 passed**. pnpm lint — **passed**. pnpm build — **passed** (Vite transformed 1,579 modules). The first post-implementation test run exposed unsupported assertion matchers in the test file; assertions were rewritten using built-in DOM properties before the passing rerun.

## Customer inventory dashboard

- Red test: `loads protected inventory and renders vehicle details` in `frontend/src/App.test.jsx`
- Command: `pnpm exec vitest run -t 'loads protected inventory'` (working directory `frontend`)
- Observed result before dashboard implementation: **1 failed, 4 skipped**. The authenticated shell rendered no vehicle heading or inventory record.
- Test-first commit: recorded by the commit containing this test.
- Passing implementation result: pending.

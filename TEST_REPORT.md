# Test report

Date: 2026-10-25 (Asia/Calcutta).

## Results

- Backend `python -m pytest -q` from `backend` with `PYTHONPATH=.`: **7 passed, 1 warning**. The remaining warning is an upstream Starlette deprecation for `anyio.abc.BlockingPortal`.
- Concurrent purchases: 8 parallel requests from stock 3 yielded **3 HTTP 200, 5 HTTP 409**, ending with quantity 0. This establishes behavior for this local SQLite test setup only.
- Fresh SQLite migration: `DATABASE_URL=sqlite:///./fresh-migration-check.db python -m alembic upgrade head`: **passed**, applied `0001_initial`; `python -m alembic current`: **0001_initial (head)**.
- Backend coverage: `python -m pytest -q --cov=app --cov-report=term-missing` — **7 passed, 95% statement coverage** (8 uncovered lines), with one upstream Starlette warning.\n- Backend lint: `python -m ruff check app tests` using Ruff 0.11.2: **passed**.
- Frontend `pnpm test`: **2 passed**.
- Frontend `pnpm lint`: **passed**.
- Frontend `pnpm build`: **passed**, Vite 6.1.0 transformed 1,579 modules.

## Warnings and corrections

The bundled Python installer noted its Scripts directory was not on PATH; Python module commands were used. pnpm install warned that ESLint 9.19.0 is deprecated and that a transitive `whatwg-encoding` dependency is deprecated. pnpm required explicit `esbuild` build approval, recorded in `frontend/pnpm-workspace.yaml`.

Early checks exposed missing `python-multipart`, invalid FastAPI query metadata, JSX lint parsing, and an edit-flow syntax error. These were corrected before the passing results above. No warning was suppressed to obtain passing checks.

## Not verified

A local PostgreSQL 17 service is running and TCP port 5432 accepts connections. A psycopg test against database `postgres` as user `postgres` failed with `fe_sendauth: no password supplied`; PostgreSQL verification remains blocked on credentials. GitHub Actions has not yet run. The live dashboard was opened and visually inspected in the in-app browser, and an actual screenshot was captured inline. The screenshot API did not expose a local file path, so it could not be committed under `screenshots/`. Full browser accessibility automation remains unverified. Public repo creation/push did not occur. The available GitHub connector has no repository-creation tool, `gh` is not installed, and Git has no configured credential helper. Required action: provide an authenticated GitHub CLI/credential helper or enable a repository-creation connector with permission, then create `car-dealership-inventory-assessment` as public and push branch `main`.




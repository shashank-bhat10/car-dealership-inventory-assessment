# Test and verification report

Run date: **2026-10-25** (local development session; Asia/Kolkata). These results are local observations, not GitHub Actions results.

## Backend

Working directory: `backend`. Python command executable was the workspace runtime at `C:\Users\Shashank\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`.

| Command | Observed result |
| --- | --- |
| `$env:PYTHONPATH='.'; & 'C:\Users\Shashank\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m pytest -q` | **19 passed** in 6.57s on the final run. One upstream warning: Starlette `TestClient` uses deprecated `anyio.abc.BlockingPortal`; no project warning was suppressed. |
| `.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-dev.txt` followed by `$env:PYTHONPATH='.'; .venv\Scripts\python.exe -m pytest -q` | Clean project virtual environment installed declared dependencies including `httpx`; **19 passed** in 6.44s, same upstream warning. |
| `& 'C:\Users\Shashank\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m ruff check app tests` | **All checks passed!** Earlier lint attempt found two unused imports (`Session`, `Decimal`); both were removed and Ruff was rerun successfully. |
| `$env:DATABASE_URL='sqlite:///./fresh-final-20261025.db'; & 'C:\Users\Shashank\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m alembic -c alembic.ini upgrade head` | **Passed** on a fresh ignored SQLite database; Alembic applied revision `0001_initial`. |
| `$env:PYTHONPATH='.'; & 'C:\Users\Shashank\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m pytest -q tests/test_login.py` | **3 passed**, one same upstream deprecation warning after adding role metadata. |
| `$env:PYTHONPATH='.'; & 'C:\Users\Shashank\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m pytest -q tests/test_cors.py` | **1 passed**, one same upstream deprecation warning. |

An earlier bare system `python -m pytest` command failed because that interpreter did not have pytest installed. The successful runs above used the configured workspace Python runtime. The purchase concurrency test issued eight parallel requests against SQLite stock quantity 3 and observed three HTTP 200 and five HTTP 409 responses. This checks the atomic SQL condition in the local SQLite test setup; it does not establish production behavior for PostgreSQL, different isolation/driver configurations, or multi-node deployment.

PostgreSQL was not configured or verified in this run.

## Frontend

Working directory: `frontend`; pnpm `11.25.0`, Vitest `3.0.7`, Vite `6.1.0`.

| Command | Observed result |
| --- | --- |
| `pnpm test` | **8 passed** in 2.71s after the final responsive style change. |
| `pnpm lint` | **Passed** (ESLint; no findings). |
| `pnpm build` | **Passed**; Vite transformed 1,579 modules; output 10.82 kB CSS and 196.84 kB JS before gzip. |
| `pnpm exec node capture.mjs` (one-off Playwright 1.64.1 script) | Captured real authenticated customer and administrator screens from the local SPA/API. The capture script was temporary and was not retained in the repository. |

Package-install warnings observed: deprecated `eslint@9.19.0` and transitive `whatwg-encoding@3.1.1`. The build and lint did not emit project errors.

## CI and migration limitations

GitHub Actions run [40179145568](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40179145568) on `ce37690`: frontend job passed; backend Ruff passed; backend pytest collection failed because `httpx` was missing; Alembic skipped. After pinning `httpx==0.28.1`, clean local `.venv` tests passed. GitHub Actions run [40179376846](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40179376846) on `591a679`: frontend job and backend Ruff passed; pytest collection failed again because the `app` package was not importable in the runner; Alembic skipped. Added job-level `PYTHONPATH: .`; the next CI run is pending. Local fresh SQLite migration passed. PostgreSQL service availability was not established; PostgreSQL behavior remains unverified.

## TDD evidence

See [TDD_LOG.md](TDD_LOG.md) for red test commits, observed failing outcomes, implementation commits, passing reruns and the concurrency-test scope. Tests and test result commits precede the corresponding implementation commits throughout the recorded branch history.

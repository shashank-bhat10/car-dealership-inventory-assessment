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
| `pnpm test` | **14 passed** in 1.81s on 2026-10-25, including registration/login, all five search query filters, loading/empty/error/retry states, out-of-stock purchase disablement, and admin POST/PUT/DELETE/restock requests and outcomes. |
| `pnpm lint` | **Passed** (ESLint; no findings). |
| `pnpm build` | **Passed**; Vite transformed 1,579 modules; output 10.82 kB CSS and 196.98 kB JS before gzip. |
| `pnpm exec node capture.mjs` (one-off Playwright 1.64.1 script) | Captured real authenticated customer and administrator screens from the local SPA/API. The capture script was temporary and was not retained in the repository. |

Package-install warnings observed: deprecated `eslint@9.19.0` and transitive `whatwg-encoding@3.1.1`. The build and lint did not emit project errors.

## CI and migration limitations

GitHub Actions run [40179145568](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40179145568) on `ce37690`: frontend job passed; backend Ruff passed; backend pytest collection failed because `httpx` was missing; Alembic skipped. After pinning `httpx==0.28.1`, clean local `.venv` tests passed. GitHub Actions run [40179376846](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40179376846) on `591a679`: frontend job and backend Ruff passed; pytest collection failed again because the `app` package was not importable in the runner; Alembic skipped. Added job-level `PYTHONPATH: .`; run [40179459445](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40179459445) on `24f8d1d` passed both jobs. Backend Ruff passed, 19 tests passed with 97% coverage, Alembic passed; frontend install, 8 tests, lint, and production build passed.

Warnings in successful CI run: Starlette's `anyio.abc.BlockingPortal` deprecation; GitHub runner Node.js deprecations from `actions/checkout@v4`, `actions/setup-python@v5`, `actions/setup-node@v4`, and `pnpm/action-setup@v4`; Node deprecations `DEP0040` (`punycode`) and `DEP0169` (`url.parse`) from action tooling. These warnings were not suppressed. Run [40179570241](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40179570241) on commit `fea340d32a758e95c9d01b8b184a6593d115a951` completed successfully; both backend and frontend jobs passed. That run is the last completed remote run before the final-audit commits. Local fresh SQLite migration passed. PostgreSQL service availability was not established; PostgreSQL behavior remains unverified.

## Final-audit local rerun (2026-10-25)

Commands were run from the `backend` and `frontend` directories of branch `submission/tdd-kata` after the inventory retry change:

| Exact command | Observed result |
| --- | --- |
| `$env:PYTHONPATH='.'; .\.venv\Scripts\python.exe -m pytest -q` | **19 passed**, 1 upstream Starlette/AnyIO `BlockingPortal` deprecation warning, 5.31s. |
| `.\.venv\Scripts\python.exe -m ruff check app tests` | **All checks passed!** |
| `$env:DATABASE_URL='sqlite:///./fresh-final-audit-20261025.db'; .\.venv\Scripts\python.exe -m alembic -c alembic.ini upgrade head` | **Passed**; applied `0001_initial` to a fresh SQLite file. PostgreSQL was not tested. |
| `pnpm test` | **14 passed**, 1 test file, 1.81s. |
| `pnpm lint` | **Passed**, no findings. |
| `pnpm build` | **Passed**, Vite transformed 1,579 modules; CSS 10.82 kB and JS 196.98 kB before gzip. |
| `git diff --check` and `git diff --check main..HEAD` | **Passed** after removing extra trailing blank lines flagged in `backend/tests/test_admin.py` and `frontend/eslint.config.js`. |

The final-audit test-first red run was `pnpm exec vitest run src/App.test.jsx`: **13 passed, 1 failed** at the new check that an inventory error must not display the empty state. After the error/retry implementation, the same command reported **14 passed**. The exact red and green commit pair is recorded in `TDD_LOG.md`. A later final branch-range diff check found two extra blank lines at EOF; they were removed, and the branch-range check was rerun. No PostgreSQL service test or screen-reader/device compatibility matrix was run.

The latest completed run for the final-audit code and evidence commit at this point is [40180347110](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40180347110) on `c972e080709efe1d80c82f5c334effe52eb33e59`. It completed successfully: backend Ruff, pytest, and Alembic steps passed, and frontend test, lint, and production build steps passed. The immediately preceding checkpoint run `40179570241` on `fea340d32a758e95c9d01b8b184a6593d115a951` also passed both jobs. The report-only commit that records this run triggers a new workflow run; its outcome is reported separately after GitHub completes it.

## TDD evidence

See [TDD_LOG.md](TDD_LOG.md) for red test commits, observed failing outcomes, implementation commits, passing reruns and the concurrency-test scope. Tests and test result commits precede the corresponding implementation commits throughout the recorded branch history.

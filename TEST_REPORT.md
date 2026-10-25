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

PostgreSQL support is optional and configured, but it was not verified in this run. SQLite satisfies the persistent-database requirement.

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

Warnings in successful CI run: Starlette's `anyio.abc.BlockingPortal` deprecation; GitHub runner Node.js deprecations from `actions/checkout@v4`, `actions/setup-python@v5`, `actions/setup-node@v4`, and `pnpm/action-setup@v4`; Node deprecations `DEP0040` (`punycode`) and `DEP0169` (`url.parse`) from action tooling. These warnings were not suppressed. Run [40179570241](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40179570241) on commit `fea340d32a758e95c9d01b8b184a6593d115a951` completed successfully; both backend and frontend jobs passed. Later successful runs were [40181495523](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40181495523) on `5e35b27` and [40182187248](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40182187248) on `efe77dd42af1f8d7ce04633127ebc50a03d7c8b3`. Run `40182187248` is the latest successful remote run before this local audit push. PostgreSQL service availability was not established; PostgreSQL behavior remains unverified.

## Final-audit local rerun (2026-10-25)

This earlier rerun was performed before the later security, migration, and final frontend audit additions:

| Exact command | Observed result |
| --- | --- |
| `$env:PYTHONPATH='.'; .\.venv\Scripts\python.exe -m pytest -q` | **19 passed**, 1 upstream Starlette/AnyIO `BlockingPortal` deprecation warning, 4.85s. |
| `.\.venv\Scripts\python.exe -m ruff check app tests` | **All checks passed!** |
| `$env:DATABASE_URL='sqlite:///./fresh-final-audit-20261025-final2.db'; .\.venv\Scripts\python.exe -m alembic -c alembic.ini upgrade head` | **Passed** at that earlier point; applied `0001_initial` to a fresh SQLite file. The later final audit below supersedes this result and includes `0002_vehicle_constraints`. PostgreSQL was not tested. |
| `pnpm test` | **14 passed**, 1 test file, 2.00s. |
| `pnpm lint` | **Passed**, no findings. |
| `pnpm build` | **Passed**, Vite transformed 1,579 modules; CSS 10.82 kB and JS 196.98 kB before gzip. |
| `git diff --check` and `git diff --check main..HEAD` | **Passed** after removing extra trailing blank lines flagged in `backend/tests/test_admin.py` and `frontend/eslint.config.js`. |

The final-audit test-first red run was `pnpm exec vitest run src/App.test.jsx`: **13 passed, 1 failed** at the new check that an inventory error must not display the empty state. After the error/retry implementation, the same command reported **14 passed**. The exact red and green commit pair is recorded in `TDD_LOG.md`. A later final branch-range diff check found two extra blank lines at EOF; they were removed, and the branch-range check was rerun. No PostgreSQL service test or screen-reader/device compatibility matrix was run.

Commit [`5e35b27a58e0b5c4cf129e92bce4df6acf50a737`](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/commit/5e35b27a58e0b5c4cf129e92bce4df6acf50a737) on `submission/tdd-kata` passed GitHub Actions run [40181495523](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40181495523). Run [40182187248](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40182187248) on `efe77dd42af1f8d7ce04633127ebc50a03d7c8b3` is the latest successful remote run before this audit push; both jobs succeeded. The local audit commits require a post-push run. PostgreSQL was not tested.

## Final audit rerun (2026-10-25)

These checks were run on the local `submission/tdd-kata` worktree after the source, test, and screenshot audit changes. The test/report documentation was updated afterward; no application code changed after these checks.

| Exact command | Observed result |
| --- | --- |
| `$env:PYTHONPATH='.'; .\.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing` | **37 passed** in 24.71s; **94% coverage** (210 statements, 12 missed); one upstream Starlette `anyio.abc.BlockingPortal` deprecation warning. |
| `.\.venv\Scripts\ruff.exe check app tests` | **All checks passed!** |
| `$env:DATABASE_URL='sqlite:///./final-audit-20261025.db'; .\.venv\Scripts\alembic.exe -c alembic.ini upgrade head` | **Passed** on a newly created SQLite database; applied `0001_initial` and `0002_vehicle_constraints`. |
| `pnpm test` | **15 passed**, 1 test file, 2.50s. |
| `pnpm lint` | **Passed**, ESLint reported no findings. |
| `pnpm build` | **Passed**, Vite transformed 1,579 modules; CSS 11.63 kB and JS 197.37 kB before gzip. |
| `git diff --check` | **Passed**; Git printed only line-ending conversion notices for edited Markdown files. |

The refreshed `screenshots/admin-inventory.png` and `screenshots/customer-inventory.png` were captured with Playwright from the running local SPA and API; both images were opened and visually inspected. GitHub Actions run [40183837168](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40183837168) completed successfully on commit `15b61226b46e42470ae89bd8c62ea209944c4cf7`; frontend and backend jobs both passed, including tests, lint, build, and migrations. This run includes all application, test, and screenshot changes. This report/checklist update is documentation-only. No PostgreSQL service test or screen-reader/device compatibility matrix was run.

## TDD evidence

See [TDD_LOG.md](TDD_LOG.md) for red test commits, observed failing outcomes, implementation commits, passing reruns and the concurrency-test scope. Tests and test result commits precede the corresponding implementation commits throughout the recorded branch history.

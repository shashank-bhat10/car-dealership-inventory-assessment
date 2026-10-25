# Test and verification report

Run date: **2026-10-25** (local development session; Asia/Kolkata). These results are local observations, not GitHub Actions results.

## Latest verification: vehicle details, refactor, and database CI setup

These are the latest local results for this enhancement, observed on 2026-10-25. Earlier sections below are historical results from prior commits and are not the current check totals.

| Exact command | Observed result |
| --- | --- |
| `$env:PYTHONPATH='.'; .\.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing` (from `backend`) | **40 passed** in 28.21s; **94% coverage** (218 statements, 13 missed). One upstream Starlette `anyio.abc.BlockingPortal` deprecation warning. |
| `$env:PYTHONPATH='.'; .\.venv\Scripts\python.exe -m pytest -q tests/test_postgres_configuration.py` (from `backend`) | **1 passed** in 1.64s. This checks URL selection only and does not connect to PostgreSQL. |
| `$env:PYTHONPATH='.'; .\.venv\Scripts\ruff.exe check app tests` (from `backend`) | **All checks passed!** |
| `$file = Join-Path $env:TEMP ('dealership-fresh-' + [guid]::NewGuid().ToString('N') + '.db'); $env:DATABASE_URL = 'sqlite:///' + ($file -replace '\\','/'); .\.venv\Scripts\alembic.exe -c alembic.ini upgrade head` (from `backend`) | **Passed** on fresh SQLite file `C:\Users\Shashank\AppData\Local\Temp\dealership-fresh-d344dbdc96a14dcbba59aa23295098b8.db`; applied `0001_initial` and `0002_vehicle_constraints`. |
| `pnpm test` (from `frontend`) | **21 passed**, 1 Vitest file, 2.84s. |
| `pnpm test:responsive -- --screenshots` (from `frontend`) | **20/20** combinations passed: sign-in, customer inventory/detail, admin inventory/detail at 320×640, 375×812, 768×1024 and 1440×900. No horizontal overflow, unlabeled controls, controls below 24 CSS pixels, hidden keyboard focus, detail-header crowding or axe WCAG 2.1 A/AA violations. The run exercised Enter-to-submit and keyboard Enter back navigation. Genuine desktop and mobile detail screenshots were captured with deterministic API fixtures. |
| `pnpm lint` (from `frontend`) | **Passed**; ESLint reported no findings. |
| `pnpm build` (from `frontend`) | **Passed**; Vite transformed 1,590 modules; CSS 13.27 kB and JS 205.94 kB before gzip. |
| `git diff --check` | **Passed** on the working-tree changes before commit. |

The localhost port 5432 accepted a TCP connection, but an unauthenticated psycopg connection to database `postgres` failed with `fe_sendauth: no password supplied`; no local PostgreSQL test or migration is claimed. The new GitHub Actions PostgreSQL job is the server-backed verification. The accessibility checks are automated browser/axe checks and do not include a full screen-reader or physical-device audit. Package installation emitted the existing deprecated `eslint@9.19.0` and transitive `whatwg-encoding@3.1.1` warnings; these were not suppressed.

GitHub Actions run [40188152132](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40188152132) for commit `1a7ad529e1ce9f655efef47305dade1268c2f94d` completed successfully. Backend, PostgreSQL, and frontend jobs all passed. The PostgreSQL job ran `pytest -q tests/test_postgres_configuration.py tests/test_vehicles.py tests/test_purchases.py` (**15 passed**, one upstream Starlette/AnyIO warning), then `alembic upgrade head`; logs confirm `PostgresqlImpl` and revisions `0001_initial` and `0002_vehicle_constraints`. The frontend job passed `pnpm test`, `pnpm test:responsive`, `pnpm lint`, and `pnpm build`; backend Ruff, pytest, and Alembic passed. CI warnings observed: upstream Starlette/AnyIO deprecation; runner warning that Node.js 20 action runtimes are deprecated for checkout/setup actions; Node `DEP0040` (`punycode`) and `DEP0169` (`url.parse`) action-tooling deprecations; and PostgreSQL `initdb`'s trust-authentication warning for its temporary local service. Database constraint-error log lines were expected from tests that verify invalid rows are rejected. The report-only follow-up commit receives its own CI run; the final branch-tip status is reported at completion.

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

This historical run predates the PostgreSQL CI job described in the latest verification section. SQLite satisfies the persistent-database requirement.

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

Warnings in this historical CI run: Starlette's `anyio.abc.BlockingPortal` deprecation; GitHub runner Node.js deprecations from `actions/checkout@v4`, `actions/setup-python@v5`, `actions/setup-node@v4`, and `pnpm/action-setup@v4`; Node deprecations `DEP0040` (`punycode`) and `DEP0169` (`url.parse`) from action tooling. These warnings were not suppressed. Run [40179570241](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40179570241) on commit `fea340d32a758e95c9d01b8b184a6593d115a951` completed successfully; both backend and frontend jobs passed. Later successful runs were [40181495523](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40181495523) on `5e35b27` and [40182187248](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40182187248) on `efe77dd42af1f8d7ce04633127ebc50a03d7c8b3`. These are historical runs superseded by the latest CI result at the top. PostgreSQL service verification was added and observed in run `40188152132` above.

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

Commit [`5e35b27a58e0b5c4cf129e92bce4df6acf50a737`](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/commit/5e35b27a58e0b5c4cf129e92bce4df6acf50a737) on `submission/tdd-kata` passed GitHub Actions run [40181495523](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40181495523). Run [40182187248](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40182187248) on `efe77dd42af1f8d7ce04633127ebc50a03d7c8b3` was the latest successful remote run at that historical stage; both jobs succeeded. The later PostgreSQL CI verification is recorded in the current section above.

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

The earlier refresh of `screenshots/admin-inventory.png` and `screenshots/customer-inventory.png` was captured from the local SPA/API and visually inspected. GitHub Actions run [40183927021](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40183927021) passed on commit `e301f754760dff678c51c67601208e86354ef85c`; this predates the responsive audit and its new browser job. The responsive audit and its screenshots are reported below. No PostgreSQL service test or screen-reader/device compatibility matrix was run.

## Responsive and accessibility audit (2026-10-25)

The audit uses Playwright 1.64.1 and axe-core 4.14.0. It starts a local Vite server and mocks deterministic authentication and inventory API responses; it exercises the SPA controls, not the backend integration. The script is repeatable with `pnpm test:responsive` from `frontend`. Screenshot capture is enabled with `pnpm test:responsive -- --screenshots` and refreshes the three PNGs in `screenshots/` at 1440×900.

| Exact command | Observed result |
| --- | --- |
| `pnpm test:responsive` before UI fixes; the failing audit is preserved in test commit `faf11ada215da3db47568baf98b235a183ea9f87` | Exit code 1; all 12 screen/viewport combinations ran and reported **35 findings**: horizontal overflow at narrow inventory widths, controls below 24 CSS pixels, axe-core color contrast violations, and a brand link accessible-name mismatch. |
| `pnpm test:responsive` after UI fixes, on implementation commit `aa7913259888ade06ff3469f64f2a940a65320e8` | **Passed** all 12 combinations: sign-in, customer inventory, and admin inventory at 320×640, 375×812, 768×1024, and 1440×900. Checks found no horizontal overflow; input/button/link controls had names and at least 24×24 CSS-pixel targets; first keyboard Tab focus was visibly outlined; axe-core found no violations tagged WCAG 2.1 A/AA. The script completed customer search and purchase plus admin add/edit/restock/delete flows in each viewport. |
| `pnpm test:responsive -- --screenshots` | **Passed** all 12 combinations and captured the refreshed sign-in, customer, and administrator screenshots at 1440×900. The images were opened and visually inspected. |
| `pnpm test` | **15 passed**, 1 Vitest file, 2.49s. |
| `pnpm lint` | **Passed** after extending ESLint's file match to include the Node `.mjs` audit script. An earlier run failed with 21 `no-undef` findings because `.mjs` did not match the configured JavaScript files. |
| `pnpm build` | **Passed**; Vite transformed 1,579 modules; CSS 12.08 kB and JS 197.34 kB before gzip. |
| `$env:PYTHONPATH='.'; .\.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing` | **37 passed** in 25.55s; **94% coverage** (210 statements, 12 missed); one upstream Starlette `anyio.abc.BlockingPortal` deprecation warning. |
| `.\.venv\Scripts\ruff.exe check app tests` | **All checks passed!** |
| `$env:DATABASE_URL='sqlite:///./final-responsive-audit-20261025.db'; .\.venv\Scripts\alembic.exe -c alembic.ini upgrade head` | **Passed** on a fresh SQLite database; applied `0001_initial` and `0002_vehicle_constraints`. |
| `git diff --check` | **Passed** after the final edits. |

The colors and target sizes were adjusted based on the observed axe/viewport findings, the topbar now wraps at narrow widths, and the brand link relies on its visible text for its accessible name. The audit covers these browser states and viewport sizes only; it is not a full screen-reader audit or a physical-device compatibility test. The Browser audit package installation reported deprecated `eslint@9.19.0` and transitive `whatwg-encoding@3.1.1`; those warnings were left visible and were not changed as part of this task. The screenshots use deterministic mocked API responses and are labeled accordingly in the README.

The backend review found no worthwhile refactor: the shared filter query is already extracted and conditional SQL updates already guard purchase/restock boundaries. No backend source or history was changed. The decision and evidence are recorded in `TDD_LOG.md`.

The ChatGPT prompt-planning share URL in `PROMPTS.md` was opened in a fresh headless Chromium context without stored sign-in state. It returned HTTP 200 and displayed the shared-conversation notice and conversation text. The Codex conversation link was previously confirmed by the user to open without signing in.

The original merge commit `c80cabe5651c6204f35789325cc7adc046822aa8` was replaced by `0775eb96557dca53ee488c2e092a8d2d5bcf1028` to add `Co-authored-by: OpenAI Codex <ai@users.noreply.github.com>`. The replacement retains the original tree and parent order. Its four direct descendants were replayed with the same commit messages and changes. The original CI run [40185723032](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40185723032) passed both backend and frontend jobs on the same project tree. This history correction predates the current enhancement.

## Final checks after the authentication refactor (2026-10-25)

| Exact command | Observed result |
| --- | --- |
| `$env:PYTHONPATH='.'; .\.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing` | **37 passed** in 25.51s; **94% coverage** (212 statements, 13 missed); one upstream Starlette `anyio.abc.BlockingPortal` deprecation warning. |
| `.\.venv\Scripts\ruff.exe check app tests` | **All checks passed!** |
| `$env:DATABASE_URL='sqlite:///./final-user-audit-20261025.db'; .\.venv\Scripts\alembic.exe -c alembic.ini upgrade head` | **Passed** on a fresh SQLite database; applied `0001_initial` and `0002_vehicle_constraints`. |
| `pnpm test` | **15 passed**, 1 test file, 2.60s. |
| `pnpm test:responsive -- --screenshots` | **Passed** all 12 screen/viewport combinations at 320×640, 375×812, 768×1024, and 1440×900. No horizontal overflow, unlabeled controls, undersized targets, keyboard-focus findings, or axe-core WCAG 2.1 A/AA violations. Captured the desktop set and `screenshots/customer-inventory-mobile.png` at 375×812; visually inspected the mobile screenshot. |
| `pnpm lint` | **Passed**, ESLint reported no findings. |
| `pnpm build` | **Passed**; Vite transformed 1,579 modules; CSS 12.08 kB and JS 197.34 kB before gzip. |
| `git diff --check` | **Passed**. |

The refactor-specific before/after test command and results are recorded in `TDD_LOG.md`. GitHub Actions run [40186263923](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40186263923) passed on commit `87b73ab1c16fbf6fbf16c2f95f24f3d7594625fc`; both backend and frontend jobs succeeded, including the responsive browser/axe matrix. The mobile screenshot shows the running SPA with deterministic mock API data; this is not a live-backend screenshot or a screen-reader audit.

## TDD evidence

See [TDD_LOG.md](TDD_LOG.md) for red test commits, observed failing outcomes, implementation commits, passing reruns and the concurrency-test scope. Tests and test result commits precede the corresponding implementation commits throughout the recorded branch history.

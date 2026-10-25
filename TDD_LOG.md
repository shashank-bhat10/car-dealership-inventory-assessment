# TDD log

The red failures and green reruns listed here were observed during this branch's work on 2026-10-25. Commit IDs point to actual test-first and implementation commits. No database or test outcomes are inferred from code alone.

| Behavior | Red test commit and observed result | Green implementation commit and observed result |
| --- | --- | --- |
| Registration validation and password storage | `87a72e8`; `python -m pytest -q tests/test_registration.py`: **4 failed**, all requests were 404; Starlette/AnyIO deprecation warning | `32f1741`; combined auth tests: **4 passed**, same upstream warning |
| JWT login success and rejection | `7e7130f`; `python -m pytest -q tests/test_login.py`: **2 failed**, login endpoint 404 | `0398cdd`; auth suite: **6 passed**, same upstream warning |
| Vehicle create/list/update/search and validation | `a75c9d2`; `python -m pytest -q tests/test_vehicles.py`: **3 failed, 1 passed**, absent routes returned 404 | `701f98f`; combined API suite: **10 passed**, same upstream warning |
| Admin delete/restock | `d5f9c4f`; admin tests: **3 failed**, delete 405 and restock 404 | `d60f963`; combined API suite: **14 passed**, same upstream warning |
| Restock stock ceiling | `8bcea5b`; targeted test: **1 failed**, endpoint 404 instead of expected 422 | `d60f963`; combined API suite: **14 passed**, same upstream warning |
| Atomic purchase and concurrent stock boundary | `0cd0813`; purchase tests: **2 failed**, endpoint 404 | `95a8d50`; focused suite **2 passed**. Eight concurrent SQLite HTTP requests against quantity 3 yielded three HTTP 200 and five HTTP 409 responses; no negative stock was observed in this test setup. This does not establish behavior across every database/driver or deployment topology. |
| Fresh database Alembic migration | `21a7530`; migration test: **1 failed**, missing Alembic configuration | `30c7bf8`; migration test: **1 passed**, SQLite schema and `0001_initial` revision present |
| Login and registration form | `a6c9da3`; `pnpm test`: **2 failed**, account controls absent | `5f1c336`; `pnpm test`: **4 passed**, `pnpm lint` passed, `pnpm build` passed (1,579 transformed modules). The initial test run exposed unsupported matchers; they were replaced with native DOM assertions before the pass. |
| Registration/login network flow and rejected login state | `9e8b95e`; `pnpm test`: **4 failed**, account interactions absent | `5f1c336`; `pnpm test`: **4 passed**, lint/build passed as above |
| Authenticated inventory data | `ff9df3d`; focused Vitest run: **1 failed, 4 skipped**, vehicle title absent | `fb751cc`; focused Vitest **1 passed, 4 skipped**, bearer token sent and vehicle data rendered |
| Login admin-role metadata | `24891f9`; `python -m pytest -q tests/test_login.py`: **1 failed, 2 passed**, missing `is_admin` field; one upstream deprecation warning | `6b5134c`; focused login suite: **3 passed**, one upstream deprecation warning |
| Search controls and zero-stock purchase disabled state | `edc53ec`; focused Vitest: **2 failed, 5 skipped**, search/purchase controls absent | `fb751cc`; focused Vitest: **2 passed, 5 skipped**; lint and build passed |
| Admin UI control visibility | `425aba4`; focused Vitest: **1 failed, 7 skipped**, add form absent | `fb751cc`; full frontend suite: **8 passed** after correcting an old two-request assertion to check the new authenticated inventory fetch and bearer header in test commit `4c6040e` |
| Browser API cross-origin access | `c87cff2`; CORS preflight test: **1 failed**, HTTP 405 and missing access-control headers | `cbee513`; focused test: **1 passed**, then Ruff and full backend suite: **19 passed**, one upstream warning |

The project has a test-first red/green cycle for each implemented functional behavior. The lint-driven unused-import cleanup is a separate behavior-preserving refactor. No separate refactor was made where it offered no useful change; corrections to assertions were committed as test changes. Every AI-assisted commit includes the assessment co-author trailer.

## Visual refinement and lint correction

The initial full-page browser captures exposed that the inventory-specific styles were missing: forms and cards appeared as unstructured rows. Responsive card, filter and admin form styles were added after that real screenshot inspection. The final `pnpm test` (**8 passed**), `pnpm lint` and `pnpm build` were rerun successfully after the CSS change. Ruff had first reported two unused imports; they were removed and final `ruff check app tests` passed. These are recorded as corrective/refactoring improvements; the functional checks remained passing.

## CI environment correction

GitHub Actions run `40179145568` on commit `ce37690` produced a real red result: Ruff and the frontend job passed, but backend test collection failed in six test modules because `httpx` was absent from the declared development requirements. Coverage emitted `no-data-collected` as a consequence. Added pinned `httpx` as a test dependency; this is a configuration fix for the already test-first API suite, and a new CI run will verify it in a clean runner.

After adding `httpx==0.28.1`, the declared dependencies were installed into a clean project `.venv`; `PYTHONPATH=. pytest -q` then reported **19 passed, 1 upstream warning**, `ruff check app tests` passed, and Alembic completed against the configured check database. GitHub Actions run `40179376846` verified the dependency but failed test collection again because `app` was not importable from the runner's `sys.path`; the frontend job and Ruff passed. Set job-level `PYTHONPATH: .` for the next CI run.

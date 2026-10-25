# TDD log

- `d08b956` — `test: add failing authentication and access acceptance tests`: the first test commit was created before the backend implementation. The first observed run during the build failed collection because `python-multipart` was missing; a later collection exposed invalid FastAPI query metadata. These actual failures and fixes are recorded in `TEST_REPORT.md`.
- `c3ec0d86dddd8c14b7de1d8af09636968d8cba9d` — `feat: build full-stack dealership inventory system`: implementation, expanded backend tests (including concurrent purchases), frontend tests, migrations, CI, and docs were committed with the required AI co-author trailer.
- Final verification after the CORS correction: backend tests 7 passed (one upstream Starlette warning), Ruff passed, frontend tests 2 passed, ESLint passed, Vite production build passed, and a fresh SQLite migration reached `0001_initial (head)`.

The history demonstrates an initial test commit before the main implementation and captures real collection failures, but the first test run occurred after some backend code had already been written. The tests were not committed as separate red commits for every behavior. This build therefore documents partial compliance with the assessment's strict per-behavior red-green-refactor sequence instead of claiming a complete test-first history.

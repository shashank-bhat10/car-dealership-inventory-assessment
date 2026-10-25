# Assessment requirements checklist

Status reflects checks actually run in this build; evidence paths are repository relative.

| Requirement | Evidence | Status |
| --- | --- | --- |
| FastAPI REST API | `backend/app/main.py` | Verified |
| Persistent SQLite and migrations | `backend/app/database.py`, Alembic revisions `0001_initial` and `0002_vehicle_constraints`, fresh-migration test | Verified |
| Optional PostgreSQL configuration | SQLAlchemy URL and psycopg dependency; not tested. SQLite meets the persistent-database requirement. | Partial (optional configuration only) |
| Registration and login | `backend/app/main.py`, `backend/tests/test_registration.py`, `test_login.py` | Verified |
| Safe administrator provisioning | `backend/app/admin_cli.py`; public registration always assigns `is_admin=False`; CLI create/promote and password behavior tests | Verified |
| Password hashing | pwdlib Argon2 integration and registration tests | Verified |
| JWT authentication and secret configuration | signed HS256 expiry, `backend/app/security.py`, tests for missing/default/weak/placeholder/valid secrets and explicit local development | Verified |
| Protected vehicle list/create/search/update | routes and `backend/tests/test_vehicles.py`, including anonymous requests to each protected vehicle route | Verified |
| Search filters make/model/category/min/max price | individual API filter tests, combined range test, and SPA filter controls | Verified |
| Admin-only delete/restock | admin dependency and `backend/tests/test_admin.py` | Verified |
| Protected safe purchasing / no oversell | conditional stock update and `backend/tests/test_purchases.py` | Verified |
| Unique identifiers and field validation | SQL primary key, Pydantic constraints, API validation tests, and database check constraints | Verified |
| Database-enforced positive price and bounded stock | model `CheckConstraint`s, forward Alembic revision `0002_vehicle_constraints`, direct SQLite integrity tests | Verified |
| React registration/login and inventory UI | `frontend/src/App.jsx`, `frontend/src/App.test.jsx` | Verified |
| Purchase disabled at zero stock | dashboard control and UI test | Verified |
| Admin add/update/delete/restock controls | dashboard workflows and `frontend/src/App.test.jsx` POST add, PUT edit, DELETE, POST restock request/outcome tests | Verified |
| Tailwind use in the SPA | `@tailwindcss/vite`, Tailwind import, layout/form/button utilities in `frontend/src/App.jsx`, class test and production build | Verified |
| Responsive/accessibility/loading/empty/error states | `frontend/scripts/responsive-audit.mjs` checks sign-in, customer, and admin screens at four requested viewports for overflow, named controls, 24 CSS pixel target size, visible keyboard focus, and axe-core WCAG 2.1 A/AA violations; responsive rules and retry-state tests | Verified for the automated checks; no full screen-reader audit was performed |
| SPA/API browser origin access | configurable `FRONTEND_ORIGIN` CORS middleware and `backend/tests/test_cors.py` | Verified |
| Backend and frontend tests | test suites in `backend/tests` and `frontend/src` | Verified |
| CI tests, lint and production build | `.github/workflows/ci.yml` runs backend checks and frontend unit, Playwright/axe, lint, and production build steps; latest previously completed run [40183927021](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40183927021) passed on `e301f754760dff678c51c67601208e86354ef85c`, before the browser-audit CI step was added | Partial (local browser audit passes; CI for the new step will run after push) |
| Red–Green–Refactor commit evidence | `TDD_LOG.md`, actual branch history, separate failing-test and implementation commits for final security, database, and Tailwind fixes | Verified; earlier history caveats are recorded in `TDD_LOG.md` |
| Screenshots from running application | `screenshots/sign-in.png`, `screenshots/customer-inventory.png`, `screenshots/admin-inventory.png`; captured from the running SPA with deterministic API fixtures by the repeatable Playwright audit and visually inspected | Verified |
| Genuine prompt records | `PROMPTS.md` contains the supplied Codex build conversation link. No original ChatGPT prompt-planning record was supplied. | Partial (Codex record is genuine; the ChatGPT record remains unavailable) |

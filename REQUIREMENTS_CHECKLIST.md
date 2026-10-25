# Assessment requirements checklist

Status reflects checks actually run in this build; evidence paths are repository relative.

| Requirement | Evidence | Status |
| --- | --- | --- |
| FastAPI REST API | `backend/app/main.py` | Verified |
| Persistent SQLite and migrations | `backend/app/database.py`, `backend/alembic/`, migration test | Verified |
| Optional PostgreSQL configuration | SQLAlchemy URL and psycopg dependency; not tested. SQLite meets the persistent-database requirement. | Partial (optional configuration only) |
| Registration and login | `backend/app/main.py`, `backend/tests/test_registration.py`, `test_login.py` | Verified |
| Password hashing | pwdlib Argon2 integration and registration tests | Verified |
| JWT authentication | signed HS256 expiry and authenticated dependencies | Verified |
| Protected vehicle list/create/search/update | routes and `backend/tests/test_vehicles.py` | Verified |
| Search filters make/model/category/min/max price | API query tests and SPA filter controls | Verified |
| Admin-only delete/restock | admin dependency and `backend/tests/test_admin.py` | Verified |
| Protected safe purchasing / no oversell | conditional stock update and `backend/tests/test_purchase.py` | Verified |
| Unique identifiers and field validation | SQL primary key, Pydantic constraints, API validation tests | Verified |
| React registration/login and inventory UI | `frontend/src/App.jsx`, `frontend/src/App.test.jsx` | Verified |
| Purchase disabled at zero stock | dashboard control and UI test | Verified |
| Admin add/update/delete/restock controls | dashboard workflows and `frontend/src/App.test.jsx` POST add, PUT edit, DELETE, POST restock request/outcome tests | Verified |
| Responsive/accessibility/loading/empty/error states | `frontend/src/style.css`, semantic labels/roles and retry flow in `App.jsx`; loading, empty, error/retry tests in `App.test.jsx` | Partial (responsive CSS, labels, focus states, and states are implemented; no automated screen-reader or device matrix) |
| SPA/API browser origin access | configurable `FRONTEND_ORIGIN` CORS middleware and `backend/tests/test_cors.py` | Verified |
| Backend and frontend tests | test suites in `backend/tests` and `frontend/src` | Verified |
| CI tests, lint and production build | `.github/workflows/ci.yml`, GitHub Actions run `40181495523` on `5e35b27a58e0b5c4cf129e92bce4df6acf50a737`; backend and frontend jobs passed | Verified |
| Red–Green–Refactor commit evidence | `TDD_LOG.md`, actual branch history | Verified (test-first red/green commits and a separate lint-driven refactor; no unhelpful refactor commits were added) |
| Screenshots from running application | `screenshots/customer-inventory.png`, `screenshots/admin-inventory.png` | Verified (captured from running local SPA/API with Playwright and visually inspected) |
| Genuine prompt record | `PROMPTS.md` contains the user-supplied Codex build and verification conversation link, confirmed by the user to open without sign-in | Verified |

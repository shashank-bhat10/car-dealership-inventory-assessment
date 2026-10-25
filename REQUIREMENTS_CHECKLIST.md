# Assessment requirements checklist

Status reflects checks actually run in this build; evidence paths are repository relative.

| Requirement | Evidence | Status |
| --- | --- | --- |
| FastAPI REST API | `backend/app/main.py` | Verified |
| Persistent SQLite and migrations | `backend/app/database.py`, Alembic revisions `0001_initial` and `0002_vehicle_constraints`, fresh-migration test | Verified |
| PostgreSQL CI verification | `.github/workflows/ci.yml`; run [40188152132](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40188152132) passed its PostgreSQL 16 service job, including **15 API/purchase/configuration tests** and `alembic upgrade head` applying both revisions. Local service authentication is unavailable. | Verified in CI; no local server-backed check |
| Registration and login | `backend/app/main.py`, `backend/tests/test_registration.py`, `test_login.py` | Verified |
| Safe administrator provisioning | `backend/app/admin_cli.py`; public registration always assigns `is_admin=False`; CLI create/promote and password behavior tests | Verified |
| Password hashing | pwdlib Argon2 integration and registration tests | Verified |
| JWT authentication and secret configuration | signed HS256 expiry, `backend/app/security.py`, tests for missing/default/weak/placeholder/valid secrets and explicit local development | Verified |
| Protected vehicle list/create/search/update | routes and `backend/tests/test_vehicles.py`, including anonymous requests to each protected vehicle route | Verified |
| Protected single-vehicle GET and shareable detail route | `GET /api/vehicles/{id}` with 401/404 tests; `/vehicles/:id` page displays all vehicle fields and links back to inventory | Verified |
| Search filters make/model/category/min/max price | individual API filter tests, combined range test, and SPA filter controls | Verified |
| Admin-only delete/restock | admin dependency and `backend/tests/test_admin.py` | Verified |
| Protected safe purchasing / no oversell | conditional stock update and `backend/tests/test_purchases.py` | Verified |
| Unique identifiers and field validation | SQL primary key, Pydantic constraints, API validation tests, and database check constraints | Verified |
| Database-enforced positive price and bounded stock | model `CheckConstraint`s, forward Alembic revision `0002_vehicle_constraints`, direct SQLite integrity tests | Verified |
| React registration/login and inventory UI | `frontend/src/components/AuthScreen.jsx`, `InventoryScreen.jsx`, `VehicleCard.jsx`, `VehicleDetails.jsx`, `AdminVehicleForm.jsx`; `frontend/src/App.test.jsx` | Verified |
| Purchase disabled at zero stock | dashboard control and UI test | Verified |
| Admin add/update/delete/restock controls | dashboard workflows and `frontend/src/App.test.jsx` POST add, PUT edit, DELETE, POST restock request/outcome tests | Verified |
| Tailwind use in the SPA | `@tailwindcss/vite`, Tailwind import, layout/form/button utilities in `frontend/src/App.jsx`, class test and production build | Verified |
| Responsive/accessibility/loading/empty/error states | `frontend/scripts/responsive-audit.mjs` checks sign-in, customer inventory/detail and admin inventory/detail at four requested viewports for overflow, named controls, 24 CSS-pixel targets, keyboard Enter navigation, visible focus, detail header spacing, and axe-core WCAG 2.1 A/AA violations; responsive and retry-state tests | Verified for automated browser checks; no full screen-reader or physical-device audit was performed |
| SPA/API browser origin access | configurable `FRONTEND_ORIGIN` CORS middleware and `backend/tests/test_cors.py` | Verified |
| Backend and frontend tests | test suites in `backend/tests` and `frontend/src` | Verified |
| CI tests, lint, production build, PostgreSQL and migrations | `.github/workflows/ci.yml`; run [40188152132](https://github.com/shashank-bhat10/car-dealership-inventory-assessment/actions/runs/40188152132) on `1a7ad529e1ce9f655efef47305dade1268c2f94d` passed backend, PostgreSQL and frontend jobs, including Playwright/axe. | Verified |
| Red–Green–Refactor commit evidence | `TDD_LOG.md`, actual branch history, separate failing-test (`faf11ad`) and implementation (`aa79132`) commits for the browser findings; replacement merge commit `0775eb9` carries the established Codex trailer and preserves the original merge tree and parent order | Verified |
| Screenshots from running application | `screenshots/sign-in.png`, `screenshots/customer-inventory.png`, `screenshots/customer-inventory-mobile.png`, `screenshots/admin-inventory.png`, `screenshots/vehicle-details.png`, `screenshots/vehicle-details-mobile.png`; captured from the running SPA with deterministic API fixtures by the repeatable Playwright audit; mobile details image visually inspected | Verified |
| Genuine prompt records | `PROMPTS.md` contains the Codex build link (user-confirmed anonymous access) and ChatGPT prompt-planning share link (opened anonymously in a fresh Chromium context during this audit) | Verified |

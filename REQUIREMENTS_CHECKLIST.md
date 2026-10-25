# Requirements checklist

**Verified** means implementation and listed checks passed. **Partial** means implementation exists but evidence or coverage is incomplete. **Unverified** means not checked here.

| Requirement | Evidence | Status |
| --- | --- | --- |
| FastAPI and persistent relational DB | `backend/app/main.py`, SQLite default | Verified |
| Alembic migrations | `backend/alembic/versions/0001_initial.py`, fresh migration | Verified |
| Register/login; Argon2 hash; JWT | Auth routes and backend tests | Verified |
| Protected create/list/search/update | API dependencies and acceptance tests | Verified |
| Search make/model/category/price bounds | Search endpoint; make/price exercised | Partial (not every filter independently asserted) |
| Admin delete/restock | Admin dependency and role tests | Verified |
| Protected atomic purchase; no zero-stock purchase | Conditional SQL update and boundary/concurrency tests | Verified on SQLite test setup |
| Unique IDs and vehicle validation | Integer primary key and Pydantic schemas | Verified |
| React login/register, dashboard, filters | `frontend/src/App.jsx` | Partial (UI tests cover entry/mode and sold-out state; not every flow) |
| Zero-stock purchase disabled | `frontend/src/App.test.jsx` | Verified |
| Admin add/update/delete/restock UI | `frontend/src/App.jsx` admin controls | Partial (API permissions tested; browser admin flow not tested) |
| Responsive design, a11y labels/focus/statuses | `frontend/src/style.css` and JSX labels/roles | Partial (source checked; no browser accessibility audit) |
| CI tests, lint, build | `.github/workflows/checks.yml` | Partial (workflow authored, no remote run observed) |
| Public GitHub repo and push | Publication result in final response | Unverified until attempted |
| Genuine runtime screenshots | Captured inline in the build session; no local file was exposed by the browser screenshot interface | Partial (visible capture exists in conversation, file delivery remains unavailable) |
| Raw prompts/share link | `PROMPTS.md` | Partial if sharing unavailable; manual export remains |
| PostgreSQL setup | psycopg and database URL | Partial (PostgreSQL 17 service is running and port 5432 is open, but the local `postgres` connection rejects without a password) |
| README, test report, TDD record | Root documentation | Verified |

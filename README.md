# Motorhaus Inventory

An inventory and purchasing application for a small car dealership. The React single page app uses a FastAPI JSON API, SQLAlchemy persistence, Alembic migrations, hashed account passwords, and signed bearer tokens.

## Screenshots

Captured from the running app on the local development server:

- [Customer inventory](screenshots/customer-inventory.png)
- [Administrator inventory](screenshots/admin-inventory.png)

## Architecture

- `backend/app`: FastAPI routes, SQLAlchemy models, validation, authentication and settings.
- `backend/alembic`: versioned schema migrations.
- `backend/tests`: API, permission, validation, stock and migration tests.
- `frontend/src`: React SPA, accessible forms, inventory search and admin workflows.
- `.github/workflows/ci.yml`: backend and frontend checks on pushes and pull requests.

Purchases use a single conditional SQL `UPDATE` (`quantity > 0`) so competing requests cannot decrement below zero. Restock also uses a conditional update and stock ceiling. SQLite is the local default; PostgreSQL is supported through SQLAlchemy and the included psycopg driver.

## Run locally

Requirements: Python 3.12+, Node.js 22+, pnpm 9+.

Backend (PowerShell):

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt -r requirements-dev.txt
$env:DATABASE_URL = "sqlite:///./inventory.db"
$env:SECRET_KEY = "replace-with-a-long-random-secret"
$env:BOOTSTRAP_ADMIN_EMAIL = "admin@example.com"
$env:FRONTEND_ORIGIN = "http://localhost:5173"
alembic upgrade head
uvicorn app.main:app --reload
```

Register using the configured bootstrap admin email to create the first administrator. Use another email for customer access. Set `DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/dealership` for PostgreSQL. The default SQLite URL persists in `backend/inventory.db`.

`FRONTEND_ORIGIN` configures the additional permitted browser origin; localhost and loopback Vite origins are included for development. Keep the secret key private and set `ENVIRONMENT=production` when deploying so a missing default secret fails closed.

Frontend (a second terminal):

```powershell
cd frontend
pnpm install
pnpm dev
```

Vite proxies `/api` to `http://127.0.0.1:8000` during local development. To use another API origin, set `VITE_API_URL` before starting/building Vite. The app is served at `http://localhost:5173`; API docs are at `http://127.0.0.1:8000/docs`.

## API overview

All routes are under `/api`. Registration is public; all inventory reads/writes and purchases require `Authorization: Bearer <token>`. Delete and restock require the administrator role.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Register email/password |
| POST | `/auth/login` | Public | OAuth form login; returns JWT and role flag |
| GET | `/vehicles` | Authenticated | List or filter by make, model, category, min_price, max_price |
| POST | `/vehicles` | Authenticated | Add vehicle |
| PUT | `/vehicles/{id}` | Authenticated | Update vehicle |
| DELETE | `/vehicles/{id}` | Admin | Remove vehicle |
| POST | `/vehicles/{id}/restock` | Admin | Add stock |
| POST | `/vehicles/{id}/purchase` | Authenticated | Decrement one available unit safely |

Vehicle input validates non-empty make/model/category, positive price, integer quantity, bounded field sizes and unique database IDs. Out-of-stock purchases return HTTP 409; missing items return 404.

## Tests and evidence

Run backend checks from `backend`: `$env:PYTHONPATH='.'; python -m pytest -q`, `ruff check app tests`, and `alembic upgrade head`. Run frontend checks from `frontend`: `pnpm test`, `pnpm lint`, `pnpm build`. Exact observed commands, results, warnings and currently unverified checks are in [TEST_REPORT.md](TEST_REPORT.md). Requirement evidence is mapped in [REQUIREMENTS_CHECKLIST.md](REQUIREMENTS_CHECKLIST.md). Actual test-first commit IDs and red/green outcomes are in [TDD_LOG.md](TDD_LOG.md).

## My AI Usage

ChatGPT helped prepare the implementation prompt. OpenAI Codex in the desktop app helped implement and test the project, including its API, migration, SPA, backend and frontend tests, CI, and evidence documents. Codex also ran the recorded checks and inspected the Git state. The tools used included PowerShell shell commands and patch editing, the workspace Python and pnpm runtimes, Playwright for genuine browser screenshots, the document-reading workflow for the supplied assessment, Git, and the GitHub connector to inspect repository metadata and Actions runs. `PROMPTS.md` contains the supplied link to the Codex build and verification conversation. The Git commit trailers identify AI-assisted commits as `OpenAI Codex <ai@users.noreply.github.com>`.

**Personal reflection: add your own account of what you personally reviewed, tested, or learned before submission.** No personal experience is claimed here.

# Car Dealership Inventory System

A full-stack dealership inventory application. FastAPI and SQLAlchemy 2 serve a persistent SQLite database by default, with Alembic migrations and PostgreSQL URL support. The React single-page application uses HTML5, CSS3, and Tailwind CSS v4.

## Screenshots

The running app was opened and inspected in the in-app browser at `http://127.0.0.1:5173/`; a real dashboard screenshot was captured during the build. The browser screenshot surfaced inline in the task, but the available capture API did not return a local image path to place under `screenshots/`.

## Architecture

- `backend/app/main.py`: API endpoints, SQLAlchemy models, validation, JWT authentication, roles, and atomic stock changes.
- `backend/alembic/`: versioned schema migrations. Apply migrations before starting the API.
- `frontend/src/`: React registration/login, inventory filters, purchases, and admin controls.
- `.github/workflows/checks.yml`: CI checks.

Purchases use a conditional database `UPDATE` with `quantity > 0` to avoid read-then-write overselling. The parallel SQLite check is documented in `TEST_REPORT.md`; it does not prove all database deployment behavior.

## Requirements

Python 3.12+, Node.js 22+, pnpm 11+, and Git. PostgreSQL may be selected through `DATABASE_URL`, for example `postgresql+psycopg://user:password@localhost:5432/dealership`.

## Local setup

Backend (PowerShell):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:DATABASE_URL = "sqlite:///./inventory.db"
$env:SECRET_KEY = "replace-with-a-long-random-secret"
$env:BOOTSTRAP_ADMIN_EMAIL = "admin@example.com" # optional
alembic upgrade head
uvicorn app.main:app --reload
```

Frontend in another terminal:

```powershell
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:5173`; API docs are at `http://localhost:8000/docs`. Vite proxies `/api` to port 8000. Set `VITE_API_URL` for a separately hosted API. Register with the bootstrap email to receive the administrator role. Set `ENVIRONMENT=production` and a strong `SECRET_KEY` outside development.

## Configuration

`DATABASE_URL` defaults to `sqlite:///./inventory.db`; `SECRET_KEY` defaults to a local-development-only value; `ENVIRONMENT=production` rejects that key; `BOOTSTRAP_ADMIN_EMAIL` assigns the admin role on matching registration; `VITE_API_URL` defaults to `http://localhost:8000`.

## API overview

Register with `POST /api/auth/register` JSON `{ "email", "password" }` (password length 10–128). Login with `POST /api/auth/login` OAuth2 form fields `username`, `password`. Use the returned bearer JWT for all vehicle routes.

- `GET /api/vehicles` and `/api/vehicles/search`: make, model, category, min_price, max_price filters.
- `POST /api/vehicles`, `PUT /api/vehicles/{id}`: authenticated vehicle create/update.
- `DELETE /api/vehicles/{id}`, `POST /api/vehicles/{id}/restock`: admin only.
- `POST /api/vehicles/{id}/purchase`: atomic stock decrement; `409` when empty, `404` when missing.
- `GET /api/health`: liveness endpoint.

IDs are database-generated unique integers. Text fields must be nonblank, price positive and at most two decimal places, quantity a nonnegative integer.

## Verification

Exact commands, results, warnings, and unverified checks are in `TEST_REPORT.md`. Requirement mapping is in `REQUIREMENTS_CHECKLIST.md`; observed commit sequence is in `TDD_LOG.md`.

## My AI Usage

OpenAI Codex (GPT-6) assisted in reading the supplied assessment, implementing the API and SPA, writing tests, diagnosing test/build/lint/migration issues, and drafting this documentation. The work was created in a new directory and repository without inspecting another repository. AI-assisted commits carry `Co-authored-by: OpenAI Codex <ai@users.noreply.github.com>`.

Observed workflow impact: Codex sped up implementation and helped identify concrete issues through executed checks, including FastAPI query metadata, a missing form dependency, frontend JSX lint configuration, and stock decrement behavior under parallel requests. Test results are recorded in `TEST_REPORT.md`. This describes observed tool use; any personal statement about what the submitter learned or personally reviewed still requires their review and personalization.

The assessment requests unedited chat logs or genuine share links. `PROMPTS.md` will contain a real share link if native sharing is available; otherwise it states the exact manual export step. No conversation has been invented or reconstructed.

Conversation share link: https://chatgpt.com/s/cx_6addb4c0d0c48191a5c144d38e8dc7e0


## Publication

The repository was initialized locally on main. No GitHub remote was configured because this environment exposes no repository-creation action, GitHub CLI, or Git credential helper. See TEST_REPORT.md for the exact action needed to publish this new repository.

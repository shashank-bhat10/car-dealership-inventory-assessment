# Motorhaus Inventory

An inventory and purchasing application for a small car dealership. The React single page app uses a FastAPI JSON API, SQLAlchemy persistence, Alembic migrations, hashed account passwords, and signed bearer tokens.

The public repository's default branch is `submission/tdd-kata`, so the repository root opens this submission.

## Screenshots

Captured from the running SPA during the Playwright viewport audit with deterministic API fixtures:

- [Sign-in screen](screenshots/sign-in.png)
- [Customer inventory](screenshots/customer-inventory.png)
- [Administrator inventory](screenshots/admin-inventory.png)

## Architecture

- `backend/app`: FastAPI routes, SQLAlchemy models, validation, authentication and settings.
- `backend/alembic`: versioned schema migrations.
- `backend/tests`: API, permission, validation, stock and migration tests.
- `frontend/src`: React SPA, accessible forms, inventory search and admin workflows.
- `.github/workflows/ci.yml`: backend and frontend checks on pushes and pull requests.

Purchases use a single conditional SQL `UPDATE` (`quantity > 0`) so competing requests cannot decrement below zero. Restock also uses a conditional update and stock ceiling. SQLite is the local default and satisfies the persistent-database requirement. PostgreSQL configuration is optional and has not been tested.

## Run locally

Requirements: Python 3.12+, Node.js 22+, pnpm 9+.

Backend (PowerShell):

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt -r requirements-dev.txt
$env:DATABASE_URL = "sqlite:///./inventory.db"
$env:ENVIRONMENT = "development"
# Optional in explicit development mode; production must provide a strong value.
$env:SECRET_KEY = "development-key-change-me"
$env:FRONTEND_ORIGIN = "http://localhost:5173"
alembic upgrade head
python -m app.admin_cli
uvicorn app.main:app --reload
```

The offline admin command prompts for an email and password twice. It creates an administrator or promotes an existing account and sets the password entered at the prompt. Public registration always creates a customer, including when its email matches an administrator's address. Register customer accounts through the SPA or `POST /api/auth/register`.

Configuration:

| Variable | Local behavior | Production behavior |
| --- | --- | --- |
| `ENVIRONMENT` | Set explicitly to `development` to permit the local fallback key. | Defaults to the secure non-development policy when unset; set to `production`. |
| `SECRET_KEY` | Optional only when `ENVIRONMENT=development`; set your own value to keep local tokens stable. | Required. Use at least 32 characters with at least 12 distinct characters; known defaults and placeholder text are rejected. |
| `DATABASE_URL` | Defaults to persistent `sqlite:///./inventory.db` (`backend/inventory.db`). | Set to the chosen SQLAlchemy database URL. PostgreSQL uses `postgresql+psycopg://user:password@localhost:5432/dealership`; PostgreSQL was not tested. |
| `FRONTEND_ORIGIN` | Defaults to `http://localhost:5173`; localhost and loopback Vite origins are also allowed. | Set to the deployed SPA origin. |
| `VITE_API_URL` | Optional; empty uses the Vite `/api` proxy to `http://127.0.0.1:8000`. | Set the public API origin when the SPA and API are served separately. |

To create a production key locally, run `python -c "import secrets; print(secrets.token_hex(32))"` and place the result in the deployment secret store. Never commit the generated key.

Frontend (a second terminal):

```powershell
cd frontend
pnpm install
pnpm dev
```

Vite proxies `/api` to `http://127.0.0.1:8000` during local development. To use another API origin, set `VITE_API_URL` before starting/building Vite. The app is served at `http://localhost:5173`; API docs are at `http://127.0.0.1:8000/docs`.

## API overview

Registration and login are public. Every vehicle and inventory route requires `Authorization: Bearer <token>`. Delete and restock additionally require an administrator.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Register email/password; new accounts are customers |
| POST | `/api/auth/login` | Public | OAuth form login; returns JWT and role flag |
| GET | `/api/vehicles` | Authenticated | List inventory; supports `make`, `model`, `category`, `min_price`, and `max_price` filters |
| GET | `/api/vehicles/search` | Authenticated | Search inventory by `make`, `model`, `category`, `min_price`, and `max_price` |
| POST | `/api/vehicles` | Authenticated | Add vehicle |
| PUT | `/api/vehicles/{id}` | Authenticated | Update vehicle |
| DELETE | `/api/vehicles/{id}` | Admin | Remove vehicle |
| POST | `/api/vehicles/{id}/restock` | Admin | Add stock within the configured stock limit |
| POST | `/api/vehicles/{id}/purchase` | Authenticated | Decrement one available unit safely |

Vehicle input validates non-empty make/model/category, positive price, integer quantity, bounded field sizes and unique database IDs. Out-of-stock purchases return HTTP 409; missing items return 404.

## Tests and evidence

Run backend checks from `backend`: `$env:PYTHONPATH='.'; .\.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing`, `.\.venv\Scripts\ruff.exe check app tests`, and `$env:DATABASE_URL='sqlite:///./fresh-check.db'; .\.venv\Scripts\alembic.exe upgrade head`. Run frontend checks from `frontend`: `pnpm test`, `pnpm test:responsive`, `pnpm lint`, `pnpm build`. The repeatable Playwright audit starts Vite, checks sign-in/customer/admin screens at 320×640, 375×812, 768×1024, and 1440×900, exercises customer/admin flows, checks overflow, labeled controls, 24 CSS pixel minimum targets and visible keyboard focus, and runs axe-core WCAG 2.1 A/AA rules. It uses deterministic API fixtures and is not a live-backend integration run or a screen-reader audit. Install Chromium with `pnpm exec playwright install chromium` if needed. Exact observed commands, results, warnings and unverified checks are in [TEST_REPORT.md](TEST_REPORT.md). Requirement evidence is mapped in [REQUIREMENTS_CHECKLIST.md](REQUIREMENTS_CHECKLIST.md). Actual test-first commit IDs and red/green outcomes are in [TDD_LOG.md](TDD_LOG.md).

## My AI Usage

ChatGPT helped prepare the implementation prompt. OpenAI Codex in the desktop app helped implement and test the project, including its API, migrations, SPA, backend and frontend tests, CI, and evidence documents. Codex also ran the recorded checks, captured screenshots with Playwright, inspected Git state, and verified the GitHub repository and Actions results with the GitHub connector and the repository's saved Git credential. The tools used included PowerShell shell commands and patch editing, the workspace Python and pnpm runtimes, Playwright for genuine browser screenshots, the document-reading workflow for the supplied assessment, Git, and GitHub's authenticated API for repository settings. [PROMPTS.md](PROMPTS.md) contains the supplied link to the Codex build and verification conversation. No original shareable ChatGPT conversation record was supplied for `PROMPTS.md`. The Git commit trailers identify AI-assisted commits as `OpenAI Codex <ai@users.noreply.github.com>`.

**Personal reflection:**

I used ChatGPT to organize the assessment requirements into a clear prompt for Codex. Codex helped implement the backend and frontend, write tests, fix issues, and prepare the documentation. I reviewed the reported test and GitHub Actions results and asked for corrections when I found requirements that were still incomplete. This made the work faster, but it also showed me that AI-generated code and documentation need to be checked against the requirements and actual test results. I learned to verify the evidence before considering the project complete.

# Motorhaus Inventory

An inventory and simulated purchasing application for a small car dealership. The React single page app uses a FastAPI JSON API, SQLAlchemy persistence, Alembic migrations, hashed account passwords, and signed bearer tokens. A purchase only decrements inventory and records a history snapshot; it does not process payment.

The public repository's default branch is `submission/tdd-kata`, so the repository root opens this submission.

## Screenshots

Captured from the running SPA during the Playwright viewport audit with deterministic API fixtures:

- [Sign-in screen](screenshots/sign-in.png)
- [Customer inventory](screenshots/customer-inventory.png)
- [Customer inventory at 375×812](screenshots/customer-inventory-mobile.png)
- [Administrator inventory](screenshots/admin-inventory.png)
- [Vehicle details](screenshots/vehicle-details.png)
- [Vehicle details at 375×812](screenshots/vehicle-details-mobile.png)
- [Purchase confirmation](screenshots/purchase-confirmation.png)
- [Vehicle deletion confirmation](screenshots/vehicle-delete-confirmation.png)
- [Customer purchase history](screenshots/purchase-history.png)
- [Administrator purchase history](screenshots/purchase-history-admin.png)

The two screenshots below are separate full-stack captures. They were made from the running React SPA connected to FastAPI and a fresh disposable SQLite database after migrations and the documented development seeder. A temporary customer account purchased the one-unit Honda Civic through the UI; customer and admin history then showed the database record. Temporary account emails are masked in the images. The fixture-based screenshots above remain labeled as fixture-based; these two show a real local backend/database flow. No payment was processed.

- [Full-stack customer purchase history](screenshots/fullstack-customer-history.png)
- [Full-stack administrator purchase history](screenshots/fullstack-admin-history.png)

## Architecture

- `backend/app`: FastAPI routes, SQLAlchemy models, validation, authentication and settings.
- `backend/alembic`: versioned schema migrations, including a forward migration for purchase history.
- `backend/tests`: API, permission, validation, stock, history transaction, and migration tests.
- `frontend/src/App.jsx`: authentication, route state, inventory, confirmation, and history orchestration.
- `frontend/src/components`: focused authentication, inventory, vehicle details, admin form, accessible confirmation dialog, and purchase history components.
- `frontend/src/services/api.js`: shared bearer-token API client and error handling.
- `.github/workflows/ci.yml`: backend, PostgreSQL, browser accessibility, frontend test, lint and production-build checks on pushes and pull requests.

Purchases use one conditional SQL `UPDATE` (`quantity > 0`) and insert a purchaser/time/vehicle-price snapshot in the same database transaction. Competing requests cannot decrement below zero; if the history insert fails, the stock change rolls back. Vehicle deletion sets the purchase's vehicle reference to null while retaining saved details. These are simulated inventory records, not paid invoices or completed payment orders. No payment is charged or processed. Restock also uses a conditional update and stock ceiling. SQLite is the local default and satisfies the persistent-database requirement. The workflow includes a PostgreSQL 16 service job for vehicle, purchase-history tests, and migrations; local PostgreSQL could not be authenticated in this environment.

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

### Load local demo inventory

After activating the backend virtual environment, setting `ENVIRONMENT=development` and a local SQLite `DATABASE_URL`, and applying migrations with `alembic upgrade head`, run this command from the `backend` directory:

```powershell
python -m app.seed_demo
```

Run it when you want sample inventory in a local development database. It is never run on application startup. The command refuses non-development mode and non-local databases, and it only supports a local SQLite file. The six fictional vehicles are Toyota Corolla (Sedan, $24,000, quantity 5), Honda Civic (Sedan, $22,900, quantity 1), Ford Mustang (Coupe, $42,500, quantity 3), Tesla Model 3 (Electric, $38,900, quantity 0), Subaru Outback (Wagon, $31,900, quantity 4), and BMW X3 (SUV, $45,900, quantity 2). Re-running the command skips existing make/model pairs without changing those vehicles or any user records.

Seeded vehicles are fictional local development data. This command does not populate or change a deployed website. To try customer flows, register through the SPA or `POST /api/auth/register`; public registration creates customer accounts only. To create or promote an administrator in your local development database, run `python -m app.admin_cli` and enter your own email and password at its prompts. No default admin account or demo credentials are supplied.

Configuration:

| Variable | Local behavior | Production behavior |
| --- | --- | --- |
| `ENVIRONMENT` | Set explicitly to `development` to permit the local fallback key. | Defaults to the secure non-development policy when unset; set to `production`. |
| `SECRET_KEY` | Optional only when `ENVIRONMENT=development`; set your own value to keep local tokens stable. | Required. Use at least 32 characters with at least 12 distinct characters; known defaults and placeholder text are rejected. |
| `DATABASE_URL` | Defaults to persistent `sqlite:///./inventory.db` (`backend/inventory.db`). | Set to the chosen SQLAlchemy database URL. PostgreSQL uses `postgresql+psycopg://user:password@localhost:5432/dealership`; GitHub Actions verifies this driver and migrations using a temporary PostgreSQL service. |
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

Registration and login are public. Every vehicle and inventory route requires `Authorization: Bearer <token>`. Listing, searching, viewing details, and purchasing are available to authenticated accounts. Creating, updating, deleting, and restocking vehicles require an administrator; the API enforces the same role restriction as the admin interface.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Register email/password; new accounts are customers |
| POST | `/api/auth/login` | Public | OAuth form login; returns JWT and role flag |
| GET | `/api/vehicles` | Authenticated | List inventory; supports `make`, `model`, `category`, `min_price`, and `max_price` filters |
| GET | `/api/vehicles/search` | Authenticated | Search inventory by `make`, `model`, `category`, `min_price`, and `max_price` |
| GET | `/api/vehicles/{id}` | Authenticated | Fetch one vehicle for its shareable detail page; returns 404 when absent |
| POST | `/api/vehicles` | Admin | Add vehicle (403 for authenticated customers) |
| PUT | `/api/vehicles/{id}` | Admin | Update vehicle (403 for authenticated customers) |
| DELETE | `/api/vehicles/{id}` | Admin | Remove vehicle |
| POST | `/api/vehicles/{id}/restock` | Admin | Add stock within the configured stock limit |
| POST | `/api/vehicles/{id}/purchase` | Authenticated | Decrement one available unit safely |
| GET | `/api/purchases` | Authenticated | Return only the current account's simulated inventory purchase records |
| GET | `/api/admin/purchases` | Admin | Return simulated purchase records across users, including purchaser email |

Vehicle input validates non-empty make/model/category, positive price, integer quantity, bounded field sizes and unique database IDs. Out-of-stock purchases return HTTP 409; missing items return 404.

Both history routes accept `limit` (default 20, range 1–100) and `offset` (default 0, maximum 10000), and return newest records first. Each record keeps the unit price and vehicle make/model from the time of purchase. The vehicle reference becomes null after an administrator deletes its listing, while its saved details remain readable. Purchase records do not represent payment.

## Tests and evidence

From backend, run:
- $env:PYTHONPATH='.'; .\.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing
- .\.venv\Scripts\ruff.exe check app tests
- Set a fresh local SQLite DATABASE_URL before .\.venv\Scripts\alembic.exe -c alembic.ini upgrade head.

From frontend, run pnpm test, pnpm test:responsive -- --screenshots, pnpm lint, and pnpm build. The Playwright audit checks sign-in, customer/admin inventory and purchase history, vehicle details, and purchase/delete confirmation dialogs at 320×640, 375×812, 768×1024, and 1440×900. It checks overflow, named controls, 24 CSS-pixel targets, visible focus, focus cycling, Escape handling, and axe-core WCAG 2.1 A/AA rules. It exercises customer search, simulated purchase confirmation, out-of-stock behavior, customer/admin history, and administrator add/edit/restock/delete confirmations.

The browser audit uses deterministic API fixtures; it is not a live-backend integration or physical-device test. Automated focus and axe checks do not constitute a full screen-reader audit, which was not performed. CI runs purchase-history tests and migrations against a temporary PostgreSQL service. Install Chromium with pnpm exec playwright install chromium if needed. Exact commands, results, warnings, and limitations are in [TEST_REPORT.md](TEST_REPORT.md); requirement evidence is mapped in [REQUIREMENTS_CHECKLIST.md](REQUIREMENTS_CHECKLIST.md); actual red/green test-first commits are recorded in [TDD_LOG.md](TDD_LOG.md).

## My AI Usage

ChatGPT helped prepare the implementation prompt. OpenAI Codex in the desktop app helped implement and test the project, including its API, migrations, SPA, backend and frontend tests, CI, and evidence documents. Codex also ran the recorded checks, captured fixture-based and full-stack screenshots with Playwright, inspected Git state, and verified repository/Actions state with GitHub's API. Other tools included PowerShell, Python, pnpm, Git, and the document-reading workflow for the supplied assessment. [PROMPTS.md](PROMPTS.md) contains two conversation share links, not transcript exports or a complete archive of every AI interaction. A cookie-free request to the ChatGPT planning link returned HTTP 200 and project-specific prompt text in this audit. A cookie-free request to the Codex conversation link returned HTTP 403, so anonymous access could not be independently confirmed here; the user previously confirmed that the link opens without signing in. The co-author identity on AI-assisted commits is `OpenAI Codex <ai@users.noreply.github.com>`; the merge commit's trailer was added while preserving its tree and parents.

**Personal reflection:**

I used ChatGPT to organize the assessment requirements into a clear prompt for Codex. Codex helped implement the backend and frontend, write tests, fix issues, and prepare the documentation. I reviewed the reported test and GitHub Actions results and asked for corrections when I found requirements that were still incomplete. This made the work faster, but it also showed me that AI-generated code and documentation need to be checked against the requirements and actual test results. I learned to verify the evidence before considering the project complete.

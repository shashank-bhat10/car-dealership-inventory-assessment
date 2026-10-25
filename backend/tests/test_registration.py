import sqlite3
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_registration_creates_an_account_without_returning_password():
    email = f"buyer-{uuid4().hex}@example.com"
    response = client.post("/api/auth/register", json={"email": email, "password": "Safe-Drive-2046"})

    assert response.status_code == 201
    assert response.json()["email"] == email
    assert "password" not in response.json()


def test_registration_never_grants_admin_from_email_configuration(monkeypatch):
    monkeypatch.setenv("BOOTSTRAP_ADMIN_EMAIL", "admin@example.com")
    response = client.post(
        "/api/auth/register",
        json={"email": "admin@example.com", "password": "Safe-Drive-2046"},
    )

    assert response.status_code == 201
    assert response.json()["is_admin"] is False


def test_registration_rejects_duplicate_email():
    email = f"buyer-{uuid4().hex}@example.com"
    payload = {"email": email, "password": "Safe-Drive-2046"}

    assert client.post("/api/auth/register", json=payload).status_code == 201
    assert client.post("/api/auth/register", json=payload).status_code == 409


def test_registration_rejects_short_password():
    response = client.post(
        "/api/auth/register",
        json={"email": f"buyer-{uuid4().hex}@example.com", "password": "short"},
    )
    assert response.status_code == 422


def test_database_stores_a_hash_instead_of_the_plaintext_password():
    email = f"buyer-{uuid4().hex}@example.com"
    password = "Safe-Drive-2046"
    response = client.post("/api/auth/register", json={"email": email, "password": password})
    assert response.status_code == 201

    import os

    with sqlite3.connect(os.environ["TEST_DATABASE_PATH"]) as database:
        stored_password = database.execute(
            "SELECT password_hash FROM users WHERE email = ?", (email,)
        ).fetchone()[0]
    assert stored_password != password
    assert stored_password.startswith("$argon2")

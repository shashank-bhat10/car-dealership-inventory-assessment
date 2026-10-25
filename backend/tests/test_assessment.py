from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_registration_hashes_password_and_login_returns_token():
    response = client.post("/api/auth/register", json={"email":"buyer@example.com", "password":"Correct-Horse-7"})
    assert response.status_code == 201
    assert "password" not in response.json()
    login = client.post("/api/auth/login", data={"username":"buyer@example.com", "password":"Correct-Horse-7"})
    assert login.status_code == 200
    assert login.json()["access_token"]


def test_invalid_login_is_rejected():
    response = client.post("/api/auth/login", data={"username":"missing@example.com", "password":"wrong"})
    assert response.status_code == 401


def test_inventory_requires_authentication():
    assert client.get("/api/vehicles").status_code == 401

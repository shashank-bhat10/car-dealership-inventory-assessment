import jwt
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_login_returns_a_signed_jwt_for_registered_account():
    email = "member@example.com"
    password = "Safe-Drive-2046"
    assert client.post("/api/auth/register", json={"email": email, "password": password}).status_code == 201

    response = client.post("/api/auth/login", data={"username": email, "password": password})

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    claims = jwt.decode(response.json()["access_token"], "test-secret-key-for-jwt-signing", algorithms=["HS256"])
    assert claims["sub"]


def test_login_rejects_wrong_password_and_unknown_account():
    assert client.post(
        "/api/auth/register",
        json={"email": "member@example.com", "password": "Safe-Drive-2046"},
    ).status_code == 201
    wrong_password = client.post(
        "/api/auth/login", data={"username": "member@example.com", "password": "incorrect"}
    )
    unknown_user = client.post(
        "/api/auth/login", data={"username": "missing@example.com", "password": "incorrect"}
    )
    assert wrong_password.status_code == 401
    assert unknown_user.status_code == 401


def test_login_does_not_promote_a_registered_account_by_email():
    email = "admin@example.com"
    password = "Safe-Drive-2046"
    assert client.post("/api/auth/register", json={"email": email, "password": password}).status_code == 201
    response = client.post("/api/auth/login", data={"username": email, "password": password})
    assert response.status_code == 200
    assert response.json()["is_admin"] is False

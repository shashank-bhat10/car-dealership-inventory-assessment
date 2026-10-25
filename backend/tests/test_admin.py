from uuid import uuid4

from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app, password_hash
from app.models import User

client = TestClient(app)


def create_account(email: str, *, admin: bool = False) -> dict[str, str]:
    password = "Safe-Drive-2046"
    if admin:
        with SessionLocal() as session:
            session.add(
                User(email=email, password_hash=password_hash.hash(password), is_admin=True)
            )
            session.commit()
    else:
        response = client.post("/api/auth/register", json={"email": email, "password": password})
        assert response.status_code == 201
    token = client.post(
        "/api/auth/login", data={"username": email, "password": password}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_vehicle(headers: dict[str, str]) -> int:
    response = client.post(
        "/api/vehicles",
        json={"make": "Toyota", "model": f"Corolla-{uuid4().hex[:6]}", "category": "Sedan", "price": "24000", "quantity": 2},
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_delete_and_restock_are_admin_only():
    customer = create_account(f"customer-{uuid4().hex}@example.com")
    admin = create_account(f"admin-{uuid4().hex}@example.com", admin=True)
    vehicle_id = create_vehicle(admin)

    delete_result = client.delete(f"/api/vehicles/{vehicle_id}", headers=customer)
    restock_result = client.post(
        f"/api/vehicles/{vehicle_id}/restock", json={"quantity": 3}, headers=customer
    )
    assert delete_result.status_code == 403
    assert restock_result.status_code == 403


def test_vehicle_creation_is_admin_only():
    customer = create_account(f"customer-{uuid4().hex}@example.com")
    admin = create_account(f"admin-{uuid4().hex}@example.com", admin=True)
    payload = {
        "make": "Toyota",
        "model": f"Corolla-{uuid4().hex[:6]}",
        "category": "Sedan",
        "price": "24000",
        "quantity": 2,
    }

    assert client.post("/api/vehicles", json=payload, headers=customer).status_code == 403
    assert client.post("/api/vehicles", json=payload, headers=admin).status_code == 201


def test_vehicle_update_is_admin_only():
    customer = create_account(f"customer-{uuid4().hex}@example.com")
    admin = create_account(f"admin-{uuid4().hex}@example.com", admin=True)
    vehicle_id = create_vehicle(admin)
    payload = {
        "make": "Toyota",
        "model": "Camry",
        "category": "Sedan",
        "price": "26000",
        "quantity": 2,
    }

    assert client.put(f"/api/vehicles/{vehicle_id}", json=payload, headers=customer).status_code == 403
    updated = client.put(f"/api/vehicles/{vehicle_id}", json=payload, headers=admin)
    assert updated.status_code == 200
    assert updated.json()["model"] == "Camry"


def test_admin_can_restock_and_delete_and_missing_vehicle_is_reported():
    admin = create_account("admin@example.com", admin=True)
    vehicle_id = create_vehicle(admin)

    restocked = client.post(
        f"/api/vehicles/{vehicle_id}/restock", json={"quantity": 3}, headers=admin
    )
    assert restocked.status_code == 200
    assert restocked.json()["quantity"] == 5
    assert client.delete(f"/api/vehicles/{vehicle_id}", headers=admin).status_code == 204
    assert client.delete(f"/api/vehicles/{vehicle_id}", headers=admin).status_code == 404


def test_restock_quantity_must_be_positive():
    admin = create_account("admin@example.com", admin=True)
    vehicle_id = create_vehicle(admin)
    for quantity in (0, -1):
        assert client.post(
            f"/api/vehicles/{vehicle_id}/restock",
            json={"quantity": quantity},
            headers=admin,
        ).status_code == 422


def test_restock_reports_a_missing_vehicle():
    admin = create_account(f"admin-{uuid4().hex}@example.com", admin=True)
    result = client.post("/api/vehicles/888/restock", json={"quantity": 1}, headers=admin)
    assert result.status_code == 404


def test_restock_cannot_exceed_the_vehicle_stock_limit():
    admin = create_account("admin@example.com", admin=True)
    response = client.post(
        "/api/vehicles",
        json={"make": "Toyota", "model": "Limit", "category": "Sedan", "price": "10000", "quantity": 100000},
        headers=admin,
    )
    vehicle_id = response.json()["id"]

    result = client.post(
        f"/api/vehicles/{vehicle_id}/restock", json={"quantity": 1}, headers=admin
    )
    assert result.status_code == 422
    assert client.get("/api/vehicles", headers=admin).json()[0]["quantity"] == 100000

from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def create_account(email: str) -> dict[str, str]:
    password = "Safe-Drive-2046"
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
    vehicle_id = create_vehicle(customer)

    delete_result = client.delete(f"/api/vehicles/{vehicle_id}", headers=customer)
    restock_result = client.post(
        f"/api/vehicles/{vehicle_id}/restock", json={"quantity": 3}, headers=customer
    )
    assert delete_result.status_code == 403
    assert restock_result.status_code == 403


def test_admin_can_restock_and_delete_and_missing_vehicle_is_reported():
    admin = create_account("admin@example.com")
    vehicle_id = create_vehicle(admin)

    restocked = client.post(
        f"/api/vehicles/{vehicle_id}/restock", json={"quantity": 3}, headers=admin
    )
    assert restocked.status_code == 200
    assert restocked.json()["quantity"] == 5
    assert client.delete(f"/api/vehicles/{vehicle_id}", headers=admin).status_code == 204
    assert client.delete(f"/api/vehicles/{vehicle_id}", headers=admin).status_code == 404


def test_restock_quantity_must_be_positive():
    admin = create_account("admin@example.com")
    vehicle_id = create_vehicle(admin)
    for quantity in (0, -1):
        assert client.post(
            f"/api/vehicles/{vehicle_id}/restock",
            json={"quantity": quantity},
            headers=admin,
        ).status_code == 422


def test_restock_cannot_exceed_the_vehicle_stock_limit():
    admin = create_account("admin@example.com")
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

from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def buyer_headers():
    email = f"buyer-{uuid4().hex}@example.com"
    password = "Safe-Drive-2046"
    client.post("/api/auth/register", json={"email": email, "password": password})
    token = client.post(
        "/api/auth/login", data={"username": email, "password": password}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_purchase_decrements_stock_and_rejects_zero_or_missing_vehicle():
    headers = buyer_headers()
    created = client.post(
        "/api/vehicles",
        json={"make": "Volvo", "model": "XC60", "category": "SUV", "price": "48000", "quantity": 1},
        headers=headers,
    )
    vehicle_id = created.json()["id"]
    url = f"/api/vehicles/{vehicle_id}/purchase"

    first_purchase = client.post(url, headers=headers)
    empty_purchase = client.post(url, headers=headers)
    missing_purchase = client.post("/api/vehicles/999999/purchase", headers=headers)

    assert first_purchase.status_code == 200
    assert first_purchase.json()["quantity"] == 0
    assert empty_purchase.status_code == 409
    assert missing_purchase.status_code == 404
    assert client.post(url).status_code == 401


def test_concurrent_purchases_never_oversell_available_stock():
    headers = buyer_headers()
    created = client.post(
        "/api/vehicles",
        json={"make": "Volvo", "model": "V60", "category": "Wagon", "price": "40000", "quantity": 3},
        headers=headers,
    )
    url = f"/api/vehicles/{created.json()['id']}/purchase"

    def purchase_once(_: int) -> int:
        with TestClient(app) as concurrent_client:
            return concurrent_client.post(url, headers=headers).status_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        statuses = list(pool.map(purchase_once, range(8)))

    assert statuses.count(200) == 3
    assert statuses.count(409) == 5
    inventory = client.get("/api/vehicles", headers=headers).json()
    assert inventory[0]["quantity"] == 0

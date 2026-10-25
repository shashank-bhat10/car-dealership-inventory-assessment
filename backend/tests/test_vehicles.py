from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal
from app.main import app
from app.models import Vehicle

client = TestClient(app)


def authenticated_headers():
    email = f"buyer-{uuid4().hex}@example.com"
    password = "Safe-Drive-2046"
    client.post("/api/auth/register", json={"email": email, "password": password})
    token = client.post(
        "/api/auth/login", data={"username": email, "password": password}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def payload(**overrides):
    value = {"make": "Toyota", "model": "Corolla", "category": "Sedan", "price": "24000.00", "quantity": 4}
    value.update(overrides)
    return value


def test_vehicle_list_create_search_and_update_require_authentication():
    unauthenticated = client.get("/api/vehicles")
    assert unauthenticated.status_code == 401
    headers = authenticated_headers()
    created = client.post("/api/vehicles", json=payload(), headers=headers)
    assert created.status_code == 201
    assert created.json()["id"] > 0
    assert client.get("/api/vehicles", headers=headers).json()[0]["make"] == "Toyota"
    updated = client.put(
        f"/api/vehicles/{created.json()['id']}",
        json=payload(model="Camry"),
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["model"] == "Camry"


def test_every_protected_vehicle_route_rejects_anonymous_requests():
    anonymous_requests = (
        ("get", "/api/vehicles", None),
        ("get", "/api/vehicles/search", None),
        ("post", "/api/vehicles", payload()),
        ("put", "/api/vehicles/1", payload()),
        ("delete", "/api/vehicles/1", None),
        ("post", "/api/vehicles/1/purchase", None),
        ("post", "/api/vehicles/1/restock", {"quantity": 1}),
    )

    for method, path, body in anonymous_requests:
        response = getattr(client, method)(path, json=body) if body is not None else getattr(client, method)(path)
        assert response.status_code == 401, f"{method.upper()} {path}: {response.text}"


def test_vehicle_search_applies_make_model_category_and_price_bounds():
    headers = authenticated_headers()
    client.post("/api/vehicles", json=payload(make="Toyota", model="Corolla", price="22000"), headers=headers)
    client.post("/api/vehicles", json=payload(make="Honda", model="Civic", category="Hatchback", price="18000"), headers=headers)
    client.post("/api/vehicles", json=payload(make="Toyota", model="RAV4", category="SUV", price="36000"), headers=headers)

    found = client.get(
        "/api/vehicles/search?make=toy&model=cor&category=sedan&min_price=20000&max_price=25000",
        headers=headers,
    )
    assert found.status_code == 200
    assert len(found.json()) == 1
    assert found.json()[0]["model"] == "Corolla"
    assert client.get("/api/vehicles/search?make=Ford", headers=headers).json() == []


def test_vehicle_search_supports_each_filter_independently():
    headers = authenticated_headers()
    client.post("/api/vehicles", json=payload(make="Toyota", model="Corolla", price="22000"), headers=headers)
    client.post("/api/vehicles", json=payload(make="Honda", model="Civic", category="Hatchback", price="18000"), headers=headers)
    client.post("/api/vehicles", json=payload(make="Toyota", model="RAV4", category="SUV", price="36000"), headers=headers)

    cases = (
        ("make=Honda", "Civic"),
        ("model=RAV", "RAV4"),
        ("category=Hatch", "Civic"),
        ("min_price=30000", "RAV4"),
        ("max_price=20000", "Civic"),
    )
    for query, expected_model in cases:
        results = client.get(f"/api/vehicles/search?{query}", headers=headers).json()
        assert [vehicle["model"] for vehicle in results] == [expected_model], query


def test_vehicle_input_rejects_blank_text_invalid_price_and_negative_quantity():
    headers = authenticated_headers()
    for invalid in (
        payload(make=" "),
        payload(model=""),
        payload(category="  "),
        payload(price="0"),
        payload(price="1.999"),
        payload(quantity=-1),
        payload(quantity=100001),
        payload(make="M" * 81),
        payload(model="M" * 101),
        payload(category="C" * 61),
    ):
        assert client.post("/api/vehicles", json=invalid, headers=headers).status_code == 422


def test_vehicle_update_reports_missing_id():
    headers = authenticated_headers()
    assert client.put("/api/vehicles/888", json=payload(), headers=headers).status_code == 404


@pytest.mark.parametrize(
    "price,quantity",
    [(0, 1), (-1, 1), (1, -1), (1, 100001)],
)
def test_database_rejects_invalid_vehicle_price_and_stock(price, quantity):
    with SessionLocal() as session:
        session.add(
            Vehicle(
                make="Database",
                model=f"Constraint-{uuid4().hex[:8]}",
                category="Test",
                price=price,
                quantity=quantity,
            )
        )
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()

from datetime import datetime
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.exc import OperationalError
from sqlalchemy.engine import Engine

from app.database import SessionLocal, engine
from app.main import app, password_hash
from app.models import User


client = TestClient(app)


def account_headers(*, admin: bool = False) -> tuple[dict[str, str], str]:
    email = f"history-{uuid4().hex}@example.com"
    password = "Safe-History-2046"
    if admin:
        with SessionLocal() as session:
            session.add(User(email=email, password_hash=password_hash.hash(password), is_admin=True))
            session.commit()
    else:
        assert client.post("/api/auth/register", json={"email": email, "password": password}).status_code == 201
    token = client.post("/api/auth/login", data={"username": email, "password": password}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}, email


def create_vehicle(headers: dict[str, str], *, quantity: int = 1, model: str | None = None) -> dict:
    response = client.post(
        "/api/vehicles",
        json={
            "make": "Volvo",
            "model": model or f"XC-{uuid4().hex[:6]}",
            "category": "SUV",
            "price": "42123.45",
            "quantity": quantity,
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


def test_purchase_records_snapshot_and_utc_timestamp_with_stock_decrement():
    customer, email = account_headers()
    admin, _ = account_headers(admin=True)
    vehicle = create_vehicle(admin, model="XC90")

    purchased = client.post(f"/api/vehicles/{vehicle['id']}/purchase", headers=customer)
    history = client.get("/api/purchases", headers=customer)

    assert purchased.status_code == 200
    assert purchased.json()["quantity"] == 0
    assert history.status_code == 200
    assert len(history.json()) == 1
    record = history.json()[0]
    assert record["vehicle_id"] == vehicle["id"]
    assert record["purchaser_email"] == email
    assert (record["make"], record["model"], record["unit_price"]) == ("Volvo", "XC90", "42123.45")
    timestamp = datetime.fromisoformat(record["purchased_at"].replace("Z", "+00:00"))
    assert timestamp.utcoffset().total_seconds() == 0


def test_out_of_stock_purchase_does_not_create_history():
    customer, _ = account_headers()
    admin, _ = account_headers(admin=True)
    vehicle = create_vehicle(admin, quantity=0)

    response = client.post(f"/api/vehicles/{vehicle['id']}/purchase", headers=customer)

    assert response.status_code == 409
    assert client.get("/api/purchases", headers=customer).json() == []


def test_history_insert_failure_rolls_back_stock_decrement():
    customer, _ = account_headers()
    admin, _ = account_headers(admin=True)
    vehicle = create_vehicle(admin, quantity=1)

    def fail_history_insert(_conn, _cursor, statement, _parameters, _context, _many):
        if statement.lstrip().lower().startswith("insert into purchases"):
            raise OperationalError(statement, {}, RuntimeError("injected history write failure"))

    event.listen(engine, "before_cursor_execute", fail_history_insert)
    try:
        failing_client = TestClient(app, raise_server_exceptions=False)
        response = failing_client.post(f"/api/vehicles/{vehicle['id']}/purchase", headers=customer)
    finally:
        event.remove(engine, "before_cursor_execute", fail_history_insert)

    assert response.status_code == 500
    assert client.get(f"/api/vehicles/{vehicle['id']}", headers=customer).json()["quantity"] == 1
    assert client.get("/api/purchases", headers=customer).json() == []


def test_customers_see_only_their_history_and_admin_history_is_restricted():
    first, first_email = account_headers()
    second, second_email = account_headers()
    admin, _ = account_headers(admin=True)
    vehicle = create_vehicle(admin, quantity=2)

    assert client.post(f"/api/vehicles/{vehicle['id']}/purchase", headers=first).status_code == 200
    assert client.post(f"/api/vehicles/{vehicle['id']}/purchase", headers=second).status_code == 200

    first_history = client.get("/api/purchases", headers=first)
    second_history = client.get("/api/purchases", headers=second)
    admin_history = client.get("/api/admin/purchases", headers=admin)

    assert [record["purchaser_email"] for record in first_history.json()] == [first_email]
    assert [record["purchaser_email"] for record in second_history.json()] == [second_email]
    assert client.get("/api/admin/purchases", headers=first).status_code == 403
    assert {record["purchaser_email"] for record in admin_history.json()} == {first_email, second_email}


def test_deleted_vehicle_keeps_its_purchase_details_in_history():
    customer, _ = account_headers()
    admin, _ = account_headers(admin=True)
    vehicle = create_vehicle(admin, model="V90")
    assert client.post(f"/api/vehicles/{vehicle['id']}/purchase", headers=customer).status_code == 200

    assert client.delete(f"/api/vehicles/{vehicle['id']}", headers=admin).status_code == 204

    record = client.get("/api/purchases", headers=customer).json()[0]
    assert record["vehicle_id"] is None
    assert (record["make"], record["model"], record["unit_price"]) == ("Volvo", "V90", "42123.45")


def test_history_is_newest_first_paginated_and_bounded():
    customer, _ = account_headers()
    admin, _ = account_headers(admin=True)
    vehicles = [create_vehicle(admin, quantity=1, model=f"V{i}") for i in range(3)]
    for vehicle in vehicles:
        assert client.post(f"/api/vehicles/{vehicle['id']}/purchase", headers=customer).status_code == 200

    page = client.get("/api/purchases?limit=2&offset=1", headers=customer)

    assert [record["model"] for record in page.json()] == ["V1", "V0"]
    assert client.get("/api/purchases?limit=101", headers=customer).status_code == 422
    assert client.get("/api/purchases?offset=-1", headers=customer).status_code == 422
    assert client.get("/api/purchases").status_code == 401

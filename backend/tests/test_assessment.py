import pytest
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient
from app.main import app, Base, engine


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


client = TestClient(app)


def register(email="buyer@example.com", password="Correct-Horse-7"):
    return client.post(
        "/api/auth/register", json={"email": email, "password": password}
    )


def login(email="buyer@example.com", password="Correct-Horse-7"):
    return client.post(
        "/api/auth/login", data={"username": email, "password": password}
    )


def auth(email="buyer@example.com"):
    return {"Authorization": "Bearer " + login(email).json()["access_token"]}


def admin():
    register("admin@example.com")
    with __import__("app.main", fromlist=["SessionLocal"]).SessionLocal() as s:
        u = (
            s.query(__import__("app.main", fromlist=["User"]).User)
            .filter_by(email="admin@example.com")
            .one()
        )
        u.is_admin = True
        s.commit()
    return auth("admin@example.com")


def vehicle(headers, **overrides):
    data = {
        "make": "Toyota",
        "model": "Corolla",
        "category": "Sedan",
        "price": "24000.00",
        "quantity": 2,
    }
    data.update(overrides)
    return client.post("/api/vehicles", json=data, headers=headers)


def test_registration_hashes_password_and_login_returns_token():
    r = register()
    assert r.status_code == 201 and "password" not in r.json()
    from app.main import SessionLocal, User

    with SessionLocal() as s:
        assert s.query(User).one().password_hash != "Correct-Horse-7"
    assert login().json()["access_token"]


def test_duplicate_registration_and_bad_login_are_rejected():
    register()
    assert register().status_code == 409
    assert login(password="wrong").status_code == 401
    assert login("missing@example.com").status_code == 401


def test_inventory_requires_authentication():
    assert client.get("/api/vehicles").status_code == 401


def test_vehicle_create_search_update_validation_and_missing():
    register()
    h = auth()
    v = vehicle(h)
    assert v.status_code == 201
    assert (
        client.get(
            "/api/vehicles/search?make=toy&min_price=20000&max_price=25000", headers=h
        ).json()[0]["id"]
        == v.json()["id"]
    )
    assert client.get("/api/vehicles/search?make=ford", headers=h).json() == []
    assert (
        client.put(
            f"/api/vehicles/{v.json()['id']}",
            json={**v.json(), "price": "26000"},
            headers=h,
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/api/vehicles",
            json={
                "make": " ",
                "model": "M",
                "category": "Sedan",
                "price": 0,
                "quantity": -1,
            },
            headers=h,
        ).status_code
        == 422
    )
    assert (
        client.put(
            "/api/vehicles/999", json={**v.json(), "id": 999}, headers=h
        ).status_code
        == 404
    )


def test_admin_delete_and_restock_permissions():
    register()
    h = auth()
    v = vehicle(h)
    vid = v.json()["id"]
    assert (
        client.post(
            f"/api/vehicles/{vid}/restock", json={"quantity": 2}, headers=h
        ).status_code
        == 403
    )
    assert client.delete(f"/api/vehicles/{vid}", headers=h).status_code == 403
    ah = admin()
    assert (
        client.post(
            f"/api/vehicles/{vid}/restock", json={"quantity": 3}, headers=ah
        ).json()["quantity"]
        == 5
    )
    assert client.delete(f"/api/vehicles/{vid}", headers=ah).status_code == 204
    assert client.delete(f"/api/vehicles/{vid}", headers=ah).status_code == 404


def test_purchase_stops_at_zero():
    register()
    h = auth()
    v = vehicle(h, quantity=1)
    url = f"/api/vehicles/{v.json()['id']}/purchase"
    assert client.post(url, headers=h).json()["quantity"] == 0
    assert client.post(url, headers=h).status_code == 409
    assert client.post("/api/vehicles/999/purchase", headers=h).status_code == 404


def test_concurrent_purchases_do_not_oversell():
    register()
    h = auth()
    v = vehicle(h, quantity=3)
    url = f"/api/vehicles/{v.json()['id']}/purchase"

    def attempt(_):
        with TestClient(app) as concurrent_client:
            return concurrent_client.post(url, headers=h).status_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        statuses = list(pool.map(attempt, range(8)))
    assert statuses.count(200) == 3
    assert statuses.count(409) == 5
    assert client.get("/api/vehicles", headers=h).json()[0]["quantity"] == 0

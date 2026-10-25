from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_frontend_origin_can_call_authenticated_api():
    response = client.options(
        "/api/vehicles",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "authorization" in response.headers["access-control-allow-headers"].lower()

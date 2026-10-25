from app.database import SessionLocal
from app.models import User


def test_offline_provisioning_creates_an_administrator():
    from app.admin_cli import provision_admin

    with SessionLocal() as session:
        admin = provision_admin("owner@example.com", "Safe-Drive-2046", session)

        stored = session.get(User, admin.id)
        assert stored is not None
        assert stored.email == "owner@example.com"
        assert stored.is_admin is True
        assert stored.password_hash != "Safe-Drive-2046"
        assert stored.password_hash.startswith("$argon2")


def test_offline_provisioning_promotes_existing_account_without_replacing_password():
    from app.admin_cli import provision_admin
    from app.main import password_hash

    with SessionLocal() as session:
        customer = User(
            email="existing@example.com",
            password_hash=password_hash.hash("Original-Drive-2046"),
            is_admin=False,
        )
        session.add(customer)
        session.commit()

        admin = provision_admin("existing@example.com", "Replacement-Drive-2047", session)

        assert admin.id == customer.id
        assert admin.is_admin is True
        assert password_hash.verify("Original-Drive-2046", admin.password_hash)

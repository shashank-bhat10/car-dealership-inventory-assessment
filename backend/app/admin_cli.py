from getpass import getpass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.main import RegistrationRequest, password_hash
from app.models import User


def provision_admin(email: str, password: str, session: Session) -> User:
    """Create or promote an account from the trusted local command line."""
    account = RegistrationRequest(email=email, password=password)
    normalized_email = str(account.email).lower()
    user = session.scalar(select(User).where(User.email == normalized_email))
    if user is None:
        user = User(
            email=normalized_email,
            password_hash=password_hash.hash(account.password),
            is_admin=True,
        )
        session.add(user)
    else:
        user.password_hash = password_hash.hash(account.password)
        user.is_admin = True
    session.commit()
    session.refresh(user)
    return user


def main() -> None:
    email = input("Administrator email: ").strip()
    password = getpass("Administrator password (10-128 characters): ")
    confirmation = getpass("Confirm administrator password: ")
    if password != confirmation:
        raise SystemExit("Passwords do not match")
    with SessionLocal() as session:
        admin = provision_admin(email, password, session)
    print(f"Administrator provisioned: {admin.email}")


if __name__ == "__main__":
    main()

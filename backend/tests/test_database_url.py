from app.database import normalize_database_url


def test_normalize_postgres_url_to_installed_psycopg_driver():
    assert normalize_database_url("postgres://user:pass@host/db") == (
        "postgresql+psycopg://user:pass@host/db"
    )
    assert normalize_database_url("postgresql://user:pass@host/db?sslmode=require") == (
        "postgresql+psycopg://user:pass@host/db?sslmode=require"
    )


def test_normalize_database_url_leaves_sqlite_unchanged():
    url = "sqlite:///./inventory.db"
    assert normalize_database_url(url) == url

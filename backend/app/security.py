DEVELOPMENT_SECRET = "development-key-change-me"
MINIMUM_SECRET_LENGTH = 32
PLACEHOLDER_MARKERS = ("change-me", "replace", "placeholder", "example", "your-secret")


def configured_secret_key(environment: str | None, secret_key: str | None) -> str:
    """Return the signing key, allowing the known key only in explicit development."""
    normalized_environment = (environment or "production").strip().lower()
    if normalized_environment == "development":
        return secret_key or DEVELOPMENT_SECRET

    if not secret_key or not secret_key.strip():
        raise RuntimeError("SECRET_KEY is required unless ENVIRONMENT=development")
    normalized_secret = secret_key.strip()
    lowered_secret = normalized_secret.casefold()
    if (
        len(normalized_secret) < MINIMUM_SECRET_LENGTH
        or normalized_secret == DEVELOPMENT_SECRET
        or len(set(normalized_secret)) < 12
        or any(marker in lowered_secret for marker in PLACEHOLDER_MARKERS)
    ):
        raise RuntimeError(
            f"SECRET_KEY must be at least {MINIMUM_SECRET_LENGTH} characters of non-placeholder text outside development"
        )
    return normalized_secret

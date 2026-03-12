import os


def env_flag(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def is_cloud_run() -> bool:
    return bool(os.getenv("K_SERVICE"))


def internal_scheduler_enabled() -> bool:
    default = not is_cloud_run()
    return env_flag("ENABLE_INTERNAL_SCHEDULER", default)


def get_internal_api_base_url() -> str:
    configured = os.getenv("INTERNAL_API_BASE_URL")
    if configured:
        return configured.rstrip("/")

    port = os.getenv("PORT", "8000")
    return f"http://127.0.0.1:{port}"


def get_allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]

    if origins:
        return origins

    if is_cloud_run():
        return []

    return ["http://localhost:5173", "http://127.0.0.1:5173"]

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Healthbox Backend"
    api_v1_prefix: str = "/api/v1"
    frontend_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )
    jwt_secret: str = "change-this-in-production"
    otp_code: str = "123456"
    session_expire_hours: int = 24
    cookie_secure: bool = False
    auth_cookie_name: str = "healthbox_session"
    registration_cookie_name: str = "healthbox_registration"
    google_application_credentials: str | None = None
    firebase_project_id: str | None = None
    users_collection: str = "users"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()

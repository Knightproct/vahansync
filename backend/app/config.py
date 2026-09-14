from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Vahana Fleet OS API"
    environment: str = "development"
    database_url: str = "sqlite:///./vahana.db"
    jwt_secret: str = "local-development-secret-change-me"
    access_token_minutes: int = 60
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    seed_admin_email: str = "admin@example.com"
    seed_admin_password: str = "ChangeMe!123"

    model_config = SettingsConfigDict(env_file=".env", env_prefix="VAHANA_", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

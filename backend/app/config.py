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
    storage_path: str = "./storage"
    max_upload_bytes: int = 25 * 1024 * 1024

    model_config = SettingsConfigDict(env_file=".env", env_prefix="VAHANA_", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    def validate_runtime(self) -> None:
        if self.environment.lower() in {"production", "staging"}:
            if self.jwt_secret == "local-development-secret-change-me":
                raise RuntimeError("VAHANA_JWT_SECRET must be changed outside development")
            if self.seed_admin_password == "ChangeMe!123":
                raise RuntimeError("VAHANA_SEED_ADMIN_PASSWORD must be changed outside development")


@lru_cache
def get_settings() -> Settings:
    return Settings()

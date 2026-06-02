from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "CardioIA Backend"

    # Auth (frontends)
    jwt_secret: str = "dev-secret-change-me"
    jwt_alg: str = "HS256"
    jwt_expire_min: int = 720
    demo_username: str = "medico"
    demo_password: str = "cardioia123"

    # Auth (dispositivo IoT / emulador)
    device_token: str = "wokwi-dev-token"

    # LLM (Fase 5)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-flash-lite"

    # CORS (lista separada por vírgula)
    cors_origins: str = "*"

    # Banco — Oracle (python-oracledb, thin mode, sem wallet) quando configurado;
    # senão usa database_url (SQLite) como fallback local.
    database_url: str = "sqlite:///./cardioia.db"
    oracle_user: str = ""
    oracle_password: str = ""
    oracle_dsn: str = ""

    @property
    def use_oracle(self) -> bool:
        return bool(self.oracle_user and self.oracle_dsn)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

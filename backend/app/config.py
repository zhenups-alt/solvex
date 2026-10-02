from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = Field("development", alias="SOLVEX_ENVIRONMENT")
    api_host: str = Field("0.0.0.0", alias="SOLVEX_API_HOST")
    api_port: int = Field(8080, alias="SOLVEX_API_PORT")
    cors_origins: str = Field("http://localhost:3000", alias="SOLVEX_CORS_ORIGINS")
    database_url: str = Field(
        "postgresql+asyncpg://solvex:solvex@localhost:5432/solvex",
        alias="SOLVEX_DATABASE_URL",
    )
    auto_create_tables: bool = Field(True, alias="SOLVEX_AUTO_CREATE_TABLES")

    gemini_api_key: str | None = Field(None, alias="GEMINI_API_KEY")
    gemini_model: str = Field("gemini-3.5-flash-lite", alias="SOLVEX_GEMINI_MODEL")

    solana_cluster: str = Field("devnet", alias="SOLVEX_SOLANA_CLUSTER")
    solana_rpc_url: str = Field("https://api.devnet.solana.com", alias="SOLVEX_SOLANA_RPC_URL")
    vault_program_id: str = Field(
        "8oi1inxaWoWmY7FjEEERuCdbGdCQpfgAg2KHyXFYAkP8",
        alias="SOLVEX_VAULT_PROGRAM_ID",
    )
    agent_keypair_path: str = Field(
        "chain/target/deploy/solvex-agent-keypair.json",
        alias="SOLVEX_AGENT_KEYPAIR_PATH",
    )
    jupiter_api_key: str | None = Field(None, alias="JUPITER_API_KEY")
    jupiter_api_url: str = Field("https://api.jup.ag", alias="SOLVEX_JUPITER_API_URL")
    execution_enabled: bool = Field(False, alias="SOLVEX_EXECUTION_ENABLED")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

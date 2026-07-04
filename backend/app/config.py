from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    frontend_origin: str = "http://localhost:3000"

    # Supabase (fill in from your project's API settings)
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Claude API
    anthropic_api_key: str = ""


settings = Settings()

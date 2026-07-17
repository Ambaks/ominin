from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "extra": "ignore"}

    supabase_url: str
    supabase_service_role_key: str
    anthropic_api_key: str
    deepgram_api_key: str

    work_dir: str = "jobs"
    judge_model: str = "claude-sonnet-4-20250514"
    classify_model: str = "claude-haiku-4-5-20251001"
    max_clips: int = 8


def load_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]

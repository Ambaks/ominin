from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    frontend_origin: str = "http://localhost:3000"

    # Supabase (fill in from your project's API settings)
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Claude — one of the two. The OAuth token (from `claude setup-token`)
    # bills the Claude Code subscription and is the intended mode; an API
    # key bills pay-per-use. Locally, with neither set, the machine's
    # `claude` login is used.
    claude_code_oauth_token: str = ""
    anthropic_api_key: str = ""

    # Outreach agent — shared secret required on every /agent/* trigger.
    agent_trigger_secret: str = ""

    # Google Places API (New)
    google_places_api_key: str = ""
    outreach_cities: str = "Montpellier,Toulouse"
    outreach_search_query: str = "restaurant"
    discovery_max_pages_per_city: int = 3

    # Gmail (OAuth refresh token from scripts/gmail_auth.py)
    gmail_client_id: str = ""
    gmail_client_secret: str = ""
    gmail_refresh_token: str = ""
    gmail_sender_email: str = "omininsupport@gmail.com"
    gmail_sender_name: str = "Léa Moreau"

    # Claude model used for qualification, cold emails and reply drafts.
    outreach_model: str = "claude-opus-5"

    # Batching / limits. Every job must finish well under Render free tier's
    # 15-minute idle spin-down window; batch sizes are the mitigation.
    outreach_daily_limit: int = 25
    outreach_send_delay_seconds: int = 45
    enrichment_batch_size: int = 30
    compose_batch_size: int = 10
    inbox_max_messages: int = 50
    inbox_lookback_days: int = 7
    # A 'running' run younger than this blocks a new run of the same job;
    # older ones are presumed killed (Render spin-down) and marked failed.
    run_stale_minutes: int = 30
    # Abort a batch after this many consecutive per-item failures: a
    # systematic outage (Claude rate limit exhausted, network down) must not
    # burn through the whole batch retrying a lost cause.
    max_consecutive_errors: int = 3

    # Website scraping (enrichment)
    places_timeout_seconds: int = 30
    scrape_timeout_seconds: int = 10
    scrape_max_extra_pages: int = 2
    qualify_excerpt_chars: int = 3000

    # Digital-menu provider fingerprints: a website linking to any of these
    # domains means the restaurant already has a QR/online menu solution.
    qr_menu_provider_domains: str = (
        "zenchef.com,sundayapp.com,tastycloud.fr,obypay.com,deliverect.com,"
        "dood.com,tabesto.com,innovorder.fr,menu.ominin.com"
    )

    # Unsubscribe link (CNIL). The same secret must be set in Vercel as
    # OUTREACH_UNSUBSCRIBE_SECRET for the Next.js route to verify tokens.
    outreach_unsubscribe_secret: str = ""
    outreach_unsubscribe_base_url: str = "https://ominin.com/api/desinscription"

    # Testing safety valve: when set, every outbound email goes to this
    # address instead of the real recipient.
    outreach_redirect_to: str = ""


settings = Settings()

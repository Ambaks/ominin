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

    # Google Places API (New). Text Search caps at ~60 results per query, so
    # coverage comes from query variety — terms × quartiers × villes — rotated
    # a few combinations per nightly run, least recently served first. A query
    # yielding zero new restaurants discovery_query_max_empty times in a row
    # is retired (state in outreach_discovery_queries).
    google_places_api_key: str = ""
    outreach_cities: str = "Montpellier,Toulouse"
    discovery_query_terms: str = (
        "restaurant,pizzeria,brasserie,bistrot,crêperie,restaurant italien,"
        "restaurant japonais,restaurant asiatique,restaurant indien,burger"
    )
    # "Ville:Quartier|Quartier;Ville:…" — joués en plus des requêtes ville
    # entière.
    discovery_neighborhoods: str = (
        "Montpellier:Écusson|Beaux-Arts|Boutonnet|Port Marianne|Antigone|"
        "Figuerolles|Les Arceaux;"
        "Toulouse:Capitole|Carmes|Saint-Cyprien|Saint-Michel|Saint-Aubin|"
        "Les Chalets|Jeanne d'Arc"
    )
    discovery_queries_per_run: int = 20
    discovery_query_max_empty: int = 2
    discovery_max_pages_per_query: int = 5

    # Gmail (OAuth refresh token from scripts/gmail_auth.py)
    gmail_client_id: str = ""
    gmail_client_secret: str = ""
    gmail_refresh_token: str = ""
    gmail_sender_email: str = "omininsupport@gmail.com"
    gmail_sender_name: str = "Léa Moreau"

    # Claude model used for qualification, cold emails and reply drafts.
    outreach_model: str = "claude-opus-5"

    # Batching / limits. Each outreach run composes and sends up to the full
    # daily cap in one pass; remaining cron runs that day exit immediately.
    # Gmail's consumer ceiling (~500 recipients/day) is shared with replies —
    # when raising the cap, ramp via env week by week; never jump a fresh
    # mailbox straight up.
    outreach_daily_limit: int = 100
    outreach_run_batch_size: int = 100
    outreach_send_delay_seconds: int = 12
    # Nightly qualification budget (one Claude call per prospect) — sized to
    # keep the qualified pool ahead of outreach_daily_limit, given that a
    # share of prospects disqualifies (no email, already digital…).
    enrichment_batch_size: int = 150
    inbox_max_messages: int = 50
    inbox_lookback_days: int = 7
    # A 'running' run younger than this blocks a new run of the same job;
    # older ones are presumed killed (Render spin-down) and marked failed.
    run_stale_minutes: int = 60
    # Render free tier spins the service down after 15 min without inbound
    # HTTP; a full compose+send batch runs longer than that. When set to the
    # service's own public /health URL, long loops self-ping it on this
    # interval so the instance stays awake for the whole run. Empty = off.
    keepalive_url: str = ""
    keepalive_interval_seconds: int = 480

    # Operator alerts (hot reply, failed run, silently-cancelled send). Both
    # channels are optional and independent: a private ntfy topic delivers
    # phone push, the alert email rides the existing Gmail client. Empty =
    # silent.
    ntfy_url: str = "https://ntfy.sh"
    ntfy_topic: str = ""
    operator_alert_email: str = ""
    # Timeout for the app's own best-effort HTTP calls (keepalive, ntfy).
    internal_http_timeout_seconds: int = 10
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

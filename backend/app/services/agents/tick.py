"""Hourly tick of the Agents product: every activated agent, one turn each.

Least recently run first, each step bounded (agents_batch_size), so one
agent's backlog never starves the others. A paused agent still reads its
inbox and sends the replies its client approved — pausing stops prospecting,
not conversations already under way. An incomplete profile gets the inbox
only too: prospecting needs the offer, the targets and the zone.
"""

from datetime import UTC, datetime

from google.auth.exceptions import RefreshError

from app.clients import gmail
from app.clients.supabase import get_supabase
from app.config import settings
from app.prompts.agents import sender_header
from app.services import keepalive
from app.services.agents import discovery, enrichment, inbox, outreach
from app.services.agents.mailing import Agent

# Read-only on the inbox: the agent never labels, archives nor deletes.
GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
]

RECONNECT_ERROR = "Google a refusé l'accès à la boîte : reconnectez Gmail."


def run_tick(*, flush=None) -> dict:
    sb = get_supabase()
    profiles = (
        sb.table("agents_profiles")
        .select("*")
        .not_.is_("activated_at", "null")
        .order("last_run_at", desc=False, nullsfirst=True)
        .execute()
    ).data

    stats = {"agents": 0, "no_mailbox": 0, "errors": 0}
    for profile in profiles:
        keepalive.ping_if_due()
        agent = _load(sb, profile)
        if agent is None:
            stats["no_mailbox"] += 1
            continue
        if _run_agent(sb, agent):
            stats["errors"] += 1
        stats["agents"] += 1
        if flush:
            flush(stats)
    return stats


def prospecting(profile: dict) -> bool:
    return bool(
        profile["enabled"]
        and profile["company_name"]
        and profile["sender_name"]
        and profile["offer"]
        and profile["targets"]
        and profile["cities"]
    )


def _load(sb, profile: dict) -> Agent | None:
    """The agent with a live Gmail client, or None when its mailbox is
    missing or already known to be refused. Fetching the profile forces the
    token refresh here, so a revoked grant is caught before any work."""
    user_id = profile["user_id"]
    mailbox = (
        sb.table("agents_mailboxes")
        .select("email, error")
        .eq("user_id", user_id)
        .execute()
    ).data
    token = (
        sb.table("agents_mailbox_tokens")
        .select("refresh_token")
        .eq("user_id", user_id)
        .execute()
    ).data
    if not mailbox or not token or mailbox[0]["error"]:
        return None

    service = gmail.build_service(
        token[0]["refresh_token"],
        settings.agents_gmail_client_id,
        settings.agents_gmail_client_secret,
        GMAIL_SCOPES,
    )
    try:
        gmail.profile(service=service)
    except RefreshError:
        sb.table("agents_mailboxes").update({"error": RECONNECT_ERROR}).eq(
            "user_id", user_id
        ).execute()
        return None
    email = mailbox[0]["email"]
    return Agent(
        profile=profile,
        email=email,
        sender=sender_header(profile, email),
        service=service,
    )


def _run_agent(sb, agent: Agent) -> bool:
    """One turn; returns whether it failed. The outcome lands on the profile,
    where the client's dashboard reads it."""
    stats: dict = {}
    error = None
    try:
        stats["inbox"] = inbox.run(sb, agent)
        if prospecting(agent.profile):
            stats["enrich"] = enrichment.run(sb, agent)
            stats["discover"] = discovery.run(sb, agent)
            stats["outreach"] = outreach.run(sb, agent)
    except Exception as exc:  # noqa: BLE001 — reported on the profile
        error = f"{type(exc).__name__}: {exc}"

    sb.table("agents_profiles").update(
        {
            "last_run_at": datetime.now(UTC).isoformat(),
            "last_run_stats": stats,
            "last_error": error,
        }
    ).eq("user_id", agent.user_id).execute()
    return error is not None

"""Outreach: cold emails in the client's name, sent inside his window.

Automatic mode composes exactly what is due this tick and sends it. Approval
mode keeps a queue of drafts up to one day's limit (composed at any hour,
so the client finds them ready) and sends what he approved. Either way the
day's remaining quota is spread evenly over the hours left in the window —
a steady trickle, not a morning burst.
"""

import math
from datetime import datetime

from app.clients.claude import parse_structured
from app.config import settings
from app.prompts.agents import cold_email_rules, persona
from app.prompts.cold_email import ColdEmail
from app.services import keepalive
from app.services.agents import mailing
from app.services.agents.mailing import Agent
from app.services.emailing import EMAIL_RE, PARIS

OPEN_STATUSES = ["pending_approval", "approved", "sending"]


def sends_due(profile: dict, sent_today: int, now: datetime) -> int:
    """Cold emails to send this tick (now in Paris time); zero outside the
    window."""
    if now.isoweekday() not in profile["send_days"]:
        return 0
    if not profile["send_start_hour"] <= now.hour < profile["send_end_hour"]:
        return 0
    quota = profile["daily_limit"] - sent_today
    if quota <= 0:
        return 0
    return math.ceil(quota / (profile["send_end_hour"] - now.hour))


def run(sb, agent: Agent) -> dict:
    profile = agent.profile
    due = sends_due(
        profile, mailing.daily_cold_count(sb, agent.user_id), datetime.now(PARIS)
    )
    open_rows = (
        sb.table("agents_emails")
        .select("prospect_id, status")
        .eq("user_id", agent.user_id)
        .eq("direction", "outbound")
        .eq("kind", "cold")
        .in_("status", OPEN_STATUSES)
        .execute()
    ).data

    if profile["mode"] == "auto":
        waiting = sum(1 for row in open_rows if row["status"] == "approved")
        to_compose = min(due, settings.agents_batch_size) - waiting
        status = "approved"
    else:
        to_compose = min(profile["daily_limit"] - len(open_rows), settings.agents_batch_size)
        status = "pending_approval"

    stats = {"composed": 0, "skipped": 0}
    if to_compose > 0:
        _compose(sb, agent, to_compose, status, {row["prospect_id"] for row in open_rows}, stats)
    if due:
        stats.update(mailing.send_approved(sb, agent, "cold", due))
    return stats


def _compose(
    sb, agent: Agent, to_compose: int, status: str, queued: set[str], stats: dict
) -> None:
    candidates = (
        sb.table("agents_prospects")
        .select("id, name, category, city, email, ai_notes")
        .eq("user_id", agent.user_id)
        .eq("status", "qualified")
        .order("created_at")
        .limit(to_compose + len(queued))
        .execute()
    ).data
    system = f"{persona(agent.profile)}\n\n{cold_email_rules(agent.profile)}"

    consecutive = 0
    for prospect in candidates:
        if stats["composed"] >= to_compose:
            break
        if prospect["id"] in queued:
            continue
        keepalive.ping_if_due()
        if not _eligible(sb, agent, prospect):
            stats["skipped"] += 1
            continue
        facts = "\n".join(
            [
                f"Entreprise : {prospect['name']}",
                f"Ville : {prospect.get('city') or 'inconnue'}",
                f"Activité (recherche qui l'a trouvée) : {prospect['category']}",
                f"Notes : {prospect.get('ai_notes') or 'aucune'}",
            ]
        )
        try:
            email = parse_structured(system, facts, ColdEmail)
        except Exception as exc:  # noqa: BLE001 — retried on the next tick
            stats["skipped"] += 1
            stats["last_error"] = f"{type(exc).__name__}: {exc}"
            consecutive += 1
            if consecutive >= settings.max_consecutive_errors:
                stats["aborted"] = "consecutive errors — systematic failure"
                return
            continue
        consecutive = 0
        sb.table("agents_emails").insert(
            {
                "user_id": agent.user_id,
                "prospect_id": prospect["id"],
                "direction": "outbound",
                "kind": "cold",
                "status": status,
                "to_email": prospect["email"],
                "from_email": agent.email,
                "subject": email.subject,
                "body_text": agent.body(email.body, prospect["id"]),
                "metadata": {"model": settings.outreach_model},
            }
        ).execute()
        stats["composed"] += 1


def _eligible(sb, agent: Agent, prospect: dict) -> bool:
    """One cold email per address, ever, and never to an opposed one.
    A prospect that fails either check is retired so it is not refetched."""
    email = prospect.get("email") or ""

    def retire(update: dict) -> bool:
        sb.table("agents_prospects").update(update).eq("id", prospect["id"]).execute()
        return False

    if not EMAIL_RE.fullmatch(email):
        return retire({"status": "no_email", "email": None, "disqualify_reason": "invalid_email"})
    if mailing.is_suppressed(sb, agent.user_id, email):
        return retire({"status": "disqualified", "disqualify_reason": "suppressed"})
    prior = (
        sb.table("agents_emails")
        .select("id")
        .eq("user_id", agent.user_id)
        .eq("direction", "outbound")
        .eq("to_email", email)
        .in_("status", [*OPEN_STATUSES, "sent"])
        .limit(1)
        .execute()
    ).data
    if prior:
        return retire({"status": "disqualified", "disqualify_reason": "duplicate_email"})
    return True

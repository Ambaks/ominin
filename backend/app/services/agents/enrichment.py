"""Enrichment: find the prospect's address on its website (Léa's scraper),
then have Claude judge it against the client's offer and targets.

Two phases, as in Léa's enrichment: scrapes run concurrently (pure I/O),
Claude calls one at a time — only for prospects the scrape left open.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime

from app.clients.claude import parse_structured
from app.config import settings
from app.prompts.agents import Qualification, qualify_system
from app.services import keepalive
from app.services.agents.mailing import Agent, is_suppressed
from app.services.enrichment import WEBMAIL_RE, fetch_site, pick_email


def run(sb, agent: Agent) -> dict:
    stats = {"processed": 0, "qualified": 0, "disqualified": 0, "no_email": 0, "errors": 0}
    pending = (
        sb.table("agents_prospects")
        .select("id, name, category, city, phone, website")
        .eq("user_id", agent.user_id)
        .eq("status", "pending")
        .order("created_at")
        .limit(settings.agents_batch_size)
        .execute()
    ).data

    undecided: list[dict] = []
    with ThreadPoolExecutor(max_workers=settings.enrichment_workers) as pool:
        futures = [pool.submit(_scrape, sb, agent, p) for p in pending]
        for future in as_completed(futures):
            keepalive.ping_if_due()
            try:
                prepared = future.result()
            except Exception as exc:  # noqa: BLE001 — stays pending, retried next tick
                stats["errors"] += 1
                stats["last_error"] = f"{type(exc).__name__}: {exc}"
                continue
            if prepared["verdict"]:
                _record(sb, prepared, *prepared["verdict"], None, stats)
            else:
                undecided.append(prepared)

    consecutive = 0
    for prepared in undecided:
        keepalive.ping_if_due()
        try:
            verdict = _qualify(agent, prepared)
        except Exception as exc:  # noqa: BLE001 — stays pending, retried next tick
            stats["errors"] += 1
            stats["last_error"] = f"{type(exc).__name__}: {exc}"
            consecutive += 1
            if consecutive >= settings.max_consecutive_errors:
                stats["aborted"] = "consecutive errors — systematic failure"
                break
            continue
        consecutive = 0
        notes = f"{verdict.ai_notes}\n\nAngle : {verdict.angle}"
        if verdict.worth_contacting:
            _record(sb, prepared, "qualified", None, notes, stats)
        else:
            _record(sb, prepared, "disqualified", "not_worth", notes, stats)

    return stats


def _scrape(sb, agent: Agent, prospect: dict) -> dict:
    site = fetch_site(prospect["website"]) if prospect.get("website") else None
    email = None
    if site:
        email = pick_email(site["emails"], site["embedded_emails"], prospect["website"])
        if email and _shared_domain(sb, email, prospect["id"]):
            email = None

    if not email:
        reason = "contact_form" if site and site["has_contact_form"] else "no_email"
        verdict = ("no_email", reason)
    elif is_suppressed(sb, agent.user_id, email):
        verdict = ("disqualified", "suppressed")
    else:
        verdict = None
    return {"prospect": prospect, "site": site, "email": email, "verdict": verdict}


def _shared_domain(sb, email: str, prospect_id: str) -> bool:
    """A non-consumer domain already stored for several other prospects —
    of any agent — is a platform or a web agency riding on their sites
    (same rule as Léa's, see email_shared_domain_max)."""
    if WEBMAIL_RE.search(email):
        return False
    domain = email.rsplit("@", 1)[-1]
    count = (
        sb.table("agents_prospects")
        .select("id", count="exact")
        .ilike("email", f"%@{domain}")
        .neq("id", prospect_id)
        .limit(1)
        .execute()
    ).count or 0
    return count >= settings.email_shared_domain_max


def _qualify(agent: Agent, prepared: dict) -> Qualification:
    prospect = prepared["prospect"]
    content = "\n".join(
        [
            f"Nom : {prospect['name']}",
            f"Ville : {prospect.get('city') or 'inconnue'}",
            f"Trouvée par la recherche : {prospect['category']}",
            f"Site web : {prospect.get('website') or 'aucun'}",
            f"Téléphone : {prospect.get('phone') or 'inconnu'}",
        ]
    )
    content += f"\n\nExtrait du site web :\n{prepared['site']['text']}"
    return parse_structured(qualify_system(agent.profile), content, Qualification)


def _record(
    sb,
    prepared: dict,
    status: str,
    reason: str | None,
    ai_notes: str | None,
    stats: dict,
) -> None:
    sb.table("agents_prospects").update(
        {
            "status": status,
            "disqualify_reason": reason,
            "email": prepared["email"],
            "ai_notes": ai_notes,
            "enriched_at": datetime.now(UTC).isoformat(),
        }
    ).eq("id", prepared["prospect"]["id"]).eq(
        # The client may have excluded it meanwhile: never overwrite that.
        "status", "pending"
    ).execute()
    stats["processed"] += 1
    stats[status] += 1

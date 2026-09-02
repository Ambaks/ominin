from app.clients.claude import parse_structured
from app.clients.supabase import get_supabase
from app.config import settings
from app.prompts.cold_email import COLD_EMAIL_RULES, ColdEmail
from app.prompts.persona import LEA_PERSONA, build_email_body
from app.services import emailing, keepalive
from app.services.inbox import sweep_bounces
from app.services.tokens import unsubscribe_url


def run_outreach(*, flush=None) -> dict:
    sb = get_supabase()
    bounce_stats = sweep_bounces()
    sent_today = emailing.daily_cold_count()
    quota = settings.outreach_daily_limit - sent_today
    stats = {"composed": 0, "skipped": 0, "bounces_cleared": bounce_stats["bounces"]}
    if quota <= 0:
        return {**stats, "sent": 0, "note": "daily limit reached"}

    to_compose = min(quota, settings.outreach_run_batch_size)
    candidates = (
        sb.table("outreach_prospects")
        .select(
            "restaurant_id, ai_notes,"
            " crm_restaurants(id, name, city, category, cuisine, email, website, deleted_at)"
        )
        .eq("qualification", "qualified")
        .order("priority_score", desc=True, nullsfirst=False)
        .order("created_at")
        .execute()
    ).data

    rotation = _rotation(sb)
    consecutive = 0
    for prospect in candidates:
        if stats["composed"] >= to_compose:
            break
        keepalive.ping_if_due()
        restaurant = prospect.get("crm_restaurants")
        if not restaurant or restaurant.get("deleted_at") or not restaurant.get("email"):
            stats["skipped"] += 1
            continue
        if not emailing.EMAIL_RE.fullmatch(restaurant["email"]):
            # Gmail would reject it ("Invalid To header") after a Claude call
            # was spent composing — and again every run, since a failed send
            # is not a contact. Drop the address and re-scrape instead.
            sb.table("crm_restaurants").update({"email": None}).eq(
                "id", restaurant["id"]
            ).execute()
            sb.table("outreach_prospects").update({"qualification": "pending"}).eq(
                "restaurant_id", restaurant["id"]
            ).execute()
            sb.table("crm_leads").update({"status": "new"}).eq(
                "restaurant_id", restaurant["id"]
            ).eq("status", "to_contact").execute()
            stats["skipped"] += 1
            continue
        if not _eligible(sb, restaurant):
            stats["skipped"] += 1
            continue
        try:
            # Offset by today's sends so the round-robin continues across the
            # day's runs instead of restarting at the control each time.
            variant = rotation[(sent_today + stats["composed"]) % len(rotation)]
            _compose_one(sb, restaurant, prospect.get("ai_notes"), variant)
            stats["composed"] += 1
            consecutive = 0
        except Exception as exc:  # noqa: BLE001 — retried on the next run
            stats["skipped"] += 1
            stats["last_error"] = f"{type(exc).__name__}: {exc}"
            consecutive += 1
            if consecutive >= settings.max_consecutive_errors:
                stats["aborted"] = "consecutive errors — systematic failure"
                break

    if flush:
        flush(stats)

    send_stats = emailing.send_approved_batch(
        kinds=["cold"], cold_cap=settings.outreach_run_batch_size
    )
    return {**stats, **send_stats}


def _eligible(sb, restaurant: dict) -> bool:
    """One cold email per restaurant — and per address — ever; fresh leads only.

    Per address too: a group's shared inbox (a chain, a family of
    restaurants) is pitched once, not once per location. Only rows
    representing a real delivery (or one still in flight) count as prior
    contact: a 'failed'/'cancelled' row means nothing ever reached the
    owner, so a transient Gmail error must not burn the restaurant forever."""
    if emailing.is_suppressed(restaurant["email"]):
        # Suppression arrived after qualification — retire the prospect so
        # the compose query stops refetching it every run.
        sb.table("outreach_prospects").update(
            {"qualification": "disqualified", "disqualify_reason": "suppressed"}
        ).eq("restaurant_id", restaurant["id"]).execute()
        return False
    prior = (
        sb.table("outreach_emails")
        .select("id, status")
        .or_(f"restaurant_id.eq.{restaurant['id']},to_email.eq.{restaurant['email']}")
        .eq("direction", "outbound")
        .in_("status", ["approved", "pending_approval", "sending", "sent"])
        .limit(1)
        .execute()
    ).data
    if prior:
        if prior[0]["status"] in ("sending", "sent"):
            # Row sent before the 'contacted' verdict existed — retire the
            # prospect now instead of re-evaluating it every run.
            sb.table("outreach_prospects").update(
                {"qualification": "contacted"}
            ).eq("restaurant_id", restaurant["id"]).execute()
        return False
    lead = _lead(sb, restaurant["id"])
    return bool(lead) and lead["status"] in ("new", "to_contact")


def _lead(sb, restaurant_id: str) -> dict | None:
    rows = (
        sb.table("crm_leads")
        .select("id, status")
        .eq("restaurant_id", restaurant_id)
        .execute()
    ).data
    return rows[0] if rows else None


def _rotation(sb) -> list[dict]:
    """Prompt rules served round-robin this run, control group first.

    The control is the promoted 'baseline' row when one exists, else the
    hardcoded rules (no variant_id). It stays in rotation next to the active
    variants so AutoResearch measures their reply rates over the same weeks
    and the same prospect pool. Read once per run: a variant activated or
    retired in the admin takes effect on the next run."""
    rows = (
        sb.table("outreach_variants")
        .select("id, status, prompt_rules")
        .in_("status", ["baseline", "active"])
        .order("created_at")
        .execute()
    ).data
    control = next((r for r in rows if r["status"] == "baseline"), None) or {
        "id": None,
        "prompt_rules": COLD_EMAIL_RULES,
    }
    return [control, *(r for r in rows if r["status"] == "active")]


def _compose_one(sb, restaurant: dict, ai_notes: str | None, variant: dict) -> None:
    facts = [
        f"Nom : {restaurant['name']}",
        f"Ville : {restaurant.get('city') or 'inconnue'}",
        f"Catégorie : {restaurant.get('category')}",
        f"Cuisine : {restaurant.get('cuisine') or 'inconnue'}",
        f"Notes de personnalisation : {ai_notes or 'aucune'}",
    ]
    email = parse_structured(
        f"{LEA_PERSONA}\n\n{variant['prompt_rules']}", "\n".join(facts), ColdEmail
    )

    lead = _lead(sb, restaurant["id"])
    metadata: dict = {"model": settings.outreach_model}
    if variant["id"]:
        metadata["variant_id"] = variant["id"]

    sb.table("outreach_emails").insert(
        {
            "restaurant_id": restaurant["id"],
            "lead_id": lead["id"] if lead else None,
            "direction": "outbound",
            "kind": "cold",
            # Cold emails are auto-approved by design; the human gate is on
            # replies.
            "status": "approved",
            "to_email": restaurant["email"],
            "from_email": settings.gmail_sender_email,
            "subject": email.subject,
            "body_text": build_email_body(email.body, unsubscribe_url(restaurant["id"])),
            "metadata": metadata,
        }
    ).execute()

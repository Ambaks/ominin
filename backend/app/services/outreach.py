from app.clients.claude import parse_structured
from app.clients.supabase import get_supabase
from app.config import settings
from app.prompts.cold_email import COLD_EMAIL_RULES, ColdEmail
from app.prompts.persona import LEA_PERSONA, build_email_body
from app.services import emailing
from app.services.tokens import unsubscribe_url


def run_outreach() -> dict:
    sb = get_supabase()
    quota = settings.outreach_daily_limit - emailing.daily_cold_count()
    stats = {"composed": 0, "skipped": 0}
    if quota <= 0:
        return {**stats, "sent": 0, "note": "daily limit reached"}

    to_compose = min(quota, settings.compose_batch_size)
    candidates = (
        sb.table("outreach_prospects")
        .select(
            "restaurant_id, ai_notes,"
            " crm_restaurants(id, name, city, category, cuisine, email, website, deleted_at)"
        )
        .eq("qualification", "qualified")
        .order("created_at")
        .execute()
    ).data

    for prospect in candidates:
        if stats["composed"] >= to_compose:
            break
        restaurant = prospect.get("crm_restaurants")
        if not restaurant or restaurant.get("deleted_at") or not restaurant.get("email"):
            stats["skipped"] += 1
            continue
        if not _eligible(sb, restaurant):
            stats["skipped"] += 1
            continue
        try:
            _compose_one(sb, restaurant, prospect.get("ai_notes"))
            stats["composed"] += 1
        except Exception:  # noqa: BLE001 — retried on the next run
            stats["skipped"] += 1

    send_stats = emailing.send_approved_batch(kinds=["cold"])
    return {**stats, **send_stats}


def _eligible(sb, restaurant: dict) -> bool:
    """One cold email per restaurant, ever — and only fresh leads."""
    if emailing.is_suppressed(restaurant["email"]):
        return False
    prior = (
        sb.table("outreach_emails")
        .select("id")
        .eq("restaurant_id", restaurant["id"])
        .eq("direction", "outbound")
        .limit(1)
        .execute()
    ).data
    if prior:
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


def _compose_one(sb, restaurant: dict, ai_notes: str | None) -> None:
    facts = [
        f"Nom : {restaurant['name']}",
        f"Ville : {restaurant.get('city') or 'inconnue'}",
        f"Catégorie : {restaurant.get('category')}",
        f"Cuisine : {restaurant.get('cuisine') or 'inconnue'}",
        f"Notes de personnalisation : {ai_notes or 'aucune'}",
    ]
    email = parse_structured(
        f"{LEA_PERSONA}\n\n{COLD_EMAIL_RULES}", "\n".join(facts), ColdEmail
    )

    lead = _lead(sb, restaurant["id"])
    # Cold emails are auto-approved by design; the human gate is on replies.
    sb.table("outreach_emails").insert(
        {
            "restaurant_id": restaurant["id"],
            "lead_id": lead["id"] if lead else None,
            "direction": "outbound",
            "kind": "cold",
            "status": "approved",
            "to_email": restaurant["email"],
            "from_email": settings.gmail_sender_email,
            "subject": email.subject,
            "body_text": build_email_body(email.body, unsubscribe_url(restaurant["id"])),
            "metadata": {"model": settings.outreach_model},
        }
    ).execute()

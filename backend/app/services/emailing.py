import re
import time
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from app.clients import gmail
from app.clients.supabase import get_supabase
from app.config import settings
from app.services import keepalive, notify
from app.services.tokens import unsubscribe_url

PARIS = ZoneInfo("Europe/Paris")
# ASCII only: Gmail rejects accented local parts with "Invalid To header",
# and a scraped placeholder ('#', 'utilisateur@domaine.com') must never be
# stored as an address — the shared gate for the scraper and the sender.
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")


def daily_cold_count() -> int:
    """Cold emails already sent today, Paris time (the cap's clock)."""
    start_of_day = (
        datetime.now(PARIS)
        .replace(hour=0, minute=0, second=0, microsecond=0)
        .astimezone(UTC)
    )
    result = (
        get_supabase()
        .table("outreach_emails")
        .select("id", count="exact")
        .eq("direction", "outbound")
        .eq("kind", "cold")
        .eq("status", "sent")
        .gte("sent_at", start_of_day.isoformat())
        .execute()
    )
    return result.count or 0


def is_suppressed(email: str) -> bool:
    result = (
        get_supabase()
        .table("outreach_suppressions")
        .select("email")
        .eq("email", email.lower())
        .execute()
    )
    return bool(result.data)


def add_suppression(email: str, reason: str, restaurant_id: str | None) -> None:
    get_supabase().table("outreach_suppressions").upsert(
        {"email": email.lower(), "reason": reason, "restaurant_id": restaurant_id},
        on_conflict="email",
        ignore_duplicates=True,
    ).execute()


def log_email_activity(
    restaurant_id: str,
    lead_id: str | None,
    title: str,
    description: str | None,
    metadata: dict,
) -> None:
    get_supabase().table("crm_activities").insert(
        {
            "restaurant_id": restaurant_id,
            "lead_id": lead_id,
            "type": "email",
            "title": title,
            "description": description,
            "metadata": metadata,
        }
    ).execute()


def send_approved_batch(kinds: list[str], cold_cap: int | None = None) -> dict:
    """Send every approved outbound email of the given kinds, oldest first.

    cold_cap bounds the cold sends of THIS run below the daily quota, so the
    2-hourly outreach runs spread the daily volume over the day instead of
    draining it in one batch.

    At-most-once fence: a row is flipped to 'sending' before the Gmail call;
    if the process dies mid-send, the next run closes it as failed instead of
    resending (a Render kill must never double-send)."""
    sb = get_supabase()
    stats = {"sent": 0, "failed": 0, "cancelled": 0}

    stuck = (
        sb.table("outreach_emails")
        .update({"status": "failed", "error": "interrupted: process died mid-send"})
        .eq("status", "sending")
        .execute()
    )
    stats["failed"] += len(stuck.data)

    quota = settings.outreach_daily_limit - daily_cold_count()
    if cold_cap is not None:
        quota = min(quota, cold_cap)
    rows = (
        sb.table("outreach_emails")
        .select("*")
        .eq("direction", "outbound")
        .eq("status", "approved")
        .in_("kind", kinds)
        .order("created_at")
        .execute()
    ).data

    first = True
    consecutive = 0
    for row in rows:
        if row["kind"] == "cold":
            if quota <= 0:
                continue
            quota -= 1
        keepalive.ping_if_due()
        if not first:
            time.sleep(settings.outreach_send_delay_seconds)
        first = False
        sent_before = stats["sent"]
        _send_one(sb, row, stats)
        if stats["sent"] == sent_before:
            consecutive += 1
            if consecutive >= settings.max_consecutive_errors:
                # Gmail outage: stop here so untouched rows stay 'approved'
                # and go out on the next hourly run.
                stats["aborted"] = "consecutive errors — systematic failure"
                break
        else:
            consecutive = 0

    return stats


def _send_one(sb, row: dict, stats: dict) -> None:
    if is_suppressed(row["to_email"] or ""):
        sb.table("outreach_emails").update(
            {"status": "cancelled", "error": "suppressed"}
        ).eq("id", row["id"]).execute()
        stats["cancelled"] += 1
        if row["kind"] == "reply":
            # A human approved this reply believing it would go out — a
            # silent cancellation here is a warm conversation dying unseen.
            notify.send(
                "Léa — réponse approuvée NON envoyée (adresse désinscrite)",
                f"Destinataire : {row['to_email']}\n"
                f"Objet : {row.get('subject') or ''}\n\n"
                f"{settings.frontend_origin}/admin/emails",
            )
        return

    # The fence — guard on status so a concurrent approval-flip can't race.
    fenced = (
        sb.table("outreach_emails")
        .update({"status": "sending"})
        .eq("id", row["id"])
        .eq("status", "approved")
        .execute()
    )
    if not fenced.data:
        return

    headers = {
        "List-Unsubscribe": f"<{unsubscribe_url(row['restaurant_id'])}>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    }
    thread_id = row.get("gmail_thread_id")
    if row.get("in_reply_to"):
        inbound = (
            sb.table("outreach_emails")
            .select("metadata")
            .eq("id", row["in_reply_to"])
            .execute()
        ).data
        message_id = (inbound[0].get("metadata") or {}).get("message_id_header") if inbound else None
        if message_id:
            headers["In-Reply-To"] = message_id
            headers["References"] = message_id

    to_email = settings.outreach_redirect_to or row["to_email"]
    try:
        sent = gmail.send(
            to=to_email,
            subject=row["subject"] or "",
            body=row["body_text"] or "",
            headers=headers,
            thread_id=thread_id,
        )
    except Exception as exc:  # noqa: BLE001 — the row records the failure
        sb.table("outreach_emails").update(
            {"status": "failed", "error": f"{type(exc).__name__}: {exc}"}
        ).eq("id", row["id"]).execute()
        stats["failed"] += 1
        stats["last_error"] = f"{type(exc).__name__}: {exc}"
        return

    now = datetime.now(UTC).isoformat()
    sb.table("outreach_emails").update(
        {
            "status": "sent",
            "sent_at": now,
            "from_email": settings.gmail_sender_email,
            "gmail_message_id": sent.get("id"),
            "gmail_thread_id": sent.get("threadId"),
        }
    ).eq("id", row["id"]).execute()
    stats["sent"] += 1

    if row.get("lead_id"):
        sb.table("crm_leads").update({"last_contact_at": now}).eq(
            "id", row["lead_id"]
        ).execute()
        if row["kind"] == "cold":
            # Guarded: never regress a lead a human already moved forward.
            sb.table("crm_leads").update({"status": "contacted"}).eq(
                "id", row["lead_id"]
            ).in_("status", ["new", "to_contact"]).execute()

    if row["kind"] == "cold":
        # Leave the 'qualified' pool: the compose query must only ever see
        # prospects still awaiting their cold email (see the 'contacted'
        # migration — unbounded qualified sets stall at PostgREST's row cap).
        sb.table("outreach_prospects").update({"qualification": "contacted"}).eq(
            "restaurant_id", row["restaurant_id"]
        ).execute()

    log_email_activity(
        row["restaurant_id"],
        row.get("lead_id"),
        "E-mail de prospection envoyé"
        if row["kind"] == "cold"
        else "Réponse envoyée",
        row.get("subject"),
        {
            "outreach_email_id": row["id"],
            "gmail_thread_id": sent.get("threadId"),
            "direction": "outbound",
            "kind": row["kind"],
        },
    )

import re
from datetime import UTC, datetime

from app.clients import gmail
from app.clients.claude import parse_structured
from app.clients.supabase import get_supabase
from app.config import settings
from app.prompts.inbox import INBOX_RULES, InboxVerdict
from app.prompts.persona import LEA_PERSONA, build_email_body
from app.services import emailing
from app.services.tokens import unsubscribe_url

BOUNCE_FROM_RE = re.compile(r"mailer-daemon@|postmaster@", re.IGNORECASE)
BOUNCE_SUBJECT_RE = re.compile(r"delivery status|undelivered|échec de la remise", re.IGNORECASE)

CLASSIFICATION_TITLES = {
    "interested": "Réponse reçue — intéressé",
    "meeting_request": "Réponse reçue — demande de RDV",
    "question": "Réponse reçue — question",
    "not_interested": "Réponse reçue — pas intéressé",
    "opt_out": "Réponse reçue — désinscription",
    "bounce": "E-mail non remis (bounce)",
    "other": "Réponse reçue",
}

# Statuses a positive reply may move a lead FROM — never regress a lead the
# human already advanced (visited, RDV fixé…).
INTERESTED_FROM = ["new", "to_contact", "contacted"]


def run_inbox() -> dict:
    sb = get_supabase()
    stats = {"ingested": 0, "classified": 0, "drafted": 0, "skipped": 0}

    send_stats = emailing.send_approved_batch(kinds=["cold", "reply"])

    for stub in gmail.list_inbox(
        newer_than_days=settings.inbox_lookback_days,
        max_results=settings.inbox_max_messages,
    ):
        try:
            _process_message(sb, stub, stats)
        except Exception:  # noqa: BLE001 — one bad message must not kill the run
            stats["skipped"] += 1

    return {**stats, **send_stats}


def _process_message(sb, stub: dict, stats: dict) -> None:
    already = (
        sb.table("outreach_emails")
        .select("id")
        .eq("gmail_message_id", stub["id"])
        .limit(1)
        .execute()
    ).data
    if already:
        return

    # Only threads the agent started: unrelated mail on the same inbox
    # (support, personal) is never touched.
    thread = (
        sb.table("outreach_emails")
        .select("id, restaurant_id, lead_id, to_email, subject")
        .eq("gmail_thread_id", stub["threadId"])
        .eq("direction", "outbound")
        .order("created_at", desc=True)
        .execute()
    ).data
    if not thread:
        stats["skipped"] += 1
        return
    outbound = thread[0]

    message = gmail.get_message(stub["id"])
    headers = gmail.extract_headers(message)
    body = gmail.extract_body_text(message).strip()
    received_at = datetime.fromtimestamp(
        int(message.get("internalDate", 0)) / 1000, tz=UTC
    ).isoformat()

    inbound = (
        sb.table("outreach_emails")
        .insert(
            {
                "restaurant_id": outbound["restaurant_id"],
                "lead_id": outbound["lead_id"],
                "direction": "inbound",
                "kind": "reply",
                "status": "received",
                "to_email": settings.gmail_sender_email,
                "from_email": headers.get("from"),
                "subject": headers.get("subject"),
                "body_text": body,
                "gmail_message_id": stub["id"],
                "gmail_thread_id": stub["threadId"],
                "received_at": received_at,
                "metadata": {"message_id_header": headers.get("message-id")},
            }
        )
        .execute()
    ).data[0]
    stats["ingested"] += 1

    verdict = _classify(sb, inbound, headers)
    sb.table("outreach_emails").update({"classification": verdict.classification}).eq(
        "id", inbound["id"]
    ).execute()
    stats["classified"] += 1

    _apply(sb, inbound, outbound, verdict, stats)

    emailing.log_email_activity(
        inbound["restaurant_id"],
        inbound["lead_id"],
        CLASSIFICATION_TITLES[verdict.classification],
        (body[:200] or None),
        {
            "outreach_email_id": inbound["id"],
            "gmail_thread_id": inbound["gmail_thread_id"],
            "direction": "inbound",
            "classification": verdict.classification,
        },
    )


def _classify(sb, inbound: dict, headers: dict) -> InboxVerdict:
    sender = headers.get("from", "")
    subject = headers.get("subject", "")
    if BOUNCE_FROM_RE.search(sender) or BOUNCE_SUBJECT_RE.search(subject):
        return InboxVerdict(classification="bounce", draft_subject=None, draft_body=None)

    history = (
        sb.table("outreach_emails")
        .select("direction, subject, body_text")
        .eq("gmail_thread_id", inbound["gmail_thread_id"])
        .neq("id", inbound["id"])
        .in_("status", ["sent", "received"])
        .order("created_at")
        .execute()
    ).data
    parts = [
        f"--- {'Léa (envoyé)' if m['direction'] == 'outbound' else 'Restaurateur (reçu)'} ---\n"
        f"Objet : {m.get('subject')}\n{m.get('body_text')}"
        for m in history
    ]
    parts.append(
        f"--- DERNIER MESSAGE REÇU (à classer) ---\n"
        f"De : {sender}\nObjet : {subject}\n{inbound.get('body_text')}"
    )

    # Raises on failure → the message stays unclassified, counted skipped.
    return parse_structured(
        f"{LEA_PERSONA}\n\n{INBOX_RULES}", "\n\n".join(parts), InboxVerdict
    )


def _apply(sb, inbound: dict, outbound: dict, verdict: InboxVerdict, stats: dict) -> None:
    lead_id = inbound.get("lead_id")
    classification = verdict.classification
    contact_email = (outbound.get("to_email") or "").lower()

    if classification in ("interested", "meeting_request", "question"):
        if lead_id:
            sb.table("crm_leads").update({"status": "interested"}).eq(
                "id", lead_id
            ).in_("status", INTERESTED_FROM).execute()
    elif classification == "not_interested":
        if lead_id:
            sb.table("crm_leads").update({"status": "not_interested"}).eq(
                "id", lead_id
            ).execute()
    elif classification == "opt_out":
        if contact_email:
            emailing.add_suppression(contact_email, "opt_out", inbound["restaurant_id"])
        sb.table("crm_restaurants").update(
            {"outreach_opted_out_at": datetime.now(UTC).isoformat()}
        ).eq("id", inbound["restaurant_id"]).execute()
        if lead_id:
            sb.table("crm_leads").update({"status": "not_interested"}).eq(
                "id", lead_id
            ).execute()
    elif classification == "bounce":
        sb.table("outreach_emails").update(
            {"status": "failed", "error": "bounced"}
        ).eq("id", outbound["id"]).execute()
        if contact_email:
            emailing.add_suppression(contact_email, "bounce", inbound["restaurant_id"])
        if lead_id:
            sb.table("crm_leads").update({"status": "to_contact"}).eq(
                "id", lead_id
            ).eq("status", "contacted").execute()

    if verdict.draft_body and classification in ("interested", "meeting_request", "question"):
        sb.table("outreach_emails").insert(
            {
                "restaurant_id": inbound["restaurant_id"],
                "lead_id": lead_id,
                "direction": "outbound",
                "kind": "reply",
                "status": "pending_approval",
                "to_email": outbound["to_email"],
                "from_email": settings.gmail_sender_email,
                "subject": verdict.draft_subject
                or f"Re: {outbound.get('subject') or ''}".strip(),
                "body_text": build_email_body(
                    verdict.draft_body, unsubscribe_url(inbound["restaurant_id"])
                ),
                "gmail_thread_id": inbound["gmail_thread_id"],
                "in_reply_to": inbound["id"],
                "metadata": {"model": settings.outreach_model},
            }
        ).execute()
        stats["drafted"] += 1

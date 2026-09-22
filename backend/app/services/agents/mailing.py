"""Per-agent sending: the client's Gmail, quota, opposition list.

Same guarantees as Léa's emailing module — at-most-once 'sending' fence,
suppression check at send time, spacing between sends — scoped to one
agent's rows and sent through its own mailbox.
"""

import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from app.clients import gmail
from app.config import settings
from app.prompts.agents import build_email_body
from app.services import keepalive
from app.services.emailing import PARIS
from app.services.tokens import agents_unsubscribe_url


@dataclass(frozen=True)
class Agent:
    profile: dict
    # Connected address, and the From header built on it.
    email: str
    sender: str
    # Gmail API client authorised on the agent's mailbox.
    service: Any

    @property
    def user_id(self) -> str:
        return self.profile["user_id"]

    def body(self, text: str, prospect_id: str) -> str:
        return build_email_body(
            text, self.profile, self.email, agents_unsubscribe_url(prospect_id)
        )


def daily_cold_count(sb, user_id: str) -> int:
    """Cold emails this agent already sent today, Paris time."""
    start_of_day = (
        datetime.now(PARIS)
        .replace(hour=0, minute=0, second=0, microsecond=0)
        .astimezone(UTC)
    )
    return (
        sb.table("agents_emails")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .eq("direction", "outbound")
        .eq("kind", "cold")
        .eq("status", "sent")
        .gte("sent_at", start_of_day.isoformat())
        .limit(1)
        .execute()
    ).count or 0


def is_suppressed(sb, user_id: str, email: str) -> bool:
    return bool(
        sb.table("agents_suppressions")
        .select("email")
        .eq("user_id", user_id)
        .eq("email", email.lower())
        .execute()
        .data
    )


def add_suppression(sb, user_id: str, email: str, reason: str, prospect_id: str) -> None:
    sb.table("agents_suppressions").upsert(
        {
            "user_id": user_id,
            "email": email.lower(),
            "reason": reason,
            "prospect_id": prospect_id,
        },
        on_conflict="user_id,email",
        ignore_duplicates=True,
    ).execute()


def send_approved(sb, agent: Agent, kind: str, cap: int | None = None) -> dict:
    """Send the agent's approved outbound emails of one kind, oldest first,
    at most cap of them."""
    stats = {"sent": 0, "failed": 0, "cancelled": 0}

    stuck = (
        sb.table("agents_emails")
        .update({"status": "failed", "error": "interrupted: process died mid-send"})
        .eq("user_id", agent.user_id)
        .eq("status", "sending")
        .execute()
    )
    stats["failed"] += len(stuck.data)

    query = (
        sb.table("agents_emails")
        .select("*")
        .eq("user_id", agent.user_id)
        .eq("direction", "outbound")
        .eq("kind", kind)
        .eq("status", "approved")
        .order("created_at")
    )
    if cap is not None:
        query = query.limit(cap)

    consecutive = 0
    for index, row in enumerate(query.execute().data):
        keepalive.ping_if_due()
        if index:
            time.sleep(settings.outreach_send_delay_seconds)
        sent_before = stats["sent"]
        _send_one(sb, agent, row, stats)
        if stats["sent"] == sent_before:
            consecutive += 1
            if consecutive >= settings.max_consecutive_errors:
                stats["aborted"] = "consecutive errors — systematic failure"
                break
        else:
            consecutive = 0
    return stats


def _send_one(sb, agent: Agent, row: dict, stats: dict) -> None:
    if is_suppressed(sb, agent.user_id, row["to_email"] or ""):
        sb.table("agents_emails").update(
            {"status": "cancelled", "error": "suppressed"}
        ).eq("id", row["id"]).execute()
        stats["cancelled"] += 1
        return

    fenced = (
        sb.table("agents_emails")
        .update({"status": "sending"})
        .eq("id", row["id"])
        .eq("status", "approved")
        .execute()
    )
    if not fenced.data:
        return

    headers = {
        "List-Unsubscribe": f"<{agents_unsubscribe_url(row['prospect_id'])}>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    }
    if row.get("in_reply_to"):
        inbound = (
            sb.table("agents_emails")
            .select("metadata")
            .eq("id", row["in_reply_to"])
            .execute()
        ).data
        message_id = (inbound[0].get("metadata") or {}).get("message_id_header") if inbound else None
        if message_id:
            headers["In-Reply-To"] = message_id
            headers["References"] = message_id

    try:
        sent = gmail.send(
            to=settings.outreach_redirect_to or row["to_email"],
            subject=row["subject"] or "",
            body=row["body_text"] or "",
            headers=headers,
            thread_id=row.get("gmail_thread_id"),
            service=agent.service,
            sender=agent.sender,
        )
    except Exception as exc:  # noqa: BLE001 — the row records the failure
        sb.table("agents_emails").update(
            {"status": "failed", "error": f"{type(exc).__name__}: {exc}"}
        ).eq("id", row["id"]).execute()
        stats["failed"] += 1
        stats["last_error"] = f"{type(exc).__name__}: {exc}"
        return

    sb.table("agents_emails").update(
        {
            "status": "sent",
            "sent_at": datetime.now(UTC).isoformat(),
            "from_email": agent.email,
            "gmail_message_id": sent.get("id"),
            "gmail_thread_id": sent.get("threadId"),
        }
    ).eq("id", row["id"]).execute()
    stats["sent"] += 1

    if row["kind"] == "cold":
        sb.table("agents_prospects").update({"status": "contacted"}).eq(
            "id", row["prospect_id"]
        ).eq("status", "qualified").execute()

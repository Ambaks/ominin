"""Inbox: send approved replies, then read the prospects' answers.

The client's mailbox is his business inbox, busy with everything else: new
mail is read through the Gmail History API from the stored cursor, and only
threads the agent started are touched — read-only, nothing is labelled or
archived. Reply drafts always wait for the client's approval, whatever the
mode: they engage his prices and his calendar.
"""

from datetime import UTC, datetime
from email.utils import formataddr, parseaddr

from googleapiclient.errors import HttpError

from app.clients import gmail
from app.clients.claude import parse_structured
from app.config import settings
from app.prompts.agents import inbox_rules, persona
from app.prompts.inbox import InboxVerdict
from app.services import keepalive
from app.services.agents import mailing
from app.services.agents.mailing import Agent
from app.services.inbox import BOUNCE_FROM_RE, BOUNCE_SUBJECT_RE, CLASSIFICATION_TITLES

POSITIVE = ("interested", "meeting_request", "question")
# Statuses a reply may move a prospect from — the ones after first contact.
ANSWERED_FROM = ["contacted", "interested"]


def run(sb, agent: Agent) -> dict:
    stats = {"ingested": 0, "classified": 0, "drafted": 0, "skipped": 0}
    replies = mailing.send_approved(sb, agent, "reply")
    stats["replies_sent"] = replies["sent"]
    stats["replies_failed"] = replies["failed"]

    _sweep_unclassified(sb, agent, stats)

    stubs, cursor = _new_inbound(sb, agent)
    threads = _agent_threads(sb, agent, {stub["threadId"] for stub in stubs})
    failed = False
    consecutive = 0
    for stub in stubs:
        outbound = threads.get(stub["threadId"])
        if not outbound:
            continue
        keepalive.ping_if_due()
        try:
            _process(sb, agent, stub, outbound, stats)
            consecutive = 0
        except Exception as exc:  # noqa: BLE001 — cursor kept, retried next tick
            failed = True
            stats["skipped"] += 1
            stats["last_error"] = f"{type(exc).__name__}: {exc}"
            consecutive += 1
            if consecutive >= settings.max_consecutive_errors:
                stats["aborted"] = "consecutive errors — systematic failure"
                break

    # A message that failed before being stored would be lost past the
    # cursor: keep it, the next tick re-reads the same history and the
    # gmail_message_id dedup skips what was already stored.
    if not failed:
        sb.table("agents_mailboxes").update({"history_id": cursor}).eq(
            "user_id", agent.user_id
        ).execute()
    return stats


def _new_inbound(sb, agent: Agent) -> tuple[list[dict], str]:
    """Inbox messages since the stored cursor. A cursor older than Gmail's
    history window falls back to searching the last inbox_lookback_days."""
    cursor = (
        sb.table("agents_mailboxes")
        .select("history_id")
        .eq("user_id", agent.user_id)
        .execute()
    ).data[0]["history_id"]
    if cursor:
        try:
            return gmail.inbox_history(cursor, service=agent.service)
        except HttpError as exc:
            if exc.resp.status != 404:
                raise
    fresh = gmail.profile(service=agent.service)["historyId"]
    stubs = gmail.list_inbox(
        settings.inbox_lookback_days,
        settings.inbox_max_messages,
        service=agent.service,
    )
    return stubs, fresh


def _agent_threads(sb, agent: Agent, thread_ids: set[str]) -> dict[str, dict]:
    """Latest outbound email of each given thread the agent started."""
    if not thread_ids:
        return {}
    rows = (
        sb.table("agents_emails")
        .select("id, prospect_id, to_email, subject, gmail_thread_id")
        .eq("user_id", agent.user_id)
        .eq("direction", "outbound")
        .in_("gmail_thread_id", list(thread_ids))
        .order("created_at", desc=True)
        .execute()
    ).data
    latest: dict[str, dict] = {}
    for row in rows:
        latest.setdefault(row["gmail_thread_id"], row)
    return latest


def _process(sb, agent: Agent, stub: dict, outbound: dict, stats: dict) -> None:
    already = (
        sb.table("agents_emails")
        .select("id")
        .eq("user_id", agent.user_id)
        .eq("gmail_message_id", stub["id"])
        .limit(1)
        .execute()
    ).data
    if already:
        return

    message = gmail.get_message(stub["id"], service=agent.service)
    headers = gmail.extract_headers(message)
    # The client writing in the thread himself (another device, a CC) is not
    # a prospect's answer.
    if parseaddr(headers.get("from", ""))[1].lower() == agent.email.lower():
        return

    inbound = (
        sb.table("agents_emails")
        .insert(
            {
                "user_id": agent.user_id,
                "prospect_id": outbound["prospect_id"],
                "direction": "inbound",
                "kind": "reply",
                "status": "received",
                "to_email": agent.email,
                "from_email": headers.get("from"),
                "subject": headers.get("subject"),
                "body_text": gmail.extract_body_text(message).strip(),
                "gmail_message_id": stub["id"],
                "gmail_thread_id": stub["threadId"],
                "received_at": datetime.fromtimestamp(
                    int(message.get("internalDate", 0)) / 1000, tz=UTC
                ).isoformat(),
                "metadata": {"message_id_header": headers.get("message-id")},
            }
        )
        .execute()
    ).data[0]
    stats["ingested"] += 1
    _classify_and_apply(sb, agent, inbound, outbound, stats)


def _sweep_unclassified(sb, agent: Agent, stats: dict) -> None:
    """Retry answers stored but never classified (Claude failed mid-tick):
    the message-id dedup would otherwise skip them forever."""
    rows = (
        sb.table("agents_emails")
        .select("*")
        .eq("user_id", agent.user_id)
        .eq("direction", "inbound")
        .is_("classification", "null")
        .order("created_at")
        .limit(settings.inbox_max_messages)
        .execute()
    ).data
    if not rows:
        return
    threads = _agent_threads(sb, agent, {row["gmail_thread_id"] for row in rows})
    consecutive = 0
    for inbound in rows:
        keepalive.ping_if_due()
        try:
            _classify_and_apply(sb, agent, inbound, threads[inbound["gmail_thread_id"]], stats)
            consecutive = 0
        except Exception as exc:  # noqa: BLE001 — stays unclassified, swept again
            stats["skipped"] += 1
            stats["last_error"] = f"{type(exc).__name__}: {exc}"
            consecutive += 1
            if consecutive >= settings.max_consecutive_errors:
                stats["aborted"] = "consecutive errors — systematic failure"
                return


def _classify_and_apply(
    sb, agent: Agent, inbound: dict, outbound: dict, stats: dict
) -> None:
    verdict = _classify(sb, agent, inbound)
    sb.table("agents_emails").update({"classification": verdict.classification}).eq(
        "id", inbound["id"]
    ).execute()
    stats["classified"] += 1
    _apply(sb, agent, inbound, outbound, verdict, stats)


def _classify(sb, agent: Agent, inbound: dict) -> InboxVerdict:
    sender = inbound.get("from_email") or ""
    subject = inbound.get("subject") or ""
    if BOUNCE_FROM_RE.search(sender) or BOUNCE_SUBJECT_RE.search(subject):
        return InboxVerdict(classification="bounce", draft_subject=None, draft_body=None)

    history = (
        sb.table("agents_emails")
        .select("direction, subject, body_text")
        .eq("user_id", agent.user_id)
        .eq("gmail_thread_id", inbound["gmail_thread_id"])
        .neq("id", inbound["id"])
        .in_("status", ["sent", "received"])
        .order("created_at")
        .execute()
    ).data
    me = agent.profile["sender_name"]
    parts = [
        f"--- {f'{me} (envoyé)' if m['direction'] == 'outbound' else 'Prospect (reçu)'} ---\n"
        f"Objet : {m.get('subject')}\n{m.get('body_text')}"
        for m in history
    ]
    parts.append(
        "--- DERNIER MESSAGE REÇU (à classer) ---\n"
        f"De : {sender}\nObjet : {subject}\n{inbound.get('body_text')}"
    )
    return parse_structured(
        f"{persona(agent.profile)}\n\n{inbox_rules(agent.profile)}",
        "\n\n".join(parts),
        InboxVerdict,
    )


def _apply(
    sb, agent: Agent, inbound: dict, outbound: dict, verdict: InboxVerdict, stats: dict
) -> None:
    classification = verdict.classification
    prospect_id = inbound["prospect_id"]
    contact = (outbound.get("to_email") or "").lower()

    def move(status: str, reason: str | None = None) -> None:
        sb.table("agents_prospects").update(
            {"status": status, "disqualify_reason": reason}
        ).eq("id", prospect_id).in_("status", ANSWERED_FROM).execute()

    if classification in POSITIVE:
        move("interested")
    elif classification == "not_interested":
        move("not_interested")
    elif classification == "opt_out":
        if contact:
            mailing.add_suppression(sb, agent.user_id, contact, "opt_out", prospect_id)
        move("not_interested")
    elif classification == "bounce":
        sb.table("agents_emails").update({"status": "failed", "error": "bounced"}).eq(
            "id", outbound["id"]
        ).execute()
        if contact:
            mailing.add_suppression(sb, agent.user_id, contact, "bounce", prospect_id)
        move("disqualified", "bounce")

    if classification not in POSITIVE:
        return

    if verdict.draft_body:
        sb.table("agents_emails").insert(
            {
                "user_id": agent.user_id,
                "prospect_id": prospect_id,
                "direction": "outbound",
                "kind": "reply",
                "status": "pending_approval",
                "to_email": outbound["to_email"],
                "from_email": agent.email,
                "subject": verdict.draft_subject
                or f"Re: {outbound.get('subject') or ''}".strip(),
                "body_text": agent.body(verdict.draft_body, prospect_id),
                "gmail_thread_id": inbound["gmail_thread_id"],
                "in_reply_to": inbound["id"],
                "metadata": {"model": settings.outreach_model},
            }
        ).execute()
        stats["drafted"] += 1
    _alert(sb, agent, inbound, classification, bool(verdict.draft_body))


def _alert(sb, agent: Agent, inbound: dict, classification: str, drafted: bool) -> None:
    """Tell the client a prospect answered, from Ominin's own mailbox.

    Best-effort: a failed alert must not fail the tick — the answer is
    stored, and it sits in his inbox anyway."""
    try:
        account = sb.auth.admin.get_user_by_id(agent.user_id).user
        name = (
            sb.table("agents_prospects")
            .select("name")
            .eq("id", inbound["prospect_id"])
            .execute()
        ).data[0]["name"]
        action = (
            "Un brouillon de réponse vous attend"
            if drafted
            else "Répondez-lui directement depuis votre boîte mail"
        )
        gmail.send(
            to=account.email,
            subject=f"{name} vous a répondu",
            body=(
                f"{CLASSIFICATION_TITLES[classification]}\n\n"
                f"{(inbound.get('body_text') or '')[:500]}\n\n"
                f"{action} : {settings.agents_site_url}/espace/validation"
            ),
            sender=formataddr(("Ominin Agents", settings.gmail_sender_email)),
        )
    except Exception:  # noqa: BLE001 — best-effort, see docstring
        pass

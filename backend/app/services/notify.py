import httpx

from app.clients import gmail
from app.config import settings


def send(title: str, message: str) -> None:
    """Alert the operator: hot reply, failed run, silently-cancelled send.

    Best-effort by design — an unreachable notification channel must never
    break the pipeline it reports on. Channels are independent and optional:
    ntfy_topic, operator_alert_email, and the admin's push notifications
    (frontend /api/admin/push/alert, same shared secret as the /agent
    triggers). The admin groups repeats by key: title plus the message's
    first line (the restaurant, for a hot reply)."""
    if settings.agent_trigger_secret:
        try:
            httpx.post(
                f"{settings.frontend_origin}/api/admin/push/alert",
                json={
                    "title": title,
                    "body": message[:300],
                    "key": f"{title} {message.splitlines()[0] if message else ''}",
                    "url": "/prospection" if title.startswith("Léa") else "/projet",
                },
                headers={"X-Agent-Secret": settings.agent_trigger_secret},
                timeout=settings.internal_http_timeout_seconds,
            )
        except httpx.HTTPError:
            pass
    if settings.ntfy_topic:
        try:
            httpx.post(
                settings.ntfy_url,
                json={
                    "topic": settings.ntfy_topic,
                    "title": title,
                    "message": message,
                },
                timeout=settings.internal_http_timeout_seconds,
            )
        except httpx.HTTPError:
            pass
    if settings.operator_alert_email:
        try:
            gmail.send(to=settings.operator_alert_email, subject=title, body=message)
        except Exception:  # noqa: BLE001 — best-effort, same as above
            pass

import httpx

from app.clients import gmail
from app.config import settings


def send(title: str, message: str, path: str = "/projet", urgent: bool = False) -> None:
    """Alert the operator: hot reply, failed run, silently-cancelled send.

    path is the admin page a tap opens (and the link added to ntfy and e-mail
    — the push body stays free of URLs); urgent keeps the push on screen
    until it is touched.

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
                    "url": path,
                    "urgent": urgent,
                },
                headers={"X-Agent-Secret": settings.agent_trigger_secret},
                timeout=settings.internal_http_timeout_seconds,
            )
        except httpx.HTTPError:
            pass
    linked = f"{message}\n\n{settings.frontend_origin}/admin{path}"
    if settings.ntfy_topic:
        try:
            httpx.post(
                settings.ntfy_url,
                json={
                    "topic": settings.ntfy_topic,
                    "title": title,
                    "message": linked,
                },
                timeout=settings.internal_http_timeout_seconds,
            )
        except httpx.HTTPError:
            pass
    if settings.operator_alert_email:
        try:
            gmail.send(to=settings.operator_alert_email, subject=title, body=linked)
        except Exception:  # noqa: BLE001 — best-effort, same as above
            pass

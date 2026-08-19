import httpx

from app.clients import gmail
from app.config import settings


def send(title: str, message: str) -> None:
    """Alert the operator: hot reply, failed run, silently-cancelled send.

    Best-effort by design — an unreachable notification channel must never
    break the pipeline it reports on. Channels are independent and both
    optional (see ntfy_topic / operator_alert_email in config)."""
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

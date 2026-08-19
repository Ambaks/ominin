import time

import httpx

from app.config import settings

_last_ping = 0.0


def ping_if_due() -> None:
    """Self-ping the service's public /health URL during long batch loops.

    Render's free tier idles out after 15 min without inbound HTTP; a GET
    through the public URL resets that clock. Jobs run as background tasks
    (the trigger request returns immediately), so without this a 20+ minute
    compose/send batch is killed mid-run. Best-effort: a failed ping must
    never abort the batch it protects."""
    global _last_ping
    if not settings.keepalive_url:
        return
    now = time.monotonic()
    if now - _last_ping < settings.keepalive_interval_seconds:
        return
    _last_ping = now
    try:
        httpx.get(
            settings.keepalive_url, timeout=settings.internal_http_timeout_seconds
        )
    except httpx.HTTPError:
        pass

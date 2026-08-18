import hmac

from fastapi import Header, HTTPException

from app.config import settings


def require_trigger_secret(x_agent_secret: str = Header(default="")) -> None:
    if not settings.agent_trigger_secret:
        raise HTTPException(status_code=503, detail="agent trigger secret not configured")
    if not hmac.compare_digest(x_agent_secret, settings.agent_trigger_secret):
        raise HTTPException(status_code=401, detail="invalid agent secret")

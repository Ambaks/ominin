import hashlib
import hmac
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.clients.supabase import get_supabase
from app.config import settings


def require_trigger_secret(x_agent_secret: str = Header(default="")) -> None:
    if not settings.agent_trigger_secret:
        raise HTTPException(status_code=503, detail="agent trigger secret not configured")
    if not hmac.compare_digest(x_agent_secret, settings.agent_trigger_secret):
        raise HTTPException(status_code=401, detail="invalid agent secret")


@dataclass(frozen=True)
class Device:
    id: str
    etablissement_id: str


_device_bearer = HTTPBearer(auto_error=False)


def require_device(
    credentials: HTTPAuthorizationCredentials | None = Depends(_device_bearer),
) -> Device:
    """Authentifie un appareil Omilink par l'empreinte SHA-256 de son jeton."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="device token required")
    token_hash = hashlib.sha256(credentials.credentials.encode()).hexdigest()
    rows = (
        get_supabase()
        .table("omilink_device_tokens")
        .select("device_id, omilink_devices(etablissement_id)")
        .eq("token_hash", token_hash)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=401, detail="invalid device token")
    return Device(
        id=rows[0]["device_id"],
        etablissement_id=rows[0]["omilink_devices"]["etablissement_id"],
    )

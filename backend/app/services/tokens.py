import hashlib
import hmac

from app.config import settings


def unsubscribe_token(restaurant_id: str) -> str:
    return hmac.new(
        settings.outreach_unsubscribe_secret.encode(),
        restaurant_id.lower().encode(),
        hashlib.sha256,
    ).hexdigest()


def unsubscribe_url(restaurant_id: str) -> str:
    return (
        f"{settings.outreach_unsubscribe_base_url}"
        f"?r={restaurant_id}&t={unsubscribe_token(restaurant_id)}"
    )


def agents_unsubscribe_token(prospect_id: str) -> str:
    """Same secret as Léa's links, domain-separated: a token minted for one
    product can never validate on the other's route."""
    return hmac.new(
        settings.outreach_unsubscribe_secret.encode(),
        f"agents:{prospect_id.lower()}".encode(),
        hashlib.sha256,
    ).hexdigest()


def agents_unsubscribe_url(prospect_id: str) -> str:
    return (
        f"{settings.agents_site_url}/api/agents/desinscription"
        f"?p={prospect_id}&t={agents_unsubscribe_token(prospect_id)}"
    )

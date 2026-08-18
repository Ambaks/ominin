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

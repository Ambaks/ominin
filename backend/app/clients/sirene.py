import httpx

from app.config import settings


def search(query: str, postcode: str) -> list[dict]:
    """Recherche d'entreprises (SIRENE, free, no key): companies matching
    query with an établissement in postcode, each with the matching
    établissements' enseignes and administrative state."""
    response = httpx.get(
        settings.sirene_search_url,
        params={"q": query, "code_postal": postcode},
        timeout=settings.discovery_timeout_seconds,
    )
    response.raise_for_status()
    return response.json()["results"]

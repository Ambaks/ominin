import httpx

from app.config import settings

SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"

# Minimal field mask: everything enrichment needs, nothing from the
# atmosphere SKUs (rating/reviews) that would raise the billing tier.
FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.addressComponents",
        "places.location",
        "places.types",
        "places.websiteUri",
        "places.nationalPhoneNumber",
        "places.googleMapsUri",
        "places.businessStatus",
        "nextPageToken",
    ]
)


def search_text(query: str, page_token: str | None = None) -> dict:
    body: dict = {"textQuery": query, "languageCode": "fr", "regionCode": "FR"}
    if page_token:
        body["pageToken"] = page_token
    response = httpx.post(
        SEARCH_URL,
        json=body,
        headers={
            "X-Goog-Api-Key": settings.google_places_api_key,
            "X-Goog-FieldMask": FIELD_MASK,
        },
        timeout=settings.places_timeout_seconds,
    )
    response.raise_for_status()
    return response.json()

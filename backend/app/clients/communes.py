import httpx

from app.config import settings


def commune(name: str) -> dict | None:
    """The commune named exactly `name` (geo.api.gouv.fr, the most populous
    on a tie): its postcodes and bbox as (xmin, ymin, xmax, ymax)."""
    response = httpx.get(
        settings.communes_api_url,
        params={"nom": name, "fields": "nom,codesPostaux,bbox", "boost": "population"},
        timeout=settings.discovery_timeout_seconds,
    )
    response.raise_for_status()
    for match in response.json():
        if match["nom"].casefold() == name.casefold():
            ring = match["bbox"]["coordinates"][0]
            xs = [p[0] for p in ring]
            ys = [p[1] for p in ring]
            return {
                "postcodes": set(match["codesPostaux"]),
                "bbox": (min(xs), min(ys), max(xs), max(ys)),
            }
    return None

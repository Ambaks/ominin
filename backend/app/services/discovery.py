import re
import unicodedata
from datetime import UTC, datetime

from app.clients import places
from app.clients.supabase import get_supabase
from app.config import settings
from app.services import keepalive

# Places types → crm_restaurant_category. First match wins; anything else
# falls back to 'restaurant'.
CATEGORY_BY_TYPE = {
    "pizza_restaurant": "pizzeria",
    "bakery": "bakery",
    "cafe": "cafe",
    "coffee_shop": "cafe",
    "bar": "bar",
    "pub": "bar",
    "fast_food_restaurant": "fast_food",
    "hamburger_restaurant": "fast_food",
    "sandwich_shop": "fast_food",
}


def _slugify(name: str, place_id: str) -> str:
    base = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    base = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-") or "restaurant"
    suffix = re.sub(r"[^a-z0-9]", "", place_id.lower())[-6:] or "place"
    return f"{base}-{suffix}"


def _category(types: list[str]) -> str:
    for t in types:
        if t in CATEGORY_BY_TYPE:
            return CATEGORY_BY_TYPE[t]
    return "restaurant"


def _address_component(place: dict, kind: str) -> str | None:
    for component in place.get("addressComponents", []):
        if kind in component.get("types", []):
            return component.get("longText")
    return None


def run_discovery() -> dict:
    sb = get_supabase()
    stats = {
        "found": 0,
        "inserted": 0,
        "existing": 0,
        "duplicates": 0,
        "errors": 0,
        "queries": 0,
    }

    for row in _next_queries(sb):
        stats["queries"] += 1
        keepalive.ping_if_due()
        inserted_before = stats["inserted"]
        page_token: str | None = None
        for _ in range(settings.discovery_max_pages_per_query):
            data = places.search_text(row["query"], page_token)
            found = [
                p
                for p in data.get("places", [])
                if p.get("businessStatus") == "OPERATIONAL" and p.get("id")
            ]
            stats["found"] += len(found)
            _ingest(sb, found, stats)
            page_token = data.get("nextPageToken")
            if not page_token:
                break
        _close_query(sb, row, stats["inserted"] - inserted_before)

    return stats


def _query_matrix() -> list[tuple[str, str]]:
    """(query, city) combos from config: each term over the whole city, plus
    each term per quartier."""
    terms = [t.strip() for t in settings.discovery_query_terms.split(",") if t.strip()]
    cities = [c.strip() for c in settings.outreach_cities.split(",") if c.strip()]
    quartiers: dict[str, list[str]] = {}
    for block in settings.discovery_neighborhoods.split(";"):
        if ":" not in block:
            continue
        city, names = block.split(":", 1)
        quartiers[city.strip()] = [n.strip() for n in names.split("|") if n.strip()]

    combos: list[tuple[str, str]] = []
    for city in cities:
        for term in terms:
            combos.append((f"{term} à {city}", city))
            for zone in quartiers.get(city, []):
                combos.append((f"{term} {zone} {city}", city))
    return combos


def _next_queries(sb) -> list[dict]:
    """Sync the config matrix into outreach_discovery_queries, then pick the
    least-recently-served active queries for this run."""
    sb.table("outreach_discovery_queries").upsert(
        [{"query": q, "city": city} for q, city in _query_matrix()],
        on_conflict="query",
        ignore_duplicates=True,
    ).execute()
    return (
        sb.table("outreach_discovery_queries")
        .select("id, query, consecutive_empty")
        .eq("retired", False)
        .order("last_run_at", desc=False, nullsfirst=True)
        .limit(settings.discovery_queries_per_run)
        .execute()
    ).data


def _close_query(sb, row: dict, inserted: int) -> None:
    empty = 0 if inserted else row["consecutive_empty"] + 1
    sb.table("outreach_discovery_queries").update(
        {
            "consecutive_empty": empty,
            "retired": empty >= settings.discovery_query_max_empty,
            "last_run_at": datetime.now(UTC).isoformat(),
        }
    ).eq("id", row["id"]).execute()


def _ingest(sb, found: list[dict], stats: dict) -> None:
    if not found:
        return
    # The (source, external_id) unique index is partial, which PostgREST
    # upserts cannot target — check-then-insert instead. Safe: jobs are
    # single-flight (runs.start overlap guard).
    existing = (
        sb.table("crm_restaurants")
        .select("external_id")
        .eq("source", "google_places")
        .in_("external_id", [p["id"] for p in found])
        .execute()
    ).data
    known = {row["external_id"] for row in existing}

    for place in found:
        if place["id"] in known:
            stats["existing"] += 1
            continue
        try:
            _ingest_one(sb, place, stats)
        except Exception:  # noqa: BLE001 — one bad row must not kill the run
            stats["errors"] += 1


def _ingest_one(sb, place: dict, stats: dict) -> None:
    name = place.get("displayName", {}).get("text", "").strip()
    if not name:
        stats["errors"] += 1
        return
    location = place.get("location", {})
    city = _address_component(place, "locality")
    phone = place.get("nationalPhoneNumber")

    duplicates = sb.rpc(
        "crm_find_duplicates",
        {
            "p_name": name,
            "p_city": city,
            "p_phone": phone,
            "p_email": None,
            "p_lat": location.get("latitude"),
            "p_lng": location.get("longitude"),
        },
    ).execute()
    if duplicates.data:
        # Already in the CRM under another source — just put it on the
        # agent's radar without creating a second restaurant.
        restaurant_id = duplicates.data[0]["restaurant_id"]
        stats["duplicates"] += 1
    else:
        inserted = (
            sb.table("crm_restaurants")
            .insert(
                {
                    "name": name,
                    "slug": _slugify(name, place["id"]),
                    "category": _category(place.get("types", [])),
                    "address": place.get("formattedAddress"),
                    "city": city,
                    "postal_code": _address_component(place, "postal_code"),
                    "latitude": location.get("latitude"),
                    "longitude": location.get("longitude"),
                    "phone": phone,
                    "website": place.get("websiteUri"),
                    "google_maps_url": place.get("googleMapsUri"),
                    "source": "google_places",
                    "external_id": place["id"],
                }
            )
            .execute()
        )
        restaurant_id = inserted.data[0]["id"]
        stats["inserted"] += 1

    sb.table("outreach_prospects").upsert(
        {"restaurant_id": restaurant_id},
        on_conflict="restaurant_id",
        ignore_duplicates=True,
    ).execute()

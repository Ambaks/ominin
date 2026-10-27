import re
import unicodedata

import httpx

from app.clients import communes, overture, sirene
from app.clients.supabase import get_supabase
from app.config import settings
from app.services import keepalive
from app.services.emailing import EMAIL_RE

SOURCE = "overture"

# Overture taxonomy (primary, then basic category) → crm_restaurant_category.
# Anything else falls back to 'restaurant'.
CATEGORY_BY_TYPE = {
    "pizza_restaurant": "pizzeria",
    "brasserie": "brasserie",
    "bakery": "bakery",
    "cafe": "cafe",
    "coffee_shop": "cafe",
    "bar": "bar",
    "fast_food_restaurant": "fast_food",
    "burger_restaurant": "fast_food",
    "sandwich_shop": "fast_food",
}


def _slugify(name: str, place_id: str) -> str:
    base = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    base = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-") or "restaurant"
    suffix = re.sub(r"[^a-z0-9]", "", place_id.lower())[-6:] or "place"
    return f"{base}-{suffix}"


def _words(text: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return " ".join(re.findall(r"[a-z0-9]+", ascii_text.lower()))


def _category(place: dict) -> str:
    primary = (place.get("taxonomy") or {}).get("primary")
    return (
        CATEGORY_BY_TYPE.get(primary)
        or CATEGORY_BY_TYPE.get(place.get("basic_category"))
        or "restaurant"
    )


def _national_phone(phone: str) -> str:
    """+33467606287 (or 33467606287) → 04 67 60 62 87, the format Places
    stored: dedup compares digits, so both sources must agree on the
    leading 0."""
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("33") and len(digits) == 11:
        digits = "0" + digits[2:]
        return " ".join(digits[i : i + 2] for i in range(0, 10, 2))
    return phone


def _first(values: list | None):
    return values[0] if values else None


def run_discovery(*, flush=None) -> dict:
    """Every place of the configured categories in each outreach city, from
    the latest Overture release. Reruns are cheap: places already inserted
    from Overture are skipped before any per-place call."""
    sb = get_supabase()
    stats = {
        "found": 0,
        "inserted": 0,
        "existing": 0,
        "duplicates": 0,
        "closed": 0,
        "errors": 0,
    }
    categories = [c.strip() for c in settings.discovery_categories.split(",") if c.strip()]
    cities = [c.strip() for c in settings.outreach_cities.split(",") if c.strip()]
    files = overture.place_files()

    for city in cities:
        keepalive.ping_if_due()
        try:
            area = communes.commune(city)
        except httpx.HTTPError:
            area = None
        if area is None:
            stats["errors"] += 1
            continue
        found = []
        for place in overture.places_in(files, area["bbox"], categories):
            address = _first(place.get("addresses")) or {}
            if address.get("postcode") not in area["postcodes"]:
                continue
            if place.get("operating_status") == "permanently_closed":
                stats["closed"] += 1
                continue
            found.append(place)
        stats["found"] += len(found)
        _ingest(sb, found, stats)
        if flush:
            flush(stats)

    return stats


def _ingest(sb, found: list[dict], stats: dict) -> None:
    # The (source, external_id) unique index is partial, which PostgREST
    # upserts cannot target — check-then-insert instead. Safe: jobs are
    # single-flight (runs.start overlap guard). Chunked because the ids
    # ride in the request URL.
    ids = [p["id"] for p in found]
    known: set[str] = set()
    for i in range(0, len(ids), settings.discovery_id_chunk):
        rows = (
            sb.table("crm_restaurants")
            .select("external_id")
            .eq("source", SOURCE)
            .in_("external_id", ids[i : i + settings.discovery_id_chunk])
            .execute()
        ).data
        known.update(row["external_id"] for row in rows)

    for place in found:
        if place["id"] in known:
            stats["existing"] += 1
            continue
        keepalive.ping_if_due()
        try:
            _ingest_one(sb, place, stats)
        except Exception:  # noqa: BLE001 — one bad row must not kill the run
            stats["errors"] += 1


def _closed_in_sirene(name: str, postcode: str) -> bool:
    """Overture leaves many French places without an operating status.
    Closed means SIRENE has établissements under exactly this name in this
    postcode and none of them is active. No match, or SIRENE unreachable
    (it rate-limits), proves nothing: the place is kept and enrichment
    judges it."""
    wanted = _words(name)
    if not wanted:
        return False
    try:
        companies = sirene.search(name, postcode)
    except httpx.HTTPError:
        return False
    states = [
        etab.get("etat_administratif")
        for company in companies
        for etab in company.get("matching_etablissements", [])
        if wanted
        in {
            _words(label)
            for label in (
                company.get("nom_raison_sociale"),
                etab.get("nom_commercial"),
                *(etab.get("liste_enseignes") or []),
            )
            if label
        }
    ]
    return bool(states) and "A" not in states


def _ingest_one(sb, place: dict, stats: dict) -> None:
    name = ((place.get("names") or {}).get("primary") or "").strip()
    if not name:
        stats["errors"] += 1
        return
    address = _first(place.get("addresses")) or {}
    postcode = address.get("postcode")
    if place.get("operating_status") is None and _closed_in_sirene(name, postcode):
        stats["closed"] += 1
        return

    box = place["bbox"]
    latitude = (box["ymin"] + box["ymax"]) / 2
    longitude = (box["xmin"] + box["xmax"]) / 2
    city = address.get("locality")
    phone = _first(place.get("phones"))
    phone = _national_phone(phone) if phone else None
    email = _first(place.get("emails"))
    if email and not EMAIL_RE.fullmatch(email):
        email = None

    duplicates = sb.rpc(
        "crm_find_duplicates",
        {
            "p_name": name,
            "p_city": city,
            "p_phone": phone,
            "p_email": email,
            "p_lat": latitude,
            "p_lng": longitude,
        },
    ).execute()
    if duplicates.data:
        # Already in the CRM under another source — just put it on the
        # agent's radar without creating a second restaurant. A phone or
        # email match beats a similar name nearby.
        match = min(duplicates.data, key=lambda d: d["reason"] == "name_proximity")
        restaurant_id = match["restaurant_id"]
        stats["duplicates"] += 1
    else:
        locality = " ".join(part for part in (postcode, city) if part)
        inserted = (
            sb.table("crm_restaurants")
            .insert(
                {
                    "name": name,
                    "slug": _slugify(name, place["id"]),
                    "category": _category(place),
                    "address": ", ".join(
                        part for part in (address.get("freeform"), locality) if part
                    ),
                    "city": city,
                    "postal_code": postcode,
                    "latitude": latitude,
                    "longitude": longitude,
                    "phone": phone,
                    "email": email,
                    "website": _first(place.get("websites")),
                    "source": SOURCE,
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

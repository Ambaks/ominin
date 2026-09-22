"""Discovery: the agent's targets × cities, played through Google Places.

Runs only when the agent is about to run dry — nothing left to qualify and
fewer qualified prospects than a day of sending — so Places is called for
prospects the agent will actually use. Every page fetched is a billed call,
counted against agents_places_monthly_budget, shared by all agents.
"""

from datetime import UTC, datetime

from app.clients import places
from app.config import settings
from app.services import keepalive
from app.services.agents.mailing import Agent


def run(sb, agent: Agent) -> dict:
    stats = {"queries": 0, "found": 0, "inserted": 0, "places_calls": 0}
    if _pool_sufficient(sb, agent):
        return stats

    month = datetime.now(UTC).date().replace(day=1).isoformat()
    usage = (
        sb.table("agents_places_usage").select("calls").eq("month", month).execute()
    ).data
    calls = usage[0]["calls"] if usage else 0

    queries = _next_queries(sb, agent)
    if not queries:
        # Every target × city has given all it had: only new targets or new
        # cities can feed the agent now — its dashboard says so.
        stats["exhausted"] = True
    for row in queries:
        keepalive.ping_if_due()
        stats["queries"] += 1
        inserted_before = stats["inserted"]
        page_token: str | None = None
        for _ in range(settings.discovery_max_pages_per_query):
            if calls >= settings.agents_places_monthly_budget:
                stats["budget_exhausted"] = True
                break
            # Counted before the call: a call that fails is still billed.
            calls += 1
            stats["places_calls"] += 1
            sb.table("agents_places_usage").upsert(
                {"month": month, "calls": calls}, on_conflict="month"
            ).execute()
            data = places.search_text(row["query"], page_token)
            found = [
                p
                for p in data.get("places", [])
                if p.get("businessStatus") == "OPERATIONAL" and p.get("id")
            ]
            stats["found"] += len(found)
            inserted = _ingest(sb, agent, row["category"], found)
            stats["inserted"] += inserted
            page_token = data.get("nextPageToken")
            # Places ranks a query's results the same way every time: a page
            # with nothing new means the rest was seen too.
            if not page_token or not inserted:
                break
        _close_query(sb, row, stats["inserted"] - inserted_before)
        if stats.get("budget_exhausted"):
            break

    return stats


def _pool_sufficient(sb, agent: Agent) -> bool:
    def count(status: str) -> int:
        return (
            sb.table("agents_prospects")
            .select("id", count="exact")
            .eq("user_id", agent.user_id)
            .eq("status", status)
            .limit(1)
            .execute()
        ).count or 0

    return (
        count("pending") > 0
        or count("qualified") >= agent.profile["daily_limit"]
    )


def _next_queries(sb, agent: Agent) -> list[dict]:
    """Sync the agent's current matrix into the table, then pick active
    queries, never-played first. Queries of a target or a city the client has
    since removed stay in the table but are never served."""
    matrix = {
        f"{target} à {city}": target
        for target in agent.profile["targets"]
        for city in agent.profile["cities"]
    }
    if not matrix:
        return []
    sb.table("agents_discovery_queries").upsert(
        [{"user_id": agent.user_id, "query": query} for query in matrix],
        on_conflict="user_id,query",
        ignore_duplicates=True,
    ).execute()
    rows = (
        sb.table("agents_discovery_queries")
        .select("id, query")
        .eq("user_id", agent.user_id)
        .eq("retired", False)
        .in_("query", list(matrix))
        .order("last_run_at", desc=False, nullsfirst=True)
        .limit(settings.agents_discovery_queries_per_tick)
        .execute()
    ).data
    return [{**row, "category": matrix[row["query"]]} for row in rows]


def _close_query(sb, row: dict, inserted: int) -> None:
    """A run that brought nothing new retires its query for good: replaying
    it would only bill the same results again."""
    sb.table("agents_discovery_queries").update(
        {"retired": not inserted, "last_run_at": datetime.now(UTC).isoformat()}
    ).eq("id", row["id"]).execute()


def _address_component(place: dict, kind: str) -> str | None:
    for component in place.get("addressComponents", []):
        if kind in component.get("types", []):
            return component.get("longText")
    return None


def _ingest(sb, agent: Agent, category: str, found: list[dict]) -> int:
    """Insert the places this agent doesn't know yet; returns how many.

    Without a website there is no address to find: stored straight as
    no_email, phone included, for the client to call."""
    rows = []
    for place in found:
        name = place.get("displayName", {}).get("text", "").strip()
        if not name:
            continue
        website = place.get("websiteUri")
        rows.append(
            {
                "user_id": agent.user_id,
                "place_id": place["id"],
                "name": name,
                "category": category,
                "address": place.get("formattedAddress"),
                "city": _address_component(place, "locality"),
                "phone": place.get("nationalPhoneNumber"),
                "website": website,
                "google_maps_url": place.get("googleMapsUri"),
                "status": "pending" if website else "no_email",
                "disqualify_reason": None if website else "no_website",
            }
        )
    if not rows:
        return 0
    inserted = (
        sb.table("agents_prospects")
        .upsert(rows, on_conflict="user_id,place_id", ignore_duplicates=True)
        .execute()
    )
    return len(inserted.data)

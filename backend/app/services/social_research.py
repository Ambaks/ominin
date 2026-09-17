"""Social agent, daily learning loop (AutoResearch for the social accounts).

First refreshes the metrics of every live publication, freezing them once a
post is social_settle_days old. Then, per brand, hands the settled posts and
the editorial line in force to Claude, which may rewrite that line. A new
version applies from the next post on, without human review — the operator
is notified of what changed and can roll back from /admin/reseaux.
"""

from datetime import UTC, datetime, timedelta

import httpx

from app.clients import meta
from app.clients.claude import parse_structured
from app.clients.supabase import get_supabase
from app.config import settings
from app.prompts.social import BRANDS, DAYS, ResearchFindings, research_system
from app.services import keepalive, notify
from app.services.social_post import current_playbook

_METRICS = {
    "instagram": meta.instagram_metrics,
    "facebook": meta.facebook_metrics,
}


def run_social_research(*, flush=None) -> dict:
    sb = get_supabase()
    stats: dict = {"metrics": _refresh_metrics(sb), "brands": {}}
    if flush:
        flush(stats)

    for brand in BRANDS:
        keepalive.ping_if_due()
        stats["brands"][brand] = _research_brand(sb, brand)
        if flush:
            flush(stats)
    return stats


def _refresh_metrics(sb) -> dict:
    """Snapchat rows carry the views typed in by the operator: nothing to
    fetch, they are only frozen with the others."""
    counts = {"refreshed": 0, "settled": 0, "errors": 0}
    now = datetime.now(UTC)
    settle_before = now - timedelta(days=settings.social_settle_days)
    publications = (
        sb.table("social_publications")
        .select(
            "id, external_id, published_at,"
            " social_accounts(platform, social_tokens(access_token))"
        )
        .in_("status", ("published", "posted"))
        .is_("metrics_settled_at", "null")
        .execute()
    ).data

    for publication in publications:
        account = publication["social_accounts"]
        update: dict = {}
        fetch = _METRICS.get(account["platform"])
        token = (account.get("social_tokens") or {}).get("access_token")
        if fetch and token:
            try:
                update["metrics"] = fetch(publication["external_id"], token)
                counts["refreshed"] += 1
            except (meta.MetaError, httpx.HTTPError):
                counts["errors"] += 1
        # Settled even when the last fetch failed (post deleted by hand,
        # token revoked): it must not be retried forever.
        if datetime.fromisoformat(publication["published_at"]) < settle_before:
            update["metrics_settled_at"] = now.isoformat()
            counts["settled"] += 1
        if update:
            sb.table("social_publications").update(update).eq(
                "id", publication["id"]
            ).execute()
    return counts


def _research_brand(sb, brand: str) -> dict:
    posts = (
        sb.table("social_posts")
        .select(
            "post_date, topic, angle, slides, captions,"
            " social_publications(metrics, metrics_settled_at,"
            " social_accounts(platform))"
        )
        .eq("brand", brand)
        .order("post_date", desc=True)
        .limit(settings.social_research_sample_size)
        .execute()
    ).data
    for post in posts:
        post["results"] = [
            p
            for p in post.pop("social_publications")
            if p["metrics_settled_at"] and p["metrics"]
        ]
    settled = [post for post in posts if post["results"]]

    if len(settled) < settings.social_research_min_posts:
        return {
            "skipped": f"{len(settled)} settled posts "
            f"(min {settings.social_research_min_posts})"
        }
    current = current_playbook(sb, brand)
    written = datetime.fromisoformat(current["created_at"])
    if not any(
        datetime.fromisoformat(result["metrics_settled_at"]) > written
        for post in settled
        for result in post["results"]
    ):
        return {"skipped": "no result settled since the current editorial line"}

    findings = parse_structured(
        research_system(brand),
        _format_campaign(current, settled),
        ResearchFindings,
    )
    report = {
        "what_works": findings.what_works,
        "what_fails": findings.what_fails,
        "next_experiments": findings.next_experiments,
    }
    outcome: dict = {"analyzed": len(settled), "findings": report, "updated": False}

    if findings.updated_guidelines and findings.change_summary:
        version = current["version"] + 1
        sb.table("social_playbooks").insert(
            {
                "brand": brand,
                "version": version,
                "guidelines": findings.updated_guidelines,
                "change_summary": findings.change_summary,
                "findings": report,
            }
        ).execute()
        outcome.update(updated=True, version=version)
        notify.send(
            f"Réseaux sociaux — ligne éditoriale {BRANDS[brand]['name']} v{version}",
            f"{findings.change_summary}\n\n"
            f"Historique et retour arrière : {settings.frontend_origin}/admin/reseaux",
        )
    return outcome


def _format_campaign(current: dict, posts: list[dict]) -> str:
    rule = "=" * 60
    parts = [
        f"LIGNE ÉDITORIALE EN VIGUEUR (version {current['version']}) :",
        current["guidelines"],
        "",
        rule,
        (
            f"PUBLICATIONS AUX RÉSULTATS FIGÉS ({len(posts)}), de la plus "
            "récente à la plus ancienne"
        ),
        rule,
    ]
    for post in posts:
        weekday = DAYS[datetime.fromisoformat(post["post_date"]).weekday()]
        parts.extend(
            [
                f"\n--- {post['post_date']} ({weekday}) ---",
                f"Sujet : {post['topic']}",
                f"Angle : {post['angle']}",
                "Images :",
                *(
                    f"  {index}. [{slide['kicker']}] {slide['title']} — {slide['body']}"
                    for index, slide in enumerate(post["slides"], 1)
                ),
                f"Légende Instagram : {post['captions']['instagram']}",
                "Résultats :",
                *(
                    f"  {result['social_accounts']['platform']} : "
                    + ", ".join(f"{k}={v}" for k, v in result["metrics"].items())
                    for result in post["results"]
                ),
            ]
        )
    return "\n".join(parts)

"""Social agent, weekly learning loop (AutoResearch for the social accounts).

First refreshes the metrics of every live publication, freezing them once a
post is social_settle_days old. Then, per brand, hands the settled posts and
the editorial line in force to Claude, which may propose a new line. The
proposal is stored on the version in force and the operator is notified; it
only applies once an admin adopts it in /admin/reseaux.
"""

from datetime import UTC, datetime, timedelta

import httpx

from app.clients import meta
from app.clients.claude import parse_structured
from app.clients.supabase import get_supabase
from app.config import settings
from app.prompts.social import BRANDS, DAYS, ResearchFindings, research_system
from app.services import keepalive, notify
from app.services.social_draft import current_playbook

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
            "post_date, format, topic, angle, slides, reel, captions,"
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
    changes = bool(findings.updated_guidelines and findings.change_summary)
    # Le bilan s'affiche même sans changement proposé ; une proposition non
    # adoptée est remplacée par la suivante.
    sb.table("social_playbooks").update(
        {
            "proposal": {
                "guidelines": findings.updated_guidelines if changes else None,
                "change_summary": findings.change_summary if changes else None,
                "findings": report,
                "created_at": datetime.now(UTC).isoformat(),
            }
        }
    ).eq("id", current["id"]).execute()
    if changes:
        notify.send(
            f"Réseaux sociaux — nouvelle ligne proposée pour {BRANDS[brand]['name']}",
            f"{findings.change_summary}\n\n"
            f"À adopter ou ignorer : {settings.frontend_origin}/admin/reseaux",
        )
    return {"analyzed": len(settled), "findings": report, "proposed": changes}


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
                f"\n--- {post['post_date']} ({weekday}) — {post['format']} ---",
                f"Sujet : {post['topic']}",
                f"Angle : {post['angle']}",
                *(
                    f"  {index}. [{slide['kicker']}] {slide['title']} — {slide['body']}"
                    for index, slide in enumerate(post["slides"], 1)
                ),
                *(
                    f"  scène {index} ({scene['visual']}) : « {scene['voiceover']} »"
                    f" / écran : {scene['caption']}"
                    for index, scene in enumerate(
                        (post["reel"] or {}).get("scenes", []), 1
                    )
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

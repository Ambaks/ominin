"""Social agent, daily: one carousel per brand, published on its accounts.

For every brand with at least one enabled account, Claude writes today's
carousel from the brand sheet, the editorial line in force and the recent
posts (so it does not repeat itself). The post is stored once, then
published per account: Instagram and Facebook through the Graph API,
Snapchat handed to the operator (no publishing API) as a 'to_post' row.

Re-running the job the same day is safe: an existing post is reused, and
only the accounts without a successful publication are attempted again.
"""

from datetime import UTC, datetime

import httpx

from app.clients import meta
from app.clients.claude import parse_structured
from app.clients.supabase import get_supabase
from app.config import settings
from app.prompts.social import (
    BRANDS,
    DEFAULT_GUIDELINES,
    CarouselDraft,
    compose_content,
    compose_system,
)
from app.services import keepalive, notify

_DONE = ("published", "to_post", "posted")
_PUBLISHERS = {
    "instagram": meta.publish_instagram_carousel,
    "facebook": meta.publish_facebook_photos,
}


def run_social_post(*, flush=None) -> dict:
    sb = get_supabase()
    today = datetime.now(UTC).date()
    stats: dict = {"composed": 0, "published": 0, "to_post": 0, "failed": 0}
    errors: list[str] = []

    accounts = (
        sb.table("social_accounts")
        .select("id, brand, platform, external_id, handle, social_tokens(access_token)")
        .eq("enabled", True)
        .not_.is_("brand", "null")
        .execute()
    ).data

    for brand in BRANDS:
        brand_accounts = [a for a in accounts if a["brand"] == brand]
        if not brand_accounts:
            continue
        keepalive.ping_if_due()
        try:
            post = _todays_post(sb, brand, today)
            if post is None:
                post = _compose(sb, brand, today)
                stats["composed"] += 1
        except Exception as exc:  # noqa: BLE001 — one brand must not stop the others
            stats["failed"] += 1
            errors.append(f"{brand} — rédaction : {type(exc).__name__}: {exc}")
            continue

        done = {
            row["account_id"]
            for row in (
                sb.table("social_publications")
                .select("account_id")
                .eq("post_id", post["id"])
                .in_("status", _DONE)
                .execute()
            ).data
        }
        for account in brand_accounts:
            if account["id"] in done:
                continue
            status, error = _publish(sb, post, account)
            stats[status] += 1
            if error:
                errors.append(f"{brand} — {account['platform']} : {error}")
        if flush:
            flush(stats)

    if errors:
        stats["errors"] = errors
        notify.send("Réseaux sociaux — publication en échec", "\n".join(errors))
    if stats["to_post"]:
        notify.send(
            "Snapchat — contenu du jour prêt",
            f"{stats['to_post']} story à poster : "
            f"{settings.frontend_origin}/admin/reseaux",
        )
    return stats


def _todays_post(sb, brand: str, today) -> dict | None:
    rows = (
        sb.table("social_posts")
        .select("id, slides, captions")
        .eq("brand", brand)
        .eq("post_date", today.isoformat())
        .execute()
    ).data
    return rows[0] if rows else None


def current_playbook(sb, brand: str) -> dict:
    """The editorial line in force. The starting line is stored as version 1
    on first use, so the whole history — starting point included — lives in
    one place and any version can be restored from the admin."""
    rows = (
        sb.table("social_playbooks")
        .select("id, version, guidelines, created_at")
        .eq("brand", brand)
        .order("version", desc=True)
        .limit(1)
        .execute()
    ).data
    if rows:
        return rows[0]
    return (
        sb.table("social_playbooks")
        .insert(
            {
                "brand": brand,
                "version": 1,
                "guidelines": DEFAULT_GUIDELINES,
                "change_summary": "Ligne éditoriale de départ.",
            }
        )
        .execute()
    ).data[0]


def _compose(sb, brand: str, today) -> dict:
    playbook = current_playbook(sb, brand)
    recent = (
        sb.table("social_posts")
        .select("post_date, topic, angle")
        .eq("brand", brand)
        .order("post_date", desc=True)
        .limit(settings.social_history_size)
        .execute()
    ).data

    draft = parse_structured(
        compose_system(brand, playbook["guidelines"]),
        compose_content(today, recent),
        CarouselDraft,
    )
    if not meta.CAROUSEL_MIN_ITEMS <= len(draft.slides) <= meta.CAROUSEL_MAX_ITEMS:
        raise ValueError(f"carousel of {len(draft.slides)} slides is not publishable")

    return (
        sb.table("social_posts")
        .insert(
            {
                "brand": brand,
                "post_date": today.isoformat(),
                "topic": draft.topic,
                "angle": draft.angle,
                "slides": [slide.model_dump() for slide in draft.slides],
                "captions": {
                    "instagram": draft.caption_instagram,
                    "facebook": draft.caption_facebook,
                    "snapchat": draft.caption_snapchat,
                },
                "playbook_id": playbook["id"],
            }
        )
        .execute()
    ).data[0]


def _publish(sb, post: dict, account: dict) -> tuple[str, str | None]:
    """Publishes on one account and records the outcome. Returns the stats
    key to increment and the error, if any."""
    platform = account["platform"]
    row: dict = {"post_id": post["id"], "account_id": account["id"], "error": None}

    if platform == "snapchat":
        row["status"] = "to_post"
    else:
        image_urls = [
            f"{settings.frontend_origin}/api/social/slides/{post['id']}/{index}.jpg"
            for index in range(1, len(post["slides"]) + 1)
        ]
        try:
            token = (account.get("social_tokens") or {}).get("access_token")
            if not token:
                raise meta.MetaError("aucun jeton — reconnecter Meta dans l'admin")
            external_id, permalink = _PUBLISHERS[platform](
                account["external_id"], token, image_urls, post["captions"][platform]
            )
            row.update(
                status="published",
                external_id=external_id,
                permalink=permalink,
                published_at=datetime.now(UTC).isoformat(),
            )
        except (meta.MetaError, httpx.HTTPError) as exc:
            row.update(status="failed", error=str(exc))

    sb.table("social_publications").upsert(
        row, on_conflict="post_id,account_id"
    ).execute()
    return row["status"], row["error"]

"""Social agent, at each publishing slot: what an admin approved goes out.

Every approved post whose scheduled_at has come is published on the enabled
accounts of its brand, in its format (carousel, single image, or Reel once
its video is rendered): Instagram and Facebook through the Graph API, Snapchat
handed to the operator (no publishing API) as a 'to_post' row. Drafts are
written by social_draft and never published until an admin approves them.

Re-running is safe: only the accounts without a successful publication are
attempted again, and a post whose accounts all succeeded becomes
'published' and leaves the queue.
"""

from datetime import UTC, datetime
from urllib.parse import quote

import httpx

from app.clients import meta
from app.clients.supabase import get_supabase
from app.config import settings
from app.services import keepalive, notify

_DONE = ("published", "to_post", "posted")
# Par format et réseau. Le média passé : la liste des images (carrousel),
# l'URL de l'image (image), l'URL du MP4 (Reel).
_PUBLISHERS = {
    ("carousel", "instagram"): meta.publish_instagram_carousel,
    ("carousel", "facebook"): meta.publish_facebook_photos,
    ("image", "instagram"): meta.publish_instagram_image,
    ("image", "facebook"): meta.publish_facebook_photo,
    ("reel", "instagram"): meta.publish_instagram_reel,
    ("reel", "facebook"): meta.publish_facebook_reel,
}


def run_social_post(*, flush=None) -> dict:
    sb = get_supabase()
    stats: dict = {"published": 0, "to_post": 0, "failed": 0}
    errors: list[str] = []

    due = (
        sb.table("social_posts")
        .select(
            "id, brand, format, slides, captions, updated_at, render_status,"
            " video_path, social_publications(account_id, status)"
        )
        .eq("status", "approved")
        .lte("scheduled_at", datetime.now(UTC).isoformat())
        .order("scheduled_at")
        .execute()
    ).data
    accounts = (
        sb.table("social_accounts")
        .select("id, brand, platform, external_id, handle, social_tokens(access_token)")
        .eq("enabled", True)
        .not_.is_("brand", "null")
        .execute()
    ).data

    for post in due:
        keepalive.ping_if_due()
        if post["format"] == "reel" and post["render_status"] != "ready":
            # Validé puis modifié : la vidéo se refait, le Reel attend le
            # passage suivant.
            errors.append(f"{post['brand']} — Reel pas encore rendu, reporté")
            continue
        done = {
            row["account_id"]
            for row in post.pop("social_publications")
            if row["status"] in _DONE
        }
        complete = True
        for account in accounts:
            if account["brand"] != post["brand"] or account["id"] in done:
                continue
            status, error = _publish(sb, post, account)
            stats[status] += 1
            if error:
                complete = False
                errors.append(f"{post['brand']} — {account['platform']} : {error}")
        if complete:
            sb.table("social_posts").update({"status": "published"}).eq(
                "id", post["id"]
            ).execute()
        if flush:
            flush(stats)

    if errors:
        stats["errors"] = errors
        notify.send(
            "Réseaux sociaux — publication en échec",
            "\n".join(errors),
            path="/reseaux",
        )
    if stats["to_post"]:
        notify.send(
            "Snapchat — contenu du jour prêt",
            f"{stats['to_post']} story à poster",
            path="/reseaux",
        )
    if stats["failed"] and not stats["published"]:
        # Rien n'est parti : le run est un échec, et l'admin l'affiche comme
        # tel — un run « réussi » a masqué une semaine sans publication.
        raise RuntimeError("aucune publication réussie\n" + "\n".join(errors))
    return stats


def _publish(sb, post: dict, account: dict) -> tuple[str, str | None]:
    """Publishes on one account and records the outcome. Returns the stats
    key to increment and the error, if any."""
    platform = account["platform"]
    row: dict = {"post_id": post["id"], "account_id": account["id"], "error": None}

    if platform == "snapchat":
        row["status"] = "to_post"
    else:
        try:
            token = (account.get("social_tokens") or {}).get("access_token")
            if not token:
                raise meta.MetaError("aucun jeton — reconnecter Meta dans l'admin")
            external_id, permalink = _PUBLISHERS[(post["format"], platform)](
                account["external_id"],
                token,
                _media(post),
                post["captions"][platform],
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


def _media(post: dict) -> str | list[str]:
    """What Meta fetches by URL: the rendered MP4 of a Reel (public bucket),
    or the slide images. ?v= : the images are cached as immutable, an edit
    made after a first render must change their URL."""
    if post["format"] == "reel":
        return (
            f"{settings.supabase_url}/storage/v1/object/public/social-videos/"
            f"{post['video_path']}"
        )
    version = quote(post["updated_at"])
    urls = [
        f"{settings.frontend_origin}/api/social/slides/{post['id']}/{index}.jpg"
        f"?v={version}"
        for index in range(1, len(post["slides"]) + 1)
    ]
    return urls[0] if post["format"] == "image" else urls

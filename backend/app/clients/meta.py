"""Meta Graph API: carousel publishing and post metrics for Instagram
professional accounts and Facebook Pages, both driven by a Page access token
(a Page token derived from a long-lived user token does not expire)."""

import json
import time

import httpx

from app.config import settings

# Instagram's own bounds for a carousel (platform fact, not a setting).
CAROUSEL_MIN_ITEMS = 2
CAROUSEL_MAX_ITEMS = 10

# Metrics valid for a feed carousel; `impressions` is gone since July 2024.
_INSTAGRAM_METRICS = "reach,views,likes,comments,saved,shares,total_interactions"
_FACEBOOK_INSIGHTS = "post_media_view,post_total_media_view_unique"
_FACEBOOK_FIELDS = (
    "reactions.summary(total_count).limit(0),"
    "comments.summary(total_count).limit(0),shares"
)


class MetaError(RuntimeError):
    pass


def _call(method: str, path: str, token: str, **params: str) -> dict:
    # POST parameters travel in the body: a caption does not fit in a URL.
    payload = {**params, "access_token": token}
    response = httpx.request(
        method,
        f"https://graph.facebook.com/{settings.meta_graph_version}/{path}",
        **({"data": payload} if method == "POST" else {"params": payload}),
        timeout=settings.meta_timeout_seconds,
    )
    body = response.json()
    if response.is_error:
        detail = body.get("error", {})
        raise MetaError(
            f"{path}: {detail.get('message', response.status_code)} "
            f"(code {detail.get('code')}, subcode {detail.get('error_subcode')})"
        )
    return body


def _wait_finished(container_id: str, token: str) -> None:
    for _ in range(settings.social_container_poll_attempts):
        status = _call("GET", container_id, token, fields="status_code")["status_code"]
        if status == "FINISHED":
            return
        if status in ("ERROR", "EXPIRED"):
            raise MetaError(f"container {container_id} ended as {status}")
        time.sleep(settings.social_container_poll_seconds)
    raise MetaError(f"container {container_id} still processing, gave up")


def publish_instagram_carousel(
    ig_user_id: str, token: str, image_urls: list[str], caption: str
) -> tuple[str, str | None]:
    """Returns (media id, permalink). Instagram fetches each JPEG by URL."""
    children = []
    for url in image_urls:
        container = _call(
            "POST",
            f"{ig_user_id}/media",
            token,
            image_url=url,
            is_carousel_item="true",
        )["id"]
        _wait_finished(container, token)
        children.append(container)

    carousel = _call(
        "POST",
        f"{ig_user_id}/media",
        token,
        media_type="CAROUSEL",
        children=",".join(children),
        caption=caption,
    )["id"]
    _wait_finished(carousel, token)
    media_id = _call(
        "POST", f"{ig_user_id}/media_publish", token, creation_id=carousel
    )["id"]
    permalink = _call("GET", media_id, token, fields="permalink").get("permalink")
    return media_id, permalink


def publish_facebook_photos(
    page_id: str, token: str, image_urls: list[str], message: str
) -> tuple[str, str | None]:
    """Multi-photo Page post: photos are uploaded unpublished, then attached
    to a single feed post. Returns (post id, permalink)."""
    photos = [
        _call("POST", f"{page_id}/photos", token, url=url, published="false")["id"]
        for url in image_urls
    ]
    post_id = _call(
        "POST",
        f"{page_id}/feed",
        token,
        message=message,
        attached_media=json.dumps([{"media_fbid": photo} for photo in photos]),
    )["id"]
    permalink = _call("GET", post_id, token, fields="permalink_url").get(
        "permalink_url"
    )
    return post_id, permalink


def instagram_metrics(media_id: str, token: str) -> dict[str, int]:
    data = _call("GET", f"{media_id}/insights", token, metric=_INSTAGRAM_METRICS)
    return {m["name"]: m["values"][0]["value"] for m in data["data"]}


def facebook_metrics(post_id: str, token: str) -> dict[str, int]:
    post = _call("GET", post_id, token, fields=_FACEBOOK_FIELDS)
    metrics = {
        "reactions": post.get("reactions", {}).get("summary", {}).get("total_count", 0),
        "comments": post.get("comments", {}).get("summary", {}).get("total_count", 0),
        "shares": post.get("shares", {}).get("count", 0),
    }
    # Meta serves Page insights only above 100 followers: until then the
    # engagement counts above are all there is.
    try:
        insights = _call("GET", f"{post_id}/insights", token, metric=_FACEBOOK_INSIGHTS)
    except MetaError:
        return metrics
    for metric in insights["data"]:
        metrics[metric["name"]] = metric["values"][0]["value"]
    return metrics

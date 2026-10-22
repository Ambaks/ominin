"""Social agent, weekly: the drafts of the coming week, for an admin to approve.

For every brand with at least one enabled account, Claude writes one post per
publishing slot of the next seven days (social_slot_weekdays at
social_slot_time), in the format it picks — Reel, carousel or single image —
from the brand sheets, the editorial line in force, the current prices, the
catalogues of screenshots and filmed demos, and the recent and planned
posts. A Reel is a script of scenes: the social-render workflow turns it into
a video (set off here, or by run_social_render). Nothing is published here:
drafts wait in /admin/reseaux, where an admin approves them, edits them, or
asks for a rewrite — which run_social_redraft performs.

Re-running is safe: a slot that already has a post for the brand is skipped.
"""

from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import httpx

from app.clients import github, meta
from app.clients.claude import parse_structured
from app.clients.supabase import get_supabase
from app.config import settings
from app.prompts.social import (
    BRANDS,
    PostDraft,
    ReelScene,
    compose_content,
    compose_system,
)
from app.services import keepalive, notify


def run_social_draft(*, flush=None) -> dict:
    sb = get_supabase()
    context = _Context(sb)
    stats: dict = {"drafted": 0, "failed": 0}
    errors = list(context.errors)
    slots = _slots()

    for brand in context.brands:
        taken = {
            row["post_date"]
            for row in (
                sb.table("social_posts")
                .select("post_date")
                .eq("brand", brand)
                .in_("post_date", [slot.date().isoformat() for slot in slots])
                .execute()
            ).data
        }
        for slot in slots:
            if slot.date().isoformat() in taken:
                continue
            keepalive.ping_if_due()
            try:
                draft = context.compose(brand, slot.date())
            except Exception as exc:  # noqa: BLE001 — one slot must not stop the others
                stats["failed"] += 1
                errors.append(f"{brand} {slot.date()} : {type(exc).__name__}: {exc}")
                continue
            sb.table("social_posts").insert(
                {
                    **draft,
                    "brand": brand,
                    "post_date": slot.date().isoformat(),
                    "scheduled_at": slot.astimezone(UTC).isoformat(),
                    "status": "draft",
                }
            ).execute()
            stats["drafted"] += 1
            if flush:
                flush(stats)

    _render_reels(stats, errors)
    if errors:
        stats["errors"] = errors
        notify.send(
            "Réseaux sociaux — brouillons incomplets",
            "\n".join(errors),
            path="/reseaux",
        )
    if stats["drafted"]:
        notify.send(
            "Réseaux sociaux — brouillons à valider",
            f"{stats['drafted']} publications prêtes pour la semaine.",
            path="/reseaux",
        )
    if stats["failed"] and not stats["drafted"]:
        raise RuntimeError("aucun brouillon rédigé\n" + "\n".join(errors))
    return stats


def run_social_redraft(*, flush=None) -> dict:
    """Rewrites every post an admin sent back with a comment. Loops until none
    is left, so a request made while a run is in flight is still served."""
    sb = get_supabase()
    context = _Context(sb)
    stats: dict = {"redrafted": 0, "failed": 0}
    errors = list(context.errors)
    attempted: set[str] = set()

    while True:
        pending = [
            post
            for post in (
                sb.table("social_posts")
                .select(
                    "id, brand, post_date, format, topic, angle, slides, reel,"
                    " captions, feedback"
                )
                .eq("status", "redrafting")
                .execute()
            ).data
            if post["id"] not in attempted
        ]
        if not pending:
            break
        for post in pending:
            attempted.add(post["id"])
            keepalive.ping_if_due()
            try:
                draft = context.compose(
                    post["brand"], date.fromisoformat(post["post_date"]), previous=post
                )
            except Exception as exc:  # noqa: BLE001 — the post goes back to draft
                stats["failed"] += 1
                errors.append(f"{post['brand']} {post['post_date']} : {exc}")
                draft = {}
            sb.table("social_posts").update(
                {**draft, "status": "draft", "feedback": None}
            ).eq("id", post["id"]).eq("status", "redrafting").execute()
            if draft:
                stats["redrafted"] += 1
            if flush:
                flush(stats)

    _render_reels(stats, errors)
    if errors:
        stats["errors"] = errors
        notify.send(
            "Réseaux sociaux — réécriture en échec",
            "\n".join(errors),
            path="/reseaux",
        )
    return stats


def run_social_render(*, flush=None) -> dict:
    """Sets off the render of every Reel waiting for one — after an admin
    edited a script — and retries the failed ones still to be published."""
    sb = get_supabase()
    retried = (
        sb.table("social_posts")
        .update({"render_status": "pending", "render_error": None})
        .eq("render_status", "failed")
        .in_("status", ["draft", "approved"])
        .execute()
    ).data
    pending = _pending_renders()
    if pending:
        github.dispatch_render()
    return {"pending": pending, "retried": len(retried)}


def _pending_renders() -> int:
    return (
        get_supabase()
        .table("social_posts")
        .select("id", count="exact", head=True)
        .eq("render_status", "pending")
        .execute()
    ).count or 0


def _render_reels(stats: dict, errors: list[str]) -> None:
    """After writing: one dispatch renders every pending Reel."""
    pending = _pending_renders()
    if not pending:
        return
    try:
        github.dispatch_render()
        stats["renders"] = pending
    except (github.GitHubError, httpx.HTTPError) as exc:
        errors.append(f"rendu des Reels non lancé : {exc}")


def current_playbook(sb, brand: str) -> dict:
    """The editorial line in force: the latest version. Every brand has one
    from the migrations on; an admin edit or an adopted proposal adds one."""
    return (
        sb.table("social_playbooks")
        .select("id, version, guidelines, created_at, proposal")
        .eq("brand", brand)
        .order("version", desc=True)
        .limit(1)
        .execute()
    ).data[0]


def _slots() -> list[datetime]:
    """Publishing slots of the next seven days, today excluded, local time."""
    zone = ZoneInfo(settings.social_timezone)
    at = time.fromisoformat(settings.social_slot_time)
    today = datetime.now(zone).date()
    days = (today + timedelta(days=offset) for offset in range(1, 8))
    return [
        datetime.combine(day, at, tzinfo=zone)
        for day in days
        if day.weekday() in settings.social_slot_weekdays
    ]


class _Context:
    """What every draft of a run is written from, read once per run: prices,
    screenshots and filmed demos served by the site, Instagram handles."""

    def __init__(self, sb) -> None:
        self.sb = sb
        self.errors: list[str] = []
        self.pricing = self._site("tarifs", {})
        self.screens = self._site("screens", [])
        self.clips = self._site("clips", [])
        self.stock = self._site("stock", [])
        self.music = self._site("music", [])
        accounts = (
            sb.table("social_accounts")
            .select("brand, platform, handle")
            .eq("enabled", True)
            .not_.is_("brand", "null")
            .execute()
        ).data
        self.brands = [b for b in BRANDS if any(a["brand"] == b for a in accounts)]
        self.handles = {
            a["brand"]: a["handle"] for a in accounts if a["platform"] == "instagram"
        }

    def _site(self, route: str, empty):
        # Sans tarifs, la fiche interdit d'en citer ; sans captures, démos,
        # vidéos ni musiques, le Reel s'en passe. On rédige quand même, et on
        # prévient.
        try:
            response = httpx.get(
                f"{settings.frontend_origin}/api/social/{route}",
                timeout=settings.internal_http_timeout_seconds,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            self.errors.append(f"/api/social/{route} illisible : {exc}")
            return empty

    def compose(self, brand: str, day: date, previous: dict | None = None) -> dict:
        """The post's columns for this draft. Raises ValueError when Claude's
        output breaks the format's rules: the slot is reported, not filled."""
        playbook = current_playbook(self.sb, brand)
        # Ominin présente les trois offres : tout leur matériel lui est ouvert.
        screens = [s for s in self.screens if brand == "ominin" or s["brand"] == brand]
        clips = [c for c in self.clips if brand == "ominin" or c["brand"] == brand]
        recent = (
            self.sb.table("social_posts")
            .select("post_date, format, topic, angle")
            .eq("brand", brand)
            .neq("status", "rejected")
            .order("post_date", desc=True)
            .limit(settings.social_history_size)
            .execute()
        ).data
        draft = parse_structured(
            compose_system(
                brand,
                playbook["guidelines"],
                self.pricing,
                screens,
                clips,
                self.stock,
                self.music,
                self.handles,
            ),
            compose_content(day, recent, previous),
            PostDraft,
        )

        row = {
            "format": draft.format,
            "topic": draft.topic,
            "angle": draft.angle,
            "captions": {
                "instagram": draft.caption_instagram,
                "facebook": draft.caption_facebook,
                "snapchat": draft.caption_snapchat,
            },
            "playbook_id": playbook["id"],
            "reel": None,
            "render_status": None,
            "render_error": None,
            "video_path": None,
        }
        if draft.format == "reel":
            row["slides"] = []
            row["reel"] = {
                "scenes": _checked_scenes(draft.scenes, screens, clips, self.stock),
                "cta": draft.cta,
                # Une musique inconnue n'empêche pas le Reel : la voix seule.
                "music": draft.music
                if draft.music in {m["id"] for m in self.music}
                else "",
            }
            row["render_status"] = "pending"
            return row

        bounds = (
            (1, 1)
            if draft.format == "image"
            else (
                max(settings.social_slides_min, meta.CAROUSEL_MIN_ITEMS),
                min(settings.social_slides_max, meta.CAROUSEL_MAX_ITEMS),
            )
        )
        if not bounds[0] <= len(draft.slides) <= bounds[1]:
            raise ValueError(f"{draft.format} of {len(draft.slides)} slides")
        known = {s["id"] for s in screens}
        row["slides"] = [
            {
                **slide.model_dump(),
                "screen": slide.screen if slide.screen in known else "",
            }
            for slide in draft.slides
        ]
        return row


def _checked_scenes(
    scenes: list[ReelScene],
    screens: list[dict],
    clips: list[dict],
    stock: list[dict],
) -> list[dict]:
    if (
        not settings.social_reel_scenes_min
        <= len(scenes)
        <= settings.social_reel_scenes_max
    ):
        raise ValueError(f"reel of {len(scenes)} scenes")
    media = {
        "demo": {c["id"] for c in clips},
        "screen": {s["id"] for s in screens},
        "stock": {s["id"] for s in stock},
    }
    for index, scene in enumerate(scenes, 1):
        if scene.visual in media and scene.media not in media[scene.visual]:
            raise ValueError(f"scene {index}: unknown {scene.visual} '{scene.media}'")
        if not scene.voiceover.strip():
            raise ValueError(f"scene {index}: no voiceover")
    return [scene.model_dump() for scene in scenes]

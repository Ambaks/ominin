"""Social agent, weekly: the drafts of the coming week, for an admin to approve.

For every brand with at least one enabled account, Claude writes one post per
publishing slot of the next seven days (social_slot_weekdays at
social_slot_time), in the format it picks — Reel, carousel or single image —
from the brand sheets, the editorial line in force, the current prices, the
catalogues of screenshots and filmed demos, and the recent and planned
posts. Each post presents one feature of the catalogue
(frontend/lib/social/features.ts): the least recently presented one, so the
brand goes round the whole catalogue and never shows the same twice in a
row. A separate reviewer call scores every version out of 10; Claude
rewrites from its critique until the draft reaches the target score, and the
best version is kept with its review. A Reel is a script of scenes: the social-render workflow turns it into
a video (set off here, or by run_social_render). For the brands of
social_scene_brands, every post is a Reel in scenes instead — blocks of the
site filled with text, no voiceover (frontend/lib/social/script.ts) — that
the montage agents polish scene by scene at render time. Nothing is published here:
drafts wait in /admin/reseaux, where an admin approves them, edits them, or
asks for a rewrite — which run_social_redraft performs.

Re-running is safe: a slot that already has a post for the brand is skipped.
"""

import random
import re
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
    PostReview,
    ReelScene,
    ScenePostDraft,
    compose_content,
    compose_scenes_system,
    compose_system,
    review_content,
    review_scenes_system,
    review_system,
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
            feature = context.next_feature(brand)
            variant = (
                context.next_variant(brand, feature)
                if brand in settings.social_scene_brands
                else None
            )
            try:
                draft = context.compose(brand, slot.date(), feature, variant=variant)
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
                    " script, captions, feedback, feature"
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
                    post["brand"],
                    date.fromisoformat(post["post_date"]),
                    context.feature(post["feature"]),
                    previous=post,
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


# Un chiffre dans la description d'une fonctionnalité, en chiffres ou en
# lettres : seul il autorise le format « le chiffre », qui n'en invente pas.
_NUMBER = re.compile(
    r"\d|\b(deux|trois|quatre|cinq|six|sept|huit|neuf|dix|douze|quatorze|"
    r"quinze|vingt|trente|soixante|cent|mille)\b",
    re.IGNORECASE,
)


def _least_recent(options: list[str], history: list) -> str:
    """The option used least recently in history (newest first) — one never
    used first, at random among equals."""

    def age(option: str) -> int:
        return history.index(option) if option in history else len(history)

    oldest = max(age(option) for option in options)
    return random.choice([option for option in options if age(option) == oldest])


def _follows(blocks: list[str], slots: list[dict]) -> bool:
    """Do the scenes' blocks fill the format's slots, in order? Mirror of
    follows() in frontend/lib/social/script.ts."""
    if not slots:
        return not blocks
    slot, rest = slots[0], slots[1:]
    if blocks and blocks[0] in slot["blocks"] and _follows(blocks[1:], rest):
        return True
    return bool(slot.get("optional")) and _follows(blocks, rest)


class _Context:
    """What every draft of a run is written from, read once per run: prices,
    features, screenshots and filmed demos served by the site, Instagram
    handles."""

    def __init__(self, sb) -> None:
        self.sb = sb
        self.errors: list[str] = []
        self.pricing = self._site("tarifs", {})
        self.features = self._site("features", [])
        # Fonctionnalités et variantes déjà choisies pendant ce run, la plus
        # récente en tête.
        self._picked: dict[str, list[str]] = {}
        self._variants: dict[str, list[dict]] = {}
        self.screens = self._site("screens", [])
        self.clips = self._site("clips", [])
        self.stock = self._site("stock", [])
        self.music = self._site("music", [])
        self.blocks = self._site("blocks", {})
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
            # ominin.com redirige vers www.ominin.com : on suit.
            response = httpx.get(
                f"{settings.frontend_origin}/api/social/{route}",
                timeout=settings.internal_http_timeout_seconds,
                follow_redirects=True,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            self.errors.append(f"/api/social/{route} illisible : {exc}")
            return empty

    def _features_for(self, brand: str) -> list[dict]:
        # Ominin présente les trois offres : tout le catalogue lui est ouvert.
        return [f for f in self.features if brand == "ominin" or f["brand"] == brand]

    def feature(self, feature_id: str | None) -> dict | None:
        return next((f for f in self.features if f["id"] == feature_id), None)

    def next_feature(self, brand: str) -> dict | None:
        """The feature of the brand presented least recently — one never
        presented first, at random among equals. None without a catalogue:
        the writer then picks its subject alone."""
        candidates = self._features_for(brand)
        if not candidates:
            return None
        history = self._picked.get(brand, []) + [
            row["feature"]
            for row in (
                self.sb.table("social_posts")
                .select("feature")
                .eq("brand", brand)
                .neq("status", "rejected")
                .not_.is_("feature", "null")
                .order("post_date", desc=True)
                .limit(len(candidates))
                .execute()
            ).data
        ]

        choice_id = _least_recent([f["id"] for f in candidates], history)
        self._picked[brand] = [choice_id, *self._picked.get(brand, [])]
        return self.feature(choice_id)

    def next_variant(self, brand: str, feature: dict | None) -> dict:
        """The format, look and rhythm of a Reel in scenes, each the one the
        brand used least recently, so that two posts never look alike. « Le
        chiffre » only when the feature's description holds a number."""
        recent = self._variants.get(brand, []) + [
            row["script"]
            for row in (
                self.sb.table("social_posts")
                .select("script")
                .eq("brand", brand)
                .neq("status", "rejected")
                .not_.is_("script", "null")
                .order("post_date", desc=True)
                .limit(settings.social_history_size)
                .execute()
            ).data
        ]
        formats = [
            f["id"]
            for f in self.blocks.get("formats", [])
            if f["id"] != "le-chiffre" or (feature and _NUMBER.search(feature["does"]))
        ]
        variant = {
            key: _least_recent(options, [script.get(key) for script in recent])
            for key, options in (
                ("format", formats),
                ("look", [look["id"] for look in self.blocks.get("looks", [])]),
                ("rhythm", [r["id"] for r in self.blocks.get("rhythms", [])]),
            )
        }
        self._variants[brand] = [variant, *self._variants.get(brand, [])]
        return variant

    def compose(
        self,
        brand: str,
        day: date,
        feature: dict | None,
        previous: dict | None = None,
        variant: dict | None = None,
    ) -> dict:
        """The post's columns for this draft, with the reviewer's opinion:
        each version is scored by a separate call and rewritten from its
        critique until it reaches social_review_target or runs out of
        rewrites; the best one is kept. Raises ValueError when Claude's first
        output breaks the format's rules: the slot is reported, not filled.
        feature: the catalogue entry the post presents, or None.
        previous: the post an admin sent back, with their feedback — kept in
        every rewrite.
        variant: the format, look and rhythm of a Reel in scenes (a rewrite
        keeps the previous post's)."""
        playbook = current_playbook(self.sb, brand)
        # Ominin présente les trois offres : tout leur matériel lui est ouvert.
        screens = [s for s in self.screens if brand == "ominin" or s["brand"] == brand]
        clips = [c for c in self.clips if brand == "ominin" or c["brand"] == brand]
        stock = [v for v in self.stock if brand == "ominin" or brand in v["brands"]]
        recent = (
            self.sb.table("social_posts")
            .select("post_date, format, topic, angle")
            .eq("brand", brand)
            .neq("status", "rejected")
            .order("post_date", desc=True)
            .limit(settings.social_history_size)
            .execute()
        ).data
        scenes = brand in settings.social_scene_brands
        if scenes and previous and previous.get("script"):
            variant = {
                key: previous["script"][key] for key in ("format", "look", "rhythm")
            }
        elif scenes and not variant:
            variant = self.next_variant(brand, feature)
        writer = (
            compose_scenes_system(
                brand,
                playbook["guidelines"],
                self.pricing,
                screens,
                self.blocks,
                self.handles,
                variant,
            )
            if scenes
            else compose_system(
                brand,
                playbook["guidelines"],
                self.pricing,
                screens,
                clips,
                stock,
                self.music,
                self.handles,
            )
        )
        reviewer = (
            review_scenes_system(
                brand,
                playbook["guidelines"],
                self.pricing,
                screens,
                self.blocks,
                variant,
            )
            if scenes
            else review_system(
                brand,
                playbook["guidelines"],
                self.pricing,
                screens,
                clips,
                stock,
                self.music,
            )
        )
        feedback = previous.get("feedback") if previous else None

        def write(content: str) -> dict:
            row = (
                self._scene_row(
                    brand,
                    parse_structured(writer, content, ScenePostDraft),
                    screens,
                    variant,
                )
                if scenes
                else self._row(
                    parse_structured(writer, content, PostDraft), screens, clips, stock
                )
            )
            return {
                **row,
                "playbook_id": playbook["id"],
                "feature": feature["id"] if feature else None,
            }

        def review(row: dict) -> PostReview:
            return parse_structured(reviewer, review_content(row, feature), PostReview)

        row = write(compose_content(day, recent, feature, previous))
        best, best_review, rounds = row, review(row), 0
        latest_review = best_review
        while (
            latest_review.score < settings.social_review_target
            and rounds < settings.social_review_max_rounds
        ):
            keepalive.ping_if_due()
            rounds += 1
            try:
                row = write(
                    compose_content(
                        day,
                        recent,
                        feature,
                        {**row, "feedback": feedback},
                        latest_review,
                    )
                )
            except ValueError:
                # Une réécriture hors des règles du format : on garde la
                # meilleure version déjà notée.
                continue
            latest_review = review(row)
            if latest_review.score > best_review.score:
                best, best_review = row, latest_review
        return {**best, "review": {**best_review.model_dump(), "rounds": rounds}}

    def _scene_row(
        self, brand: str, draft: ScenePostDraft, screens: list[dict], variant: dict
    ) -> dict:
        """The post's columns from one scene writer output. Raises ValueError
        when its scenes don't follow the format; transitions and durations
        are brought into the rhythm; text limits are the montage's
        (social-video checks every scene, and its agents rewrite what's off)."""
        catalogue = {
            key: {item["id"]: item for item in self.blocks.get(key, [])}
            for key in ("blocks", "formats", "rhythms")
        }
        if not catalogue["blocks"]:
            raise ValueError("/api/social/blocks illisible : pas de catalogue")
        format_ = catalogue["formats"][variant["format"]]
        rhythm = catalogue["rhythms"][variant["rhythm"]]
        blocks = [scene.block for scene in draft.scenes]
        if not _follows(blocks, format_["slots"]):
            raise ValueError(
                f"les scènes ({', '.join(blocks)}) ne suivent pas le format "
                f"« {format_['name']} »"
            )
        if len(draft.transitions) != len(draft.scenes) - 1:
            raise ValueError(
                f"{len(draft.transitions)} transitions pour {len(draft.scenes)} scènes"
            )
        shown = {s["id"] for s in screens}
        for index, scene in enumerate(draft.scenes, 1):
            if scene.block == "phone" and scene.props.get("screen") not in shown:
                raise ValueError(f"scène {index} : capture inconnue")
        bounds, joins = rhythm["sceneFrames"], self.blocks["transitionFrames"]
        scenes = [
            {
                **scene.model_dump(),
                "frames": min(max(scene.frames, bounds["min"]), bounds["max"]),
            }
            for scene in draft.scenes
        ]
        transitions = [
            {
                **t.model_dump(),
                "kind": t.kind
                if t.kind in rhythm["transitions"]
                else rhythm["transitions"][0],
                "frames": min(max(t.frames, joins["min"]), joins["max"]),
            }
            for t in draft.transitions
        ]
        return {
            "format": "reel",
            "topic": draft.topic,
            "angle": draft.angle,
            "captions": {
                "instagram": draft.caption_instagram,
                "facebook": draft.caption_facebook,
                "snapchat": draft.caption_snapchat,
            },
            "slides": [],
            "reel": None,
            "script": {
                "brand": brand,
                **variant,
                "scenes": scenes,
                "transitions": transitions,
            },
            "production": None,
            "render_status": "pending",
            "render_error": None,
            "video_path": None,
        }

    def _row(
        self,
        draft: PostDraft,
        screens: list[dict],
        clips: list[dict],
        stock: list[dict],
    ) -> dict:
        """The post's columns from one writer output. Raises ValueError when
        it breaks the format's rules."""
        row = {
            "format": draft.format,
            "topic": draft.topic,
            "angle": draft.angle,
            "captions": {
                "instagram": draft.caption_instagram,
                "facebook": draft.caption_facebook,
                "snapchat": draft.caption_snapchat,
            },
            "reel": None,
            "script": None,
            "production": None,
            "render_status": None,
            "render_error": None,
            "video_path": None,
        }
        if draft.format == "reel":
            row["slides"] = []
            row["reel"] = {
                "scenes": _checked_scenes(draft.scenes, screens, clips, stock),
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

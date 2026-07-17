from __future__ import annotations

import logging
from pathlib import Path

import yaml

from clipper.common.settings import Settings
from clipper.common.supabase_client import JobUpdater
from clipper.schemas import (
    JudgedManifest,
    RankedClip,
    RankedManifest,
)

log = logging.getLogger(__name__)


def run(
    job_dir: Path,
    settings: Settings,
    updater: JobUpdater | None = None,
) -> RankedManifest:
    manifest_path = job_dir / "ranked.json"
    if manifest_path.exists():
        log.info("ranked.json exists, skipping rank")
        return RankedManifest.model_validate_json(manifest_path.read_text())

    judged = JudgedManifest.model_validate_json(
        (job_dir / "judged.json").read_text()
    )

    config = _load_ranking_config()
    judge_weights = config.get("judge_weights", {})
    sensor_prior_weight = config.get("sensor_prior_weight", 0.15)
    diversity = config.get("diversity", {})
    max_same_type = diversity.get("max_same_type", 2)
    min_gap_s = diversity.get("min_gap_s", 60.0)

    total_jw = sum(judge_weights.values()) or 1.0

    scored: list[tuple[float, RankedClip]] = []
    flagged: list[RankedClip] = []

    for cand in judged.candidates:
        if cand.judge_status != "ok":
            continue

        judge_score = sum(
            getattr(cand.scores, dim, 0) * (w / total_jw)
            for dim, w in judge_weights.items()
        )

        sensor_mean = 0.0
        if cand.signal_vector:
            means = [
                v for k, v in cand.signal_vector.items() if k.endswith("_mean")
            ]
            if means:
                sensor_mean = sum(means) / len(means)

        final_score = judge_score * (1 + sensor_prior_weight * sensor_mean)

        clip = RankedClip(
            rank=0,
            id=cand.id,
            start=cand.start,
            end=cand.end,
            scores=cand.scores,
            final_score=round(final_score, 4),
            clip_type=cand.clip_type,
            title=cand.title_suggestions[0] if cand.title_suggestions else "",
            title_alternatives=cand.title_suggestions[1:],
            hook_text_suggestion=cand.hook_text_suggestion,
            risk_flags=cand.risk_flags,
            reasoning=cand.reasoning,
            signal_vector=cand.signal_vector,
        )

        has_risk = any(f != "none" for f in cand.risk_flags)
        if has_risk:
            flagged.append(clip)
        else:
            scored.append((final_score, clip))

    scored.sort(key=lambda x: x[0], reverse=True)

    selected: list[RankedClip] = []
    type_counts: dict[str, int] = {}

    for _, clip in scored:
        if len(selected) >= settings.max_clips:
            break

        ct = clip.clip_type
        if type_counts.get(ct, 0) >= max_same_type:
            continue

        too_close = any(
            abs(clip.start - s.start) < min_gap_s for s in selected
        )
        if too_close:
            continue

        type_counts[ct] = type_counts.get(ct, 0) + 1
        clip.rank = len(selected) + 1
        selected.append(clip)

    if updater:
        updater.update_progress(1.0)

    log.info("ranked %d clips (%d flagged)", len(selected), len(flagged))
    manifest = RankedManifest(
        clips=selected,
        content_type=judged.content_type,
        flagged=flagged,
    )
    manifest_path.write_text(manifest.model_dump_json(indent=2))
    return manifest


def _load_ranking_config() -> dict:
    path = Path("config/ranking.yaml")
    if not path.exists():
        return {}
    with open(path) as f:
        return yaml.safe_load(f) or {}

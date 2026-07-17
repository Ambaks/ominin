from __future__ import annotations

import logging
import uuid
from pathlib import Path

import yaml
from scipy.signal import find_peaks
import numpy as np

import anthropic
from pydantic import BaseModel

from clipper.common.llm import strict_json_call
from clipper.common.settings import Settings
from clipper.common.supabase_client import JobUpdater
from clipper.schemas import (
    Candidate,
    CandidatesManifest,
    SignalsManifest,
    TranscriptManifest,
)

log = logging.getLogger(__name__)


class ClassifyResponse(BaseModel):
    content_type: str
    confidence: float
    reasoning: str


def run(
    job_dir: Path,
    settings: Settings,
    updater: JobUpdater | None = None,
) -> CandidatesManifest:
    manifest_path = job_dir / "candidates.json"
    if manifest_path.exists():
        log.info("candidates.json exists, skipping fuse")
        return CandidatesManifest.model_validate_json(manifest_path.read_text())

    signals = SignalsManifest.model_validate_json(
        (job_dir / "signals.json").read_text()
    )
    transcript = TranscriptManifest.model_validate_json(
        (job_dir / "transcript.json").read_text()
    )

    if updater:
        updater.update_progress(0.1)

    content_type = _classify_content(transcript, settings)
    log.info("classified as: %s", content_type)

    config = _load_fusion_config()
    weights = config.get(content_type, config.get("default", {}))
    event_bonuses = config.get("event_bonuses", {})
    peak_cfg = config.get("peak_detection", {})

    if updater:
        updater.update_progress(0.3)

    all_times: set[float] = set()
    for sig in signals.signals:
        for pt in sig.series:
            all_times.add(pt.t)
    times = sorted(all_times)
    if not times:
        manifest = CandidatesManifest(candidates=[], content_type=content_type)
        manifest_path.write_text(manifest.model_dump_json(indent=2))
        return manifest

    composite = np.zeros(len(times))
    time_to_idx = {t: i for i, t in enumerate(times)}
    signal_arrays: dict[str, np.ndarray] = {}

    for sig in signals.signals:
        arr = np.zeros(len(times))
        for pt in sig.series:
            if pt.t in time_to_idx:
                arr[time_to_idx[pt.t]] = pt.value
        if arr.std() > 0:
            arr = (arr - arr.mean()) / arr.std()
        signal_arrays[sig.sensor] = arr

    total_weight = sum(
        weights.get(key, 0)
        for key in weights
        if key in _expand_signal_keys(signal_arrays)
    )
    if total_weight == 0:
        total_weight = 1.0

    for key, w in weights.items():
        for sig_name, arr in signal_arrays.items():
            expanded = _expand_signal_keys({sig_name: arr})
            if key in expanded:
                composite += arr * (w / total_weight)

    for sig in signals.signals:
        for evt in sig.events:
            label_base = evt.label.split(":")[0]
            bonus = event_bonuses.get(label_base, 0)
            if bonus > 0:
                for i, t in enumerate(times):
                    if evt.start <= t <= evt.end:
                        composite[i] += bonus

    if updater:
        updater.update_progress(0.5)

    min_prominence = peak_cfg.get("min_prominence", 0.5)
    hop = times[1] - times[0] if len(times) > 1 else 0.5
    min_distance_s = peak_cfg.get("min_distance_s", 30.0)
    min_distance_samples = max(1, int(min_distance_s / hop))

    peaks, properties = find_peaks(
        composite,
        prominence=min_prominence,
        distance=min_distance_samples,
    )

    expand_s = peak_cfg.get("candidate_expand_s", 15.0)
    min_dur = peak_cfg.get("candidate_min_s", 15.0)
    max_dur = peak_cfg.get("candidate_max_s", 120.0)
    max_clips = settings.max_clips
    over_gen = peak_cfg.get("over_generation_factor", 5)
    max_candidates = max_clips * over_gen

    peak_scores = [
        (composite[p], p) for p in peaks
    ]
    peak_scores.sort(reverse=True)
    peak_scores = peak_scores[:max_candidates]

    candidates: list[Candidate] = []
    used_ranges: list[tuple[float, float]] = []

    for score, peak_idx in peak_scores:
        center = times[peak_idx]
        start = max(0, center - expand_s)
        end = center + expand_s

        seg_start = _find_segment_start(transcript, start)
        seg_end = _find_segment_end(transcript, end)
        if seg_start is not None:
            start = seg_start
        if seg_end is not None:
            end = seg_end

        duration = end - start
        if duration < min_dur:
            half_deficit = (min_dur - duration) / 2
            start = max(0, start - half_deficit)
            end += half_deficit
        if end - start > max_dur:
            end = start + max_dur

        overlaps = any(
            not (end <= rs or start >= re) for rs, re in used_ranges
        )
        if overlaps:
            continue

        signal_vector: dict[str, float] = {}
        for sig_name, arr in signal_arrays.items():
            window_vals = [
                arr[i] for i, t in enumerate(times)
                if start <= t <= end
            ]
            if window_vals:
                signal_vector[f"{sig_name}_mean"] = float(np.mean(window_vals))
                signal_vector[f"{sig_name}_max"] = float(np.max(window_vals))

        event_labels = []
        for sig in signals.signals:
            for evt in sig.events:
                if not (evt.end <= start or evt.start >= end):
                    event_labels.append(evt.label)

        candidates.append(Candidate(
            id=str(uuid.uuid4()),
            start=round(start, 2),
            end=round(end, 2),
            composite_score=round(float(score), 4),
            signal_vector=signal_vector,
            events=event_labels,
        ))
        used_ranges.append((start, end))

    if updater:
        updater.update_progress(1.0)

    log.info("nominated %d candidates", len(candidates))
    manifest = CandidatesManifest(
        candidates=candidates, content_type=content_type
    )
    manifest_path.write_text(manifest.model_dump_json(indent=2))
    return manifest


def _classify_content(
    transcript: TranscriptManifest, settings: Settings
) -> str:
    outline_words = []
    for seg in transcript.segments[:100]:
        outline_words.append(seg.text)
    outline = " ".join(outline_words)[:2000]

    prompt_path = Path("prompts/classify.md")
    if not prompt_path.exists():
        return "podcast"
    template = prompt_path.read_text()
    user_msg = template.replace("{transcript_outline}", outline)

    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        result = strict_json_call(
            client,
            model=settings.classify_model,
            system="Classify the video content type.",
            user=user_msg,
            schema=ClassifyResponse,
        )
        return result.content_type
    except Exception:
        log.warning("classification failed, defaulting to podcast")
        return "podcast"


def _load_fusion_config() -> dict:
    path = Path("config/fusion.yaml")
    if not path.exists():
        return {"default": {"semantic": 1.0}}
    with open(path) as f:
        return yaml.safe_load(f) or {}


def _expand_signal_keys(arrays: dict[str, np.ndarray]) -> set[str]:
    keys: set[str] = set()
    for name in arrays:
        keys.add(name)
        keys.add(f"{name}_topic_shift")
        keys.add(f"{name}_narrative_marker")
        keys.add(f"{name}_qa")
    return keys


def _find_segment_start(
    transcript: TranscriptManifest, t: float
) -> float | None:
    for seg in transcript.segments:
        if seg.start <= t <= seg.end:
            return seg.start
    return None


def _find_segment_end(
    transcript: TranscriptManifest, t: float
) -> float | None:
    for seg in reversed(transcript.segments):
        if seg.start <= t <= seg.end:
            return seg.end
    return None

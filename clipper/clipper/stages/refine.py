from __future__ import annotations

import logging
import re
from pathlib import Path

from clipper.common.supabase_client import JobUpdater
from clipper.schemas import (
    CandidatesManifest,
    RefinedCandidate,
    RefinedCandidatesManifest,
    TranscriptManifest,
)

log = logging.getLogger(__name__)

SNAP_WINDOW_S = 1.5
FILLER_RE = re.compile(
    r"^(and so|so anyway|um+|uh+|like|bien|euh+|donc euh|et du coup)\b",
    re.IGNORECASE,
)


def run(
    job_dir: Path,
    updater: JobUpdater | None = None,
) -> RefinedCandidatesManifest:
    manifest_path = job_dir / "candidates_refined.json"
    if manifest_path.exists():
        log.info("candidates_refined.json exists, skipping refine")
        return RefinedCandidatesManifest.model_validate_json(
            manifest_path.read_text()
        )

    candidates = CandidatesManifest.model_validate_json(
        (job_dir / "candidates.json").read_text()
    )
    transcript = TranscriptManifest.model_validate_json(
        (job_dir / "transcript.json").read_text()
    )

    refined: list[RefinedCandidate] = []

    for i, cand in enumerate(candidates.candidates):
        start = _snap_to_sentence_start(transcript, cand.start)
        end = _snap_to_sentence_end(transcript, cand.end)

        start = _snap_to_silence(transcript, start, direction=-1)
        end = _snap_to_silence(transcript, end, direction=1)

        needs_hook = False
        first_seg = _segment_at(transcript, start)
        if first_seg and FILLER_RE.match(first_seg.text.strip()):
            extended = _find_setup_start(transcript, start)
            if extended is not None and start - extended <= 8.0:
                start = extended
            else:
                needs_hook = True

        duration = end - start
        if duration < 15.0:
            deficit = 15.0 - duration
            start = max(0, start - deficit / 2)
            end += deficit / 2
        if duration > 120.0:
            end = start + 120.0

        refined.append(RefinedCandidate(
            id=cand.id,
            start=round(start, 2),
            end=round(end, 2),
            original_start=cand.start,
            original_end=cand.end,
            composite_score=cand.composite_score,
            signal_vector=cand.signal_vector,
            events=cand.events,
            needs_hook_text=needs_hook,
        ))

        if updater:
            updater.update_progress((i + 1) / len(candidates.candidates))

    manifest = RefinedCandidatesManifest(
        candidates=refined, content_type=candidates.content_type
    )
    manifest_path.write_text(manifest.model_dump_json(indent=2))
    return manifest


def _snap_to_sentence_start(
    transcript: TranscriptManifest, t: float
) -> float:
    for seg in transcript.segments:
        if seg.start <= t <= seg.end:
            return seg.start
    best = t
    best_dist = float("inf")
    for seg in transcript.segments:
        dist = abs(seg.start - t)
        if dist < best_dist and dist < SNAP_WINDOW_S:
            best_dist = dist
            best = seg.start
    return best


def _snap_to_sentence_end(
    transcript: TranscriptManifest, t: float
) -> float:
    for seg in transcript.segments:
        if seg.start <= t <= seg.end:
            return seg.end
    best = t
    best_dist = float("inf")
    for seg in transcript.segments:
        dist = abs(seg.end - t)
        if dist < best_dist and dist < SNAP_WINDOW_S:
            best_dist = dist
            best = seg.end
    return best


def _snap_to_silence(
    transcript: TranscriptManifest, t: float, direction: int
) -> float:
    words = transcript.words
    if not words:
        return t

    for i in range(len(words) - 1):
        gap_start = words[i].end
        gap_end = words[i + 1].start
        gap_dur = gap_end - gap_start
        if gap_dur >= 0.25:
            mid = (gap_start + gap_end) / 2
            if abs(mid - t) <= SNAP_WINDOW_S:
                if direction < 0 and mid <= t:
                    return mid
                if direction > 0 and mid >= t:
                    return mid
    return t


def _segment_at(transcript: TranscriptManifest, t: float):
    for seg in transcript.segments:
        if seg.start <= t <= seg.end:
            return seg
    return None


def _find_setup_start(
    transcript: TranscriptManifest, t: float
) -> float | None:
    preceding = [
        seg for seg in transcript.segments if seg.end <= t
    ]
    if not preceding:
        return None
    return preceding[-1].start

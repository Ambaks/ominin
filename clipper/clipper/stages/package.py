from __future__ import annotations

import json
import logging
from pathlib import Path

from clipper.common.supabase_client import JobUpdater
from clipper.schemas import DeliverableManifest, MediaManifest, RenderedClip

log = logging.getLogger(__name__)


def run(
    job_dir: Path,
    updater: JobUpdater | None = None,
) -> DeliverableManifest:
    manifest_path = job_dir / "deliverable.json"
    if manifest_path.exists():
        log.info("deliverable.json exists, skipping package")
        return DeliverableManifest.model_validate_json(manifest_path.read_text())

    media = MediaManifest.model_validate_json(
        (job_dir / "media.json").read_text()
    )
    clips_data = json.loads((job_dir / "clips.json").read_text())
    clips = [RenderedClip.model_validate(c) for c in clips_data]

    if updater and clips:
        total = len(clips)
        for i, clip in enumerate(clips):
            video_path = Path(clip.video_path)
            thumb_path = Path(clip.thumbnail_path) if clip.thumbnail_path else None

            user_id = _get_user_id(job_dir)
            remote_prefix = f"{user_id}/{job_dir.name}"

            if video_path.exists():
                remote_video = f"{remote_prefix}/{video_path.name}"
                updater.upload_file("clipper-output", remote_video, video_path)
                clip.video_path = remote_video

            if thumb_path and thumb_path.exists():
                remote_thumb = f"{remote_prefix}/{thumb_path.name}"
                updater.upload_file("clipper-output", remote_thumb, thumb_path)
                clip.thumbnail_path = remote_thumb

            updater.insert_clip({
                "rank": clip.rank,
                "title": clip.title,
                "title_alternatives": clip.title_alternatives,
                "clip_type": clip.clip_type,
                "source_start_s": clip.start,
                "source_end_s": clip.end,
                "duration_s": clip.duration_s,
                "storage_path": clip.video_path,
                "thumbnail_path": clip.thumbnail_path,
                "judge_scores": clip.scores.model_dump(),
                "judge_reasoning": clip.reasoning,
                "signal_summary": clip.signal_vector,
                "risk_flags": clip.risk_flags if clip.risk_flags else None,
            })

            updater.update_progress((i + 1) / total)
            log.info("uploaded clip %d/%d", i + 1, total)

    manifest = DeliverableManifest(
        clips=clips,
        source_url=media.source_url,
        source_title=media.source_title,
        content_type="",
    )
    manifest_path.write_text(manifest.model_dump_json(indent=2))
    return manifest


def _get_user_id(job_dir: Path) -> str:
    user_id_path = job_dir / "user_id.txt"
    if user_id_path.exists():
        return user_id_path.read_text().strip()
    return "local"

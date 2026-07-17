from __future__ import annotations

import logging
from pathlib import Path

from clipper.common.llm import create_anthropic
from clipper.common.settings import Settings
from clipper.common.supabase_client import JobUpdater
from clipper.judges.text_only import TextOnlyJudge
from clipper.schemas import (
    JudgedCandidate,
    JudgedManifest,
    MediaManifest,
    RefinedCandidatesManifest,
    TranscriptManifest,
)

log = logging.getLogger(__name__)


def run(
    job_dir: Path,
    settings: Settings,
    updater: JobUpdater | None = None,
) -> JudgedManifest:
    manifest_path = job_dir / "judged.json"
    if manifest_path.exists():
        log.info("judged.json exists, skipping judge")
        return JudgedManifest.model_validate_json(manifest_path.read_text())

    refined = RefinedCandidatesManifest.model_validate_json(
        (job_dir / "candidates_refined.json").read_text()
    )
    transcript = TranscriptManifest.model_validate_json(
        (job_dir / "transcript.json").read_text()
    )
    media = MediaManifest.model_validate_json(
        (job_dir / "media.json").read_text()
    )

    client = create_anthropic(settings)
    judge = TextOnlyJudge(client, settings.judge_model)

    judged: list[JudgedCandidate] = []
    total = len(refined.candidates)

    for i, cand in enumerate(refined.candidates):
        log.info("judging candidate %d/%d (%s)", i + 1, total, cand.id[:8])
        result = judge.judge(cand, transcript, media, refined.content_type)
        judged.append(result)

        if updater:
            updater.update_progress((i + 1) / total)

    manifest = JudgedManifest(
        candidates=judged, content_type=refined.content_type
    )
    manifest_path.write_text(manifest.model_dump_json(indent=2))
    return manifest

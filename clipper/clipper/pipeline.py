from __future__ import annotations

import logging
from pathlib import Path

from clipper.common.settings import Settings
from clipper.common.supabase_client import JobUpdater
from clipper.stages import ingest, transcribe, sense, fuse, refine, judge, rank, reformat, package

log = logging.getLogger(__name__)

STAGES = [
    "ingest",
    "transcribe",
    "sense",
    "fuse",
    "refine",
    "judge",
    "rank",
    "reformat",
    "package",
]


def run_pipeline(
    job_dir: Path,
    settings: Settings,
    updater: JobUpdater | None = None,
) -> int:
    job_dir.mkdir(parents=True, exist_ok=True)

    for stage_name in STAGES:
        log.info("=== stage: %s ===", stage_name)
        if updater:
            updater.set_stage(stage_name, 0.0)

        if stage_name == "ingest":
            ingest.run(job_dir, updater)
        elif stage_name == "transcribe":
            transcribe.run(job_dir, settings, updater)
        elif stage_name == "sense":
            sense.run(job_dir, updater)
        elif stage_name == "fuse":
            fuse.run(job_dir, settings, updater)
        elif stage_name == "refine":
            refine.run(job_dir, updater)
        elif stage_name == "judge":
            judge.run(job_dir, settings, updater)
        elif stage_name == "rank":
            rank.run(job_dir, settings, updater)
        elif stage_name == "reformat":
            reformat.run(job_dir, updater)
        elif stage_name == "package":
            package.run(job_dir, updater)

        if updater:
            updater.set_stage(stage_name, 1.0)

    ranked_path = job_dir / "ranked.json"
    if ranked_path.exists():
        from clipper.schemas import RankedManifest
        ranked = RankedManifest.model_validate_json(ranked_path.read_text())
        return len(ranked.clips)
    return 0

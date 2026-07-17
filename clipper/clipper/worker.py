from __future__ import annotations

import logging
import time
from pathlib import Path

from clipper.common.settings import Settings
from clipper.common.supabase_client import JobUpdater, create_supabase
from clipper.pipeline import run_pipeline

log = logging.getLogger(__name__)

POLL_INTERVAL_S = 10


def run_worker(settings: Settings) -> None:
    client = create_supabase(settings)
    work_dir = Path(settings.work_dir)
    work_dir.mkdir(exist_ok=True)

    log.info("worker started, polling every %ds", POLL_INTERVAL_S)

    while True:
        job = _poll_pending(client)
        if job:
            job_id = job["id"]
            log.info("claimed job %s", job_id)
            _process_job(client, settings, work_dir, job)
        else:
            time.sleep(POLL_INTERVAL_S)


def _poll_pending(client) -> dict | None:
    result = (
        client.table("clipper_jobs")
        .select("id, source_url, user_id")
        .eq("status", "en_attente")
        .order("created_at")
        .limit(1)
        .execute()
    )
    if not result.data:
        return None

    job = result.data[0]
    client.table("clipper_jobs").update({
        "status": "en_cours",
    }).eq("id", job["id"]).execute()

    return job


def _process_job(
    client, settings: Settings, work_dir: Path, job: dict
) -> None:
    job_id = job["id"]
    job_dir = work_dir / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    (job_dir / "source_url.txt").write_text(job["source_url"])
    (job_dir / "user_id.txt").write_text(job.get("user_id", "unknown"))

    updater = JobUpdater(client, job_id)

    try:
        clip_count = run_pipeline(job_dir, settings, updater)
        updater.complete(clip_count)
    except Exception as exc:
        log.exception("job %s failed", job_id)
        updater.fail(str(exc))

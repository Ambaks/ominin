from __future__ import annotations

import logging
from pathlib import Path

from supabase import create_client, Client

from .settings import Settings

log = logging.getLogger(__name__)


def create_supabase(settings: Settings) -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


class JobUpdater:
    def __init__(self, client: Client, job_id: str) -> None:
        self._client = client
        self._job_id = job_id

    def set_stage(self, stage: str, progress: float = 0.0) -> None:
        log.info("stage=%s progress=%.2f", stage, progress)
        self._client.table("clipper_jobs").update({
            "current_stage": stage,
            "stage_progress": progress,
        }).eq("id", self._job_id).execute()

    def update_progress(self, progress: float) -> None:
        self._client.table("clipper_jobs").update({
            "stage_progress": min(progress, 1.0),
        }).eq("id", self._job_id).execute()

    def set_source_info(self, title: str, duration_s: float) -> None:
        self._client.table("clipper_jobs").update({
            "source_title": title,
            "source_duration_s": duration_s,
        }).eq("id", self._job_id).execute()

    def complete(self, clip_count: int) -> None:
        log.info("job %s complete, %d clips", self._job_id, clip_count)
        self._client.table("clipper_jobs").update({
            "status": "termine",
            "clip_count": clip_count,
            "stage_progress": 1.0,
            "completed_at": "now()",
        }).eq("id", self._job_id).execute()

    def fail(self, message: str) -> None:
        log.error("job %s failed: %s", self._job_id, message)
        self._client.table("clipper_jobs").update({
            "status": "echec",
            "error_message": message[:1000],
        }).eq("id", self._job_id).execute()

    def insert_clip(self, clip_data: dict) -> str:
        result = self._client.table("clipper_clips").insert({
            "job_id": self._job_id,
            **clip_data,
        }).execute()
        return result.data[0]["id"]

    def upload_file(self, bucket: str, remote_path: str, local_path: Path) -> None:
        with open(local_path, "rb") as f:
            self._client.storage.from_(bucket).upload(
                remote_path,
                f,
                file_options={"content-type": _content_type(local_path)},
            )


def _content_type(path: Path) -> str:
    suffix = path.suffix.lower()
    return {
        ".mp4": "video/mp4",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }.get(suffix, "application/octet-stream")

from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from app.clients.supabase import get_supabase
from app.config import settings


def start(job: str) -> str | None:
    """Overlap guard: one run per job at a time. Returns the new run id, or
    None if a fresh run is already in flight. Stale 'running' rows (older
    than run_stale_minutes — the process was killed) are closed as failed."""
    sb = get_supabase()
    cutoff = datetime.now(UTC) - timedelta(minutes=settings.run_stale_minutes)
    running = (
        sb.table("outreach_runs")
        .select("id, started_at")
        .eq("job", job)
        .eq("status", "running")
        .execute()
    ).data
    for row in running:
        if datetime.fromisoformat(row["started_at"]) > cutoff:
            return None
        sb.table("outreach_runs").update(
            {
                "status": "failed",
                "error": "stale: process killed before finishing",
                "finished_at": datetime.now(UTC).isoformat(),
            }
        ).eq("id", row["id"]).execute()

    inserted = sb.table("outreach_runs").insert({"job": job}).execute()
    return inserted.data[0]["id"]


def execute(run_id: str, fn: Callable[[], dict]) -> None:
    """Run a job function and close its run row with stats or the error."""
    sb = get_supabase()
    try:
        stats = fn()
        sb.table("outreach_runs").update(
            {
                "status": "succeeded",
                "stats": stats,
                "finished_at": datetime.now(UTC).isoformat(),
            }
        ).eq("id", run_id).execute()
    except Exception as exc:  # noqa: BLE001 — the run row is the error report
        sb.table("outreach_runs").update(
            {
                "status": "failed",
                "error": f"{type(exc).__name__}: {exc}",
                "finished_at": datetime.now(UTC).isoformat(),
            }
        ).eq("id", run_id).execute()

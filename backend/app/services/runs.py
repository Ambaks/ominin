from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from app.clients.supabase import get_supabase
from app.config import settings
from app.services import notify


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


def execute(run_id: str, job: str, fn: Callable[..., dict]) -> None:
    """Run a job function and close its run row with stats or the error.

    Failures and systematic aborts alert the operator: a silently dead cron
    means replies unclassified and zero sends for days."""
    sb = get_supabase()

    def _flush(stats: dict) -> None:
        try:
            sb.table("outreach_runs").update({"stats": stats}).eq(
                "id", run_id
            ).execute()
        except Exception:  # noqa: BLE001 — best-effort, must never abort the batch
            pass

    try:
        stats = fn(flush=_flush)
        sb.table("outreach_runs").update(
            {
                "status": "succeeded",
                "stats": stats,
                "finished_at": datetime.now(UTC).isoformat(),
            }
        ).eq("id", run_id).execute()
        if stats.get("aborted"):
            notify.send(
                f"Léa — run {job} interrompu",
                f"{stats.get('aborted')}\nDernière erreur : {stats.get('last_error')}",
            )
    except Exception as exc:  # noqa: BLE001 — the run row is the error report
        error = f"{type(exc).__name__}: {exc}"
        sb.table("outreach_runs").update(
            {
                "status": "failed",
                "error": error,
                "finished_at": datetime.now(UTC).isoformat(),
            }
        ).eq("id", run_id).execute()
        notify.send(f"Léa — run {job} en échec", error)

from __future__ import annotations

import logging
from pathlib import Path

import typer

from clipper.common.ffmpeg import require_ffmpeg
from clipper.common.settings import load_settings

app = typer.Typer(help="Clipper: long-form video → ranked social clips")


@app.command()
def run(
    url: str = typer.Argument(help="YouTube or Twitch URL"),
    job_id: str | None = typer.Option(None, "--job", help="Resume a job by ID"),
) -> None:
    """Download a video and run the full pipeline."""
    _setup_logging()
    require_ffmpeg()
    settings = load_settings()

    from clipper.pipeline import run_pipeline

    work_dir = Path(settings.work_dir)
    if job_id:
        job_dir = work_dir / job_id
    else:
        import uuid
        job_id = str(uuid.uuid4())
        job_dir = work_dir / job_id

    job_dir.mkdir(parents=True, exist_ok=True)
    (job_dir / "source_url.txt").write_text(url)

    typer.echo(f"Job: {job_id}")
    typer.echo(f"Dir: {job_dir}")

    clip_count = run_pipeline(job_dir, settings)
    typer.echo(f"Done — {clip_count} clips in {job_dir / 'clips'}")


@app.command()
def worker() -> None:
    """Poll Supabase for pending jobs and process them."""
    _setup_logging()
    require_ffmpeg()
    settings = load_settings()

    from clipper.worker import run_worker
    run_worker(settings)


@app.command()
def stage(
    name: str = typer.Argument(help="Stage name (ingest, transcribe, ...)"),
    job: str = typer.Option(..., "--job", help="Job ID"),
) -> None:
    """Re-run a single stage for an existing job."""
    _setup_logging()
    require_ffmpeg()
    settings = load_settings()

    from clipper import stages
    from clipper.common.supabase_client import JobUpdater

    job_dir = Path(settings.work_dir) / job
    if not job_dir.exists():
        typer.echo(f"Job dir not found: {job_dir}", err=True)
        raise typer.Exit(1)

    stage_map = {
        "ingest": lambda: stages.ingest.run(job_dir),
        "transcribe": lambda: stages.transcribe.run(job_dir, settings),
        "sense": lambda: stages.sense.run(job_dir),
        "fuse": lambda: stages.fuse.run(job_dir, settings),
        "refine": lambda: stages.refine.run(job_dir),
        "judge": lambda: stages.judge.run(job_dir, settings),
        "rank": lambda: stages.rank.run(job_dir, settings),
        "reformat": lambda: stages.reformat.run(job_dir),
        "package": lambda: stages.package.run(job_dir),
    }

    fn = stage_map.get(name)
    if not fn:
        typer.echo(f"Unknown stage: {name}. Options: {', '.join(stage_map)}", err=True)
        raise typer.Exit(1)

    typer.echo(f"Running stage '{name}' for job {job}")
    fn()
    typer.echo("Done.")


def _setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )


if __name__ == "__main__":
    app()

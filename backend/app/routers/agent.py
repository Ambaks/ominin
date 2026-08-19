from collections.abc import Callable

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.deps import require_trigger_secret
from app.services import discovery, enrichment, inbox, outreach, runs

router = APIRouter(prefix="/agent", dependencies=[Depends(require_trigger_secret)])

JOBS: dict[str, Callable[[], dict]] = {
    "discover": discovery.run_discovery,
    "enrich": enrichment.run_enrichment,
    "outreach": outreach.run_outreach,
    "inbox": inbox.run_inbox,
}


def _trigger(job: str, background_tasks: BackgroundTasks) -> dict:
    run_id = runs.start(job)
    if run_id is None:
        raise HTTPException(status_code=409, detail=f"{job} already running")
    background_tasks.add_task(runs.execute, run_id, job, JOBS[job])
    return {"run_id": run_id, "job": job}


@router.post("/discover", status_code=202)
def trigger_discover(background_tasks: BackgroundTasks) -> dict:
    return _trigger("discover", background_tasks)


@router.post("/enrich", status_code=202)
def trigger_enrich(background_tasks: BackgroundTasks) -> dict:
    return _trigger("enrich", background_tasks)


@router.post("/outreach", status_code=202)
def trigger_outreach(background_tasks: BackgroundTasks) -> dict:
    return _trigger("outreach", background_tasks)


@router.post("/inbox", status_code=202)
def trigger_inbox(background_tasks: BackgroundTasks) -> dict:
    return _trigger("inbox", background_tasks)

from collections.abc import Callable

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from app.deps import require_trigger_secret
from app.services import (
    autoresearch,
    discovery,
    enrichment,
    inbox,
    outreach,
    runs,
    social_post,
    social_research,
)

router = APIRouter(prefix="/agent", dependencies=[Depends(require_trigger_secret)])

JOBS: dict[str, Callable[..., dict]] = {
    "discover": discovery.run_discovery,
    "enrich": enrichment.run_enrichment,
    "outreach": outreach.run_outreach,
    "inbox": inbox.run_inbox,
    "autoresearch": autoresearch.run_autoresearch,
    "social_post": social_post.run_social_post,
    "social_research": social_research.run_social_research,
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


@router.post("/autoresearch", status_code=202)
def trigger_autoresearch(background_tasks: BackgroundTasks) -> dict:
    return _trigger("autoresearch", background_tasks)


@router.post("/social-post", status_code=202)
def trigger_social_post(background_tasks: BackgroundTasks) -> dict:
    return _trigger("social_post", background_tasks)


@router.post("/social-research", status_code=202)
def trigger_social_research(background_tasks: BackgroundTasks) -> dict:
    return _trigger("social_research", background_tasks)

"""Sets off the social-render GitHub workflow, which renders pending Reels.

The workflow picks up every post whose render is pending on its own: one
dispatch covers any number of them, and a dispatch while a render is running
queues behind it (the workflow has a concurrency group)."""

import httpx

from app.config import settings


class GitHubError(RuntimeError):
    pass


def dispatch_render() -> None:
    if not settings.github_repository or not settings.github_dispatch_token:
        raise GitHubError("GITHUB_REPOSITORY / GITHUB_DISPATCH_TOKEN manquants")
    response = httpx.post(
        f"https://api.github.com/repos/{settings.github_repository}/dispatches",
        json={"event_type": "social-render"},
        headers={
            "Authorization": f"Bearer {settings.github_dispatch_token}",
            "Accept": "application/vnd.github+json",
        },
        timeout=settings.internal_http_timeout_seconds,
    )
    if response.is_error:
        raise GitHubError(
            f"dispatch social-render : {response.status_code} {response.text}"
        )

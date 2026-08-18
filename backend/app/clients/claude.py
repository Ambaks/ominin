import asyncio

from claude_agent_sdk import ClaudeAgentOptions, ResultMessage, query
from pydantic import BaseModel

from app.config import settings


def _credentials_env() -> dict[str, str]:
    """The Agent SDK spawns a Claude Code subprocess that authenticates from
    the process environment — pydantic's .env values never reach os.environ,
    so pass them through explicitly. CLAUDE_CODE_OAUTH_TOKEN (from
    `claude setup-token`) bills the Claude Code subscription; an API key
    bills pay-per-use; with neither set, the machine's `claude` login is
    used (local dev)."""
    if settings.claude_code_oauth_token:
        return {"CLAUDE_CODE_OAUTH_TOKEN": settings.claude_code_oauth_token}
    if settings.anthropic_api_key:
        return {"ANTHROPIC_API_KEY": settings.anthropic_api_key}
    return {}


def parse_structured[T: BaseModel](
    system: str, content: str, output_model: type[T]
) -> T:
    """Single-turn, tool-less Claude call returning schema-validated output.

    Sync on purpose: jobs run in FastAPI BackgroundTasks worker threads,
    where asyncio.run() owns the thread's (nonexistent) loop safely."""
    return asyncio.run(_parse(system, content, output_model))


async def _parse[T: BaseModel](
    system: str, content: str, output_model: type[T]
) -> T:
    options = ClaudeAgentOptions(
        system_prompt=system,
        model=settings.outreach_model,
        allowed_tools=[],
        permission_mode="dontAsk",
        env=_credentials_env(),
        output_format={
            "type": "json_schema",
            "schema": output_model.model_json_schema(),
        },
    )
    # Exhaust the stream rather than returning mid-iteration: abandoning the
    # generator makes its aclose() race the event-loop teardown.
    result: T | None = None
    error: str | None = None
    async for message in query(prompt=content, options=options):
        if isinstance(message, ResultMessage):
            if message.is_error or message.structured_output is None:
                error = f"claude call failed ({message.subtype}): {message.result}"
            else:
                result = output_model.model_validate(message.structured_output)
    if error:
        raise RuntimeError(error)
    if result is None:
        raise RuntimeError("claude call produced no result")
    return result

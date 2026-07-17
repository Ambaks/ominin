from __future__ import annotations

import json
import logging
from typing import TypeVar

import anthropic
from pydantic import BaseModel, ValidationError

from .settings import Settings

log = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


def create_anthropic(settings: Settings) -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def strict_json_call(
    client: anthropic.Anthropic,
    *,
    model: str,
    system: str,
    user: str,
    schema: type[T],
    max_retries: int = 3,
    max_tokens: int = 4096,
) -> T:
    messages: list[dict] = [{"role": "user", "content": user}]

    for attempt in range(max_retries):
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
        )
        raw = response.content[0].text

        try:
            parsed = json.loads(raw)
            return schema.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError) as exc:
            log.warning("LLM JSON attempt %d failed: %s", attempt + 1, exc)
            if attempt < max_retries - 1:
                messages.append({"role": "assistant", "content": raw})
                messages.append({
                    "role": "user",
                    "content": (
                        f"Your response was not valid JSON matching the schema. "
                        f"Error: {exc}\n\nPlease try again with valid JSON only, "
                        f"no markdown fences."
                    ),
                })

    raise ValueError(f"LLM failed to produce valid {schema.__name__} after {max_retries} attempts")

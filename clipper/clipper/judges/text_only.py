from __future__ import annotations

import logging
from pathlib import Path

import anthropic
from pydantic import BaseModel

from clipper.schemas import (
    JudgedCandidate,
    JudgeScores,
    RefinedCandidate,
    TranscriptManifest,
    MediaManifest,
)
from clipper.common.llm import strict_json_call
from .base import Judge

log = logging.getLogger(__name__)

CONTEXT_S = 20.0


class JudgeResponse(BaseModel):
    hook_strength: int
    emotional_peak: int
    self_contained: int
    delivery: int
    payoff: int
    quotability: int
    clip_type: str
    best_subwindow: dict[str, float]
    hook_text_suggestion: str = ""
    title_suggestions: list[str] = []
    risk_flags: list[str] = []
    reasoning: str = ""


class TextOnlyJudge(Judge):
    def __init__(self, client: anthropic.Anthropic, model: str) -> None:
        self._client = client
        self._model = model

    def judge(
        self,
        candidate: RefinedCandidate,
        transcript: TranscriptManifest,
        media: MediaManifest,
        content_type: str,
    ) -> JudgedCandidate:
        context_start = max(0, candidate.start - CONTEXT_S)
        context_end = candidate.end + CONTEXT_S

        context_segs = [
            s for s in transcript.segments
            if s.end > context_start and s.start < context_end
        ]
        transcript_block = "\n".join(
            f"[{_mmss(s.start)}-{_mmss(s.end)}]"
            f"{f' ({s.speaker})' if s.speaker else ''} {s.text}"
            for s in context_segs
        )

        prompt_template = _load_prompt(content_type)
        user_msg = prompt_template.format(
            show_name=media.source_title or "Unknown",
            content_type=content_type,
            window_start_mmss=_mmss(candidate.start),
            window_end_mmss=_mmss(candidate.end),
            transcript_block=transcript_block,
            context_seconds=int(CONTEXT_S),
        )

        try:
            result = strict_json_call(
                self._client,
                model=self._model,
                system="You are a clip quality judge. Respond only with JSON.",
                user=user_msg,
                schema=JudgeResponse,
            )
            return JudgedCandidate(
                id=candidate.id,
                start=candidate.start,
                end=candidate.end,
                scores=JudgeScores(
                    hook_strength=result.hook_strength,
                    emotional_peak=result.emotional_peak,
                    self_contained=result.self_contained,
                    delivery=result.delivery,
                    payoff=result.payoff,
                    quotability=result.quotability,
                ),
                clip_type=result.clip_type,
                best_subwindow_start=result.best_subwindow.get("start"),
                best_subwindow_end=result.best_subwindow.get("end"),
                hook_text_suggestion=result.hook_text_suggestion,
                title_suggestions=result.title_suggestions,
                risk_flags=result.risk_flags,
                reasoning=result.reasoning,
                judge_status="ok",
                composite_score=candidate.composite_score,
                signal_vector=candidate.signal_vector,
                events=candidate.events,
            )
        except Exception:
            log.exception("judge failed for candidate %s", candidate.id)
            return JudgedCandidate(
                id=candidate.id,
                start=candidate.start,
                end=candidate.end,
                judge_status="failed",
                composite_score=candidate.composite_score,
                signal_vector=candidate.signal_vector,
                events=candidate.events,
            )


def _mmss(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    return f"{m}:{s:02d}"


def _load_prompt(content_type: str) -> str:
    prompt_dir = Path("prompts")
    candidates = [
        prompt_dir / f"judge_{content_type}.md",
        prompt_dir / "judge_default.md",
    ]
    for path in candidates:
        if path.exists():
            return path.read_text()
    raise FileNotFoundError(f"No judge prompt found for {content_type}")

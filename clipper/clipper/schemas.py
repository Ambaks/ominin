from __future__ import annotations

from pydantic import BaseModel, Field


class MediaManifest(BaseModel):
    source_url: str
    source_title: str
    source_duration_s: float
    video_path: str
    audio_16k_path: str
    fps: float
    width: int
    height: int
    platform: str
    chat_path: str | None = None


class Word(BaseModel):
    w: str
    start: float
    end: float
    speaker: str | None = None
    conf: float = 1.0


class Segment(BaseModel):
    text: str
    start: float
    end: float
    speaker: str | None = None


class TranscriptManifest(BaseModel):
    words: list[Word]
    segments: list[Segment]
    language: str


class SignalPoint(BaseModel):
    t: float
    value: float


class SignalEvent(BaseModel):
    start: float
    end: float
    label: str
    conf: float = 1.0


class SensorOutput(BaseModel):
    sensor: str
    series: list[SignalPoint]
    events: list[SignalEvent]


class SignalsManifest(BaseModel):
    signals: list[SensorOutput]
    content_type: str


class Candidate(BaseModel):
    id: str
    start: float
    end: float
    composite_score: float
    signal_vector: dict[str, float] = Field(default_factory=dict)
    events: list[str] = Field(default_factory=list)


class CandidatesManifest(BaseModel):
    candidates: list[Candidate]
    content_type: str


class RefinedCandidate(BaseModel):
    id: str
    start: float
    end: float
    original_start: float
    original_end: float
    composite_score: float
    signal_vector: dict[str, float] = Field(default_factory=dict)
    events: list[str] = Field(default_factory=list)
    needs_hook_text: bool = False


class RefinedCandidatesManifest(BaseModel):
    candidates: list[RefinedCandidate]
    content_type: str


class JudgeScores(BaseModel):
    hook_strength: int = 0
    emotional_peak: int = 0
    self_contained: int = 0
    delivery: int = 0
    payoff: int = 0
    quotability: int = 0


class JudgedCandidate(BaseModel):
    id: str
    start: float
    end: float
    scores: JudgeScores = Field(default_factory=JudgeScores)
    clip_type: str = ""
    best_subwindow_start: float | None = None
    best_subwindow_end: float | None = None
    hook_text_suggestion: str = ""
    title_suggestions: list[str] = Field(default_factory=list)
    risk_flags: list[str] = Field(default_factory=list)
    reasoning: str = ""
    judge_status: str = "ok"
    composite_score: float = 0
    signal_vector: dict[str, float] = Field(default_factory=dict)
    events: list[str] = Field(default_factory=list)


class JudgedManifest(BaseModel):
    candidates: list[JudgedCandidate]
    content_type: str


class RankedClip(BaseModel):
    rank: int
    id: str
    start: float
    end: float
    scores: JudgeScores
    final_score: float
    clip_type: str
    title: str
    title_alternatives: list[str] = Field(default_factory=list)
    hook_text_suggestion: str = ""
    risk_flags: list[str] = Field(default_factory=list)
    reasoning: str = ""
    signal_vector: dict[str, float] = Field(default_factory=dict)


class RankedManifest(BaseModel):
    clips: list[RankedClip]
    content_type: str
    flagged: list[RankedClip] = Field(default_factory=list)


class RenderedClip(BaseModel):
    rank: int
    id: str
    video_path: str
    thumbnail_path: str | None = None
    title: str
    title_alternatives: list[str] = Field(default_factory=list)
    clip_type: str
    start: float
    end: float
    duration_s: float
    scores: JudgeScores
    final_score: float
    hook_text_suggestion: str = ""
    risk_flags: list[str] = Field(default_factory=list)
    reasoning: str = ""
    signal_vector: dict[str, float] = Field(default_factory=dict)


class DeliverableManifest(BaseModel):
    clips: list[RenderedClip]
    source_url: str
    source_title: str
    content_type: str

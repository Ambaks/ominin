from __future__ import annotations

import re
from pathlib import Path

import yaml

from clipper.schemas import (
    MediaManifest,
    SignalEvent,
    SignalPoint,
    SensorOutput,
    TranscriptManifest,
)
from .base import HOP_S, WINDOW_S, Sensor


class SemanticSensor(Sensor):
    @property
    def name(self) -> str:
        return "semantic"

    def run(
        self,
        media: MediaManifest,
        transcript: TranscriptManifest,
        job_dir: Path,
    ) -> SensorOutput:
        markers = _load_markers(transcript.language)
        duration = media.source_duration_s
        segments = transcript.segments

        series: list[SignalPoint] = []
        events: list[SignalEvent] = []

        t = 0.0
        while t < duration:
            window_segs = [
                s for s in segments if s.end > t and s.start < t + WINDOW_S
            ]
            window_text = " ".join(s.text for s in window_segs).lower()

            score = 0.0

            for marker in markers:
                if marker in window_text:
                    score += 1.0
                    events.append(SignalEvent(
                        start=t, end=t + WINDOW_S,
                        label=f"narrative_marker:{marker[:30]}",
                    ))

            if "?" in window_text:
                next_segs = [
                    s for s in segments
                    if s.start >= t + WINDOW_S and s.start < t + WINDOW_S * 2
                ]
                if next_segs:
                    score += 0.5
                    events.append(SignalEvent(
                        start=t, end=t + WINDOW_S * 2,
                        label="question_answer",
                    ))

            prev_start = max(0, t - WINDOW_S)
            prev_segs = [
                s for s in segments if s.end > prev_start and s.start < t
            ]
            if window_segs and prev_segs:
                prev_words = set(_tokenize(
                    " ".join(s.text for s in prev_segs)
                ))
                curr_words = set(_tokenize(window_text))
                if prev_words and curr_words:
                    overlap = len(prev_words & curr_words)
                    union = len(prev_words | curr_words)
                    jaccard = overlap / union if union else 0
                    topic_shift = 1.0 - jaccard
                    if topic_shift > 0.7:
                        score += topic_shift
                        events.append(SignalEvent(
                            start=t, end=t + HOP_S,
                            label="topic_shift",
                            conf=topic_shift,
                        ))

            series.append(SignalPoint(t=t, value=score))
            t += HOP_S

        return SensorOutput(sensor=self.name, series=series, events=events)


_WORD_RE = re.compile(r"\w{2,}", re.UNICODE)
_STOP_WORDS = frozenset(
    "the a an and or but in on at to for of is it this that with from by "
    "le la les un une des et ou mais dans sur en de du ce qui que il elle "
    "je tu nous vous ils elles ne pas se sa son ses".split()
)


def _tokenize(text: str) -> list[str]:
    return [
        w for w in _WORD_RE.findall(text.lower())
        if w not in _STOP_WORDS
    ]


def _load_markers(language: str) -> list[str]:
    config_path = Path("config/markers.yaml")
    if not config_path.exists():
        return []
    with open(config_path) as f:
        data = yaml.safe_load(f)
    lang_key = "fr" if language.startswith("fr") else "en"
    markers = data.get(lang_key, [])
    other_key = "en" if lang_key == "fr" else "fr"
    markers.extend(data.get(other_key, []))
    return [m.lower() for m in markers]

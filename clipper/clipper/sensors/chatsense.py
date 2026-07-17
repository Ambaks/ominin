from __future__ import annotations

import json
import logging
from pathlib import Path

import numpy as np
import yaml

from clipper.schemas import (
    MediaManifest,
    SensorOutput,
    SignalEvent,
    SignalPoint,
    TranscriptManifest,
)
from .base import HOP_S, WINDOW_S, Sensor, merge_burst_events, zscore

log = logging.getLogger(__name__)

# Emote reactions weigh heavier than raw velocity: a KEKW wall is a
# stronger clip signal than generic chatter volume.
EMOTE_WEIGHT = 1.5


class ChatSenseSensor(Sensor):
    @property
    def name(self) -> str:
        return "chatsense"

    def run(
        self,
        media: MediaManifest,
        transcript: TranscriptManifest,
        job_dir: Path,
    ) -> SensorOutput:
        config = _load_config()
        lag = float(config.get("lag_s", 0.0))
        tokens, phrases = _emote_matchers(config)

        times: list[float] = []
        has_emote: list[bool] = []
        with open(media.chat_path) as f:  # type: ignore[arg-type]
            for line in f:
                msg = json.loads(line)
                t = msg["t"] - lag
                if t < 0:
                    continue
                times.append(t)
                has_emote.append(_contains_emote(msg["text"], tokens, phrases))

        starts = np.arange(0.0, media.source_duration_s, HOP_S)
        if starts.size == 0 or not times:
            return SensorOutput(sensor=self.name, series=[], events=[])

        order = np.argsort(times)
        msg_times = np.asarray(times)[order]
        emote_flags = np.asarray(has_emote)[order]
        emote_prefix = np.concatenate([[0], np.cumsum(emote_flags)])

        velocity = np.zeros(starts.size)
        emote_rate = np.zeros(starts.size)
        for i, t in enumerate(starts):
            lo, hi = np.searchsorted(msg_times, [t, t + WINDOW_S])
            velocity[i] = hi - lo
            emote_rate[i] = emote_prefix[hi] - emote_prefix[lo]

        z_velocity = zscore(velocity)
        z_emote = zscore(emote_rate)
        excitement = z_velocity + EMOTE_WEIGHT * z_emote

        series = [
            SignalPoint(t=round(float(t), 2), value=round(float(v), 4))
            for t, v in zip(starts, excitement)
        ]

        events: list[SignalEvent] = []
        events.extend(merge_burst_events(starts, z_velocity, "chat_spike"))
        events.extend(merge_burst_events(starts, z_emote, "emote_burst"))

        return SensorOutput(sensor=self.name, series=series, events=events)


def _load_config() -> dict:
    path = Path("config/emotes.yaml")
    if not path.exists():
        return {}
    with open(path) as f:
        return yaml.safe_load(f) or {}


def _emote_matchers(config: dict) -> tuple[frozenset[str], list[str]]:
    entries = [
        str(e) for key in ("twitch", "youtube") for e in config.get(key, [])
    ]
    tokens = frozenset(e.lower() for e in entries if " " not in e)
    phrases = [e.lower() for e in entries if " " in e]
    return tokens, phrases


def _contains_emote(
    text: str, tokens: frozenset[str], phrases: list[str]
) -> bool:
    lowered = text.lower()
    if any(word in tokens for word in lowered.split()):
        return True
    return any(phrase in lowered for phrase in phrases)

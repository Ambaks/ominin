from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import parselmouth

from clipper.schemas import (
    MediaManifest,
    SensorOutput,
    SignalEvent,
    SignalPoint,
    TranscriptManifest,
)
from .base import HOP_S, WINDOW_S, Sensor, merge_burst_events, zscore

log = logging.getLogger(__name__)

FRAME_STEP_S = 0.1
PITCH_FLOOR_HZ = 75.0
PITCH_CEILING_HZ = 500.0
# Minimum voiced frames in a window before pitch range is meaningful.
MIN_VOICED_FRAMES = 5
# Speech rate contributes less than energy/pitch: fast talk alone is not a peak.
RATE_WEIGHT = 0.5
PAUSE_MIN_S = 1.5


class ProsodySensor(Sensor):
    @property
    def name(self) -> str:
        return "prosody"

    def run(
        self,
        media: MediaManifest,
        transcript: TranscriptManifest,
        job_dir: Path,
    ) -> SensorOutput:
        sound = parselmouth.Sound(media.audio_16k_path)

        log.info("computing intensity")
        intensity = sound.to_intensity(
            minimum_pitch=PITCH_FLOOR_HZ, time_step=FRAME_STEP_S
        )
        int_times = np.asarray(intensity.xs())
        int_vals = np.nan_to_num(intensity.values[0], neginf=0.0)

        log.info("computing pitch")
        pitch = sound.to_pitch(
            time_step=FRAME_STEP_S,
            pitch_floor=PITCH_FLOOR_HZ,
            pitch_ceiling=PITCH_CEILING_HZ,
        )
        pitch_times = np.asarray(pitch.xs())
        pitch_vals = pitch.selected_array["frequency"]

        word_starts = np.array(
            sorted(w.start for w in transcript.words), dtype=float
        )

        starts = np.arange(0.0, media.source_duration_s, HOP_S)
        if starts.size == 0 or int_times.size == 0:
            return SensorOutput(sensor=self.name, series=[], events=[])

        energy = np.zeros(starts.size)
        pitch_range = np.zeros(starts.size)
        rate = np.zeros(starts.size)

        for i, t in enumerate(starts):
            lo, hi = np.searchsorted(int_times, [t, t + WINDOW_S])
            if hi > lo:
                energy[i] = float(np.mean(int_vals[lo:hi]))

            lo, hi = np.searchsorted(pitch_times, [t, t + WINDOW_S])
            voiced = pitch_vals[lo:hi]
            voiced = voiced[voiced > 0]
            if voiced.size >= MIN_VOICED_FRAMES:
                pitch_range[i] = float(
                    np.percentile(voiced, 90) - np.percentile(voiced, 50)
                )

            lo, hi = np.searchsorted(word_starts, [t, t + WINDOW_S])
            rate[i] = (hi - lo) / WINDOW_S

        z_energy = zscore(energy)
        z_pitch = zscore(pitch_range)
        z_rate = zscore(rate)
        arousal = z_energy + z_pitch + RATE_WEIGHT * z_rate

        series = [
            SignalPoint(t=round(float(t), 2), value=round(float(v), 4))
            for t, v in zip(starts, arousal)
        ]

        events: list[SignalEvent] = []
        events.extend(merge_burst_events(starts, z_energy, "energy_burst"))
        events.extend(merge_burst_events(starts, z_pitch, "pitch_spike"))
        events.extend(merge_burst_events(starts, z_rate, "rapid_speech"))
        events.extend(_pause_events(transcript))

        return SensorOutput(sensor=self.name, series=series, events=events)


def _pause_events(transcript: TranscriptManifest) -> list[SignalEvent]:
    words = sorted(transcript.words, key=lambda w: w.start)
    events: list[SignalEvent] = []
    for prev, nxt in zip(words, words[1:]):
        gap = nxt.start - prev.end
        if gap >= PAUSE_MIN_S:
            events.append(SignalEvent(
                start=round(prev.end, 2),
                end=round(nxt.start, 2),
                label="long_pause",
            ))
    return events

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

import numpy as np

from clipper.schemas import SensorOutput, SignalEvent, TranscriptManifest, MediaManifest

# All sensors emit on the same time grid so the fuse stage can combine
# their series point-for-point.
WINDOW_S = 10.0
HOP_S = 0.5
# z-score above which a window counts as a burst event.
BURST_Z = 2.0


class Sensor(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def run(
        self,
        media: MediaManifest,
        transcript: TranscriptManifest,
        job_dir: Path,
    ) -> SensorOutput: ...


def zscore(arr: np.ndarray) -> np.ndarray:
    std = arr.std()
    if std == 0:
        return np.zeros_like(arr)
    return (arr - arr.mean()) / std


def merge_burst_events(
    starts: np.ndarray, z: np.ndarray, label: str
) -> list[SignalEvent]:
    """Merge consecutive above-threshold windows into single events."""
    events: list[SignalEvent] = []
    run_start: float | None = None
    run_peak = 0.0
    for t, value in zip(starts, z):
        if value >= BURST_Z:
            if run_start is None:
                run_start = float(t)
                run_peak = float(value)
            else:
                run_peak = max(run_peak, float(value))
        elif run_start is not None:
            events.append(_burst(run_start, float(t), label, run_peak))
            run_start = None
    if run_start is not None:
        events.append(_burst(run_start, float(starts[-1]), label, run_peak))
    return events


def _burst(start: float, last_t: float, label: str, peak: float) -> SignalEvent:
    return SignalEvent(
        start=round(start, 2),
        end=round(last_t + WINDOW_S, 2),
        label=label,
        conf=min(1.0, peak / (BURST_Z * 2)),
    )

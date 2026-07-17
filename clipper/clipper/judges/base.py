from __future__ import annotations

from abc import ABC, abstractmethod

from clipper.schemas import (
    JudgedCandidate,
    RefinedCandidate,
    TranscriptManifest,
    MediaManifest,
)


class Judge(ABC):
    @abstractmethod
    def judge(
        self,
        candidate: RefinedCandidate,
        transcript: TranscriptManifest,
        media: MediaManifest,
        content_type: str,
    ) -> JudgedCandidate: ...

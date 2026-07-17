from __future__ import annotations

import logging
from pathlib import Path

from clipper.common.supabase_client import JobUpdater
from clipper.schemas import MediaManifest, SignalsManifest, TranscriptManifest
from clipper.sensors.base import Sensor
from clipper.sensors.chatsense import ChatSenseSensor
from clipper.sensors.prosody import ProsodySensor
from clipper.sensors.semantic import SemanticSensor

log = logging.getLogger(__name__)


def run(
    job_dir: Path,
    updater: JobUpdater | None = None,
) -> SignalsManifest:
    manifest_path = job_dir / "signals.json"
    if manifest_path.exists():
        log.info("signals.json exists, skipping sense")
        return SignalsManifest.model_validate_json(manifest_path.read_text())

    media = MediaManifest.model_validate_json(
        (job_dir / "media.json").read_text()
    )
    transcript = TranscriptManifest.model_validate_json(
        (job_dir / "transcript.json").read_text()
    )

    if updater:
        updater.update_progress(0.1)

    sensors: list[Sensor] = [SemanticSensor(), ProsodySensor()]
    if media.chat_path and Path(media.chat_path).exists():
        sensors.append(ChatSenseSensor())
    outputs = []

    for i, sensor in enumerate(sensors):
        log.info("running sensor: %s", sensor.name)
        output = sensor.run(media, transcript, job_dir)
        outputs.append(output)
        if updater:
            updater.update_progress((i + 1) / len(sensors))

    manifest = SignalsManifest(
        signals=outputs,
        content_type="",
    )
    manifest_path.write_text(manifest.model_dump_json(indent=2))
    return manifest

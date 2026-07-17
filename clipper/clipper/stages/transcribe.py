from __future__ import annotations

import logging
from pathlib import Path

import httpx

from clipper.common.settings import Settings
from clipper.common.supabase_client import JobUpdater
from clipper.schemas import MediaManifest, Segment, TranscriptManifest, Word

log = logging.getLogger(__name__)

DEEPGRAM_URL = "https://api.deepgram.com/v1/listen"


def run(
    job_dir: Path,
    settings: Settings,
    updater: JobUpdater | None = None,
) -> TranscriptManifest:
    manifest_path = job_dir / "transcript.json"
    if manifest_path.exists():
        log.info("transcript.json exists, skipping transcribe")
        return TranscriptManifest.model_validate_json(manifest_path.read_text())

    media = MediaManifest.model_validate_json(
        (job_dir / "media.json").read_text()
    )
    audio_path = Path(media.audio_16k_path)

    if updater:
        updater.update_progress(0.1)

    log.info("sending audio to Deepgram (%d bytes)", audio_path.stat().st_size)
    with open(audio_path, "rb") as f:
        resp = httpx.post(
            DEEPGRAM_URL,
            headers={
                "Authorization": f"Token {settings.deepgram_api_key}",
            },
            params={
                "model": "nova-2",
                "smart_format": "true",
                "diarize": "true",
                "punctuate": "true",
                "paragraphs": "true",
                "detect_language": "true",
                "utterances": "true",
            },
            content=f,
            timeout=600.0,
        )
    resp.raise_for_status()
    data = resp.json()

    if updater:
        updater.update_progress(0.7)

    language = (
        data.get("results", {})
        .get("channels", [{}])[0]
        .get("detected_language", "en")
    )

    words: list[Word] = []
    segments: list[Segment] = []

    channel = data.get("results", {}).get("channels", [{}])[0]
    alt = channel.get("alternatives", [{}])[0]

    for w in alt.get("words", []):
        words.append(Word(
            w=w["word"],
            start=w["start"],
            end=w["end"],
            speaker=f"speaker_{w['speaker']}" if "speaker" in w else None,
            conf=w.get("confidence", 1.0),
        ))

    for utt in data.get("results", {}).get("utterances", []):
        segments.append(Segment(
            text=utt["transcript"],
            start=utt["start"],
            end=utt["end"],
            speaker=f"speaker_{utt['speaker']}" if "speaker" in utt else None,
        ))

    if not segments and words:
        segments = _words_to_segments(words)

    manifest = TranscriptManifest(
        words=words,
        segments=segments,
        language=language,
    )
    manifest_path.write_text(manifest.model_dump_json(indent=2))

    if updater:
        updater.update_progress(1.0)

    return manifest


def _words_to_segments(
    words: list[Word], max_gap: float = 1.5
) -> list[Segment]:
    if not words:
        return []

    segments: list[Segment] = []
    buf: list[Word] = [words[0]]

    for w in words[1:]:
        if w.start - buf[-1].end > max_gap or w.speaker != buf[0].speaker:
            segments.append(Segment(
                text=" ".join(x.w for x in buf),
                start=buf[0].start,
                end=buf[-1].end,
                speaker=buf[0].speaker,
            ))
            buf = [w]
        else:
            buf.append(w)

    if buf:
        segments.append(Segment(
            text=" ".join(x.w for x in buf),
            start=buf[0].start,
            end=buf[-1].end,
            speaker=buf[0].speaker,
        ))

    return segments

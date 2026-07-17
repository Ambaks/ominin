from __future__ import annotations

import json
import logging
import subprocess
from pathlib import Path

from chat_downloader import ChatDownloader

from clipper.common.ffmpeg import duration_s, extract_audio_16k, probe, require_ffmpeg
from clipper.common.supabase_client import JobUpdater
from clipper.schemas import MediaManifest

log = logging.getLogger(__name__)


def run(job_dir: Path, updater: JobUpdater | None = None) -> MediaManifest:
    require_ffmpeg()
    manifest_path = job_dir / "media.json"
    if manifest_path.exists():
        log.info("media.json exists, skipping ingest")
        return MediaManifest.model_validate_json(manifest_path.read_text())

    source_url = (job_dir / "source_url.txt").read_text().strip()
    video_dir = job_dir / "media"
    video_dir.mkdir(exist_ok=True)

    if updater:
        updater.update_progress(0.1)

    log.info("downloading %s", source_url)
    result = subprocess.run(
        [
            "yt-dlp",
            "--no-playlist",
            "-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
            "--merge-output-format", "mp4",
            "-o", str(video_dir / "source.%(ext)s"),
            "--print", "after_move:filepath",
            "--print", "%(title)s",
            "--print", "%(duration)s",
            source_url,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    lines = result.stdout.strip().splitlines()
    video_path = Path(lines[0])
    source_title = lines[1] if len(lines) > 1 else "Unknown"
    source_duration_raw = lines[2] if len(lines) > 2 else None

    if updater:
        updater.update_progress(0.5)

    platform = "twitch" if "twitch.tv" in source_url else "youtube"

    chat_path = _download_chat(source_url, video_dir)
    if updater:
        updater.update_progress(0.7)

    info = probe(video_path)
    v_stream = next(
        (s for s in info["streams"] if s["codec_type"] == "video"), None
    )
    fps = 30.0
    width, height = 1920, 1080
    if v_stream:
        width = int(v_stream.get("width", 1920))
        height = int(v_stream.get("height", 1080))
        r_parts = v_stream.get("r_frame_rate", "30/1").split("/")
        fps = int(r_parts[0]) / max(int(r_parts[1]), 1)

    dur = float(source_duration_raw) if source_duration_raw else duration_s(video_path)

    audio_16k = video_dir / "audio_16k.wav"
    log.info("extracting 16kHz audio")
    extract_audio_16k(video_path, audio_16k)

    if updater:
        updater.update_progress(0.9)
        updater.set_source_info(source_title, dur)

    manifest = MediaManifest(
        source_url=source_url,
        source_title=source_title,
        source_duration_s=dur,
        video_path=str(video_path),
        audio_16k_path=str(audio_16k),
        fps=fps,
        width=width,
        height=height,
        platform=platform,
        chat_path=chat_path,
    )
    manifest_path.write_text(manifest.model_dump_json(indent=2))
    return manifest


def _download_chat(source_url: str, video_dir: Path) -> str | None:
    """Twitch VOD chat replay (and YouTube live replays). Absence is normal."""
    chat_path = video_dir / "chat.jsonl"
    try:
        log.info("downloading chat replay")
        chat = ChatDownloader().get_chat(
            source_url, message_groups=["messages"]
        )
        count = 0
        with open(chat_path, "w") as f:
            for msg in chat:
                t = msg.get("time_in_seconds")
                text = msg.get("message")
                if t is None or t < 0 or not text:
                    continue
                f.write(json.dumps(
                    {"t": round(float(t), 2), "text": text},
                    ensure_ascii=False,
                ) + "\n")
                count += 1
    except Exception as error:
        log.info("no chat replay available: %s", error)
        chat_path.unlink(missing_ok=True)
        return None
    if count == 0:
        chat_path.unlink(missing_ok=True)
        return None
    log.info("downloaded %d chat messages", count)
    return str(chat_path)

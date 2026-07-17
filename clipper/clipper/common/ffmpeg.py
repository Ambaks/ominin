from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path


def require_ffmpeg() -> None:
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise RuntimeError("ffmpeg and ffprobe must be on PATH")


def probe(path: Path) -> dict:
    result = subprocess.run(
        [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


def duration_s(path: Path) -> float:
    info = probe(path)
    return float(info["format"]["duration"])


def extract_audio_16k(video: Path, out: Path) -> None:
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", str(video),
            "-vn",
            "-ac", "1",
            "-ar", "16000",
            "-f", "wav",
            str(out),
        ],
        capture_output=True,
        check=True,
    )


def crop_vertical(
    video: Path,
    out: Path,
    start: float,
    end: float,
    ass_path: Path | None = None,
) -> None:
    duration = end - start
    vf_parts: list[str] = []

    info = probe(video)
    v_stream = next(s for s in info["streams"] if s["codec_type"] == "video")
    src_w = int(v_stream["width"])
    src_h = int(v_stream["height"])

    target_w = src_h * 9 // 16
    target_h = src_h
    if target_w > src_w:
        target_w = src_w
        target_h = src_w * 16 // 9

    x_offset = (src_w - target_w) // 2
    y_offset = (src_h - target_h) // 2
    vf_parts.append(f"crop={target_w}:{target_h}:{x_offset}:{y_offset}")
    vf_parts.append("scale=1080:1920:flags=lanczos")

    if ass_path:
        safe_ass = str(ass_path).replace("\\", "/").replace(":", "\\:")
        vf_parts.append(f"ass={safe_ass}")

    cmd = [
        "ffmpeg", "-y",
        "-ss", f"{start:.3f}",
        "-i", str(video),
        "-t", f"{duration:.3f}",
        "-vf", ",".join(vf_parts),
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-c:a", "aac", "-b:a", "192k",
        "-af", "loudnorm=I=-14:TP=-2:LRA=7",
        "-movflags", "+faststart",
        str(out),
    ]
    subprocess.run(cmd, capture_output=True, check=True)


def extract_thumbnail(video: Path, out: Path, timestamp: float) -> None:
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-ss", f"{timestamp:.3f}",
            "-i", str(video),
            "-vframes", "1",
            "-q:v", "2",
            str(out),
        ],
        capture_output=True,
        check=True,
    )

from __future__ import annotations

import logging
from pathlib import Path

import yaml

from clipper.common.ffmpeg import crop_vertical, extract_thumbnail
from clipper.common.supabase_client import JobUpdater
from clipper.schemas import (
    MediaManifest,
    RankedManifest,
    RenderedClip,
    TranscriptManifest,
)

log = logging.getLogger(__name__)


def run(
    job_dir: Path,
    updater: JobUpdater | None = None,
) -> list[RenderedClip]:
    clips_dir = job_dir / "clips"
    clips_dir.mkdir(exist_ok=True)
    manifest_path = job_dir / "clips.json"

    if manifest_path.exists():
        import json
        data = json.loads(manifest_path.read_text())
        return [RenderedClip.model_validate(c) for c in data]

    ranked = RankedManifest.model_validate_json(
        (job_dir / "ranked.json").read_text()
    )
    media = MediaManifest.model_validate_json(
        (job_dir / "media.json").read_text()
    )
    transcript = TranscriptManifest.model_validate_json(
        (job_dir / "transcript.json").read_text()
    )

    caption_cfg = _load_caption_config()
    video_path = Path(media.video_path)
    rendered: list[RenderedClip] = []

    for i, clip in enumerate(ranked.clips):
        slug = f"{clip.rank:02d}_{clip.id[:8]}"
        out_video = clips_dir / f"{slug}.mp4"
        out_thumb = clips_dir / f"{slug}.jpg"

        ass_path = _generate_ass(
            transcript, clip.start, clip.end, clips_dir / f"{slug}.ass",
            caption_cfg,
        )

        log.info("rendering clip %d/%d: %s", i + 1, len(ranked.clips), slug)
        crop_vertical(video_path, out_video, clip.start, clip.end, ass_path)

        mid_point = (clip.start + clip.end) / 2
        extract_thumbnail(video_path, out_thumb, mid_point)

        rendered.append(RenderedClip(
            rank=clip.rank,
            id=clip.id,
            video_path=str(out_video),
            thumbnail_path=str(out_thumb),
            title=clip.title,
            title_alternatives=clip.title_alternatives,
            clip_type=clip.clip_type,
            start=clip.start,
            end=clip.end,
            duration_s=round(clip.end - clip.start, 2),
            scores=clip.scores,
            final_score=clip.final_score,
            hook_text_suggestion=clip.hook_text_suggestion,
            risk_flags=clip.risk_flags,
            reasoning=clip.reasoning,
            signal_vector=clip.signal_vector,
        ))

        if updater:
            updater.update_progress((i + 1) / len(ranked.clips))

    import json
    manifest_path.write_text(json.dumps(
        [c.model_dump() for c in rendered], indent=2
    ))
    return rendered


def _generate_ass(
    transcript: TranscriptManifest,
    start: float,
    end: float,
    out_path: Path,
    cfg: dict,
) -> Path:
    font = cfg.get("font_name", "Arial")
    size = cfg.get("font_size", 58)
    primary = cfg.get("primary_color", "&H00FFFFFF")
    highlight = cfg.get("highlight_color", "&H0000BFFF")
    outline = cfg.get("outline_color", "&H00000000")
    outline_w = cfg.get("outline_width", 3)
    shadow = cfg.get("shadow_depth", 1)
    margin_b = cfg.get("margin_bottom", 280)
    words_per_group = cfg.get("words_per_group", 2)

    words = [
        w for w in transcript.words if w.end > start and w.start < end
    ]

    header = (
        "[Script Info]\n"
        "ScriptType: v4.00+\n"
        "PlayResX: 1080\n"
        "PlayResY: 1920\n"
        "WrapStyle: 0\n"
        "\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Default,{font},{size},{primary},{highlight},"
        f"{outline},&H80000000,1,0,0,0,100,100,0,0,1,"
        f"{outline_w},{shadow},2,40,40,{margin_b},1\n"
        "\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, "
        "MarginV, Effect, Text\n"
    )

    lines: list[str] = []
    for gi in range(0, len(words), words_per_group):
        group = words[gi : gi + words_per_group]
        if not group:
            continue

        g_start = group[0].start - start
        g_end = group[-1].end - start
        if g_start < 0:
            g_start = 0

        text_parts = []
        for w in group:
            w_start_cs = max(0, int((w.start - start - g_start) * 100))
            w_dur_cs = max(1, int((w.end - w.start) * 100))
            text_parts.append(
                f"{{\\kf{w_dur_cs}}}{w.w}"
            )

        ass_start = _ass_time(g_start)
        ass_end = _ass_time(g_end)
        text = " ".join(text_parts)
        lines.append(
            f"Dialogue: 0,{ass_start},{ass_end},Default,,0,0,0,,{text}"
        )

    out_path.write_text(header + "\n".join(lines))
    return out_path


def _ass_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def _load_caption_config() -> dict:
    path = Path("config/captions.yaml")
    if not path.exists():
        return {}
    with open(path) as f:
        return yaml.safe_load(f) or {}

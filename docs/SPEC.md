# SPEC.md — "Clipper": Long-Form Video → Ranked Social Clips Pipeline

## 1. Goal

Given a long-form video (streamer VOD, podcast, interview — 30 min to 6 hours),
automatically produce **N ranked, ready-to-post 9:16 vertical clips** (20–90 s each)
with burned-in word-level captions, intelligent speaker-aware cropping, and a
generated title/hook for each — plus a machine-readable explanation of *why* each
clip was selected.

Design priority: **clip quality over speed or cost.** This pipeline is allowed to
be heavy. A 3-hour VOD taking 30–60 min of processing on one GPU is acceptable.

## 2. Core Design Principles

1. **Sensors nominate, judges decide.** Cheap deterministic signal extractors run
   over the *entire* video and produce continuous time-series scores. Expensive
   LLM/audio-LLM judgment runs *only* on nominated candidate windows. Never run an
   LLM over raw full-length media in one request.
2. **Audio carries the deeper meaning.** The transcript is one signal among many,
   not the ground truth of "what happened." Prosody, emotion trajectory, laughter,
   pauses, and delivery are first-class signals, and the final judge is an
   **audio-native LLM that listens to the actual audio** of each candidate.
3. **Stages are isolated and re-runnable.** Every stage is a CLI-invokable module
   that reads and writes JSON manifests. Any stage can be re-run independently
   without touching upstream artifacts. Raw media is referenced by path + timestamp
   ranges, never passed between functions in memory.
4. **Every decision is auditable.** Each candidate carries its full signal vector,
   each judged clip carries the judge's structured reasoning, each rejected
   candidate carries a rejection reason. This is the training data for future
   fine-tuning of the ranker.
5. **Human reviews before anything is posted.** The pipeline ends at a review UI,
   never at an auto-poster.

## 3. Pipeline Overview

```
                        ┌─────────────────────────────────────────────┐
                        │              SENSOR LAYER (full video)      │
 ingest ─► normalize ─► │  transcribe · diarize · acoustic-features   │ ─► fuse ─► candidates
                        │  emotion · laughter · scenes · chat-signal  │
                        └─────────────────────────────────────────────┘
                                                                            │
              ┌─────────────────────────────────────────────────────────────┘
              ▼
        refine boundaries ─► JUDGE (audio-native LLM on candidate audio+context)
              │
              ▼
        rank ─► reformat (crop 9:16 + captions) ─► package ─► review UI
```

Stage list (each = one Python module under `clipper/stages/`, one CLI entrypoint):

| # | Stage        | Input manifest        | Output manifest         |
|---|--------------|-----------------------|-------------------------|
| 0 | `ingest`     | URL or file path      | `media.json`            |
| 1 | `transcribe` | `media.json`          | `transcript.json`       |
| 2 | `sense`      | `media.json`          | `signals.json`          |
| 3 | `chatsense`  | `media.json` (opt.)   | `chat_signals.json`     |
| 4 | `fuse`       | signals + transcript  | `candidates.json`       |
| 5 | `refine`     | `candidates.json`     | `candidates_refined.json` |
| 6 | `judge`      | refined candidates    | `judged.json`           |
| 7 | `rank`       | `judged.json`         | `ranked.json`           |
| 8 | `reformat`   | `ranked.json`         | `clips/` + `clips.json` |
| 9 | `package`    | `clips.json`          | `deliverable.json`      |
| 10| `review`     | `deliverable.json`    | (web UI, approval state)|

`clipper run <url>` executes 0→9 with checkpointing; `clipper stage <name> --job <id>`
re-runs a single stage.

## 4. Stage Specifications

### Stage 0 — `ingest`
- Input: YouTube/Twitch URL (via `yt-dlp`) or local file.
- Download best available quality; for Twitch VODs also download the **chat replay
  JSON** (via `chat-downloader` or TwitchDownloaderCLI).
- Normalize with ffmpeg: H.264 MP4 (keep original resolution), plus extracted
  audio track as 16 kHz mono WAV *and* 44.1 kHz stereo WAV (the judge and TTS-grade
  analysis get the high-quality track; ASR gets the 16 kHz one).
- Output `media.json`: paths, duration, fps, resolution, source metadata
  (title, streamer/podcast name, platform, upload date), chat file path if present.

### Stage 1 — `transcribe`
- **WhisperX** (large-v3) on the 16 kHz track: word-level timestamps + alignment.
- **Diarization** via pyannote (through WhisperX integration); merge into
  word-level speaker labels.
- Language auto-detect; must support English and French equally well.
- Output `transcript.json`: `{words: [{w, start, end, speaker, conf}], segments:
  [{text, start, end, speaker}], language}`.

### Stage 2 — `sense` (the acoustic sensor bank — parallel sub-sensors)
All sensors emit a uniform format: `{sensor, series: [{t, value}], events:
[{start, end, label, conf}]}` at 0.5 s resolution into `signals.json`.

Sensors (each an independent class implementing a common `Sensor` interface, so
adding new ones later is trivial):

1. **`prosody`** — pitch (F0 median/range), energy (RMS), speech rate
   (syllables/s from word timestamps), pause structure. Use `librosa` +
   `praat-parselmouth`. Derived events: sustained-energy-rise, dramatic-pause
   (>1.2 s silence following high-energy speech), pace-spike.
2. **`emotion`** — **emotion2vec+ (large)** frame-level speech emotion (angry,
   happy, sad, surprised, fearful, disgusted, neutral) over 2 s hops. Emit both
   per-class probabilities and an **arousal proxy** (1 − p(neutral)). Rationale:
   dedicated SER models remain more reliable for fine-grained emotion than
   general audio LLMs, which are known to under-attend paralinguistic cues.
3. **`laughter`** — laughter detection (Gillick et al. laughter-detection, or
   Whisper-AT audio tagging as fallback). Events with intensity. Multi-speaker
   laughter (diarized overlap during a laughter event) scores higher.
4. **`vad_silence`** — Silero VAD; silence map used later by `refine`.
5. **`audio_events`** — Whisper-AT / PANNs tags: applause, shouting, music
   stings, alarm-like sounds, crowd noise.
6. **`scenes`** — PySceneDetect content-aware cuts + per-second motion magnitude
   (frame-diff on downscaled 360p proxy). Cheap; visual layer is intentionally
   thin in v1.
7. **`semantic`** — embed transcript segments (multilingual-e5 or similar);
   compute (a) topic-shift score via cosine drop between adjacent windows,
   (b) self-containedness score, (c) keyword/entity density, (d) question→answer
   structures, (e) "narrative markers" via regex + small-LLM pass ("the craziest
   thing", "I've never told anyone", "hot take", contradiction phrases —
   maintain an editable multilingual lexicon in `config/markers.yaml`).

### Stage 3 — `chatsense` (Twitch/YouTube-live only — highest-value free signal)
- Parse chat replay into per-second message counts.
- Compute **chat velocity z-score** over a rolling 5-min baseline (streams have
  wildly varying baseline chat rates).
- Emote-burst detection: spikes of laughing/hype emotes (LULW, OMEGALUL, KEKW,
  PogChamp, W, 💀, 😂 — editable list in `config/emotes.yaml`), copypasta
  detection (repeated identical messages), question storms.
- **Lag correction:** chat reacts ~5–20 s *after* the moment. When a chat spike
  is detected, the moment of interest is placed at spike_start minus an offset
  estimated by cross-correlating chat velocity against the audio arousal series
  for this specific VOD (fallback: fixed −12 s).
- Output `chat_signals.json` in the same series/events format.

### Stage 4 — `fuse` (candidate nomination)
- Resample all series to a common 0.5 s grid; z-score normalize each per-video.
- Composite interest score = weighted sum (weights in `config/fusion.yaml`,
  per content type — see below) + event bonuses (laughter event, chat spike,
  narrative marker, dramatic pause each add fixed boosts).
- **Content-type classification first:** one cheap LLM call on the transcript
  outline classifies the video (gaming stream / just-chatting / podcast /
  interview / educational / debate) and selects the fusion weight profile and
  the judge prompt variant. E.g. gaming streams weight chat+audio events heavily;
  podcasts weight semantic + prosody + emotion.
- Peak detection (`scipy.signal.find_peaks` with prominence threshold) over the
  composite series → candidate windows: expand each peak to the enclosing
  semantic segment, clamp to 15–120 s, merge overlaps.
- Target: 3–6× over-generation (if final N=10, nominate 30–60 candidates).
- Each candidate carries its **full signal vector** (per-sensor mean/max within
  the window) — this is the audit trail and future training data.

### Stage 5 — `refine` (boundary snapping)
For each candidate:
1. Snap start to the beginning of the sentence containing the window start
   (word timestamps); snap end to a sentence end.
2. Nudge both boundaries to the nearest VAD silence ≥ 250 ms within ±1.5 s.
3. **Hook check:** if the first sentence is a weak opener (filler, mid-referent
   pronoun like "and so that's why..."), extend backward up to 8 s to capture
   the setup, or flag `needs_hook_text` for the packager to compensate with an
   on-screen hook.
4. Avoid cutting mid-laughter or mid-applause (audio event map).
5. Enforce platform duration targets: default 20–90 s, configurable per platform.

### Stage 6 — `judge` (audio-native LLM — the heart of the pipeline)
- For each refined candidate, extract the candidate audio **plus 20 s of context
  on each side** from the high-quality track.
- Send the raw audio (not the transcript) to **Gemini 2.5 Pro (or current best
  Gemini with native audio input)** with:
  - the transcript of the window (as a cross-check anchor, clearly labeled),
  - source metadata (content type, streamer/show name),
  - a structured rubric prompt.
- The judge returns strict JSON:
  ```json
  {
    "hook_strength": 0-10,        // would the first 3 seconds stop a scroll?
    "emotional_peak": 0-10,       // audible intensity: laughter, tension, awe
    "self_contained": 0-10,       // comprehensible with zero outside context
    "delivery": 0-10,             // pacing, charisma, timing HEARD in the audio
    "payoff": 0-10,               // does it resolve? punchline/reveal/conclusion
    "quotability": 0-10,
    "clip_type": "funny|hot_take|story|insight|drama|wholesome|skill",
    "best_subwindow": {"start": s, "end": s},  // judge may tighten the cut
    "hook_text_suggestion": "...",
    "title_suggestions": ["...", "...", "..."],
    "risk_flags": ["defamation","out_of_context","nsfw","none"],
    "reasoning": "2-3 sentences citing AUDIBLE evidence (tone, pause, laugh)"
  }
  ```
- **Prompt rules (critical):** instruct the judge to base `delivery` and
  `emotional_peak` on what it *hears*, and to explicitly note where the audio
  contradicts the words (deadpan sarcasm, feigned anger, ironic praise). Audio
  LLMs default to reading the transcript-in-their-head; the prompt must fight
  this.
- **Model abstraction:** implement judges behind a `Judge` interface with
  pluggable backends: `gemini` (default), `openai_audio`, `qwen_omni_local`
  (Qwen2.5/3-Omni via vLLM for a fully local mode), `text_only` (degraded
  fallback: transcript + serialized sensor data to any text LLM). Config-selected.
- Two-pass option (`--judge-passes 2`): pass 1 scores all candidates cheaply
  (Gemini Flash); pass 2 re-judges the top 40% with the Pro model.

### Stage 7 — `rank`
- Final score = judge rubric (weighted, weights per platform in
  `config/ranking.yaml`) × sensor-prior multiplier (a candidate with multi-speaker
  laughter + chat spike gets a boost even if the judge is lukewarm — sensors catch
  what judges miss and vice versa).
- **Diversity constraint:** max 2 clips of the same `clip_type` in the top N;
  no two clips overlapping or within 60 s of each other.
- Drop anything with a non-`none` risk flag into a separate `flagged` list
  (surfaced in review UI with the flag, never silently deleted).
- Output `ranked.json` with full lineage per clip.

### Stage 8 — `reformat` (vertical rendering)
- **Active-speaker detection** for crop targeting: Light-ASD (preferred, lighter)
  or TalkNet; fallback = face detection (YOLOv8-face or MediaPipe) + diarization
  alignment (the speaking speaker's face is the crop target).
- Crop 16:9 → 9:16 with a **smoothed virtual camera**: exponential-moving-average
  on the crop center, snap cuts (not pans) when the active speaker changes,
  minimum 1.5 s between reframes. Two-speaker podcast layout option: stacked
  split-screen when both faces are reliably tracked.
- **Captions:** burned-in word-level karaoke captions from `transcript.json`
  word timestamps. Style tokens in `config/captions.yaml` (font, size ≈ 4.5% of
  height, active-word highlight color, 2-word grouping, safe-area margins for
  TikTok/Reels UI overlap). Render via ASS subtitles + ffmpeg (libass) — not
  frame-by-frame PIL compositing.
- Optional hook card: first 1.5 s overlay with `hook_text_suggestion`.
- Output: `clips/{rank:02d}_{slug}.mp4` (1080×1920, H.264, AAC 192k, loudness
  normalized to −14 LUFS) + per-clip JSON sidecar.

### Stage 9 — `package`
- `deliverable.json`: per clip — video path, thumbnail (peak-emotion frame),
  3 title options, suggested caption + hashtags (LLM, per platform), duration,
  final score, judge reasoning, source timestamp deep-link.

### Stage 10 — `review` (minimal web UI)
- FastAPI + one-page frontend: grid of clips, inline playback, per-clip
  approve/reject/edit-boundaries (±5 s nudge buttons re-invoke stages 8–9 for
  that clip only), show judge reasoning and signal sparklines.
- Approvals/rejections append to `feedback.jsonl` — **this is the future
  fine-tuning dataset for the ranker. Never lose it.**

## 5. Bootstrapped Ground Truth (do this early — it converts taste into data)
- Utility `clipper harvest <channel>`: scrape a streamer's existing published
  clips/shorts, align them to source VODs (audio fingerprinting via
  `audio-offset-finder` or chromaprint cross-correlation).
- Result: labeled (VOD, highlight-window) pairs. Uses:
  1. **Evaluation:** recall@K — does the pipeline nominate the moments humans
     actually clipped? This is THE quality metric for stages 2–4.
  2. Later: train a lightweight learned fusion model (gradient-boosted trees on
     the sensor vectors) to replace hand-tuned `fusion.yaml` weights.

## 6. Non-Functional Requirements
- Python 3.11, `uv` for env/deps, single `pyproject.toml`.
- GPU: single 24 GB card assumption; every model-loading component lazy-loads
  and releases (stages run sequentially, not resident).
- All heavy stages checkpoint: re-running `clipper run` on an existing job ID
  skips completed stages (manifest presence = done).
- Every stage: `--job <id>` working under `jobs/<id>/`; logs to
  `jobs/<id>/logs/<stage>.log`; structured (JSON-lines) logging.
- Config over code: all weights, thresholds, prompts, marker lexicons, caption
  styles live in `config/` (YAML) and `prompts/` (Markdown), never inline.
- Language: full support for English and French content (multilingual embedding
  model, bilingual marker lexicon, WhisperX language autodetect).
- API keys via `.env` (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `HF_TOKEN` for
  pyannote). Never committed.

## 7. Definition of Done (v1)
`clipper run <youtube_or_twitch_url> --n 8` on a 2-hour VOD produces, without
manual intervention:
- 8 rendered 9:16 clips, 20–90 s, karaoke captions, speaker-tracked crop,
  −14 LUFS audio;
- `deliverable.json` with titles, reasoning, and lineage for each;
- review UI serving the results at `localhost:8400`;
- recall@10 ≥ 0.5 against harvested ground-truth clips on the two benchmark
  VODs in `fixtures/benchmarks.yaml`.

## 8. Explicit Non-Goals (v1)
- No auto-posting / platform API publishing.
- No B-roll insertion, AI voice-over, or thumbnail generation beyond frame grab.
- No real-time/live clipping (VOD-only; architecture must not preclude it later).
- No training custom neural nets in v1 (harvest data now, train later).

## 9. Milestones (map to Claude Code sessions)
1. **M1 — Skeleton + ingest + transcribe.** Repo structure, manifest schemas
   (pydantic models in `clipper/schemas.py`), stages 0–1, fixtures.
2. **M2 — Sensor bank.** Stage 2, all seven sensors, sparkline debug plots
   (`clipper debug-signals --job <id>` renders an HTML timeline).
3. **M3 — Chat + fusion.** Stages 3–4, content-type classifier, peak nomination.
4. **M4 — Refine + judge.** Stages 5–6, Gemini audio judge + text fallback,
   prompt files, strict-JSON parsing with retries.
5. **M5 — Rank + reformat.** Stages 7–8, active-speaker crop, karaoke captions.
6. **M6 — Package + review UI + harvest.** Stages 9–10, ground-truth harvester,
   benchmark eval, recall@K report.

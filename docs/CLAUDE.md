# CLAUDE.md — Clipper

Read SPEC.md before doing anything. SPEC.md is the source of truth for
architecture; this file is the source of truth for how to work in this repo.

## What this project is
A staged pipeline that turns long-form video (streamer VODs, podcasts) into
ranked, rendered 9:16 social clips. Sensors (cheap, deterministic, full-video)
nominate candidate moments; an audio-native LLM judge (expensive, per-candidate)
decides. Stages communicate ONLY through JSON manifests on disk.

## Hard rules
1. **Never test on full-length videos.** All development and tests run against
   `fixtures/sample_short.mp4` (~3 min) and `fixtures/sample_podcast.mp4`
   (~5 min). Full VODs are for benchmark runs only, and only when the user
   explicitly asks. If a fixture is missing, stop and ask — do not download one.
2. **Stages are pure w.r.t. manifests.** A stage reads its input manifest(s) and
   media paths, writes its output manifest atomically (write tmp, rename). It
   never mutates upstream manifests. It never imports another stage's internals —
   shared code goes in `clipper/common/`.
3. **All schemas are pydantic models in `clipper/schemas.py`.** Any manifest
   change = schema change first, then code. Manifests on disk must always
   validate against the current schemas.
4. **Config over code.** Thresholds, weights, model names, lexicons, caption
   styles → `config/*.yaml`. LLM prompts → `prompts/*.md` (loaded at runtime,
   never inline strings). If you find yourself writing a magic number, it
   belongs in config.
5. **No silent fallbacks for the judge.** If the Gemini audio judge fails after
   3 retries, mark the candidate `judge_status: "failed"` and continue; do not
   silently swap in the text-only judge (that's an explicit config choice).
6. **Strict JSON from LLMs.** Every LLM call that expects structured output must
   parse with pydantic, retry up to 3× on validation failure (feeding the error
   back), and log raw responses to the job log on failure.
7. **Never commit secrets.** Keys live in `.env` (gitignored); load via
   `clipper/common/settings.py`. `HF_TOKEN` is required for pyannote — if
   missing, fail at startup with a clear message, not deep in stage 1.
8. **French and English are both first-class.** No English-only regexes or
   prompts; marker lexicons and prompt templates have `en` and `fr` variants.

## Environment
- Python 3.11, managed with `uv`. Install: `uv sync`. Run: `uv run clipper ...`.
- ffmpeg must be on PATH; check at startup.
- GPU expected (single card). Every model wrapper lazy-loads on first use and
  exposes `.unload()`; stages unload models before exiting. Never hold two
  large models resident simultaneously.
- Heavy deps that are known to be fragile: whisperx, pyannote.audio, parselmouth,
  light-asd. Pin exact versions in pyproject.toml. If an install fails, fix the
  pin — do not swap in a different library without asking.

## Layout
```
clipper/
  cli.py              # typer CLI: run, stage, debug-signals, harvest, review
  schemas.py          # ALL pydantic manifest models
  common/             # settings, logging, ffmpeg helpers, llm client wrappers
  stages/             # ingest.py, transcribe.py, sense.py, chatsense.py,
                      # fuse.py, refine.py, judge.py, rank.py, reformat.py,
                      # package.py
  sensors/            # one file per sensor, all implement Sensor ABC
  judges/             # Judge ABC + gemini.py, text_only.py, qwen_local.py
  review/             # FastAPI app + static frontend
config/               # fusion.yaml, ranking.yaml, captions.yaml, markers.yaml,
                      # emotes.yaml, models.yaml
prompts/              # judge_gaming.md, judge_podcast.md, classify.md, ... (en/fr)
fixtures/             # sample_short.mp4, sample_podcast.mp4, expected/*.json,
                      # benchmarks.yaml
jobs/                 # runtime output, gitignored
tests/
```

## Workflow expectations
- **One milestone per session** (M1–M6 in SPEC.md §9). At session start, state
  which milestone you're on and list the files you plan to touch. For M4 and M5
  (judge, reformat) enter plan mode and get approval before implementing.
- After implementing a stage, ALWAYS run it against the fixture end-to-end and
  show the resulting manifest (or a summary) before moving on. "It should work"
  is not done; a validated manifest is done.
- Write tests for pure logic (boundary snapping, peak detection, fusion math,
  schema round-trips, chat lag correction) — `uv run pytest`. Do NOT write
  tests that call external APIs or load GPU models; those are covered by
  fixture runs.
- `clipper debug-signals --job <id>` must always work after M2 — it is the
  primary debugging tool. When a candidate selection looks wrong, look at the
  signal timeline first, not the LLM prompt.
- Commit at every green checkpoint with conventional-commit messages
  (`feat(sense): add emotion2vec sensor`). Never commit with failing fixture runs.
- Keep `feedback.jsonl` append-only and out of any cleanup routine — it is the
  future training dataset.

## Judge-specific guidance (read before touching stages/judge.py)
- The judge receives AUDIO, not just transcript. The transcript is included in
  the prompt as a labeled cross-check, but the prompt must explicitly instruct
  the model to ground `delivery` and `emotional_peak` in what it HEARS and to
  flag audio/text contradictions (sarcasm, irony, deadpan). Audio LLMs have a
  documented bias toward reading over listening — the prompts in `prompts/` are
  written to counteract this. Do not "simplify" them.
- Candidate audio = window + 20 s context each side, from the 44.1 kHz track,
  encoded to 128 kbps AAC before upload (halves upload size, no judgment loss).
- Cost control: batch judge calls with bounded concurrency (config:
  `models.yaml: judge.concurrency`, default 4); cache judge results keyed on
  (audio content hash, prompt hash, model) so re-runs are free.

## When unsure
Ask, with a concrete proposal ("I suggest X because Y — ok?"). Prefer boring,
debuggable solutions over clever ones. This pipeline's value lives in the
quality of candidate selection and judging, not in framework sophistication —
spend complexity there and nowhere else.

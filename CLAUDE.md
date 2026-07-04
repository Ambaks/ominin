# Ominin

## What this is

Ominin is a side business providing computer and AI solutions to restaurant
businesses. The goal is to reduce restaurants' operating costs and facilitate
their day-to-day operations (e.g. cost tracking, forecasting, automation of
back-office work).

## Business constraints

- Solo/side project: favor simple, low-maintenance solutions over clever ones.
- Infrastructure must run on free tiers for now; paid upgrades only when
  revenue justifies them.
- Must scale comfortably to 100+ users (restaurant owners/managers) without
  re-architecture.

## Stack

| Layer | Tech | Hosting (free tier) |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind | Vercel |
| Backend | FastAPI + Python 3.13, managed with uv | Render |
| DB / Auth / Storage | Supabase (Postgres) | Supabase free tier |
| AI | Claude API (Python SDK) | pay-per-use |

Python was chosen for the backend because AI/data work (forecasting, invoice
OCR, cost analysis) is the core of the product.

## Repo structure

- `frontend/` — Next.js web app (customer-facing dashboard)
- `backend/` — FastAPI service; app code lives in `backend/app/`
  - `app/main.py` — FastAPI entry point
  - `app/config.py` — settings via pydantic-settings, loaded from `.env`
    (copy `.env.example` to `.env` and fill in keys)

## Commands

Frontend (run from `frontend/`):
- `npm run dev` — dev server at http://localhost:3000
- `npm run build` — production build
- `npm run lint` — ESLint

Backend (run from `backend/`):
- `uv run uvicorn app.main:app --reload` — dev server at http://localhost:8000
  (API docs at /docs)
- `uv add <package>` — add a dependency (never edit pyproject.toml deps by hand)

## Conventions

- Backend settings come only from `app/config.py` / environment variables —
  never hardcode secrets or URLs.
- CORS is restricted to the frontend origin (see `FRONTEND_ORIGIN` env var).

## Code quality

- Code must be efficient, fast, and well thought through. No AI slop: no
  filler comments, no dead code, no speculative abstractions, no boilerplate
  that exists only because a template suggested it.
- Never hardcode constants (timeouts, limits, prices, URLs, magic numbers,
  model names, etc.). Before introducing any constant, discuss it with the
  user — they decide whether it belongs in a config file, in `.env`, or
  inline. This applies to both frontend and backend.

## Workflow

- Every time changes are pushed, update the "Project status" section of
  `README.md` so it reflects the current state of the project, and include
  that update in what gets pushed. The README is the source of truth for
  collaborators (and their agents) about where the project stands.
- Agent discipline: after modifying code, run `graphify update .` to keep the
  knowledge graph current. It is incremental and AST-only (no API calls,
  fast, free). This is an instruction being followed, not automation — no
  hook runs it for you, so treat it as a required step of every code change.
- To commit and push, follow the `/commit` skill
  (`.claude/skills/commit/SKILL.md`) — it encodes the two rules above plus
  safety checks and the commit-message standard.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

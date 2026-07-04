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

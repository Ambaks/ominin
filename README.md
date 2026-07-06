# Ominin

AI solutions for restaurants, decreasing their operating costs and facilitating
their operations.

## What this is

Ominin provides computer and AI solutions to restaurant businesses — think cost
tracking, forecasting, invoice processing, and back-office automation. The
project targets 100+ users while running on free-tier infrastructure until
revenue justifies paid plans.

## Project status

**Homepage / marketing landing page** is now live at `/`. Conversion-focused,
French-language, dark-premium design (same ember-gradient system as the menu
page). Sections: sticky nav, hero ("Reduisez vos depenses, facilitez votre
vie."), "how it works" 4-step flow, stat-led features grid, live
phone-framed iframe demo of the QR menu, 3-tier pricing (Digital 29€ / Smart
59€ / Connect 99€ — "Le plus choisi" badge on Connect), client testimonials
(L'Adresse, Chez l'Walida, NERO), final CTA, then FAQ accordion (native
`<details>`). Zero client-side JS — every component is a server component.
All copy and data lives in `lib/landing-data.ts` (no content literals in
JSX). CTAs currently scroll to a contact section with email (`mailto:`) and
a demo link; a dedicated signup page will replace this.

**Branding**: the Ominin logo (triple ember-gradient chevron, neon glow) is
in place — favicon/app icons via Next.js metadata file conventions
(`app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`, dark theme-matched
tiles) and a transparent `public/logo.png` shown beside the wordmark in the
landing nav and footer. The mark was redrawn programmatically from the
original render (`logo.png` at repo root) so it stays crisp at favicon sizes.

**Business model**: QR codes (stickers on tables), not physical NFC cards.
Restaurants receive personalized QR codes; clients scan to view the menu,
order, and pay — no app required.

**QR menu page** at `/m/[slug]` (demo: `/m/trattoria-lucia`) — the product
guests see after scanning. Dark-premium gradient design, responsive desktop
layout (2-column grid, max-w-5xl), all items as photo cards. Order buttons
rendered but disabled — ordering flow and backend data come later.

**Back-office dashboard ("Espace de gestion")** at `/gestion` — the v1 of the
page restaurants use after logging in. French UI, same ember design system.
Five routes under a shared shell (desktop sidebar / mobile bottom tabs):
Aperçu (stats + out-of-stock list), Commandes (status lifecycle en_attente →
payée with cancel, filter pills, grouped-table orders with bulk serve/pay,
payment-mode dialog), Tables (grid selection → table groups, add/remove/
dissolve), Menu (categories with inline taglines, item CRUD incl. photo URL,
badges, pairing, stock/availability, options-variantes editor with import),
Formules (step-based set menus, articles linkable to menu items). Tier gating
mirrors the landing pricing (digital → Menu+Formules only; smart/connect add
Commandes/Tables/options/roles gérant-cuisinier-serveur); a topbar demo
switcher toggles offre + role. **No auth or backend yet**: state lives in
localStorage (key `ominin.gestion`, seeded from the Trattoria Lucia demo)
behind `frontend/lib/gestion/api.ts`, an async mutation surface designed as
the future Supabase seam — UI call sites won't change when the real backend
lands. Deliberately deferred: auth, Supabase + Realtime order notifications,
photo upload, QR page reading dashboard edits, subcategories.

Committed project skills in `.claude/skills/`: graphify (knowledge graph),
`/commit` (required commit/push workflow). `CLAUDE.md` defines agent rules.
Knowledge graph: `graphify-out/` (500 nodes, 90 communities).

| Layer | Tech | Hosting plan (free tier) |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS | Vercel |
| Backend | FastAPI + Python 3.13, managed with uv | Render |
| DB / Auth / Storage | Supabase (Postgres, 50k free monthly auth users) | Supabase |
| AI | Claude API via the Python backend | pay-per-use |

Repo layout:

```
ominin/
├── frontend/          Next.js app (customer-facing dashboard)
├── backend/           FastAPI service (API + AI/data processing)
│   └── app/           main.py (entry, /health), config.py (env settings)
├── .claude/           Committed Claude Code config, incl. the graphify skill
└── CLAUDE.md          Project context and conventions for AI agents
```

Knowledge-graph tooling: the [graphify](https://github.com/safishamsi/graphify)
skill is committed at `.claude/skills/graphify/` so every collaborator uses the
same version. The graph output lives in `graphify-out/` once built and is also
committed — do not gitignore either folder.

---

## Setup guide (written for an LLM agent)

If you are an AI coding agent asked to set this project up, execute the steps
below in order. Every step has a verification command — run it and confirm the
expected output before moving to the next step. Report any failures instead of
skipping ahead.

### 1. Prerequisites

Required: git, Node.js ≥ 20, Python ≥ 3.13, and [uv](https://docs.astral.sh/uv/).

```bash
node --version    # expect v20+
python3 --version # expect 3.13+
uv --version      # if missing: curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Frontend

```bash
cd frontend
npm install
npm run build     # must finish with no errors
```

Dev server: `npm run dev` → http://localhost:3000

### 3. Backend

```bash
cd backend
uv sync           # creates .venv and installs locked dependencies
cp .env.example .env
```

Ask the human for values for `.env` (Supabase keys, `ANTHROPIC_API_KEY`). The
server boots fine with them empty — they are only needed for features that call
Supabase or the Claude API.

Verify:

```bash
uv run uvicorn app.main:app --port 8000 &
sleep 3 && curl -s http://localhost:8000/health   # expect {"status":"ok"}
kill %1
```

Dev server: `uv run uvicorn app.main:app --reload` → http://localhost:8000
(interactive API docs at /docs)

### 4. Graphify (knowledge-graph CLI)

The skill files are already in the repo at `.claude/skills/graphify/` — do not
reinstall or modify them. Only the CLI needs installing on each machine:

```bash
uv tool install graphifyy   # PyPI package is "graphifyy" (double y); or: pipx install graphifyy
graphify --version          # expect 0.9.x
```

The committed `.claude/settings.json` registers hooks so Claude Code consults
the knowledge graph automatically. To build or refresh the graph, type
`/graphify .` in a Claude Code session at the repo root. After modifying code,
`graphify update .` keeps the graph current (AST-only, no API cost).

### 5. Project skills (nothing to install)

This repo ships committed Claude Code skills in `.claude/skills/` — you get
them automatically with the clone:

- `/graphify` — build/query the knowledge graph (see step 4)
- `/commit` — the required way to commit and push: writes a detailed commit
  message, updates the README project status, refreshes the knowledge graph,
  runs safety checks, then pushes

When asked to commit work in this repo, always go through `/commit`
(`.claude/skills/commit/SKILL.md`) rather than raw git commands.

### 6. Final checklist

- [ ] `npm run build` succeeds in `frontend/`
- [ ] `curl http://localhost:8000/health` returns `{"status":"ok"}`
- [ ] `graphify --version` prints a version
- [ ] `backend/.env` exists (keys may be pending from the human)

Read `CLAUDE.md` at the repo root for stack rationale, commands, and project
conventions before writing any code.

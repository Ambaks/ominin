# Ominin

AI solutions for restaurants, decreasing their operating costs and facilitating
their operations.

## What this is

Ominin provides computer and AI solutions to restaurant businesses — think cost
tracking, forecasting, invoice processing, and back-office automation.

## Project status

> ⚠️ **Manual setup pending — see [`TACHES-AMBAKA.md`](TACHES-AMBAKA.md).**
> Dashboard-only steps the coding agent can't do (no Supabase/Vercel/Stripe
> access): paste the branded signup-confirmation email into the Supabase
> dashboard, add the two Stripe env vars in Vercel + redeploy, and set the
> Supabase auth URLs. The sales funnel isn't fully live until these are done.

**Homepage / marketing landing page** is now live at `/`. Conversion-focused,
French-language, warm premium design with dark/light theme toggle (same
ember-gradient system as the menu page). Sections: sticky nav, hero (full-bleed
restaurant-room photo behind gradient scrims, H1 "Vos tables prennent les commandes.",
editorial left-aligned layout on desktop), QR-corner brand motif (decorative), "how it works"
4-step flow, stat-led features grid, live device-framed demo of the QR menu
(staged on table photo with "Table 12" tag and caption). Demo frame: realistic iPhone 17 Pro Max
device chrome (`IphoneFrame` component) with titanium chassis gradient, black antenna liner,
Dynamic Island, and authentic side buttons (Action + Volume on left, Sleep + Camera Control
on right) — purely decorative (all chrome `aria-hidden`, only iframe content in a11y tree).
Demo uses embed mode: the menu page accepts `?embed=1` query param and the `CategoryNav` 
component responds by positioning its sticky header at `top-12` instead of `top-0`, 
accounting for the Dynamic Island notch; the iPhone frame screen container itself has no 
padding, letting the iframe content fill the frame properly.
Proof section with three data-backed stats cards (restyled to the ember-gradient theme,
showing +25% order lift, 85% client menu influence, and +20% ticket lift — all sourced
from industry studies with attribution and source citations). Section retitled "Ce que
montrent les études du secteur" with descriptive subtitle and full disclaimer about data
provenance. 3-tier pricing (Digital 59€ / Smart 79€ / Connect 99€ — "Le plus choisi" badge on Connect),
client testimonials (L'Adresse, Chez l'Walida, NERO) in a 3-column card grid, final CTA
with faint QR-motif watermark, then FAQ accordion (native `<details>`). Zero client-side JS
— every component is a server component. All copy and data lives in `lib/landing-data.ts`
(no content literals in JSX).
Every "Commencer" CTA points to `/login`; each pricing card links to `/login?plan=<offre>`,
and the nav carries a "Connexion" link.
Build passes; landing verified end-to-end in browser (desktop + mobile, dark + light);
demo device frame verified in Playwright screenshots.

**Branding**: the Ominin logo (triple ember-gradient chevron, neon glow) is
in place — favicon/app icons via Next.js metadata file conventions
(`app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`, dark theme-matched
tiles) and a transparent `public/logo.png` shown beside the wordmark in the
landing nav and footer. The mark was redrawn programmatically from the
original render (`logo.png` at repo root) so it stays crisp at favicon sizes.

**Business model**: QR codes (stickers on tables), branded as **"Le Cachet"**
(proprietary name rolled out across the landing: defined at first mention in
the how-it-works flow, rendered on the QR sticker mockup, and explained in a
dedicated FAQ item, so visitors grasp Cachet = QR code sticker), not physical
NFC cards. Restaurants receive personalized Cachets; clients scan to view the
menu, order, and pay — no app required. Hero and SEO copy retain "QR code"
wording for universal discoverability and search terms.

**Theming**: dual dark/light theme via `next-themes` (class strategy on
`<html>`, localStorage-persisted, no FOUC). Dark is the default; light is
opt-in via a sun/moon toggle in the landing nav, gestion header, and customer
menu category rail. Theme state is managed by a `Providers` wrapper component
(`app/providers.tsx`) that uses a separate storage key for menu embeds (`/m/...`
routes), preventing the demo menu's theme toggle from affecting the marketing site.
All components use semantic CSS-variable tokens (`bg-background`, `text-foreground`,
`border-hairline`, `text-ember-*`, …) defined in `globals.css` — the `html.light`
block overrides the same 10 variables with a warm "linen & terracotta" palette
(embers darkened ~25% for contrast on light surfaces). The `@theme inline`
Tailwind v4 bridge and all component class strings are theme-agnostic.

**QR menu page & guest ordering** at `/m/[slug]` (demo: `/m/trattoria-lucia`) — the product
guests see after scanning. Premium gradient design, responsive desktop
layout (2-column grid, max-w-5xl), all items as photo cards. Server-rendered
from Supabase (anonymous public read): back-office menu edits are immediately
live for guests. **Guest ordering is LIVE**: cart provider + add-to-order
button with options modal (enforces obligatory option groups, displays supplements),
floating cart bar with review drawer, and submit via the `place_order` SECURITY DEFINER
function (item prices and supplements frozen server-side, stock checked/decremented,
gated to Smart/Connect offres only). Orders appear live in `/gestion/commandes`.
Verified end-to-end: real guest order placed in browser against live production DB,
confirmed immediate appearance in `/gestion/commandes` with "en attente" status.
All `place_order` + RLS performance migrations applied to live Supabase.

**Back-office dashboard ("Espace de gestion")** at `/gestion` — the v1 of the
page restaurants use after logging in. French UI, same ember design system.
Six routes under a shared shell (desktop sidebar / mobile bottom tabs):
Aperçu (stats + out-of-stock list), Commandes (status lifecycle en_attente →
payée with cancel, filter pills, grouped-table orders with bulk serve/pay,
payment-mode dialog), **Analytique** (7/30-day period toggle, stat tiles for CA
encaissé/commandes payées/panier moyen, CSS-only bar charts: CA par jour with
direct label on max day + per-bar hover tooltip, Top ventes horizontal bars,
Heures de pointe order-by-hour, plus accessible `<details>` data table; gated
to Smart/Connect, live-updating via realtime store; chart colors use a dedicated
validated theme-aware token `--chart-mark`), Tables (grid selection → table groups,
add/remove/dissolve), Menu (categories with inline taglines, item CRUD with **photo upload**—gérant-only, client-side compression, public Supabase Storage bucket—plus photo URL input, badges, pairing, stock/availability, options-variantes editor with import),
Formules (step-based set menus, articles linkable to menu items), plus Équipe
(gérant only: invite members by email with a role, change roles, remove).
Tier gating mirrors the landing pricing (digital → Menu+Formules only;
smart/connect add Commandes/Tables/Analytique/options/roles gérant-cuisinier-serveur);
the offre lives on the etablissement row, the role on the user's membership
(the old demo switcher is gone). All state is loaded from Supabase behind
`frontend/lib/gestion/api.ts` (UI call sites unchanged): every mutation
writes to Postgres then updates the local snapshot, and the store subscribes
to Realtime order changes (coalesced refetch) so status updates appear live
across devices.

**Database & auth** (branch `feature/database-workflow`): the full data layer
is on Supabase. Multi-tenant Postgres schema versioned in
`supabase/migrations/` — etablissements, memberships (role + denormalized
email), invitations, categories, items, formules, tables, table_groups,
orders, order_items; option groups and formule steps are jsonb value-objects;
order lines snapshot name/price so they survive menu edits. Business
invariants live in Postgres: an order-status transition trigger mirrors
`ORDER_STATUS_FLOW`, and per-role guard triggers mirror `ROLE_ACTIONS`
(cuisinier → status changes + item availability/stock only, serveur →
"servie" + table grouping only). RLS on every table: anonymous read is
limited to public menu data (QR page); everything else is member-scoped.
Auth is Supabase email/password **and Google OAuth** — `/login`,
`/auth/callback`, `/onboarding` (creates etablissement + gérant membership +
numbered tables in one SECURITY DEFINER function), with Next 16 `proxy.ts`
refreshing the session and guarding `/gestion`. Signup now shows a dedicated
confirmation screen (with email icon) after registration, guiding users to
open the verification link in their inbox. **Branded confirmation email template**
(`supabase/templates/confirmation.html`) — French, cream "paper" theme with serif
typography and ember accents, table-based inline-styled HTML for mail-client
compatibility. Registered in `supabase/config.toml`; verified via template render
screenshot. Production: template must be pasted manually into Supabase Dashboard
(→ Auth → Email Templates → Confirmation) since this machine lacks Supabase CLI auth.
Invitations are pure-Postgres: a
trigger attaches the membership when the invited email creates its account
(or instantly if it already exists). Demo data: `npm run seed:demo` reuses
`seed()` as the single source of truth (readable slug ids remapped to uuids).
**Live**: the free cloud project is created and linked, migrations pushed,
demo seeded, env keys filled (`backend/.env` + `frontend/.env.local`, both
gitignored), and `database.types.ts` regenerated from the real schema.
Verified end-to-end: RLS probed over REST with the anon key (menu readable,
orders/memberships invisible, anonymous writes blocked), `/m/trattoria-lucia`
server-renders from Postgres, `/gestion` without a session 307-redirects to
`/login`. Deliberately deferred: Google provider activation (OAuth client to
create in Google Cloud Console — email/password login already works), guest
ordering from the QR page, multi-etablissement switcher, subcategories.

**Stripe subscriptions**: paid plans are enforced end-to-end. Funnel:
pricing card → `/login?plan=<offre>` (signup mode preselected) →
`/onboarding` (offre prefilled) → Stripe Checkout (hosted page, monthly
subscription, no trial, `locale: fr`) → back to `/gestion`. A `subscriptions`
table (migration 0004, member-read RLS, written only by the webhook via
service_role) holds the raw Stripe status; `/gestion` is fully locked behind
an "Activer mon abonnement" screen until the status is `active` (the screen
polls after Checkout returns, gérant-only button). Code lives in Next route
handlers (`/api/stripe/checkout` + `/api/stripe/webhook`, signature-verified)
— chosen over the FastAPI backend because Render free tier cold starts would
delay webhooks. Prices live in Stripe, resolved by `lookup_key` = offre id;
`npm run setup:stripe` creates the three products from `pricingSection` in
`lib/landing-data.ts` (the landing prices are the single source of truth —
nothing hardcoded) and now reconciles price changes: if a landing price changes,
it creates a new Stripe price with `transfer_lookup_key: true` and archives the old
one (existing subscriptions keep their old price, but Checkout resolves by lookup_key
so new signups see the new price). This was run against live Stripe to align pricing
(Digital 29→49 €, Smart 59→79 €). The demo etablissement is seeded with an active
subscription. **Pending**: fill `STRIPE_SECRET_KEY` (test mode) in
`backend/.env`, run `npm run setup:stripe`, and for local webhook testing run
`stripe listen --forward-to localhost:3000/api/stripe/webhook` (copy the
`whsec_…` into `frontend/.env.local` `STRIPE_WEBHOOK_SECRET`).

**Guest table payment via Stripe Connect** (per-restaurant Express accounts):
gérants connect their Stripe account via hosted onboarding from the Établissement
page ("Paiement à table" section, connect-account status + enable toggle);
guests pay by card at order time (payment choice in cart drawer), amounts are
pulled server-side from frozen order lines, and a connected webhook marks orders
`paid_online=true` via service role. Card infrastructure: `/api/stripe/connect`
(gérant onboarding link), `/api/stripe/pay` (guest checkout, anonymous), and
`/api/stripe/webhook-connect` (connected-account events). Payment settings
component and paid-online order surfacing (badge + button state) complete;
orders correctly show "Payée en ligne" and skip payment-mode dialogs.
**Live**: payments migration applied to Supabase; types regenerated.
Verified: `npx tsc --noEmit` passes, build complete.

**Deployment status**: all core features are LIVE in production. Four Supabase migrations applied
(guest ordering + RLS perf + order fixes + payments). Guest ordering verified end-to-end.
Bug fixes (13 files): supplement double-counting removed, paid-online orders fully surfaced,
public-menu crash fixed, infinite skeleton fixed, cart fallback messaging.
Performance: fetchOrders bounded to 30 days + still-open, QR menu single nested roundtrip,
proxy uses local JWT verification, reorderCategories single RPC call. Types regenerated from live schema.

**Click & collect** (`collect.ominin.com`): full takeaway ordering system on a
dedicated subdomain. Restaurants subscribe independently (100 €/month standalone,
150 €/month bundled with Connect). Customer flow: browse the menu at
`collect.ominin.com/<slug>` → add items to cart (with option variants) → enter
name/phone/pickup time → pay via Stripe Checkout (payment mode, not subscription)
→ order confirmation page polls until the webhook creates the order, then tracks
status (en_attente → en_preparation → prête → retirée). Server-side: `proxy.ts`
rewrites the collect subdomain to `/collect/*` app routes; `/api/collect/checkout`
validates items/prices from the database (never trusts client-sent prices), stores
the cart in `collect_pending`, and creates a Stripe payment session;
`/api/collect/order` serves the confirmation page's polling. The Stripe webhook
calls `create_collect_order` (SECURITY DEFINER RPC, idempotent via
`stripe_session_id` unique constraint) to atomically convert the pending cart into
an order + order_items. Gestion dashboard fully adapted: orders tagged with an
"Emporter" badge show customer name and pickup time instead of table number, with
a collect-specific status flow (prête → retirée instead of servie → payée).
Multi-product subscriptions: the `subscriptions` table has a composite PK
`(etablissement_id, product)` supporting independent offre and collect
subscriptions. DB migrations: `20260710000002_collect_enums.sql` (new enum
values), `20260710000003_collect.sql` (schema changes, `collect_pending` table,
RPC function, updated order transition triggers).

**Ominin Clip** (`clip.ominin.com`): livestream-clipper subdomain product —
automated social posting of clip videos. Conversion landing page (hero with
product mockup, how-it-works flow, time-savings features, pricing section with
FAQ) lives at `/clip` and is reachable via the subdomain proxy rewrite. All
copy (French) and pricing (1 500 € one-time base product + 50 €/month per 10
social accounts, first month free) source from `lib/clip-landing-data.ts`. Auth:
clipper signups via `/clip/login` (tagged with product metadata) tag users as
`product:"clip"` in Supabase; protected `/clip/espace` space is a stub for
phase 2. Shared auth form (`components/auth/auth-form.tsx`, parameterized by
brand/destination/signup mode) extracted from `/login/login-form.tsx` — reused
for both restaurant and clipper signups. Bug fix: `app/auth/callback/route.ts`
now uses `x-forwarded-host`/`host` headers to preserve subdomain through
redirects (was using `request.url.origin` which broke for clip in production).
Design system: new `.clip-timeline-motif` CSS utility in `globals.css` for
branding. `frontend/proxy.ts` extended: NEXT_PUBLIC_CLIP_HOST subdomain rewrites
to `/clip/*` routes, /auth/* paths pass through un-rewritten for OAuth callbacks,
/espace is protected. Verified: `npm run build` + `npm run lint` pass; 28
Playwright tests covering clip homepage content, host rewrite, login/signup
modes, auth flow, protected routes, and cross-host non-regression.
Deliberately deferred (phase 2): full clipper platform (social account
connections, clip uploads, posting agents, Stripe billing), DNS/domain setup
(Vercel domain binding, CNAME, Supabase redirect URL for clip.ominin.com).

Committed project skills in `.claude/skills/`: graphify (knowledge graph),
`/commit` (required commit/push workflow). `CLAUDE.md` defines agent rules.
Knowledge graph: `graphify-out/` (802 nodes, 101 communities).

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
├── supabase/          Versioned SQL migrations (schema, functions/triggers, RLS)
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

### 4. Supabase (database & auth)

The schema lives in `supabase/migrations/` (schema → functions/triggers →
RLS). One-time human steps: create a free project at supabase.com, then copy
from Project Settings → API the URL + `anon` key into `frontend/.env.local`
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) and the URL +
`service_role` key into `backend/.env`.

```bash
supabase login                          # opens browser once
supabase link --project-ref <ref>      # ref = id in the project URL
supabase db push                       # applies supabase/migrations/
cd frontend && npm run seed:demo       # inserts the Trattoria Lucia demo
```

Optional but recommended: regenerate the DB types after any schema change —
`supabase gen types typescript --linked > frontend/lib/supabase/database.types.ts`.
For Google sign-in, create an OAuth Client ID in Google Cloud Console and
enable the Google provider in Supabase → Authentication → Providers (use the
callback URL shown there).

Verify: `npm run dev` in `frontend/`, then `/m/trattoria-lucia` shows the
demo menu from the database, and `/login` → sign-up → `/onboarding` creates
a working `/gestion` space.

### 5. Graphify (knowledge-graph CLI)

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

### 6. Project skills (nothing to install)

This repo ships committed Claude Code skills in `.claude/skills/` — you get
them automatically with the clone:

- `/graphify` — build/query the knowledge graph (see step 5)
- `/commit` — the required way to commit and push: writes a detailed commit
  message, updates the README project status, refreshes the knowledge graph,
  runs safety checks, then pushes

When asked to commit work in this repo, always go through `/commit`
(`.claude/skills/commit/SKILL.md`) rather than raw git commands.

### 7. Final checklist

- [ ] `npm run build` succeeds in `frontend/`
- [ ] `curl http://localhost:8000/health` returns `{"status":"ok"}`
- [ ] `graphify --version` prints a version
- [ ] `backend/.env` exists (keys may be pending from the human)
- [ ] `frontend/.env.local` exists with the Supabase URL + anon key
- [ ] `supabase db push` applied (pending the human-created cloud project)

Read `CLAUDE.md` at the repo root for stack rationale, commands, and project
conventions before writing any code.

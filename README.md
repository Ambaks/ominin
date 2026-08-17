# Ominin

AI solutions for restaurants, decreasing their operating costs and facilitating
their operations.

## What this is

Ominin provides computer and AI solutions to restaurant businesses — think cost
tracking, forecasting, invoice processing, and back-office automation.

## Project status

> ⚠️ **Manual setup pending — see [`TACHES-AMBAKA.md`](TACHES-AMBAKA.md).**
> Dashboard-only steps the coding agent can't do (no DNS/Supabase/Vercel/Stripe
> access). Highest-priority: `supabase db push` (**five** migrations now, incl.
> collect-standalone, contact-requests, and the new `crm` migration), **seed the
> `admin_users` allowlist** (the internal CRM shows nothing to anyone else),
> **remove `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` from Vercel** (sessions are per-host
> now — leaving it set silently re-shares them across subdomains), and the
> `menu.ominin.com` + `admin.ominin.com` cutovers (DNS + Vercel domain +
> `NEXT_PUBLIC_*_HOST` + Supabase redirect URLs, in the order the checklist
> gives). Also pending: a Resend account for the contact form, the branded
> signup-confirmation email template, and the upload-post account for Clip.

**Internal sales CRM** (new) at `admin.ominin.com` — `app/admin/**`, the fourth
`PRODUCTS` entry in `frontend/proxy.ts` (whole tree private via
`privatePaths: ["/"]`; the guard now excludes `/connexion` so the login page
stays reachable). Field-sales lead management for Montpellier + coast: a
MapLibre map (`/carte`, OpenFreeMap Positron tiles, clustered status-colored
markers, optional geolocation — `Permissions-Policy` relaxed to
`geolocation=(self)` and the tile host added to CSP), a lead panel opened by
`?lead=<id>` from any page (activity timeline, notes, important-info field,
quick actions), a ≤30 s "Visité" field flow (status + geotagged visit activity
+ optional note/follow-up), a drag-and-drop pipeline (hand-rolled pointer
events + tap-to-move fallback), tasks with an overdue nav badge, appointments,
a dashboard (funnel + weekly activity), a sortable restaurant table, and CSV
import (RFC 4180 parser, `,`/`;` auto-detect, per-row validation + duplicate
detection against the store) / export (same technical headers, so an export
re-imports as-is). Data layer: migration `20260810000003_crm.sql` — 8 `crm_*`
tables + `admin_users` allowlist, one `(select is_admin())` RLS policy per
table (browser supabase-js reads/writes directly, /gestion-style), triggers for
`updated_at`, lead auto-creation, status-change activity logging, and
`next_follow_up_at` derivation from open tasks; `crm_find_duplicates()` RPC
(pg_trgm) backs the manual-creation duplicate warning. State: light global
snapshot (`lib/admin/store.ts`, paginated past PostgREST's 1000-row cap) +
lazy per-lead detail cache; mutations in `lib/admin/api.ts` (write first, patch
snapshot). French UI, no new deps besides `maplibre-gl`. Seed:
`npm run seed:crm` (25 fake restaurants Montpellier→Grau-du-Roi, all 10
statuses, purge-by-`source='seed'` idempotent). Until the DNS cutover the CRM
is served at `ominin.com/admin` / `localhost:3000/admin`.
**Turbopack × maplibre worker gotcha**: maplibre v6 loads its tile worker via
an internal `new URL(…, import.meta.url)` that Turbopack doesn't rewrite — the
worker URL comes out empty and no vector tile ever loads (gray basemap, zero
requests, zero console errors). Fixed by serving the worker and its single
dependency from `public/maplibre/` (gitignored), copied from `node_modules` by
the `sync:maplibre` script wired as `predev`/`prebuild` hooks, and
`setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")` in `map-canvas.tsx`.
Verified: `tsc --noEmit`, `npm run lint`, `npm run build` pass; driven in a
real browser (Playwright) against a local Supabase mock — 23/23 checks: login
gate + allowlist refusal path, map tiles and status-colored markers/clusters,
lead panel via `?lead=`, the ≤30 s Visité flow (note + relance + toast),
one-tap status change, pipeline drag & tap-to-move fallback, task completion,
grouped RDV, sortable table, CSV export (BOM, re-importable headers), CSV
import (valid/warning/duplicate/invalid classification + report), search
filter, mobile viewport (bottom nav, full-screen panel), and no regression on
portal//gestion//clip. A multi-agent adversarial review pass then surfaced and
fixed 14 defects — notably: `.range()` pagination without a unique `.order()`
tiebreaker (duplicated/dropped rows past 1000), the export's open-task count
including completed tasks, a stale-refresh race in the lead-detail cache,
post-drag click swallowing on the pipeline, CSV formula-injection
neutralization on export, import line numbers drifting past blank lines, and
`javascript:` URL hardening on the website link. `database.types.ts` `crm_*`
entries are hand-written pending `supabase gen types`.

**Per-subdomain sessions** (new): `ominin.com`, `collect.ominin.com`, and `clip.ominin.com` each hold their own session. The auth cookie is no longer pinned to the `.ominin.com` parent domain, so signing in on one product does not sign you in on the others, and "Continuer avec Google" now passes `prompt=select_account` so Google always asks which account instead of silently reusing the one already signed in elsewhere. Consequences, all handled: the collect subdomain serves `/gestion` itself (the proxy skips the `/collect` rewrite for it) instead of redirecting to `ominin.com/gestion`; Stripe checkout returns to the host that started it; a signed-in collect user with no establishment goes to `/inscription/etablissement` rather than the menu-offer `/onboarding`; and the OAuth callback only accepts relative `next` paths.

**Product domain auth flows**: login and signup are separate pages (`/connexion`, `/inscription`) hosted on the main domain *and* on each product subdomain (`/collect/connexion`, `/collect/inscription`, `/clip/connexion`, `/clip/inscription`). Visitors arriving from a product landing hit their product-specific funnel: the brand (Ominin vs. Collect vs. Clip), pricing, and destination differ by domain. The old `/login` path now redirects to the appropriate page, keeping existing links working (`?plan=` and `?inscription=1` query params are honoured). `AuthForm` component no longer toggles mode in place — the mode (signin/signup) is fixed by the route, with a link to the sibling page.

**Collect standalone signup** (new): restaurants can now subscribe to click & collect alone without a menu offer. The flow at `collect.ominin.com/inscription` asks only three fields: establishment name, address, and SIRET (optional). The menu slug is derived programmatically from the name with numeric-suffix collision retries. Database: `etablissements.offre` is now nullable; `etablissements.siret` added (14-digit check constraint); a new trigger `check_sur_place_offre` prevents collect-only establishments from accepting table orders (blocking place_order inserts).

**Product pricing per funnel**: each signup funnel charges the rate that matches the product being bought. Collect-only establishments pay 100 €/month at signup; existing customers adding Collect don't pay twice. **Bundle pricing**: a Connect customer adding Collect no longer stacks 99€ + 100€ = 199€. Instead, the existing Stripe subscription is switched to the `collect_connect` price (150 €/month) with proration — the webhook sees `metadata.products="offre,collect"` and writes both subscription rows. The checkout endpoint returns `{bundled: true}` (no redirect), so the Produits page just re-reads state.

**Feature gating by product** (refactored): authorization no longer derives from the `offre` column. A new `ActiveProducts` type and `activeProducts()` selector read what products are actually *paid for* (from `subscriptions`). Tabs and features are gated via `hasFeature(products)` and `allowedActions(products, role)` — QR codes (Cachet) are tied to Digital/Smart/Connect offers, not available to collect-only. The espace opens when *either* `offre` or `collect` is active.

**Price-copy fixes**: Collect landing incorrectly stated "100 €" commission; the page now correctly shows 200 € (100 € subscription + 10 % commission, matching the calculator). Funnel links are now absolute to the collect subdomain (e.g., `/collect/inscription`) so the landing, if served at `ominin.com/collect`, doesn't redirect visitors into the menu-offer funnel.

Verified: `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass. Routes `/connexion`, `/inscription`, `/collect/connexion`, `/collect/inscription`, `/collect/inscription/etablissement`, `/clip/connexion`, `/clip/inscription` all render. Driven in browser (Playwright) against local Supabase mock: all four auth screens show the correct product, brand, and price ("Ominin Collect … 100 €/mois"); `/login` redirects correctly; collect signup renders exactly three fields; a collect-only establishment sees Collect-appropriate tabs (no QR codes) and header ("OMININ COLLECT · GÉRANT"); a Digital establishment sees menu-tier features and tabs. Deliberately deferred: the 10 % collect commission still isn't charged to restaurants (no application_fee or payout path from platform account) — that needs Stripe Connect connect-account work.

**Merge note (subdomain × product-auth)**: the two workstreams above landed in
parallel and were reconciled as follows. The per-host session model applies to
all four hosts, `menu.ominin.com` included; the menu product's auth pages
(`/connexion`, `/inscription`, the `/login` redirect page) live under
`app/menu/**` like the rest of the product; the collect subdomain still serves
`/gestion` itself, now via a proxy rewrite override onto the `/menu` tree
(where the shared gestion app lives); apex convergence redirects cover all
three product subdomains, and `/connexion` + `/inscription` joined the menu
product's legacy paths (redirected to the menu host when active, rewritten
when inert). The contact-requests migration was renamed to
`20260810000002` — it collided with collect-standalone's version id.

**Site architecture: one portal, one subdomain per product.** `ominin.com`
serves only the corporate portal; every product lives on its own host, which
`frontend/proxy.ts` rewrites onto its own route tree:

| Host | Route tree | Content |
|---|---|---|
| `ominin.com` | `app/page.tsx`, `app/sur-mesure/` | Portal + custom-build enquiry |
| `menu.ominin.com` | `app/menu/**` | QR menu landing, `/login`, `/onboarding`, `/gestion/**`, `/m/<slug>` |
| `collect.ominin.com` | `app/collect/**` | Click & collect |
| `clip.ominin.com` | `app/clip/**` | Livestream clipper |
| `admin.ominin.com` | `app/admin/**` | Internal sales CRM (allowlist-only) |

An empty `NEXT_PUBLIC_*_HOST` makes a subdomain inert, its pages staying
reachable under their prefix (`ominin.com/menu`) — that is the dev mode and the
rollback switch. Legacy apex URLs (`/m/<slug>`, `/gestion`, `/login`,
`/onboarding`) are handled in both states: with the menu host set they
308-redirect to it (already-printed Cachets keep working — keep those redirects
as long as old stickers circulate); with it unset they are **rewritten** onto
the `/menu` tree, so deploying this code before the DNS/Vercel cutover breaks
no existing URL, and `menuSiteUrl` likewise falls back to `${siteUrl}/menu` so
no link ever points at an unresolvable host. When an account subdomain's host
is set, its apex prefix form converges too (`ominin.com/clip/espace` →
`clip.ominin.com/espace`, same for `/menu/*`): each product's session cookies
live on exactly one host. In local development, setting
`NEXT_PUBLIC_MENU_HOST=menu.localhost:3000` (`*.localhost` resolves to
127.0.0.1 with no hosts-file edit) exercises the real subdomain routing;
without it the legacy-path rewrite keeps the gestion dashboard's absolute
links (`/gestion/…`, `/login`) working at the apex.

**Portal** at `ominin.com`: bilingual FR/EN single page — hero ("Facilitez vos
opérations, propulsées par l'IA" / "Facilitate your operations, powered by AI")
over an inverted ember glow, then a 2×2 grid of product cubes. Each cube is
unlit at rest, showing only its product's signature motif in filigree
(`.qr-motif`, `.collect-dash-motif`, `.clip-timeline-motif`, and the new
`.grid-motif` for the custom-build cube); pointing at one — or focusing it with
the keyboard, the whole card being the link — ignites an ember filament along
its top edge, raises the motif and lifts a glow from below. The destination host
is printed on every cube, so where a click leads is explicit beforehand.
Language is client state (`lib/portal/language.tsx`) read from localStorage via
`useSyncExternalStore` — French is server-rendered by default (the real market,
and what crawlers get), English is opt-in and syncs across tabs; the toggle sits
next to the theme toggle and drives `document.documentElement.lang`. All copy
lives in `lib/portal-data.ts` as `{ fr, en }` pairs. Portal sections are client
components (unlike the fully-server product landings) because the language is
client state.

**Custom-build enquiry** at `/sur-mesure`: the fourth cube's destination —
positioning, three concrete examples (invoice processing, forecasting, internal
tools), and a contact form. `contact_requests` (migration
`20260810000001`) has RLS enabled and **no policy at all**: neither the anon key
nor a signed-in user can read or write it, and the sole insertion path is
`/api/contact` using `service_role`. That closes the direct Supabase REST
surface; the route itself is guarded by a honeypot (dropped silently) plus a
sliding-window in-memory rate limit (5 per IP per 10 min, per serverless
instance — enough against naive scripted abuse, not against a distributed
attacker, an accepted free-tier tradeoff). The route validates against
`CONTACT_LIMITS` (`lib/portal/contact.ts`, mirroring the migration's CHECK
constraints), writes the row, then fires a Resend notification
best-effort — a mail failure is logged and still returns success, because the
request is already durably stored. Verified: honeypot, short message, bad email,
empty name and unparseable body all return the right status.

**QR menu marketing landing page** now lives at `menu.ominin.com`. Conversion-focused,
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
Seven routes under a shared shell (desktop sidebar / mobile bottom tabs):
Aperçu (stats + out-of-stock list), Commandes (status lifecycle en_attente →
payée with cancel, filter pills, grouped-table orders with bulk serve/pay,
payment-mode dialog), **Analytique** (7/30-day period toggle, stat tiles for CA
encaissé/commandes payées/panier moyen, CSS-only bar charts: CA par jour with
direct label on max day + per-bar hover tooltip, Top ventes horizontal bars,
Heures de pointe order-by-hour, plus accessible `<details>` data table; gated
to Smart/Connect, live-updating via realtime store; chart colors use a dedicated
validated theme-aware token `--chart-mark`), Tables (grid selection → table groups,
add/remove/dissolve), Menu (categories with inline taglines, item CRUD with **photo upload**—gérant-only, client-side compression, public Supabase Storage bucket—plus photo URL input, badges, pairing, stock/availability, options-variantes editor with import),
Formules (step-based set menus, articles linkable to menu items), **Produits** (new:
subscription tier display, role-based action list, links to other Ominin products),
and Équipe (gérant only: invite members by email with a role, change roles, remove).

**Shared product catalog**: All Ominin products (Digital/Smart/Connect, Collect, Clip)
now share a single product data model (`frontend/lib/products.ts`): `Product` interface,
`offreProducts` array, `collectProduct`, `clipProduct`, and `currentOffreProduct(offre)` helper
that returns the subscribed tier with cumulative feature lists (since landing tiers only list
their delta, which would under-sell what clients actually have). All prices and descriptions
source from existing landing data — no text is restated. Shared presentational card component
(`frontend/components/products/product-card.tsx`) + named exports for Pill, FeatureList,
DiscoverLink used by both gestion and clip spaces. Generic wordmark component
(`frontend/components/brand/wordmark.tsx`) renders "Ominin" + optional product suffix.

**Login screens identify the product**: `AuthForm` now requires a `space` prop (rendered as
an eyebrow above the brand); header extracted so both the form and post-signup confirmation
show it. `/login` shows "ESPACE RESTAURANTS" + Ominin wordmark; `/clip/login` shows "ESPACE CLIPPERS";
`/login?produit=collect` shows "Ominin Collect" + subtitle about click & collect being managed from gestion.
Collect landing CTAs carry `?produit=collect` (built from `collectOffer.id`).

**Logged-in product identity**: Gestion header eyebrow now reads full product name + role ("OMININ CONNECT · GÉRANT"),
still linking to /gestion/produits. **Produits page** (`/gestion/produits`): rewritten on the shared card,
showing the user's subscription (tier name, tagline, price, cumulative feature list), role description with exact
allowed actions (filtered per tier), and active Collect subscription (if any) as a product they *have* with a link
to their public ordering page. "Autres produits Ominin" catalog section is gérant-only: cuisiniers and serveurs
see their offer + role + any active Collect, but no upsell. Page subtitle adapts to role.
All prices and feature lists source from existing landing data (`lib/landing-data.ts`,
`lib/clip-landing-data.ts`); role permissions defined in `lib/gestion/permissions.ts`.
Stripe success/cancel URLs now return to `/gestion/produits` for collect purchases,
`/gestion` otherwise. Checkout polling added for webhook latency (refreshes on
`?checkout=succes`). Desktop sidebar + header eyebrow link; mobile routed via header
eyebrow (bottom bar already at capacity).

**Clip espace products**: Clippers get a fifth "Produits" tab (`/clip/espace/produits`, also at `/clip/demo/produits`
for the public demo) showing Ominin Clip as their product plus the restaurant catalog. Page needs no session data.

Verified: `npx tsc --noEmit`, `npm run lint` and `npm run build` all pass.
End-to-end browser testing: three login screens (Ominin, Ominin Collect, Ominin Clip);
Clip products page at 1280px and 390px; gestion page as gérant (offer + role + active Collect + catalog)
versus serveur (offer + role + active Collect only, no catalog). No horizontal overflow at 390px.
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

**Phase 2 upgrades** (new): Restaurant dashboard now supports **per-order ETA chips**
(5/15/25/40 min) when accepting a "dès que possible" order — a 2-tap flow replaces
the action row in place (no overlay); unaccepted collect orders show a relabeled
"Refuser" cancel affordance with polished refusal state (honest refund copy, `tel:`
link for customer contact). Customer confirmation tracker displays "Prête vers HH:MM"
and a minutes-left countdown derived per poll (no separate timer); an "Itinéraire"
card links to Google Maps directions with the restaurant location as destination
(origin omitted so maps uses device position). Database: new nullable `orders.estimated_ready_at`
column + trigger `enforce_order_update_rights()` allows cuisinier role to write ETA
and status in one atomic update. **Reserved slugs**: the check constraint on
`etablissements.slug` reserves "demo" and "collect" (static routes/proxy prefix
collisions); the `create_etablissement()` RPC function guards with a clean French
error message, mirrored client-side in onboarding form (`23514` error mapping).
**Marketing landing + interactive demo** at the collect subdomain root: full-page
landing (nav, hero with TicketRelay mockup, demo-showcase, how-it-works, features,
pricing from existing `collectOffer`, FAQ, footer) replaces the placeholder.
Interactive dual-pane demo at `/collect/demo` (full-screen, noindex): shared in-memory
state machine with configurable timings, customer pane displays order status + ETA chips,
restaurant pane shows acceptance/refusal/ready actions; mobile-responsive with
theme support (dark+light). All demo timings are centralized in `COLLECT_DEMO` config;
menu subset sourced by id (never duplicated). Verified: 17/17 Playwright end-to-end
checks passed (landing flow, demo order→accept→ready→pickup, refusal path, replay,
mobile 390px viewport, dark+light themes, /collect/demo switcher); `npm run lint`
+ `npm run build` green; reduced-motion accessibility coverage across animations.
**Landing page polish** (new): comparison section added — interactive slider shows
monthly takeaway revenue (min 1k € to max 15k €); two cost-bar charts animate to show
delivery platform fee vs. Ominin Collect monthly fee + transaction rate; annual savings
calculated and prominently displayed (EUR format, locale-aware). Design: ember-gradient
accent, motion-reduced support, accessibility (all values numeric, color never sole signal).
Cost bars use relative scaling (platform cost = 100% width, Ominin scaled to max).
Comparison data sourced from `comparisonSection` in `lib/collect-landing-data.ts`.
**Pending**: `supabase db push` to apply two new migrations
(`20260805000001_collect_eta.sql`, `20260805000002_reserved_slugs.sql`); `NEXT_PUBLIC_COLLECT_HOST`
env var not yet set so subdomain rewrite stays inert; Supabase types regeneration with
`supabase gen types typescript --linked`.

**Ominin Clip** (`clip.ominin.com`): livestream-clipper subdomain product —
automated social posting of clip videos. Conversion landing page (hero with
product mockup, how-it-works flow, time-savings features, pricing section with
FAQ) lives at `/clip` and is reachable via the subdomain proxy rewrite. All
copy (French) and pricing (1 500 € one-time base product + 50 €/month per 10
social accounts, first month free) source from `lib/clip-landing-data.ts`. Auth:
clipper signups via `/clip/login` (tagged with product metadata) tag users as
`product:"clip"` in Supabase; protected `/clip/espace` is the phase-2
dashboard (next paragraph). Shared auth form (`components/auth/auth-form.tsx`, parameterized by
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
**Ominin Clip phase 2** (`/clip/espace`): the clipper dashboard is fully built and polished —
social-account connections, publishing and analytics in one place. UI: four-tab navigation (Publier, Publications, Comptes, Analytique) under a shared shell with sticky header, desktop sidebar + mobile bottom tabs, matching the gestion design system. All transitions have staggered entrance animations (`.rise` class, 60ms+ delays). Loading states use a dedicated `ClipLoader` component. Both authenticated and public-demo modes supported (`/clip/demo`): demo mode shows "Démo de l'espace" header with "Créer mon espace" CTA instead of email + logout, and navigation paths are relative to `basePath` so demo and authenticated versions share component code. State management: single `useClipData` context (`frontend/lib/clip/context.tsx`) centralizes store + actions + flags (demo, basePath, loadError, retryLoad). Posting goes through upload-post (budget unified social-posting API: hosted OAuth linking page per clipper, TikTok/Instagram Reels/YouTube Shorts/X) behind a provider adapter (`frontend/lib/clip/provider/` — the only provider-aware code, so a later switch to direct platform APIs stays contained). Publish flow: the browser uploads the clip straight to the private Storage bucket `clips` via signed URL (50 MB cap — Supabase free-tier limit), Claude (`claude-opus-4-8` by default, `CLIP_CAPTION_MODEL` to override) generates per-platform titles/descriptions (editable in the UI), then `/api/clip/publish` hands the provider a signed download URL in async mode; the Publications page polls `/api/clip/posts/[id]/status` until `publie`/`partiel`/`echec` (retry re-submits every platform — a `partiel` retry can double-post the platform that succeeded, assumed v1 limitation). Analytics are read live from the provider (followers, vues, portée, j'aime… per platform, CSS bar chart on the `--chart-mark` token) with manual refresh button. Per-post analytics (views, likes, comments, shares, saves per platform) are fetched server-side from the upload-post provider and exposed via `/api/clip/posts/[id]/analytics` endpoint with per-platform metrics and post URLs. DB: migration `20260715000001_clip.sql` (`clip_profiles`, `clip_posts` + owner-only RLS, private `clips` bucket); the matching `database.types.ts` entries were added by hand — regenerate with `supabase gen types` when linked. All server logic lives in Next route handlers (`app/api/clip/*`, per the Render cold-start rule); no CSP change (provider + Anthropic traffic is server-side only). New env vars in `frontend/.env.local` / Vercel (server-side): `UPLOAD_POST_API_KEY`, `ANTHROPIC_API_KEY`; optional `UPLOAD_POST_API_URL`, `CLIP_CAPTION_MODEL`. Verified: `npm run lint` + `npm run build` pass. 

**Clip espace sub-navigation**: The dashboard now has segmented-control-style sub-navigation for both the Publier and Comptes tabs. Generic `SubTabs` component (`frontend/components/clip/espace/sub-tabs.tsx`) renders pill-based sub-route navigation with optional "Bientôt" badges; `PublierTabs` and `ComptesTabs` are thin config wrappers exporting the same interface.

**Coming soon: VOD clip generator**: Publier tab splits into two sub-modes: "Depuis un clip" (existing flow: upload a pre-edited clip) and "Depuis une VOD" (new, marked "Bientôt"). The generateur page (`/clip/espace/generateur`) is a coming-soon announcement with an animated hero showing the future workflow: a glowing playhead sweeps a VOD timeline (`.sweep` keyframe) while three highlight segments ignite on cue (`.ignite-1/2/3` keyframes, synchronized via CSS percentages so the animation stays in phase). Three explainer cards show the flow: upload a long-form VOD (live, podcast, interview), AI detects highlights and cuts vertical 9:16 clips, ready to publish (recropped, captioned, titled). An "En attendant" card links back to the current publish flow. The page uses the same `.rise` stagger animations as the rest of the dashboard. Shell navigation (`Publier` tab) stays active when browsing to `/generateur` via the `NavItem.also` field, which allows sub-pages to inherit the parent's active state.

**Coming soon: Account creation from espace**: Comptes tab splits into two sub-modes: "Comptes connectés" (existing flow: manage linked social accounts) and "Créer des comptes" (new, marked "Bientôt"). The account-creation page (`/clip/espace/comptes/creation`) is a fully designed coming-soon announcement with rich editorial layout: hero (eyebrow + tagline "Des comptes qui vivent tout seuls"), animated timeline visual showing a week in the life of an AI-piloted account (`.sweep` cursor with synchronized `.day-live` column animations), three-step explainer cards (account creation, AI behavior, natural posting rhythm), "Indétectable par conception" differentiator section with three pillars (single fingerprint, human behavior, natural rhythm), fleet example showing multiple managed accounts running in parallel, and "En attendant" CTA linking back to connecting existing accounts. All copy is French, design uses the ember-gradient system with `.rise` stagger animations. Static placeholder, ready for backend implementation.

**Landing nav login links**: Clip and Collect landing pages now show a "Connexion" login button in the sticky nav bar alongside the existing signup CTA, using the same ember-gradient pill styling. Links are driven from centralized landing data (`lib/clip-landing-data.ts`, `lib/collect-landing-data.ts`) via a `nav.login` export. Collect's login uses an absolute URL (`signinHref`) so it targets the collect subdomain regardless of whether the landing is served at `ominin.com/collect` or `collect.ominin.com`.

Still deferred: Stripe billing for clip, direct platform APIs, VOD upload + AI detection + clip generation logic, account-creation backend, provider webhooks (polling suffices), DNS/domain setup (Vercel domain binding, CNAME, Supabase redirect URL) — plus one new owner step: create the upload-post account and set `UPLOAD_POST_API_KEY`. Implementation plan for collaborators: `.claude/plans/clip-phase2-espace.md`.

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

Verify: set `NEXT_PUBLIC_MENU_HOST=menu.localhost:3000` in
`frontend/.env.local`, run `npm run dev`, then `http://localhost:3000` shows
the portal and `http://menu.localhost:3000/m/trattoria-lucia` shows the demo
menu from the database. On that same host, `/login` → sign-up → `/onboarding`
creates a working `/gestion` space.

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

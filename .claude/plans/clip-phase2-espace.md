# Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)

## Context

Phase 1 shipped the clip.ominin.com landing + shared auth; `/clip/espace` is a "setup en préparation" stub. Phase 2 turns it into the real product: a logged-in dashboard where clippers **connect their social accounts via OAuth**, **upload a clip → AI captions → post to selected accounts**, and **see per-account analytics** — all in one place.

**Decisions made with the user:**
- **Posting channel: upload-post** (budget unified API, ~$20–50/mo tiers, free tier 10 uploads/mo for dev) behind a provider adapter so we can migrate to direct platform APIs later. Verified against its OpenAPI spec: white-label User Profiles + JWT linking URL (each clipper connects their own accounts, hosted flow, French UI supported), `POST /api/upload` accepts a **video URL** (no multipart proxying needed), async mode + status polling, per-profile analytics endpoint. Ayrshare (~$599/mo multi-tenant) and direct APIs (weeks of app approvals; TikTok posts private until audit) rejected for now.
- **Platforms v1:** TikTok, Instagram Reels, YouTube Shorts, X.
- **Scope:** full flow **including AI captions** (Claude generates title/description, editable).
- **Caption model default:** `claude-opus-4-8` (env-overridable via `CLIP_CAPTION_MODEL`); ≈1¢/generation.
- **Clip size:** 50 MB hard cap in v1 (Supabase free tier); clear French error; Supabase Pro deferred until revenue.

**Architecture rule (from repo conventions):** all server logic in **Next.js route handlers + Supabase** — NOT the FastAPI backend (Render cold starts; established by the Stripe work). Provider + Anthropic keys stay server-side; browser only talks to `self` and `*.supabase.co` → **no CSP change needed**.

⚠️ Next 16 differs from training data — consult `node_modules/next/dist/docs/` before writing Next code (`frontend/AGENTS.md`). Middleware is `frontend/proxy.ts`; it already guards `/espace` on the clip host and lets `/api/*` through un-rewritten.

---

## 1. DB migration — `supabase/migrations/20260715000001_clip.sql`

Follow the style of `20260710000003_collect.sql` (French enum values, comment-heavy, `(select auth.uid())` per `20260709000003_rls_perf.sql`). After migrating: regenerate `frontend/lib/supabase/database.types.ts`.

- **`clip_profiles`** — `user_id uuid PK → auth.users`, `provider_username text unique not null` (we use the user's uuid), `created_at`. RLS: select own; insert/update via service role only (link route).
- **`clip_post_status` enum** — `('en_cours', 'publie', 'partiel', 'echec')`.
- **`clip_posts`** — `id uuid PK`, `user_id`, `title`, `captions jsonb` (per-platform, frozen at publish), `platforms text[]`, `status`, `storage_path` (nulled after cleanup), `provider_request_id`, `results jsonb`, `attempt int default 1`, `created_at`, `published_at`. Index `(user_id, created_at desc)`. RLS: full owner CRUD via `auth.uid()`.
- **Storage bucket `clips`** — private, `file_size_limit 52428800`, mime `video/mp4|quicktime|webm`. No storage policies — signed-URL only (photos-bucket convention).
- **Deliberately NOT created:** `social_accounts` table (fetched live from provider — always-fresh `reauth_required`, no sync code) and analytics snapshots (fetch live; add later only if history beyond the provider's timeseries is needed).

## 2. Provider adapter — `frontend/lib/clip/provider/` (server-only)

The only code that knows upload-post exists. Route handlers import `clipProvider` from `@/lib/clip/provider`; swapping providers later = one file.

- `types.ts` — provider-agnostic: `ClipPlatform ("tiktok"|"instagram"|"youtube"|"x")`, `ConnectedAccount`, `CaptionSet`, `PostSubmission`, `PostStatus`, `PlatformAnalytics`.
- `upload-post.ts` — implements against `https://api.upload-post.com/api`, header `Authorization: Apikey <UPLOAD_POST_API_KEY>`:
  - `ensureProfile(username)` → `POST /uploadposts/users` (409 = already exists = ok)
  - `createLinkUrl(username, redirectUrl)` → `POST /uploadposts/users/generate-jwt` (`platforms: [tiktok,instagram,youtube,x]`, `language: "fr"`, French connect title/description) → `access_url` (48 h validity)
  - `listConnectedAccounts(username)` → `GET /uploadposts/users/{username}`, normalize `social_accounts`, filter to the 4 platforms
  - `submitPost(sub)` → `POST /upload` FormData: `video` = **signed URL string**, `platform[]`, per-platform `*_title` / `youtube_description`, `async_upload: "true"`, `Idempotency-Key` header → `{requestId}`
  - `getPostStatus(requestId)` → `GET /uploadposts/status?request_id=` → map to `publie`/`partiel`/`echec`/`en_cours`
  - `getAnalytics(username, platforms)` → `GET /analytics/{username}?platforms=` → normalized `PlatformAnalytics[]` (followers, vues, portée, likes, commentaires, partages, `reach_timeseries`); tolerate one platform failing (partial results + warning)
- `config.ts` (server) — base URL (`UPLOAD_POST_API_URL` env, default upload-post), request timeout, signed-URL TTL, storage retention days. Missing key → throw French error (pattern: `lib/stripe/server.ts`). Non-2xx → route handlers return 502 `"Le service de publication ne répond pas."`

## 3. Route handlers — `frontend/app/api/clip/*`

Auth preamble from [frontend/app/api/photos/route.ts](frontend/app/api/photos/route.ts): server `createClient()` → `getUser()` → 401 `"Authentification requise."`. Guard `user.user_metadata.product === "clip"` on `link` (403 otherwise).

| Route | Method | Does |
|---|---|---|
| `api/clip/link` | POST | Upsert `clip_profiles` (admin client, `provider_username = user.id`), `ensureProfile`, `createLinkUrl(origin + "/espace/comptes")` → `{url}` |
| `api/clip/accounts` | GET | `{accounts: []}` if no profile yet; else `listConnectedAccounts` |
| `api/clip/upload-url` | POST | Validate mime + size ≤ 50 MB; `path = ${user.id}/${uuid}.${ext}`; admin `createSignedUploadUrl` → `{path, token, signedUrl}` |
| `api/clip/captions` | POST | `{context, platforms}` → Claude → `{captions}` (§5) |
| `api/clip/publish` | POST | Verify `path.startsWith(user.id + "/")` (403); insert `clip_posts` via **user-session client** (RLS-checked); admin `createSignedUrl(path, TTL)`; `submitPost` (idempotency `${post.id}:${attempt}`); save `provider_request_id`. Provider throw → mark `echec`, 502 |
| `api/clip/posts/[id]/status` | GET | Load row (RLS); if `en_cours` → `getPostStatus`; on terminal update status/results/`published_at`; on `publie` delete storage object + null `storage_path` |
| `api/clip/posts/[id]/retry` | POST | Only `echec`/`partiel` with `storage_path`; increment `attempt`, re-sign, resubmit, back to `en_cours` |
| `api/clip/analytics` | GET | Default to connected platforms → `getAnalytics` → `{analytics}` |

Post-history **reads** don't need routes — Supabase browser client on `clip_posts` under RLS (gestion pattern).

## 4. Storage & upload flow

- Browser → Storage directly: XHR `PUT` to the signed upload URL (real `onprogress` for the progress bar) — video bytes never touch Vercel (4.5 MB body limit is moot). No TUS in v1 (needs storage RLS + dependency; single PUT fine for ≤50 MB).
- Server → provider: signed **download** URL (TTL ~60 min, config) passed as `video` string; route handler work = two quick API calls.
- Cleanup: delete object on `publie`; keep on `echec`/`partiel` (retry needs it); publish route opportunistically deletes the caller's objects older than retention (~2 days, config) — no cron, protects the 1 GB free bucket.
- Dropzone rejects > 50 Mo: `"Ce clip dépasse 50 Mo. Compressez-le ou contactez-nous."`

## 5. Claude captions

- Add `@anthropic-ai/sdk` to `frontend/package.json`.
- `frontend/lib/clip/captions.ts` (server): French system prompt (rédacteur de titres/descriptions pour clips verticaux, ton par plateforme, hashtags dans le titre TikTok/IG/X, description YouTube distincte), JSON schema (one key per requested platform → `{title, description?}`, `additionalProperties: false`), context-length cap.
- Route: one `client.messages.create` call, `model: process.env.CLIP_CAPTION_MODEL ?? CAPTION_MODEL_DEFAULT` (**default `claude-opus-4-8`**), `output_config: {format: {type: "json_schema", schema}}` (guaranteed-parseable JSON), modest `max_tokens` (~1500, config). No streaming, no thinking config.
- Output fully editable in the UI before publish; "Régénérer" button.

## 6. Dashboard UI — replaces the stub

Routes (served as `clip.ominin.com/espace/...` via the existing proxy rewrite):

```
frontend/app/clip/espace/
  layout.tsx              — server getUser() guard (defense in depth) + <ClipShell>
  page.tsx                — « Publier » : dropzone → contexte → captions → plateformes → publier
  publications/page.tsx   — history, status pills, « Réessayer », polling
  comptes/page.tsx        — connected accounts + « Connecter mes comptes »
  analytique/page.tsx     — analytics
```

- **`ClipShell`** (`frontend/components/clip/espace/shell.tsx`) cloned from [components/gestion/shell.tsx](frontend/components/gestion/shell.tsx): sticky header with `ClipWordmark`, desktop sidebar + mobile bottom tabs (Publier / Publications / Comptes / Analytique), theme toggle, sign-out, skeleton, `LoadError` — **without** membership/onboarding/permissions logic.
- New components: `icons.tsx` (style of `components/gestion/icons.tsx`, reuse `ChartIcon`), `dropzone.tsx`, `caption-editor.tsx` (per-platform tabs on `Field`), `platform-badge.tsx`, `post-card.tsx` (status pill: en_cours=ambre pulsé, publie=vert, partiel=ambre, echec=rouge + Réessayer), stat card cloned from `components/gestion/apercu/stat-card.tsx`. Reuse `components/ui/{field,toast,empty-state,theme-toggle}.tsx` as-is.
- **Data layer** mirroring gestion (`lib/gestion/store.ts` / `api.ts` pattern, but own bootstrap — no membership redirect):
  - `frontend/lib/clip/types.ts`, `store.ts` (`useSyncExternalStore` singleton; `load()` = getUser + `GET /api/clip/accounts` + Supabase select `clip_posts` in parallel), `api.ts` (mutations: `requestLinkUrl`, `refreshAccounts`, `createUploadUrl`, `uploadClip` (XHR + progress), `generateCaptions`, `publish`, `pollPostStatus`, `retryPost`, `fetchAnalytics`), `constants.ts` (client-safe: sizes, poll intervals, French labels — see §9).
- **Comptes page:** platform cards (icon + handle + « Reconnexion requise » chip; note « Compte professionnel Instagram requis »). « Connecter mes comptes » → `POST /api/clip/link` → open hosted flow in new tab; refresh accounts on return/refocus. No remote avatars → no CSP img-src change.
- **Publish flow:** if zero accounts → empty state pointing to Comptes. Else: dropzone/progress → « Décrivez votre clip » + « Générer les titres » → editable captions per platform → checkboxes from connected accounts → « Publier » → optimistic insert + redirect to Publications.

## 7. Post lifecycle

```
publish → en_cours ──poll──▶ publie (storage supprimé)
              ├──▶ partiel ──retry──▶ en_cours
              └──▶ echec   ──retry──▶ en_cours
```

- Client polls `GET /api/clip/posts/[id]/status` every ~5 s while a visible post is `en_cours`; timeout ~10 min → « Statut inconnu, réessayez plus tard ». One poll on mount reconciles stale `en_cours` rows (closed-tab case).
- **Polling, not webhooks** (upload-post webhooks are API-key-global + need a public signed endpoint; drop-in upgrade later since `provider_request_id` is stored).
- Retry resubmits all selected platforms — document that `partiel` retry may double-post on the succeeded platform (v1 acceptable; refine to failed-only later).

## 8. Analytics page

- Mount → `GET /api/clip/analytics` → normalized per-platform data. No cache beyond the in-store session copy; « Actualiser » button.
- Top `StatCard` row aggregated (Abonnés, Vues, J'aime, Commentaires); per-platform section with mini-stats + hand-rolled CSS bar chart of `reach_timeseries` using the `--chart-mark` token technique from [app/gestion/analytique/page.tsx](frontend/app/gestion/analytique/page.tsx) — **no chart library**.
- Lower section: own `clip_posts` history (date, plateformes, statut). Per-post provider metrics = verify-first item (Risks); v1 commits to account-level only.
- One platform failing must not blank the page (partial render + warning).

## 9. Config, env & constants (approved placement)

- **Env vars** (Vercel + `frontend/.env.local`, documented in README): `UPLOAD_POST_API_KEY`, `ANTHROPIC_API_KEY` (server-side, frontend env — not FastAPI), optional `UPLOAD_POST_API_URL`, `CLIP_CAPTION_MODEL`.
- **`lib/clip/constants.ts`** (client-safe): `MAX_CLIP_BYTES` (50 MB — user-approved), `ACCEPTED_VIDEO_TYPES`, `POLL_INTERVAL_MS` (~5 s), `POLL_TIMEOUT_MS` (~10 min), `POSTS_PAGE_SIZE`, French status/platform labels.
- **`lib/clip/provider/config.ts`** (server): base URL, request timeout, signed-URL TTL (~60 min), retention (~2 days).
- **`lib/clip/captions.ts`**: `CAPTION_MODEL_DEFAULT = "claude-opus-4-8"` (user-approved), `CAPTION_MAX_TOKENS`, context cap.
- `is_aigc` on TikTok: **false** — the clip itself is human-created stream footage; only metadata is AI-assisted.
- **CSP: no change.** All provider/Anthropic traffic server-side; signed-URL PUT goes to `*.supabase.co` (already allowed); linking page opens as a navigation.

## Milestones & verification

Implement in order; each milestone is independently verifiable. Owner must supply an **upload-post API key** before M1 verification.

- **M1 — Comptes:** migration + regenerated types; adapter (`ensureProfile`, `createLinkUrl`, `listConnectedAccounts`); `link` + `accounts` routes; ClipShell + Comptes page + store. *Verify:* connect a real test account through the hosted flow; card renders. Also check the free plan's **profile limit** (`GET /uploadposts/users` returns `limit`/`plan`).
- **M2 — Publier:** bucket + upload-url + XHR upload; captions route (real Anthropic call); publish/status/retry routes; Publier + Publications pages + polling. *Verify:* publish a ~10 s clip to **one** platform (budget ~5 of the 10 free uploads/mo for testing); confirm `en_cours → publie`, the clip appears on the platform, and the storage object is deleted. **Test the Supabase signed URL as `video` input first** — this is the flow's linchpin.
- **M3 — Analytique:** analytics route + adapter fn + page (verify response shape against the real connected account before finalizing the normalizer).
- **M4 — Polish & E2E:** empty/error states, French copy pass (tone of `lib/clip-landing-data.ts`), mobile layout; then run the **`frontend:verify` skill**: login → Comptes → connect → Publier (small file) → captions → publish → status → Analytique. Plus `npm run lint` + `next build`.

After each code change: `graphify update .`. At commit time: follow `/commit` (README project-status update included).

## Risks / verify early

1. **Signed-URL ingestion** — URL-based `video` is confirmed in the spec, but max fetch size / query-string signed URLs undocumented → test in M2 before building everything (fallback: server downloads + re-uploads multipart, worse).
2. **Free-plan profile limit** unknown → check in M1; paid upload-post tier required before onboarding the first paying clipper (price into the 50 €/mo margin).
3. **X video publishing** may carry provider-side restrictions → verify one real X publish before promising it in UI copy.
4. **Instagram** needs a professional account → surfaced in Comptes copy; verify hosted flow handles it gracefully.
5. **Per-post analytics availability** → one real call in M3; v1 commits to account-level only.
6. **Signed-URL TTL vs provider queue time** → TTL is config; bump if async processing exceeds it.
7. **Partial-retry double-posting** → documented v1 limitation.

## Out of scope (later)

Stripe billing for clip (manual onboarding for now), account-count entitlements, direct platform APIs migration, webhooks, per-post analytics, DNS/Vercel/Supabase-redirect deploy steps (owner tasks, already listed in memory/README).

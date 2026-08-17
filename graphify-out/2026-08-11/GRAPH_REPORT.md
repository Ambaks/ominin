# Graph Report - ominin  (2026-08-10)

## Corpus Check
- 275 files · ~193,216 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1225 nodes · 3093 edges · 63 communities (53 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fc13553b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_useGestionAccess|useGestionAccess]]
- [[_COMMUNITY_createAdminClient|createAdminClient]]
- [[_COMMUNITY_landing-data.ts|landing-data.ts]]
- [[_COMMUNITY_api.ts|api.ts]]
- [[_COMMUNITY_collect-landing-data.ts|collect-landing-data.ts]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_data.ts|data.ts]]
- [[_COMMUNITY_clip-landing-data.ts|clip-landing-data.ts]]
- [[_COMMUNITY_selectors.ts|selectors.ts]]
- [[_COMMUNITY_formatPrice|formatPrice]]
- [[_COMMUNITY_context.tsx|context.tsx]]
- [[_COMMUNITY_store.ts|store.ts]]
- [[_COMMUNITY_types.ts|types.ts]]
- [[_COMMUNITY_What You Must Do When Invoked|What You Must Do When Invoked]]
- [[_COMMUNITY_MenuItem|MenuItem]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_types.ts|types.ts]]
- [[_COMMUNITY_shell.tsx|shell.tsx]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_upload-post.ts|upload-post.ts]]
- [[_COMMUNITY_add-to-order.tsx|add-to-order.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_Ominin Clip — Phase 2  Espace clipper (connexions, publication, analytics)|Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)]]
- [[_COMMUNITY_menu-data.ts|menu-data.ts]]
- [[_COMMUNITY_icons.tsx|icons.tsx]]
- [[_COMMUNITY_collect-experience.tsx|collect-experience.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_store.ts|store.ts]]
- [[_COMMUNITY_client.ts|client.ts]]
- [[_COMMUNITY_order-confirmation.tsx|order-confirmation.tsx]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_shell.tsx|shell.tsx]]
- [[_COMMUNITY_auth-form.tsx|auth-form.tsx]]
- [[_COMMUNITY_Setup guide (written for an LLM agent)|Setup guide (written for an LLM agent)]]
- [[_COMMUNITY_Ominin|Ominin]]
- [[_COMMUNITY_eslint.config.mjs|eslint.config.mjs]]
- [[_COMMUNITY_What you must do when invoked|What you must do when invoked]]
- [[_COMMUNITY_qr-showcase.tsx|qr-showcase.tsx]]
- [[_COMMUNITY_graphify reference extra exports and benchmark|graphify reference: extra exports and benchmark]]
- [[_COMMUNITY_demo-showcase.tsx|demo-showcase.tsx]]
- [[_COMMUNITY_graphify reference query, path, explain|graphify reference: query, path, explain]]
- [[_COMMUNITY_marwan|/marwan]]
- [[_COMMUNITY_config.py|config.py]]
- [[_COMMUNITY_Verifying the Ominin frontend|Verifying the Ominin frontend]]
- [[_COMMUNITY_graphify reference add a URL and watch a folder|graphify reference: add a URL and watch a folder]]
- [[_COMMUNITY_graphify reference commit hook and native CLAUDE.md integration|graphify reference: commit hook and native CLAUDE.md integration]]
- [[_COMMUNITY_graphify reference incremental update and cluster-only|graphify reference: incremental update and cluster-only]]
- [[_COMMUNITY_next.config.ts|next.config.ts]]
- [[_COMMUNITY_README|README.md]]
- [[_COMMUNITY_CLAUDE|CLAUDE.md]]
- [[_COMMUNITY_graphify reference GitHub clone and cross-repo merge|graphify reference: GitHub clone and cross-repo merge]]
- [[_COMMUNITY_graphify reference transcribe video and audio|graphify reference: transcribe video and audio]]
- [[_COMMUNITY_constants.ts|constants.ts]]
- [[_COMMUNITY_extraction-spec|extraction-spec.md]]
- [[_COMMUNITY_AGENTS|AGENTS.md]]
- [[_COMMUNITY_postcss.config.mjs|postcss.config.mjs]]
- [[_COMMUNITY_backend|backend]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 48 edges
2. `formatPrice()` - 36 edges
3. `useGestionAccess()` - 33 edges
4. `createAdminClient()` - 32 edges
5. `useToast()` - 28 edges
6. `apply()` - 27 edges
7. `useGestion()` - 27 edges
8. `check()` - 21 edges
9. `useClipData()` - 20 edges
10. `requireClipUser()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `createAdminClient()`  [EXTRACTED]
  frontend/app/api/collect/order/route.ts → frontend/lib/supabase/admin.ts
- `PostAnalyticsList()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/analytique/page.tsx → frontend/lib/clip/context.tsx
- `AnalytiquePage()` --calls--> `hasFeature()`  [INFERRED]
  frontend/app/menu/gestion/analytique/page.tsx → frontend/lib/gestion/permissions.ts
- `ApercuPage()` --calls--> `hasFeature()`  [INFERRED]
  frontend/app/menu/gestion/page.tsx → frontend/lib/gestion/permissions.ts
- `OnboardingPage()` --calls--> `createClient()`  [EXTRACTED]
  frontend/app/menu/onboarding/page.tsx → frontend/lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (63 total, 10 thin omitted)

### Community 0 - "useGestionAccess"
Cohesion: 0.06
Nodes (73): CommandesPage(), dedupeById(), FilterId, FILTERS, matchesFilter(), EquipePage(), ROLES, TeamManager() (+65 more)

### Community 1 - "createAdminClient"
Cohesion: 0.07
Nodes (52): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+44 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.07
Nodes (39): metadata, DemoShowcase(), Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter() (+31 more)

### Community 3 - "api.ts"
Cohesion: 0.09
Nodes (68): SignOutButton(), addTableToGroup(), apply(), assertTransition(), createCategory(), createFormule(), createGroup(), createItem() (+60 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.09
Nodes (25): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectHero() (+17 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (30): dependencies, @anthropic-ai/sdk, next, next-themes, react, react-dom, stripe, @supabase/ssr (+22 more)

### Community 6 - "page.tsx"
Cohesion: 0.14
Nodes (10): AnalyticsView, compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, compact, LoadedRow, METRIC_COLUMNS (+2 more)

### Community 7 - "data.ts"
Cohesion: 0.17
Nodes (19): ClipData, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics(), buildDemoPosts(), buildDemoState(), DAILY_REACH_PEAK, DEMO_ACCOUNTS (+11 more)

### Community 8 - "clip-landing-data.ts"
Cohesion: 0.09
Nodes (27): metadata, ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter() (+19 more)

### Community 9 - "selectors.ts"
Cohesion: 0.21
Nodes (13): ProduitsPage(), ExternalLinkIcon(), DiscoverLink(), Pill(), ProductCard(), ROLE_TAGLINES, allowedActions(), activeProducts() (+5 more)

### Community 10 - "formatPrice"
Cohesion: 0.18
Nodes (12): CheckoutView(), CustomerPane(), DishRow(), MenuView(), TIMELINE, TrackingView(), useNow(), OrderCardDemo() (+4 more)

### Community 11 - "context.tsx"
Cohesion: 0.13
Nodes (23): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), replacePost() (+15 more)

### Community 12 - "store.ts"
Cohesion: 0.15
Nodes (10): ClipNav(), CollectFooter(), CollectNav(), CollectWordmark(), LandingNav(), CategoryLink, CategoryNav(), ThemeToggle() (+2 more)

### Community 13 - "types.ts"
Cohesion: 0.24
Nodes (11): buildDemoMenu(), COLLECT_DEMO, DEMO_MENU_CATEGORIES, DemoMenuSection, DemoStep, CollectDemoContext, CollectDemoProvider(), CollectDemoState (+3 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "MenuItem"
Cohesion: 0.23
Nodes (12): GET(), isTerminal(), OrderConfirmation(), STATUS_COPY, CartChoice, CartLinePayload, CollectCheckoutPayload, collectHref() (+4 more)

### Community 16 - "page.tsx"
Cohesion: 0.12
Nodes (4): FLEET, PILLARS, STEPS, WEEK

### Community 17 - "types.ts"
Cohesion: 0.10
Nodes (17): AnalytiquePage(), CreationComptesPage(), ComptesPage(), GenerateurPage(), MOMENTS, STEPS, PublierPage(), PublicationsPage() (+9 more)

### Community 18 - "shell.tsx"
Cohesion: 0.14
Nodes (16): metadata, ApercuIcon(), CheckIcon(), CommandesIcon(), FormulesIcon(), GearIcon(), MenuIcon(), QrIcon() (+8 more)

### Community 19 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 20 - "upload-post.ts"
Cohesion: 0.14
Nodes (14): providerApiKey(), PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider, ensureProfile(), getPostStatus(), isClipPlatform() (+6 more)

### Community 21 - "add-to-order.tsx"
Cohesion: 0.23
Nodes (12): invalid(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, CONTACT_LIMITS, ContactField (+4 more)

### Community 22 - "page.tsx"
Cohesion: 0.19
Nodes (11): ClipShell(), isActive(), NAV_ITEMS, NavItem, signOut(), ChartIcon(), IconProps, LogoutIcon() (+3 more)

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "menu-data.ts"
Cohesion: 0.06
Nodes (46): ConfirmationPage(), metadata, CollectPage(), generateMetadata(), getPage, generateMetadata(), getRestaurant, MenuPage() (+38 more)

### Community 25 - "icons.tsx"
Cohesion: 0.24
Nodes (8): Dropzone(), formatSize(), CheckIcon(), LinkIcon(), ListIcon(), RefreshIcon(), UploadIcon(), ACCEPTED_VIDEO_TYPES

### Community 27 - "page.tsx"
Cohesion: 0.38
Nodes (4): metadata, DemoBanner(), emptySubscribe(), DEMO_BANNER

### Community 28 - "store.ts"
Cohesion: 0.26
Nodes (13): ClipDataProvider(), fetchApi(), getClientSnapshot(), getErrorSnapshot(), getServerSnapshot(), listeners, load(), notify() (+5 more)

### Community 29 - "client.ts"
Cohesion: 0.06
Nodes (67): AnalytiquePage(), Period, RevenueChart(), TopVentesChart(), ApercuPage(), OnboardingForm(), RESERVED_SLUGS, slugify() (+59 more)

### Community 30 - "order-confirmation.tsx"
Cohesion: 0.43
Nodes (6): config, matchesPath(), ProductConfig, PRODUCTS, proxy(), rewritePrefixFor()

### Community 31 - "layout.tsx"
Cohesion: 0.07
Nodes (43): fraunces, instrumentSans, metadata, viewport, metadata, MENU_PATHS, Providers(), PRIVATE_PATHS (+35 more)

### Community 32 - "shell.tsx"
Cohesion: 0.53
Nodes (4): CollectSignupForm(), slugify(), SubscriptionGate(), startCheckout()

### Community 34 - "auth-form.tsx"
Cohesion: 0.11
Nodes (11): metadata, metadata, metadata, metadata, metadata, metadata, AuthForm(), Wordmark() (+3 more)

### Community 36 - "Setup guide (written for an LLM agent)"
Cohesion: 0.12
Nodes (15): 1. Prerequisites, 2. Frontend, 3. Backend, 4. Supabase (database & auth), 5. Graphify (knowledge-graph CLI), 6. Project skills (nothing to install), 7. Final checklist, Ominin (+7 more)

### Community 37 - "Ominin"
Cohesion: 0.18
Nodes (10): Business constraints, Code quality, Commands, Conventions, graphify, Ominin, Repo structure, Stack (+2 more)

### Community 39 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): /commit, Execution requirement, Step 1 — Understand what changed, Step 2 — Project upkeep (required before every push), Step 3 — Safety checks, Step 4 — Write the commit message, Step 5 — Commit and push, Step 6 — Report back (+1 more)

### Community 40 - "qr-showcase.tsx"
Cohesion: 0.26
Nodes (9): metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), demoSection, collectDemoHref(), collectLandingHref(), emptySubscribe() (+1 more)

### Community 41 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 42 - "demo-showcase.tsx"
Cohesion: 0.27
Nodes (5): DemoHint(), Side, BrowserFrame(), IphoneFrame(), nextActionSide()

### Community 43 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 44 - "/marwan"
Cohesion: 0.33
Nodes (5): Information about Marwan, /marwan, Step 1 — Understand what changed, Step 2 - Write the summary info and give Marwan his designated task., What you must do when invoked

### Community 46 - "Verifying the Ominin frontend"
Cohesion: 0.40
Nodes (4): Drive (Playwright), Gotchas, Launch, Verifying the Ominin frontend

### Community 47 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 48 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 49 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 50 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 51 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 55 - "constants.ts"
Cohesion: 0.15
Nodes (15): POST(), CaptionEditor(), PlatformBadge(), PostCard(), STATUS_CLASSES, captionsSchema(), generateCaptions(), PLATFORM_LABELS (+7 more)

## Knowledge Gaps
- **272 isolated node(s):** `backend`, `ResolvedLine`, `RATE_LIMIT`, `sentAtByIp`, `EXTENSIONS` (+267 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `api.ts` to `shell.tsx`, `useGestionAccess`, `auth-form.tsx`, `shell.tsx`, `page.tsx`, `menu-data.ts`, `store.ts`, `client.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `qrcode` connect `landing-data.ts` to `useGestionAccess`, `devDependencies`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `dependencies` connect `devDependencies` to `landing-data.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `backend`, `ResolvedLine`, `RATE_LIMIT` to the rest of the system?**
  _272 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useGestionAccess` be split into smaller, more focused modules?**
  _Cohesion score 0.0648417782954766 - nodes in this community are weakly interconnected._
- **Should `createAdminClient` be split into smaller, more focused modules?**
  _Cohesion score 0.06993006993006994 - nodes in this community are weakly interconnected._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06779661016949153 - nodes in this community are weakly interconnected._
# Graph Report - ominin  (2026-08-10)

## Corpus Check
- 260 files · ~185,479 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1151 nodes · 2847 edges · 68 communities (58 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2994db1c`
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
- [[_COMMUNITY_demo-showcase.tsx|demo-showcase.tsx]]
- [[_COMMUNITY_collect-experience.tsx|collect-experience.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_store.ts|store.ts]]
- [[_COMMUNITY_client.ts|client.ts]]
- [[_COMMUNITY_order-confirmation.tsx|order-confirmation.tsx]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_shell.tsx|shell.tsx]]
- [[_COMMUNITY_auth-form.tsx|auth-form.tsx]]
- [[_COMMUNITY_auth-form.tsx|auth-form.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_Setup guide (written for an LLM agent)|Setup guide (written for an LLM agent)]]
- [[_COMMUNITY_Ominin|Ominin]]
- [[_COMMUNITY_theme-toggle.tsx|theme-toggle.tsx]]
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
- [[_COMMUNITY_shell.tsx|shell.tsx]]
- [[_COMMUNITY_icons.tsx|icons.tsx]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 42 edges
2. `formatPrice()` - 32 edges
3. `useGestionAccess()` - 31 edges
4. `createAdminClient()` - 30 edges
5. `useToast()` - 28 edges
6. `apply()` - 27 edges
7. `useGestion()` - 27 edges
8. `check()` - 21 edges
9. `useClipData()` - 20 edges
10. `requireClipUser()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `createAdminClient()`  [EXTRACTED]
  frontend/app/api/collect/order/route.ts → frontend/lib/supabase/admin.ts
- `CreationComptesPage()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/comptes/creation/page.tsx → frontend/lib/clip/context.tsx
- `GenerateurPage()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/generateur/page.tsx → frontend/lib/clip/context.tsx
- `CollectEtablissementPage()` --calls--> `createClient()`  [EXTRACTED]
  frontend/app/collect/inscription/etablissement/page.tsx → frontend/lib/supabase/server.ts
- `CommandesPage()` --calls--> `hasFeature()`  [INFERRED]
  frontend/app/gestion/commandes/page.tsx → frontend/lib/gestion/permissions.ts

## Import Cycles
- None detected.

## Communities (68 total, 10 thin omitted)

### Community 0 - "useGestionAccess"
Cohesion: 0.19
Nodes (22): ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft(), FormuleFormModal() (+14 more)

### Community 1 - "createAdminClient"
Cohesion: 0.06
Nodes (56): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+48 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.07
Nodes (35): metadata, DemoShowcase(), Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter() (+27 more)

### Community 3 - "api.ts"
Cohesion: 0.10
Nodes (53): addTableToGroup(), apply(), assertTransition(), createCategory(), createFormule(), createGroup(), createItem(), deleteCategory() (+45 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.08
Nodes (30): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter() (+22 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (31): dependencies, @anthropic-ai/sdk, next, next-themes, qrcode, react, react-dom, stripe (+23 more)

### Community 6 - "page.tsx"
Cohesion: 0.14
Nodes (14): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, RefreshIcon(), compact (+6 more)

### Community 7 - "data.ts"
Cohesion: 0.11
Nodes (24): metadata, DemoBanner(), emptySubscribe(), ClipData, ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics() (+16 more)

### Community 8 - "clip-landing-data.ts"
Cohesion: 0.10
Nodes (26): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero(), ClipHowItWorks(), ClipNav() (+18 more)

### Community 9 - "selectors.ts"
Cohesion: 0.15
Nodes (17): AnalytiquePage(), Period, ApercuPage(), ANALYTICS_PERIOD_DAYS, hasFeature(), DayPoint, dayStart(), inProgressOrders() (+9 more)

### Community 10 - "formatPrice"
Cohesion: 0.14
Nodes (18): CheckoutView(), CustomerPane(), DishRow(), MenuView(), TIMELINE, TrackingView(), useNow(), OrderCardDemo() (+10 more)

### Community 11 - "context.tsx"
Cohesion: 0.14
Nodes (20): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), requestLinkUrl() (+12 more)

### Community 12 - "store.ts"
Cohesion: 0.13
Nodes (27): OrderCard(), PaymentDialog(), STATUS_CLASSES, StatusBadge(), ACTION_FEATURE, ACTION_LABELS, COLLECT_ETA_CHOICES_MIN, COLLECT_FEATURES (+19 more)

### Community 13 - "types.ts"
Cohesion: 0.11
Nodes (14): CartLine, buildDemoMenu(), COLLECT_DEMO, DEMO_MENU_CATEGORIES, DemoMenuSection, DemoStep, CollectDemoContext, CollectDemoProvider() (+6 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "MenuItem"
Cohesion: 0.25
Nodes (10): GET(), OrderConfirmation(), STATUS_COPY, CartChoice, CartLinePayload, collectHref(), CollectOrderView, mapsDirectionsHref() (+2 more)

### Community 16 - "page.tsx"
Cohesion: 0.09
Nodes (10): CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, ComptesPage(), ComptesTab, ComptesTabs() (+2 more)

### Community 17 - "types.ts"
Cohesion: 0.23
Nodes (8): POST(), PublierPage(), CaptionEditor(), captionsSchema(), generateCaptions(), ClipUploadInput, CLIP_PLATFORMS, ClipPlatform

### Community 18 - "shell.tsx"
Cohesion: 0.14
Nodes (16): NavItem, ApercuIcon(), ChevronDownIcon(), CommandesIcon(), FormulesIcon(), GearIcon(), IconProps, LogoutIcon() (+8 more)

### Community 19 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 20 - "upload-post.ts"
Cohesion: 0.12
Nodes (14): providerApiKey(), PlatformResult, PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider, ensureProfile(), isClipPlatform() (+6 more)

### Community 21 - "add-to-order.tsx"
Cohesion: 0.18
Nodes (14): AddToOrder(), isUnavailable(), OptionsModal(), CartBar(), PaymentChoice, SubmitState, CartChoice, CartConfig (+6 more)

### Community 22 - "page.tsx"
Cohesion: 0.25
Nodes (17): EquipePage(), EtablissementPage(), FormulesPage(), MenuPage(), OrderGroupCard(), FormuleCard(), EditIcon(), TrashIcon() (+9 more)

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "menu-data.ts"
Cohesion: 0.11
Nodes (16): generateMetadata(), getRestaurant, MenuPage(), CategoryLink, CategoryNav(), DishCard(), FeaturedCard(), Hero() (+8 more)

### Community 25 - "demo-showcase.tsx"
Cohesion: 0.17
Nodes (21): ACTIVE_ORDER_STATUSES, HISTORY_ORDER_STATUSES, assembleGroups(), rowToEtablissement(), rowToOrder(), rowToTable(), Client, fetchOrders() (+13 more)

### Community 26 - "collect-experience.tsx"
Cohesion: 0.24
Nodes (7): cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), SelectedChoice, CollectCheckoutPayload, isItemAvailable()

### Community 27 - "page.tsx"
Cohesion: 0.13
Nodes (20): CommandesPage(), dedupeById(), FilterId, FILTERS, matchesFilter(), ROLES, TeamManager(), EtablissementForm() (+12 more)

### Community 28 - "store.ts"
Cohesion: 0.29
Nodes (13): ClipDataProvider(), fetchApi(), getClientSnapshot(), getErrorSnapshot(), getServerSnapshot(), listeners, load(), notify() (+5 more)

### Community 29 - "client.ts"
Cohesion: 0.09
Nodes (25): CollectSignupForm(), CollectEtablissementPage(), metadata, ProduitsPage(), OnboardingForm(), RESERVED_SLUGS, metadata, OnboardingPage() (+17 more)

### Community 30 - "order-confirmation.tsx"
Cohesion: 0.29
Nodes (8): ConfirmationPage(), metadata, CollectPage(), generateMetadata(), getPage, assembleCategories(), fetchRestaurant(), createPublicClient()

### Community 31 - "layout.tsx"
Cohesion: 0.25
Nodes (6): fraunces, instrumentSans, metadata, viewport, Providers(), seo

### Community 32 - "shell.tsx"
Cohesion: 0.18
Nodes (11): QrPage(), useQrCodes(), TablesPage(), TableGrid(), TableGroupCard(), ConfirmDialog(), Modal(), freeTables() (+3 more)

### Community 33 - "auth-form.tsx"
Cohesion: 0.40
Nodes (3): collectOffer, plans, stripe

### Community 34 - "auth-form.tsx"
Cohesion: 0.13
Nodes (9): metadata, metadata, metadata, metadata, metadata, metadata, AuthForm(), Wordmark() (+1 more)

### Community 35 - "page.tsx"
Cohesion: 0.14
Nodes (8): GenerateurPage(), MOMENTS, STEPS, PublierTab, PublierTabs(), TABS, SubTab, SubTabs()

### Community 36 - "Setup guide (written for an LLM agent)"
Cohesion: 0.17
Nodes (11): 1. Prerequisites, 2. Frontend, 3. Backend, 4. Supabase (database & auth), 5. Graphify (knowledge-graph CLI), 6. Project skills (nothing to install), 7. Final checklist, Ominin (+3 more)

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
Cohesion: 0.25
Nodes (5): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, IphoneFrame(), demoSection

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
Cohesion: 0.26
Nodes (7): PublicationsPage(), PlatformBadge(), PostCard(), STATUS_CLASSES, PLATFORM_LABELS, STATUS_LABELS, ClipPostStatus

### Community 63 - "shell.tsx"
Cohesion: 0.20
Nodes (6): ClipLoader(), NAV_ITEMS, signOut(), ChartIcon(), ProductsIcon(), ToastProvider()

### Community 64 - "icons.tsx"
Cohesion: 0.31
Nodes (6): Dropzone(), formatSize(), CheckIcon(), ListIcon(), UploadIcon(), ACCEPTED_VIDEO_TYPES

## Knowledge Gaps
- **258 isolated node(s):** `backend`, `ResolvedLine`, `EXTENSIONS`, `Product`, `PRODUCTS_BY_CHOICE` (+253 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `api.ts` to `createAdminClient`, `auth-form.tsx`, `shell.tsx`, `add-to-order.tsx`, `demo-showcase.tsx`, `page.tsx`, `store.ts`, `client.ts`, `shell.tsx`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `MenuItem` connect `types.ts` to `useGestionAccess`, `createAdminClient`, `api.ts`, `selectors.ts`, `formatPrice`, `add-to-order.tsx`, `page.tsx`, `menu-data.ts`, `collect-experience.tsx`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `formatPrice()` connect `formatPrice` to `landing-data.ts`, `selectors.ts`, `store.ts`, `MenuItem`, `add-to-order.tsx`, `page.tsx`, `menu-data.ts`, `collect-experience.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `backend`, `ResolvedLine`, `EXTENSIONS` to the rest of the system?**
  _258 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `createAdminClient` be split into smaller, more focused modules?**
  _Cohesion score 0.05742393045069778 - nodes in this community are weakly interconnected._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07315233785822021 - nodes in this community are weakly interconnected._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10056497175141244 - nodes in this community are weakly interconnected._
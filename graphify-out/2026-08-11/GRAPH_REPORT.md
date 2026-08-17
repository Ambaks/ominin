# Graph Report - ominin  (2026-08-10)

## Corpus Check
- 322 files · ~201,893 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1552 nodes · 4099 edges · 81 communities (71 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2d9653a6`
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
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_CollectDemoValue|CollectDemoValue]]
- [[_COMMUNITY_auth-form.tsx|auth-form.tsx]]
- [[_COMMUNITY_proxy.ts|proxy.ts]]
- [[_COMMUNITY_Setup guide (written for an LLM agent)|Setup guide (written for an LLM agent)]]
- [[_COMMUNITY_Ominin|Ominin]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
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
- [[_COMMUNITY_database.types.ts|database.types.ts]]
- [[_COMMUNITY_store.ts|store.ts]]
- [[_COMMUNITY_server.ts|server.ts]]
- [[_COMMUNITY_useAdmin|useAdmin]]
- [[_COMMUNITY_filter-bar.tsx|filter-bar.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_store.ts|store.ts]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_add-to-order.tsx|add-to-order.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_createClient|createClient]]
- [[_COMMUNITY_public-menu.ts|public-menu.ts]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_collectOffer|collectOffer]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_eslint.config.mjs|eslint.config.mjs]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 71 edges
2. `useToast()` - 45 edges
3. `must()` - 33 edges
4. `formatPrice()` - 32 edges
5. `createAdminClient()` - 32 edges
6. `useAdmin()` - 31 edges
7. `useGestionAccess()` - 31 edges
8. `apply()` - 28 edges
9. `useGestion()` - 27 edges
10. `check()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `createAdminClient()`  [EXTRACTED]
  frontend/app/api/collect/order/route.ts → frontend/lib/supabase/admin.ts
- `CreationComptesPage()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/comptes/creation/page.tsx → frontend/lib/clip/context.tsx
- `CollectEtablissementPage()` --calls--> `createClient()`  [EXTRACTED]
  frontend/app/collect/inscription/etablissement/page.tsx → frontend/lib/supabase/server.ts
- `AnalytiquePage()` --calls--> `hasFeature()`  [INFERRED]
  frontend/app/menu/gestion/analytique/page.tsx → frontend/lib/gestion/permissions.ts
- `ApercuPage()` --calls--> `hasFeature()`  [INFERRED]
  frontend/app/menu/gestion/page.tsx → frontend/lib/gestion/permissions.ts

## Import Cycles
- None detected.

## Communities (81 total, 10 thin omitted)

### Community 0 - "useGestionAccess"
Cohesion: 0.19
Nodes (21): ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft(), FormuleFormModal() (+13 more)

### Community 1 - "createAdminClient"
Cohesion: 0.19
Nodes (16): POST(), POST(), ResolvedLine, resolveOptions(), OrderLine, POST(), POST(), parseProducts() (+8 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.08
Nodes (33): metadata, Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter(), LandingNav() (+25 more)

### Community 3 - "api.ts"
Cohesion: 0.05
Nodes (111): ActivityInput, addActivity(), apply(), AppointmentInput, availableSlug(), completeTask(), createAppointment(), createRestaurant() (+103 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.09
Nodes (26): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter() (+18 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (33): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+25 more)

### Community 6 - "page.tsx"
Cohesion: 0.08
Nodes (20): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, GenerateurPage(), MOMENTS (+12 more)

### Community 7 - "data.ts"
Cohesion: 0.11
Nodes (24): metadata, DemoBanner(), emptySubscribe(), ClipData, ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics() (+16 more)

### Community 8 - "clip-landing-data.ts"
Cohesion: 0.09
Nodes (30): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero(), ClipHowItWorks(), ClipNav() (+22 more)

### Community 9 - "selectors.ts"
Cohesion: 0.09
Nodes (28): MapLeadCard(), statusColorExpression, Viewport, StatusMenu(), ALL_COLUMNS, LeadCard(), PipelineBoard(), DragState (+20 more)

### Community 10 - "formatPrice"
Cohesion: 0.13
Nodes (19): CheckoutView(), CustomerPane(), DishRow(), MenuView(), TIMELINE, TrackingView(), useNow(), OrderCardDemo() (+11 more)

### Community 11 - "context.tsx"
Cohesion: 0.15
Nodes (17): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), requestLinkUrl() (+9 more)

### Community 12 - "store.ts"
Cohesion: 0.15
Nodes (17): POST(), PublierPage(), CaptionEditor(), PlatformBadge(), PostCard(), STATUS_CLASSES, captionsSchema(), generateCaptions() (+9 more)

### Community 13 - "types.ts"
Cohesion: 0.10
Nodes (14): CartLine, buildDemoMenu(), COLLECT_DEMO, DEMO_MENU_CATEGORIES, DemoMenuSection, DemoStep, CollectDemoContext, CollectDemoState (+6 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "MenuItem"
Cohesion: 0.15
Nodes (17): AnalytiquePage(), Period, ApercuPage(), StatCard(), ANALYTICS_PERIOD_DAYS, DayPoint, dayStart(), inProgressOrders() (+9 more)

### Community 16 - "page.tsx"
Cohesion: 0.09
Nodes (9): CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, ComptesPage(), ComptesTab, ComptesTabs() (+1 more)

### Community 17 - "types.ts"
Cohesion: 0.15
Nodes (17): ProduitsPage(), CheckIcon(), ExternalLinkIcon(), SubscriptionGate(), DiscoverLink(), Pill(), ProductCard(), startCheckout() (+9 more)

### Community 18 - "shell.tsx"
Cohesion: 0.16
Nodes (12): ApercuIcon(), ChevronDownIcon(), CommandesIcon(), FormulesIcon(), GearIcon(), MenuIcon(), QrIcon(), TablesIcon() (+4 more)

### Community 19 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 20 - "upload-post.ts"
Cohesion: 0.13
Nodes (13): providerApiKey(), PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider, ensureProfile(), isClipPlatform(), listConnectedAccounts() (+5 more)

### Community 21 - "add-to-order.tsx"
Cohesion: 0.12
Nodes (16): DishCard(), FeaturedCard(), MenuSection(), ItemInput, seed(), GestionState, OrderItem, Badge (+8 more)

### Community 22 - "page.tsx"
Cohesion: 0.09
Nodes (30): PublicationsPage(), dedupeById(), FilterId, FILTERS, matchesFilter(), ROLES, TeamManager(), EtablissementForm() (+22 more)

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "menu-data.ts"
Cohesion: 0.18
Nodes (23): CommandesPage(), EquipePage(), EtablissementPage(), FormulesPage(), MenuPage(), TablesPage(), OrderGroupCard(), FormuleCard() (+15 more)

### Community 25 - "icons.tsx"
Cohesion: 0.11
Nodes (18): NavItem, Dropzone(), formatSize(), CheckIcon(), LinkIcon(), ListIcon(), RefreshIcon(), UploadIcon() (+10 more)

### Community 26 - "collect-experience.tsx"
Cohesion: 0.15
Nodes (13): generateMetadata(), getRestaurant, MenuPage(), cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), SelectedChoice (+5 more)

### Community 27 - "page.tsx"
Cohesion: 0.33
Nodes (3): CategoryLink, CategoryNav(), ThemeToggle()

### Community 28 - "store.ts"
Cohesion: 0.27
Nodes (14): ClipDataProvider(), commit(), fetchApi(), getClientSnapshot(), getErrorSnapshot(), getServerSnapshot(), listeners, load() (+6 more)

### Community 29 - "client.ts"
Cohesion: 0.09
Nodes (35): OnboardingForm(), RESERVED_SLUGS, metadata, OnboardingPage(), OrderCard(), PaymentDialog(), STATUS_CLASSES, StatusBadge() (+27 more)

### Community 30 - "order-confirmation.tsx"
Cohesion: 0.28
Nodes (9): GET(), OrderConfirmation(), STATUS_COPY, CartChoice, collectHref(), CollectOrderView, mapsDirectionsHref(), OrderItemOption (+1 more)

### Community 31 - "layout.tsx"
Cohesion: 0.07
Nodes (43): fraunces, instrumentSans, metadata, viewport, metadata, MENU_PATHS, Providers(), PRIVATE_PATHS (+35 more)

### Community 32 - "route.ts"
Cohesion: 0.23
Nodes (12): invalid(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, CONTACT_LIMITS, ContactField (+4 more)

### Community 33 - "CollectDemoValue"
Cohesion: 0.10
Nodes (28): ArrowRightIcon(), CalendarIcon(), ChevronLeftIcon(), ClockIcon(), CrosshairIcon(), GlobeIcon(), MailIcon(), MapPinIcon() (+20 more)

### Community 34 - "auth-form.tsx"
Cohesion: 0.10
Nodes (11): metadata, metadata, metadata, metadata, metadata, metadata, metadata, AuthForm() (+3 more)

### Community 35 - "proxy.ts"
Cohesion: 0.33
Nodes (5): config, matchesPath(), ProductConfig, PRODUCTS, proxy()

### Community 36 - "Setup guide (written for an LLM agent)"
Cohesion: 0.11
Nodes (16): 1. Prerequisites, 2. Frontend, 3. Backend, 4. Supabase (database & auth), 5. Graphify (knowledge-graph CLI), 6. Project skills (nothing to install), 7. Final checklist, Ominin (+8 more)

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
Cohesion: 0.18
Nodes (8): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, DemoShowcase(), IphoneFrame(), QrCorners(), demoSection, demoSection

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
Cohesion: 0.13
Nodes (29): ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, StatCard(), TaskRowItem() (+21 more)

### Community 64 - "database.types.ts"
Cohesion: 0.09
Nodes (22): Product, PRODUCTS_BY_CHOICE, CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums (+14 more)

### Community 65 - "store.ts"
Cohesion: 0.18
Nodes (22): assembleCategories(), assembleGroups(), OrderRow, rowToEtablissement(), rowToFormule(), rowToOrder(), rowToTable(), Client (+14 more)

### Community 67 - "server.ts"
Cohesion: 0.29
Nodes (12): GET(), GET(), POST(), GET(), POST(), GET(), POST(), uploadPostProvider (+4 more)

### Community 68 - "useAdmin"
Cohesion: 0.16
Nodes (18): CartePage(), RestaurantsPage(), TachesPage(), AppointmentFormModal(), RestaurantPicker(), TaskFormModal(), APPOINTMENT_DURATIONS_MIN, APPOINTMENT_TYPE_LABELS (+10 more)

### Community 69 - "filter-bar.tsx"
Cohesion: 0.15
Nodes (17): FilterBar(), FilterIcon(), SearchIcon(), NO_CONTACT_OPTIONS, countActiveFilters(), emptyFilters(), filterLeads(), filters (+9 more)

### Community 70 - "page.tsx"
Cohesion: 0.18
Nodes (14): MapCanvas, FollowUpChoice, VisitedFlow(), FOLLOW_UP_QUICK_OPTIONS, fromDatetimeLocalValue(), capturePosition(), getSnapshot(), isWatching() (+6 more)

### Community 71 - "store.ts"
Cohesion: 0.22
Nodes (15): metadata, AdminShell(), fetchAll(), fetchLeads(), fetchOpenTasks(), fetchUpcomingAppointments(), getErrorSnapshot(), listeners (+7 more)

### Community 72 - "page.tsx"
Cohesion: 0.16
Nodes (13): COLUMNS, exportColumns(), PlusIcon(), CreateRestaurantModal(), DUPLICATE_REASON_LABELS, Modal(), CATEGORY_LABELS, countOutsideQuotes() (+5 more)

### Community 73 - "add-to-order.tsx"
Cohesion: 0.18
Nodes (14): AddToOrder(), isUnavailable(), OptionsModal(), CartBar(), PaymentChoice, SubmitState, CartChoice, CartConfig (+6 more)

### Community 74 - "page.tsx"
Cohesion: 0.17
Nodes (9): Analysis, ImportPage(), ParsedRow, Phase, RowStatus, STATUS_META, ImportIcon(), CATEGORY_ALIASES (+1 more)

### Community 75 - "createClient"
Cohesion: 0.24
Nodes (8): EXTENSIONS, POST(), POST(), GET(), ClipEspaceLayout(), metadata, ClipShell(), createClient()

### Community 76 - "public-menu.ts"
Cohesion: 0.31
Nodes (7): ConfirmationPage(), metadata, CollectPage(), generateMetadata(), getPage, fetchRestaurant(), createPublicClient()

### Community 77 - "route.ts"
Cohesion: 0.60
Nodes (5): AccountRow, GET(), paymentAccounts(), POST(), requireGerant()

### Community 78 - "collectOffer"
Cohesion: 0.40
Nodes (3): collectOffer, plans, stripe

### Community 79 - "page.tsx"
Cohesion: 0.50
Nodes (3): CollectSignupForm(), CollectEtablissementPage(), metadata

## Knowledge Gaps
- **323 isolated node(s):** `backend`, `MapCanvas`, `RowStatus`, `ParsedRow`, `Analysis` (+318 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `api.ts` to `CollectDemoValue`, `auth-form.tsx`, `store.ts`, `store.ts`, `add-to-order.tsx`, `types.ts`, `shell.tsx`, `page.tsx`, `constants.ts`, `icons.tsx`, `store.ts`, `client.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `Field()` connect `page.tsx` to `useGestionAccess`, `auth-form.tsx`, `useAdmin`, `page.tsx`, `page.tsx`, `store.ts`, `types.ts`, `collect-experience.tsx`, `client.ts`, `layout.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `Database` connect `database.types.ts` to `store.ts`, `createAdminClient`, `api.ts`, `server.ts`, `store.ts`, `public-menu.ts`, `add-to-order.tsx`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `must()` (e.g. with `load()` and `load()`) actually correct?**
  _`must()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `backend`, `MapCanvas`, `RowStatus` to the rest of the system?**
  _323 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07712765957446809 - nodes in this community are weakly interconnected._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05109677419354839 - nodes in this community are weakly interconnected._
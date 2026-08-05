# Graph Report - ominin  (2026-08-06)

## Corpus Check
- 242 files · ~178,913 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1091 nodes · 2670 edges · 63 communities (54 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d8c23bd7`
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
- [[_COMMUNITY_section-heading.tsx|section-heading.tsx]]
- [[_COMMUNITY_store.ts|store.ts]]
- [[_COMMUNITY_client.ts|client.ts]]
- [[_COMMUNITY_order-confirmation.tsx|order-confirmation.tsx]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_shell.tsx|shell.tsx]]
- [[_COMMUNITY_order-card.tsx|order-card.tsx]]
- [[_COMMUNITY_nav.tsx|nav.tsx]]
- [[_COMMUNITY_Setup guide (written for an LLM agent)|Setup guide (written for an LLM agent)]]
- [[_COMMUNITY_Ominin|Ominin]]
- [[_COMMUNITY_icons.tsx|icons.tsx]]
- [[_COMMUNITY_What you must do when invoked|What you must do when invoked]]
- [[_COMMUNITY_seed-demo.ts|seed-demo.ts]]
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
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_extraction-spec|extraction-spec.md]]
- [[_COMMUNITY_AGENTS|AGENTS.md]]
- [[_COMMUNITY_postcss.config.mjs|postcss.config.mjs]]
- [[_COMMUNITY_backend|backend]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 41 edges
2. `formatPrice()` - 32 edges
3. `useGestionAccess()` - 30 edges
4. `createAdminClient()` - 30 edges
5. `useToast()` - 28 edges
6. `apply()` - 27 edges
7. `useGestion()` - 25 edges
8. `check()` - 21 edges
9. `useClipData()` - 20 edges
10. `requireClipUser()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `GenerateurPage()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/generateur/page.tsx → frontend/lib/clip/context.tsx
- `AnalytiquePage()` --calls--> `hasFeature()`  [INFERRED]
  frontend/app/gestion/analytique/page.tsx → frontend/lib/gestion/permissions.ts
- `ApercuPage()` --calls--> `hasFeature()`  [INFERRED]
  frontend/app/gestion/page.tsx → frontend/lib/gestion/permissions.ts
- `signOut()` --calls--> `createClient()`  [EXTRACTED]
  frontend/components/clip/espace/shell.tsx → frontend/lib/supabase/client.ts
- `signOut()` --calls--> `createClient()`  [EXTRACTED]
  frontend/components/gestion/shell.tsx → frontend/lib/supabase/client.ts

## Import Cycles
- None detected.

## Communities (63 total, 9 thin omitted)

### Community 0 - "useGestionAccess"
Cohesion: 0.06
Nodes (72): CommandesPage(), dedupeById(), FilterId, FILTERS, matchesFilter(), EquipePage(), ROLES, TeamManager() (+64 more)

### Community 1 - "createAdminClient"
Cohesion: 0.06
Nodes (63): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+55 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.08
Nodes (31): metadata, DemoShowcase(), FinalCta(), Hero(), LandingFooter(), LandingNav(), Pricing(), Proof() (+23 more)

### Community 3 - "api.ts"
Cohesion: 0.14
Nodes (43): addTableToGroup(), apply(), assertTransition(), createCategory(), createFormule(), createGroup(), createItem(), deleteCategory() (+35 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.09
Nodes (26): metadata, CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter(), CollectHero(), CollectHowItWorks(), CollectNav() (+18 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (31): dependencies, @anthropic-ai/sdk, next, next-themes, qrcode, react, react-dom, stripe (+23 more)

### Community 6 - "page.tsx"
Cohesion: 0.10
Nodes (20): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, CreationComptesPage(), PublicationsPage() (+12 more)

### Community 7 - "data.ts"
Cohesion: 0.11
Nodes (24): metadata, DemoBanner(), emptySubscribe(), ClipData, ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics() (+16 more)

### Community 8 - "clip-landing-data.ts"
Cohesion: 0.13
Nodes (19): metadata, ClipFaq(), ClipFinalCta(), ClipHero(), ClipHowItWorks(), ClipPricing(), PriceCard(), BAR_WIDTHS (+11 more)

### Community 9 - "selectors.ts"
Cohesion: 0.15
Nodes (17): AnalytiquePage(), Period, ApercuPage(), StatCard(), ANALYTICS_PERIOD_DAYS, DayPoint, dayStart(), inProgressOrders() (+9 more)

### Community 10 - "formatPrice"
Cohesion: 0.15
Nodes (18): CheckoutView(), CustomerPane(), DishRow(), MenuView(), TIMELINE, TrackingView(), useNow(), OrderCardDemo() (+10 more)

### Community 11 - "context.tsx"
Cohesion: 0.15
Nodes (18): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), requestLinkUrl() (+10 more)

### Community 12 - "store.ts"
Cohesion: 0.15
Nodes (25): ACTIVE_ORDER_STATUSES, HISTORY_ORDER_STATUSES, assembleCategories(), assembleGroups(), OrderRow, rowToEtablissement(), rowToFormule(), rowToOrder() (+17 more)

### Community 13 - "types.ts"
Cohesion: 0.18
Nodes (19): RESERVED_SLUGS, STATUS_CLASSES, StatusBadge(), EXCLUDED_STATUSES, OFFRE_FEATURES, OFFRE_LABELS, ORDER_STATUS_FLOW, ORDER_STATUS_LABELS (+11 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "MenuItem"
Cohesion: 0.11
Nodes (13): CartLine, buildDemoMenu(), COLLECT_DEMO, DEMO_MENU_ITEM_IDS, DemoStep, CollectDemoContext, CollectDemoProvider(), CollectDemoState (+5 more)

### Community 16 - "page.tsx"
Cohesion: 0.09
Nodes (8): FLEET, PILLARS, STEPS, WEEK, ComptesPage(), ComptesTab, ComptesTabs(), TABS

### Community 17 - "types.ts"
Cohesion: 0.18
Nodes (11): POST(), PublierPage(), CaptionEditor(), captionsSchema(), generateCaptions(), ClipUploadInput, CaptionSet, CLIP_PLATFORMS (+3 more)

### Community 18 - "shell.tsx"
Cohesion: 0.15
Nodes (15): ApercuIcon(), ChartIcon(), ChevronDownIcon(), CommandesIcon(), ExternalLinkIcon(), FormulesIcon(), GearIcon(), LogoutIcon() (+7 more)

### Community 19 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 20 - "upload-post.ts"
Cohesion: 0.13
Nodes (13): providerApiKey(), PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider, ensureProfile(), isClipPlatform(), listConnectedAccounts() (+5 more)

### Community 21 - "add-to-order.tsx"
Cohesion: 0.18
Nodes (14): AddToOrder(), isUnavailable(), OptionsModal(), CartBar(), PaymentChoice, SubmitState, CartChoice, CartConfig (+6 more)

### Community 22 - "page.tsx"
Cohesion: 0.14
Nodes (8): GenerateurPage(), MOMENTS, STEPS, PublierTab, PublierTabs(), TABS, SubTab, SubTabs()

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "menu-data.ts"
Cohesion: 0.16
Nodes (8): DishCard(), FeaturedCard(), MenuSection(), BADGE_LABELS, OptionChoice, restaurants, trattoriaLucia, unsplash()

### Community 25 - "demo-showcase.tsx"
Cohesion: 0.26
Nodes (9): metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), demoSection, collectDemoHref(), collectLandingHref(), emptySubscribe() (+1 more)

### Community 26 - "collect-experience.tsx"
Cohesion: 0.21
Nodes (9): CollectPage(), generateMetadata(), getPage, cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), SelectedChoice (+1 more)

### Community 27 - "section-heading.tsx"
Cohesion: 0.19
Nodes (9): ClipFeatures(), Faq(), Features(), HowItWorks(), SectionHeading(), featuresSection, faqSection, featuresSection (+1 more)

### Community 28 - "store.ts"
Cohesion: 0.29
Nodes (13): ClipDataProvider(), fetchApi(), getClientSnapshot(), getErrorSnapshot(), getServerSnapshot(), listeners, load(), notify() (+5 more)

### Community 29 - "client.ts"
Cohesion: 0.18
Nodes (3): metadata, metadata, AuthForm()

### Community 30 - "order-confirmation.tsx"
Cohesion: 0.24
Nodes (8): ConfirmationPage(), metadata, OrderConfirmation(), STATUS_COPY, collectHref(), mapsDirectionsHref(), fetchRestaurant(), createPublicClient()

### Community 31 - "layout.tsx"
Cohesion: 0.19
Nodes (7): fraunces, instrumentSans, metadata, viewport, Providers(), seo, siteUrl

### Community 32 - "page.tsx"
Cohesion: 0.23
Nodes (9): generateMetadata(), getRestaurant, MenuPage(), CategoryLink, CategoryNav(), Hero(), LANGUAGES, MenuFooter() (+1 more)

### Community 33 - "shell.tsx"
Cohesion: 0.18
Nodes (7): NAV_ITEMS, NavItem, signOut(), IconProps, NavItem, ThemeToggle(), ToastProvider()

### Community 34 - "order-card.tsx"
Cohesion: 0.27
Nodes (8): OrderCard(), PaymentDialog(), COLLECT_ETA_CHOICES_MIN, ORDER_ACTION_LABELS, PAYMENT_MODE_LABELS, nextStatuses(), orderTotal(), Order

### Community 35 - "nav.tsx"
Cohesion: 0.24
Nodes (6): ClipLoader(), ClipFooter(), ClipNav(), ClipWordmark(), footer, nav

### Community 36 - "Setup guide (written for an LLM agent)"
Cohesion: 0.17
Nodes (11): 1. Prerequisites, 2. Frontend, 3. Backend, 4. Supabase (database & auth), 5. Graphify (knowledge-graph CLI), 6. Project skills (nothing to install), 7. Final checklist, Ominin (+3 more)

### Community 37 - "Ominin"
Cohesion: 0.18
Nodes (10): Business constraints, Code quality, Commands, Conventions, graphify, Ominin, Repo structure, Stack (+2 more)

### Community 38 - "icons.tsx"
Cohesion: 0.24
Nodes (8): Dropzone(), formatSize(), CheckIcon(), LinkIcon(), ListIcon(), RefreshIcon(), UploadIcon(), ACCEPTED_VIDEO_TYPES

### Community 39 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): /commit, Execution requirement, Step 1 — Understand what changed, Step 2 — Project upkeep (required before every push), Step 3 — Safety checks, Step 4 — Write the commit message, Step 5 — Commit and push, Step 6 — Report back (+1 more)

### Community 40 - "seed-demo.ts"
Cohesion: 0.31
Nodes (7): seed(), GestionState, OrderItem, getRestaurant(), MenuCategory, db, main()

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

## Knowledge Gaps
- **252 isolated node(s):** `backend`, `ResolvedLine`, `EXTENSIONS`, `Product`, `PRODUCTS_BY_CHOICE` (+247 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `api.ts` to `useGestionAccess`, `shell.tsx`, `store.ts`, `types.ts`, `shell.tsx`, `add-to-order.tsx`, `store.ts`, `client.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `ThemeToggle()` connect `shell.tsx` to `page.tsx`, `landing-data.ts`, `nav.tsx`, `collect-landing-data.ts`, `shell.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `useClipData()` connect `page.tsx` to `createAdminClient`, `shell.tsx`, `context.tsx`, `page.tsx`, `types.ts`, `page.tsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `backend`, `ResolvedLine`, `EXTENSIONS` to the rest of the system?**
  _252 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useGestionAccess` be split into smaller, more focused modules?**
  _Cohesion score 0.06118811881188119 - nodes in this community are weakly interconnected._
- **Should `createAdminClient` be split into smaller, more focused modules?**
  _Cohesion score 0.055043859649122805 - nodes in this community are weakly interconnected._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0786308973172988 - nodes in this community are weakly interconnected._
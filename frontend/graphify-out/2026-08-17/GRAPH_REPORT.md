# Graph Report - frontend  (2026-08-17)

## Corpus Check
- 284 files · ~124,611 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1443 nodes · 4051 edges · 53 communities (51 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 85 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cb3550f5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_createAdminClient|createAdminClient]]
- [[_COMMUNITY_shell.tsx|shell.tsx]]
- [[_COMMUNITY_api.ts|api.ts]]
- [[_COMMUNITY_landing-data.ts|landing-data.ts]]
- [[_COMMUNITY_clip-landing-data.ts|clip-landing-data.ts]]
- [[_COMMUNITY_collect-landing-data.ts|collect-landing-data.ts]]
- [[_COMMUNITY_formule-form-modal.tsx|formule-form-modal.tsx]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_store.ts|store.ts]]
- [[_COMMUNITY_api.ts|api.ts]]
- [[_COMMUNITY_useToast|useToast]]
- [[_COMMUNITY_types.ts|types.ts]]
- [[_COMMUNITY_selectors.ts|selectors.ts]]
- [[_COMMUNITY_useGestionAccess|useGestionAccess]]
- [[_COMMUNITY_data.ts|data.ts]]
- [[_COMMUNITY_customer-pane.tsx|customer-pane.tsx]]
- [[_COMMUNITY_upload-post.ts|upload-post.ts]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_menu-data.ts|menu-data.ts]]
- [[_COMMUNITY_add-to-order.tsx|add-to-order.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_types.ts|types.ts]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_demo-showcase.tsx|demo-showcase.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_constants.ts|constants.ts]]
- [[_COMMUNITY_provider.tsx|provider.tsx]]
- [[_COMMUNITY_formatPrice|formatPrice]]
- [[_COMMUNITY_shared.ts|shared.ts]]
- [[_COMMUNITY_order-card.tsx|order-card.tsx]]
- [[_COMMUNITY_public-menu.ts|public-menu.ts]]
- [[_COMMUNITY_CollectDemoValue|CollectDemoValue]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_stage.tsx|stage.tsx]]
- [[_COMMUNITY_seed-demo.ts|seed-demo.ts]]
- [[_COMMUNITY_Verifying the Ominin frontend|Verifying the Ominin frontend]]
- [[_COMMUNITY_comparison.tsx|comparison.tsx]]
- [[_COMMUNITY_next.config.ts|next.config.ts]]
- [[_COMMUNITY_README|README.md]]
- [[_COMMUNITY_AGENTS|AGENTS.md]]
- [[_COMMUNITY_loading.tsx|loading.tsx]]
- [[_COMMUNITY_postcss.config.mjs|postcss.config.mjs]]
- [[_COMMUNITY_format.ts|format.ts]]
- [[_COMMUNITY_server.ts|server.ts]]
- [[_COMMUNITY_lead-cache.ts|lead-cache.ts]]
- [[_COMMUNITY_filter-bar.tsx|filter-bar.tsx]]
- [[_COMMUNITY_must|must]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 71 edges
2. `useToast()` - 45 edges
3. `must()` - 35 edges
4. `formatPrice()` - 32 edges
5. `createAdminClient()` - 32 edges
6. `useAdmin()` - 31 edges
7. `useGestionAccess()` - 31 edges
8. `apply()` - 28 edges
9. `useGestion()` - 27 edges
10. `check()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `createAdminClient()`  [EXTRACTED]
  app/api/collect/order/route.ts → lib/supabase/admin.ts
- `CreationComptesPage()` --calls--> `useClipData()`  [EXTRACTED]
  app/clip/espace/comptes/creation/page.tsx → lib/clip/context.tsx
- `GenerateurPage()` --calls--> `useClipData()`  [EXTRACTED]
  app/clip/espace/generateur/page.tsx → lib/clip/context.tsx
- `ClipEspaceLayout()` --calls--> `createClient()`  [EXTRACTED]
  app/clip/espace/layout.tsx → lib/supabase/server.ts
- `CollectEtablissementPage()` --calls--> `createClient()`  [EXTRACTED]
  app/collect/inscription/etablissement/page.tsx → lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (53 total, 2 thin omitted)

### Community 0 - "createAdminClient"
Cohesion: 0.06
Nodes (65): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+57 more)

### Community 1 - "shell.tsx"
Cohesion: 0.20
Nodes (20): assembleCategories(), assembleGroups(), OrderRow, rowToEtablissement(), rowToFormule(), rowToOrder(), rowToTable(), Client (+12 more)

### Community 2 - "api.ts"
Cohesion: 0.08
Nodes (62): availableSlug(), createRestaurant(), findDuplicates(), updateImportantNotes(), addTableToGroup(), apply(), assertTransition(), createCategory() (+54 more)

### Community 3 - "landing-data.ts"
Cohesion: 0.08
Nodes (34): metadata, DemoShowcase(), Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter() (+26 more)

### Community 4 - "clip-landing-data.ts"
Cohesion: 0.09
Nodes (28): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero(), ClipHowItWorks(), ClipNav() (+20 more)

### Community 5 - "collect-landing-data.ts"
Cohesion: 0.10
Nodes (22): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectHero() (+14 more)

### Community 6 - "formule-form-modal.tsx"
Cohesion: 0.06
Nodes (75): CommandesPage(), dedupeById(), FilterId, FILTERS, matchesFilter(), EquipePage(), ROLES, TeamManager() (+67 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (37): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+29 more)

### Community 8 - "page.tsx"
Cohesion: 0.09
Nodes (9): CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, ComptesPage(), ComptesTab, ComptesTabs() (+1 more)

### Community 9 - "store.ts"
Cohesion: 0.06
Nodes (32): metadata, NavItem, Dropzone(), formatSize(), CheckIcon(), LinkIcon(), ListIcon(), RefreshIcon() (+24 more)

### Community 10 - "api.ts"
Cohesion: 0.27
Nodes (14): ClipDataProvider(), commit(), fetchApi(), getClientSnapshot(), getErrorSnapshot(), getServerSnapshot(), listeners, load() (+6 more)

### Community 11 - "useToast"
Cohesion: 0.14
Nodes (8): GenerateurPage(), MOMENTS, STEPS, PublierTab, PublierTabs(), TABS, SubTab, SubTabs()

### Community 12 - "types.ts"
Cohesion: 0.22
Nodes (15): ACTION_FEATURE, ACTION_LABELS, ACTIVE_ORDER_STATUSES, COLLECT_FEATURES, EXCLUDED_STATUSES, HISTORY_ORDER_STATUSES, OFFRE_FEATURES, ORDER_STATUS_FLOW (+7 more)

### Community 13 - "selectors.ts"
Cohesion: 0.15
Nodes (17): AnalytiquePage(), Period, ApercuPage(), StatCard(), ANALYTICS_PERIOD_DAYS, DayPoint, dayStart(), inProgressOrders() (+9 more)

### Community 14 - "useGestionAccess"
Cohesion: 0.29
Nodes (4): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, demoSection

### Community 15 - "data.ts"
Cohesion: 0.11
Nodes (23): metadata, DemoBanner(), emptySubscribe(), ClipData, ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics() (+15 more)

### Community 16 - "customer-pane.tsx"
Cohesion: 0.12
Nodes (21): CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView(), TIMELINE, TrackingView(), useNow() (+13 more)

### Community 17 - "upload-post.ts"
Cohesion: 0.11
Nodes (20): POST(), captionsSchema(), generateCaptions(), providerApiKey(), CLIP_PLATFORMS, ConnectedAccount, PlatformAnalytics, PlatformResult (+12 more)

### Community 18 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 19 - "menu-data.ts"
Cohesion: 0.13
Nodes (13): DishCard(), FeaturedCard(), MenuSection(), ItemInput, Article, Badge, BADGE_LABELS, boho (+5 more)

### Community 22 - "add-to-order.tsx"
Cohesion: 0.18
Nodes (14): AddToOrder(), isUnavailable(), OptionsModal(), CartBar(), PaymentChoice, SubmitState, CartChoice, CartConfig (+6 more)

### Community 23 - "page.tsx"
Cohesion: 0.12
Nodes (15): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, ClipEspaceLayout(), metadata (+7 more)

### Community 24 - "types.ts"
Cohesion: 0.07
Nodes (34): statusColorExpression, Viewport, StatusMenu(), ALL_COLUMNS, PipelineBoard(), DragState, useBoardDrag(), LeadStatusBadge() (+26 more)

### Community 25 - "layout.tsx"
Cohesion: 0.07
Nodes (43): fraunces, instrumentSans, metadata, viewport, metadata, MENU_PATHS, Providers(), PRIVATE_PATHS (+35 more)

### Community 26 - "demo-showcase.tsx"
Cohesion: 0.16
Nodes (13): metadata, BackToLandingLink(), CollectDemoShowcase(), CollectFooter(), CollectNav(), CollectWordmark(), demoSection, footer (+5 more)

### Community 28 - "page.tsx"
Cohesion: 0.23
Nodes (9): generateMetadata(), getRestaurant, MenuPage(), CategoryLink, CategoryNav(), Hero(), LANGUAGES, MenuFooter() (+1 more)

### Community 29 - "constants.ts"
Cohesion: 0.16
Nodes (11): PublierPage(), PublicationsPage(), CaptionEditor(), PlatformBadge(), PostCard(), STATUS_CLASSES, PLATFORM_LABELS, STATUS_LABELS (+3 more)

### Community 30 - "provider.tsx"
Cohesion: 0.08
Nodes (58): ActivityInput, addActivity(), apply(), completeTask(), createAppointment(), createTask(), DuplicateCandidate, ExportRow (+50 more)

### Community 31 - "formatPrice"
Cohesion: 0.21
Nodes (8): CartLine, cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), SelectedChoice, CollectCheckoutPayload, isItemAvailable()

### Community 32 - "shared.ts"
Cohesion: 0.23
Nodes (11): GET(), OrderConfirmation(), STATUS_COPY, DEMO_MENU_SPEC, demoRestaurantInfo, CartChoice, collectHref(), CollectOrderView (+3 more)

### Community 33 - "order-card.tsx"
Cohesion: 0.14
Nodes (17): OrderCard(), PaymentDialog(), STATUS_CLASSES, StatusBadge(), ORDER_ACTION_LABELS, ORDER_STATUS_LABELS, PAYMENT_MODE_LABELS, nextStatuses() (+9 more)

### Community 34 - "public-menu.ts"
Cohesion: 0.31
Nodes (7): ConfirmationPage(), metadata, CollectPage(), generateMetadata(), getPage, fetchRestaurant(), createPublicClient()

### Community 35 - "CollectDemoValue"
Cohesion: 0.09
Nodes (11): COLLECT_DEMO, DemoMenuSection, DemoStep, CollectDemoContext, CollectDemoProvider(), CollectDemoState, CollectDemoValue, DemoOrder (+3 more)

### Community 36 - "page.tsx"
Cohesion: 0.07
Nodes (18): metadata, metadata, metadata, metadata, CollectSignupForm(), CollectEtablissementPage(), metadata, metadata (+10 more)

### Community 37 - "layout.tsx"
Cohesion: 0.13
Nodes (24): ArrowRightIcon(), CalendarIcon(), ChevronLeftIcon(), ClockIcon(), CrosshairIcon(), GlobeIcon(), MailIcon(), MapPinIcon() (+16 more)

### Community 38 - "stage.tsx"
Cohesion: 0.09
Nodes (21): Analysis, ParsedRow, Phase, RowStatus, STATUS_META, COLUMNS, exportColumns(), ImportIcon() (+13 more)

### Community 39 - "seed-demo.ts"
Cohesion: 0.09
Nodes (33): metadata, TachesPage(), PipelineIcon(), TaskIcon(), LeadPanelHost(), RestaurantPicker(), AdminShell(), DESKTOP_ITEMS (+25 more)

### Community 40 - "Verifying the Ominin frontend"
Cohesion: 0.40
Nodes (4): Drive (Playwright), Gotchas, Launch, Verifying the Ominin frontend

### Community 41 - "comparison.tsx"
Cohesion: 0.19
Nodes (14): ProduitsPage(), ExternalLinkIcon(), DiscoverLink(), Pill(), ProductCard(), startCheckout(), ROLE_TAGLINES, allowedActions() (+6 more)

### Community 42 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 43 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 45 - "loading.tsx"
Cohesion: 0.15
Nodes (18): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), requestLinkUrl() (+10 more)

### Community 48 - "format.ts"
Cohesion: 0.11
Nodes (35): ImportPage(), ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, RestaurantsPage(), TabId (+27 more)

### Community 49 - "server.ts"
Cohesion: 0.26
Nodes (9): ClientDemoPage(), generateMetadata(), CollectDemoStage(), buildDemoMenu(), seed(), getRestaurant(), restaurantThemeClass(), db (+1 more)

### Community 50 - "lead-cache.ts"
Cohesion: 0.31
Nodes (6): OnboardingForm(), RESERVED_SLUGS, metadata, OnboardingPage(), OFFRE_LABELS, Offre

### Community 52 - "filter-bar.tsx"
Cohesion: 0.08
Nodes (35): CartePage(), MapCanvas, FilterBar(), FilterIcon(), SearchIcon(), NO_CONTACT_OPTIONS, countActiveFilters(), emptyFilters() (+27 more)

### Community 54 - "must"
Cohesion: 0.50
Nodes (3): QrLive(), QrShowcase(), qrShowcase

## Knowledge Gaps
- **243 isolated node(s):** `MapCanvas`, `RowStatus`, `ParsedRow`, `Analysis`, `Phase` (+238 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `api.ts` to `shell.tsx`, `page.tsx`, `formule-form-modal.tsx`, `seed-demo.ts`, `store.ts`, `api.ts`, `format.ts`, `lead-cache.ts`, `add-to-order.tsx`, `provider.tsx`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `useToast()` connect `formule-form-modal.tsx` to `order-card.tsx`, `layout.tsx`, `stage.tsx`, `seed-demo.ts`, `page.tsx`, `format.ts`, `types.ts`, `constants.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `Field()` connect `formule-form-modal.tsx` to `page.tsx`, `seed-demo.ts`, `format.ts`, `lead-cache.ts`, `types.ts`, `layout.tsx`, `constants.ts`, `formatPrice`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `must()` (e.g. with `load()` and `load()`) actually correct?**
  _`must()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MapCanvas`, `RowStatus`, `ParsedRow` to the rest of the system?**
  _243 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `createAdminClient` be split into smaller, more focused modules?**
  _Cohesion score 0.055482456140350876 - nodes in this community are weakly interconnected._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07746478873239436 - nodes in this community are weakly interconnected._
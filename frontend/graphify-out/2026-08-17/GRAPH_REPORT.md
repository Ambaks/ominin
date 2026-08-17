# Graph Report - frontend  (2026-08-17)

## Corpus Check
- 283 files · ~123,912 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1435 nodes · 4024 edges · 61 communities (57 shown, 4 thin omitted)
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
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_context.tsx|context.tsx]]
- [[_COMMUNITY_add-to-order.tsx|add-to-order.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_types.ts|types.ts]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_demo-showcase.tsx|demo-showcase.tsx]]
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
- [[_COMMUNITY_createClient|createClient]]
- [[_COMMUNITY_filter-bar.tsx|filter-bar.tsx]]
- [[_COMMUNITY_database.types.ts|database.types.ts]]
- [[_COMMUNITY_must|must]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_shell.tsx|shell.tsx]]
- [[_COMMUNITY_selectors.ts|selectors.ts]]

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
  app/api/collect/order/route.ts → lib/supabase/admin.ts
- `AnalytiquePage()` --calls--> `useClipData()`  [EXTRACTED]
  app/clip/espace/analytique/page.tsx → lib/clip/context.tsx
- `PostAnalyticsList()` --calls--> `useClipData()`  [EXTRACTED]
  app/clip/espace/analytique/page.tsx → lib/clip/context.tsx
- `ClipEspaceLayout()` --calls--> `createClient()`  [EXTRACTED]
  app/clip/espace/layout.tsx → lib/supabase/server.ts
- `AnalytiquePage()` --calls--> `hasFeature()`  [INFERRED]
  app/menu/gestion/analytique/page.tsx → lib/gestion/permissions.ts

## Import Cycles
- None detected.

## Communities (61 total, 4 thin omitted)

### Community 0 - "createAdminClient"
Cohesion: 0.05
Nodes (67): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+59 more)

### Community 1 - "shell.tsx"
Cohesion: 0.15
Nodes (15): ApercuIcon(), ChartIcon(), CommandesIcon(), ExternalLinkIcon(), FormulesIcon(), GearIcon(), LogoutIcon(), MenuIcon() (+7 more)

### Community 2 - "api.ts"
Cohesion: 0.08
Nodes (69): updateImportantNotes(), addTableToGroup(), apply(), assertTransition(), createCategory(), createFormule(), createGroup(), createItem() (+61 more)

### Community 3 - "landing-data.ts"
Cohesion: 0.08
Nodes (31): metadata, DemoShowcase(), Faq(), Features(), FinalCta(), Hero(), HowItWorks(), IphoneFrame() (+23 more)

### Community 4 - "clip-landing-data.ts"
Cohesion: 0.09
Nodes (30): metadata, ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter() (+22 more)

### Community 5 - "collect-landing-data.ts"
Cohesion: 0.09
Nodes (24): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectHero() (+16 more)

### Community 6 - "formule-form-modal.tsx"
Cohesion: 0.19
Nodes (21): ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft(), FormuleFormModal() (+13 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (36): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+28 more)

### Community 8 - "page.tsx"
Cohesion: 0.06
Nodes (18): CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, ComptesPage(), GenerateurPage(), MOMENTS (+10 more)

### Community 9 - "store.ts"
Cohesion: 0.13
Nodes (15): NavItem, Dropzone(), formatSize(), CheckIcon(), LinkIcon(), ListIcon(), RefreshIcon(), UploadIcon() (+7 more)

### Community 10 - "api.ts"
Cohesion: 0.19
Nodes (17): ClipEspaceLayout(), metadata, ClipShell(), ClipDataProvider(), commit(), fetchApi(), getClientSnapshot(), getErrorSnapshot() (+9 more)

### Community 11 - "useToast"
Cohesion: 0.25
Nodes (11): FormuleCard(), ChevronDownIcon(), EditIcon(), TrashIcon(), CategoryManager(), ConfirmDialog(), ToastApi, ToastContext (+3 more)

### Community 12 - "types.ts"
Cohesion: 0.27
Nodes (13): ACTION_FEATURE, ACTION_LABELS, COLLECT_FEATURES, EXCLUDED_STATUSES, OFFRE_FEATURES, ORDER_STATUS_FLOW, ROLE_ACTIONS, GestionAccess (+5 more)

### Community 13 - "selectors.ts"
Cohesion: 0.17
Nodes (15): AnalytiquePage(), Period, ApercuPage(), DayPoint, dayStart(), inProgressOrders(), lineTotal(), ordersByHour() (+7 more)

### Community 14 - "useGestionAccess"
Cohesion: 0.31
Nodes (14): CommandesPage(), EquipePage(), EtablissementPage(), FormulesPage(), MenuPage(), TablesPage(), OrderGroupCard(), MenuItemCard() (+6 more)

### Community 15 - "data.ts"
Cohesion: 0.11
Nodes (24): metadata, DemoBanner(), emptySubscribe(), ClipData, ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics() (+16 more)

### Community 16 - "customer-pane.tsx"
Cohesion: 0.11
Nodes (23): CustomerPane(), DishRow(), ItineraryButton(), TIMELINE, TrackingView(), useNow(), OrderCardDemo(), RestaurantPane() (+15 more)

### Community 17 - "upload-post.ts"
Cohesion: 0.11
Nodes (18): POST(), captionsSchema(), generateCaptions(), providerApiKey(), CLIP_PLATFORMS, PlatformResult, PostStatus, PostSubmission (+10 more)

### Community 18 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 19 - "menu-data.ts"
Cohesion: 0.13
Nodes (12): DishCard(), MenuSection(), ItemInput, Article, Badge, BADGE_LABELS, boho, OptionChoice (+4 more)

### Community 20 - "page.tsx"
Cohesion: 0.31
Nodes (6): TableGrid(), TableGroupCard(), freeTables(), groupTableNumbers(), Table, TableGroup

### Community 21 - "context.tsx"
Cohesion: 0.16
Nodes (13): dedupeById(), FilterId, FILTERS, matchesFilter(), ROLES, TeamManager(), QrPage(), useQrCodes() (+5 more)

### Community 22 - "add-to-order.tsx"
Cohesion: 0.18
Nodes (14): AddToOrder(), isUnavailable(), OptionsModal(), CartBar(), PaymentChoice, SubmitState, CartChoice, CartConfig (+6 more)

### Community 23 - "page.tsx"
Cohesion: 0.12
Nodes (12): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, compact, LoadedRow (+4 more)

### Community 24 - "types.ts"
Cohesion: 0.08
Nodes (29): statusColorExpression, Viewport, StatusMenu(), ALL_COLUMNS, PipelineBoard(), DragState, useBoardDrag(), LeadStatusBadge() (+21 more)

### Community 25 - "layout.tsx"
Cohesion: 0.07
Nodes (42): fraunces, instrumentSans, metadata, viewport, metadata, MENU_PATHS, Providers(), PRIVATE_PATHS (+34 more)

### Community 26 - "demo-showcase.tsx"
Cohesion: 0.16
Nodes (14): metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), CollectFooter(), CollectNav(), CollectWordmark(), demoSection (+6 more)

### Community 27 - "demo-showcase.tsx"
Cohesion: 0.23
Nodes (11): EtablissementForm(), CreateRestaurantModal(), DUPLICATE_REASON_LABELS, TaskFormModal(), CollectSettings(), ConnectStatus, PaymentSettings(), Field() (+3 more)

### Community 28 - "page.tsx"
Cohesion: 0.23
Nodes (9): generateMetadata(), getRestaurant, MenuPage(), CategoryLink, CategoryNav(), Hero(), LANGUAGES, MenuFooter() (+1 more)

### Community 29 - "constants.ts"
Cohesion: 0.16
Nodes (11): PublierPage(), PublicationsPage(), CaptionEditor(), PlatformBadge(), PostCard(), STATUS_CLASSES, PLATFORM_LABELS, STATUS_LABELS (+3 more)

### Community 30 - "provider.tsx"
Cohesion: 0.07
Nodes (68): ActivityInput, addActivity(), apply(), AppointmentInput, availableSlug(), completeTask(), createAppointment(), createRestaurant() (+60 more)

### Community 31 - "formatPrice"
Cohesion: 0.19
Nodes (11): cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), SelectedChoice, CheckoutView(), MenuView(), FeaturedCard() (+3 more)

### Community 32 - "shared.ts"
Cohesion: 0.16
Nodes (16): GET(), OrderConfirmation(), STATUS_COPY, STATUS_CLASSES, StatusBadge(), CartChoice, CartLinePayload, collectHref() (+8 more)

### Community 33 - "order-card.tsx"
Cohesion: 0.27
Nodes (8): OrderCard(), PaymentDialog(), ORDER_ACTION_LABELS, PAYMENT_MODE_LABELS, nextStatuses(), orderTotal(), Order, PaymentMode

### Community 34 - "public-menu.ts"
Cohesion: 0.29
Nodes (8): ConfirmationPage(), metadata, CollectPage(), generateMetadata(), getPage, assembleCategories(), fetchRestaurant(), createPublicClient()

### Community 35 - "CollectDemoValue"
Cohesion: 0.11
Nodes (9): CartLine, DEMO_MENU_SPEC, DemoMenuSection, demoRestaurantInfo, DemoStep, CollectDemoState, CollectDemoValue, DemoOrder (+1 more)

### Community 36 - "page.tsx"
Cohesion: 0.09
Nodes (13): metadata, metadata, metadata, metadata, metadata, metadata, metadata, AuthForm() (+5 more)

### Community 37 - "layout.tsx"
Cohesion: 0.10
Nodes (28): ArrowRightIcon(), CalendarIcon(), ChevronLeftIcon(), ClockIcon(), CrosshairIcon(), GlobeIcon(), MailIcon(), MapPinIcon() (+20 more)

### Community 38 - "stage.tsx"
Cohesion: 0.09
Nodes (22): Analysis, ImportPage(), ParsedRow, Phase, RowStatus, STATUS_META, COLUMNS, exportColumns() (+14 more)

### Community 39 - "seed-demo.ts"
Cohesion: 0.11
Nodes (30): metadata, TachesPage(), AppointmentFormModal(), RestaurantPicker(), AdminShell(), signOut(), fetchAllSlugs(), importRestaurants() (+22 more)

### Community 40 - "Verifying the Ominin frontend"
Cohesion: 0.40
Nodes (4): Drive (Playwright), Gotchas, Launch, Verifying the Ominin frontend

### Community 41 - "comparison.tsx"
Cohesion: 0.17
Nodes (14): ProduitsPage(), SubscriptionGate(), DiscoverLink(), Pill(), ProductCard(), startCheckout(), ROLE_LABELS, ROLE_TAGLINES (+6 more)

### Community 42 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 43 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 45 - "loading.tsx"
Cohesion: 0.14
Nodes (20): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), requestLinkUrl() (+12 more)

### Community 48 - "format.ts"
Cohesion: 0.13
Nodes (29): ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, MapLeadCard(), PlusIcon() (+21 more)

### Community 49 - "server.ts"
Cohesion: 0.27
Nodes (8): ClientDemoPage(), generateMetadata(), buildDemoMenu(), seed(), getRestaurant(), TablesInsert, db, main()

### Community 50 - "lead-cache.ts"
Cohesion: 0.31
Nodes (6): OnboardingForm(), RESERVED_SLUGS, metadata, OnboardingPage(), OFFRE_LABELS, Offre

### Community 52 - "filter-bar.tsx"
Cohesion: 0.14
Nodes (18): FilterBar(), FilterIcon(), SearchIcon(), CATEGORY_LABELS, NO_CONTACT_OPTIONS, countActiveFilters(), emptyFilters(), filters (+10 more)

### Community 53 - "database.types.ts"
Cohesion: 0.20
Nodes (11): Category, daysAgo(), daysAhead(), db, LeadStatus, main(), Priority, R (+3 more)

### Community 54 - "must"
Cohesion: 0.50
Nodes (3): QrLive(), QrShowcase(), qrShowcase

### Community 55 - "page.tsx"
Cohesion: 0.17
Nodes (18): CartePage(), MapCanvas, FollowUpChoice, VisitedFlow(), MarkVisitedInput, FOLLOW_UP_QUICK_OPTIONS, fromDatetimeLocalValue(), capturePosition() (+10 more)

### Community 56 - "shell.tsx"
Cohesion: 0.40
Nodes (3): pricingSection, plans, stripe

## Knowledge Gaps
- **239 isolated node(s):** `MapCanvas`, `RowStatus`, `ParsedRow`, `Analysis`, `Phase` (+234 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `api.ts` to `shell.tsx`, `page.tsx`, `layout.tsx`, `seed-demo.ts`, `comparison.tsx`, `store.ts`, `api.ts`, `lead-cache.ts`, `context.tsx`, `add-to-order.tsx`, `provider.tsx`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `Field()` connect `demo-showcase.tsx` to `page.tsx`, `formule-form-modal.tsx`, `seed-demo.ts`, `comparison.tsx`, `lead-cache.ts`, `context.tsx`, `page.tsx`, `layout.tsx`, `constants.ts`, `formatPrice`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `useToast()` connect `demo-showcase.tsx` to `order-card.tsx`, `stage.tsx`, `seed-demo.ts`, `page.tsx`, `formule-form-modal.tsx`, `useToast`, `useGestionAccess`, `format.ts`, `page.tsx`, `context.tsx`, `page.tsx`, `constants.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `must()` (e.g. with `load()` and `load()`) actually correct?**
  _`must()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MapCanvas`, `RowStatus`, `ParsedRow` to the rest of the system?**
  _239 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `createAdminClient` be split into smaller, more focused modules?**
  _Cohesion score 0.05171717171717172 - nodes in this community are weakly interconnected._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0758714969241285 - nodes in this community are weakly interconnected._
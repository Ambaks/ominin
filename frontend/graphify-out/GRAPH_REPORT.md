# Graph Report - frontend  (2026-08-17)

## Corpus Check
- 282 files · ~122,888 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1430 nodes · 4005 edges · 64 communities (62 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 85 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2d9653a6`
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
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_nav.tsx|nav.tsx]]
- [[_COMMUNITY_proxy.ts|proxy.ts]]

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
- `GenerateurPage()` --calls--> `useClipData()`  [EXTRACTED]
  app/clip/espace/generateur/page.tsx → lib/clip/context.tsx
- `AnalytiquePage()` --calls--> `hasFeature()`  [INFERRED]
  app/menu/gestion/analytique/page.tsx → lib/gestion/permissions.ts
- `OnboardingPage()` --calls--> `createClient()`  [EXTRACTED]
  app/menu/onboarding/page.tsx → lib/supabase/server.ts
- `sitemap()` --calls--> `createClient()`  [EXTRACTED]
  app/sitemap.ts → lib/supabase/server.ts
- `signOut()` --calls--> `createClient()`  [EXTRACTED]
  components/clip/espace/shell.tsx → lib/supabase/client.ts

## Import Cycles
- 1-file cycle: `lib/clip/server.ts -> lib/clip/server.ts`

## Communities (64 total, 2 thin omitted)

### Community 0 - "createAdminClient"
Cohesion: 0.17
Nodes (20): POST(), POST(), ResolvedLine, resolveOptions(), GET(), AccountRow, GET(), paymentAccounts() (+12 more)

### Community 1 - "shell.tsx"
Cohesion: 0.06
Nodes (34): metadata, NavItem, Dropzone(), formatSize(), CheckIcon(), LinkIcon(), ListIcon(), UploadIcon() (+26 more)

### Community 2 - "api.ts"
Cohesion: 0.16
Nodes (40): addTableToGroup(), apply(), assertTransition(), createCategory(), createFormule(), createGroup(), createItem(), deleteCategory() (+32 more)

### Community 3 - "landing-data.ts"
Cohesion: 0.08
Nodes (33): metadata, DemoShowcase(), Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter() (+25 more)

### Community 4 - "clip-landing-data.ts"
Cohesion: 0.08
Nodes (30): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero(), ClipHowItWorks(), ClipNav() (+22 more)

### Community 5 - "collect-landing-data.ts"
Cohesion: 0.09
Nodes (22): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectHero() (+14 more)

### Community 6 - "formule-form-modal.tsx"
Cohesion: 0.13
Nodes (28): OnboardingForm(), RESERVED_SLUGS, metadata, OnboardingPage(), ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape() (+20 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (36): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+28 more)

### Community 8 - "page.tsx"
Cohesion: 0.08
Nodes (16): AnalytiquePage(), PostAnalyticsList(), CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, ComptesPage() (+8 more)

### Community 9 - "store.ts"
Cohesion: 0.17
Nodes (22): assembleGroups(), rowToEtablissement(), rowToFormule(), rowToOrder(), rowToTable(), Client, commit(), fetchOrderHistory() (+14 more)

### Community 10 - "api.ts"
Cohesion: 0.27
Nodes (14): ClipDataProvider(), commit(), fetchApi(), getClientSnapshot(), getErrorSnapshot(), getServerSnapshot(), listeners, load() (+6 more)

### Community 11 - "useToast"
Cohesion: 0.14
Nodes (21): ROLES, TeamManager(), EtablissementForm(), CreateRestaurantModal(), DUPLICATE_REASON_LABELS, CollectSettings(), FeatureLocked(), FormuleCard() (+13 more)

### Community 12 - "types.ts"
Cohesion: 0.16
Nodes (21): ProduitsPage(), ACTION_FEATURE, ACTION_LABELS, ACTIVE_ORDER_STATUSES, COLLECT_FEATURES, EXCLUDED_STATUSES, HISTORY_ORDER_STATUSES, OFFRE_FEATURES (+13 more)

### Community 13 - "selectors.ts"
Cohesion: 0.16
Nodes (13): AnalytiquePage(), Period, StatCard(), ANALYTICS_PERIOD_DAYS, DayPoint, dayStart(), lineTotal(), ordersByHour() (+5 more)

### Community 14 - "useGestionAccess"
Cohesion: 0.26
Nodes (16): CommandesPage(), EquipePage(), EtablissementPage(), FormulesPage(), MenuPage(), ApercuPage(), TablesPage(), OrderGroupCard() (+8 more)

### Community 15 - "data.ts"
Cohesion: 0.13
Nodes (20): metadata, DemoBanner(), emptySubscribe(), ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics(), buildDemoPosts(), buildDemoState() (+12 more)

### Community 16 - "customer-pane.tsx"
Cohesion: 0.10
Nodes (27): CheckoutView(), CustomerPane(), DishRow(), MenuView(), TIMELINE, TrackingView(), useNow(), OrderCardDemo() (+19 more)

### Community 17 - "upload-post.ts"
Cohesion: 0.12
Nodes (15): providerApiKey(), PlatformAnalytics, PlatformResult, PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider, ensureProfile() (+7 more)

### Community 18 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 19 - "menu-data.ts"
Cohesion: 0.12
Nodes (15): DishCard(), FeaturedCard(), MenuSection(), ItemInput, seed(), OrderItem, Badge, BADGE_LABELS (+7 more)

### Community 20 - "page.tsx"
Cohesion: 0.15
Nodes (16): QrPage(), useQrCodes(), TableGrid(), TableGroupCard(), OrderRow, freeTables(), groupTableNumbers(), Article (+8 more)

### Community 21 - "context.tsx"
Cohesion: 0.22
Nodes (7): POST(), captionsSchema(), generateCaptions(), ClipActions, CaptionSet, ClipPlatform, ClipPost

### Community 22 - "add-to-order.tsx"
Cohesion: 0.18
Nodes (14): AddToOrder(), isUnavailable(), OptionsModal(), CartBar(), PaymentChoice, SubmitState, CartChoice, CartConfig (+6 more)

### Community 23 - "page.tsx"
Cohesion: 0.15
Nodes (10): AnalyticsView, compact, VIEW_SUBTITLES, VIEWS, RefreshIcon(), compact, LoadedRow, METRIC_COLUMNS (+2 more)

### Community 24 - "types.ts"
Cohesion: 0.08
Nodes (33): MapLeadCard(), statusColorExpression, Viewport, StatusMenu(), ALL_COLUMNS, LeadCard(), PipelineBoard(), DragState (+25 more)

### Community 25 - "layout.tsx"
Cohesion: 0.07
Nodes (43): fraunces, instrumentSans, metadata, viewport, metadata, MENU_PATHS, Providers(), PRIVATE_PATHS (+35 more)

### Community 26 - "demo-showcase.tsx"
Cohesion: 0.26
Nodes (9): metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), demoSection, collectDemoHref(), collectLandingHref(), emptySubscribe() (+1 more)

### Community 27 - "demo-showcase.tsx"
Cohesion: 0.25
Nodes (5): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, IphoneFrame(), demoSection

### Community 28 - "page.tsx"
Cohesion: 0.17
Nodes (6): GenerateurPage(), MOMENTS, STEPS, PublierTab, PublierTabs(), TABS

### Community 29 - "constants.ts"
Cohesion: 0.16
Nodes (9): PublicationsPage(), CaptionEditor(), PlatformBadge(), PostCard(), STATUS_CLASSES, PLATFORM_LABELS, STATUS_LABELS, ClipUploadInput (+1 more)

### Community 30 - "provider.tsx"
Cohesion: 0.09
Nodes (37): ActivityInput, AppointmentInput, availableSlug(), DuplicateCandidate, ExportRow, fetchAllSlugs(), findDuplicates(), findLite() (+29 more)

### Community 31 - "formatPrice"
Cohesion: 0.15
Nodes (13): generateMetadata(), getRestaurant, MenuPage(), cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), SelectedChoice (+5 more)

### Community 32 - "shared.ts"
Cohesion: 0.24
Nodes (11): OrderConfirmation(), STATUS_COPY, CartChoice, CartLinePayload, CollectCheckoutPayload, collectHref(), CollectOrderView, mapsDirectionsHref() (+3 more)

### Community 33 - "order-card.tsx"
Cohesion: 0.12
Nodes (19): dedupeById(), FilterId, FILTERS, matchesFilter(), OrderCard(), PaymentDialog(), STATUS_CLASSES, StatusBadge() (+11 more)

### Community 34 - "public-menu.ts"
Cohesion: 0.29
Nodes (8): ConfirmationPage(), metadata, CollectPage(), generateMetadata(), getPage, assembleCategories(), fetchRestaurant(), createPublicClient()

### Community 35 - "CollectDemoValue"
Cohesion: 0.12
Nodes (5): CartLine, DemoMenuSection, CollectDemoValue, DemoOrder, MenuItem

### Community 36 - "page.tsx"
Cohesion: 0.10
Nodes (11): metadata, metadata, metadata, metadata, metadata, metadata, metadata, AuthForm() (+3 more)

### Community 37 - "layout.tsx"
Cohesion: 0.13
Nodes (24): ArrowRightIcon(), CalendarIcon(), ChevronLeftIcon(), ClockIcon(), GlobeIcon(), MailIcon(), MapPinIcon(), NoteIcon() (+16 more)

### Community 38 - "stage.tsx"
Cohesion: 0.10
Nodes (21): Analysis, ImportPage(), ParsedRow, Phase, RowStatus, STATUS_META, COLUMNS, exportColumns() (+13 more)

### Community 39 - "seed-demo.ts"
Cohesion: 0.16
Nodes (23): TachesPage(), RestaurantPicker(), AdminShell(), TaskFormModal(), Modal(), toDatetimeLocalValue(), commit(), fetchAll() (+15 more)

### Community 40 - "Verifying the Ominin frontend"
Cohesion: 0.40
Nodes (4): Drive (Playwright), Gotchas, Launch, Verifying the Ominin frontend

### Community 41 - "comparison.tsx"
Cohesion: 0.13
Nodes (14): CheckIcon(), SubscriptionGate(), DiscoverLink(), Pill(), ProductCard(), startCheckout(), collectOffer, pricingSection (+6 more)

### Community 42 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 43 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 45 - "loading.tsx"
Cohesion: 0.17
Nodes (20): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), requestLinkUrl() (+12 more)

### Community 48 - "format.ts"
Cohesion: 0.20
Nodes (20): dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, PlusIcon(), FollowUpChoice, VisitedFlow() (+12 more)

### Community 49 - "server.ts"
Cohesion: 0.25
Nodes (13): GET(), GET(), POST(), GET(), POST(), GET(), POST(), eslintConfig (+5 more)

### Community 50 - "lead-cache.ts"
Cohesion: 0.13
Nodes (17): fetchAppointments(), fetchExportRows(), cache, errors, fetchDetail(), freshness, LeadDetailState, listeners (+9 more)

### Community 51 - "createClient"
Cohesion: 0.15
Nodes (14): EXTENSIONS, POST(), POST(), Product, PRODUCTS_BY_CHOICE, GET(), ClipEspaceLayout(), metadata (+6 more)

### Community 52 - "filter-bar.tsx"
Cohesion: 0.16
Nodes (16): FilterBar(), FilterIcon(), SearchIcon(), CATEGORY_LABELS, NO_CONTACT_OPTIONS, countActiveFilters(), emptyFilters(), filters (+8 more)

### Community 53 - "database.types.ts"
Cohesion: 0.12
Nodes (18): CompositeTypes, Constants, DatabaseWithoutInternals, DefaultSchema, Enums, TablesInsert, TablesUpdate, Category (+10 more)

### Community 54 - "must"
Cohesion: 0.26
Nodes (19): addActivity(), apply(), completeTask(), createAppointment(), createRestaurant(), createTask(), fetchClosedTasks(), liteFor() (+11 more)

### Community 55 - "page.tsx"
Cohesion: 0.22
Nodes (14): CartePage(), MapCanvas, CrosshairIcon(), useFilteredLeads(), capturePosition(), getSnapshot(), isWatching(), listeners (+6 more)

### Community 56 - "shell.tsx"
Cohesion: 0.13
Nodes (10): metadata, PipelineIcon(), StoreIcon(), TaskIcon(), LeadPanelHost(), DESKTOP_ITEMS, FULL_BLEED_PATHS, NAV_ITEMS (+2 more)

### Community 57 - "selectors.ts"
Cohesion: 0.18
Nodes (11): ApercuPage(), StatCard(), CLOSED_STATUSES, FollowUpBuckets, FunnelStage, LeadSortKey, selectActiveLeadCount(), selectFunnel() (+3 more)

### Community 58 - "route.ts"
Cohesion: 0.23
Nodes (12): invalid(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, CONTACT_LIMITS, ContactField (+4 more)

### Community 59 - "nav.tsx"
Cohesion: 0.36
Nodes (5): CollectFooter(), CollectNav(), CollectWordmark(), footer, nav

### Community 60 - "proxy.ts"
Cohesion: 0.33
Nodes (5): config, matchesPath(), ProductConfig, PRODUCTS, proxy()

## Knowledge Gaps
- **238 isolated node(s):** `MapCanvas`, `RowStatus`, `ParsedRow`, `Analysis`, `Phase` (+233 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `api.ts` to `shell.tsx`, `page.tsx`, `formule-form-modal.tsx`, `seed-demo.ts`, `comparison.tsx`, `api.ts`, `useToast`, `store.ts`, `format.ts`, `lead-cache.ts`, `add-to-order.tsx`, `must`, `shell.tsx`, `provider.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `useToast()` connect `useToast` to `order-card.tsx`, `layout.tsx`, `stage.tsx`, `seed-demo.ts`, `page.tsx`, `formule-form-modal.tsx`, `useGestionAccess`, `format.ts`, `page.tsx`, `constants.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `Field()` connect `formule-form-modal.tsx` to `page.tsx`, `seed-demo.ts`, `comparison.tsx`, `useToast`, `format.ts`, `layout.tsx`, `constants.ts`, `formatPrice`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `must()` (e.g. with `load()` and `load()`) actually correct?**
  _`must()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MapCanvas`, `RowStatus`, `ParsedRow` to the rest of the system?**
  _238 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `shell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06259426847662142 - nodes in this community are weakly interconnected._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07738095238095238 - nodes in this community are weakly interconnected._
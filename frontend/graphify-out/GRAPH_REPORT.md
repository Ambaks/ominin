# Graph Report - frontend  (2026-08-17)

## Corpus Check
- 299 files · ~147,829 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1514 nodes · 4259 edges · 63 communities (60 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 86 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d03a832c`
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
- [[_COMMUNITY_createAdminClient|createAdminClient]]
- [[_COMMUNITY_item-form-modal.tsx|item-form-modal.tsx]]
- [[_COMMUNITY_add-to-order.tsx|add-to-order.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_types.ts|types.ts]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_demo-showcase.tsx|demo-showcase.tsx]]
- [[_COMMUNITY_database.types.ts|database.types.ts]]
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
- [[_COMMUNITY_theme-toggle.tsx|theme-toggle.tsx]]
- [[_COMMUNITY_filter-bar.tsx|filter-bar.tsx]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_must|must]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_wordmark.tsx|wordmark.tsx]]
- [[_COMMUNITY_proxy.ts|proxy.ts]]
- [[_COMMUNITY_collectOffer|collectOffer]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 73 edges
2. `useToast()` - 47 edges
3. `createAdminClient()` - 45 edges
4. `must()` - 35 edges
5. `useGestionAccess()` - 33 edges
6. `formatPrice()` - 32 edges
7. `useAdmin()` - 31 edges
8. `apply()` - 29 edges
9. `useGestion()` - 29 edges
10. `check()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `createAdminClient()`  [EXTRACTED]
  app/api/collect/order/route.ts → lib/supabase/admin.ts
- `CollectEtablissementPage()` --calls--> `createClient()`  [EXTRACTED]
  app/collect/inscription/etablissement/page.tsx → lib/supabase/server.ts
- `InvitationPage()` --calls--> `createClient()`  [EXTRACTED]
  app/invitation/page.tsx → lib/supabase/server.ts
- `CommandesPage()` --calls--> `hasFeature()`  [INFERRED]
  app/menu/gestion/commandes/page.tsx → lib/gestion/permissions.ts
- `TeamManager()` --calls--> `useToast()`  [EXTRACTED]
  app/menu/gestion/equipe/page.tsx → components/ui/toast.tsx

## Import Cycles
- None detected.

## Communities (63 total, 3 thin omitted)

### Community 0 - "createAdminClient"
Cohesion: 0.22
Nodes (15): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+7 more)

### Community 1 - "shell.tsx"
Cohesion: 0.17
Nodes (23): ACTIVE_ORDER_STATUSES, HISTORY_ORDER_STATUSES, assembleCategories(), assembleGroups(), OrderRow, rowToEtablissement(), rowToFormule(), rowToOrder() (+15 more)

### Community 2 - "api.ts"
Cohesion: 0.05
Nodes (94): addActivity(), apply(), availableSlug(), completeTask(), createAppointment(), createRestaurant(), createTask(), fetchAppointments() (+86 more)

### Community 3 - "landing-data.ts"
Cohesion: 0.08
Nodes (31): metadata, Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter(), Pricing() (+23 more)

### Community 4 - "clip-landing-data.ts"
Cohesion: 0.10
Nodes (27): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero(), ClipHowItWorks(), ClipNav() (+19 more)

### Community 5 - "collect-landing-data.ts"
Cohesion: 0.09
Nodes (24): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectHero() (+16 more)

### Community 6 - "formule-form-modal.tsx"
Cohesion: 0.11
Nodes (33): CommandesPage(), dedupeById(), FilterId, FILTERS, matchesFilter(), EquipePage(), ROLES, TeamManager() (+25 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (37): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+29 more)

### Community 8 - "page.tsx"
Cohesion: 0.09
Nodes (9): FLEET, PILLARS, STEPS, WEEK, ComptesPage(), ComptesTab, ComptesTabs(), TABS (+1 more)

### Community 9 - "store.ts"
Cohesion: 0.11
Nodes (22): NavItem, NAV_ITEMS, NavItem, signOut(), ApercuIcon(), ChartIcon(), ChevronDownIcon(), CommandesIcon() (+14 more)

### Community 10 - "api.ts"
Cohesion: 0.29
Nodes (13): ClipDataProvider(), fetchApi(), getClientSnapshot(), getErrorSnapshot(), getServerSnapshot(), listeners, load(), notify() (+5 more)

### Community 11 - "useToast"
Cohesion: 0.12
Nodes (27): ImportPage(), RestaurantsPage(), TachesPage(), FollowUpChoice, VisitedFlow(), AppointmentFormModal(), RestaurantPicker(), CreateRestaurantModal() (+19 more)

### Community 12 - "types.ts"
Cohesion: 0.09
Nodes (35): InvitationForm(), InvitationPage(), EtablissementForm(), OnboardingForm(), RESERVED_SLUGS, metadata, OnboardingPage(), STATUS_CLASSES (+27 more)

### Community 13 - "selectors.ts"
Cohesion: 0.15
Nodes (18): AnalytiquePage(), Period, ApercuPage(), StatCard(), ANALYTICS_PERIOD_DAYS, hasFeature(), DayPoint, dayStart() (+10 more)

### Community 14 - "useGestionAccess"
Cohesion: 0.18
Nodes (8): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, DemoShowcase(), IphoneFrame(), QrCorners(), demoSection, demoSection

### Community 15 - "data.ts"
Cohesion: 0.11
Nodes (24): metadata, DemoBanner(), emptySubscribe(), ClipData, ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics() (+16 more)

### Community 16 - "customer-pane.tsx"
Cohesion: 0.13
Nodes (19): CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView(), TIMELINE, TrackingView(), useNow() (+11 more)

### Community 17 - "upload-post.ts"
Cohesion: 0.13
Nodes (13): providerApiKey(), PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider, ensureProfile(), isClipPlatform(), listConnectedAccounts() (+5 more)

### Community 18 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 19 - "menu-data.ts"
Cohesion: 0.12
Nodes (19): ClientDemoPage(), generateMetadata(), ItemInput, seed(), Article, GestionState, OrderItem, Badge (+11 more)

### Community 20 - "createAdminClient"
Cohesion: 0.15
Nodes (23): POST(), ResolvedLine, resolveOptions(), AccountRow, GET(), paymentAccounts(), POST(), requireGerant() (+15 more)

### Community 21 - "item-form-modal.tsx"
Cohesion: 0.17
Nodes (23): ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft(), FormuleFormModal() (+15 more)

### Community 22 - "add-to-order.tsx"
Cohesion: 0.11
Nodes (21): AddToOrder(), isUnavailable(), OptionsModal(), CartBar(), PaymentChoice, SubmitState, FeaturedCard(), PaymentState (+13 more)

### Community 23 - "page.tsx"
Cohesion: 0.07
Nodes (22): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, CreationComptesPage(), GenerateurPage() (+14 more)

### Community 24 - "types.ts"
Cohesion: 0.07
Nodes (32): statusColorExpression, Viewport, StatusMenu(), ALL_COLUMNS, LeadCard(), PipelineBoard(), DragState, useBoardDrag() (+24 more)

### Community 25 - "layout.tsx"
Cohesion: 0.06
Nodes (50): fraunces, instrumentSans, metadata, viewport, metadata, MENU_PATHS, Providers(), PRIVATE_PATHS (+42 more)

### Community 26 - "demo-showcase.tsx"
Cohesion: 0.15
Nodes (17): GET(), metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), OrderConfirmation(), STATUS_COPY, demoSection (+9 more)

### Community 27 - "database.types.ts"
Cohesion: 0.12
Nodes (18): EXTENSIONS, POST(), POST(), Product, PRODUCTS_BY_CHOICE, GET(), ClipEspaceLayout(), metadata (+10 more)

### Community 28 - "page.tsx"
Cohesion: 0.16
Nodes (12): generateMetadata(), getRestaurant, MenuPage(), CategoryLink, CategoryNav(), DishCard(), Hero(), PARTICLES (+4 more)

### Community 29 - "constants.ts"
Cohesion: 0.14
Nodes (16): POST(), PublierPage(), CaptionEditor(), PlatformBadge(), PostCard(), STATUS_CLASSES, captionsSchema(), generateCaptions() (+8 more)

### Community 30 - "provider.tsx"
Cohesion: 0.09
Nodes (37): ActivityInput, AppointmentInput, DuplicateCandidate, ExportRow, fetchAllSlugs(), fetchClosedTasks(), findLite(), ImportError (+29 more)

### Community 31 - "formatPrice"
Cohesion: 0.27
Nodes (6): cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), SelectedChoice, isItemAvailable()

### Community 32 - "shared.ts"
Cohesion: 0.18
Nodes (21): GET(), stateCookie(), GET(), POST(), OrderLine, POST(), createCheckout(), exchangeCode() (+13 more)

### Community 33 - "order-card.tsx"
Cohesion: 0.27
Nodes (8): OrderCard(), PaymentDialog(), COLLECT_ETA_CHOICES_MIN, ORDER_ACTION_LABELS, PAYMENT_MODE_LABELS, nextStatuses(), orderTotal(), Order

### Community 34 - "public-menu.ts"
Cohesion: 0.31
Nodes (7): ConfirmationPage(), metadata, CollectPage(), generateMetadata(), getPage, fetchRestaurant(), createPublicClient()

### Community 35 - "CollectDemoValue"
Cohesion: 0.10
Nodes (15): CartLine, buildDemoMenu(), COLLECT_DEMO, DEMO_MENU_SPEC, DemoMenuSection, demoRestaurantInfo, DemoStep, CollectDemoContext (+7 more)

### Community 36 - "page.tsx"
Cohesion: 0.14
Nodes (8): metadata, metadata, metadata, metadata, metadata, metadata, AuthForm(), Wordmark()

### Community 37 - "layout.tsx"
Cohesion: 0.08
Nodes (31): metadata, ArrowRightIcon(), CalendarIcon(), ChevronLeftIcon(), ClockIcon(), CrosshairIcon(), GlobeIcon(), MailIcon() (+23 more)

### Community 38 - "stage.tsx"
Cohesion: 0.10
Nodes (19): Analysis, ParsedRow, Phase, RowStatus, STATUS_META, COLUMNS, exportColumns(), ImportIcon() (+11 more)

### Community 39 - "seed-demo.ts"
Cohesion: 0.30
Nodes (14): commit(), fetchAll(), fetchLeads(), fetchOpenTasks(), fetchUpcomingAppointments(), getErrorSnapshot(), listeners, load() (+6 more)

### Community 40 - "Verifying the Ominin frontend"
Cohesion: 0.40
Nodes (4): Drive (Playwright), Gotchas, Launch, Verifying the Ominin frontend

### Community 41 - "comparison.tsx"
Cohesion: 0.12
Nodes (20): CollectSignupForm(), CollectEtablissementPage(), metadata, ProduitsPage(), CheckIcon(), ExternalLinkIcon(), GestionShell(), SubscriptionGate() (+12 more)

### Community 42 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 43 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 45 - "loading.tsx"
Cohesion: 0.14
Nodes (19): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), requestLinkUrl() (+11 more)

### Community 48 - "format.ts"
Cohesion: 0.15
Nodes (26): ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, MapLeadCard(), PlusIcon() (+18 more)

### Community 49 - "server.ts"
Cohesion: 0.24
Nodes (13): CartePage(), MapCanvas, useFilteredLeads(), getSnapshot(), isWatching(), listeners, notify(), startWatch() (+5 more)

### Community 50 - "lead-cache.ts"
Cohesion: 0.23
Nodes (12): invalid(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, CONTACT_LIMITS, ContactField (+4 more)

### Community 51 - "theme-toggle.tsx"
Cohesion: 0.20
Nodes (7): CollectFooter(), CollectNav(), CollectWordmark(), LandingNav(), ThemeToggle(), footer, nav

### Community 52 - "filter-bar.tsx"
Cohesion: 0.16
Nodes (16): FilterBar(), FilterIcon(), SearchIcon(), NO_CONTACT_OPTIONS, countActiveFilters(), emptyFilters(), filters, listeners (+8 more)

### Community 53 - "route.ts"
Cohesion: 0.38
Nodes (9): POST(), Role, card(), escapeHtml(), mailConfig(), ROLE_LABELS, sendEmail(), sendInviteEmail() (+1 more)

### Community 54 - "must"
Cohesion: 0.24
Nodes (8): Dropzone(), formatSize(), CheckIcon(), LinkIcon(), ListIcon(), RefreshIcon(), UploadIcon(), ACCEPTED_VIDEO_TYPES

### Community 55 - "page.tsx"
Cohesion: 0.29
Nodes (7): TablesPage(), TableGrid(), TableGroupCard(), freeTables(), groupTableNumbers(), Table, TableGroup

### Community 56 - "wordmark.tsx"
Cohesion: 0.31
Nodes (3): metadata, ClipLoader(), ClipWordmark()

### Community 57 - "proxy.ts"
Cohesion: 0.33
Nodes (5): config, matchesPath(), ProductConfig, PRODUCTS, proxy()

### Community 58 - "collectOffer"
Cohesion: 0.40
Nodes (3): collectOffer, plans, stripe

## Knowledge Gaps
- **257 isolated node(s):** `MapCanvas`, `RowStatus`, `ParsedRow`, `Analysis`, `Phase` (+252 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `api.ts` to `shell.tsx`, `page.tsx`, `layout.tsx`, `formule-form-modal.tsx`, `seed-demo.ts`, `comparison.tsx`, `store.ts`, `api.ts`, `types.ts`, `format.ts`, `add-to-order.tsx`, `provider.tsx`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `createAdminClient` to `createAdminClient`, `shared.ts`, `lead-cache.ts`, `route.ts`, `demo-showcase.tsx`, `database.types.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `Database` connect `database.types.ts` to `shell.tsx`, `api.ts`, `public-menu.ts`, `menu-data.ts`, `createAdminClient`, `route.ts`, `constants.ts`, `provider.tsx`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `must()` (e.g. with `load()` and `load()`) actually correct?**
  _`must()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MapCanvas`, `RowStatus`, `ParsedRow` to the rest of the system?**
  _257 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05347985347985348 - nodes in this community are weakly interconnected._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08181818181818182 - nodes in this community are weakly interconnected._
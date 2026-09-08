# Graph Report - frontend  (2026-08-18)

## Corpus Check
- 299 files · ~148,408 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1515 nodes · 4258 edges · 67 communities (63 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 86 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4809ce0e`
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
- [[_COMMUNITY_section-heading.tsx|section-heading.tsx]]
- [[_COMMUNITY_provider.tsx|provider.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_photo.ts|photo.ts]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 73 edges
2. `useToast()` - 47 edges
3. `createAdminClient()` - 45 edges
4. `must()` - 35 edges
5. `formatPrice()` - 34 edges
6. `useGestionAccess()` - 33 edges
7. `useAdmin()` - 31 edges
8. `apply()` - 29 edges
9. `useGestion()` - 29 edges
10. `check()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `createAdminClient()`  [EXTRACTED]
  app/api/collect/order/route.ts → lib/supabase/admin.ts
- `GenerateurPage()` --calls--> `useClipData()`  [EXTRACTED]
  app/clip/espace/generateur/page.tsx → lib/clip/context.tsx
- `CollectEtablissementPage()` --calls--> `createClient()`  [EXTRACTED]
  app/collect/inscription/etablissement/page.tsx → lib/supabase/server.ts
- `InvitationPage()` --calls--> `createClient()`  [EXTRACTED]
  app/invitation/page.tsx → lib/supabase/server.ts
- `AnalytiquePage()` --calls--> `hasFeature()`  [INFERRED]
  app/menu/gestion/analytique/page.tsx → lib/gestion/permissions.ts

## Import Cycles
- None detected.

## Communities (67 total, 4 thin omitted)

### Community 0 - "createAdminClient"
Cohesion: 0.23
Nodes (14): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+6 more)

### Community 1 - "shell.tsx"
Cohesion: 0.24
Nodes (10): ACTIVE_ORDER_STATUSES, HISTORY_ORDER_STATUSES, Client, getClientSnapshot(), getErrorSnapshot(), getServerSnapshot(), listeners, subscribe() (+2 more)

### Community 2 - "api.ts"
Cohesion: 0.06
Nodes (91): addActivity(), apply(), availableSlug(), completeTask(), createAppointment(), createRestaurant(), createTask(), fetchAppointments() (+83 more)

### Community 3 - "landing-data.ts"
Cohesion: 0.08
Nodes (32): metadata, DemoShowcase(), Faq(), FinalCta(), Hero(), LandingFooter(), LandingNav(), Pricing() (+24 more)

### Community 4 - "clip-landing-data.ts"
Cohesion: 0.10
Nodes (25): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero(), ClipHowItWorks(), ClipNav() (+17 more)

### Community 5 - "collect-landing-data.ts"
Cohesion: 0.09
Nodes (24): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectHero() (+16 more)

### Community 6 - "formule-form-modal.tsx"
Cohesion: 0.16
Nodes (28): EquipePage(), EtablissementForm(), EtablissementPage(), FormulesPage(), MenuPage(), TablesPage(), CollectSettings(), OrderGroupCard() (+20 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (37): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+29 more)

### Community 8 - "page.tsx"
Cohesion: 0.09
Nodes (9): FLEET, PILLARS, STEPS, WEEK, ComptesTab, ComptesTabs(), TABS, SubTab (+1 more)

### Community 9 - "store.ts"
Cohesion: 0.09
Nodes (26): metadata, NAV_ITEMS, NavItem, signOut(), ApercuIcon(), ChartIcon(), CheckIcon(), CommandesIcon() (+18 more)

### Community 10 - "api.ts"
Cohesion: 0.29
Nodes (13): ClipDataProvider(), fetchApi(), getClientSnapshot(), getErrorSnapshot(), getServerSnapshot(), listeners, load(), notify() (+5 more)

### Community 11 - "useToast"
Cohesion: 0.17
Nodes (18): fetchClosedTasks(), fetchExportRows(), cache, errors, fetchDetail(), freshness, LeadDetailState, listeners (+10 more)

### Community 12 - "types.ts"
Cohesion: 0.10
Nodes (33): InvitationForm(), InvitationPage(), OrderCardDemo(), OrderCard(), CashDetails, STATUS_CLASSES, StatusBadge(), ItemInput (+25 more)

### Community 13 - "selectors.ts"
Cohesion: 0.15
Nodes (18): AnalytiquePage(), Period, ApercuPage(), StatCard(), ANALYTICS_PERIOD_DAYS, DayPoint, dayStart(), inProgressOrders() (+10 more)

### Community 14 - "useGestionAccess"
Cohesion: 0.25
Nodes (5): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, IphoneFrame(), demoSection

### Community 15 - "data.ts"
Cohesion: 0.12
Nodes (21): metadata, DemoBanner(), emptySubscribe(), ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics(), buildDemoPosts() (+13 more)

### Community 16 - "customer-pane.tsx"
Cohesion: 0.15
Nodes (16): CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView(), TIMELINE, TrackingView(), useNow() (+8 more)

### Community 17 - "upload-post.ts"
Cohesion: 0.13
Nodes (13): providerApiKey(), PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider, ensureProfile(), isClipPlatform(), listConnectedAccounts() (+5 more)

### Community 18 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 19 - "menu-data.ts"
Cohesion: 0.15
Nodes (14): ClientDemoPage(), generateMetadata(), buildDemoMenu(), seed(), GestionState, OrderItem, getRestaurant(), restaurantThemeClass() (+6 more)

### Community 20 - "createAdminClient"
Cohesion: 0.19
Nodes (18): POST(), ResolvedLine, resolveOptions(), AccountRow, GET(), paymentAccounts(), POST(), requireGerant() (+10 more)

### Community 21 - "item-form-modal.tsx"
Cohesion: 0.22
Nodes (18): ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft(), XIcon() (+10 more)

### Community 22 - "add-to-order.tsx"
Cohesion: 0.13
Nodes (18): AddToOrder(), isUnavailable(), OptionsModal(), CartBar(), PaymentChoice, SubmitState, PaymentState, SumUpCardSdk (+10 more)

### Community 23 - "page.tsx"
Cohesion: 0.09
Nodes (23): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, CreationComptesPage(), ComptesPage() (+15 more)

### Community 24 - "types.ts"
Cohesion: 0.09
Nodes (26): statusColorExpression, Viewport, StatusMenu(), ALL_COLUMNS, PipelineBoard(), DragState, useBoardDrag(), ACTIVITY_TYPE_LABELS (+18 more)

### Community 25 - "layout.tsx"
Cohesion: 0.06
Nodes (51): fraunces, instrumentSans, metadata, viewport, metadata, MENU_PATHS, Providers(), PRIVATE_PATHS (+43 more)

### Community 26 - "demo-showcase.tsx"
Cohesion: 0.26
Nodes (9): metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), demoSection, collectDemoHref(), collectLandingHref(), emptySubscribe() (+1 more)

### Community 27 - "database.types.ts"
Cohesion: 0.12
Nodes (17): EXTENSIONS, POST(), POST(), Product, PRODUCTS_BY_CHOICE, GET(), ClipEspaceLayout(), metadata (+9 more)

### Community 28 - "page.tsx"
Cohesion: 0.22
Nodes (9): generateMetadata(), getRestaurant, MenuPage(), Hero(), PARTICLES, LANGUAGES, MenuFooter(), MenuSection() (+1 more)

### Community 29 - "constants.ts"
Cohesion: 0.18
Nodes (11): POST(), CaptionEditor(), PublierTab, PublierTabs(), TABS, captionsSchema(), generateCaptions(), ClipUploadInput (+3 more)

### Community 30 - "provider.tsx"
Cohesion: 0.10
Nodes (39): FollowUpChoice, VisitedFlow(), RestaurantPicker(), DUPLICATE_REASON_LABELS, Field(), Modal(), ActivityInput, AppointmentInput (+31 more)

### Community 31 - "formatPrice"
Cohesion: 0.23
Nodes (8): CartLine, cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), SelectedChoice, isItemAvailable(), MenuItem

### Community 32 - "shared.ts"
Cohesion: 0.15
Nodes (24): GET(), stateCookie(), GET(), POST(), OrderLine, POST(), POST(), POST() (+16 more)

### Community 33 - "order-card.tsx"
Cohesion: 0.25
Nodes (9): CommandesPage(), dedupeById(), FilterId, FILTERS, matchesFilter(), PillTab, PillTabs(), isHistoryStatus() (+1 more)

### Community 34 - "public-menu.ts"
Cohesion: 0.31
Nodes (7): ConfirmationPage(), metadata, CollectPage(), generateMetadata(), getPage, fetchRestaurant(), createPublicClient()

### Community 36 - "page.tsx"
Cohesion: 0.09
Nodes (14): metadata, metadata, metadata, metadata, CollectSignupForm(), CollectEtablissementPage(), metadata, metadata (+6 more)

### Community 37 - "layout.tsx"
Cohesion: 0.14
Nodes (22): ArrowRightIcon(), CalendarIcon(), ChevronLeftIcon(), ClockIcon(), GlobeIcon(), MailIcon(), MapPinIcon(), NoteIcon() (+14 more)

### Community 38 - "stage.tsx"
Cohesion: 0.11
Nodes (18): Analysis, ParsedRow, Phase, RowStatus, STATUS_META, COLUMNS, exportColumns(), ImportIcon() (+10 more)

### Community 39 - "seed-demo.ts"
Cohesion: 0.09
Nodes (30): metadata, PipelineIcon(), StoreIcon(), TaskIcon(), LeadPanelHost(), AdminShell(), DESKTOP_ITEMS, FULL_BLEED_PATHS (+22 more)

### Community 40 - "Verifying the Ominin frontend"
Cohesion: 0.40
Nodes (4): Drive (Playwright), Gotchas, Launch, Verifying the Ominin frontend

### Community 41 - "comparison.tsx"
Cohesion: 0.17
Nodes (15): ProduitsPage(), ExternalLinkIcon(), DiscoverLink(), Pill(), ProductCard(), startCheckout(), allowedActions(), activeProducts() (+7 more)

### Community 42 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 43 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 45 - "loading.tsx"
Cohesion: 0.12
Nodes (23): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), requestLinkUrl() (+15 more)

### Community 48 - "format.ts"
Cohesion: 0.10
Nodes (36): ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, MapLeadCard(), PlusIcon() (+28 more)

### Community 49 - "server.ts"
Cohesion: 0.14
Nodes (21): CartePage(), MapCanvas, ImportPage(), RestaurantsPage(), TachesPage(), CrosshairIcon(), useFilteredLeads(), capturePosition() (+13 more)

### Community 50 - "lead-cache.ts"
Cohesion: 0.23
Nodes (12): invalid(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, CONTACT_LIMITS, ContactField (+4 more)

### Community 51 - "theme-toggle.tsx"
Cohesion: 0.18
Nodes (8): CollectFooter(), CollectNav(), CollectWordmark(), CategoryLink, CategoryNav(), ThemeToggle(), footer, nav

### Community 52 - "filter-bar.tsx"
Cohesion: 0.14
Nodes (18): FilterBar(), FilterIcon(), SearchIcon(), CATEGORY_LABELS, NO_CONTACT_OPTIONS, countActiveFilters(), emptyFilters(), filters (+10 more)

### Community 53 - "route.ts"
Cohesion: 0.38
Nodes (9): POST(), Role, card(), escapeHtml(), mailConfig(), ROLE_LABELS, sendEmail(), sendInviteEmail() (+1 more)

### Community 54 - "must"
Cohesion: 0.17
Nodes (9): DishCard(), Badge, BADGE_LABELS, boho, MenuCategory, OptionChoice, restaurants, themeClasses (+1 more)

### Community 55 - "page.tsx"
Cohesion: 0.15
Nodes (13): ROLES, TeamManager(), QrPage(), useQrCodes(), FeatureLocked(), ChevronDownIcon(), TableGrid(), TableGroupCard() (+5 more)

### Community 56 - "wordmark.tsx"
Cohesion: 0.21
Nodes (11): GET(), OrderConfirmation(), STATUS_COPY, demoRestaurantInfo, CartChoice, CartLinePayload, CollectCheckoutPayload, collectHref() (+3 more)

### Community 57 - "proxy.ts"
Cohesion: 0.33
Nodes (5): config, matchesPath(), ProductConfig, PRODUCTS, proxy()

### Community 58 - "collectOffer"
Cohesion: 0.24
Nodes (8): PublicationsPage(), PlatformBadge(), PostCard(), STATUS_CLASSES, PLATFORM_LABELS, STATUS_LABELS, ClipPostStatus, Tables

### Community 59 - "layout.tsx"
Cohesion: 0.18
Nodes (10): OnboardingForm(), RESERVED_SLUGS, metadata, OnboardingPage(), PROVIDER_TAGLINES, StripeStatus, SumUpStatus, OFFRE_LABELS (+2 more)

### Community 60 - "section-heading.tsx"
Cohesion: 0.21
Nodes (8): Features(), HowItWorks(), SectionHeading(), Testimonials(), faqSection, clientsSection, featuresSection, howItWorks

### Community 64 - "provider.tsx"
Cohesion: 0.21
Nodes (11): COLLECT_DEMO, DEMO_MENU_SPEC, DemoMenuSection, DemoStep, CollectDemoContext, CollectDemoProvider(), CollectDemoState, DemoOrder (+3 more)

### Community 65 - "page.tsx"
Cohesion: 0.22
Nodes (3): GenerateurPage(), MOMENTS, STEPS

## Knowledge Gaps
- **258 isolated node(s):** `MapCanvas`, `RowStatus`, `ParsedRow`, `Analysis`, `Phase` (+253 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `api.ts` to `shell.tsx`, `page.tsx`, `seed-demo.ts`, `comparison.tsx`, `store.ts`, `useToast`, `types.ts`, `api.ts`, `format.ts`, `add-to-order.tsx`, `page.tsx`, `layout.tsx`, `provider.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `createAdminClient` to `createAdminClient`, `shared.ts`, `lead-cache.ts`, `route.ts`, `wordmark.tsx`, `database.types.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `Database` connect `database.types.ts` to `shell.tsx`, `api.ts`, `public-menu.ts`, `menu-data.ts`, `createAdminClient`, `route.ts`, `collectOffer`, `provider.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `must()` (e.g. with `load()` and `load()`) actually correct?**
  _`must()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MapCanvas`, `RowStatus`, `ParsedRow` to the rest of the system?**
  _258 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05717171717171717 - nodes in this community are weakly interconnected._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07624113475177305 - nodes in this community are weakly interconnected._
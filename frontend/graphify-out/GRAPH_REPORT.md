# Graph Report - frontend  (2026-08-06)

## Corpus Check
- 208 files · ~85,859 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 974 nodes · 2586 edges · 48 communities (45 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9c30c934`
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
- [[_COMMUNITY_postcss.config.mjs|postcss.config.mjs]]

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
  app/clip/espace/generateur/page.tsx → lib/clip/context.tsx
- `AnalytiquePage()` --calls--> `hasFeature()`  [INFERRED]
  app/gestion/analytique/page.tsx → lib/gestion/permissions.ts
- `ApercuPage()` --calls--> `hasFeature()`  [INFERRED]
  app/gestion/page.tsx → lib/gestion/permissions.ts
- `OnboardingPage()` --calls--> `createClient()`  [EXTRACTED]
  app/onboarding/page.tsx → lib/supabase/server.ts
- `sitemap()` --calls--> `createClient()`  [EXTRACTED]
  app/sitemap.ts → lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (48 total, 3 thin omitted)

### Community 0 - "createAdminClient"
Cohesion: 0.07
Nodes (53): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+45 more)

### Community 1 - "shell.tsx"
Cohesion: 0.05
Nodes (36): metadata, metadata, Dropzone(), formatSize(), CheckIcon(), LinkIcon(), ListIcon(), RefreshIcon() (+28 more)

### Community 2 - "api.ts"
Cohesion: 0.11
Nodes (43): metadata, AuthForm(), addTableToGroup(), apply(), assertTransition(), createCategory(), createFormule(), createGroup() (+35 more)

### Community 3 - "landing-data.ts"
Cohesion: 0.07
Nodes (34): metadata, Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter(), LandingNav() (+26 more)

### Community 4 - "clip-landing-data.ts"
Cohesion: 0.09
Nodes (29): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero(), ClipHowItWorks(), ClipNav() (+21 more)

### Community 5 - "collect-landing-data.ts"
Cohesion: 0.10
Nodes (23): metadata, CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter(), CollectHero(), CollectHowItWorks(), CollectNav() (+15 more)

### Community 6 - "formule-form-modal.tsx"
Cohesion: 0.18
Nodes (23): ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft(), FormuleFormModal() (+15 more)

### Community 7 - "devDependencies"
Cohesion: 0.06
Nodes (31): dependencies, @anthropic-ai/sdk, next, next-themes, qrcode, react, react-dom, stripe (+23 more)

### Community 8 - "page.tsx"
Cohesion: 0.08
Nodes (15): AnalytiquePage(), PostAnalyticsList(), CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, ComptesPage() (+7 more)

### Community 9 - "store.ts"
Cohesion: 0.13
Nodes (28): ACTIVE_ORDER_STATUSES, HISTORY_ORDER_STATUSES, assembleCategories(), assembleGroups(), OrderRow, rowToEtablissement(), rowToFormule(), rowToOrder() (+20 more)

### Community 10 - "api.ts"
Cohesion: 0.14
Nodes (26): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), retryPost() (+18 more)

### Community 11 - "useToast"
Cohesion: 0.13
Nodes (20): dedupeById(), FilterId, FILTERS, matchesFilter(), ROLES, TeamManager(), EtablissementForm(), FeatureLocked() (+12 more)

### Community 12 - "types.ts"
Cohesion: 0.17
Nodes (20): OnboardingForm(), RESERVED_SLUGS, metadata, OnboardingPage(), STATUS_CLASSES, StatusBadge(), EXCLUDED_STATUSES, OFFRE_FEATURES (+12 more)

### Community 13 - "selectors.ts"
Cohesion: 0.16
Nodes (16): AnalytiquePage(), Period, ApercuPage(), ANALYTICS_PERIOD_DAYS, DayPoint, dayStart(), inProgressOrders(), lineTotal() (+8 more)

### Community 14 - "useGestionAccess"
Cohesion: 0.23
Nodes (19): CommandesPage(), EquipePage(), EtablissementPage(), FormulesPage(), MenuPage(), TablesPage(), OrderGroupCard(), FormuleCard() (+11 more)

### Community 15 - "data.ts"
Cohesion: 0.15
Nodes (19): ClipData, ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics(), buildDemoPosts(), buildDemoState(), DAILY_REACH_PEAK (+11 more)

### Community 16 - "customer-pane.tsx"
Cohesion: 0.16
Nodes (14): CheckoutView(), CustomerPane(), DishRow(), MenuView(), TIMELINE, TrackingView(), useNow(), OrderCardDemo() (+6 more)

### Community 17 - "upload-post.ts"
Cohesion: 0.12
Nodes (14): providerApiKey(), PlatformResult, PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider, ensureProfile(), isClipPlatform() (+6 more)

### Community 18 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 19 - "menu-data.ts"
Cohesion: 0.13
Nodes (12): DishCard(), FeaturedCard(), MenuSection(), ItemInput, Article, Badge, BADGE_LABELS, OptionChoice (+4 more)

### Community 20 - "page.tsx"
Cohesion: 0.18
Nodes (10): QrPage(), useQrCodes(), TableGrid(), TableGroupCard(), ConfirmDialog(), Modal(), freeTables(), groupTableNumbers() (+2 more)

### Community 21 - "context.tsx"
Cohesion: 0.22
Nodes (8): requestLinkUrl(), ClipActions, connectAccounts(), realActions, CaptionSet, PlatformAnalytics, PostAnalytics, ClipPost

### Community 22 - "add-to-order.tsx"
Cohesion: 0.18
Nodes (14): AddToOrder(), isUnavailable(), OptionsModal(), CartBar(), PaymentChoice, SubmitState, CartChoice, CartConfig (+6 more)

### Community 23 - "page.tsx"
Cohesion: 0.14
Nodes (10): AnalyticsView, compact, VIEW_SUBTITLES, VIEWS, compact, LoadedRow, METRIC_COLUMNS, PostAnalyticsCard() (+2 more)

### Community 24 - "types.ts"
Cohesion: 0.25
Nodes (7): POST(), CaptionEditor(), captionsSchema(), generateCaptions(), ClipUploadInput, CLIP_PLATFORMS, ClipPlatform

### Community 25 - "layout.tsx"
Cohesion: 0.17
Nodes (8): fraunces, instrumentSans, metadata, viewport, Providers(), sitemap(), seo, siteUrl

### Community 26 - "demo-showcase.tsx"
Cohesion: 0.26
Nodes (9): metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), demoSection, collectDemoHref(), collectLandingHref(), emptySubscribe() (+1 more)

### Community 27 - "demo-showcase.tsx"
Cohesion: 0.18
Nodes (8): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, DemoShowcase(), IphoneFrame(), QrCorners(), demoSection, demoSection

### Community 28 - "page.tsx"
Cohesion: 0.17
Nodes (6): GenerateurPage(), MOMENTS, STEPS, PublierTab, PublierTabs(), TABS

### Community 29 - "constants.ts"
Cohesion: 0.26
Nodes (7): PublicationsPage(), PlatformBadge(), PostCard(), STATUS_CLASSES, PLATFORM_LABELS, STATUS_LABELS, ClipPostStatus

### Community 30 - "provider.tsx"
Cohesion: 0.22
Nodes (11): buildDemoMenu(), COLLECT_DEMO, DEMO_MENU_CATEGORIES, DemoMenuSection, DemoStep, CollectDemoContext, CollectDemoProvider(), CollectDemoState (+3 more)

### Community 31 - "formatPrice"
Cohesion: 0.26
Nodes (8): CartLine, cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), SelectedChoice, isItemAvailable(), formatPrice()

### Community 32 - "shared.ts"
Cohesion: 0.26
Nodes (9): OrderConfirmation(), STATUS_COPY, CartChoice, CartLinePayload, CollectCheckoutPayload, collectHref(), CollectOrderView, mapsDirectionsHref() (+1 more)

### Community 33 - "order-card.tsx"
Cohesion: 0.30
Nodes (7): OrderCard(), PaymentDialog(), ORDER_ACTION_LABELS, PAYMENT_MODE_LABELS, nextStatuses(), orderTotal(), Order

### Community 34 - "public-menu.ts"
Cohesion: 0.31
Nodes (7): ConfirmationPage(), metadata, CollectPage(), generateMetadata(), getPage, fetchRestaurant(), createPublicClient()

### Community 36 - "page.tsx"
Cohesion: 0.31
Nodes (7): generateMetadata(), getRestaurant, MenuPage(), Hero(), LANGUAGES, MenuFooter(), Restaurant

### Community 37 - "layout.tsx"
Cohesion: 0.32
Nodes (5): metadata, DemoBanner(), emptySubscribe(), DEMO_BANNER, DemoClipProvider()

### Community 38 - "stage.tsx"
Cohesion: 0.32
Nodes (4): DemoHint(), Side, BrowserFrame(), nextActionSide()

### Community 39 - "seed-demo.ts"
Cohesion: 0.43
Nodes (5): seed(), OrderItem, getRestaurant(), db, main()

### Community 40 - "Verifying the Ominin frontend"
Cohesion: 0.40
Nodes (4): Drive (Playwright), Gotchas, Launch, Verifying the Ominin frontend

### Community 41 - "comparison.tsx"
Cohesion: 0.60
Nodes (4): CollectComparison(), CostBar(), euros(), comparisonSection

### Community 42 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 43 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

## Knowledge Gaps
- **167 isolated node(s):** `ResolvedLine`, `EXTENSIONS`, `Product`, `PRODUCTS_BY_CHOICE`, `AccountRow` (+162 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `api.ts` to `shell.tsx`, `store.ts`, `api.ts`, `useToast`, `types.ts`, `add-to-order.tsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `MenuItem` connect `formule-form-modal.tsx` to `api.ts`, `CollectDemoValue`, `store.ts`, `selectors.ts`, `useGestionAccess`, `customer-pane.tsx`, `menu-data.ts`, `add-to-order.tsx`, `provider.tsx`, `formatPrice`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `formatPrice()` connect `formatPrice` to `shared.ts`, `order-card.tsx`, `landing-data.ts`, `selectors.ts`, `useGestionAccess`, `customer-pane.tsx`, `menu-data.ts`, `add-to-order.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `ResolvedLine`, `EXTENSIONS`, `Product` to the rest of the system?**
  _167 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `createAdminClient` be split into smaller, more focused modules?**
  _Cohesion score 0.06846899794299148 - nodes in this community are weakly interconnected._
- **Should `shell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05367231638418079 - nodes in this community are weakly interconnected._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
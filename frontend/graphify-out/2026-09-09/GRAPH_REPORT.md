# Graph Report - frontend  (2026-09-07)

## Corpus Check
- 330 files · ~179,315 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1779 nodes · 5069 edges · 84 communities (81 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 102 edges (avg confidence: 0.64)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6fb63eeb`
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
- [[_COMMUNITY_shell.tsx|shell.tsx]]
- [[_COMMUNITY_createAdminClient|createAdminClient]]
- [[_COMMUNITY_site.ts|site.ts]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_useLanguage|useLanguage]]
- [[_COMMUNITY_lead-card.tsx|lead-card.tsx]]
- [[_COMMUNITY_cart-bar.tsx|cart-bar.tsx]]
- [[_COMMUNITY_language.tsx|language.tsx]]
- [[_COMMUNITY_seed-crm.ts|seed-crm.ts]]
- [[_COMMUNITY_portal-data.ts|portal-data.ts]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_client.ts|client.ts]]
- [[_COMMUNITY_stage.tsx|stage.tsx]]
- [[_COMMUNITY_qr-showcase.tsx|qr-showcase.tsx]]
- [[_COMMUNITY_collectOffer|collectOffer]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 103 edges
2. `useToast()` - 67 edges
3. `createAdminClient()` - 64 edges
4. `must()` - 50 edges
5. `formatPrice()` - 47 edges
6. `check()` - 37 edges
7. `useGestionAccess()` - 35 edges
8. `useAdmin()` - 33 edges
9. `createClient()` - 33 edges
10. `useGestion()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `createAdminClient()`  [EXTRACTED]
  app/api/collect/order/route.ts → lib/supabase/admin.ts
- `ClipEspaceLayout()` --calls--> `createClient()`  [EXTRACTED]
  app/clip/espace/layout.tsx → lib/supabase/server.ts
- `CollectEtablissementPage()` --calls--> `createClient()`  [EXTRACTED]
  app/collect/inscription/etablissement/page.tsx → lib/supabase/server.ts
- `CommandesPage()` --calls--> `hasFeature()`  [INFERRED]
  app/menu/gestion/commandes/page.tsx → lib/gestion/permissions.ts
- `DeviceStatusCard()` --calls--> `useToast()`  [EXTRACTED]
  app/menu/gestion/notifications/page.tsx → components/ui/toast.tsx

## Import Cycles
- None detected.

## Communities (84 total, 3 thin omitted)

### Community 0 - "createAdminClient"
Cohesion: 0.22
Nodes (14): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+6 more)

### Community 1 - "shell.tsx"
Cohesion: 0.12
Nodes (30): HISTORY_ORDER_STATUSES, OPEN_ORDER_STATUSES, PAID_ORDER_STATUSES, assembleCategories(), OrderRow, rowToEtablissement(), rowToFormule(), rowToMember() (+22 more)

### Community 2 - "api.ts"
Cohesion: 0.14
Nodes (37): apply(), assertTransition(), createCategory(), createFormule(), createItem(), createStaffOrder(), deleteCategory(), deleteFormule() (+29 more)

### Community 3 - "landing-data.ts"
Cohesion: 0.09
Nodes (29): metadata, Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter(), LandingNav() (+21 more)

### Community 4 - "clip-landing-data.ts"
Cohesion: 0.10
Nodes (28): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero(), ClipHowItWorks(), ClipNav() (+20 more)

### Community 5 - "collect-landing-data.ts"
Cohesion: 0.08
Nodes (28): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter() (+20 more)

### Community 6 - "formule-form-modal.tsx"
Cohesion: 0.16
Nodes (25): EquipePage(), EtablissementPage(), MenuPage(), View, NotificationsPage(), TablesPage(), TerminauxPage(), FormuleCard() (+17 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (39): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+31 more)

### Community 8 - "page.tsx"
Cohesion: 0.09
Nodes (9): FLEET, PILLARS, STEPS, WEEK, ComptesPage(), ComptesTab, ComptesTabs(), TABS (+1 more)

### Community 9 - "store.ts"
Cohesion: 0.11
Nodes (17): metadata, ApercuIcon(), BellIcon(), ChevronDownIcon(), CommandesIcon(), ExternalLinkIcon(), GearIcon(), LogoutIcon() (+9 more)

### Community 10 - "api.ts"
Cohesion: 0.20
Nodes (16): ClipEspaceLayout(), metadata, ClipDataProvider(), commit(), fetchApi(), getClientSnapshot(), getErrorSnapshot(), getServerSnapshot() (+8 more)

### Community 11 - "useToast"
Cohesion: 0.18
Nodes (17): fetchAppointments(), fetchExportRows(), cache, errors, fetchDetail(), freshness, LeadDetailState, listeners (+9 more)

### Community 12 - "types.ts"
Cohesion: 0.16
Nodes (20): STATUS_CLASSES, StatusBadge(), NavItem, ACTION_FEATURE, ACTION_LABELS, COLLECT_FEATURES, EXCLUDED_STATUSES, OFFRE_FEATURES (+12 more)

### Community 13 - "selectors.ts"
Cohesion: 0.10
Nodes (33): matchesFilter(), ApercuPage(), Period, CuisinierApercu(), EmployeeApercu(), EmptyService(), LiveTile(), ProfileRow() (+25 more)

### Community 14 - "useGestionAccess"
Cohesion: 0.18
Nodes (8): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, DemoShowcase(), IphoneFrame(), QrCorners(), demoSection, demoSection

### Community 15 - "data.ts"
Cohesion: 0.10
Nodes (25): metadata, DemoBanner(), emptySubscribe(), ClipShell(), ClipData, ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics() (+17 more)

### Community 16 - "customer-pane.tsx"
Cohesion: 0.15
Nodes (15): CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView(), TIMELINE, TrackingView(), useNow() (+7 more)

### Community 17 - "upload-post.ts"
Cohesion: 0.11
Nodes (20): POST(), captionsSchema(), generateCaptions(), providerApiKey(), CLIP_PLATFORMS, PlatformAnalytics, PlatformResult, PostAnalytics (+12 more)

### Community 18 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 19 - "menu-data.ts"
Cohesion: 0.18
Nodes (11): ClientDemoPage(), generateMetadata(), seed(), getRestaurant(), restaurantThemeClass(), TablesInsert, db, main() (+3 more)

### Community 20 - "createAdminClient"
Cohesion: 0.29
Nodes (11): GET(), POST(), requireGerant(), POST(), POST(), POST(), Admin, connectedAccount() (+3 more)

### Community 21 - "item-form-modal.tsx"
Cohesion: 0.20
Nodes (21): ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft(), FormuleFormModal() (+13 more)

### Community 22 - "add-to-order.tsx"
Cohesion: 0.18
Nodes (13): AddToOrder(), isUnavailable(), OptionsModal(), CallServerButton(), CallState, CartChoice, CartConfig, CartContext (+5 more)

### Community 23 - "page.tsx"
Cohesion: 0.07
Nodes (22): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, CreationComptesPage(), GenerateurPage() (+14 more)

### Community 24 - "types.ts"
Cohesion: 0.07
Nodes (33): statusColorExpression, Viewport, StatusMenu(), ALL_COLUMNS, PipelineBoard(), DragState, useBoardDrag(), ImportRow (+25 more)

### Community 25 - "layout.tsx"
Cohesion: 0.14
Nodes (13): metadata, PortalApproach(), PortalFinalCta(), PARTICLES, PortalHero(), BENTO_SPANS, PortalProducts(), ProductCube() (+5 more)

### Community 26 - "demo-showcase.tsx"
Cohesion: 0.26
Nodes (9): metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), demoSection, collectDemoHref(), collectLandingHref(), emptySubscribe() (+1 more)

### Community 27 - "database.types.ts"
Cohesion: 0.13
Nodes (16): Role, GET(), EXTENSIONS, POST(), POST(), Product, PRODUCTS_BY_CHOICE, GET() (+8 more)

### Community 28 - "page.tsx"
Cohesion: 0.16
Nodes (10): generateMetadata(), getRestaurant, MenuPage(), Hero(), PARTICLES, LANGUAGES, MenuFooter(), PaymentReturn() (+2 more)

### Community 29 - "constants.ts"
Cohesion: 0.10
Nodes (40): ActivityInput, addActivity(), apply(), approveOutreachEmail(), availableSlug(), completeTask(), createAppointment(), createRestaurant() (+32 more)

### Community 30 - "provider.tsx"
Cohesion: 0.11
Nodes (30): AppointmentFormModal(), RestaurantPicker(), TaskFormModal(), AppointmentInput, ExportRow, TaskInput, APPOINTMENT_DURATIONS_MIN, APPOINTMENT_TYPE_LABELS (+22 more)

### Community 31 - "formatPrice"
Cohesion: 0.11
Nodes (30): ChimeCard(), DevicesCard(), DeviceStatusCard(), IOS_STEPS, PrefsCard(), armedListeners, CHIME_NOTES, chimeEnabled() (+22 more)

### Community 32 - "shared.ts"
Cohesion: 0.20
Nodes (18): GET(), stateCookie(), GET(), POST(), POST(), createCheckout(), exchangeCode(), fetchCheckout() (+10 more)

### Community 33 - "order-card.tsx"
Cohesion: 0.10
Nodes (32): CommandesPage(), dedupeById(), EMPTY_BODIES, FilterId, FILTERS, DayGroup, CreateOrderFab(), EncaisserCard() (+24 more)

### Community 34 - "public-menu.ts"
Cohesion: 0.31
Nodes (7): ConfirmationPage(), metadata, CollectPage(), generateMetadata(), getPage, fetchRestaurant(), createPublicClient()

### Community 36 - "page.tsx"
Cohesion: 0.09
Nodes (14): metadata, metadata, metadata, metadata, metadata, metadata, InscriptionTabs(), Profile (+6 more)

### Community 37 - "layout.tsx"
Cohesion: 0.07
Nodes (35): metadata, ArrowRightIcon(), BotIcon(), CalendarIcon(), ChevronLeftIcon(), ClockIcon(), CrosshairIcon(), FilterIcon() (+27 more)

### Community 38 - "stage.tsx"
Cohesion: 0.09
Nodes (24): EmailsRedirect(), Analysis, ImportPage(), ParsedRow, Phase, RowStatus, STATUS_META, COLUMNS (+16 more)

### Community 39 - "seed-demo.ts"
Cohesion: 0.24
Nodes (17): LEAD_LITE_SELECT, commit(), fetchAll(), fetchLeads(), fetchOpenTasks(), fetchPendingDraftCount(), fetchUpcomingAppointments(), getErrorSnapshot() (+9 more)

### Community 40 - "Verifying the Ominin frontend"
Cohesion: 0.40
Nodes (4): Drive (Playwright), Gotchas, Launch, Verifying the Ominin frontend

### Community 41 - "comparison.tsx"
Cohesion: 0.13
Nodes (19): CollectSignupForm(), CollectEtablissementPage(), metadata, ProduitsPage(), CheckIcon(), SubscriptionGate(), DiscoverLink(), Pill() (+11 more)

### Community 42 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 43 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 45 - "loading.tsx"
Cohesion: 0.14
Nodes (18): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), requestLinkUrl() (+10 more)

### Community 48 - "format.ts"
Cohesion: 0.17
Nodes (23): ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, PlusIcon(), fetchWeeklyActivityCounts() (+15 more)

### Community 49 - "server.ts"
Cohesion: 0.17
Nodes (18): CartePage(), MapCanvas, FollowUpChoice, VisitedFlow(), MarkVisitedInput, FOLLOW_UP_QUICK_OPTIONS, fromDatetimeLocalValue(), capturePosition() (+10 more)

### Community 50 - "lead-cache.ts"
Cohesion: 0.23
Nodes (12): invalid(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, CONTACT_LIMITS, ContactField (+4 more)

### Community 51 - "theme-toggle.tsx"
Cohesion: 0.14
Nodes (30): fetchAllSlugs(), fetchClosedTasks(), fetchOutreachEmails(), fetchOutreachRuns(), fetchOutreachStats(), findDuplicates(), importRestaurants(), rowToOutreachEmail() (+22 more)

### Community 52 - "filter-bar.tsx"
Cohesion: 0.11
Nodes (23): RestaurantsPage(), TachesPage(), FilterBar(), countActiveFilters(), emptyFilters(), filterLeads(), filters, listeners (+15 more)

### Community 53 - "route.ts"
Cohesion: 0.40
Nodes (9): POST(), accessToken(), card(), escapeHtml(), mailConfig(), ROLE_LABELS, sendEmail(), sendInviteEmail() (+1 more)

### Community 54 - "must"
Cohesion: 0.08
Nodes (24): CartLine, cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), SelectedChoice, CartLine, CreateOrderDialog() (+16 more)

### Community 55 - "page.tsx"
Cohesion: 0.11
Nodes (23): LeaPage(), PublicationsPage(), ROLES, TeamManager(), EtablissementForm(), CreateRestaurantModal(), DUPLICATE_REASON_LABELS, CollectSettings() (+15 more)

### Community 56 - "wordmark.tsx"
Cohesion: 0.21
Nodes (11): GET(), OrderConfirmation(), STATUS_COPY, demoRestaurantInfo, CartChoice, CartLinePayload, CollectCheckoutPayload, collectHref() (+3 more)

### Community 57 - "proxy.ts"
Cohesion: 0.33
Nodes (5): config, matchesPath(), ProductConfig, PRODUCTS, proxy()

### Community 58 - "collectOffer"
Cohesion: 0.20
Nodes (9): CaptionEditor(), PlatformBadge(), PostCard(), STATUS_CLASSES, PLATFORM_LABELS, STATUS_LABELS, ClipUploadInput, ClipPlatform (+1 more)

### Community 59 - "layout.tsx"
Cohesion: 0.13
Nodes (12): InvitationForm(), InvitationPage(), OnboardingForm(), RESERVED_SLUGS, metadata, OnboardingPage(), StaffPending(), CategoryLink (+4 more)

### Community 60 - "section-heading.tsx"
Cohesion: 0.12
Nodes (23): CallBody, POST(), POST(), POST(), parseProducts(), POST(), Product, upsertSubscription() (+15 more)

### Community 64 - "provider.tsx"
Cohesion: 0.22
Nodes (11): buildDemoMenu(), COLLECT_DEMO, DEMO_MENU_SPEC, DemoMenuSection, DemoStep, CollectDemoContext, CollectDemoProvider(), CollectDemoState (+3 more)

### Community 65 - "page.tsx"
Cohesion: 0.09
Nodes (18): FindingsCard(), percent(), PROSPECT_TILES, TabId, VARIANT_ORDER, VariantCard(), StatCard(), CLASSIFICATION_LABELS (+10 more)

### Community 66 - "photo.ts"
Cohesion: 0.13
Nodes (20): BADGE, DeviceCard(), DOT_CLASS, Editing, Health, LinkState, PrinterCard(), printerHealth() (+12 more)

### Community 67 - "shell.tsx"
Cohesion: 0.14
Nodes (14): NavItem, Dropzone(), formatSize(), CheckIcon(), ListIcon(), RefreshIcon(), UploadIcon(), NAV_ITEMS (+6 more)

### Community 68 - "createAdminClient"
Cohesion: 0.21
Nodes (13): POST(), ResolvedLine, resolveOptions(), POST(), DELETE(), GET(), POST(), requireUser() (+5 more)

### Community 69 - "site.ts"
Cohesion: 0.14
Nodes (10): fraunces, instrumentSans, metadata, viewport, MENU_PATHS, Providers(), PRIVATE_PATHS, sitemap() (+2 more)

### Community 70 - "page.tsx"
Cohesion: 0.22
Nodes (13): dedupeById(), displayMode(), groupByDay(), matchesMode(), MODE_FILTERS, ModeFilter, PaiementsPage(), PaymentRow() (+5 more)

### Community 71 - "useLanguage"
Cohesion: 0.26
Nodes (9): metadata, ContactForm(), Status, LanguageToggle(), PortalNav(), SurMesure(), languageToggle, surMesure (+1 more)

### Community 72 - "lead-card.tsx"
Cohesion: 0.26
Nodes (9): MapLeadCard(), LeadCard(), LeadStatusBadge(), PriorityBadge(), TaskRowItem(), PRIORITY_LABELS, formatDay(), formatRelative() (+1 more)

### Community 73 - "cart-bar.tsx"
Cohesion: 0.18
Nodes (9): CartBar(), PaymentChoice, SubmitState, TIP_PERCENTS, TipChoice, PaymentState, SumUpCardSdk, SumUpPayment() (+1 more)

### Community 74 - "language.tsx"
Cohesion: 0.23
Nodes (11): Language, LANGUAGES, Localized, isLanguage(), LanguageContext, LanguageProvider(), LanguageValue, listeners (+3 more)

### Community 75 - "seed-crm.ts"
Cohesion: 0.20
Nodes (11): Category, daysAgo(), daysAhead(), db, LeadStatus, main(), Priority, R (+3 more)

### Community 76 - "portal-data.ts"
Cohesion: 0.24
Nodes (8): PortalFooter(), unsplash(), buildLabel, footer, nav, openLabel, portalHost, products

### Community 77 - "route.ts"
Cohesion: 0.36
Nodes (9): confirmFormHtml(), DONE_HTML, GET(), LEAD_DEMOTABLE_FROM, PAGE_SHELL(), params(), POST(), unsubscribe() (+1 more)

### Community 78 - "client.ts"
Cohesion: 0.24
Nodes (5): PushEvent, loadPrefs(), PrefValues, requireUser(), savePrefs()

### Community 79 - "stage.tsx"
Cohesion: 0.32
Nodes (4): DemoHint(), Side, BrowserFrame(), nextActionSide()

### Community 80 - "qr-showcase.tsx"
Cohesion: 0.50
Nodes (3): QrLive(), QrShowcase(), qrShowcase

### Community 81 - "collectOffer"
Cohesion: 0.40
Nodes (3): collectOffer, plans, stripe

## Knowledge Gaps
- **291 isolated node(s):** `MapCanvas`, `RowStatus`, `ParsedRow`, `Analysis`, `Phase` (+286 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `theme-toggle.tsx` to `shell.tsx`, `api.ts`, `shell.tsx`, `page.tsx`, `layout.tsx`, `seed-demo.ts`, `comparison.tsx`, `store.ts`, `cart-bar.tsx`, `useToast`, `api.ts`, `client.ts`, `format.ts`, `page.tsx`, `layout.tsx`, `constants.ts`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `useToast()` connect `page.tsx` to `page.tsx`, `order-card.tsx`, `photo.ts`, `stage.tsx`, `formule-form-modal.tsx`, `page.tsx`, `page.tsx`, `selectors.ts`, `format.ts`, `server.ts`, `filter-bar.tsx`, `item-form-modal.tsx`, `must`, `page.tsx`, `collectOffer`, `provider.tsx`, `formatPrice`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `createAdminClient` to `createAdminClient`, `shared.ts`, `route.ts`, `lead-cache.ts`, `createAdminClient`, `route.ts`, `wordmark.tsx`, `database.types.ts`, `section-heading.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `must()` (e.g. with `load()` and `load()`) actually correct?**
  _`must()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MapCanvas`, `RowStatus`, `ParsedRow` to the rest of the system?**
  _291 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `shell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12298387096774194 - nodes in this community are weakly interconnected._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13630229419703105 - nodes in this community are weakly interconnected._
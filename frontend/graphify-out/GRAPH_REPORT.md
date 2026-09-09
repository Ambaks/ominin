# Graph Report - frontend  (2026-09-09)

## Corpus Check
- 476 files · ~331,469 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2652 nodes · 8084 edges · 96 communities (93 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 121 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f011b512`
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
- [[_COMMUNITY_settings.tsx|settings.tsx]]
- [[_COMMUNITY_checkout.ts|checkout.ts]]
- [[_COMMUNITY_sections.tsx|sections.tsx]]
- [[_COMMUNITY_orders.ts|orders.ts]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_cart.tsx|cart.tsx]]
- [[_COMMUNITY_seed-shop.ts|seed-shop.ts]]
- [[_COMMUNITY_wordmark.tsx|wordmark.tsx]]
- [[_COMMUNITY_theme-toggle.tsx|theme-toggle.tsx]]
- [[_COMMUNITY_payment-settings.tsx|payment-settings.tsx]]
- [[_COMMUNITY_site.ts|site.ts]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 159 edges
2. `useToast()` - 116 edges
3. `createAdminClient()` - 116 edges
4. `check()` - 75 edges
5. `must()` - 71 edges
6. `createClient()` - 66 edges
7. `getShopBySlug` - 48 edges
8. `formatPrice()` - 47 edges
9. `shopHref()` - 44 edges
10. `useGestion()` - 40 edges

## Surprising Connections (you probably didn't know these)
- `CapacitesPage()` --calls--> `useToast()`  [EXTRACTED]
  app/admin/(shell)/capacites/page.tsx → components/ui/toast.tsx
- `GET()` --calls--> `fail()`  [INFERRED]
  app/api/sumup/callback/route.ts → lib/shop/validation.ts
- `GenerateurPage()` --calls--> `useClipData()`  [EXTRACTED]
  app/clip/espace/generateur/page.tsx → lib/clip/context.tsx
- `ClipEspaceLayout()` --calls--> `createClient()`  [EXTRACTED]
  app/clip/espace/layout.tsx → lib/supabase/server.ts
- `CollectEtablissementPage()` --calls--> `createClient()`  [EXTRACTED]
  app/collect/inscription/etablissement/page.tsx → lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (96 total, 3 thin omitted)

### Community 0 - "createAdminClient"
Cohesion: 0.23
Nodes (14): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+6 more)

### Community 1 - "shell.tsx"
Cohesion: 0.10
Nodes (41): AdminLockButton(), LockIcon(), listeners, lockAdmin(), read(), subscribe(), unlockAdmin(), useAdminUnlocked() (+33 more)

### Community 2 - "api.ts"
Cohesion: 0.09
Nodes (46): apply(), assertTransition(), assignTable(), createCategory(), createFormule(), createItem(), createStaff(), createStaffOrder() (+38 more)

### Community 3 - "landing-data.ts"
Cohesion: 0.09
Nodes (30): metadata, Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter(), Pricing() (+22 more)

### Community 4 - "clip-landing-data.ts"
Cohesion: 0.10
Nodes (25): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero(), ClipHowItWorks(), ClipPricing() (+17 more)

### Community 5 - "collect-landing-data.ts"
Cohesion: 0.09
Nodes (27): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter() (+19 more)

### Community 6 - "formule-form-modal.tsx"
Cohesion: 0.12
Nodes (30): BadgeagePage(), EquipePage(), PANE_TAGLINES, PaneId, PANES, ROLES, EtablissementPage(), MenuPage() (+22 more)

### Community 7 - "devDependencies"
Cohesion: 0.05
Nodes (40): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+32 more)

### Community 8 - "page.tsx"
Cohesion: 0.11
Nodes (7): FLEET, PILLARS, STEPS, WEEK, ComptesTab, ComptesTabs(), TABS

### Community 9 - "store.ts"
Cohesion: 0.09
Nodes (23): NavItem, NAV_ITEMS, NavItem, signOut(), ApercuIcon(), BellIcon(), ChartIcon(), ChevronDownIcon() (+15 more)

### Community 10 - "api.ts"
Cohesion: 0.27
Nodes (14): ClipDataProvider(), commit(), fetchApi(), getClientSnapshot(), getErrorSnapshot(), getServerSnapshot(), listeners, load() (+6 more)

### Community 11 - "useToast"
Cohesion: 0.05
Nodes (72): Body, ShopOrderPage(), metadata, PackingSlipPage(), CreateShopPage(), metadata, CreateShopForm(), CategoriesManager() (+64 more)

### Community 12 - "types.ts"
Cohesion: 0.07
Nodes (50): CapacitesPage(), openViews(), InvitationForm(), InvitationPage(), Capabilities(), RestaurantPane(), STATUS_CLASSES, StatusBadge() (+42 more)

### Community 13 - "selectors.ts"
Cohesion: 0.08
Nodes (33): ApercuPage(), Period, CuisinierApercu(), ServiceClock(), ServeurApercu(), ServiceClock(), StatCard(), ProfileRow() (+25 more)

### Community 14 - "useGestionAccess"
Cohesion: 0.18
Nodes (8): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, DemoShowcase(), IphoneFrame(), QrCorners(), demoSection, demoSection

### Community 15 - "data.ts"
Cohesion: 0.11
Nodes (23): metadata, DemoBanner(), emptySubscribe(), ClipData, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics(), buildDemoPosts() (+15 more)

### Community 16 - "customer-pane.tsx"
Cohesion: 0.20
Nodes (12): CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView(), TIMELINE, TrackingView(), useNow() (+4 more)

### Community 17 - "upload-post.ts"
Cohesion: 0.13
Nodes (13): providerApiKey(), PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider, ensureProfile(), isClipPlatform(), listConnectedAccounts() (+5 more)

### Community 18 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 19 - "menu-data.ts"
Cohesion: 0.33
Nodes (7): ClientDemoPage(), generateMetadata(), seed(), getRestaurant(), restaurantThemeClass(), db, main()

### Community 20 - "createAdminClient"
Cohesion: 0.11
Nodes (36): POST(), ResolvedLine, resolveOptions(), GET(), GET(), EXTENSIONS, POST(), POST() (+28 more)

### Community 21 - "item-form-modal.tsx"
Cohesion: 0.17
Nodes (23): ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft(), FormuleFormModal() (+15 more)

### Community 22 - "add-to-order.tsx"
Cohesion: 0.29
Nodes (8): AddToOrder(), isUnavailable(), OptionsModal(), CallServerButton(), CallState, CartChoice, cartLineKey(), useCart()

### Community 23 - "page.tsx"
Cohesion: 0.11
Nodes (17): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, CreationComptesPage(), ClipEspaceLayout() (+9 more)

### Community 24 - "types.ts"
Cohesion: 0.05
Nodes (46): FindingsCard(), LeaPage(), percent(), PROSPECT_TILES, TabId, VARIANT_ORDER, VariantCard(), statusColorExpression (+38 more)

### Community 25 - "layout.tsx"
Cohesion: 0.14
Nodes (13): metadata, PortalApproach(), PortalFinalCta(), PARTICLES, PortalHero(), BENTO_SPANS, PortalProducts(), ProductCube() (+5 more)

### Community 26 - "demo-showcase.tsx"
Cohesion: 0.18
Nodes (14): metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), demoSection, CartChoice, CartLinePayload, CollectCheckoutPayload (+6 more)

### Community 27 - "database.types.ts"
Cohesion: 0.13
Nodes (20): POST(), Role, POST(), Product, PRODUCTS_BY_CHOICE, accessToken(), card(), escapeHtml() (+12 more)

### Community 28 - "page.tsx"
Cohesion: 0.14
Nodes (12): generateMetadata(), getRestaurant, MenuPage(), CategoryLink, CategoryNav(), Hero(), PARTICLES, LANGUAGES (+4 more)

### Community 29 - "constants.ts"
Cohesion: 0.06
Nodes (80): ActivityInput, addActivity(), apply(), availableSlug(), completeTask(), createAppointment(), createRestaurant(), createTask() (+72 more)

### Community 30 - "provider.tsx"
Cohesion: 0.08
Nodes (56): GET(), ShopSettingsPage(), ShopCustomersPage(), ShopDiscountsPage(), FILTERS, ShopOrdersPage(), ShopContentPage(), metadata (+48 more)

### Community 31 - "formatPrice"
Cohesion: 0.09
Nodes (34): metadata, ChimeCard(), DevicesCard(), DeviceStatusCard(), IOS_STEPS, PrefsCard(), GestionShell(), armedListeners (+26 more)

### Community 32 - "shared.ts"
Cohesion: 0.16
Nodes (21): GET(), stateCookie(), GET(), POST(), POST(), POST(), POST(), confirmOrderPaid() (+13 more)

### Community 33 - "order-card.tsx"
Cohesion: 0.07
Nodes (45): DayGroup, dedupeById(), displayMode(), groupByDay(), matchesMode(), MODE_FILTERS, ModeFilter, PaiementsPage() (+37 more)

### Community 34 - "public-menu.ts"
Cohesion: 0.36
Nodes (6): ConfirmationPage(), metadata, CollectPage(), generateMetadata(), getPage, fetchRestaurant()

### Community 36 - "page.tsx"
Cohesion: 0.10
Nodes (12): metadata, metadata, metadata, metadata, InscriptionTabs(), Profile, TABS, metadata (+4 more)

### Community 37 - "layout.tsx"
Cohesion: 0.08
Nodes (35): ArrowRightIcon(), BotIcon(), CalendarIcon(), ChartIcon(), ClockIcon(), CrosshairIcon(), GlobeIcon(), MailIcon() (+27 more)

### Community 38 - "stage.tsx"
Cohesion: 0.08
Nodes (30): EmailsRedirect(), Analysis, ImportPage(), ParsedRow, Phase, RowStatus, STATUS_META, COLUMNS (+22 more)

### Community 39 - "seed-demo.ts"
Cohesion: 0.16
Nodes (21): metadata, AdminShell(), sectionOf(), fetchAllSlugs(), importRestaurants(), commit(), fetchAll(), fetchLeads() (+13 more)

### Community 40 - "Verifying the Ominin frontend"
Cohesion: 0.40
Nodes (4): Drive (Playwright), Gotchas, Launch, Verifying the Ominin frontend

### Community 41 - "comparison.tsx"
Cohesion: 0.17
Nodes (15): ProduitsPage(), CheckIcon(), ExternalLinkIcon(), SubscriptionGate(), DiscoverLink(), Pill(), ProductCard(), ROLE_TAGLINES (+7 more)

### Community 42 - "next.config.ts"
Cohesion: 0.40
Nodes (4): csp, nextConfig, securityHeaders, supabaseOrigins

### Community 43 - "README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 45 - "loading.tsx"
Cohesion: 0.13
Nodes (19): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), requestLinkUrl() (+11 more)

### Community 48 - "format.ts"
Cohesion: 0.09
Nodes (41): ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, RestaurantsPage(), TabId, TachesPage() (+33 more)

### Community 49 - "server.ts"
Cohesion: 0.08
Nodes (57): AboutPage(), metadata, CatalogPage(), generateMetadata(), ConfirmationPage(), CheckoutPage(), metadata, AccountOrderPage() (+49 more)

### Community 50 - "lead-cache.ts"
Cohesion: 0.23
Nodes (12): invalid(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, CONTACT_LIMITS, ContactField (+4 more)

### Community 51 - "theme-toggle.tsx"
Cohesion: 0.09
Nodes (30): fetchAppointments(), fetchLatestResearchRun(), fetchOutreachEmails(), fetchOutreachProspects(), fetchOutreachRuns(), fetchOutreachStats(), fetchOutreachVariants(), findDuplicates() (+22 more)

### Community 52 - "filter-bar.tsx"
Cohesion: 0.10
Nodes (29): CartePage(), MapCanvas, FilterBar(), FilterIcon(), SearchIcon(), NO_CONTACT_OPTIONS, countActiveFilters(), emptyFilters() (+21 more)

### Community 53 - "route.ts"
Cohesion: 0.06
Nodes (49): allura, cormorant, dmSans, dmSerif, FONT_VARIABLES, generateMetadata(), inter, montserrat (+41 more)

### Community 54 - "must"
Cohesion: 0.24
Nodes (7): CartLine, cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), SelectedChoice, isItemAvailable()

### Community 55 - "page.tsx"
Cohesion: 0.10
Nodes (26): PublierPage(), PublicationsPage(), TeamManager(), EtablissementForm(), View, NoteComposer, CreateRestaurantModal(), DUPLICATE_REASON_LABELS (+18 more)

### Community 56 - "wordmark.tsx"
Cohesion: 0.07
Nodes (53): approveOutreachEmail(), fetchProspectCounts(), promoteVariant(), rejectOutreachEmail(), updateImportantNotes(), updateOutreachDraft(), updateVariantStatus(), payOrderItems() (+45 more)

### Community 57 - "proxy.ts"
Cohesion: 0.33
Nodes (5): config, matchesPath(), ProductConfig, PRODUCTS, proxy()

### Community 58 - "collectOffer"
Cohesion: 0.17
Nodes (16): POST(), ComptesPage(), LinkIcon(), PlatformBadge(), PostCard(), STATUS_CLASSES, captionsSchema(), generateCaptions() (+8 more)

### Community 59 - "layout.tsx"
Cohesion: 0.15
Nodes (9): CollectSignupForm(), CollectEtablissementPage(), metadata, OnboardingForm(), RESERVED_SLUGS, metadata, OnboardingPage(), StaffPending() (+1 more)

### Community 60 - "section-heading.tsx"
Cohesion: 0.10
Nodes (26): CallBody, POST(), POST(), POST(), parseProducts(), POST(), Product, upsertSubscription() (+18 more)

### Community 64 - "provider.tsx"
Cohesion: 0.20
Nodes (13): buildDemoMenu(), COLLECT_DEMO, DEMO_MENU_SPEC, DemoMenuSection, demoRestaurantInfo, DemoStep, CollectDemoContext, CollectDemoProvider() (+5 more)

### Community 65 - "page.tsx"
Cohesion: 0.06
Nodes (45): metadata, metadata, LegalPage(), PAGES, metadata, TrackingPage(), AlertIcon(), InfoIcon() (+37 more)

### Community 66 - "photo.ts"
Cohesion: 0.13
Nodes (20): BADGE, DeviceCard(), DOT_CLASS, Editing, Health, LinkState, PrinterCard(), printerHealth() (+12 more)

### Community 67 - "shell.tsx"
Cohesion: 0.31
Nodes (6): Dropzone(), formatSize(), CheckIcon(), ListIcon(), UploadIcon(), ACCEPTED_VIDEO_TYPES

### Community 68 - "createAdminClient"
Cohesion: 0.06
Nodes (38): AccountPage(), metadata, SignOutButton(), metadata, ImageUploader(), UploadedImage, OptionLinkDraft, NAV_ITEMS (+30 more)

### Community 69 - "site.ts"
Cohesion: 0.12
Nodes (11): fraunces, instrumentSans, metadata, viewport, MENU_PATHS, Providers(), Choice, CookieConsent() (+3 more)

### Community 70 - "page.tsx"
Cohesion: 0.09
Nodes (42): ActivitePage(), ClientsPage(), PERIOD_TABS, ClientDetail(), isView(), PERIOD_TABS, BarPoint, BarSeries() (+34 more)

### Community 71 - "useLanguage"
Cohesion: 0.17
Nodes (16): metadata, ContactForm(), Status, PortalFooter(), LanguageToggle(), PortalNav(), SurMesure(), buildLabel (+8 more)

### Community 72 - "lead-card.tsx"
Cohesion: 0.10
Nodes (40): GET(), stateCookie(), GET(), PATCH(), POST(), Line, POST(), tenderPaymentId() (+32 more)

### Community 73 - "cart-bar.tsx"
Cohesion: 0.12
Nodes (14): CartBar(), PaymentChoice, SubmitState, TIP_PERCENTS, TipChoice, PaymentState, SquareCard, SquarePayment() (+6 more)

### Community 74 - "language.tsx"
Cohesion: 0.23
Nodes (11): Language, LANGUAGES, Localized, isLanguage(), LanguageContext, LanguageProvider(), LanguageValue, listeners (+3 more)

### Community 75 - "seed-crm.ts"
Cohesion: 0.12
Nodes (15): TablesInsert, Category, daysAgo(), daysAhead(), db, LeadStatus, main(), Priority (+7 more)

### Community 76 - "portal-data.ts"
Cohesion: 0.11
Nodes (34): BadgeagesLog(), CorrectionModal(), localInput(), Action, ACTION_LABELS, MonPlanning(), PlanningEquipe(), PlanningGrid() (+26 more)

### Community 77 - "route.ts"
Cohesion: 0.36
Nodes (9): confirmFormHtml(), DONE_HTML, GET(), LEAD_DEMOTABLE_FROM, PAGE_SHELL(), params(), POST(), unsubscribe() (+1 more)

### Community 78 - "client.ts"
Cohesion: 0.38
Nodes (3): loadPrefs(), requireUser(), savePrefs()

### Community 79 - "stage.tsx"
Cohesion: 0.32
Nodes (4): DemoHint(), Side, BrowserFrame(), nextActionSide()

### Community 80 - "qr-showcase.tsx"
Cohesion: 0.50
Nodes (3): QrLive(), QrShowcase(), qrShowcase

### Community 81 - "collectOffer"
Cohesion: 0.25
Nodes (6): shopOffer, Plan, plans, shopPlans, stripe, zeroPriced

### Community 84 - "settings.tsx"
Cohesion: 0.13
Nodes (32): ShopLayout(), ProductActiveToggle(), Section, ThemeEditor(), CheckCircleIcon(), CircleDashedIcon(), RefreshIcon(), addressBlock() (+24 more)

### Community 85 - "checkout.ts"
Cohesion: 0.14
Nodes (24): POST(), POST(), POST(), Admin, createCheckoutSession(), priceItems(), validateDiscountCode(), computeDiscount() (+16 more)

### Community 86 - "sections.tsx"
Cohesion: 0.12
Nodes (24): metadata, ShopNav(), ShopFaq(), ShopFeatures(), ShopFinalCta(), ShopFooter(), ShopHero(), ShopHowItWorks() (+16 more)

### Community 87 - "orders.ts"
Cohesion: 0.16
Nodes (22): POST(), POST(), POST(), POST(), loadOrder(), base64url(), buildRawMessage(), encodeSubject() (+14 more)

### Community 88 - "page.tsx"
Cohesion: 0.11
Nodes (19): CommandesPage(), dedupeById(), EMPTY_BODIES, FilterId, FILTERS, matchesFilter(), CartLine, CreateOrderDialog() (+11 more)

### Community 89 - "page.tsx"
Cohesion: 0.14
Nodes (8): GenerateurPage(), MOMENTS, STEPS, PublierTab, PublierTabs(), TABS, SubTab, SubTabs()

### Community 90 - "cart.tsx"
Cohesion: 0.23
Nodes (11): MenuStage, STAGE_RANK, createTracker(), MenuTracker, readSession(), TrackOptions, CartConfig, CartContext (+3 more)

### Community 91 - "seed-shop.ts"
Cohesion: 0.19
Nodes (14): isPhoneLoginEmail(), loginEmailFor(), looksLikePhone(), normalizePhone(), phoneToLoginEmail(), CATEGORIES, db, FAQ (+6 more)

### Community 92 - "wordmark.tsx"
Cohesion: 0.20
Nodes (5): metadata, metadata, ClipLoader(), ClipNav(), ClipWordmark()

### Community 93 - "theme-toggle.tsx"
Cohesion: 0.24
Nodes (4): metadata, LandingNav(), ShopLoginForm(), ThemeToggle()

### Community 94 - "payment-settings.tsx"
Cohesion: 0.22
Nodes (6): NO_SQUARE, NO_STRIPE, Provider, SquareLocation, SquareStatus, StripeStatus

### Community 95 - "site.ts"
Cohesion: 0.38
Nodes (3): PRIVATE_PATHS, sitemap(), siteUrl

## Knowledge Gaps
- **425 isolated node(s):** `MapCanvas`, `PERIOD_TABS`, `PERIOD_TABS`, `RowStatus`, `ParsedRow` (+420 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `wordmark.tsx` to `shell.tsx`, `api.ts`, `formule-form-modal.tsx`, `store.ts`, `api.ts`, `types.ts`, `constants.ts`, `page.tsx`, `layout.tsx`, `seed-demo.ts`, `format.ts`, `theme-toggle.tsx`, `layout.tsx`, `page.tsx`, `createAdminClient`, `page.tsx`, `cart-bar.tsx`, `portal-data.ts`, `client.ts`, `theme-toggle.tsx`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `useToast()` connect `page.tsx` to `shell.tsx`, `formule-form-modal.tsx`, `useToast`, `types.ts`, `selectors.ts`, `item-form-modal.tsx`, `types.ts`, `provider.tsx`, `formatPrice`, `order-card.tsx`, `layout.tsx`, `stage.tsx`, `format.ts`, `collectOffer`, `photo.ts`, `createAdminClient`, `page.tsx`, `portal-data.ts`, `settings.tsx`, `page.tsx`, `payment-settings.tsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `createAdminClient` to `createAdminClient`, `shared.ts`, `page.tsx`, `lead-card.tsx`, `route.ts`, `server.ts`, `lead-cache.ts`, `checkout.ts`, `orders.ts`, `database.types.ts`, `section-heading.tsx`, `provider.tsx`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `must()` (e.g. with `fetchClients()` and `fetchFeed()`) actually correct?**
  _`must()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MapCanvas`, `PERIOD_TABS`, `PERIOD_TABS` to the rest of the system?**
  _425 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `shell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09595959595959595 - nodes in this community are weakly interconnected._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09308510638297872 - nodes in this community are weakly interconnected._
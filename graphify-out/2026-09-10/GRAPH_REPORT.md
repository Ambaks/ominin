# Graph Report - ominin  (2026-09-10)

## Corpus Check
- 609 files · ~1,683,399 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3345 nodes · 9917 edges · 150 communities (130 shown, 12 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 192 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b4c5c2e0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- equipe/page.tsx
- admin.ts
- landing-data.ts
- gestion/store.ts
- collect-landing-data.ts
- scripts
- gestion/selectors.ts
- react
- admin/store.ts
- sumup/server.ts
- square/server.ts
- clip/context.tsx
- menu/gestion/produits/page.tsx
- stage.tsx
- What You Must Do When Invoked
- ui.tsx
- clip/demo/data.ts
- clip-landing-data.ts
- metrics.ts
- compilerOptions
- upload-post.ts
- api/contact/route.ts
- database.types.ts
- Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)
- notifications/page.tsx
- gestion/constants.ts
- espace/comptes/creation/page.tsx
- managers.tsx
- createAdminClient
- boho/profile.json
- proxy.ts
- app/page.tsx
- lead-cache.ts
- brand/wordmark.tsx
- collect-experience.tsx
- Setup guide (written for an LLM agent)
- Ominin
- m/[slug]/page.tsx
- What you must do when invoked
- admin/api.ts
- graphify reference: extra exports and benchmark
- clip/store.ts
- graphify reference: query, path, explain
- /marwan
- eslint.config.mjs
- Verifying the Ominin frontend
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- next.config.ts
- frontend/README.md
- .claude/CLAUDE.md
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- package.json
- .claude/skills/graphify/references/extraction-spec.md
- frontend/AGENTS.md
- getCurrentUser
- postcss.config.mjs
- backend
- [slug]/layout.tsx
- _template/profile.json
- item-form-modal.tsx
- temps.ts
- shop/checkout.ts
- shop/server.ts
- lead-panel.tsx
- ui/toast.tsx
- espace/shell.tsx
- MenuPage
- services/autoresearch.py
- carte/page.tsx
- Bridge
- shared.ts
- collect/checkout/route.ts
- admin/constants.ts
- square-payment.tsx
- useAdmin
- collect/demo/provider.tsx
- gestion/api.ts
- portal-data.ts
- dependencies
- shop/icons.tsx
- devDependencies
- getRestaurant
- menu-data.ts
- createClient
- must
- invite/route.ts
- admin-lock-button.tsx
- provider/types.ts
- admin/format.ts
- shop/constants.ts
- qr-showcase.tsx
- useToast
- portal/hero.tsx
- What you must do when invoked
- push/server.ts
- restaurants/page.tsx
- espace/analytique/page.tsx
- gestion/types.ts
- tickets.py
- desinscription/route.ts
- clip/constants.ts
- components/gestion/shell.tsx
- import/page.tsx
- orders.ts
- createClient
- services/inbox.py
- gmail.py
- shop-landing-data.ts
- agent.py
- outreach.py
- omilink
- enrichment.py
- discovery.py
- terminaux/page.tsx
- get_supabase
- golden-image.sh
- getShopBySlug
- useLanguage
- What You Must Do When Invoked
- app/layout.tsx
- validation.ts
- seed-shop.ts
- menu/cart.tsx
- language.tsx
- Ominin
- What you must do when invoked
- What you must do when invoked
- payment-settings.tsx
- graphify reference: extra exports and benchmark
- site.ts
- graphify reference: query, path, explain
- /marwan
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- Tâches manuelles
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- .agents/skills/graphify/references/extraction-spec.md

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 179 edges
2. `react` - 147 edges
3. `useToast()` - 120 edges
4. `createAdminClient()` - 116 edges
5. `check()` - 79 edges
6. `must()` - 74 edges
7. `createClient()` - 67 edges
8. `formatPrice()` - 53 edges
9. `next` - 53 edges
10. `getShopBySlug` - 49 edges

## Surprising Connections (you probably didn't know these)
- `FindingsCard()` --calls--> `formatDayTime()`  [EXTRACTED]
  frontend/app/admin/(shell)/lea/page.tsx → frontend/lib/admin/format.ts
- `GET()` --calls--> `createAdminClient()`  [EXTRACTED]
  frontend/app/api/collect/order/route.ts → frontend/lib/supabase/admin.ts
- `Body` --references--> `ShopOrderStatus`  [EXTRACTED]
  frontend/app/api/shop/gestion/orders/route.ts → frontend/lib/shop/types.ts
- `AnalytiquePage()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/analytique/page.tsx → frontend/lib/clip/context.tsx
- `PostAnalyticsList()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/analytique/page.tsx → frontend/lib/clip/context.tsx

## Import Cycles
- None detected.

## Communities (150 total, 12 thin omitted)

### Community 0 - "equipe/page.tsx"
Cohesion: 0.11
Nodes (35): PERIOD_TABS, BadgeagePage(), CommandesPage(), dedupeById(), EMPTY_BODIES, matchesFilter(), EquipePage(), PANE_TAGLINES (+27 more)

### Community 1 - "admin.ts"
Cohesion: 0.23
Nodes (15): GET(), GET(), POST(), GET(), POST(), GET(), POST(), SIGNED_URL_TTL_SECONDS (+7 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.06
Nodes (45): metadata, DemoShowcase(), Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter() (+37 more)

### Community 3 - "gestion/store.ts"
Cohesion: 0.16
Nodes (26): AdminLockButton(), HISTORY_ORDER_STATUSES, HISTORY_PAGE_SIZE, OPEN_ORDER_STATUSES, PAID_ORDER_STATUSES, rowToEtablissement(), rowToMember(), rowToTable() (+18 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.08
Nodes (31): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter() (+23 more)

### Community 5 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, dev, lint, prebuild, predev, seed:crm, seed:demo (+5 more)

### Community 6 - "gestion/selectors.ts"
Cohesion: 0.08
Nodes (44): ApercuPage(), Period, RevenueChart(), TopVentesChart(), DayGroup, dedupeById(), displayMode(), groupByDay() (+36 more)

### Community 7 - "react"
Cohesion: 0.13
Nodes (16): CollectSignupForm(), slugify(), OnboardingForm(), RESERVED_SLUGS, slugify(), CollectSettings(), ProfileRow(), TabletSettings() (+8 more)

### Community 8 - "admin/store.ts"
Cohesion: 0.20
Nodes (20): fetchAppointments(), rowToAppointment(), commit(), fetchAll(), fetchLeads(), fetchOpenTasks(), fetchPendingDraftCount(), fetchUpcomingAppointments() (+12 more)

### Community 9 - "sumup/server.ts"
Cohesion: 0.16
Nodes (22): GET(), stateCookie(), GET(), POST(), POST(), POST(), POST(), confirmOrderPaid() (+14 more)

### Community 10 - "square/server.ts"
Cohesion: 0.10
Nodes (42): GET(), stateCookie(), GET(), PATCH(), POST(), Line, orderBody(), POST() (+34 more)

### Community 11 - "clip/context.tsx"
Cohesion: 0.14
Nodes (22): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), replacePost() (+14 more)

### Community 12 - "menu/gestion/produits/page.tsx"
Cohesion: 0.15
Nodes (19): ProduitsPage(), CheckIcon(), ExternalLinkIcon(), SubscriptionGate(), cardClass, DiscoverLink(), eyebrowClass, Pill() (+11 more)

### Community 13 - "stage.tsx"
Cohesion: 0.12
Nodes (19): CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView(), TIMELINE, TrackingView(), useNow() (+11 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "ui.tsx"
Cohesion: 0.07
Nodes (46): metadata, TrackingPage(), AlertIcon(), CheckCircleIcon(), InfoIcon(), SearchIcon(), CheckoutFormProps, ShopContext (+38 more)

### Community 16 - "clip/demo/data.ts"
Cohesion: 0.11
Nodes (25): metadata, DemoBanner(), emptySubscribe(), ClipData, ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics() (+17 more)

### Community 17 - "clip-landing-data.ts"
Cohesion: 0.08
Nodes (30): metadata, ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter() (+22 more)

### Community 18 - "metrics.ts"
Cohesion: 0.08
Nodes (48): ActivitePage(), load(), ClientsPage(), ClientDetail(), isView(), PERIOD_TABS, BarPoint, BarSeries() (+40 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "upload-post.ts"
Cohesion: 0.12
Nodes (16): PROVIDER_API_URL, PROVIDER_TIMEOUT_MS, providerApiKey(), PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider, ensureProfile() (+8 more)

### Community 21 - "api/contact/route.ts"
Cohesion: 0.23
Nodes (12): invalid(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, CONTACT_LIMITS, ContactField (+4 more)

### Community 22 - "database.types.ts"
Cohesion: 0.09
Nodes (27): isTerminal(), POST(), Product, PRODUCTS_BY_CHOICE, CompositeTypes, Constants, Database, DatabaseWithoutInternals (+19 more)

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "notifications/page.tsx"
Cohesion: 0.14
Nodes (25): DevicesCard(), DeviceStatusCard(), IOS_STEPS, PrefsCard(), PushPrompt(), PUSH_PROMPT_DISMISSED_KEY, currentEndpoint(), deviceLabel() (+17 more)

### Community 25 - "gestion/constants.ts"
Cohesion: 0.08
Nodes (45): CapacitesPage(), openViews(), metadata, Capabilities(), OrderCard(), STATUS_CLASSES, StatusBadge(), NavItem (+37 more)

### Community 26 - "espace/comptes/creation/page.tsx"
Cohesion: 0.06
Nodes (18): CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, ComptesPage(), GenerateurPage(), MOMENTS (+10 more)

### Community 27 - "managers.tsx"
Cohesion: 0.11
Nodes (33): CreateShopForm(), ImageUploader(), UploadedImage, CategoriesManager(), DiscountDraft, DiscountManager(), FaqManager(), ShippingDraft (+25 more)

### Community 28 - "createAdminClient"
Cohesion: 0.08
Nodes (42): POST(), GET(), EXTENSIONS, POST(), POST(), DELETE(), GET(), POST() (+34 more)

### Community 29 - "boho/profile.json"
Cohesion: 0.06
Nodes (31): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+23 more)

### Community 30 - "proxy.ts"
Cohesion: 0.36
Nodes (7): config, matchesPath(), ProductConfig, PRODUCTS, proxy(), rewritePrefixFor(), @supabase/ssr

### Community 31 - "app/page.tsx"
Cohesion: 0.16
Nodes (11): metadata, PortalApproach(), PortalFinalCta(), PortalFooter(), BENTO_SPANS, PortalProducts(), ProductCube(), Reveal() (+3 more)

### Community 32 - "lead-cache.ts"
Cohesion: 0.13
Nodes (36): addActivity(), apply(), byDue(), completeTask(), createAppointment(), createTask(), fetchExportRows(), findLite() (+28 more)

### Community 34 - "brand/wordmark.tsx"
Cohesion: 0.08
Nodes (14): metadata, metadata, metadata, metadata, metadata, metadata, InscriptionTabs(), Profile (+6 more)

### Community 35 - "collect-experience.tsx"
Cohesion: 0.20
Nodes (13): CartLine, cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), lineKey(), lineUnitPrice(), SelectedChoice (+5 more)

### Community 36 - "Setup guide (written for an LLM agent)"
Cohesion: 0.15
Nodes (12): 1. Prerequisites, 2. Frontend, 3. Backend, 4. Supabase (database & auth), 5. Graphify (knowledge-graph CLI), 6. Project skills (nothing to install), 7. Outreach agent « Léa » (one-time setup, human-only), 8. Final checklist (+4 more)

### Community 37 - "Ominin"
Cohesion: 0.18
Nodes (10): Business constraints, Code quality, Commands, Conventions, graphify, Ominin, Repo structure, Stack (+2 more)

### Community 38 - "m/[slug]/page.tsx"
Cohesion: 0.08
Nodes (25): generateMetadata(), getRestaurant, MenuPage(), revalidate, CallServerButton(), CallState, CartBar(), PaymentChoice (+17 more)

### Community 39 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): /commit, Execution requirement, Step 1 — Understand what changed, Step 2 — Project upkeep (required before every push), Step 3 — Safety checks, Step 4 — Write the commit message, Step 5 — Commit and push, Step 6 — Report back (+1 more)

### Community 40 - "admin/api.ts"
Cohesion: 0.08
Nodes (51): ActivityInput, AppointmentInput, availableSlug(), createRestaurant(), DuplicateCandidate, ExportRow, fetchAllSlugs(), fetchLatestResearchRun() (+43 more)

### Community 41 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 42 - "clip/store.ts"
Cohesion: 0.26
Nodes (14): POSTS_PAGE_SIZE, ClipDataProvider(), fetchApi(), getClientSnapshot(), getErrorSnapshot(), getServerSnapshot(), listeners, load() (+6 more)

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
Cohesion: 0.40
Nodes (4): csp, nextConfig, securityHeaders, supabaseOrigins

### Community 51 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 52 - ".claude/CLAUDE.md"
Cohesion: 0.50
Nodes (3): commit, graphify, new-restaurant

### Community 55 - "package.json"
Cohesion: 0.12
Nodes (16): name, private, version, @anthropic-ai/sdk, eslint, eslint-config-next, react-dom, tailwindcss (+8 more)

### Community 58 - "getCurrentUser"
Cohesion: 0.11
Nodes (23): POST(), CheckoutPage(), metadata, AccountOrderPage(), metadata, AccountOrdersPage(), metadata, AccountMessagesPage() (+15 more)

### Community 63 - "[slug]/layout.tsx"
Cohesion: 0.06
Nodes (42): allura, cormorant, dmSans, dmSerif, FONT_VARIABLES, generateMetadata(), inter, montserrat (+34 more)

### Community 64 - "_template/profile.json"
Cohesion: 0.06
Nodes (30): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+22 more)

### Community 65 - "item-form-modal.tsx"
Cohesion: 0.17
Nodes (27): ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft(), FormuleFormModal() (+19 more)

### Community 67 - "temps.ts"
Cohesion: 0.10
Nodes (48): metadata, PlanningPage(), PlanningPayload, BadgeagesLog(), Action, ACTION_LABELS, Badgeuse(), dayLabel() (+40 more)

### Community 68 - "shop/checkout.ts"
Cohesion: 0.20
Nodes (15): POST(), absoluteImage(), Admin, createCheckoutSession(), PricedItem, priceItems(), validateDiscountCode(), CHECKOUT_EXPIRES_MINUTES (+7 more)

### Community 69 - "shop/server.ts"
Cohesion: 0.07
Nodes (36): ShopSettingsPage(), AccountConversationPage(), metadata, LegalPage(), PAGES, CustomerReplyForm(), MessageBubbles(), ProductGallery() (+28 more)

### Community 70 - "lead-panel.tsx"
Cohesion: 0.08
Nodes (42): metadata, ArrowRightIcon(), CalendarIcon(), ChartIcon(), ClockIcon(), FilterIcon(), GlobeIcon(), MailIcon() (+34 more)

### Community 71 - "ui/toast.tsx"
Cohesion: 0.16
Nodes (17): View, FormuleCard(), EditIcon(), TrashIcon(), MenuItemCard(), CorrectionModal(), localInput(), SignaturePad() (+9 more)

### Community 72 - "espace/shell.tsx"
Cohesion: 0.12
Nodes (18): ClipEspaceLayout(), metadata, Dropzone(), formatSize(), CheckIcon(), LinkIcon(), ListIcon(), UploadIcon() (+10 more)

### Community 73 - "MenuPage"
Cohesion: 0.33
Nodes (6): MenuPage(), deleteFormule(), updateCategoryTagline(), loadItemRoutingMap(), loadPrinters(), setItemPrinter()

### Community 74 - "services/autoresearch.py"
Cohesion: 0.13
Nodes (25): _credentials_env(), _parse(), parse_structured(), The Agent SDK spawns a Claude Code subprocess that authenticates from the…, Single-turn, tool-less Claude call returning schema-validated output. Sync on…, AnalysisFindings, ProposedVariant, ProspectScore (+17 more)

### Community 75 - "carte/page.tsx"
Cohesion: 0.22
Nodes (15): CartePage(), MapLeadCard(), CrosshairIcon(), GEOLOCATION_TIMEOUT_MS, formatDay(), getSnapshot(), isWatching(), listeners (+7 more)

### Community 76 - "Bridge"
Cohesion: 0.14
Nodes (13): BaseSettings, Settings, Bridge, ensure_token(), main(), Client, Boucle Omilink. Un boîtier neuf génère son jeton, n'en confie que l'empreinte…, Hôtes du réseau local répondant sur le port des imprimantes. (+5 more)

### Community 77 - "shared.ts"
Cohesion: 0.12
Nodes (22): GET(), metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), isTerminal(), OrderConfirmation(), STATUS_COPY (+14 more)

### Community 78 - "collect/checkout/route.ts"
Cohesion: 0.22
Nodes (11): POST(), ResolvedLine, resolveOptions(), CollectPage(), generateMetadata(), getPage, revalidate, isCollectActive() (+3 more)

### Community 79 - "admin/constants.ts"
Cohesion: 0.04
Nodes (67): MapCanvas, EmailTable(), FindingsCard(), hostOf(), percent(), PROSPECT_TILES, ProspectsPanel(), scoreColor() (+59 more)

### Community 80 - "square-payment.tsx"
Cohesion: 0.33
Nodes (6): loadSdk(), PaymentState, SquareCard, SquarePayment(), SquarePayments, Window

### Community 81 - "useAdmin"
Cohesion: 0.32
Nodes (10): FollowUpChoice, VisitedFlow(), AppointmentFormModal(), RestaurantPicker(), TaskFormModal(), fromDatetimeLocalValue(), toDatetimeLocalValue(), capturePosition() (+2 more)

### Community 82 - "collect/demo/provider.tsx"
Cohesion: 0.11
Nodes (13): buildDemoMenu(), COLLECT_DEMO, DEMO_MENU_SPEC, DemoMenuSection, demoRestaurantInfo, DemoStep, CollectDemoContext, CollectDemoProvider() (+5 more)

### Community 83 - "gestion/api.ts"
Cohesion: 0.07
Nodes (64): CategoryManager(), serviceTitle(), TableSheet(), StaffModal(), apply(), assertTransition(), assignTable(), createCategory() (+56 more)

### Community 84 - "portal-data.ts"
Cohesion: 0.23
Nodes (9): unsplash(), brand, buildLabel, footer, languageToggle, nav, openLabel, portalHost (+1 more)

### Community 85 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+4 more)

### Community 86 - "shop/icons.tsx"
Cohesion: 0.07
Nodes (37): AccountPage(), metadata, SignOutButton(), ContactPage(), metadata, isActive(), NAV_ITEMS, NavItem (+29 more)

### Community 87 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx, @types/node, @types/qrcode (+4 more)

### Community 88 - "getRestaurant"
Cohesion: 0.29
Nodes (9): ClientDemoPage(), generateMetadata(), ConfirmationPage(), metadata, assembleCategories(), getRestaurant(), restaurantThemeClass(), applyTarifs() (+1 more)

### Community 89 - "menu-data.ts"
Cohesion: 0.11
Nodes (17): AddToOrder(), choiceRowClass(), isUnavailable(), OptionsModal(), DishCard(), FeaturedCard(), MenuSection(), CartChoice (+9 more)

### Community 90 - "createClient"
Cohesion: 0.07
Nodes (57): LeaPage(), SignOutButton(), StaffPending(), OrderTabsCard(), approveOutreachEmail(), fetchOutreachProspects(), fetchOutreachRuns(), fetchOutreachStats() (+49 more)

### Community 91 - "must"
Cohesion: 0.24
Nodes (12): findDuplicates(), createPriceRule(), priceRuleColumns(), replaceTargets(), updateCashDetails(), updatePriceRule(), voidCashPayment(), rowToOrder() (+4 more)

### Community 92 - "invite/route.ts"
Cohesion: 0.31
Nodes (11): RFC-2047, POST(), Role, accessToken(), card(), escapeHtml(), mailConfig(), ROLE_LABELS (+3 more)

### Community 93 - "admin-lock-button.tsx"
Cohesion: 0.39
Nodes (7): listeners, lockAdmin(), read(), subscribe(), unlockAdmin(), useAdminUnlocked(), write()

### Community 94 - "provider/types.ts"
Cohesion: 0.20
Nodes (10): POST(), PublierPage(), CaptionEditor(), CAPTION_CONTEXT_MAX_CHARS, captionsSchema(), generateCaptions(), ClipUploadInput, CaptionSet (+2 more)

### Community 95 - "admin/format.ts"
Cohesion: 0.15
Nodes (28): EmailsRedirect(), ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, TachesPage() (+20 more)

### Community 96 - "shop/constants.ts"
Cohesion: 0.06
Nodes (68): ShopCustomersPage(), ShopDiscountsPage(), ShopOrderPage(), FILTERS, ShopOrdersPage(), ShopContentPage(), ShopShippingPage(), ShopConversationPage() (+60 more)

### Community 97 - "qr-showcase.tsx"
Cohesion: 0.40
Nodes (4): QrLive(), QrShowcase(), qrShowcase, qrcode

### Community 99 - "useToast"
Cohesion: 0.16
Nodes (16): EtablissementForm(), NoteComposer, ServirPanel(), ProductActiveToggle(), Section, StripePanel(), SubscriptionPanel(), ThemeEditor() (+8 more)

### Community 101 - "portal/hero.tsx"
Cohesion: 0.50
Nodes (3): PARTICLES, PortalHero(), hero

### Community 102 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): Important notes, /new-restaurant, Phase 1 — Intake, Phase 2 — Research, Phase 3 — Verify with user, Phase 4 — Build the demo profile, Phase 5 — Summary, Updating an existing profile (+1 more)

### Community 103 - "push/server.ts"
Cohesion: 0.12
Nodes (22): CallBody, POST(), POST(), POST(), CALL_THROTTLE_MS, DispatchBody, PUSH_EVENT_HINTS, PUSH_EVENT_LABELS (+14 more)

### Community 105 - "restaurants/page.tsx"
Cohesion: 0.09
Nodes (35): COLUMNS, exportColumns(), RestaurantsPage(), FilterBar(), toggleInSet(), StatusMenu(), ALL_COLUMNS, PipelineBoard() (+27 more)

### Community 106 - "espace/analytique/page.tsx"
Cohesion: 0.11
Nodes (13): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, RefreshIcon(), ClipLoader() (+5 more)

### Community 109 - "gestion/types.ts"
Cohesion: 0.10
Nodes (29): EncaisserCard(), EncaisserPanel(), sumLines(), sumUnits(), toSelection(), Unit, unitsOf(), CheckMark() (+21 more)

### Community 110 - "tickets.py"
Cohesion: 0.36
Nodes (11): _group_by_category(), _line(), _local(), datetime, Tickets rendus en ESC/POS. Omilink envoie ces octets tels quels à l'imprimante…, Group items by category name, sorted by category position., _render_items(), render_job() (+3 more)

### Community 113 - "desinscription/route.ts"
Cohesion: 0.31
Nodes (10): RFC-8058, confirmFormHtml(), DONE_HTML, GET(), LEAD_DEMOTABLE_FROM, PAGE_SHELL(), params(), POST() (+2 more)

### Community 116 - "clip/constants.ts"
Cohesion: 0.23
Nodes (9): PublicationsPage(), PlatformBadge(), PostCard(), STATUS_CLASSES, PLATFORM_LABELS, POLL_INTERVAL_MS, POLL_TIMEOUT_MS, STATUS_LABELS (+1 more)

### Community 121 - "components/gestion/shell.tsx"
Cohesion: 0.08
Nodes (33): metadata, ChimeCard(), ApercuIcon(), BellIcon(), ChevronDownIcon(), ClockIcon(), CommandesIcon(), GearIcon() (+25 more)

### Community 123 - "import/page.tsx"
Cohesion: 0.14
Nodes (17): RFC-4180, Analysis, ImportPage(), parseCoordinate(), ParsedRow, Phase, RowStatus, STATUS_META (+9 more)

### Community 125 - "orders.ts"
Cohesion: 0.12
Nodes (41): POST(), Body, POST(), STATUS_MESSAGES, POST(), POST(), ORDER_STATUS_FLOW, base64url() (+33 more)

### Community 145 - "createClient"
Cohesion: 0.11
Nodes (21): GET(), CollectEtablissementPage(), metadata, InvitationForm(), InvitationPage(), OnboardingPage(), metadata, ShopGestionLayout() (+13 more)

### Community 146 - "services/inbox.py"
Cohesion: 0.14
Nodes (23): BaseSettings, Settings, InboxVerdict, BaseModel, daily_cold_count(), log_email_activity(), Cold emails already sent today, Paris time (the cap's clock)., Send every approved outbound email of the given kinds, oldest first. cold_cap… (+15 more)

### Community 147 - "gmail.py"
Cohesion: 0.13
Nodes (22): archive_to_label(), ensure_label(), extract_body_text(), extract_headers(), get_message(), list_inbox(), Move a message out of the inbox into the given label., Walk MIME parts for text/plain; fall back to stripped text/html. (+14 more)

### Community 148 - "shop-landing-data.ts"
Cohesion: 0.13
Nodes (24): metadata, ShopNav(), ShopFaq(), ShopFeatures(), ShopFinalCta(), ShopFooter(), ShopHero(), ShopHowItWorks() (+16 more)

### Community 149 - "agent.py"
Cohesion: 0.33
Nodes (11): require_trigger_secret(), health(), post, _trigger(), trigger_autoresearch(), trigger_discover(), trigger_enrich(), trigger_inbox() (+3 more)

### Community 151 - "outreach.py"
Cohesion: 0.23
Nodes (12): ColdEmail, BaseModel, build_email_body(), cnil_footer(), Léa Moreau — the agent's sales persona. The persona system prompt is shared by…, _compose_one(), _eligible(), _lead() (+4 more)

### Community 156 - "enrichment.py"
Cohesion: 0.14
Nodes (23): BaseModel, Qualification, is_suppressed(), _classify_lead(), _clean(), _fetch_pages(), _fetch_site(), _judge() (+15 more)

### Community 159 - "discovery.py"
Cohesion: 0.24
Nodes (12): search_text(), _address_component(), _category(), _close_query(), _ingest(), _ingest_one(), _next_queries(), _query_matrix() (+4 more)

### Community 160 - "terminaux/page.tsx"
Cohesion: 0.09
Nodes (39): BADGE, DeviceCard(), DOT_CLASS, Editing, Health, LinkState, PrinterCard(), printerHealth() (+31 more)

### Community 161 - "get_supabase"
Cohesion: 0.11
Nodes (26): get_supabase(), Client, Device, Authentifie un appareil Omilink par l'empreinte SHA-256 de son jeton., require_device(), _apply_routing(), _build_routing(), enroll() (+18 more)

### Community 167 - "getShopBySlug"
Cohesion: 0.09
Nodes (49): AboutPage(), metadata, revalidate, CatalogPage(), generateMetadata(), revalidate, ConfirmationPage(), loadOrder() (+41 more)

### Community 171 - "useLanguage"
Cohesion: 0.28
Nodes (7): metadata, ContactForm(), LanguageToggle(), PortalNav(), SurMesure(), surMesure, useLanguage()

### Community 172 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 178 - "app/layout.tsx"
Cohesion: 0.13
Nodes (14): fraunces, instrumentSans, metadata, viewport, MENU_PATHS, Providers(), Choice, CookieConsent() (+6 more)

### Community 179 - "validation.ts"
Cohesion: 0.28
Nodes (14): POST(), AddressInput, CheckoutItemInput, ContactInput, fail(), optionalText(), parseAddress(), parseCheckout() (+6 more)

### Community 182 - "seed-shop.ts"
Cohesion: 0.14
Nodes (16): metadata, ShopLoginForm(), PHONE_LOGIN_DOMAIN, loginEmailFor(), looksLikePhone(), normalizePhone(), phoneToLoginEmail(), CATEGORIES (+8 more)

### Community 183 - "menu/cart.tsx"
Cohesion: 0.19
Nodes (17): CLICK_FLUSH_MS, HEARTBEAT_MS, ITEM_CLICK_RETENTION_DAYS, MenuStage, SESSION_RETENTION_DAYS, STAGE_RANK, createTracker(), MenuTracker (+9 more)

### Community 184 - "language.tsx"
Cohesion: 0.21
Nodes (12): DEFAULT_LANGUAGE, Language, LANGUAGES, Localized, isLanguage(), LanguageContext, LanguageProvider(), LanguageValue (+4 more)

### Community 185 - "Ominin"
Cohesion: 0.18
Nodes (10): Business constraints, Code quality, Commands, Conventions, graphify, Ominin, Repo structure, Stack (+2 more)

### Community 186 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): /commit, Execution requirement, Step 1 — Understand what changed, Step 2 — Project upkeep (required before every push), Step 3 — Safety checks, Step 4 — Write the commit message, Step 5 — Commit and push, Step 6 — Report back (+1 more)

### Community 187 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): Important notes, /new-restaurant, Phase 1 — Intake, Phase 2 — Research, Phase 3 — Verify with user, Phase 4 — Build the demo profile, Phase 5 — Summary, Updating an existing profile (+1 more)

### Community 188 - "payment-settings.tsx"
Cohesion: 0.23
Nodes (11): NO_SQUARE, NO_STRIPE, PaymentSettings(), Provider, readStatus(), SquareLocation, SquareStatus, StripeStatus (+3 more)

### Community 189 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 195 - "site.ts"
Cohesion: 0.27
Nodes (6): PRIVATE_PATHS, sitemap(), adminSiteUrl, clipSiteUrl, shopSiteUrl, siteUrl

### Community 196 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 197 - "/marwan"
Cohesion: 0.33
Nodes (5): Information about Marwan, /marwan, Step 1 — Understand what changed, Step 2 - Write the summary info and give Marwan his designated task., What you must do when invoked

### Community 201 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 202 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 203 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 205 - "Tâches manuelles"
Cohesion: 0.18
Nodes (10): 1. Étapes du service et équipe sans comptes (2026-09-10), 2. Capacités par restaurant et gestes de salle (2026-09-10), 3. Square, deuxième encaisseur du menu QR (2026-09-09), 4. Analytique du menu QR et tableau de bord client (2026-09-11), 5. Commission des boutiques : poser le taux (2026-09-09), 6. Tablette de salle et serveurs sans compte (2026-09-09), 7. Identité des boutiques : icône et aperçu de partage (2026-09-09), 8. Service direct, badgeuse et planning, Google Analytics (2026-09-08) (+2 more)

## Knowledge Gaps
- **680 isolated node(s):** `backend`, `$schema`, `slug`, `name`, `tagline` (+675 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 933 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `equipe/page.tsx`, `gestion/store.ts`, `collect-landing-data.ts`, `gestion/selectors.ts`, `admin/store.ts`, `clip/context.tsx`, `menu/gestion/produits/page.tsx`, `stage.tsx`, `ui.tsx`, `clip/demo/data.ts`, `clip-landing-data.ts`, `metrics.ts`, `notifications/page.tsx`, `gestion/constants.ts`, `espace/comptes/creation/page.tsx`, `managers.tsx`, `app/page.tsx`, `terminaux/page.tsx`, `lead-cache.ts`, `brand/wordmark.tsx`, `collect-experience.tsx`, `m/[slug]/page.tsx`, `clip/store.ts`, `app/layout.tsx`, `menu/cart.tsx`, `language.tsx`, `package.json`, `payment-settings.tsx`, `[slug]/layout.tsx`, `item-form-modal.tsx`, `temps.ts`, `shop/server.ts`, `lead-panel.tsx`, `ui/toast.tsx`, `espace/shell.tsx`, `carte/page.tsx`, `shared.ts`, `collect/checkout/route.ts`, `admin/constants.ts`, `square-payment.tsx`, `useAdmin`, `collect/demo/provider.tsx`, `shop/icons.tsx`, `menu-data.ts`, `admin-lock-button.tsx`, `provider/types.ts`, `admin/format.ts`, `shop/constants.ts`, `qr-showcase.tsx`, `useToast`, `restaurants/page.tsx`, `espace/analytique/page.tsx`, `gestion/types.ts`, `clip/constants.ts`, `components/gestion/shell.tsx`, `import/page.tsx`?**
  _High betweenness centrality (0.238) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `createAdminClient` to `admin.ts`, `shop/checkout.ts`, `shop/server.ts`, `push/server.ts`, `getShopBySlug`, `sumup/server.ts`, `square/server.ts`, `shared.ts`, `collect/checkout/route.ts`, `ui.tsx`, `desinscription/route.ts`, `validation.ts`, `api/contact/route.ts`, `getCurrentUser`, `invite/route.ts`, `orders.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `next` connect `createClient` to `landing-data.ts`, `collect-landing-data.ts`, `ui.tsx`, `clip/demo/data.ts`, `clip-landing-data.ts`, `shop-landing-data.ts`, `gestion/constants.ts`, `app/page.tsx`, `brand/wordmark.tsx`, `m/[slug]/page.tsx`, `getShopBySlug`, `useLanguage`, `app/layout.tsx`, `next.config.ts`, `seed-shop.ts`, `package.json`, `getCurrentUser`, `[slug]/layout.tsx`, `temps.ts`, `site.ts`, `shop/server.ts`, `lead-panel.tsx`, `espace/shell.tsx`, `shared.ts`, `collect/checkout/route.ts`, `shop/icons.tsx`, `getRestaurant`, `components/gestion/shell.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **What connects `backend`, `$schema`, `slug` to the rest of the system?**
  _680 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `equipe/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10782241014799154 - nodes in this community are weakly interconnected._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06101190476190476 - nodes in this community are weakly interconnected._
- **Should `collect-landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0782608695652174 - nodes in this community are weakly interconnected._
# Graph Report - ominin  (2026-09-16)

## Corpus Check
- 626 files · ~1,679,788 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3414 nodes · 10192 edges · 148 communities (128 shown, 12 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 196 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7f932dc2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- equipe/page.tsx
- admin.ts
- landing-data.ts
- gestion/constants.ts
- collect-landing-data.ts
- scripts
- gestion/selectors.ts
- shop/server.ts
- admin/store.ts
- sumup/server.ts
- square/server.ts
- clip/api.ts
- menu/gestion/produits/page.tsx
- formatPrice
- What You Must Do When Invoked
- ui.tsx
- clip/demo/data.ts
- clip-landing-data.ts
- metrics.ts
- compilerOptions
- upload-post.ts
- api/contact/route.ts
- menu-data.ts
- Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)
- notifications/page.tsx
- admin/api.ts
- espace/comptes/creation/page.tsx
- shop/icons.tsx
- createAdminClient
- boho/profile.json
- proxy.ts
- app/page.tsx
- lead-cache.ts
- next
- seed-crm.ts
- Setup guide (written for an LLM agent)
- Ominin
- createClient
- What you must do when invoked
- react
- graphify reference: extra exports and benchmark
- cart-bar.tsx
- graphify reference: query, path, explain
- /marwan
- eslint.config.mjs
- Verifying the Ominin frontend
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- board.tsx
- frontend/README.md
- .claude/CLAUDE.md
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- package.json
- .claude/skills/graphify/references/extraction-spec.md
- frontend/AGENTS.md
- stage.tsx
- postcss.config.mjs
- backend
- shopHref
- _template/profile.json
- paiements/page.tsx
- temps.ts
- components/gestion/shell.tsx
- push/client.ts
- lead-panel.tsx
- formatPrice
- espace/analytique/page.tsx
- invite/route.ts
- services/autoresearch.py
- carte/page.tsx
- Bridge
- create-order-fab.tsx
- payment-settings.tsx
- admin/constants.ts
- database.types.ts
- restaurants/page.tsx
- collect/demo/provider.tsx
- gestion/api.ts
- dependencies
- gestion/menu/page.tsx
- devDependencies
- clip/context.tsx
- collect/landing/demo-showcase.tsx
- check
- push/server.ts
- getCurrentUser
- admin/format.ts
- useToast
- clip/constants.ts
- gestion/store.ts
- m/[slug]/page.tsx
- What you must do when invoked
- espace/shell.tsx
- gestion/types.ts
- add-to-order.tsx
- useLanguage
- tickets.py
- square-payment.tsx
- desinscription/route.ts
- provider/types.ts
- use-order-chime.ts
- filter-bar.tsx
- orders.ts
- createClient
- get_supabase
- services/inbox.py
- landing/sections.tsx
- agent.py
- outreach.py
- omilink
- enrichment.py
- discovery.py
- terminaux/page.tsx
- omilink.py
- golden-image.sh
- getShopBySlug
- portal-data.ts
- What You Must Do When Invoked
- app/layout.tsx
- shop/checkout.ts
- seed-shop.ts
- menu/cart.tsx
- language.tsx
- Ominin
- What you must do when invoked
- What you must do when invoked
- gestion/mappers.ts
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
1. `createClient()` - 186 edges
2. `react` - 149 edges
3. `useToast()` - 122 edges
4. `createAdminClient()` - 116 edges
5. `check()` - 84 edges
6. `must()` - 74 edges
7. `createClient()` - 67 edges
8. `formatPrice()` - 56 edges
9. `next` - 53 edges
10. `getShopBySlug` - 49 edges

## Surprising Connections (you probably didn't know these)
- `FindingsCard()` --calls--> `formatDayTime()`  [EXTRACTED]
  frontend/app/admin/(shell)/lea/page.tsx → frontend/lib/admin/format.ts
- `GET()` --calls--> `createAdminClient()`  [EXTRACTED]
  frontend/app/api/collect/order/route.ts → frontend/lib/supabase/admin.ts
- `Body` --references--> `ShopOrderStatus`  [EXTRACTED]
  frontend/app/api/shop/gestion/orders/route.ts → frontend/lib/shop/types.ts
- `CreationComptesPage()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/comptes/creation/page.tsx → frontend/lib/clip/context.tsx
- `ClipEspaceLayout()` --calls--> `createClient()`  [EXTRACTED]
  frontend/app/clip/espace/layout.tsx → frontend/lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (148 total, 12 thin omitted)

### Community 0 - "equipe/page.tsx"
Cohesion: 0.15
Nodes (20): CommandesPage(), dedupeById(), EMPTY_BODIES, matchesFilter(), PANE_TAGLINES, PaneId, PANES, ROLES (+12 more)

### Community 1 - "admin.ts"
Cohesion: 0.22
Nodes (16): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+8 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.06
Nodes (41): metadata, DemoShowcase(), Faq(), Features(), FinalCta(), Hero(), HowItWorks(), IphoneFrame() (+33 more)

### Community 3 - "gestion/constants.ts"
Cohesion: 0.08
Nodes (47): CapacitesPage(), openViews(), OnboardingForm(), RESERVED_SLUGS, slugify(), metadata, Capabilities(), OrderTabsCard() (+39 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.08
Nodes (33): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter() (+25 more)

### Community 5 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, db:diff, db:link, db:login, db:push, db:types, dev (+10 more)

### Community 6 - "gestion/selectors.ts"
Cohesion: 0.10
Nodes (31): ApercuPage(), Period, RevenueChart(), TopVentesChart(), TablesPage(), CuisinierApercu(), ServiceClock(), ServeurApercu() (+23 more)

### Community 7 - "shop/server.ts"
Cohesion: 0.06
Nodes (50): FILTERS, ShopOrdersPage(), ShopShippingPage(), FaqPage(), metadata, revalidate, ChevronDownIcon(), CheckoutFormProps (+42 more)

### Community 8 - "admin/store.ts"
Cohesion: 0.21
Nodes (19): adminLoginPath(), commit(), fetchAll(), fetchLeads(), fetchOpenTasks(), fetchPendingDraftCount(), fetchUpcomingAppointments(), getClientSnapshot() (+11 more)

### Community 9 - "sumup/server.ts"
Cohesion: 0.16
Nodes (22): GET(), stateCookie(), GET(), POST(), POST(), POST(), POST(), confirmOrderPaid() (+14 more)

### Community 10 - "square/server.ts"
Cohesion: 0.10
Nodes (43): GET(), stateCookie(), GET(), PATCH(), POST(), Line, orderBody(), POST() (+35 more)

### Community 11 - "clip/api.ts"
Cohesion: 0.16
Nodes (26): apply(), pollPostStatus(), publishClip(), refreshAccounts(), replacePost(), retryPost(), ClipData, ClipDataProvider() (+18 more)

### Community 12 - "menu/gestion/produits/page.tsx"
Cohesion: 0.12
Nodes (24): CollectSignupForm(), slugify(), CollectEtablissementPage(), metadata, ProduitsPage(), CheckIcon(), ExternalLinkIcon(), SubscriptionGate() (+16 more)

### Community 13 - "formatPrice"
Cohesion: 0.12
Nodes (28): ShopOrderPage(), metadata, PackingSlipPage(), AccountOrdersPage(), metadata, DiscountManager(), toLocalInput(), OrdersTable() (+20 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "ui.tsx"
Cohesion: 0.09
Nodes (35): metadata, TrackingPage(), AlertIcon(), CheckCircleIcon(), InfoIcon(), SearchIcon(), LoginForm(), OrderTimeline() (+27 more)

### Community 16 - "clip/demo/data.ts"
Cohesion: 0.12
Nodes (23): metadata, DemoBanner(), emptySubscribe(), ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics(), buildDemoPosts() (+15 more)

### Community 17 - "clip-landing-data.ts"
Cohesion: 0.07
Nodes (32): metadata, ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, ClipLoader(), ClipFaq(), ClipFeatures(), ClipFinalCta() (+24 more)

### Community 18 - "metrics.ts"
Cohesion: 0.08
Nodes (51): ActivitePage(), load(), ClientsPage(), PERIOD_TABS, ClientDetail(), isView(), PERIOD_TABS, EmailTable() (+43 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "upload-post.ts"
Cohesion: 0.12
Nodes (16): PROVIDER_API_URL, PROVIDER_TIMEOUT_MS, providerApiKey(), PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider, ensureProfile() (+8 more)

### Community 21 - "api/contact/route.ts"
Cohesion: 0.19
Nodes (16): invalid(), isContactSource(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, CONTACT_LIMITS (+8 more)

### Community 22 - "menu-data.ts"
Cohesion: 0.10
Nodes (23): generateMetadata(), ORDER_TABS, SEED_TABLE_COUNT, DraftOrder, legsOf(), seed(), OrderPayment, PaymentLeg (+15 more)

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "notifications/page.tsx"
Cohesion: 0.19
Nodes (17): ChimeCard(), DevicesCard(), IOS_STEPS, NotificationsPage(), PrefsCard(), playChime(), setChimeEnabled(), useChimeEnabled() (+9 more)

### Community 25 - "admin/api.ts"
Cohesion: 0.09
Nodes (47): ActivityInput, AppointmentInput, availableSlug(), createRestaurant(), DuplicateCandidate, ExportRow, fetchAllSlugs(), ImportError (+39 more)

### Community 26 - "espace/comptes/creation/page.tsx"
Cohesion: 0.09
Nodes (9): CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, ComptesPage(), ComptesTab, ComptesTabs() (+1 more)

### Community 27 - "shop/icons.tsx"
Cohesion: 0.07
Nodes (35): AccountPage(), metadata, SignOutButton(), ContactPage(), metadata, isActive(), NAV_ITEMS, NavItem (+27 more)

### Community 28 - "createAdminClient"
Cohesion: 0.08
Nodes (46): GET(), EXTENSIONS, POST(), POST(), DELETE(), GET(), POST(), requireUser() (+38 more)

### Community 29 - "boho/profile.json"
Cohesion: 0.06
Nodes (31): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+23 more)

### Community 30 - "proxy.ts"
Cohesion: 0.36
Nodes (7): config, matchesPath(), ProductConfig, PRODUCTS, proxy(), rewritePrefixFor(), @supabase/ssr

### Community 31 - "app/page.tsx"
Cohesion: 0.14
Nodes (13): metadata, PortalApproach(), PortalFinalCta(), PARTICLES, PortalHero(), BENTO, PortalProducts(), ProductCube() (+5 more)

### Community 32 - "lead-cache.ts"
Cohesion: 0.12
Nodes (39): addActivity(), apply(), byDue(), completeTask(), createAppointment(), createTask(), fetchAppointments(), fetchExportRows() (+31 more)

### Community 34 - "next"
Cohesion: 0.06
Nodes (23): metadata, metadata, metadata, metadata, metadata, metadata, InscriptionTabs(), Profile (+15 more)

### Community 35 - "seed-crm.ts"
Cohesion: 0.19
Nodes (12): TablesInsert, Category, daysAgo(), daysAhead(), db, LeadStatus, main(), Priority (+4 more)

### Community 36 - "Setup guide (written for an LLM agent)"
Cohesion: 0.15
Nodes (12): 1. Prerequisites, 2. Frontend, 3. Backend, 4. Supabase (database & auth), 5. Graphify (knowledge-graph CLI), 6. Project skills (nothing to install), 7. Outreach agent « Léa » (one-time setup, human-only), 8. Final checklist (+4 more)

### Community 37 - "Ominin"
Cohesion: 0.18
Nodes (10): Business constraints, Code quality, Commands, Conventions, graphify, Ominin, Repo structure, Stack (+2 more)

### Community 38 - "createClient"
Cohesion: 0.10
Nodes (39): LeaPage(), SignOutButton(), MenuPage(), approveOutreachEmail(), fetchLatestResearchRun(), fetchOutreachEmails(), fetchOutreachProspects(), fetchOutreachRuns() (+31 more)

### Community 39 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): /commit, Execution requirement, Step 1 — Understand what changed, Step 2 — Project upkeep (required before every push), Step 3 — Safety checks, Step 4 — Write the commit message, Step 5 — Commit and push, Step 6 — Report back (+1 more)

### Community 40 - "react"
Cohesion: 0.15
Nodes (22): DUPLICATE_REASON_LABELS, cartTotal(), CheckoutDialog(), CollectExperience(), lineKey(), lineUnitPrice(), PickupMode, SelectedChoice (+14 more)

### Community 41 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 42 - "cart-bar.tsx"
Cohesion: 0.17
Nodes (14): CartBar(), PaymentChoice, SubmitState, TIP_PERCENTS, TipChoice, PaymentReturn(), State, loadSdk() (+6 more)

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

### Community 50 - "board.tsx"
Cohesion: 0.15
Nodes (14): StatusMenu(), ALL_COLUMNS, PipelineBoard(), DragState, useBoardDrag(), PIPELINE_COLUMN_CAP, PIPELINE_COLUMNS, PIPELINE_RAIL_COLUMNS (+6 more)

### Community 51 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 52 - ".claude/CLAUDE.md"
Cohesion: 0.50
Nodes (3): commit, graphify, new-restaurant

### Community 55 - "package.json"
Cohesion: 0.11
Nodes (17): name, private, version, eslint, eslint-config-next, maplibre-gl, react-dom, supabase (+9 more)

### Community 58 - "stage.tsx"
Cohesion: 0.14
Nodes (17): CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView(), TIMELINE, TrackingView(), useNow() (+9 more)

### Community 63 - "shopHref"
Cohesion: 0.06
Nodes (66): ConfirmationPage(), metadata, AccountMessagesPage(), metadata, allura, cormorant, dmSans, dmSerif (+58 more)

### Community 64 - "_template/profile.json"
Cohesion: 0.06
Nodes (30): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+22 more)

### Community 65 - "paiements/page.tsx"
Cohesion: 0.20
Nodes (14): DayGroup, dedupeById(), displayMode(), groupByDay(), matchesMode(), MODE_FILTERS, ModeFilter, PaiementsPage() (+6 more)

### Community 67 - "temps.ts"
Cohesion: 0.08
Nodes (60): BadgeagePage(), EquipePage(), metadata, PlanningPage(), PlanningPayload, ServirCard(), BadgeagesLog(), CorrectionModal() (+52 more)

### Community 68 - "components/gestion/shell.tsx"
Cohesion: 0.15
Nodes (16): ApercuIcon(), BellIcon(), ClockIcon(), CommandesIcon(), GearIcon(), LogoutIcon(), MenuIcon(), PaymentsIcon() (+8 more)

### Community 69 - "push/client.ts"
Cohesion: 0.24
Nodes (13): DeviceStatusCard(), PushPrompt(), PUSH_PROMPT_DISMISSED_KEY, deviceLabel(), disablePush(), enablePush(), getPushStatus(), isIos() (+5 more)

### Community 70 - "lead-panel.tsx"
Cohesion: 0.07
Nodes (42): metadata, ArrowRightIcon(), BotIcon(), CalendarIcon(), ChartIcon(), ClockIcon(), FilterIcon(), GlobeIcon() (+34 more)

### Community 71 - "formatPrice"
Cohesion: 0.14
Nodes (23): OptionsDialog(), EncaisserCard(), EncaisserPanel(), sumLines(), sumUnits(), toSelection(), Unit, unitsOf() (+15 more)

### Community 72 - "espace/analytique/page.tsx"
Cohesion: 0.08
Nodes (22): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, GenerateurPage(), MOMENTS (+14 more)

### Community 73 - "invite/route.ts"
Cohesion: 0.31
Nodes (11): RFC-2047, POST(), Role, accessToken(), card(), escapeHtml(), mailConfig(), ROLE_LABELS (+3 more)

### Community 74 - "services/autoresearch.py"
Cohesion: 0.13
Nodes (25): _credentials_env(), _parse(), parse_structured(), The Agent SDK spawns a Claude Code subprocess that authenticates from the…, Single-turn, tool-less Claude call returning schema-validated output. Sync on…, AnalysisFindings, ProposedVariant, ProspectScore (+17 more)

### Community 75 - "carte/page.tsx"
Cohesion: 0.24
Nodes (14): CartePage(), MapCanvas, MapLeadCard(), CrosshairIcon(), GEOLOCATION_TIMEOUT_MS, getSnapshot(), isWatching(), listeners (+6 more)

### Community 76 - "Bridge"
Cohesion: 0.13
Nodes (13): BaseSettings, Settings, Bridge, ensure_token(), main(), Client, Boucle Omilink. Un boîtier neuf génère son jeton, n'en confie que l'empreinte…, Hôtes du réseau local répondant sur le port des imprimantes. (+5 more)

### Community 77 - "create-order-fab.tsx"
Cohesion: 0.12
Nodes (24): POST(), ResolvedLine, resolveOptions(), ConfirmationPage(), metadata, CollectPage(), generateMetadata(), getPage (+16 more)

### Community 78 - "payment-settings.tsx"
Cohesion: 0.23
Nodes (11): NO_SQUARE, NO_STRIPE, PaymentSettings(), Provider, readStatus(), SquareLocation, SquareStatus, StripeStatus (+3 more)

### Community 79 - "admin/constants.ts"
Cohesion: 0.05
Nodes (51): FindingsCard(), hostOf(), percent(), PROSPECT_TILES, ProspectsPanel(), scoreColor(), TabId, VARIANT_ORDER (+43 more)

### Community 80 - "database.types.ts"
Cohesion: 0.18
Nodes (10): isTerminal(), POST(), Product, PRODUCTS_BY_CHOICE, CompositeTypes, Constants, DatabaseWithoutInternals, DefaultSchema (+2 more)

### Community 81 - "restaurants/page.tsx"
Cohesion: 0.09
Nodes (30): RFC-4180, EmailsRedirect(), Analysis, ImportPage(), parseCoordinate(), ParsedRow, Phase, RowStatus (+22 more)

### Community 82 - "collect/demo/provider.tsx"
Cohesion: 0.09
Nodes (16): CartLine, buildDemoMenu(), COLLECT_DEMO, DEMO_MENU_SPEC, DemoMenuSection, demoRestaurantInfo, DemoStep, CollectDemoContext (+8 more)

### Community 83 - "gestion/api.ts"
Cohesion: 0.08
Nodes (58): CategoryManager(), serviceTitle(), TableSheet(), parseTargetKey(), RuleForm(), targetKey(), digits(), StaffModal() (+50 more)

### Community 85 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+4 more)

### Community 86 - "gestion/menu/page.tsx"
Cohesion: 0.11
Nodes (41): EtablissementPage(), View, ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor() (+33 more)

### Community 87 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, eslint-config-next, supabase, tailwindcss, @tailwindcss/postcss, tsx, @types/node (+5 more)

### Community 88 - "clip/context.tsx"
Cohesion: 0.14
Nodes (13): fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), requestLinkUrl(), uploadClip(), ClipActions, ClipUploadInput, connectAccounts() (+5 more)

### Community 89 - "collect/landing/demo-showcase.tsx"
Cohesion: 0.22
Nodes (10): metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), CollectWordmark(), demoSection, collectDemoHref(), collectLandingHref() (+2 more)

### Community 90 - "check"
Cohesion: 0.08
Nodes (35): CategoryInput, deleteCategory(), deleteDiscountCode(), deleteFaqItem(), deleteOptionGroup(), deleteProduct(), deleteShippingMethod(), DiscountCodeInput (+27 more)

### Community 92 - "push/server.ts"
Cohesion: 0.11
Nodes (24): CallBody, POST(), POST(), POST(), CallServerButton(), CallState, CALL_THROTTLE_MS, DispatchBody (+16 more)

### Community 94 - "getCurrentUser"
Cohesion: 0.15
Nodes (15): CheckoutPage(), metadata, AccountOrderPage(), metadata, AccountConversationPage(), metadata, CheckIcon(), CustomerReplyForm() (+7 more)

### Community 95 - "admin/format.ts"
Cohesion: 0.18
Nodes (26): dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, TachesPage(), PlusIcon(), FollowUpChoice (+18 more)

### Community 96 - "useToast"
Cohesion: 0.07
Nodes (51): EtablissementForm(), NoteComposer, CreateRestaurantModal(), ServirPanel(), StripePrompt(), CreateShopForm(), ImageUploader(), UploadedImage (+43 more)

### Community 98 - "clip/constants.ts"
Cohesion: 0.15
Nodes (14): PublicationsPage(), Dropzone(), formatSize(), CheckIcon(), PlatformBadge(), PostCard(), STATUS_CLASSES, ACCEPTED_VIDEO_TYPES (+6 more)

### Community 99 - "gestion/store.ts"
Cohesion: 0.15
Nodes (25): AdminLockButton(), LockIcon(), listeners, lockAdmin(), read(), subscribe(), unlockAdmin(), useAdminUnlocked() (+17 more)

### Community 101 - "m/[slug]/page.tsx"
Cohesion: 0.14
Nodes (13): ClientDemoPage(), generateMetadata(), getRestaurant, MenuPage(), revalidate, CategoryLink, CategoryNav(), Hero() (+5 more)

### Community 102 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): Important notes, /new-restaurant, Phase 1 — Intake, Phase 2 — Research, Phase 3 — Verify with user, Phase 4 — Build the demo profile, Phase 5 — Summary, Updating an existing profile (+1 more)

### Community 103 - "espace/shell.tsx"
Cohesion: 0.16
Nodes (14): ClipEspaceLayout(), metadata, NavItem, LinkIcon(), ListIcon(), UploadIcon(), ClipShell(), isActive() (+6 more)

### Community 104 - "gestion/types.ts"
Cohesion: 0.12
Nodes (23): GET(), OrderCardDemo(), isTerminal(), OrderConfirmation(), STATUS_COPY, OrderCard(), STATUS_CLASSES, StatusBadge() (+15 more)

### Community 105 - "add-to-order.tsx"
Cohesion: 0.21
Nodes (10): AddToOrder(), choiceRowClass(), isUnavailable(), OptionsModal(), DishCard(), FeaturedCard(), MenuSection(), CartChoice (+2 more)

### Community 106 - "useLanguage"
Cohesion: 0.35
Nodes (7): metadata, ContactForm(), PortalFooter(), PortalNav(), SurMesure(), surMesure, useLanguage()

### Community 110 - "tickets.py"
Cohesion: 0.36
Nodes (11): _group_by_category(), _line(), _local(), datetime, Tickets rendus en ESC/POS. Omilink envoie ces octets tels quels à l'imprimante…, Group items by category name, sorted by category position., _render_items(), render_job() (+3 more)

### Community 112 - "square-payment.tsx"
Cohesion: 0.33
Nodes (6): loadSdk(), PaymentState, SquareCard, SquarePayment(), SquarePayments, Window

### Community 113 - "desinscription/route.ts"
Cohesion: 0.31
Nodes (10): RFC-8058, confirmFormHtml(), DONE_HTML, GET(), LEAD_DEMOTABLE_FROM, PAGE_SHELL(), params(), POST() (+2 more)

### Community 116 - "provider/types.ts"
Cohesion: 0.20
Nodes (10): POST(), CaptionEditor(), CAPTION_CONTEXT_MAX_CHARS, captionsSchema(), generateCaptions(), PLATFORM_LABELS, CaptionSet, CLIP_PLATFORMS (+2 more)

### Community 121 - "use-order-chime.ts"
Cohesion: 0.17
Nodes (14): metadata, GestionShell(), isActive(), signOut(), CHIME_STORAGE_KEY, awaitsOnlinePayment(), armedListeners, CHIME_NOTES (+6 more)

### Community 123 - "filter-bar.tsx"
Cohesion: 0.11
Nodes (29): ApercuPage(), FilterBar(), toggleInSet(), StatCard(), CLOSED_STATUSES, NO_CONTACT_OPTIONS, appointmentIds(), countActiveFilters() (+21 more)

### Community 125 - "orders.ts"
Cohesion: 0.15
Nodes (33): POST(), POST(), Body, POST(), STATUS_MESSAGES, POST(), ORDER_STATUS_FLOW, base64url() (+25 more)

### Community 145 - "createClient"
Cohesion: 0.08
Nodes (50): GET(), InvitationForm(), InvitationPage(), OnboardingPage(), ShopSettingsPage(), ShopCustomersPage(), ShopDiscountsPage(), ShopContentPage() (+42 more)

### Community 146 - "get_supabase"
Cohesion: 0.15
Nodes (11): get_supabase(), Client, BaseSettings, Settings, daily_cold_count(), Cold emails already sent today, Paris time (the cap's clock)., execute(), Overlap guard: one run per job at a time. Returns the new run id, or None if a… (+3 more)

### Community 147 - "services/inbox.py"
Cohesion: 0.09
Nodes (41): archive_to_label(), ensure_label(), extract_body_text(), decode(), walk(), extract_headers(), get_message(), list_inbox() (+33 more)

### Community 148 - "landing/sections.tsx"
Cohesion: 0.07
Nodes (38): metadata, LeadForm(), LeadFormCopy, ShopNav(), ShopAudiences(), ShopContact(), ShopFaq(), ShopFeatures() (+30 more)

### Community 149 - "agent.py"
Cohesion: 0.38
Nodes (10): health(), post, _trigger(), trigger_autoresearch(), trigger_discover(), trigger_enrich(), trigger_inbox(), trigger_outreach() (+2 more)

### Community 151 - "outreach.py"
Cohesion: 0.20
Nodes (14): ColdEmail, BaseModel, build_email_body(), cnil_footer(), Léa Moreau — the agent's sales persona. The persona system prompt is shared by…, _compose_one(), _eligible(), _lead() (+6 more)

### Community 156 - "enrichment.py"
Cohesion: 0.13
Nodes (24): BaseModel, Qualification, is_suppressed(), _classify_lead(), _clean(), _fetch_pages(), _fetch_site(), _judge() (+16 more)

### Community 159 - "discovery.py"
Cohesion: 0.22
Nodes (12): search_text(), _address_component(), _category(), _close_query(), _ingest(), _ingest_one(), _next_queries(), _query_matrix() (+4 more)

### Community 160 - "terminaux/page.tsx"
Cohesion: 0.10
Nodes (38): BADGE, DeviceCard(), DOT_CLASS, Editing, Health, LinkState, PrinterCard(), printerHealth() (+30 more)

### Community 161 - "omilink.py"
Cohesion: 0.15
Nodes (20): Device, Authentifie un appareil Omilink par l'empreinte SHA-256 de son jeton., require_device(), require_trigger_secret(), _apply_routing(), _build_routing(), enroll(), EnrollRequest (+12 more)

### Community 167 - "getShopBySlug"
Cohesion: 0.08
Nodes (44): AboutPage(), metadata, revalidate, CatalogPage(), generateMetadata(), revalidate, GiftPage(), metadata (+36 more)

### Community 171 - "portal-data.ts"
Cohesion: 0.22
Nodes (10): LanguageToggle(), unsplash(), brand, buildLabel, footer, languageToggle, nav, openLabel (+2 more)

### Community 172 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 178 - "app/layout.tsx"
Cohesion: 0.13
Nodes (14): fraunces, instrumentSans, metadata, viewport, MENU_PATHS, Providers(), Choice, CookieConsent() (+6 more)

### Community 179 - "shop/checkout.ts"
Cohesion: 0.11
Nodes (32): POST(), POST(), POST(), absoluteImage(), Admin, createCheckoutSession(), PricedItem, priceItems() (+24 more)

### Community 182 - "seed-shop.ts"
Cohesion: 0.19
Nodes (14): PHONE_LOGIN_DOMAIN, loginEmailFor(), looksLikePhone(), normalizePhone(), phoneToLoginEmail(), CATEGORIES, db, FAQ (+6 more)

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

### Community 188 - "gestion/mappers.ts"
Cohesion: 0.13
Nodes (21): TeamManager(), ItemInput, OrderRow, rowToEtablissement(), rowToMember(), rowToTable(), commit(), fetchOrders() (+13 more)

### Community 189 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 195 - "site.ts"
Cohesion: 0.26
Nodes (8): PRIVATE_PATHS, sitemap(), adminSiteUrl, clipSiteUrl, collectSiteUrl, menuSiteUrl, shopSiteUrl, siteUrl

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
Cohesion: 0.15
Nodes (12): A. Paiement en ligne du menu QR (2026-09-15), Accès Supabase pour Marwan : fait (2026-09-16), B. Portail, landing Shop et landing Collect (2026-09-11), C. MyBox : accueil, personnalisation, mobile (2026-09-11), D. Lot MenuBoho : codes, ordre, ticket, planning, encaissements (2026-09-13), E. Square, deuxième encaisseur du menu QR (2026-09-09), F. Tableau de bord client (2026-09-11), G. Boutiques : décisions et branchements (2026-09-08 → 09-09) (+4 more)

## Knowledge Gaps
- **693 isolated node(s):** `backend`, `$schema`, `slug`, `name`, `tagline` (+688 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 951 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `equipe/page.tsx`, `landing-data.ts`, `gestion/constants.ts`, `collect-landing-data.ts`, `gestion/selectors.ts`, `shop/server.ts`, `admin/store.ts`, `clip/api.ts`, `menu/gestion/produits/page.tsx`, `ui.tsx`, `clip/demo/data.ts`, `clip-landing-data.ts`, `metrics.ts`, `createClient`, `notifications/page.tsx`, `espace/comptes/creation/page.tsx`, `app/page.tsx`, `terminaux/page.tsx`, `lead-cache.ts`, `next`, `cart-bar.tsx`, `app/layout.tsx`, `board.tsx`, `menu/cart.tsx`, `language.tsx`, `package.json`, `stage.tsx`, `shopHref`, `paiements/page.tsx`, `temps.ts`, `push/client.ts`, `lead-panel.tsx`, `formatPrice`, `espace/analytique/page.tsx`, `carte/page.tsx`, `create-order-fab.tsx`, `payment-settings.tsx`, `admin/constants.ts`, `restaurants/page.tsx`, `collect/demo/provider.tsx`, `gestion/menu/page.tsx`, `clip/context.tsx`, `collect/landing/demo-showcase.tsx`, `push/server.ts`, `getCurrentUser`, `admin/format.ts`, `useToast`, `clip/constants.ts`, `gestion/store.ts`, `m/[slug]/page.tsx`, `gestion/types.ts`, `add-to-order.tsx`, `square-payment.tsx`, `provider/types.ts`, `use-order-chime.ts`, `filter-bar.tsx`?**
  _High betweenness centrality (0.254) - this node is a cross-community bridge._
- **Why does `createClient()` connect `createClient` to `equipe/page.tsx`, `gestion/constants.ts`, `admin/store.ts`, `clip/api.ts`, `menu/gestion/produits/page.tsx`, `ui.tsx`, `createClient`, `metrics.ts`, `menu-data.ts`, `notifications/page.tsx`, `admin/api.ts`, `shop/icons.tsx`, `lead-cache.ts`, `terminaux/page.tsx`, `next`, `cart-bar.tsx`, `gestion/mappers.ts`, `temps.ts`, `components/gestion/shell.tsx`, `lead-panel.tsx`, `create-order-fab.tsx`, `payment-settings.tsx`, `gestion/api.ts`, `gestion/menu/page.tsx`, `check`, `admin/format.ts`, `gestion/store.ts`, `espace/shell.tsx`, `use-order-chime.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `next` connect `next` to `landing-data.ts`, `gestion/constants.ts`, `collect-landing-data.ts`, `shop/server.ts`, `menu/gestion/produits/page.tsx`, `formatPrice`, `ui.tsx`, `clip/demo/data.ts`, `clip-landing-data.ts`, `createClient`, `landing/sections.tsx`, `shop/icons.tsx`, `app/page.tsx`, `getShopBySlug`, `app/layout.tsx`, `package.json`, `shopHref`, `temps.ts`, `site.ts`, `lead-panel.tsx`, `create-order-fab.tsx`, `collect/landing/demo-showcase.tsx`, `getCurrentUser`, `m/[slug]/page.tsx`, `espace/shell.tsx`, `useLanguage`, `use-order-chime.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `backend`, `$schema`, `slug` to the rest of the system?**
  _693 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `equipe/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1452991452991453 - nodes in this community are weakly interconnected._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06428988895382817 - nodes in this community are weakly interconnected._
- **Should `gestion/constants.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08051948051948052 - nodes in this community are weakly interconnected._
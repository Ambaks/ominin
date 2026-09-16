# Graph Report - ominin  (2026-09-16)

## Corpus Check
- 626 files · ~1,679,410 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3414 nodes · 10188 edges · 157 communities (135 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 196 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `060370fd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- menu/gestion/commandes/page.tsx
- clip/server.ts
- landing-data.ts
- gestion/constants.ts
- collect-landing-data.ts
- scripts
- gestion/selectors.ts
- shop/server.ts
- admin/store.ts
- admin.ts
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
- auth-form.tsx
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
- restaurants/page.tsx
- frontend/README.md
- .claude/CLAUDE.md
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- package.json
- .claude/skills/graphify/references/extraction-spec.md
- frontend/AGENTS.md
- ui/toast.tsx
- postcss.config.mjs
- backend
- add-to-cart-form.tsx
- _template/profile.json
- equipe/page.tsx
- temps.ts
- components/gestion/shell.tsx
- clip/demo-showcase.tsx
- admin/shell.tsx
- paiements/page.tsx
- espace/analytique/page.tsx
- database.types.ts
- services/autoresearch.py
- carte/page.tsx
- Bridge
- shared.ts
- payment-settings.tsx
- admin/constants.ts
- clients.ts
- import/page.tsx
- stage.tsx
- gestion/api.ts
- checkout-form.tsx
- dependencies
- tarifs-planifies.tsx
- devDependencies
- clip/context.tsx
- collect/landing/demo-showcase.tsx
- check
- gestion/login-form.tsx
- push/server.ts
- supabase/client.ts
- createClient
- lead-panel.tsx
- managers.tsx
- clip/wordmark.tsx
- clip/constants.ts
- useGestion
- menu/inscription/page.tsx
- m/[slug]/page.tsx
- What you must do when invoked
- espace/shell.tsx
- gestion/types.ts
- add-to-order.tsx
- useLanguage
- RuleForm
- setup-stripe.ts
- encaisser-card.tsx
- tickets.py
- dish-card.tsx
- square-payment.tsx
- desinscription/route.ts
- provider/types.ts
- use-order-chime.ts
- filter-bar.tsx
- orders.ts
- shop/format.ts
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
- validation.ts
- seed-shop.ts
- menu/cart.tsx
- language.tsx
- Ominin
- What you must do when invoked
- What you must do when invoked
- load
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
- `CollectEtablissementPage()` --calls--> `createClient()`  [EXTRACTED]
  frontend/app/collect/inscription/etablissement/page.tsx → frontend/lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (157 total, 14 thin omitted)

### Community 0 - "menu/gestion/commandes/page.tsx"
Cohesion: 0.27
Nodes (11): CommandesPage(), dedupeById(), EMPTY_BODIES, matchesFilter(), FeatureLocked(), activeProducts(), awaitsPayment(), awaitsService() (+3 more)

### Community 1 - "clip/server.ts"
Cohesion: 0.23
Nodes (15): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+7 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.07
Nodes (38): metadata, DemoShowcase(), Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter() (+30 more)

### Community 3 - "gestion/constants.ts"
Cohesion: 0.08
Nodes (43): OrderCard(), STATUS_CLASSES, StatusBadge(), NavItem, ACTION_FEATURE, ACTION_LABELS, COLLECT_ETA_CHOICES_MIN, COLLECT_FEATURES (+35 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.08
Nodes (31): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter() (+23 more)

### Community 5 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, db:diff, db:link, db:login, db:push, db:types, dev (+10 more)

### Community 6 - "gestion/selectors.ts"
Cohesion: 0.12
Nodes (24): ApercuPage(), Period, RevenueChart(), TopVentesChart(), CuisinierApercu(), ServiceClock(), ServiceClock(), ANALYTICS_PERIOD_DAYS (+16 more)

### Community 7 - "shop/server.ts"
Cohesion: 0.07
Nodes (39): FILTERS, ShopOrdersPage(), LegalPage(), PAGES, BADGE_LABELS, COUNTRY_NAMES, DASHBOARD_CHART_DAYS, DASHBOARD_KPI_DAYS (+31 more)

### Community 8 - "admin/store.ts"
Cohesion: 0.21
Nodes (19): adminLoginPath(), commit(), fetchAll(), fetchLeads(), fetchOpenTasks(), fetchPendingDraftCount(), fetchUpcomingAppointments(), getClientSnapshot() (+11 more)

### Community 9 - "admin.ts"
Cohesion: 0.16
Nodes (22): GET(), stateCookie(), GET(), POST(), POST(), POST(), POST(), confirmOrderPaid() (+14 more)

### Community 10 - "square/server.ts"
Cohesion: 0.10
Nodes (43): GET(), stateCookie(), GET(), PATCH(), POST(), Line, orderBody(), POST() (+35 more)

### Community 11 - "clip/api.ts"
Cohesion: 0.16
Nodes (26): apply(), pollPostStatus(), publishClip(), refreshAccounts(), replacePost(), retryPost(), ClipData, ClipDataProvider() (+18 more)

### Community 12 - "menu/gestion/produits/page.tsx"
Cohesion: 0.11
Nodes (26): CollectSignupForm(), slugify(), CollectEtablissementPage(), metadata, ProduitsPage(), CheckIcon(), ExternalLinkIcon(), SubscriptionGate() (+18 more)

### Community 13 - "formatPrice"
Cohesion: 0.09
Nodes (35): ShopOrderPage(), metadata, PackingSlipPage(), AccountOrderPage(), metadata, AccountOrdersPage(), metadata, DiscountManager() (+27 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "ui.tsx"
Cohesion: 0.08
Nodes (39): metadata, revalidate, metadata, TrackingPage(), ChevronDownIcon(), InfoIcon(), SearchIcon(), FaqAccordion() (+31 more)

### Community 16 - "clip/demo/data.ts"
Cohesion: 0.12
Nodes (23): metadata, DemoBanner(), emptySubscribe(), ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics(), buildDemoPosts() (+15 more)

### Community 17 - "clip-landing-data.ts"
Cohesion: 0.08
Nodes (30): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero(), ClipHowItWorks(), ClipNav() (+22 more)

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
Cohesion: 0.15
Nodes (16): generateMetadata(), SEED_TABLE_COUNT, DraftOrder, legsOf(), seed(), PaymentLeg, AppliedTarif, boho (+8 more)

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "notifications/page.tsx"
Cohesion: 0.14
Nodes (26): DevicesCard(), DeviceStatusCard(), IOS_STEPS, NotificationsPage(), PrefsCard(), PushPrompt(), PUSH_PROMPT_DISMISSED_KEY, currentEndpoint() (+18 more)

### Community 25 - "admin/api.ts"
Cohesion: 0.09
Nodes (49): ActivityInput, AppointmentInput, availableSlug(), createRestaurant(), DuplicateCandidate, ExportRow, fetchAllSlugs(), ImportError (+41 more)

### Community 26 - "espace/comptes/creation/page.tsx"
Cohesion: 0.09
Nodes (9): CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, ComptesPage(), ComptesTab, ComptesTabs() (+1 more)

### Community 27 - "shop/icons.tsx"
Cohesion: 0.07
Nodes (36): AccountPage(), metadata, SignOutButton(), ContactPage(), metadata, isActive(), NAV_ITEMS, NavItem (+28 more)

### Community 28 - "createAdminClient"
Cohesion: 0.08
Nodes (44): POST(), resolveOptions(), GET(), EXTENSIONS, POST(), POST(), DELETE(), GET() (+36 more)

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
Nodes (38): addActivity(), apply(), byDue(), completeTask(), createAppointment(), createTask(), fetchAppointments(), fetchExportRows() (+30 more)

### Community 34 - "auth-form.tsx"
Cohesion: 0.13
Nodes (9): metadata, metadata, metadata, metadata, Profile, TABS, metadata, AuthForm() (+1 more)

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
Cohesion: 0.11
Nodes (40): LeaPage(), SignOutButton(), MenuPage(), TerminauxManager(), approveOutreachEmail(), fetchLatestResearchRun(), fetchOutreachEmails(), fetchOutreachProspects() (+32 more)

### Community 39 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): /commit, Execution requirement, Step 1 — Understand what changed, Step 2 — Project upkeep (required before every push), Step 3 — Safety checks, Step 4 — Write the commit message, Step 5 — Commit and push, Step 6 — Report back (+1 more)

### Community 40 - "react"
Cohesion: 0.12
Nodes (26): EtablissementForm(), CreateRestaurantModal(), DUPLICATE_REASON_LABELS, CollectSettings(), ServirPanel(), ProfileRow(), TabletSettings(), Status (+18 more)

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

### Community 50 - "restaurants/page.tsx"
Cohesion: 0.12
Nodes (25): EmailsRedirect(), ApercuPage(), COLUMNS, exportColumns(), RestaurantsPage(), StatCard(), LeadStatusBadge(), PriorityBadge() (+17 more)

### Community 51 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 52 - ".claude/CLAUDE.md"
Cohesion: 0.50
Nodes (3): commit, graphify, new-restaurant

### Community 55 - "package.json"
Cohesion: 0.11
Nodes (17): name, private, version, eslint, eslint-config-next, maplibre-gl, react-dom, supabase (+9 more)

### Community 58 - "ui/toast.tsx"
Cohesion: 0.09
Nodes (40): EtablissementPage(), View, TablesPage(), TerminauxPage(), cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow() (+32 more)

### Community 63 - "add-to-cart-form.tsx"
Cohesion: 0.05
Nodes (55): allura, cormorant, dmSans, dmSerif, FONT_VARIABLES, generateMetadata(), inter, montserrat (+47 more)

### Community 64 - "_template/profile.json"
Cohesion: 0.06
Nodes (30): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+22 more)

### Community 65 - "equipe/page.tsx"
Cohesion: 0.16
Nodes (14): PANE_TAGLINES, PaneId, PANES, ROLES, CopyLink(), ROLES, ConfirmDialog(), IconButton() (+6 more)

### Community 67 - "temps.ts"
Cohesion: 0.08
Nodes (57): BadgeagePage(), EquipePage(), metadata, PlanningPage(), PlanningPayload, BadgeagesLog(), CorrectionModal(), localInput() (+49 more)

### Community 68 - "components/gestion/shell.tsx"
Cohesion: 0.15
Nodes (16): ApercuIcon(), BellIcon(), ClockIcon(), CommandesIcon(), GearIcon(), LogoutIcon(), MenuIcon(), PaymentsIcon() (+8 more)

### Community 69 - "clip/demo-showcase.tsx"
Cohesion: 0.25
Nodes (5): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, IphoneFrame(), demoSection

### Community 70 - "admin/shell.tsx"
Cohesion: 0.07
Nodes (38): metadata, ArrowRightIcon(), BotIcon(), CalendarIcon(), ChartIcon(), ClockIcon(), FilterIcon(), GlobeIcon() (+30 more)

### Community 71 - "paiements/page.tsx"
Cohesion: 0.12
Nodes (24): DayGroup, dedupeById(), displayMode(), groupByDay(), matchesMode(), MODE_FILTERS, ModeFilter, PaiementsPage() (+16 more)

### Community 72 - "espace/analytique/page.tsx"
Cohesion: 0.08
Nodes (22): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, GenerateurPage(), MOMENTS (+14 more)

### Community 73 - "database.types.ts"
Cohesion: 0.12
Nodes (23): RFC-2047, POST(), Role, accessToken(), card(), escapeHtml(), mailConfig(), ROLE_LABELS (+15 more)

### Community 74 - "services/autoresearch.py"
Cohesion: 0.13
Nodes (25): _credentials_env(), _parse(), parse_structured(), The Agent SDK spawns a Claude Code subprocess that authenticates from the…, Single-turn, tool-less Claude call returning schema-validated output. Sync on…, AnalysisFindings, ProposedVariant, ProspectScore (+17 more)

### Community 75 - "carte/page.tsx"
Cohesion: 0.23
Nodes (14): CartePage(), MapCanvas, MapLeadCard(), CrosshairIcon(), GEOLOCATION_TIMEOUT_MS, getSnapshot(), isWatching(), listeners (+6 more)

### Community 76 - "Bridge"
Cohesion: 0.13
Nodes (13): BaseSettings, Settings, Bridge, ensure_token(), main(), Client, Boucle Omilink. Un boîtier neuf génère son jeton, n'en confie que l'empreinte…, Hôtes du réseau local répondant sur le port des imprimantes. (+5 more)

### Community 77 - "shared.ts"
Cohesion: 0.12
Nodes (23): ResolvedLine, GET(), ConfirmationPage(), metadata, CollectPage(), generateMetadata(), getPage, revalidate (+15 more)

### Community 78 - "payment-settings.tsx"
Cohesion: 0.23
Nodes (11): NO_SQUARE, NO_STRIPE, PaymentSettings(), Provider, readStatus(), SquareLocation, SquareStatus, StripeStatus (+3 more)

### Community 79 - "admin/constants.ts"
Cohesion: 0.04
Nodes (64): FindingsCard(), hostOf(), percent(), PROSPECT_TILES, ProspectsPanel(), scoreColor(), TabId, VARIANT_ORDER (+56 more)

### Community 80 - "clients.ts"
Cohesion: 0.19
Nodes (19): CapacitesPage(), openViews(), Capabilities(), OrderTabsCard(), Client, clientFeatures(), fetchClients(), isFeature() (+11 more)

### Community 81 - "import/page.tsx"
Cohesion: 0.14
Nodes (17): RFC-4180, Analysis, ImportPage(), parseCoordinate(), ParsedRow, Phase, RowStatus, STATUS_META (+9 more)

### Community 82 - "stage.tsx"
Cohesion: 0.06
Nodes (34): CartLine, CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView(), TIMELINE, TrackingView() (+26 more)

### Community 83 - "gestion/api.ts"
Cohesion: 0.08
Nodes (58): CategoryManager(), serviceTitle(), TableSheet(), digits(), StaffModal(), apply(), assertTransition(), assignTable() (+50 more)

### Community 84 - "checkout-form.tsx"
Cohesion: 0.17
Nodes (18): POST(), POST(), CheckoutFormInner(), CheckoutFormProps, itemUnitPrice(), absoluteImage(), Admin, createCheckoutSession() (+10 more)

### Community 85 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+4 more)

### Community 86 - "tarifs-planifies.tsx"
Cohesion: 0.15
Nodes (29): ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft(), FormuleFormModal() (+21 more)

### Community 87 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, eslint-config-next, supabase, tailwindcss, @tailwindcss/postcss, tsx, @types/node (+5 more)

### Community 88 - "clip/context.tsx"
Cohesion: 0.14
Nodes (13): fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), requestLinkUrl(), uploadClip(), ClipActions, ClipUploadInput, connectAccounts() (+5 more)

### Community 89 - "collect/landing/demo-showcase.tsx"
Cohesion: 0.19
Nodes (11): metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), CollectNav(), CollectWordmark(), demoSection, collectDemoHref() (+3 more)

### Community 90 - "check"
Cohesion: 0.08
Nodes (35): CategoryInput, deleteCategory(), deleteDiscountCode(), deleteFaqItem(), deleteOptionGroup(), deleteProduct(), deleteShippingMethod(), DiscountCodeInput (+27 more)

### Community 92 - "push/server.ts"
Cohesion: 0.13
Nodes (21): CallBody, POST(), POST(), POST(), DispatchBody, PUSH_EVENT_HINTS, PUSH_EVENT_LABELS, PUSH_EVENTS (+13 more)

### Community 93 - "supabase/client.ts"
Cohesion: 0.20
Nodes (8): OnboardingForm(), RESERVED_SLUGS, slugify(), metadata, OnboardingPage(), StaffPending(), ThemeToggle(), OFFRE_LABELS

### Community 94 - "createClient"
Cohesion: 0.07
Nodes (32): GET(), ClipEspaceLayout(), metadata, InvitationForm(), InvitationPage(), metadata, ShopGestionLayout(), CreateShopPage() (+24 more)

### Community 95 - "lead-panel.tsx"
Cohesion: 0.14
Nodes (31): dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, TachesPage(), PlusIcon(), NoteComposer (+23 more)

### Community 96 - "managers.tsx"
Cohesion: 0.12
Nodes (30): CreateShopForm(), ImageUploader(), UploadedImage, CategoriesManager(), DiscountDraft, FaqManager(), ShippingDraft, ShippingManager() (+22 more)

### Community 97 - "clip/wordmark.tsx"
Cohesion: 0.23
Nodes (4): metadata, metadata, ClipLoader(), ClipWordmark()

### Community 98 - "clip/constants.ts"
Cohesion: 0.15
Nodes (14): PublicationsPage(), Dropzone(), formatSize(), CheckIcon(), PlatformBadge(), PostCard(), STATUS_CLASSES, ACCEPTED_VIDEO_TYPES (+6 more)

### Community 99 - "useGestion"
Cohesion: 0.22
Nodes (17): AdminLockButton(), LockIcon(), listeners, lockAdmin(), read(), subscribe(), unlockAdmin(), useAdminUnlocked() (+9 more)

### Community 101 - "m/[slug]/page.tsx"
Cohesion: 0.16
Nodes (11): ClientDemoPage(), generateMetadata(), getRestaurant, MenuPage(), revalidate, Hero(), PARTICLES, LANGUAGES (+3 more)

### Community 102 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): Important notes, /new-restaurant, Phase 1 — Intake, Phase 2 — Research, Phase 3 — Verify with user, Phase 4 — Build the demo profile, Phase 5 — Summary, Updating an existing profile (+1 more)

### Community 103 - "espace/shell.tsx"
Cohesion: 0.19
Nodes (12): NavItem, LinkIcon(), ListIcon(), UploadIcon(), ClipShell(), isActive(), NAV_ITEMS, NavItem (+4 more)

### Community 104 - "gestion/types.ts"
Cohesion: 0.23
Nodes (13): OrderRow, TableService, Article, Etablissement, Etape, Member, Offre, Order (+5 more)

### Community 105 - "add-to-order.tsx"
Cohesion: 0.23
Nodes (11): AddToOrder(), choiceRowClass(), isUnavailable(), OptionsModal(), CallServerButton(), CallState, CategoryLink, CategoryNav() (+3 more)

### Community 106 - "useLanguage"
Cohesion: 0.35
Nodes (7): metadata, ContactForm(), PortalFooter(), PortalNav(), SurMesure(), surMesure, useLanguage()

### Community 107 - "RuleForm"
Cohesion: 0.27
Nodes (10): parseTargetKey(), RuleForm(), targetKey(), createPriceRule(), deletePriceRule(), priceRuleColumns(), replaceTargets(), setPriceRuleActive() (+2 more)

### Community 108 - "setup-stripe.ts"
Cohesion: 0.25
Nodes (6): shopOffer, Plan, plans, shopPlans, stripe, zeroPriced

### Community 109 - "encaisser-card.tsx"
Cohesion: 0.25
Nodes (13): EncaisserCard(), EncaisserPanel(), sumLines(), sumUnits(), toSelection(), Unit, unitsOf(), CheckMark() (+5 more)

### Community 110 - "tickets.py"
Cohesion: 0.36
Nodes (11): _group_by_category(), _line(), _local(), datetime, Tickets rendus en ESC/POS. Omilink envoie ces octets tels quels à l'imprimante…, Group items by category name, sorted by category position., _render_items(), render_job() (+3 more)

### Community 111 - "dish-card.tsx"
Cohesion: 0.33
Nodes (3): DishCard(), FeaturedCard(), MenuSection()

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
Cohesion: 0.16
Nodes (18): metadata, ChimeCard(), GestionShell(), isActive(), signOut(), CHIME_STORAGE_KEY, awaitsOnlinePayment(), armedListeners (+10 more)

### Community 123 - "filter-bar.tsx"
Cohesion: 0.20
Nodes (17): FilterBar(), toggleInSet(), NO_CONTACT_OPTIONS, appointmentIds(), countActiveFilters(), filterLeads(), filters, listeners (+9 more)

### Community 125 - "orders.ts"
Cohesion: 0.12
Nodes (40): POST(), POST(), Body, POST(), STATUS_MESSAGES, POST(), POST(), ORDER_STATUS_FLOW (+32 more)

### Community 145 - "shop/format.ts"
Cohesion: 0.09
Nodes (42): ShopSettingsPage(), ShopCustomersPage(), ShopDiscountsPage(), ShopContentPage(), ShopShippingPage(), ShopConversationPage(), ShopMessagesPage(), OptionGroupPage() (+34 more)

### Community 146 - "get_supabase"
Cohesion: 0.15
Nodes (11): get_supabase(), Client, BaseSettings, Settings, daily_cold_count(), Cold emails already sent today, Paris time (the cap's clock)., execute(), Overlap guard: one run per job at a time. Returns the new run id, or None if a… (+3 more)

### Community 147 - "services/inbox.py"
Cohesion: 0.09
Nodes (41): archive_to_label(), ensure_label(), extract_body_text(), decode(), walk(), extract_headers(), get_message(), list_inbox() (+33 more)

### Community 148 - "landing/sections.tsx"
Cohesion: 0.10
Nodes (30): metadata, LeadForm(), LeadFormCopy, ShopNav(), ShopAudiences(), ShopContact(), ShopFaq(), ShopFeatures() (+22 more)

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
Cohesion: 0.12
Nodes (24): BADGE, DeviceCard(), DOT_CLASS, Editing, Health, LinkState, PrinterCard(), printerHealth() (+16 more)

### Community 161 - "omilink.py"
Cohesion: 0.15
Nodes (20): Device, Authentifie un appareil Omilink par l'empreinte SHA-256 de son jeton., require_device(), require_trigger_secret(), _apply_routing(), _build_routing(), enroll(), EnrollRequest (+12 more)

### Community 167 - "getShopBySlug"
Cohesion: 0.09
Nodes (50): AboutPage(), metadata, revalidate, CatalogPage(), generateMetadata(), revalidate, ConfirmationPage(), loadOrder() (+42 more)

### Community 171 - "portal-data.ts"
Cohesion: 0.22
Nodes (10): LanguageToggle(), unsplash(), brand, buildLabel, footer, languageToggle, nav, openLabel (+2 more)

### Community 172 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 178 - "app/layout.tsx"
Cohesion: 0.13
Nodes (14): fraunces, instrumentSans, metadata, viewport, MENU_PATHS, Providers(), Choice, CookieConsent() (+6 more)

### Community 179 - "validation.ts"
Cohesion: 0.23
Nodes (17): POST(), PERSONALIZATION_MAX_LENGTH, AddressInput, CheckoutInput, CheckoutItemInput, ContactInput, fail(), optionalText() (+9 more)

### Community 182 - "seed-shop.ts"
Cohesion: 0.19
Nodes (14): PHONE_LOGIN_DOMAIN, loginEmailFor(), looksLikePhone(), normalizePhone(), phoneToLoginEmail(), CATEGORIES, db, FAQ (+6 more)

### Community 183 - "menu/cart.tsx"
Cohesion: 0.18
Nodes (18): CLICK_FLUSH_MS, HEARTBEAT_MS, ITEM_CLICK_RETENTION_DAYS, MenuStage, SESSION_RETENTION_DAYS, STAGE_RANK, createTracker(), MenuTracker (+10 more)

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

### Community 188 - "load"
Cohesion: 0.21
Nodes (14): TeamManager(), createStaffOrder(), payOrderItems(), serveOrderItems(), rowToTable(), commit(), fetchOrders(), load() (+6 more)

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
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `menu/gestion/commandes/page.tsx`, `landing-data.ts`, `gestion/constants.ts`, `collect-landing-data.ts`, `gestion/selectors.ts`, `shop/server.ts`, `admin/store.ts`, `clip/api.ts`, `menu/gestion/produits/page.tsx`, `ui.tsx`, `clip/demo/data.ts`, `shop/format.ts`, `metrics.ts`, `notifications/page.tsx`, `espace/comptes/creation/page.tsx`, `shop/icons.tsx`, `app/page.tsx`, `terminaux/page.tsx`, `lead-cache.ts`, `auth-form.tsx`, `getShopBySlug`, `cart-bar.tsx`, `restaurants/page.tsx`, `app/layout.tsx`, `menu/cart.tsx`, `language.tsx`, `package.json`, `ui/toast.tsx`, `add-to-cart-form.tsx`, `equipe/page.tsx`, `temps.ts`, `clip/demo-showcase.tsx`, `admin/shell.tsx`, `paiements/page.tsx`, `espace/analytique/page.tsx`, `carte/page.tsx`, `shared.ts`, `payment-settings.tsx`, `admin/constants.ts`, `clients.ts`, `import/page.tsx`, `stage.tsx`, `checkout-form.tsx`, `tarifs-planifies.tsx`, `clip/context.tsx`, `collect/landing/demo-showcase.tsx`, `gestion/login-form.tsx`, `supabase/client.ts`, `lead-panel.tsx`, `managers.tsx`, `clip/constants.ts`, `useGestion`, `m/[slug]/page.tsx`, `add-to-order.tsx`, `encaisser-card.tsx`, `square-payment.tsx`, `provider/types.ts`, `use-order-chime.ts`, `filter-bar.tsx`?**
  _High betweenness centrality (0.254) - this node is a cross-community bridge._
- **Why does `createClient()` connect `createClient` to `gestion/constants.ts`, `admin/store.ts`, `clip/api.ts`, `menu/gestion/produits/page.tsx`, `metrics.ts`, `notifications/page.tsx`, `admin/api.ts`, `shop/icons.tsx`, `lead-cache.ts`, `auth-form.tsx`, `react`, `cart-bar.tsx`, `ui/toast.tsx`, `load`, `equipe/page.tsx`, `temps.ts`, `components/gestion/shell.tsx`, `admin/shell.tsx`, `payment-settings.tsx`, `clients.ts`, `gestion/api.ts`, `check`, `gestion/login-form.tsx`, `supabase/client.ts`, `createClient`, `lead-panel.tsx`, `espace/shell.tsx`, `RuleForm`, `use-order-chime.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `next` connect `createClient` to `landing-data.ts`, `collect-landing-data.ts`, `shop/server.ts`, `menu/gestion/produits/page.tsx`, `formatPrice`, `ui.tsx`, `clip/demo/data.ts`, `clip-landing-data.ts`, `landing/sections.tsx`, `shop/icons.tsx`, `app/page.tsx`, `auth-form.tsx`, `getShopBySlug`, `app/layout.tsx`, `package.json`, `add-to-cart-form.tsx`, `temps.ts`, `site.ts`, `admin/shell.tsx`, `shared.ts`, `collect/landing/demo-showcase.tsx`, `gestion/login-form.tsx`, `supabase/client.ts`, `clip/wordmark.tsx`, `menu/inscription/page.tsx`, `m/[slug]/page.tsx`, `useLanguage`, `use-order-chime.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `backend`, `$schema`, `slug` to the rest of the system?**
  _693 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07003367003367003 - nodes in this community are weakly interconnected._
- **Should `gestion/constants.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07918367346938776 - nodes in this community are weakly interconnected._
- **Should `collect-landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08418367346938775 - nodes in this community are weakly interconnected._
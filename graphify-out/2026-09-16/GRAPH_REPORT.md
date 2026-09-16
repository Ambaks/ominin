# Graph Report - ominin  (2026-09-16)

## Corpus Check
- 626 files · ~1,679,798 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3416 nodes · 10203 edges · 147 communities (125 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 196 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `40a5bea4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useToast
- clip/server.ts
- landing-data.ts
- gestion/constants.ts
- collect-landing-data.ts
- scripts
- gestion/selectors.ts
- notifications/page.tsx
- admin/store.ts
- sumup/server.ts
- square/server.ts
- clip/context.tsx
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
- getRestaurant
- Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)
- push/client.ts
- admin/api.ts
- espace/comptes/creation/page.tsx
- shop/icons.tsx
- createAdminClient
- boho/profile.json
- proxy.ts
- app/page.tsx
- markVisited
- auth-form.tsx
- must
- Setup guide (written for an LLM agent)
- Ominin
- espace/generateur/page.tsx
- What you must do when invoked
- settings.tsx
- graphify reference: extra exports and benchmark
- cart-bar.tsx
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
- formatPrice
- postcss.config.mjs
- backend
- shop/constants.ts
- _template/profile.json
- react
- temps.ts
- components/gestion/shell.tsx
- clip/demo-showcase.tsx
- lead-panel.tsx
- public-menu.ts
- espace/shell.tsx
- admin.ts
- services/autoresearch.py
- carte/page.tsx
- Bridge
- shared.ts
- payment-settings.tsx
- admin/constants.ts
- customer-pane.tsx
- import/page.tsx
- collect/demo/provider.tsx
- gestion/api.ts
- CollectDemoValue
- dependencies
- menu-data.ts
- devDependencies
- lead-cache.ts
- stage.tsx
- createClient
- theme-toggle.tsx
- createClient
- supabase/client.ts
- commande/page.tsx
- admin/format.ts
- shop/types.ts
- clip/wordmark.tsx
- inscription-tabs.tsx
- What you must do when invoked
- menu/gestion/layout.tsx
- gestion/types.ts
- tickets.py
- desinscription/route.ts
- provider/types.ts
- use-order-chime.ts
- restaurants/page.tsx
- orders.ts
- shop/server.ts
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
- next
- portal-data.ts
- What You Must Do When Invoked
- app/layout.tsx
- shop/checkout.ts
- seed-shop.ts
- m/[slug]/page.tsx
- language.tsx
- Ominin
- What you must do when invoked
- What you must do when invoked
- gestion/store.ts
- graphify reference: extra exports and benchmark
- products.ts
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
3. `useToast()` - 123 edges
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
- `EmailTable()` --calls--> `formatRelative()`  [EXTRACTED]
  frontend/app/admin/(shell)/lea/page.tsx → frontend/lib/admin/format.ts
- `GET()` --calls--> `createAdminClient()`  [EXTRACTED]
  frontend/app/api/collect/order/route.ts → frontend/lib/supabase/admin.ts
- `Body` --references--> `ShopOrderStatus`  [EXTRACTED]
  frontend/app/api/shop/gestion/orders/route.ts → frontend/lib/shop/types.ts
- `CreationComptesPage()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/comptes/creation/page.tsx → frontend/lib/clip/context.tsx

## Import Cycles
- None detected.

## Communities (147 total, 14 thin omitted)

### Community 0 - "useToast"
Cohesion: 0.15
Nodes (27): BadgeagePage(), CommandesPage(), dedupeById(), EMPTY_BODIES, matchesFilter(), EtablissementForm(), EtablissementPage(), TablesPage() (+19 more)

### Community 1 - "clip/server.ts"
Cohesion: 0.25
Nodes (14): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+6 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.06
Nodes (47): metadata, DemoShowcase(), Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter() (+39 more)

### Community 3 - "gestion/constants.ts"
Cohesion: 0.06
Nodes (59): CapacitesPage(), openViews(), Capabilities(), OrderTabsCard(), OrderCardDemo(), OrderCard(), STATUS_CLASSES, StatusBadge() (+51 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.07
Nodes (33): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter() (+25 more)

### Community 5 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, db:diff, db:link, db:login, db:push, db:types, dev (+10 more)

### Community 6 - "gestion/selectors.ts"
Cohesion: 0.08
Nodes (44): ApercuPage(), Period, RevenueChart(), TopVentesChart(), DayGroup, dedupeById(), displayMode(), groupByDay() (+36 more)

### Community 7 - "notifications/page.tsx"
Cohesion: 0.19
Nodes (17): DevicesCard(), IOS_STEPS, NotificationsPage(), PrefsCard(), currentEndpoint(), listDevices(), removeDevice(), DispatchBody (+9 more)

### Community 8 - "admin/store.ts"
Cohesion: 0.14
Nodes (25): fetchAllSlugs(), ImportError, importRestaurants(), adminLoginPath(), rowToAppointment(), rowToLeadLite(), uniqueSlug(), commit() (+17 more)

### Community 9 - "sumup/server.ts"
Cohesion: 0.16
Nodes (22): GET(), stateCookie(), GET(), POST(), POST(), POST(), POST(), confirmOrderPaid() (+14 more)

### Community 10 - "square/server.ts"
Cohesion: 0.10
Nodes (43): GET(), stateCookie(), GET(), PATCH(), POST(), Line, orderBody(), POST() (+35 more)

### Community 11 - "clip/context.tsx"
Cohesion: 0.10
Nodes (35): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), replacePost() (+27 more)

### Community 12 - "menu/gestion/produits/page.tsx"
Cohesion: 0.11
Nodes (22): CollectSignupForm(), slugify(), CollectEtablissementPage(), metadata, ProduitsPage(), CheckIcon(), SubscriptionGate(), cardClass (+14 more)

### Community 13 - "formatPrice"
Cohesion: 0.11
Nodes (29): ShopOrderPage(), metadata, PackingSlipPage(), AccountOrdersPage(), OrderStatusBadge(), PrintButton(), Point, SalesChart() (+21 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "ui.tsx"
Cohesion: 0.07
Nodes (48): metadata, metadata, metadata, TrackingPage(), AlertIcon(), InfoIcon(), MailIcon(), PhoneIcon() (+40 more)

### Community 16 - "clip/demo/data.ts"
Cohesion: 0.12
Nodes (24): metadata, DemoBanner(), emptySubscribe(), ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics(), buildDemoPosts() (+16 more)

### Community 17 - "clip-landing-data.ts"
Cohesion: 0.10
Nodes (29): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero(), ClipHowItWorks(), ClipNav() (+21 more)

### Community 18 - "metrics.ts"
Cohesion: 0.08
Nodes (52): ActivitePage(), load(), ClientsPage(), PERIOD_TABS, ClientDetail(), isView(), PERIOD_TABS, EmailsRedirect() (+44 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "upload-post.ts"
Cohesion: 0.12
Nodes (17): PROVIDER_API_URL, PROVIDER_TIMEOUT_MS, providerApiKey(), STORAGE_RETENTION_DAYS, PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider (+9 more)

### Community 21 - "api/contact/route.ts"
Cohesion: 0.19
Nodes (16): invalid(), isContactSource(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, CONTACT_LIMITS (+8 more)

### Community 22 - "getRestaurant"
Cohesion: 0.31
Nodes (8): ClientDemoPage(), generateMetadata(), CollectWordmark(), seed(), getRestaurant(), db, main(), toJson()

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "push/client.ts"
Cohesion: 0.20
Nodes (15): DeviceStatusCard(), PushPrompt(), PUSH_PROMPT_DISMISSED_KEY, deviceLabel(), DeviceSubscription, disablePush(), enablePush(), getPushStatus() (+7 more)

### Community 25 - "admin/api.ts"
Cohesion: 0.06
Nodes (63): EmailTable(), FindingsCard(), hostOf(), percent(), PROSPECT_TILES, ProspectsPanel(), scoreColor(), TabId (+55 more)

### Community 26 - "espace/comptes/creation/page.tsx"
Cohesion: 0.09
Nodes (10): CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, ComptesPage(), ComptesTab, ComptesTabs() (+2 more)

### Community 27 - "shop/icons.tsx"
Cohesion: 0.10
Nodes (24): AccountPage(), metadata, SignOutButton(), isActive(), NAV_ITEMS, NavItem, ROLE_LABELS, ShopGestionShell() (+16 more)

### Community 28 - "createAdminClient"
Cohesion: 0.08
Nodes (49): POST(), ResolvedLine, resolveOptions(), POST(), DELETE(), GET(), POST(), requireUser() (+41 more)

### Community 29 - "boho/profile.json"
Cohesion: 0.06
Nodes (31): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+23 more)

### Community 30 - "proxy.ts"
Cohesion: 0.36
Nodes (7): config, matchesPath(), ProductConfig, PRODUCTS, proxy(), rewritePrefixFor(), @supabase/ssr

### Community 31 - "app/page.tsx"
Cohesion: 0.15
Nodes (16): metadata, PortalApproach(), PortalFinalCta(), PARTICLES, PortalHero(), LanguageToggle(), PortalNav(), BENTO (+8 more)

### Community 32 - "markVisited"
Cohesion: 0.27
Nodes (20): addActivity(), apply(), byDue(), completeTask(), createAppointment(), createTask(), findLite(), liteFor() (+12 more)

### Community 34 - "auth-form.tsx"
Cohesion: 0.15
Nodes (7): metadata, metadata, metadata, metadata, metadata, AuthForm(), Wordmark()

### Community 35 - "must"
Cohesion: 0.09
Nodes (31): LeaPage(), CreateRestaurantModal(), availableSlug(), createRestaurant(), fetchLatestResearchRun(), fetchOutreachEmails(), fetchOutreachProspects(), fetchOutreachRuns() (+23 more)

### Community 36 - "Setup guide (written for an LLM agent)"
Cohesion: 0.15
Nodes (12): 1. Prerequisites, 2. Frontend, 3. Backend, 4. Supabase (database & auth), 5. Graphify (knowledge-graph CLI), 6. Project skills (nothing to install), 7. Outreach agent « Léa » (one-time setup, human-only), 8. Final checklist (+4 more)

### Community 37 - "Ominin"
Cohesion: 0.18
Nodes (10): Business constraints, Code quality, Commands, Conventions, graphify, Ominin, Repo structure, Stack (+2 more)

### Community 38 - "espace/generateur/page.tsx"
Cohesion: 0.14
Nodes (8): GenerateurPage(), MOMENTS, STEPS, PublierTab, PublierTabs(), TABS, SubTab, SubTabs()

### Community 39 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): /commit, Execution requirement, Step 1 — Understand what changed, Step 2 — Project upkeep (required before every push), Step 3 — Safety checks, Step 4 — Write the commit message, Step 5 — Commit and push, Step 6 — Report back (+1 more)

### Community 40 - "settings.tsx"
Cohesion: 0.09
Nodes (27): allura, cormorant, dmSans, dmSerif, FONT_VARIABLES, generateMetadata(), inter, montserrat (+19 more)

### Community 41 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 42 - "cart-bar.tsx"
Cohesion: 0.12
Nodes (20): CartBar(), PaymentChoice, SubmitState, TIP_PERCENTS, TipChoice, PaymentReturn(), State, loadSdk() (+12 more)

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
Nodes (16): name, private, version, eslint, eslint-config-next, react-dom, supabase, tailwindcss (+8 more)

### Community 58 - "formatPrice"
Cohesion: 0.15
Nodes (20): CartLine, cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), lineKey(), lineUnitPrice(), OptionsDialog() (+12 more)

### Community 63 - "shop/constants.ts"
Cohesion: 0.07
Nodes (43): CartPage(), metadata, BagIcon(), CloseIcon(), MenuIcon(), MinusIcon(), PlusIcon(), UserIcon() (+35 more)

### Community 64 - "_template/profile.json"
Cohesion: 0.06
Nodes (30): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+22 more)

### Community 65 - "react"
Cohesion: 0.15
Nodes (18): DUPLICATE_REASON_LABELS, TabletSettings(), ROLES, ConfirmDialog(), IconButton(), TONES, Modal(), ToastApi (+10 more)

### Community 67 - "temps.ts"
Cohesion: 0.08
Nodes (58): EquipePage(), PANE_TAGLINES, PaneId, PANES, ROLES, metadata, PlanningPage(), PlanningPayload (+50 more)

### Community 68 - "components/gestion/shell.tsx"
Cohesion: 0.14
Nodes (17): ApercuIcon(), BellIcon(), ClockIcon(), CommandesIcon(), ExternalLinkIcon(), GearIcon(), LockIcon(), LogoutIcon() (+9 more)

### Community 69 - "clip/demo-showcase.tsx"
Cohesion: 0.22
Nodes (6): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, BrowserFrame(), IphoneFrame(), demoSection

### Community 70 - "lead-panel.tsx"
Cohesion: 0.07
Nodes (42): metadata, ArrowRightIcon(), BotIcon(), CalendarIcon(), ChartIcon(), ChevronLeftIcon(), ClockIcon(), CrosshairIcon() (+34 more)

### Community 71 - "public-menu.ts"
Cohesion: 0.25
Nodes (10): ConfirmationPage(), metadata, CollectPage(), generateMetadata(), getPage, revalidate, applyTarifs(), fetchActiveTarifs() (+2 more)

### Community 72 - "espace/shell.tsx"
Cohesion: 0.09
Nodes (25): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, NavItem, LinkIcon() (+17 more)

### Community 73 - "admin.ts"
Cohesion: 0.14
Nodes (19): RFC-2047, POST(), Role, accessToken(), card(), escapeHtml(), mailConfig(), ROLE_LABELS (+11 more)

### Community 74 - "services/autoresearch.py"
Cohesion: 0.13
Nodes (25): _credentials_env(), _parse(), parse_structured(), The Agent SDK spawns a Claude Code subprocess that authenticates from the…, Single-turn, tool-less Claude call returning schema-validated output. Sync on…, AnalysisFindings, ProposedVariant, ProspectScore (+17 more)

### Community 75 - "carte/page.tsx"
Cohesion: 0.20
Nodes (17): CartePage(), MapCanvas, FollowUpChoice, VisitedFlow(), FOLLOW_UP_QUICK_OPTIONS, GEOLOCATION_TIMEOUT_MS, capturePosition(), getSnapshot() (+9 more)

### Community 76 - "Bridge"
Cohesion: 0.13
Nodes (13): BaseSettings, Settings, Bridge, ensure_token(), main(), Client, Boucle Omilink. Un boîtier neuf génère son jeton, n'en confie que l'empreinte…, Hôtes du réseau local répondant sur le port des imprimantes. (+5 more)

### Community 77 - "shared.ts"
Cohesion: 0.21
Nodes (13): GET(), isTerminal(), OrderConfirmation(), STATUS_COPY, CartChoice, CartLinePayload, COLLECT_ORDER_POLL_MS, CollectCheckoutPayload (+5 more)

### Community 78 - "payment-settings.tsx"
Cohesion: 0.23
Nodes (11): NO_SQUARE, NO_STRIPE, PaymentSettings(), Provider, readStatus(), SquareLocation, SquareStatus, StripeStatus (+3 more)

### Community 79 - "admin/constants.ts"
Cohesion: 0.06
Nodes (46): MapCanvas(), savedViewport(), statusColorExpression, toFeatureCollection(), Viewport, StatusMenu(), ALL_COLUMNS, LeadCard() (+38 more)

### Community 80 - "customer-pane.tsx"
Cohesion: 0.19
Nodes (13): CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView(), TIMELINE, TrackingView(), useNow() (+5 more)

### Community 81 - "import/page.tsx"
Cohesion: 0.18
Nodes (12): Analysis, ImportPage(), parseCoordinate(), ParsedRow, Phase, RowStatus, STATUS_META, CATEGORY_ALIASES (+4 more)

### Community 82 - "collect/demo/provider.tsx"
Cohesion: 0.18
Nodes (13): buildDemoMenu(), COLLECT_DEMO, DEMO_MENU_SPEC, DemoMenuSection, demoRestaurantInfo, DemoStep, CollectDemoContext, CollectDemoProvider() (+5 more)

### Community 83 - "gestion/api.ts"
Cohesion: 0.10
Nodes (48): CategoryManager(), digits(), StaffModal(), apply(), assertTransition(), createCategory(), createFormule(), createItem() (+40 more)

### Community 85 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+4 more)

### Community 86 - "menu-data.ts"
Cohesion: 0.08
Nodes (55): View, ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft() (+47 more)

### Community 87 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, eslint-config-next, supabase, tailwindcss, @tailwindcss/postcss, tsx, @types/node (+5 more)

### Community 88 - "lead-cache.ts"
Cohesion: 0.23
Nodes (11): cache, errors, freshness, LeadDetailState, listeners, notify(), pending, startFetch() (+3 more)

### Community 89 - "stage.tsx"
Cohesion: 0.18
Nodes (12): metadata, BackToLandingLink(), CollectDemoStage(), DemoHint(), Side, CollectDemoShowcase(), nextActionSide(), demoSection (+4 more)

### Community 90 - "createClient"
Cohesion: 0.06
Nodes (65): SignOutButton(), MenuPage(), isoAt(), ShiftModal(), timeInput(), approveOutreachEmail(), promoteVariant(), rejectOutreachEmail() (+57 more)

### Community 91 - "theme-toggle.tsx"
Cohesion: 0.24
Nodes (4): metadata, CategoryLink, ShopLoginForm(), ThemeToggle()

### Community 92 - "createClient"
Cohesion: 0.08
Nodes (32): GET(), EXTENSIONS, POST(), CallBody, POST(), POST(), POST(), isTerminal() (+24 more)

### Community 93 - "supabase/client.ts"
Cohesion: 0.27
Nodes (7): OnboardingForm(), RESERVED_SLUGS, slugify(), metadata, OnboardingPage(), StaffPending(), Offre

### Community 94 - "commande/page.tsx"
Cohesion: 0.32
Nodes (6): CheckoutPage(), metadata, CheckIcon(), CheckoutForm(), getActiveShippingMethods(), paymentsEnabled()

### Community 95 - "admin/format.ts"
Cohesion: 0.11
Nodes (41): ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, TachesPage(), PlusIcon() (+33 more)

### Community 96 - "shop/types.ts"
Cohesion: 0.06
Nodes (54): ImageUploader(), UploadedImage, CategoriesManager(), DiscountDraft, DiscountManager(), FaqManager(), ShippingDraft, ShippingManager() (+46 more)

### Community 97 - "clip/wordmark.tsx"
Cohesion: 0.31
Nodes (3): metadata, metadata, ClipWordmark()

### Community 100 - "inscription-tabs.tsx"
Cohesion: 0.29
Nodes (4): InscriptionTabs(), Profile, TABS, metadata

### Community 102 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): Important notes, /new-restaurant, Phase 1 — Intake, Phase 2 — Research, Phase 3 — Verify with user, Phase 4 — Build the demo profile, Phase 5 — Summary, Updating an existing profile (+1 more)

### Community 109 - "gestion/types.ts"
Cohesion: 0.09
Nodes (37): EncaisserCard(), EncaisserPanel(), sumLines(), sumUnits(), toSelection(), Unit, unitsOf(), CheckMark() (+29 more)

### Community 110 - "tickets.py"
Cohesion: 0.36
Nodes (11): _group_by_category(), _line(), _local(), datetime, Tickets rendus en ESC/POS. Omilink envoie ces octets tels quels à l'imprimante…, Group items by category name, sorted by category position., _render_items(), render_job() (+3 more)

### Community 113 - "desinscription/route.ts"
Cohesion: 0.31
Nodes (10): RFC-8058, confirmFormHtml(), DONE_HTML, GET(), LEAD_DEMOTABLE_FROM, PAGE_SHELL(), params(), POST() (+2 more)

### Community 116 - "provider/types.ts"
Cohesion: 0.10
Nodes (27): POST(), PublierPage(), PublicationsPage(), CaptionEditor(), Dropzone(), formatSize(), CheckIcon(), PlatformBadge() (+19 more)

### Community 121 - "use-order-chime.ts"
Cohesion: 0.20
Nodes (17): ChimeCard(), GestionShell(), isActive(), signOut(), CHIME_STORAGE_KEY, awaitsOnlinePayment(), armedListeners, CHIME_NOTES (+9 more)

### Community 123 - "restaurants/page.tsx"
Cohesion: 0.09
Nodes (35): RFC-4180, COLUMNS, exportColumns(), RestaurantsPage(), MapLeadCard(), FilterBar(), toggleInSet(), LeadStatusBadge() (+27 more)

### Community 125 - "orders.ts"
Cohesion: 0.12
Nodes (40): POST(), POST(), Body, POST(), STATUS_MESSAGES, POST(), POST(), ORDER_STATUS_FLOW (+32 more)

### Community 145 - "shop/server.ts"
Cohesion: 0.09
Nodes (52): ShopCustomersPage(), ShopDiscountsPage(), FILTERS, ShopOrdersPage(), ShopContentPage(), metadata, ShopGestionLayout(), ShopShippingPage() (+44 more)

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
Cohesion: 0.09
Nodes (39): BADGE, DeviceCard(), DOT_CLASS, Editing, Health, LinkState, PrinterCard(), printerHealth() (+31 more)

### Community 161 - "omilink.py"
Cohesion: 0.15
Nodes (20): Device, Authentifie un appareil Omilink par l'empreinte SHA-256 de son jeton., require_device(), require_trigger_secret(), _apply_routing(), _build_routing(), enroll(), EnrollRequest (+12 more)

### Community 167 - "next"
Cohesion: 0.06
Nodes (64): AboutPage(), metadata, revalidate, CatalogPage(), generateMetadata(), revalidate, ConfirmationPage(), metadata (+56 more)

### Community 171 - "portal-data.ts"
Cohesion: 0.17
Nodes (13): metadata, ContactForm(), PortalFooter(), SurMesure(), brand, buildLabel, footer, languageToggle (+5 more)

### Community 172 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 178 - "app/layout.tsx"
Cohesion: 0.13
Nodes (14): fraunces, instrumentSans, metadata, viewport, MENU_PATHS, Providers(), Choice, CookieConsent() (+6 more)

### Community 179 - "shop/checkout.ts"
Cohesion: 0.12
Nodes (29): POST(), POST(), POST(), absoluteImage(), Admin, createCheckoutSession(), priceItems(), validateDiscountCode() (+21 more)

### Community 182 - "seed-shop.ts"
Cohesion: 0.19
Nodes (14): PHONE_LOGIN_DOMAIN, loginEmailFor(), looksLikePhone(), normalizePhone(), phoneToLoginEmail(), CATEGORIES, db, FAQ (+6 more)

### Community 183 - "m/[slug]/page.tsx"
Cohesion: 0.06
Nodes (41): generateMetadata(), getRestaurant, MenuPage(), revalidate, AddToOrder(), choiceRowClass(), isUnavailable(), OptionsModal() (+33 more)

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

### Community 188 - "gestion/store.ts"
Cohesion: 0.13
Nodes (34): TeamManager(), assembleCategories(), OrderRow, rowToEtablissement(), rowToFormule(), rowToMember(), rowToOrder(), rowToPriceRule() (+26 more)

### Community 189 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 195 - "products.ts"
Cohesion: 0.27
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
Nodes (12): A. Paiement en ligne du menu QR (2026-09-15), Accès Supabase pour Marwan (2026-09-15), B. Portail, landing Shop et landing Collect (2026-09-11), C. MyBox : accueil, personnalisation, mobile (2026-09-11), D. Lot MenuBoho : codes, ordre, ticket, planning, encaissements (2026-09-13), E. Square, deuxième encaisseur du menu QR (2026-09-09), En deux gestes (2026-09-15), F. Tableau de bord client (2026-09-11) (+4 more)

## Knowledge Gaps
- **693 isolated node(s):** `backend`, `$schema`, `slug`, `name`, `tagline` (+688 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 951 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `useToast`, `landing-data.ts`, `gestion/constants.ts`, `collect-landing-data.ts`, `gestion/selectors.ts`, `notifications/page.tsx`, `admin/store.ts`, `clip/context.tsx`, `menu/gestion/produits/page.tsx`, `ui.tsx`, `clip/demo/data.ts`, `shop/server.ts`, `metrics.ts`, `push/client.ts`, `admin/api.ts`, `espace/comptes/creation/page.tsx`, `app/page.tsx`, `terminaux/page.tsx`, `auth-form.tsx`, `settings.tsx`, `cart-bar.tsx`, `app/layout.tsx`, `m/[slug]/page.tsx`, `language.tsx`, `package.json`, `formatPrice`, `gestion/store.ts`, `shop/constants.ts`, `temps.ts`, `clip/demo-showcase.tsx`, `lead-panel.tsx`, `public-menu.ts`, `espace/shell.tsx`, `carte/page.tsx`, `shared.ts`, `payment-settings.tsx`, `admin/constants.ts`, `customer-pane.tsx`, `import/page.tsx`, `collect/demo/provider.tsx`, `menu-data.ts`, `lead-cache.ts`, `stage.tsx`, `theme-toggle.tsx`, `supabase/client.ts`, `admin/format.ts`, `shop/types.ts`, `inscription-tabs.tsx`, `gestion/types.ts`, `provider/types.ts`, `use-order-chime.ts`, `restaurants/page.tsx`?**
  _High betweenness centrality (0.250) - this node is a cross-community bridge._
- **Why does `createClient()` connect `createClient` to `gestion/constants.ts`, `notifications/page.tsx`, `admin/store.ts`, `clip/context.tsx`, `menu/gestion/produits/page.tsx`, `ui.tsx`, `metrics.ts`, `admin/api.ts`, `shop/icons.tsx`, `markVisited`, `terminaux/page.tsx`, `auth-form.tsx`, `must`, `cart-bar.tsx`, `formatPrice`, `gestion/store.ts`, `temps.ts`, `components/gestion/shell.tsx`, `lead-panel.tsx`, `espace/shell.tsx`, `payment-settings.tsx`, `gestion/api.ts`, `menu-data.ts`, `lead-cache.ts`, `theme-toggle.tsx`, `createClient`, `supabase/client.ts`, `admin/format.ts`, `use-order-chime.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `createAdminClient` to `clip/server.ts`, `next`, `admin.ts`, `square/server.ts`, `sumup/server.ts`, `shared.ts`, `ui.tsx`, `desinscription/route.ts`, `shop/server.ts`, `shop/checkout.ts`, `api/contact/route.ts`, `createClient`, `orders.ts`, `commande/page.tsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `backend`, `$schema`, `slug` to the rest of the system?**
  _693 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useToast` be split into smaller, more focused modules?**
  _Cohesion score 0.1492063492063492 - nodes in this community are weakly interconnected._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05501165501165501 - nodes in this community are weakly interconnected._
- **Should `gestion/constants.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05921325051759834 - nodes in this community are weakly interconnected._
# Graph Report - ominin  (2026-09-15)

## Corpus Check
- 626 files · ~1,681,331 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3421 nodes · 10208 edges · 143 communities (122 shown, 13 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 196 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `68252561`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useGestionAccess
- admin.ts
- landing-data.ts
- gestion/constants.ts
- collect-landing-data.ts
- scripts
- gestion/selectors.ts
- push/server.ts
- admin/store.ts
- sumup/server.ts
- square/server.ts
- clip/context.tsx
- menu/gestion/produits/page.tsx
- shop/types.ts
- What You Must Do When Invoked
- ui.tsx
- clip/demo/data.ts
- clip-landing-data.ts
- react
- compilerOptions
- upload-post.ts
- api/contact/route.ts
- gestion/types.ts
- Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)
- notifications/page.tsx
- admin/types.ts
- espace/comptes/creation/page.tsx
- shop/icons.tsx
- createAdminClient
- boho/profile.json
- proxy.ts
- app/page.tsx
- admin/api.ts
- next
- seed-crm.ts
- Setup guide (written for an LLM agent)
- Ominin
- espace/generateur/page.tsx
- What you must do when invoked
- settings.tsx
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
- collect-experience.tsx
- postcss.config.mjs
- backend
- formatPrice
- _template/profile.json
- field.tsx
- temps.ts
- components/gestion/shell.tsx
- clip/demo-showcase.tsx
- lead-panel.tsx
- menu-data.ts
- espace/shell.tsx
- services/autoresearch.py
- carte/page.tsx
- Bridge
- shared.ts
- payment-settings.tsx
- admin/constants.ts
- supabase/client.ts
- stage.tsx
- createClient
- dependencies
- tarifs-planifies.tsx
- devDependencies
- collect/landing/demo-showcase.tsx
- check
- createClient
- theme-toggle.tsx
- admin/format.ts
- managers.tsx
- clip/wordmark.tsx
- setup-stripe.ts
- inscription-tabs.tsx
- What you must do when invoked
- menu/gestion/layout.tsx
- filter-bar.tsx
- encaisser-card.tsx
- tickets.py
- desinscription/route.ts
- clip/constants.ts
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
- getShopBySlug
- portal-data.ts
- What You Must Do When Invoked
- app/layout.tsx
- shop/checkout.ts
- seed-shop.ts
- cart-bar.tsx
- language.tsx
- Ominin
- What you must do when invoked
- What you must do when invoked
- gestion/store.ts
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
- `GenerateurPage()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/generateur/page.tsx → frontend/lib/clip/context.tsx
- `CollectEtablissementPage()` --calls--> `createClient()`  [EXTRACTED]
  frontend/app/collect/inscription/etablissement/page.tsx → frontend/lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (143 total, 13 thin omitted)

### Community 0 - "useGestionAccess"
Cohesion: 0.16
Nodes (26): BadgeagePage(), CommandesPage(), dedupeById(), EMPTY_BODIES, matchesFilter(), EquipePage(), EtablissementPage(), TablesPage() (+18 more)

### Community 1 - "admin.ts"
Cohesion: 0.22
Nodes (16): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+8 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.07
Nodes (39): metadata, DemoShowcase(), Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter() (+31 more)

### Community 3 - "gestion/constants.ts"
Cohesion: 0.07
Nodes (52): CapacitesPage(), openViews(), Capabilities(), OrderTabsCard(), STATUS_CLASSES, StatusBadge(), NavItem, Client (+44 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.07
Nodes (35): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter() (+27 more)

### Community 5 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, build, db:diff, db:link, db:login, db:push, db:types, dev (+10 more)

### Community 6 - "gestion/selectors.ts"
Cohesion: 0.08
Nodes (42): ApercuPage(), Period, RevenueChart(), TopVentesChart(), DayGroup, dedupeById(), displayMode(), groupByDay() (+34 more)

### Community 7 - "push/server.ts"
Cohesion: 0.11
Nodes (24): CallBody, POST(), POST(), POST(), CallServerButton(), CallState, CALL_THROTTLE_MS, DispatchBody (+16 more)

### Community 8 - "admin/store.ts"
Cohesion: 0.20
Nodes (20): adminLoginPath(), LEAD_LITE_SELECT, rowToAppointment(), rowToLeadLite(), commit(), fetchAll(), fetchLeads(), fetchOpenTasks() (+12 more)

### Community 9 - "sumup/server.ts"
Cohesion: 0.16
Nodes (22): GET(), stateCookie(), GET(), POST(), POST(), POST(), POST(), confirmOrderPaid() (+14 more)

### Community 10 - "square/server.ts"
Cohesion: 0.10
Nodes (43): GET(), stateCookie(), GET(), PATCH(), POST(), Line, orderBody(), POST() (+35 more)

### Community 11 - "clip/context.tsx"
Cohesion: 0.14
Nodes (23): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), replacePost() (+15 more)

### Community 12 - "menu/gestion/produits/page.tsx"
Cohesion: 0.15
Nodes (20): ProduitsPage(), CheckIcon(), ExternalLinkIcon(), SubscriptionGate(), cardClass, DiscoverLink(), eyebrowClass, Pill() (+12 more)

### Community 13 - "shop/types.ts"
Cohesion: 0.08
Nodes (48): Body, ShopOrderPage(), FILTERS, ShopConversationPage(), metadata, PackingSlipPage(), ConversationView(), ShippingDraft (+40 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "ui.tsx"
Cohesion: 0.07
Nodes (43): AccountConversationPage(), metadata, metadata, TrackingPage(), AlertIcon(), InfoIcon(), SearchIcon(), LoginForm() (+35 more)

### Community 16 - "clip/demo/data.ts"
Cohesion: 0.11
Nodes (25): metadata, DemoBanner(), emptySubscribe(), ClipData, ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics() (+17 more)

### Community 17 - "clip-landing-data.ts"
Cohesion: 0.10
Nodes (28): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero(), ClipHowItWorks(), ClipNav() (+20 more)

### Community 18 - "react"
Cohesion: 0.08
Nodes (55): ActivitePage(), load(), ClientsPage(), PERIOD_TABS, ClientDetail(), isView(), PERIOD_TABS, BarPoint (+47 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "upload-post.ts"
Cohesion: 0.10
Nodes (22): POST(), CAPTION_CONTEXT_MAX_CHARS, captionsSchema(), generateCaptions(), PROVIDER_API_URL, PROVIDER_TIMEOUT_MS, providerApiKey(), CLIP_PLATFORMS (+14 more)

### Community 21 - "api/contact/route.ts"
Cohesion: 0.14
Nodes (19): invalid(), isContactSource(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, LeadForm() (+11 more)

### Community 22 - "gestion/types.ts"
Cohesion: 0.08
Nodes (33): ItemInput, PriceRuleInput, SEED_TABLE_COUNT, OrderRow, DraftOrder, legsOf(), seed(), TableService (+25 more)

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "notifications/page.tsx"
Cohesion: 0.19
Nodes (20): DevicesCard(), DeviceStatusCard(), IOS_STEPS, NotificationsPage(), currentEndpoint(), deviceLabel(), DeviceSubscription, disablePush() (+12 more)

### Community 25 - "admin/types.ts"
Cohesion: 0.07
Nodes (45): EmailTable(), FindingsCard(), hostOf(), percent(), PROSPECT_TILES, ProspectsPanel(), scoreColor(), TabId (+37 more)

### Community 26 - "espace/comptes/creation/page.tsx"
Cohesion: 0.09
Nodes (8): FLEET, PILLARS, STEPS, WEEK, ComptesPage(), ComptesTab, ComptesTabs(), TABS

### Community 27 - "shop/icons.tsx"
Cohesion: 0.08
Nodes (29): AccountPage(), metadata, SignOutButton(), metadata, isActive(), NAV_ITEMS, NavItem, ROLE_LABELS (+21 more)

### Community 28 - "createAdminClient"
Cohesion: 0.11
Nodes (37): POST(), DELETE(), GET(), POST(), requireUser(), EXTENSIONS, POST(), GET() (+29 more)

### Community 29 - "boho/profile.json"
Cohesion: 0.06
Nodes (31): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+23 more)

### Community 30 - "proxy.ts"
Cohesion: 0.36
Nodes (7): config, matchesPath(), ProductConfig, PRODUCTS, proxy(), rewritePrefixFor(), @supabase/ssr

### Community 31 - "app/page.tsx"
Cohesion: 0.14
Nodes (13): metadata, PortalApproach(), PortalFinalCta(), PARTICLES, PortalHero(), BENTO, PortalProducts(), ProductCube() (+5 more)

### Community 32 - "admin/api.ts"
Cohesion: 0.07
Nodes (62): CreateRestaurantModal(), ActivityInput, addActivity(), apply(), availableSlug(), byDue(), completeTask(), createAppointment() (+54 more)

### Community 34 - "next"
Cohesion: 0.14
Nodes (8): metadata, metadata, metadata, metadata, metadata, AuthForm(), Wordmark(), next

### Community 35 - "seed-crm.ts"
Cohesion: 0.21
Nodes (11): Category, daysAgo(), daysAhead(), db, LeadStatus, main(), Priority, R (+3 more)

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
Cohesion: 0.13
Nodes (20): ShopSettingsPage(), Section, StripePanel(), SubscriptionPanel(), ThemeEditor(), CheckCircleIcon(), CircleDashedIcon(), RefreshIcon() (+12 more)

### Community 41 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 42 - "clip/store.ts"
Cohesion: 0.29
Nodes (13): ClipDataProvider(), fetchApi(), getClientSnapshot(), getErrorSnapshot(), getServerSnapshot(), listeners, load(), notify() (+5 more)

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

### Community 58 - "collect-experience.tsx"
Cohesion: 0.24
Nodes (12): CartLine, cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), lineKey(), lineUnitPrice(), OptionsDialog() (+4 more)

### Community 63 - "formatPrice"
Cohesion: 0.05
Nodes (65): allura, cormorant, dmSans, dmSerif, FONT_VARIABLES, generateMetadata(), inter, montserrat (+57 more)

### Community 64 - "_template/profile.json"
Cohesion: 0.06
Nodes (30): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+22 more)

### Community 65 - "field.tsx"
Cohesion: 0.24
Nodes (7): EtablissementForm(), CaptionEditor(), CollectSettings(), TabletSettings(), Field(), inputClass, ClipUploadInput

### Community 67 - "temps.ts"
Cohesion: 0.07
Nodes (66): PANE_TAGLINES, PaneId, PANES, ROLES, TeamManager(), metadata, PlanningPage(), PlanningPayload (+58 more)

### Community 68 - "components/gestion/shell.tsx"
Cohesion: 0.12
Nodes (18): ApercuIcon(), BellIcon(), ClockIcon(), CommandesIcon(), GearIcon(), LockIcon(), LogoutIcon(), MenuIcon() (+10 more)

### Community 69 - "clip/demo-showcase.tsx"
Cohesion: 0.22
Nodes (6): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, BrowserFrame(), IphoneFrame(), demoSection

### Community 70 - "lead-panel.tsx"
Cohesion: 0.08
Nodes (40): metadata, ArrowRightIcon(), BotIcon(), CalendarIcon(), ChartIcon(), ChevronLeftIcon(), ClockIcon(), GlobeIcon() (+32 more)

### Community 71 - "menu-data.ts"
Cohesion: 0.06
Nodes (44): POST(), ResolvedLine, resolveOptions(), ClientDemoPage(), generateMetadata(), ConfirmationPage(), metadata, CollectPage() (+36 more)

### Community 72 - "espace/shell.tsx"
Cohesion: 0.08
Nodes (27): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, CreationComptesPage(), PublierPage() (+19 more)

### Community 74 - "services/autoresearch.py"
Cohesion: 0.13
Nodes (25): _credentials_env(), _parse(), parse_structured(), The Agent SDK spawns a Claude Code subprocess that authenticates from the…, Single-turn, tool-less Claude call returning schema-validated output. Sync on…, AnalysisFindings, ProposedVariant, ProspectScore (+17 more)

### Community 75 - "carte/page.tsx"
Cohesion: 0.18
Nodes (19): CartePage(), CrosshairIcon(), FollowUpChoice, VisitedFlow(), MarkVisitedInput, FOLLOW_UP_QUICK_OPTIONS, GEOLOCATION_TIMEOUT_MS, capturePosition() (+11 more)

### Community 76 - "Bridge"
Cohesion: 0.13
Nodes (13): BaseSettings, Settings, Bridge, ensure_token(), main(), Client, Boucle Omilink. Un boîtier neuf génère son jeton, n'en confie que l'empreinte…, Hôtes du réseau local répondant sur le port des imprimantes. (+5 more)

### Community 77 - "shared.ts"
Cohesion: 0.23
Nodes (12): GET(), isTerminal(), OrderConfirmation(), STATUS_COPY, CartChoice, COLLECT_ORDER_POLL_MS, CollectCheckoutPayload, collectHref() (+4 more)

### Community 78 - "payment-settings.tsx"
Cohesion: 0.24
Nodes (9): NO_SQUARE, NO_STRIPE, PaymentSettings(), Provider, readStatus(), SquareLocation, SquareStatus, StripeStatus (+1 more)

### Community 79 - "admin/constants.ts"
Cohesion: 0.05
Nodes (46): MapCanvas, MapCanvas(), savedViewport(), statusColorExpression, toFeatureCollection(), Viewport, ALL_COLUMNS, LeadCard() (+38 more)

### Community 80 - "supabase/client.ts"
Cohesion: 0.38
Nodes (4): CollectSignupForm(), slugify(), CollectEtablissementPage(), metadata

### Community 82 - "stage.tsx"
Cohesion: 0.06
Nodes (31): CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView(), TIMELINE, TrackingView(), useNow() (+23 more)

### Community 83 - "createClient"
Cohesion: 0.09
Nodes (70): SignOutButton(), MenuPage(), CategoryManager(), apply(), assertTransition(), assignTable(), createCategory(), createFormule() (+62 more)

### Community 85 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+4 more)

### Community 86 - "tarifs-planifies.tsx"
Cohesion: 0.10
Nodes (45): View, ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft() (+37 more)

### Community 87 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, eslint-config-next, supabase, tailwindcss, @tailwindcss/postcss, tsx, @types/node (+5 more)

### Community 89 - "collect/landing/demo-showcase.tsx"
Cohesion: 0.26
Nodes (9): metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), demoSection, collectDemoHref(), collectLandingHref(), emptySubscribe() (+1 more)

### Community 90 - "check"
Cohesion: 0.06
Nodes (48): LeaPage(), PrefsCard(), approveOutreachEmail(), fetchOutreachStats(), fetchProspectCounts(), promoteVariant(), rejectOutreachEmail(), updateImportantNotes() (+40 more)

### Community 92 - "createClient"
Cohesion: 0.08
Nodes (34): RFC-2047, POST(), Role, GET(), EXTENSIONS, POST(), isTerminal(), POST() (+26 more)

### Community 93 - "theme-toggle.tsx"
Cohesion: 0.23
Nodes (7): OnboardingForm(), RESERVED_SLUGS, slugify(), metadata, OnboardingPage(), StaffPending(), ThemeToggle()

### Community 95 - "admin/format.ts"
Cohesion: 0.12
Nodes (39): ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, TachesPage(), PlusIcon() (+31 more)

### Community 96 - "managers.tsx"
Cohesion: 0.07
Nodes (55): ShopCustomersPage(), ShopDiscountsPage(), ShopContentPage(), OptionGroupPage(), ShopOptionsPage(), EditProductPage(), NewProductPage(), ShopProductsPage() (+47 more)

### Community 97 - "clip/wordmark.tsx"
Cohesion: 0.31
Nodes (3): metadata, metadata, ClipWordmark()

### Community 99 - "setup-stripe.ts"
Cohesion: 0.22
Nodes (7): collectOffer, shopOffer, Plan, plans, shopPlans, stripe, zeroPriced

### Community 100 - "inscription-tabs.tsx"
Cohesion: 0.29
Nodes (4): InscriptionTabs(), Profile, TABS, metadata

### Community 102 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): Important notes, /new-restaurant, Phase 1 — Intake, Phase 2 — Research, Phase 3 — Verify with user, Phase 4 — Build the demo profile, Phase 5 — Summary, Updating an existing profile (+1 more)

### Community 105 - "filter-bar.tsx"
Cohesion: 0.16
Nodes (21): FilterBar(), toggleInSet(), FilterIcon(), SearchIcon(), NO_CONTACT_OPTIONS, appointmentIds(), countActiveFilters(), filterLeads() (+13 more)

### Community 109 - "encaisser-card.tsx"
Cohesion: 0.11
Nodes (24): EncaisserCard(), EncaisserPanel(), sumLines(), sumUnits(), toSelection(), Unit, unitsOf(), OrderCard() (+16 more)

### Community 110 - "tickets.py"
Cohesion: 0.36
Nodes (11): _group_by_category(), _line(), _local(), datetime, Tickets rendus en ESC/POS. Omilink envoie ces octets tels quels à l'imprimante…, Group items by category name, sorted by category position., _render_items(), render_job() (+3 more)

### Community 113 - "desinscription/route.ts"
Cohesion: 0.31
Nodes (10): RFC-8058, confirmFormHtml(), DONE_HTML, GET(), LEAD_DEMOTABLE_FROM, PAGE_SHELL(), params(), POST() (+2 more)

### Community 116 - "clip/constants.ts"
Cohesion: 0.13
Nodes (17): PublicationsPage(), Dropzone(), formatSize(), CheckIcon(), PlatformBadge(), PostCard(), STATUS_CLASSES, ACCEPTED_VIDEO_TYPES (+9 more)

### Community 121 - "use-order-chime.ts"
Cohesion: 0.20
Nodes (17): ChimeCard(), GestionShell(), isActive(), signOut(), CHIME_STORAGE_KEY, awaitsOnlinePayment(), armedListeners, CHIME_NOTES (+9 more)

### Community 123 - "restaurants/page.tsx"
Cohesion: 0.08
Nodes (35): RFC-4180, EmailsRedirect(), Analysis, ImportPage(), parseCoordinate(), ParsedRow, Phase, RowStatus (+27 more)

### Community 125 - "orders.ts"
Cohesion: 0.12
Nodes (41): POST(), POST(), POST(), STATUS_MESSAGES, POST(), POST(), ORDER_STATUS_FLOW, base64url() (+33 more)

### Community 145 - "shop/server.ts"
Cohesion: 0.09
Nodes (32): ShopOrdersPage(), metadata, ShopGestionLayout(), ShopShippingPage(), ShopMessagesPage(), ShopDashboardPage(), CheckoutPage(), metadata (+24 more)

### Community 146 - "get_supabase"
Cohesion: 0.15
Nodes (11): get_supabase(), Client, BaseSettings, Settings, daily_cold_count(), Cold emails already sent today, Paris time (the cap's clock)., execute(), Overlap guard: one run per job at a time. Returns the new run id, or None if a… (+3 more)

### Community 147 - "services/inbox.py"
Cohesion: 0.09
Nodes (41): archive_to_label(), ensure_label(), extract_body_text(), decode(), walk(), extract_headers(), get_message(), list_inbox() (+33 more)

### Community 148 - "landing/sections.tsx"
Cohesion: 0.11
Nodes (28): metadata, ShopNav(), ShopAudiences(), ShopContact(), ShopFaq(), ShopFeatures(), ShopFooter(), ShopHero() (+20 more)

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
Nodes (40): BADGE, DeviceCard(), DOT_CLASS, Editing, Health, LinkState, PrinterCard(), printerHealth() (+32 more)

### Community 161 - "omilink.py"
Cohesion: 0.15
Nodes (20): Device, Authentifie un appareil Omilink par l'empreinte SHA-256 de son jeton., require_device(), require_trigger_secret(), _apply_routing(), _build_routing(), enroll(), EnrollRequest (+12 more)

### Community 167 - "getShopBySlug"
Cohesion: 0.06
Nodes (66): AboutPage(), metadata, revalidate, CatalogPage(), generateMetadata(), revalidate, AccountOrderPage(), metadata (+58 more)

### Community 171 - "portal-data.ts"
Cohesion: 0.17
Nodes (17): metadata, ContactForm(), PortalFooter(), LanguageToggle(), PortalNav(), SurMesure(), unsplash(), brand (+9 more)

### Community 172 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 178 - "app/layout.tsx"
Cohesion: 0.13
Nodes (14): fraunces, instrumentSans, metadata, viewport, MENU_PATHS, Providers(), Choice, CookieConsent() (+6 more)

### Community 179 - "shop/checkout.ts"
Cohesion: 0.12
Nodes (30): POST(), POST(), POST(), absoluteImage(), Admin, createCheckoutSession(), PricedItem, priceItems() (+22 more)

### Community 182 - "seed-shop.ts"
Cohesion: 0.15
Nodes (16): metadata, ShopLoginForm(), PHONE_LOGIN_DOMAIN, loginEmailFor(), looksLikePhone(), normalizePhone(), phoneToLoginEmail(), CATEGORIES (+8 more)

### Community 183 - "cart-bar.tsx"
Cohesion: 0.06
Nodes (46): AddToOrder(), choiceRowClass(), isUnavailable(), OptionsModal(), CartBar(), PaymentChoice, SubmitState, TIP_PERCENTS (+38 more)

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
Nodes (33): AdminLockButton(), listeners, lockAdmin(), read(), subscribe(), unlockAdmin(), useAdminUnlocked(), write() (+25 more)

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
Cohesion: 0.11
Nodes (17): 0 bis. Portail, landing Shop et landing Collect (2026-09-11, branche `ominingeneral`), 0. Paiement en ligne du menu QR : la commande attend hors de la caisse (2026-09-15, branche `ominingeneral`), 10. Ominin Shop : mise en ligne des boutiques (2026-09-08), 11. Types Supabase à régénérer (toutes sections), 1. MyBox : photos, accueil, personnalisation (2026-09-11, branche `ShopMyBox`), 2. Étapes du service et équipe sans comptes (2026-09-10), 3. Capacités par restaurant et gestes de salle (2026-09-10), 4. Square, deuxième encaisseur du menu QR (2026-09-09) (+9 more)

## Knowledge Gaps
- **698 isolated node(s):** `backend`, `$schema`, `slug`, `name`, `tagline` (+693 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 956 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `useGestionAccess`, `landing-data.ts`, `gestion/constants.ts`, `collect-landing-data.ts`, `gestion/selectors.ts`, `push/server.ts`, `admin/store.ts`, `clip/context.tsx`, `menu/gestion/produits/page.tsx`, `shop/types.ts`, `ui.tsx`, `clip/demo/data.ts`, `shop/server.ts`, `api/contact/route.ts`, `notifications/page.tsx`, `admin/types.ts`, `espace/comptes/creation/page.tsx`, `app/page.tsx`, `terminaux/page.tsx`, `admin/api.ts`, `next`, `settings.tsx`, `clip/store.ts`, `app/layout.tsx`, `seed-shop.ts`, `cart-bar.tsx`, `language.tsx`, `package.json`, `collect-experience.tsx`, `gestion/store.ts`, `formatPrice`, `field.tsx`, `temps.ts`, `components/gestion/shell.tsx`, `clip/demo-showcase.tsx`, `lead-panel.tsx`, `menu-data.ts`, `espace/shell.tsx`, `carte/page.tsx`, `shared.ts`, `payment-settings.tsx`, `admin/constants.ts`, `supabase/client.ts`, `stage.tsx`, `tarifs-planifies.tsx`, `collect/landing/demo-showcase.tsx`, `theme-toggle.tsx`, `admin/format.ts`, `managers.tsx`, `inscription-tabs.tsx`, `filter-bar.tsx`, `encaisser-card.tsx`, `clip/constants.ts`, `use-order-chime.ts`, `restaurants/page.tsx`?**
  _High betweenness centrality (0.248) - this node is a cross-community bridge._
- **Why does `createClient()` connect `createClient` to `gestion/constants.ts`, `admin/store.ts`, `menu/gestion/produits/page.tsx`, `ui.tsx`, `react`, `shop/icons.tsx`, `admin/api.ts`, `terminaux/page.tsx`, `next`, `clip/store.ts`, `seed-shop.ts`, `cart-bar.tsx`, `gestion/store.ts`, `field.tsx`, `temps.ts`, `components/gestion/shell.tsx`, `lead-panel.tsx`, `menu-data.ts`, `espace/shell.tsx`, `supabase/client.ts`, `tarifs-planifies.tsx`, `check`, `createClient`, `theme-toggle.tsx`, `admin/format.ts`, `use-order-chime.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `createAdminClient` to `admin.ts`, `menu-data.ts`, `push/server.ts`, `sumup/server.ts`, `square/server.ts`, `settings.tsx`, `shared.ts`, `ui.tsx`, `desinscription/route.ts`, `shop/server.ts`, `shop/checkout.ts`, `api/contact/route.ts`, `createClient`, `orders.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `backend`, `$schema`, `slug` to the rest of the system?**
  _698 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06883116883116883 - nodes in this community are weakly interconnected._
- **Should `gestion/constants.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07086197778952935 - nodes in this community are weakly interconnected._
- **Should `collect-landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06966618287373004 - nodes in this community are weakly interconnected._
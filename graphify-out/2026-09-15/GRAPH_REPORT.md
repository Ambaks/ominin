# Graph Report - ominin  (2026-09-11)

## Corpus Check
- 616 files · ~1,671,545 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3390 nodes · 10057 edges · 152 communities (129 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 196 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5613536f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- equipe/page.tsx
- clip/server.ts
- landing-data.ts
- gestion/constants.ts
- collect-landing-data.ts
- scripts
- gestion/selectors.ts
- createAdminClient
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
- metrics.ts
- compilerOptions
- upload-post.ts
- api/contact/route.ts
- getRestaurant
- Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)
- notifications/page.tsx
- getCurrentUser
- espace/comptes/creation/page.tsx
- shop/icons.tsx
- admin.ts
- boho/profile.json
- proxy.ts
- app/page.tsx
- admin/api.ts
- auth-form.tsx
- result.ts
- Setup guide (written for an LLM agent)
- Ominin
- m/[slug]/page.tsx
- What you must do when invoked
- settings.tsx
- graphify reference: extra exports and benchmark
- events.ts
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
- provider/types.ts
- postcss.config.mjs
- backend
- shopHref
- _template/profile.json
- react
- badgeages-log.tsx
- components/gestion/shell.tsx
- add-to-order.tsx
- lead-panel.tsx
- menu-data.ts
- espace/shell.tsx
- temps.ts
- services/autoresearch.py
- carte/page.tsx
- Bridge
- shared.ts
- payment-settings.tsx
- admin/constants.ts
- supabase/client.ts
- collect/checkout/route.ts
- stage.tsx
- gestion/api.ts
- collect/demo/provider.tsx
- dependencies
- gestion/menu/page.tsx
- devDependencies
- espace/analytique/page.tsx
- collect/landing/demo-showcase.tsx
- check
- createClient
- database.types.ts
- theme-toggle.tsx
- CollectDemoValue
- admin/format.ts
- managers.tsx
- clip/wordmark.tsx
- compte/messages/[id]/page.tsx
- setup-stripe.ts
- inscription-tabs.tsx
- [token]/page.tsx
- What you must do when invoked
- menu/gestion/layout.tsx
- invitation/page.tsx
- board.tsx
- gestion/types.ts
- tickets.py
- desinscription/route.ts
- espace/page.tsx
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
- validation.ts
- seed-shop.ts
- menu/cart.tsx
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
1. `createClient()` - 181 edges
2. `react` - 148 edges
3. `useToast()` - 123 edges
4. `createAdminClient()` - 116 edges
5. `check()` - 79 edges
6. `must()` - 74 edges
7. `createClient()` - 67 edges
8. `formatPrice()` - 56 edges
9. `next` - 53 edges
10. `getShopBySlug` - 49 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `createAdminClient()`  [EXTRACTED]
  frontend/app/api/collect/order/route.ts → frontend/lib/supabase/admin.ts
- `Body` --references--> `ShopOrderStatus`  [EXTRACTED]
  frontend/app/api/shop/gestion/orders/route.ts → frontend/lib/shop/types.ts
- `ClipEspaceLayout()` --calls--> `createClient()`  [EXTRACTED]
  frontend/app/clip/espace/layout.tsx → frontend/lib/supabase/server.ts
- `SignOutButton()` --calls--> `createClient()`  [EXTRACTED]
  frontend/app/clip/espace/sign-out-button.tsx → frontend/lib/supabase/client.ts
- `CollectEtablissementPage()` --calls--> `createClient()`  [EXTRACTED]
  frontend/app/collect/inscription/etablissement/page.tsx → frontend/lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (152 total, 15 thin omitted)

### Community 0 - "equipe/page.tsx"
Cohesion: 0.13
Nodes (30): BadgeagePage(), CommandesPage(), dedupeById(), EMPTY_BODIES, matchesFilter(), EquipePage(), PANE_TAGLINES, PaneId (+22 more)

### Community 1 - "clip/server.ts"
Cohesion: 0.28
Nodes (13): GET(), GET(), POST(), GET(), POST(), GET(), POST(), SIGNED_URL_TTL_SECONDS (+5 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.06
Nodes (41): metadata, DemoShowcase(), Faq(), Features(), FinalCta(), Hero(), HowItWorks(), IphoneFrame() (+33 more)

### Community 3 - "gestion/constants.ts"
Cohesion: 0.07
Nodes (52): CapacitesPage(), openViews(), Capabilities(), OrderTabsCard(), OrderCardDemo(), OrderCard(), STATUS_CLASSES, StatusBadge() (+44 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.07
Nodes (34): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter() (+26 more)

### Community 5 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, dev, lint, prebuild, predev, seed:crm, seed:demo (+5 more)

### Community 6 - "gestion/selectors.ts"
Cohesion: 0.08
Nodes (43): ApercuPage(), Period, RevenueChart(), TopVentesChart(), DayGroup, dedupeById(), displayMode(), groupByDay() (+35 more)

### Community 7 - "createAdminClient"
Cohesion: 0.10
Nodes (28): GET(), EXTENSIONS, POST(), CallBody, POST(), POST(), DELETE(), GET() (+20 more)

### Community 8 - "admin/store.ts"
Cohesion: 0.13
Nodes (26): metadata, AdminShell(), isActive(), LoadError(), sectionOf(), signOut(), adminLoginPath(), APPOINTMENTS_WINDOW_DAYS (+18 more)

### Community 9 - "sumup/server.ts"
Cohesion: 0.16
Nodes (22): GET(), stateCookie(), GET(), POST(), POST(), POST(), POST(), confirmOrderPaid() (+14 more)

### Community 10 - "square/server.ts"
Cohesion: 0.10
Nodes (43): GET(), stateCookie(), GET(), PATCH(), POST(), Line, orderBody(), POST() (+35 more)

### Community 11 - "clip/context.tsx"
Cohesion: 0.13
Nodes (33): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), replacePost() (+25 more)

### Community 12 - "menu/gestion/produits/page.tsx"
Cohesion: 0.13
Nodes (23): CollectSignupForm(), slugify(), CollectEtablissementPage(), metadata, ProduitsPage(), ExternalLinkIcon(), SubscriptionGate(), cardClass (+15 more)

### Community 13 - "shop/types.ts"
Cohesion: 0.08
Nodes (34): POST(), CheckoutFormProps, ProductGallery(), ProductBadge(), absoluteImage(), Admin, createCheckoutSession(), PricedItem (+26 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "ui.tsx"
Cohesion: 0.06
Nodes (41): FaqPage(), metadata, revalidate, ShippingDraft, AlertIcon(), ChevronDownIcon(), InfoIcon(), FaqAccordion() (+33 more)

### Community 16 - "clip/demo/data.ts"
Cohesion: 0.12
Nodes (23): metadata, DemoBanner(), emptySubscribe(), ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics(), buildDemoPosts() (+15 more)

### Community 17 - "clip-landing-data.ts"
Cohesion: 0.08
Nodes (32): metadata, ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter() (+24 more)

### Community 18 - "metrics.ts"
Cohesion: 0.09
Nodes (46): ActivitePage(), load(), ClientsPage(), PERIOD_TABS, ClientDetail(), isView(), PERIOD_TABS, BarPoint (+38 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "upload-post.ts"
Cohesion: 0.13
Nodes (15): PROVIDER_API_URL, PROVIDER_TIMEOUT_MS, providerApiKey(), STORAGE_RETENTION_DAYS, CAPTION_FIELDS, ClipProvider, ensureProfile(), getPostStatus() (+7 more)

### Community 21 - "api/contact/route.ts"
Cohesion: 0.16
Nodes (18): invalid(), isContactSource(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, LeadFormCopy (+10 more)

### Community 22 - "getRestaurant"
Cohesion: 0.36
Nodes (8): ClientDemoPage(), generateMetadata(), seed(), getRestaurant(), restaurantThemeClass(), db, main(), toJson()

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "notifications/page.tsx"
Cohesion: 0.18
Nodes (21): DevicesCard(), DeviceStatusCard(), IOS_STEPS, NotificationsPage(), PushPrompt(), PUSH_PROMPT_DISMISSED_KEY, currentEndpoint(), deviceLabel() (+13 more)

### Community 25 - "getCurrentUser"
Cohesion: 0.12
Nodes (18): POST(), CheckoutPage(), metadata, AccountOrderPage(), metadata, AccountOrdersPage(), metadata, AccountMessagesPage() (+10 more)

### Community 26 - "espace/comptes/creation/page.tsx"
Cohesion: 0.06
Nodes (22): AnalytiquePage(), PostAnalyticsList(), CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, ComptesPage() (+14 more)

### Community 27 - "shop/icons.tsx"
Cohesion: 0.06
Nodes (37): AccountPage(), SignOutButton(), ContactPage(), metadata, ImageUploader(), UploadedImage, isActive(), NAV_ITEMS (+29 more)

### Community 28 - "admin.ts"
Cohesion: 0.11
Nodes (30): POST(), Body, STATUS_MESSAGES, EXTENSIONS, POST(), GET(), POST(), isTerminal() (+22 more)

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
Nodes (69): addActivity(), apply(), byDue(), completeTask(), createAppointment(), createTask(), DuplicateCandidate, ExportRow (+61 more)

### Community 34 - "auth-form.tsx"
Cohesion: 0.15
Nodes (7): metadata, metadata, metadata, metadata, metadata, AuthForm(), Wordmark()

### Community 35 - "result.ts"
Cohesion: 0.12
Nodes (18): SEED_TABLE_COUNT, TablesInsert, Category, daysAgo(), daysAhead(), db, LeadStatus, main() (+10 more)

### Community 36 - "Setup guide (written for an LLM agent)"
Cohesion: 0.15
Nodes (12): 1. Prerequisites, 2. Frontend, 3. Backend, 4. Supabase (database & auth), 5. Graphify (knowledge-graph CLI), 6. Project skills (nothing to install), 7. Outreach agent « Léa » (one-time setup, human-only), 8. Final checklist (+4 more)

### Community 37 - "Ominin"
Cohesion: 0.18
Nodes (10): Business constraints, Code quality, Commands, Conventions, graphify, Ominin, Repo structure, Stack (+2 more)

### Community 38 - "m/[slug]/page.tsx"
Cohesion: 0.14
Nodes (11): generateMetadata(), getRestaurant, MenuPage(), revalidate, Hero(), PARTICLES, LANGUAGES, MenuFooter() (+3 more)

### Community 39 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): /commit, Execution requirement, Step 1 — Understand what changed, Step 2 — Project upkeep (required before every push), Step 3 — Safety checks, Step 4 — Write the commit message, Step 5 — Commit and push, Step 6 — Report back (+1 more)

### Community 40 - "settings.tsx"
Cohesion: 0.06
Nodes (35): allura, cormorant, dmSans, dmSerif, FONT_VARIABLES, generateMetadata(), inter, montserrat (+27 more)

### Community 41 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 42 - "events.ts"
Cohesion: 0.18
Nodes (13): POST(), PrefsCard(), DispatchBody, PUSH_EVENT_HINTS, PUSH_EVENT_LABELS, PUSH_EVENTS, PushEvent, ROLE_DEFAULT_PREFS (+5 more)

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

### Community 58 - "provider/types.ts"
Cohesion: 0.16
Nodes (12): POST(), CAPTION_CONTEXT_MAX_CHARS, captionsSchema(), generateCaptions(), ClipActions, CaptionSet, ClipPlatform, PlatformResult (+4 more)

### Community 63 - "shopHref"
Cohesion: 0.07
Nodes (56): metadata, metadata, metadata, TrackingPage(), ArrowRightIcon(), BagIcon(), GiftIcon(), LockIcon() (+48 more)

### Community 64 - "_template/profile.json"
Cohesion: 0.06
Nodes (30): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+22 more)

### Community 65 - "react"
Cohesion: 0.11
Nodes (39): EtablissementForm(), RESERVED_SLUGS, NoteComposer, FollowUpChoice, VisitedFlow(), AppointmentFormModal(), RestaurantPicker(), DUPLICATE_REASON_LABELS (+31 more)

### Community 67 - "badgeages-log.tsx"
Cohesion: 0.14
Nodes (33): BadgeagesLog(), CorrectionModal(), localInput(), Action, ACTION_LABELS, Badgeuse(), dayLabel(), isToday() (+25 more)

### Community 68 - "components/gestion/shell.tsx"
Cohesion: 0.13
Nodes (17): ApercuIcon(), BellIcon(), ChevronDownIcon(), ClockIcon(), CommandesIcon(), GearIcon(), LockIcon(), LogoutIcon() (+9 more)

### Community 69 - "add-to-order.tsx"
Cohesion: 0.31
Nodes (9): AddToOrder(), choiceRowClass(), isUnavailable(), OptionsModal(), CallServerButton(), CallState, cartLineKey(), useCart() (+1 more)

### Community 70 - "lead-panel.tsx"
Cohesion: 0.10
Nodes (34): FindingsCard(), ArrowRightIcon(), BotIcon(), CalendarIcon(), ChartIcon(), ClockIcon(), FilterIcon(), GlobeIcon() (+26 more)

### Community 71 - "menu-data.ts"
Cohesion: 0.08
Nodes (34): CartLine, cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), lineKey(), lineUnitPrice(), OptionsDialog() (+26 more)

### Community 72 - "espace/shell.tsx"
Cohesion: 0.16
Nodes (14): ClipEspaceLayout(), metadata, NavItem, LinkIcon(), ListIcon(), UploadIcon(), ClipShell(), isActive() (+6 more)

### Community 73 - "temps.ts"
Cohesion: 0.15
Nodes (17): isoAt(), ShiftModal(), timeInput(), clockIn(), clockOut(), correctEntry(), createShift(), deleteEntry() (+9 more)

### Community 74 - "services/autoresearch.py"
Cohesion: 0.13
Nodes (25): _credentials_env(), _parse(), parse_structured(), The Agent SDK spawns a Claude Code subprocess that authenticates from the…, Single-turn, tool-less Claude call returning schema-validated output. Sync on…, AnalysisFindings, ProposedVariant, ProspectScore (+17 more)

### Community 75 - "carte/page.tsx"
Cohesion: 0.28
Nodes (13): CartePage(), CrosshairIcon(), GEOLOCATION_TIMEOUT_MS, getSnapshot(), isWatching(), listeners, notify(), startWatch() (+5 more)

### Community 76 - "Bridge"
Cohesion: 0.13
Nodes (13): BaseSettings, Settings, Bridge, ensure_token(), main(), Client, Boucle Omilink. Un boîtier neuf génère son jeton, n'en confie que l'empreinte…, Hôtes du réseau local répondant sur le port des imprimantes. (+5 more)

### Community 77 - "shared.ts"
Cohesion: 0.18
Nodes (14): GET(), ConfirmationPage(), metadata, isTerminal(), OrderConfirmation(), STATUS_COPY, CartChoice, COLLECT_ORDER_POLL_MS (+6 more)

### Community 78 - "payment-settings.tsx"
Cohesion: 0.24
Nodes (9): NO_SQUARE, NO_STRIPE, PaymentSettings(), Provider, readStatus(), SquareLocation, SquareStatus, StripeStatus (+1 more)

### Community 79 - "admin/constants.ts"
Cohesion: 0.04
Nodes (67): MapCanvas, hostOf(), percent(), PROSPECT_TILES, ProspectsPanel(), scoreColor(), TabId, VARIANT_ORDER (+59 more)

### Community 80 - "supabase/client.ts"
Cohesion: 0.09
Nodes (22): SignOutButton(), CartBar(), PaymentChoice, SubmitState, TIP_PERCENTS, TipChoice, loadSdk(), PaymentState (+14 more)

### Community 81 - "collect/checkout/route.ts"
Cohesion: 0.27
Nodes (9): POST(), ResolvedLine, resolveOptions(), CollectPage(), generateMetadata(), getPage, revalidate, isCollectActive() (+1 more)

### Community 82 - "stage.tsx"
Cohesion: 0.15
Nodes (17): CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView(), TIMELINE, TrackingView(), useNow() (+9 more)

### Community 83 - "gestion/api.ts"
Cohesion: 0.10
Nodes (46): CategoryManager(), apply(), assertTransition(), assignTable(), createCategory(), createFormule(), createItem(), createPriceRule() (+38 more)

### Community 84 - "collect/demo/provider.tsx"
Cohesion: 0.18
Nodes (13): buildDemoMenu(), DEMO_MENU_SPEC, DemoMenuSection, demoRestaurantInfo, DemoStep, CollectDemoContext, CollectDemoProvider(), CollectDemoState (+5 more)

### Community 85 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+4 more)

### Community 86 - "gestion/menu/page.tsx"
Cohesion: 0.15
Nodes (31): View, ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft() (+23 more)

### Community 87 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx, @types/node, @types/qrcode (+4 more)

### Community 88 - "espace/analytique/page.tsx"
Cohesion: 0.15
Nodes (10): AnalyticsView, compact, VIEW_SUBTITLES, VIEWS, RefreshIcon(), compact, LoadedRow, METRIC_COLUMNS (+2 more)

### Community 89 - "collect/landing/demo-showcase.tsx"
Cohesion: 0.26
Nodes (9): metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), demoSection, collectDemoHref(), collectLandingHref(), emptySubscribe() (+1 more)

### Community 90 - "check"
Cohesion: 0.08
Nodes (35): CategoryInput, deleteCategory(), deleteDiscountCode(), deleteFaqItem(), deleteOptionGroup(), deleteProduct(), deleteShippingMethod(), DiscountCodeInput (+27 more)

### Community 91 - "createClient"
Cohesion: 0.12
Nodes (36): LeaPage(), MenuPage(), CreateRestaurantModal(), approveOutreachEmail(), availableSlug(), createRestaurant(), fetchAppointments(), fetchLatestResearchRun() (+28 more)

### Community 92 - "database.types.ts"
Cohesion: 0.13
Nodes (22): RFC-2047, POST(), Role, isTerminal(), POST(), Product, PRODUCTS_BY_CHOICE, accessToken() (+14 more)

### Community 93 - "theme-toggle.tsx"
Cohesion: 0.18
Nodes (8): OnboardingForm(), slugify(), metadata, OnboardingPage(), StaffPending(), CategoryLink, CategoryNav(), ThemeToggle()

### Community 95 - "admin/format.ts"
Cohesion: 0.15
Nodes (29): ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, TachesPage(), PlusIcon() (+21 more)

### Community 96 - "managers.tsx"
Cohesion: 0.07
Nodes (62): ShopCustomersPage(), ShopOrderPage(), ShopMessagesPage(), ShopDashboardPage(), metadata, PackingSlipPage(), CategoriesManager(), DiscountDraft (+54 more)

### Community 97 - "clip/wordmark.tsx"
Cohesion: 0.23
Nodes (4): metadata, metadata, ClipLoader(), ClipWordmark()

### Community 98 - "compte/messages/[id]/page.tsx"
Cohesion: 0.31
Nodes (7): AccountConversationPage(), metadata, CustomerReplyForm(), MessageBubbles(), Textarea(), getConversationForUser(), ShopMessage

### Community 99 - "setup-stripe.ts"
Cohesion: 0.22
Nodes (7): collectOffer, shopOffer, Plan, plans, shopPlans, stripe, zeroPriced

### Community 100 - "inscription-tabs.tsx"
Cohesion: 0.29
Nodes (4): InscriptionTabs(), Profile, TABS, metadata

### Community 101 - "[token]/page.tsx"
Cohesion: 0.43
Nodes (5): metadata, PlanningPage(), PlanningPayload, PlanningPublic(), weekStart()

### Community 102 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): Important notes, /new-restaurant, Phase 1 — Intake, Phase 2 — Research, Phase 3 — Verify with user, Phase 4 — Build the demo profile, Phase 5 — Summary, Updating an existing profile (+1 more)

### Community 105 - "board.tsx"
Cohesion: 0.10
Nodes (30): FilterBar(), toggleInSet(), StatusMenu(), ALL_COLUMNS, PipelineBoard(), DragState, useBoardDrag(), CheckIcon() (+22 more)

### Community 109 - "gestion/types.ts"
Cohesion: 0.08
Nodes (38): EncaisserCard(), EncaisserPanel(), sumLines(), sumUnits(), toSelection(), Unit, unitsOf(), CheckMark() (+30 more)

### Community 110 - "tickets.py"
Cohesion: 0.36
Nodes (11): _group_by_category(), _line(), _local(), datetime, Tickets rendus en ESC/POS. Omilink envoie ces octets tels quels à l'imprimante…, Group items by category name, sorted by category position., _render_items(), render_job() (+3 more)

### Community 113 - "desinscription/route.ts"
Cohesion: 0.31
Nodes (10): RFC-8058, confirmFormHtml(), DONE_HTML, GET(), LEAD_DEMOTABLE_FROM, PAGE_SHELL(), params(), POST() (+2 more)

### Community 116 - "espace/page.tsx"
Cohesion: 0.11
Nodes (18): POST(), PublierPage(), CaptionEditor(), Dropzone(), formatSize(), CheckIcon(), PlatformBadge(), PostCard() (+10 more)

### Community 121 - "use-order-chime.ts"
Cohesion: 0.21
Nodes (16): ChimeCard(), GestionShell(), isActive(), signOut(), CHIME_STORAGE_KEY, armedListeners, CHIME_NOTES, chimeEnabled() (+8 more)

### Community 123 - "restaurants/page.tsx"
Cohesion: 0.08
Nodes (37): RFC-4180, EmailsRedirect(), Analysis, ImportPage(), parseCoordinate(), ParsedRow, Phase, RowStatus (+29 more)

### Community 125 - "orders.ts"
Cohesion: 0.14
Nodes (37): POST(), POST(), POST(), POST(), loadOrder(), base64url(), buildRawMessage(), encodeSubject() (+29 more)

### Community 145 - "shop/server.ts"
Cohesion: 0.10
Nodes (42): GET(), ShopDiscountsPage(), FILTERS, ShopOrdersPage(), ShopContentPage(), metadata, ShopGestionLayout(), ShopShippingPage() (+34 more)

### Community 146 - "get_supabase"
Cohesion: 0.15
Nodes (11): get_supabase(), Client, BaseSettings, Settings, daily_cold_count(), Cold emails already sent today, Paris time (the cap's clock)., execute(), Overlap guard: one run per job at a time. Returns the new run id, or None if a… (+3 more)

### Community 147 - "services/inbox.py"
Cohesion: 0.09
Nodes (41): archive_to_label(), ensure_label(), extract_body_text(), decode(), walk(), extract_headers(), get_message(), list_inbox() (+33 more)

### Community 148 - "landing/sections.tsx"
Cohesion: 0.10
Nodes (30): metadata, ShopNav(), ShopAudiences(), ShopContact(), ShopFaq(), ShopFeatures(), ShopFooter(), ShopHero() (+22 more)

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
Cohesion: 0.07
Nodes (45): AboutPage(), metadata, revalidate, CatalogPage(), generateMetadata(), revalidate, ConfirmationPage(), GiftPage() (+37 more)

### Community 171 - "portal-data.ts"
Cohesion: 0.16
Nodes (17): metadata, LeadForm(), ContactForm(), PortalFooter(), LanguageToggle(), PortalNav(), SurMesure(), brand (+9 more)

### Community 172 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 178 - "app/layout.tsx"
Cohesion: 0.13
Nodes (14): fraunces, instrumentSans, metadata, viewport, MENU_PATHS, Providers(), Choice, CookieConsent() (+6 more)

### Community 179 - "validation.ts"
Cohesion: 0.25
Nodes (16): POST(), AddressInput, CheckoutInput, CheckoutItemInput, ContactInput, fail(), optionalText(), parseAddress() (+8 more)

### Community 182 - "seed-shop.ts"
Cohesion: 0.15
Nodes (16): metadata, ShopLoginForm(), PHONE_LOGIN_DOMAIN, loginEmailFor(), looksLikePhone(), normalizePhone(), phoneToLoginEmail(), CATEGORIES (+8 more)

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

### Community 188 - "gestion/store.ts"
Cohesion: 0.11
Nodes (38): TeamManager(), AdminLockButton(), listeners, lockAdmin(), read(), subscribe(), unlockAdmin(), useAdminUnlocked() (+30 more)

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
Nodes (12): 0. Portail, landing Shop et landing Collect (2026-09-11, branche `ominingeneral`), 10. Ominin Shop : mise en ligne des boutiques (2026-09-08), 1. MyBox : photos, accueil, personnalisation (2026-09-11, branche `ShopMyBox`), 2. Étapes du service et équipe sans comptes (2026-09-10), 3. Capacités par restaurant et gestes de salle (2026-09-10), 4. Square, deuxième encaisseur du menu QR (2026-09-09), 5. Analytique du menu QR et tableau de bord client (2026-09-11), 6. Commission des boutiques : poser le taux (2026-09-09) (+4 more)

## Knowledge Gaps
- **684 isolated node(s):** `backend`, `$schema`, `slug`, `name`, `tagline` (+679 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 941 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `equipe/page.tsx`, `landing-data.ts`, `gestion/constants.ts`, `collect-landing-data.ts`, `gestion/selectors.ts`, `admin/store.ts`, `clip/context.tsx`, `menu/gestion/produits/page.tsx`, `shop/types.ts`, `ui.tsx`, `clip/demo/data.ts`, `clip-landing-data.ts`, `metrics.ts`, `shop/server.ts`, `api/contact/route.ts`, `notifications/page.tsx`, `espace/comptes/creation/page.tsx`, `shop/icons.tsx`, `app/page.tsx`, `terminaux/page.tsx`, `admin/api.ts`, `auth-form.tsx`, `m/[slug]/page.tsx`, `settings.tsx`, `app/layout.tsx`, `seed-shop.ts`, `menu/cart.tsx`, `language.tsx`, `package.json`, `gestion/store.ts`, `shopHref`, `badgeages-log.tsx`, `add-to-order.tsx`, `lead-panel.tsx`, `menu-data.ts`, `temps.ts`, `carte/page.tsx`, `shared.ts`, `payment-settings.tsx`, `admin/constants.ts`, `supabase/client.ts`, `collect/checkout/route.ts`, `stage.tsx`, `collect/demo/provider.tsx`, `gestion/menu/page.tsx`, `espace/analytique/page.tsx`, `collect/landing/demo-showcase.tsx`, `theme-toggle.tsx`, `admin/format.ts`, `managers.tsx`, `compte/messages/[id]/page.tsx`, `inscription-tabs.tsx`, `board.tsx`, `gestion/types.ts`, `espace/page.tsx`, `use-order-chime.ts`, `restaurants/page.tsx`?**
  _High betweenness centrality (0.250) - this node is a cross-community bridge._
- **Why does `createClient()` connect `createClient` to `equipe/page.tsx`, `gestion/constants.ts`, `admin/store.ts`, `clip/context.tsx`, `menu/gestion/produits/page.tsx`, `metrics.ts`, `shop/icons.tsx`, `admin/api.ts`, `terminaux/page.tsx`, `auth-form.tsx`, `events.ts`, `seed-shop.ts`, `gestion/store.ts`, `shopHref`, `react`, `badgeages-log.tsx`, `components/gestion/shell.tsx`, `lead-panel.tsx`, `menu-data.ts`, `espace/shell.tsx`, `temps.ts`, `supabase/client.ts`, `gestion/api.ts`, `check`, `theme-toggle.tsx`, `admin/format.ts`, `invitation/page.tsx`, `use-order-chime.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `createAdminClient` to `clip/server.ts`, `compte/messages/[id]/page.tsx`, `sumup/server.ts`, `square/server.ts`, `shared.ts`, `shop/types.ts`, `admin.ts`, `collect/checkout/route.ts`, `desinscription/route.ts`, `validation.ts`, `espace/page.tsx`, `api/contact/route.ts`, `shop/server.ts`, `getCurrentUser`, `database.types.ts`, `orders.ts`, `shopHref`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `backend`, `$schema`, `slug` to the rest of the system?**
  _684 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `equipe/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12944523470839261 - nodes in this community are weakly interconnected._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06370543541788427 - nodes in this community are weakly interconnected._
- **Should `gestion/constants.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07350608143839238 - nodes in this community are weakly interconnected._
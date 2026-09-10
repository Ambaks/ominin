# Graph Report - ominin  (2026-09-10)

## Corpus Check
- 606 files · ~1,675,653 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3318 nodes · 9827 edges · 151 communities (129 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 191 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a7d7906e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- menu/gestion/commandes/page.tsx
- clip/server.ts
- landing-data.ts
- gestion/store.ts
- collect-landing-data.ts
- scripts
- gestion/selectors.ts
- lead-cache.ts
- admin/store.ts
- sumup/server.ts
- square/server.ts
- clip/context.tsx
- menu/gestion/produits/page.tsx
- stage.tsx
- What You Must Do When Invoked
- useAdminBasePath
- clip/demo/data.ts
- clip-landing-data.ts
- metrics.ts
- compilerOptions
- upload-post.ts
- api/contact/route.ts
- result.ts
- Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)
- notifications/page.tsx
- gestion/constants.ts
- espace/comptes/creation/page.tsx
- getCurrentUser
- getStripe
- boho/profile.json
- proxy.ts
- app/page.tsx
- getRestaurant
- brand/wordmark.tsx
- shared.ts
- Setup guide (written for an LLM agent)
- Ominin
- m/[slug]/page.tsx
- What you must do when invoked
- admin/api.ts
- graphify reference: extra exports and benchmark
- must
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
- admin.ts
- postcss.config.mjs
- backend
- createAdminClient
- _template/profile.json
- item-form-modal.tsx
- useToast
- react
- shop/types.ts
- lead-panel.tsx
- invite/route.ts
- clip/store.ts
- shop/checkout.ts
- services/autoresearch.py
- espace/page.tsx
- Bridge
- collect/landing/demo-showcase.tsx
- collect/checkout/route.ts
- admin/constants.ts
- cart-bar.tsx
- use-order-chime.ts
- collect/demo/provider.tsx
- gestion/api.ts
- CollectDemoValue
- dependencies
- shop/icons.tsx
- devDependencies
- clip/demo-showcase.tsx
- add-to-order.tsx
- createClient
- form.tsx
- prefs.ts
- setup-stripe.ts
- captions/route.ts
- admin/format.ts
- managers.tsx
- onboarding/page.tsx
- shop/connexion/page.tsx
- settings.tsx
- What you must do when invoked
- push/server.ts
- filter-bar.tsx
- espace/shell.tsx
- encaisser-card.tsx
- tickets.py
- desinscription/route.ts
- clip/constants.ts
- components/gestion/shell.tsx
- restaurants/page.tsx
- orders.ts
- shop/server.ts
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
- gestion/types.ts
- golden-image.sh
- ui.tsx
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
- portal-data.ts
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
1. `createClient()` - 172 edges
2. `react` - 147 edges
3. `useToast()` - 120 edges
4. `createAdminClient()` - 116 edges
5. `check()` - 76 edges
6. `must()` - 72 edges
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
- `GenerateurPage()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/generateur/page.tsx → frontend/lib/clip/context.tsx
- `ClipEspaceLayout()` --calls--> `createClient()`  [EXTRACTED]
  frontend/app/clip/espace/layout.tsx → frontend/lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (151 total, 14 thin omitted)

### Community 0 - "menu/gestion/commandes/page.tsx"
Cohesion: 0.18
Nodes (18): CommandesPage(), dedupeById(), EMPTY_BODIES, matchesFilter(), DayGroup, FeatureLocked(), serviceTitle(), TableSheet() (+10 more)

### Community 1 - "clip/server.ts"
Cohesion: 0.20
Nodes (17): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+9 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.07
Nodes (39): metadata, DemoShowcase(), Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter() (+31 more)

### Community 3 - "gestion/store.ts"
Cohesion: 0.11
Nodes (37): TeamManager(), AdminLockButton(), LockIcon(), LoadError(), StripePrompt(), listeners, lockAdmin(), read() (+29 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.09
Nodes (30): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter() (+22 more)

### Community 5 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, dev, lint, prebuild, predev, seed:crm, seed:demo (+5 more)

### Community 6 - "gestion/selectors.ts"
Cohesion: 0.07
Nodes (50): EtablissementPage(), ApercuPage(), Period, RevenueChart(), TopVentesChart(), dedupeById(), displayMode(), groupByDay() (+42 more)

### Community 7 - "lead-cache.ts"
Cohesion: 0.13
Nodes (34): NoteComposer, addActivity(), apply(), byDue(), completeTask(), createAppointment(), createTask(), findLite() (+26 more)

### Community 8 - "admin/store.ts"
Cohesion: 0.25
Nodes (17): adminLoginPath(), commit(), fetchAll(), fetchLeads(), fetchOpenTasks(), fetchPendingDraftCount(), fetchUpcomingAppointments(), getErrorSnapshot() (+9 more)

### Community 9 - "sumup/server.ts"
Cohesion: 0.16
Nodes (22): GET(), stateCookie(), GET(), POST(), POST(), POST(), POST(), confirmOrderPaid() (+14 more)

### Community 10 - "square/server.ts"
Cohesion: 0.10
Nodes (42): GET(), stateCookie(), GET(), PATCH(), POST(), Line, orderBody(), POST() (+34 more)

### Community 11 - "clip/context.tsx"
Cohesion: 0.15
Nodes (22): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), replacePost() (+14 more)

### Community 12 - "menu/gestion/produits/page.tsx"
Cohesion: 0.18
Nodes (15): CheckIcon(), ExternalLinkIcon(), cardClass, DiscoverLink(), eyebrowClass, Pill(), ProductCard(), productLinkClass (+7 more)

### Community 13 - "stage.tsx"
Cohesion: 0.14
Nodes (17): CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView(), TIMELINE, TrackingView(), useNow() (+9 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "useAdminBasePath"
Cohesion: 0.19
Nodes (16): CartePage(), EmailsRedirect(), PriorityBadge(), TaskRowItem(), useAdminBasePath(), GEOLOCATION_TIMEOUT_MS, getSnapshot(), isWatching() (+8 more)

### Community 16 - "clip/demo/data.ts"
Cohesion: 0.11
Nodes (26): metadata, DemoBanner(), emptySubscribe(), ClipData, ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics() (+18 more)

### Community 17 - "clip-landing-data.ts"
Cohesion: 0.08
Nodes (30): metadata, metadata, metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero() (+22 more)

### Community 18 - "metrics.ts"
Cohesion: 0.08
Nodes (49): ActivitePage(), load(), ClientsPage(), PERIOD_TABS, ClientDetail(), isView(), PERIOD_TABS, EmailTable() (+41 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "upload-post.ts"
Cohesion: 0.12
Nodes (17): PROVIDER_API_URL, PROVIDER_TIMEOUT_MS, providerApiKey(), PlatformResult, PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider (+9 more)

### Community 21 - "api/contact/route.ts"
Cohesion: 0.23
Nodes (12): invalid(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, CONTACT_LIMITS, ContactField (+4 more)

### Community 22 - "result.ts"
Cohesion: 0.19
Nodes (11): Category, daysAgo(), daysAhead(), db, LeadStatus, main(), Priority, R (+3 more)

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "notifications/page.tsx"
Cohesion: 0.18
Nodes (21): DevicesCard(), DeviceStatusCard(), IOS_STEPS, NotificationsPage(), PushPrompt(), PUSH_PROMPT_DISMISSED_KEY, currentEndpoint(), deviceLabel() (+13 more)

### Community 25 - "gestion/constants.ts"
Cohesion: 0.07
Nodes (52): CapacitesPage(), openViews(), ProduitsPage(), Capabilities(), OrderTabsCard(), STATUS_CLASSES, StatusBadge(), NavItem (+44 more)

### Community 26 - "espace/comptes/creation/page.tsx"
Cohesion: 0.08
Nodes (16): AnalytiquePage(), PostAnalyticsList(), CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, ComptesPage() (+8 more)

### Community 27 - "getCurrentUser"
Cohesion: 0.09
Nodes (25): POST(), CheckoutPage(), metadata, AccountOrderPage(), metadata, AccountOrdersPage(), metadata, AccountConversationPage() (+17 more)

### Community 28 - "getStripe"
Cohesion: 0.12
Nodes (29): EXTENSIONS, POST(), GET(), POST(), isTerminal(), POST(), GET(), POST() (+21 more)

### Community 29 - "boho/profile.json"
Cohesion: 0.06
Nodes (31): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+23 more)

### Community 30 - "proxy.ts"
Cohesion: 0.36
Nodes (7): config, matchesPath(), ProductConfig, PRODUCTS, proxy(), rewritePrefixFor(), @supabase/ssr

### Community 31 - "app/page.tsx"
Cohesion: 0.13
Nodes (14): metadata, PortalApproach(), PortalFinalCta(), PARTICLES, PortalHero(), BENTO_SPANS, PortalProducts(), ProductCube() (+6 more)

### Community 32 - "getRestaurant"
Cohesion: 0.36
Nodes (8): ClientDemoPage(), generateMetadata(), seed(), getRestaurant(), restaurantThemeClass(), db, main(), toJson()

### Community 34 - "brand/wordmark.tsx"
Cohesion: 0.10
Nodes (13): metadata, metadata, metadata, metadata, InscriptionTabs(), Profile, TABS, metadata (+5 more)

### Community 35 - "shared.ts"
Cohesion: 0.19
Nodes (14): GET(), ConfirmationPage(), metadata, isTerminal(), OrderConfirmation(), STATUS_COPY, CartChoice, COLLECT_ORDER_POLL_MS (+6 more)

### Community 36 - "Setup guide (written for an LLM agent)"
Cohesion: 0.15
Nodes (12): 1. Prerequisites, 2. Frontend, 3. Backend, 4. Supabase (database & auth), 5. Graphify (knowledge-graph CLI), 6. Project skills (nothing to install), 7. Outreach agent « Léa » (one-time setup, human-only), 8. Final checklist (+4 more)

### Community 37 - "Ominin"
Cohesion: 0.18
Nodes (10): Business constraints, Code quality, Commands, Conventions, graphify, Ominin, Repo structure, Stack (+2 more)

### Community 38 - "m/[slug]/page.tsx"
Cohesion: 0.14
Nodes (11): generateMetadata(), getRestaurant, MenuPage(), revalidate, CategoryNav(), Hero(), PARTICLES, LANGUAGES (+3 more)

### Community 39 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): /commit, Execution requirement, Step 1 — Understand what changed, Step 2 — Project upkeep (required before every push), Step 3 — Safety checks, Step 4 — Write the commit message, Step 5 — Commit and push, Step 6 — Report back (+1 more)

### Community 40 - "admin/api.ts"
Cohesion: 0.06
Nodes (76): FindingsCard(), hostOf(), LeaPage(), percent(), PROSPECT_TILES, ProspectsPanel(), scoreColor(), TabId (+68 more)

### Community 41 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 42 - "must"
Cohesion: 0.15
Nodes (17): MenuPage(), fetchAppointments(), findDuplicates(), deleteFormule(), groupTables(), reprintTickets(), updateCashDetails(), updateCategoryTagline() (+9 more)

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
Nodes (16): name, private, version, eslint, eslint-config-next, maplibre-gl, react-dom, tailwindcss (+8 more)

### Community 58 - "admin.ts"
Cohesion: 0.11
Nodes (19): Body, STATUS_MESSAGES, isTerminal(), POST(), Product, PRODUCTS_BY_CHOICE, ORDER_STATUS_FLOW, CompositeTypes (+11 more)

### Community 63 - "createAdminClient"
Cohesion: 0.23
Nodes (10): GET(), EXTENSIONS, POST(), POST(), DELETE(), GET(), POST(), requireUser() (+2 more)

### Community 64 - "_template/profile.json"
Cohesion: 0.06
Nodes (30): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+22 more)

### Community 65 - "item-form-modal.tsx"
Cohesion: 0.19
Nodes (25): ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft(), FormuleFormModal() (+17 more)

### Community 67 - "useToast"
Cohesion: 0.07
Nodes (71): BadgeagePage(), EquipePage(), PANE_TAGLINES, PaneId, PANES, ROLES, View, metadata (+63 more)

### Community 68 - "react"
Cohesion: 0.16
Nodes (12): EtablissementForm(), InvitationForm(), InvitationPage(), RESERVED_SLUGS, DUPLICATE_REASON_LABELS, CollectSettings(), TabletSettings(), CategoryLink (+4 more)

### Community 69 - "shop/types.ts"
Cohesion: 0.05
Nodes (46): ShippingDraft, CheckoutFormProps, ProductGallery(), ProductBadge(), CartContext, CartContextValue, cartKey(), CartProvider() (+38 more)

### Community 70 - "lead-panel.tsx"
Cohesion: 0.08
Nodes (41): metadata, ArrowRightIcon(), BotIcon(), CalendarIcon(), ChartIcon(), ChevronLeftIcon(), ClockIcon(), CrosshairIcon() (+33 more)

### Community 71 - "invite/route.ts"
Cohesion: 0.31
Nodes (11): RFC-2047, POST(), Role, accessToken(), card(), escapeHtml(), mailConfig(), ROLE_LABELS (+3 more)

### Community 72 - "clip/store.ts"
Cohesion: 0.23
Nodes (14): POSTS_PAGE_SIZE, ClipDataProvider(), fetchApi(), getClientSnapshot(), getErrorSnapshot(), getServerSnapshot(), listeners, load() (+6 more)

### Community 73 - "shop/checkout.ts"
Cohesion: 0.22
Nodes (12): POST(), absoluteImage(), Admin, createCheckoutSession(), priceItems(), validateDiscountCode(), CHECKOUT_EXPIRES_MINUTES, CHECKOUT_MIN_TOTAL_CENTS (+4 more)

### Community 74 - "services/autoresearch.py"
Cohesion: 0.13
Nodes (25): _credentials_env(), _parse(), parse_structured(), The Agent SDK spawns a Claude Code subprocess that authenticates from the…, Single-turn, tool-less Claude call returning schema-validated output. Sync on…, AnalysisFindings, ProposedVariant, ProspectScore (+17 more)

### Community 75 - "espace/page.tsx"
Cohesion: 0.12
Nodes (8): GenerateurPage(), MOMENTS, STEPS, CaptionEditor(), PublierTab, PublierTabs(), TABS, ClipUploadInput

### Community 76 - "Bridge"
Cohesion: 0.14
Nodes (13): BaseSettings, Settings, Bridge, ensure_token(), main(), Client, Boucle Omilink. Un boîtier neuf génère son jeton, n'en confie que l'empreinte…, Hôtes du réseau local répondant sur le port des imprimantes. (+5 more)

### Community 77 - "collect/landing/demo-showcase.tsx"
Cohesion: 0.26
Nodes (9): metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), demoSection, collectDemoHref(), collectLandingHref(), emptySubscribe() (+1 more)

### Community 78 - "collect/checkout/route.ts"
Cohesion: 0.24
Nodes (10): POST(), ResolvedLine, resolveOptions(), CollectPage(), generateMetadata(), getPage, revalidate, isCollectActive() (+2 more)

### Community 79 - "admin/constants.ts"
Cohesion: 0.05
Nodes (49): MapCanvas, MapCanvas(), savedViewport(), statusColorExpression, toFeatureCollection(), Viewport, ALL_COLUMNS, PipelineBoard() (+41 more)

### Community 80 - "cart-bar.tsx"
Cohesion: 0.14
Nodes (15): PaymentChoice, SubmitState, TIP_PERCENTS, TipChoice, loadSdk(), PaymentState, SquareCard, SquarePayment() (+7 more)

### Community 81 - "use-order-chime.ts"
Cohesion: 0.26
Nodes (12): ChimeCard(), CHIME_STORAGE_KEY, armedListeners, CHIME_NOTES, chimeEnabled(), chimeListeners, context(), playChime() (+4 more)

### Community 82 - "collect/demo/provider.tsx"
Cohesion: 0.18
Nodes (15): CartLine, buildDemoMenu(), COLLECT_DEMO, DEMO_MENU_SPEC, DemoMenuSection, demoRestaurantInfo, DemoStep, CollectDemoContext (+7 more)

### Community 83 - "gestion/api.ts"
Cohesion: 0.12
Nodes (38): CategoryManager(), CartBar(), apply(), assertTransition(), createCategory(), createFormule(), createItem(), createStaff() (+30 more)

### Community 85 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+4 more)

### Community 86 - "shop/icons.tsx"
Cohesion: 0.05
Nodes (75): ConfirmationPage(), metadata, AccountPage(), metadata, SignOutButton(), ContactPage(), metadata, metadata (+67 more)

### Community 87 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx, @types/node, @types/qrcode (+4 more)

### Community 88 - "clip/demo-showcase.tsx"
Cohesion: 0.22
Nodes (6): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, BrowserFrame(), IphoneFrame(), demoSection

### Community 89 - "add-to-order.tsx"
Cohesion: 0.33
Nodes (8): AddToOrder(), isUnavailable(), OptionsModal(), CallServerButton(), CallState, cartLineKey(), useCart(), CALL_THROTTLE_MS

### Community 90 - "createClient"
Cohesion: 0.07
Nodes (52): SignOutButton(), approveOutreachEmail(), fetchOutreachStats(), promoteVariant(), rejectOutreachEmail(), updateImportantNotes(), updateOutreachDraft(), updateVariantStatus() (+44 more)

### Community 91 - "form.tsx"
Cohesion: 0.39
Nodes (5): CollectSignupForm(), slugify(), CollectEtablissementPage(), metadata, startCheckout()

### Community 92 - "prefs.ts"
Cohesion: 0.36
Nodes (7): PrefsCard(), PushEvent, ROLE_DEFAULT_PREFS, loadPrefs(), PrefValues, requireUser(), savePrefs()

### Community 93 - "setup-stripe.ts"
Cohesion: 0.25
Nodes (6): shopOffer, Plan, plans, shopPlans, stripe, zeroPriced

### Community 94 - "captions/route.ts"
Cohesion: 0.48
Nodes (5): POST(), CAPTION_CONTEXT_MAX_CHARS, captionsSchema(), generateCaptions(), @anthropic-ai/sdk

### Community 95 - "admin/format.ts"
Cohesion: 0.11
Nodes (41): ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, TachesPage(), PlusIcon() (+33 more)

### Community 96 - "managers.tsx"
Cohesion: 0.07
Nodes (68): ShopCustomersPage(), ShopOrderPage(), ShopMessagesPage(), ShopDashboardPage(), metadata, PackingSlipPage(), ImageUploader(), UploadedImage (+60 more)

### Community 97 - "onboarding/page.tsx"
Cohesion: 0.33
Nodes (5): OnboardingForm(), slugify(), metadata, OnboardingPage(), StaffPending()

### Community 99 - "settings.tsx"
Cohesion: 0.07
Nodes (32): allura, cormorant, dmSans, dmSerif, FONT_VARIABLES, generateMetadata(), inter, montserrat (+24 more)

### Community 102 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): Important notes, /new-restaurant, Phase 1 — Intake, Phase 2 — Research, Phase 3 — Verify with user, Phase 4 — Build the demo profile, Phase 5 — Summary, Updating an existing profile (+1 more)

### Community 103 - "push/server.ts"
Cohesion: 0.13
Nodes (19): CallBody, POST(), POST(), POST(), DispatchBody, PUSH_EVENT_HINTS, PUSH_EVENT_LABELS, PUSH_EVENTS (+11 more)

### Community 105 - "filter-bar.tsx"
Cohesion: 0.16
Nodes (19): FilterBar(), toggleInSet(), FilterIcon(), SearchIcon(), NO_CONTACT_OPTIONS, STATUS_ORDER, appointmentIds(), countActiveFilters() (+11 more)

### Community 106 - "espace/shell.tsx"
Cohesion: 0.07
Nodes (28): AnalyticsView, compact, VIEW_SUBTITLES, VIEWS, ClipEspaceLayout(), metadata, NavItem, Dropzone() (+20 more)

### Community 109 - "encaisser-card.tsx"
Cohesion: 0.15
Nodes (17): EncaisserCard(), EncaisserPanel(), sumLines(), sumUnits(), toSelection(), Unit, unitsOf(), CheckMark() (+9 more)

### Community 110 - "tickets.py"
Cohesion: 0.36
Nodes (11): _group_by_category(), _line(), _local(), datetime, Tickets rendus en ESC/POS. Omilink envoie ces octets tels quels à l'imprimante…, Group items by category name, sorted by category position., _render_items(), render_job() (+3 more)

### Community 113 - "desinscription/route.ts"
Cohesion: 0.31
Nodes (10): RFC-8058, confirmFormHtml(), DONE_HTML, GET(), LEAD_DEMOTABLE_FROM, PAGE_SHELL(), params(), POST() (+2 more)

### Community 116 - "clip/constants.ts"
Cohesion: 0.21
Nodes (10): PublicationsPage(), PlatformBadge(), PostCard(), STATUS_CLASSES, PLATFORM_LABELS, POLL_INTERVAL_MS, POLL_TIMEOUT_MS, STATUS_LABELS (+2 more)

### Community 121 - "components/gestion/shell.tsx"
Cohesion: 0.11
Nodes (22): metadata, ApercuIcon(), BellIcon(), ChevronDownIcon(), ClockIcon(), CommandesIcon(), GearIcon(), LogoutIcon() (+14 more)

### Community 123 - "restaurants/page.tsx"
Cohesion: 0.08
Nodes (31): RFC-4180, Analysis, ImportPage(), parseCoordinate(), ParsedRow, Phase, RowStatus, STATUS_META (+23 more)

### Community 125 - "orders.ts"
Cohesion: 0.14
Nodes (37): POST(), POST(), POST(), POST(), POST(), base64url(), buildRawMessage(), encodeSubject() (+29 more)

### Community 145 - "shop/server.ts"
Cohesion: 0.09
Nodes (45): GET(), ShopSettingsPage(), ShopDiscountsPage(), FILTERS, ShopOrdersPage(), ShopContentPage(), metadata, ShopGestionLayout() (+37 more)

### Community 146 - "services/inbox.py"
Cohesion: 0.14
Nodes (23): BaseSettings, Settings, InboxVerdict, BaseModel, daily_cold_count(), log_email_activity(), Cold emails already sent today, Paris time (the cap's clock)., Send every approved outbound email of the given kinds, oldest first. cold_cap… (+15 more)

### Community 147 - "gmail.py"
Cohesion: 0.13
Nodes (22): archive_to_label(), ensure_label(), extract_body_text(), extract_headers(), get_message(), list_inbox(), Move a message out of the inbox into the given label., Walk MIME parts for text/plain; fall back to stripped text/html. (+14 more)

### Community 148 - "shop-landing-data.ts"
Cohesion: 0.12
Nodes (26): metadata, ShopNav(), ShopFaq(), ShopFeatures(), ShopFinalCta(), ShopFooter(), ShopHero(), ShopHowItWorks() (+18 more)

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
Nodes (41): BADGE, DeviceCard(), DOT_CLASS, Editing, Health, LinkState, PrinterCard(), printerHealth() (+33 more)

### Community 161 - "get_supabase"
Cohesion: 0.11
Nodes (26): get_supabase(), Client, Device, Authentifie un appareil Omilink par l'empreinte SHA-256 de son jeton., require_device(), _apply_routing(), _build_routing(), enroll() (+18 more)

### Community 163 - "gestion/types.ts"
Cohesion: 0.07
Nodes (40): cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), lineKey(), lineUnitPrice(), OptionsDialog(), SelectedChoice (+32 more)

### Community 167 - "ui.tsx"
Cohesion: 0.05
Nodes (73): AboutPage(), metadata, revalidate, CatalogPage(), generateMetadata(), revalidate, FaqPage(), metadata (+65 more)

### Community 171 - "useLanguage"
Cohesion: 0.20
Nodes (12): metadata, ContactForm(), Status, PortalFooter(), LanguageToggle(), PortalNav(), SurMesure(), brand (+4 more)

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
Cohesion: 0.18
Nodes (15): PHONE_LOGIN_DOMAIN, loginEmailFor(), looksLikePhone(), normalizePhone(), phoneToLoginEmail(), TablesInsert, CATEGORIES, db (+7 more)

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

### Community 188 - "payment-settings.tsx"
Cohesion: 0.23
Nodes (11): NO_SQUARE, NO_STRIPE, PaymentSettings(), Provider, readStatus(), SquareLocation, SquareStatus, StripeStatus (+3 more)

### Community 189 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 195 - "portal-data.ts"
Cohesion: 0.18
Nodes (11): PRIVATE_PATHS, sitemap(), buildLabel, footer, openLabel, portalHost, adminSiteUrl, clipSiteUrl (+3 more)

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
- **677 isolated node(s):** `backend`, `$schema`, `slug`, `name`, `tagline` (+672 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 928 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `menu/gestion/commandes/page.tsx`, `landing-data.ts`, `gestion/store.ts`, `collect-landing-data.ts`, `gestion/selectors.ts`, `lead-cache.ts`, `admin/store.ts`, `clip/context.tsx`, `menu/gestion/produits/page.tsx`, `stage.tsx`, `useAdminBasePath`, `clip/demo/data.ts`, `shop/server.ts`, `metrics.ts`, `notifications/page.tsx`, `gestion/constants.ts`, `espace/comptes/creation/page.tsx`, `getCurrentUser`, `app/page.tsx`, `terminaux/page.tsx`, `brand/wordmark.tsx`, `gestion/types.ts`, `shared.ts`, `m/[slug]/page.tsx`, `ui.tsx`, `admin/api.ts`, `useLanguage`, `app/layout.tsx`, `menu/cart.tsx`, `language.tsx`, `package.json`, `payment-settings.tsx`, `item-form-modal.tsx`, `useToast`, `shop/types.ts`, `lead-panel.tsx`, `clip/store.ts`, `espace/page.tsx`, `collect/landing/demo-showcase.tsx`, `collect/checkout/route.ts`, `admin/constants.ts`, `cart-bar.tsx`, `use-order-chime.ts`, `collect/demo/provider.tsx`, `shop/icons.tsx`, `clip/demo-showcase.tsx`, `add-to-order.tsx`, `form.tsx`, `admin/format.ts`, `managers.tsx`, `onboarding/page.tsx`, `settings.tsx`, `filter-bar.tsx`, `espace/shell.tsx`, `encaisser-card.tsx`, `clip/constants.ts`, `restaurants/page.tsx`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `createAdminClient` to `clip/server.ts`, `shared.ts`, `invite/route.ts`, `push/server.ts`, `shop/checkout.ts`, `square/server.ts`, `sumup/server.ts`, `collect/checkout/route.ts`, `desinscription/route.ts`, `shop/server.ts`, `validation.ts`, `api/contact/route.ts`, `shop/icons.tsx`, `admin.ts`, `getCurrentUser`, `getStripe`, `orders.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `next` connect `ui.tsx` to `landing-data.ts`, `collect-landing-data.ts`, `clip/demo/data.ts`, `clip-landing-data.ts`, `shop/server.ts`, `shop-landing-data.ts`, `getCurrentUser`, `app/page.tsx`, `getRestaurant`, `brand/wordmark.tsx`, `shared.ts`, `m/[slug]/page.tsx`, `useLanguage`, `app/layout.tsx`, `next.config.ts`, `package.json`, `useToast`, `portal-data.ts`, `lead-panel.tsx`, `collect/landing/demo-showcase.tsx`, `collect/checkout/route.ts`, `shop/icons.tsx`, `form.tsx`, `managers.tsx`, `onboarding/page.tsx`, `shop/connexion/page.tsx`, `settings.tsx`, `espace/shell.tsx`, `components/gestion/shell.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `backend`, `$schema`, `slug` to the rest of the system?**
  _677 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06818181818181818 - nodes in this community are weakly interconnected._
- **Should `gestion/store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10975609756097561 - nodes in this community are weakly interconnected._
- **Should `collect-landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0851063829787234 - nodes in this community are weakly interconnected._
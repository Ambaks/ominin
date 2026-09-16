# Graph Report - ominin  (2026-09-16)

## Corpus Check
- 627 files · ~1,680,366 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3424 nodes · 10213 edges · 146 communities (125 shown, 13 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 196 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8f56b1cc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useGestionAccess
- clip/server.ts
- landing-data.ts
- gestion/constants.ts
- collect-landing-data.ts
- scripts
- gestion/selectors.ts
- shop/types.ts
- admin/store.ts
- sumup/server.ts
- square/server.ts
- clip/context.tsx
- menu/gestion/produits/page.tsx
- shop/server.ts
- What You Must Do When Invoked
- tarifs-planifies.tsx
- clip/demo/data.ts
- clip-landing-data.ts
- metrics.ts
- compilerOptions
- upload-post.ts
- api/contact/route.ts
- menu-data.ts
- Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)
- useToast
- admin/api.ts
- espace/comptes/creation/page.tsx
- shop/icons.tsx
- createAdminClient
- boho/profile.json
- proxy.ts
- app/page.tsx
- lead-cache.ts
- brand/wordmark.tsx
- seed-crm.ts
- Setup guide (written for an LLM agent)
- Ominin
- must
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
- clients.ts
- frontend/README.md
- .claude/CLAUDE.md
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- package.json
- .claude/skills/graphify/references/extraction-spec.md
- frontend/AGENTS.md
- clip/wordmark.tsx
- postcss.config.mjs
- backend
- shopHref
- _template/profile.json
- paiements/page.tsx
- temps.ts
- components/gestion/shell.tsx
- notifications/page.tsx
- lead-panel.tsx
- gestion/types.ts
- formatPrice
- database.types.ts
- services/autoresearch.py
- sumup-payment.tsx
- Bridge
- create-order-fab.tsx
- payment-settings.tsx
- admin/constants.ts
- next.config.ts
- restaurants/page.tsx
- stage.tsx
- gestion/api.ts
- menu/gestion/layout.tsx
- dependencies
- etape-editor.tsx
- devDependencies
- collect/landing/demo-showcase.tsx
- createClient
- push/server.ts
- next
- admin/format.ts
- settings.tsx
- clip/constants.ts
- admin-lock-button.tsx
- m/[slug]/page.tsx
- What you must do when invoked
- espace/shell.tsx
- shared.ts
- add-to-order.tsx
- tickets.py
- square-payment.tsx
- desinscription/route.ts
- captions/route.ts
- use-order-chime.ts
- filter-bar.tsx
- orders.ts
- managers.tsx
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
- ui.tsx
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
5. `check()` - 86 edges
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
- `AnalytiquePage()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/analytique/page.tsx → frontend/lib/clip/context.tsx
- `PostAnalyticsList()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/analytique/page.tsx → frontend/lib/clip/context.tsx
- `ClipEspaceLayout()` --calls--> `createClient()`  [EXTRACTED]
  frontend/app/clip/espace/layout.tsx → frontend/lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (146 total, 13 thin omitted)

### Community 0 - "useGestionAccess"
Cohesion: 0.19
Nodes (22): BadgeagePage(), CommandesPage(), dedupeById(), EMPTY_BODIES, matchesFilter(), EtablissementPage(), TablesPage(), TerminauxPage() (+14 more)

### Community 1 - "clip/server.ts"
Cohesion: 0.28
Nodes (13): GET(), GET(), POST(), GET(), POST(), GET(), POST(), SIGNED_URL_TTL_SECONDS (+5 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.05
Nodes (49): metadata, metadata, DemoShowcase(), Faq(), Features(), FinalCta(), Hero(), HowItWorks() (+41 more)

### Community 3 - "gestion/constants.ts"
Cohesion: 0.09
Nodes (35): NavItem, ACTION_FEATURE, ACTION_LABELS, COLLECT_FEATURES, DEFAULT_VAT_RATE, EXCLUDED_STATUSES, FEATURES, FeatureSpec (+27 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.08
Nodes (31): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter() (+23 more)

### Community 5 - "scripts"
Cohesion: 0.11
Nodes (19): scripts, build, db:diff, db:link, db:login, db:push, db:types, dev (+11 more)

### Community 6 - "gestion/selectors.ts"
Cohesion: 0.11
Nodes (28): ApercuPage(), Period, RevenueChart(), TopVentesChart(), CuisinierApercu(), ServiceClock(), ServeurApercu(), ServiceClock() (+20 more)

### Community 7 - "shop/types.ts"
Cohesion: 0.07
Nodes (41): ShippingDraft, CheckoutFormProps, absoluteImage(), Admin, createCheckoutSession(), PricedItem, priceItems(), validateDiscountCode() (+33 more)

### Community 8 - "admin/store.ts"
Cohesion: 0.21
Nodes (19): adminLoginPath(), commit(), fetchAll(), fetchLeads(), fetchOpenTasks(), fetchPendingDraftCount(), fetchUpcomingAppointments(), getClientSnapshot() (+11 more)

### Community 9 - "sumup/server.ts"
Cohesion: 0.16
Nodes (22): GET(), stateCookie(), GET(), POST(), POST(), POST(), POST(), confirmOrderPaid() (+14 more)

### Community 10 - "square/server.ts"
Cohesion: 0.10
Nodes (43): GET(), stateCookie(), GET(), PATCH(), POST(), Line, orderBody(), POST() (+35 more)

### Community 11 - "clip/context.tsx"
Cohesion: 0.10
Nodes (40): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), replacePost() (+32 more)

### Community 12 - "menu/gestion/produits/page.tsx"
Cohesion: 0.16
Nodes (19): ProduitsPage(), ExternalLinkIcon(), SubscriptionGate(), cardClass, DiscoverLink(), eyebrowClass, Pill(), ProductCard() (+11 more)

### Community 13 - "shop/server.ts"
Cohesion: 0.13
Nodes (28): GET(), metadata, ShopGestionLayout(), OptionGroupPage(), EditProductPage(), NewProductPage(), CreateShopPage(), metadata (+20 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "tarifs-planifies.tsx"
Cohesion: 0.15
Nodes (17): formatAdjustment(), formatDays(), formatWindow(), parseTargetKey(), RuleForm(), targetKey(), TarifsInline(), ROLES (+9 more)

### Community 16 - "clip/demo/data.ts"
Cohesion: 0.12
Nodes (23): metadata, DemoBanner(), emptySubscribe(), ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics(), buildDemoPosts() (+15 more)

### Community 17 - "clip-landing-data.ts"
Cohesion: 0.12
Nodes (23): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipHero(), ClipHowItWorks(), ClipPricing(), PriceCard() (+15 more)

### Community 18 - "metrics.ts"
Cohesion: 0.08
Nodes (49): ActivitePage(), load(), ClientsPage(), PERIOD_TABS, ClientDetail(), isView(), PERIOD_TABS, PublicationsPage() (+41 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "upload-post.ts"
Cohesion: 0.12
Nodes (17): PROVIDER_API_URL, PROVIDER_TIMEOUT_MS, providerApiKey(), STORAGE_RETENTION_DAYS, PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider (+9 more)

### Community 21 - "api/contact/route.ts"
Cohesion: 0.16
Nodes (18): invalid(), isContactSource(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, LeadFormCopy (+10 more)

### Community 22 - "menu-data.ts"
Cohesion: 0.08
Nodes (29): generateMetadata(), DishCard(), FeaturedCard(), MenuSection(), ItemInput, ORDER_TABS, SEED_TABLE_COUNT, DraftOrder (+21 more)

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "useToast"
Cohesion: 0.19
Nodes (15): ComptesPage(), EtablissementForm(), View, NoteComposer, FormuleCard(), EditIcon(), TrashIcon(), MenuItemCard() (+7 more)

### Community 25 - "admin/api.ts"
Cohesion: 0.08
Nodes (53): CreateRestaurantModal(), ActivityInput, AppointmentInput, availableSlug(), createRestaurant(), DuplicateCandidate, ExportRow, fetchAllSlugs() (+45 more)

### Community 26 - "espace/comptes/creation/page.tsx"
Cohesion: 0.06
Nodes (18): CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, GenerateurPage(), MOMENTS, STEPS (+10 more)

### Community 27 - "shop/icons.tsx"
Cohesion: 0.06
Nodes (44): SignOutButton(), ImageUploader(), UploadedImage, OptionGroupForm(), ValueDraft, OrderActions(), dangerButton, secondaryButton (+36 more)

### Community 28 - "createAdminClient"
Cohesion: 0.09
Nodes (45): GET(), EXTENSIONS, POST(), POST(), DELETE(), GET(), POST(), requireUser() (+37 more)

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
Cohesion: 0.13
Nodes (34): addActivity(), apply(), byDue(), completeTask(), createAppointment(), createTask(), fetchAppointments(), findLite() (+26 more)

### Community 34 - "brand/wordmark.tsx"
Cohesion: 0.09
Nodes (14): metadata, metadata, CollectSignupForm(), slugify(), CollectEtablissementPage(), metadata, metadata, InscriptionTabs() (+6 more)

### Community 35 - "seed-crm.ts"
Cohesion: 0.19
Nodes (12): TablesInsert, Category, daysAgo(), daysAhead(), db, LeadStatus, main(), Priority (+4 more)

### Community 36 - "Setup guide (written for an LLM agent)"
Cohesion: 0.15
Nodes (12): 1. Prerequisites, 2. Frontend, 3. Backend, 4. Supabase (database & auth), 5. Graphify (knowledge-graph CLI), 6. Project skills (nothing to install), 7. Outreach agent « Léa » (one-time setup, human-only), 8. Final checklist (+4 more)

### Community 37 - "Ominin"
Cohesion: 0.18
Nodes (10): Business constraints, Code quality, Commands, Conventions, graphify, Ominin, Repo structure, Stack (+2 more)

### Community 38 - "must"
Cohesion: 0.17
Nodes (20): TeamManager(), LoadError(), replaceOrder(), reprintTickets(), updateOrderPayment(), voidPayment(), rowToOrder(), rowToTable() (+12 more)

### Community 39 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): /commit, Execution requirement, Step 1 — Understand what changed, Step 2 — Project upkeep (required before every push), Step 3 — Safety checks, Step 4 — Write the commit message, Step 5 — Commit and push, Step 6 — Report back (+1 more)

### Community 40 - "react"
Cohesion: 0.10
Nodes (20): InvitationForm(), InvitationPage(), OnboardingForm(), RESERVED_SLUGS, slugify(), metadata, OnboardingPage(), StaffPending() (+12 more)

### Community 41 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 42 - "cart-bar.tsx"
Cohesion: 0.27
Nodes (9): CartBar(), PaymentChoice, SubmitState, TIP_PERCENTS, TipChoice, PaymentReturn(), State, fallBackToCounter() (+1 more)

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

### Community 50 - "clients.ts"
Cohesion: 0.23
Nodes (16): CapacitesPage(), openViews(), Capabilities(), OrderTabsCard(), Client, clientFeatures(), fetchClients(), isFeature() (+8 more)

### Community 51 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 52 - ".claude/CLAUDE.md"
Cohesion: 0.50
Nodes (3): commit, graphify, new-restaurant

### Community 55 - "package.json"
Cohesion: 0.12
Nodes (16): name, private, version, eslint, eslint-config-next, react-dom, supabase, tailwindcss (+8 more)

### Community 58 - "clip/wordmark.tsx"
Cohesion: 0.20
Nodes (7): metadata, metadata, ClipFooter(), ClipNav(), ClipWordmark(), footer, nav

### Community 63 - "shopHref"
Cohesion: 0.07
Nodes (57): ConfirmationPage(), loadOrder(), metadata, AccountOrderPage(), metadata, metadata, TrackingPage(), ArrowRightIcon() (+49 more)

### Community 64 - "_template/profile.json"
Cohesion: 0.06
Nodes (30): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+22 more)

### Community 65 - "paiements/page.tsx"
Cohesion: 0.21
Nodes (13): DayGroup, dedupeById(), displayMode(), groupByDay(), matchesMode(), MODE_FILTERS, ModeFilter, PaiementsPage() (+5 more)

### Community 67 - "temps.ts"
Cohesion: 0.08
Nodes (62): EquipePage(), PANE_TAGLINES, PaneId, PANES, ROLES, metadata, PlanningPage(), PlanningPayload (+54 more)

### Community 68 - "components/gestion/shell.tsx"
Cohesion: 0.15
Nodes (15): ApercuIcon(), BellIcon(), ClockIcon(), CommandesIcon(), GearIcon(), LockIcon(), LogoutIcon(), MenuIcon() (+7 more)

### Community 69 - "notifications/page.tsx"
Cohesion: 0.18
Nodes (21): DevicesCard(), DeviceStatusCard(), IOS_STEPS, NotificationsPage(), PushPrompt(), PUSH_PROMPT_DISMISSED_KEY, currentEndpoint(), deviceLabel() (+13 more)

### Community 70 - "lead-panel.tsx"
Cohesion: 0.08
Nodes (39): metadata, ArrowRightIcon(), BotIcon(), CalendarIcon(), ChartIcon(), ChevronLeftIcon(), ClockIcon(), CrosshairIcon() (+31 more)

### Community 71 - "gestion/types.ts"
Cohesion: 0.09
Nodes (37): EncaisserCard(), EncaisserPanel(), sumLines(), sumUnits(), toSelection(), Unit, unitsOf(), CheckMark() (+29 more)

### Community 72 - "formatPrice"
Cohesion: 0.28
Nodes (12): CartLine, cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), lineKey(), lineUnitPrice(), OptionsDialog() (+4 more)

### Community 73 - "database.types.ts"
Cohesion: 0.13
Nodes (22): RFC-2047, POST(), Role, isTerminal(), POST(), Product, PRODUCTS_BY_CHOICE, accessToken() (+14 more)

### Community 74 - "services/autoresearch.py"
Cohesion: 0.13
Nodes (25): _credentials_env(), _parse(), parse_structured(), The Agent SDK spawns a Claude Code subprocess that authenticates from the…, Single-turn, tool-less Claude call returning schema-validated output. Sync on…, AnalysisFindings, ProposedVariant, ProspectScore (+17 more)

### Community 75 - "sumup-payment.tsx"
Cohesion: 0.40
Nodes (5): loadSdk(), PaymentState, SumUpCardSdk, SumUpPayment(), Window

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
Cohesion: 0.04
Nodes (68): MapCanvas, FindingsCard(), hostOf(), percent(), PROSPECT_TILES, ProspectsPanel(), scoreColor(), TabId (+60 more)

### Community 80 - "next.config.ts"
Cohesion: 0.40
Nodes (4): csp, nextConfig, securityHeaders, supabaseOrigins

### Community 81 - "restaurants/page.tsx"
Cohesion: 0.08
Nodes (38): RFC-4180, EmailsRedirect(), Analysis, ImportPage(), parseCoordinate(), ParsedRow, Phase, RowStatus (+30 more)

### Community 82 - "stage.tsx"
Cohesion: 0.06
Nodes (34): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView() (+26 more)

### Community 83 - "gestion/api.ts"
Cohesion: 0.08
Nodes (57): CategoryManager(), digits(), StaffModal(), apply(), assertTransition(), assignTable(), createCategory(), createFormule() (+49 more)

### Community 85 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+4 more)

### Community 86 - "etape-editor.tsx"
Cohesion: 0.16
Nodes (27): ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft(), FormuleFormModal() (+19 more)

### Community 87 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, eslint-config-next, supabase, tailwindcss, @tailwindcss/postcss, tsx, @types/node (+5 more)

### Community 89 - "collect/landing/demo-showcase.tsx"
Cohesion: 0.22
Nodes (10): metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), CollectWordmark(), demoSection, collectDemoHref(), collectLandingHref() (+2 more)

### Community 90 - "createClient"
Cohesion: 0.07
Nodes (60): LeaPage(), SignOutButton(), MenuPage(), approveOutreachEmail(), fetchLatestResearchRun(), fetchOutreachEmails(), fetchOutreachProspects(), fetchOutreachRuns() (+52 more)

### Community 92 - "push/server.ts"
Cohesion: 0.09
Nodes (29): CallBody, POST(), POST(), POST(), PrefsCard(), CallServerButton(), CallState, CALL_THROTTLE_MS (+21 more)

### Community 94 - "next"
Cohesion: 0.09
Nodes (27): CheckoutPage(), metadata, AccountOrdersPage(), metadata, AccountConversationPage(), metadata, AccountMessagesPage(), metadata (+19 more)

### Community 95 - "admin/format.ts"
Cohesion: 0.11
Nodes (40): ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, TachesPage(), FollowUpChoice (+32 more)

### Community 96 - "settings.tsx"
Cohesion: 0.06
Nodes (38): ShopSettingsPage(), allura, cormorant, dmSans, dmSerif, FONT_VARIABLES, generateMetadata(), inter (+30 more)

### Community 98 - "clip/constants.ts"
Cohesion: 0.14
Nodes (16): POST(), Dropzone(), formatSize(), CheckIcon(), UploadIcon(), PlatformBadge(), PostCard(), STATUS_CLASSES (+8 more)

### Community 99 - "admin-lock-button.tsx"
Cohesion: 0.27
Nodes (13): AdminLockButton(), listeners, lockAdmin(), read(), subscribe(), unlockAdmin(), useAdminUnlocked(), write() (+5 more)

### Community 101 - "m/[slug]/page.tsx"
Cohesion: 0.16
Nodes (11): ClientDemoPage(), generateMetadata(), getRestaurant, MenuPage(), revalidate, Hero(), PARTICLES, LANGUAGES (+3 more)

### Community 102 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): Important notes, /new-restaurant, Phase 1 — Intake, Phase 2 — Research, Phase 3 — Verify with user, Phase 4 — Build the demo profile, Phase 5 — Summary, Updating an existing profile (+1 more)

### Community 103 - "espace/shell.tsx"
Cohesion: 0.07
Nodes (26): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, ClipEspaceLayout(), metadata (+18 more)

### Community 104 - "shared.ts"
Cohesion: 0.13
Nodes (18): GET(), OrderCardDemo(), RestaurantPane(), isTerminal(), OrderConfirmation(), STATUS_COPY, STATUS_CLASSES, StatusBadge() (+10 more)

### Community 105 - "add-to-order.tsx"
Cohesion: 0.31
Nodes (9): AddToOrder(), choiceRowClass(), isUnavailable(), OptionsModal(), CategoryLink, CategoryNav(), CartChoice, cartLineKey() (+1 more)

### Community 110 - "tickets.py"
Cohesion: 0.36
Nodes (11): _group_by_category(), _line(), _local(), datetime, Tickets rendus en ESC/POS. Omilink envoie ces octets tels quels à l'imprimante…, Group items by category name, sorted by category position., _render_items(), render_job() (+3 more)

### Community 112 - "square-payment.tsx"
Cohesion: 0.33
Nodes (6): loadSdk(), PaymentState, SquareCard, SquarePayment(), SquarePayments, Window

### Community 113 - "desinscription/route.ts"
Cohesion: 0.31
Nodes (10): RFC-8058, confirmFormHtml(), DONE_HTML, GET(), LEAD_DEMOTABLE_FROM, PAGE_SHELL(), params(), POST() (+2 more)

### Community 116 - "captions/route.ts"
Cohesion: 0.39
Nodes (6): POST(), CAPTION_CONTEXT_MAX_CHARS, captionsSchema(), generateCaptions(), CLIP_PLATFORMS, @anthropic-ai/sdk

### Community 121 - "use-order-chime.ts"
Cohesion: 0.17
Nodes (19): ChimeCard(), GestionShell(), isActive(), signOut(), CHIME_STORAGE_KEY, awaitsOnlinePayment(), getErrorSnapshot(), useGestionLoadError() (+11 more)

### Community 123 - "filter-bar.tsx"
Cohesion: 0.11
Nodes (32): CartePage(), FilterBar(), toggleInSet(), FilterIcon(), SearchIcon(), GEOLOCATION_TIMEOUT_MS, NO_CONTACT_OPTIONS, appointmentIds() (+24 more)

### Community 125 - "orders.ts"
Cohesion: 0.16
Nodes (30): Body, POST(), STATUS_MESSAGES, ORDER_STATUS_FLOW, addressBlock(), contactAcknowledgementMail(), escapeHtml(), itemsTable() (+22 more)

### Community 145 - "managers.tsx"
Cohesion: 0.07
Nodes (61): ShopCustomersPage(), ShopDiscountsPage(), ShopOrderPage(), FILTERS, ShopOrdersPage(), ShopContentPage(), ShopShippingPage(), ShopConversationPage() (+53 more)

### Community 146 - "get_supabase"
Cohesion: 0.15
Nodes (11): get_supabase(), Client, BaseSettings, Settings, daily_cold_count(), Cold emails already sent today, Paris time (the cap's clock)., execute(), Overlap guard: one run per job at a time. Returns the new run id, or None if a… (+3 more)

### Community 147 - "services/inbox.py"
Cohesion: 0.09
Nodes (41): archive_to_label(), ensure_label(), extract_body_text(), decode(), walk(), extract_headers(), get_message(), list_inbox() (+33 more)

### Community 148 - "landing/sections.tsx"
Cohesion: 0.10
Nodes (31): metadata, ShopNav(), ShopAudiences(), ShopContact(), ShopFaq(), ShopFeatures(), ShopFooter(), ShopHero() (+23 more)

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
Cohesion: 0.11
Nodes (33): BADGE, DeviceCard(), DOT_CLASS, Editing, Health, LinkState, PrinterCard(), printerHealth() (+25 more)

### Community 161 - "omilink.py"
Cohesion: 0.15
Nodes (20): Device, Authentifie un appareil Omilink par l'empreinte SHA-256 de son jeton., require_device(), require_trigger_secret(), _apply_routing(), _build_routing(), enroll(), EnrollRequest (+12 more)

### Community 167 - "ui.tsx"
Cohesion: 0.05
Nodes (77): AboutPage(), metadata, revalidate, CatalogPage(), generateMetadata(), revalidate, FaqPage(), metadata (+69 more)

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
Cohesion: 0.13
Nodes (27): POST(), POST(), POST(), POST(), POST(), base64url(), buildRawMessage(), encodeSubject() (+19 more)

### Community 182 - "seed-shop.ts"
Cohesion: 0.10
Nodes (24): metadata, ShopLoginForm(), PHONE_LOGIN_DOMAIN, loginEmailFor(), looksLikePhone(), normalizePhone(), phoneToLoginEmail(), CATEGORIES (+16 more)

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
- **699 isolated node(s):** `backend`, `$schema`, `slug`, `name`, `tagline` (+694 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 957 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `useGestionAccess`, `landing-data.ts`, `gestion/constants.ts`, `collect-landing-data.ts`, `gestion/selectors.ts`, `admin/store.ts`, `clip/context.tsx`, `menu/gestion/produits/page.tsx`, `shop/server.ts`, `tarifs-planifies.tsx`, `clip/demo/data.ts`, `managers.tsx`, `metrics.ts`, `api/contact/route.ts`, `useToast`, `shop/icons.tsx`, `app/page.tsx`, `terminaux/page.tsx`, `lead-cache.ts`, `brand/wordmark.tsx`, `ui.tsx`, `cart-bar.tsx`, `clients.ts`, `app/layout.tsx`, `menu/cart.tsx`, `language.tsx`, `package.json`, `shopHref`, `paiements/page.tsx`, `temps.ts`, `notifications/page.tsx`, `lead-panel.tsx`, `gestion/types.ts`, `formatPrice`, `sumup-payment.tsx`, `create-order-fab.tsx`, `payment-settings.tsx`, `admin/constants.ts`, `restaurants/page.tsx`, `stage.tsx`, `etape-editor.tsx`, `collect/landing/demo-showcase.tsx`, `push/server.ts`, `next`, `admin/format.ts`, `settings.tsx`, `clip/constants.ts`, `admin-lock-button.tsx`, `m/[slug]/page.tsx`, `espace/shell.tsx`, `shared.ts`, `add-to-order.tsx`, `square-payment.tsx`, `use-order-chime.ts`, `filter-bar.tsx`?**
  _High betweenness centrality (0.253) - this node is a cross-community bridge._
- **Why does `createClient()` connect `createClient` to `gestion/constants.ts`, `admin/store.ts`, `clip/context.tsx`, `menu/gestion/produits/page.tsx`, `tarifs-planifies.tsx`, `metrics.ts`, `useToast`, `admin/api.ts`, `shop/icons.tsx`, `lead-cache.ts`, `terminaux/page.tsx`, `brand/wordmark.tsx`, `must`, `react`, `cart-bar.tsx`, `clients.ts`, `seed-shop.ts`, `shopHref`, `temps.ts`, `components/gestion/shell.tsx`, `lead-panel.tsx`, `create-order-fab.tsx`, `payment-settings.tsx`, `gestion/api.ts`, `push/server.ts`, `admin/format.ts`, `espace/shell.tsx`, `use-order-chime.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `next` connect `next` to `landing-data.ts`, `collect-landing-data.ts`, `shop/server.ts`, `clip/demo/data.ts`, `clip-landing-data.ts`, `managers.tsx`, `landing/sections.tsx`, `app/page.tsx`, `brand/wordmark.tsx`, `ui.tsx`, `react`, `portal-data.ts`, `app/layout.tsx`, `seed-shop.ts`, `package.json`, `clip/wordmark.tsx`, `shopHref`, `temps.ts`, `site.ts`, `lead-panel.tsx`, `create-order-fab.tsx`, `next.config.ts`, `menu/gestion/layout.tsx`, `collect/landing/demo-showcase.tsx`, `settings.tsx`, `m/[slug]/page.tsx`, `espace/shell.tsx`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `backend`, `$schema`, `slug` to the rest of the system?**
  _699 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05093167701863354 - nodes in this community are weakly interconnected._
- **Should `gestion/constants.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09388335704125178 - nodes in this community are weakly interconnected._
- **Should `collect-landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07801418439716312 - nodes in this community are weakly interconnected._
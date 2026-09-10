# Graph Report - ominin  (2026-09-10)

## Corpus Check
- 610 files · ~1,685,466 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3357 nodes · 9984 edges · 149 communities (129 shown, 12 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 194 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b4c5c2e0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useGestionAccess
- clip/server.ts
- landing-data.ts
- clients.ts
- collect-landing-data.ts
- scripts
- gestion/selectors.ts
- supabase/client.ts
- admin/store.ts
- sumup/server.ts
- square/server.ts
- clip/context.tsx
- menu/gestion/produits/page.tsx
- collect/landing/demo-showcase.tsx
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
- m/[slug]/page.tsx
- What you must do when invoked
- admin/api.ts
- graphify reference: extra exports and benchmark
- getRestaurant
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
- commande/page.tsx
- postcss.config.mjs
- backend
- shop/types.ts
- _template/profile.json
- item-form-modal.tsx
- temps.ts
- tarifs-planifies.tsx
- add-to-order.tsx
- lead-panel.tsx
- gestion/menu/page.tsx
- espace/shell.tsx
- markOrderPaidFromSession
- services/autoresearch.py
- carte/page.tsx
- Bridge
- shared.ts
- collect/[slug]/page.tsx
- admin/constants.ts
- cart-bar.tsx
- setup-stripe.ts
- stage.tsx
- gestion/api.ts
- portal-data.ts
- dependencies
- inscription-tabs.tsx
- devDependencies
- public-menu.ts
- dish-card.tsx
- createClient
- must
- invite/route.ts
- captions/route.ts
- react
- admin/format.ts
- shop/constants.ts
- demo/layout.tsx
- form.tsx
- gestion/photo.ts
- portal/hero.tsx
- What you must do when invoked
- filter-bar.tsx
- gestion/types.ts
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
- golden-image.sh
- next
- useLanguage
- What You Must Do When Invoked
- app/layout.tsx
- shop/checkout.ts
- seed-shop.ts
- menu/cart.tsx
- language.tsx
- Ominin
- What you must do when invoked
- What you must do when invoked
- useToast
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
- `FindingsCard()` --calls--> `formatDayTime()`  [EXTRACTED]
  frontend/app/admin/(shell)/lea/page.tsx → frontend/lib/admin/format.ts
- `GET()` --calls--> `createAdminClient()`  [EXTRACTED]
  frontend/app/api/collect/order/route.ts → frontend/lib/supabase/admin.ts
- `Body` --references--> `ShopOrderStatus`  [EXTRACTED]
  frontend/app/api/shop/gestion/orders/route.ts → frontend/lib/shop/types.ts
- `ClipEspaceLayout()` --calls--> `createClient()`  [EXTRACTED]
  frontend/app/clip/espace/layout.tsx → frontend/lib/supabase/server.ts
- `DayGroup` --references--> `Order`  [EXTRACTED]
  frontend/app/menu/gestion/paiements/page.tsx → frontend/lib/gestion/types.ts

## Import Cycles
- None detected.

## Communities (149 total, 12 thin omitted)

### Community 0 - "useGestionAccess"
Cohesion: 0.17
Nodes (25): BadgeagePage(), CommandesPage(), dedupeById(), EMPTY_BODIES, matchesFilter(), EquipePage(), EtablissementPage(), NotificationsPage() (+17 more)

### Community 1 - "clip/server.ts"
Cohesion: 0.25
Nodes (14): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+6 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.07
Nodes (37): metadata, DemoShowcase(), Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter() (+29 more)

### Community 3 - "clients.ts"
Cohesion: 0.20
Nodes (18): CapacitesPage(), openViews(), Capabilities(), OrderTabsCard(), Client, clientFeatures(), fetchClients(), isFeature() (+10 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.08
Nodes (32): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter() (+24 more)

### Community 5 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, dev, lint, prebuild, predev, seed:crm, seed:demo (+5 more)

### Community 6 - "gestion/selectors.ts"
Cohesion: 0.08
Nodes (42): ApercuPage(), Period, RevenueChart(), TopVentesChart(), DayGroup, dedupeById(), displayMode(), groupByDay() (+34 more)

### Community 7 - "supabase/client.ts"
Cohesion: 0.15
Nodes (11): InvitationForm(), InvitationPage(), OnboardingForm(), RESERVED_SLUGS, slugify(), metadata, OnboardingPage(), StaffPending() (+3 more)

### Community 8 - "admin/store.ts"
Cohesion: 0.15
Nodes (28): AppointmentFormModal(), RestaurantPicker(), TaskFormModal(), adminLoginPath(), fromDatetimeLocalValue(), normalizeText(), toDatetimeLocalValue(), rowToLeadLite() (+20 more)

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
Cohesion: 0.17
Nodes (18): ProduitsPage(), ExternalLinkIcon(), SubscriptionGate(), cardClass, DiscoverLink(), eyebrowClass, Pill(), ProductCard() (+10 more)

### Community 13 - "collect/landing/demo-showcase.tsx"
Cohesion: 0.26
Nodes (9): metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), demoSection, collectDemoHref(), collectLandingHref(), emptySubscribe() (+1 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "ui.tsx"
Cohesion: 0.08
Nodes (40): metadata, TrackingPage(), AlertIcon(), InfoIcon(), SearchIcon(), ContactForm(), LoginForm(), CustomerReplyForm() (+32 more)

### Community 16 - "clip/demo/data.ts"
Cohesion: 0.14
Nodes (26): ClipData, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics(), buildDemoPosts(), buildDemoState(), DAILY_REACH_PEAK, DEMO_ACCOUNTS (+18 more)

### Community 17 - "clip-landing-data.ts"
Cohesion: 0.10
Nodes (27): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero(), ClipHowItWorks(), ClipNav() (+19 more)

### Community 18 - "metrics.ts"
Cohesion: 0.08
Nodes (48): load(), ClientsPage(), PERIOD_TABS, ClientDetail(), isView(), PERIOD_TABS, BarPoint, BarSeries() (+40 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "upload-post.ts"
Cohesion: 0.12
Nodes (17): PROVIDER_API_URL, PROVIDER_TIMEOUT_MS, providerApiKey(), STORAGE_RETENTION_DAYS, PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider (+9 more)

### Community 21 - "api/contact/route.ts"
Cohesion: 0.23
Nodes (12): invalid(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, CONTACT_LIMITS, ContactField (+4 more)

### Community 22 - "database.types.ts"
Cohesion: 0.14
Nodes (16): isTerminal(), POST(), Product, PRODUCTS_BY_CHOICE, SEED_TABLE_COUNT, CompositeTypes, Constants, Database (+8 more)

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "notifications/page.tsx"
Cohesion: 0.06
Nodes (57): CallBody, POST(), POST(), POST(), ChimeCard(), DevicesCard(), DeviceStatusCard(), IOS_STEPS (+49 more)

### Community 25 - "gestion/constants.ts"
Cohesion: 0.07
Nodes (48): RestaurantPane(), STATUS_CLASSES, StatusBadge(), LoadError(), NavItem, ACTION_FEATURE, ACTION_LABELS, COLLECT_ETA_CHOICES_MIN (+40 more)

### Community 26 - "espace/comptes/creation/page.tsx"
Cohesion: 0.05
Nodes (24): AnalytiquePage(), PostAnalyticsList(), CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, ComptesPage() (+16 more)

### Community 27 - "shop/icons.tsx"
Cohesion: 0.04
Nodes (74): ShopLayout(), CreateShopForm(), ImageUploader(), UploadedImage, CategoriesManager(), DiscountDraft, DiscountManager(), FaqManager() (+66 more)

### Community 28 - "createAdminClient"
Cohesion: 0.09
Nodes (43): GET(), EXTENSIONS, POST(), POST(), DELETE(), GET(), POST(), requireUser() (+35 more)

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

### Community 34 - "auth-form.tsx"
Cohesion: 0.11
Nodes (11): metadata, metadata, metadata, metadata, metadata, metadata, metadata, AuthForm() (+3 more)

### Community 35 - "seed-crm.ts"
Cohesion: 0.21
Nodes (11): Category, daysAgo(), daysAhead(), db, LeadStatus, main(), Priority, R (+3 more)

### Community 36 - "Setup guide (written for an LLM agent)"
Cohesion: 0.15
Nodes (12): 1. Prerequisites, 2. Frontend, 3. Backend, 4. Supabase (database & auth), 5. Graphify (knowledge-graph CLI), 6. Project skills (nothing to install), 7. Outreach agent « Léa » (one-time setup, human-only), 8. Final checklist (+4 more)

### Community 37 - "Ominin"
Cohesion: 0.18
Nodes (10): Business constraints, Code quality, Commands, Conventions, graphify, Ominin, Repo structure, Stack (+2 more)

### Community 38 - "m/[slug]/page.tsx"
Cohesion: 0.14
Nodes (12): generateMetadata(), getRestaurant, MenuPage(), revalidate, CategoryNav(), Hero(), PARTICLES, LANGUAGES (+4 more)

### Community 39 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): /commit, Execution requirement, Step 1 — Understand what changed, Step 2 — Project upkeep (required before every push), Step 3 — Safety checks, Step 4 — Write the commit message, Step 5 — Commit and push, Step 6 — Report back (+1 more)

### Community 40 - "admin/api.ts"
Cohesion: 0.07
Nodes (54): CreateRestaurantModal(), ActivityInput, AppointmentInput, availableSlug(), createRestaurant(), DuplicateCandidate, ExportRow, fetchAllSlugs() (+46 more)

### Community 41 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 42 - "getRestaurant"
Cohesion: 0.31
Nodes (9): ClientDemoPage(), generateMetadata(), legsOf(), seed(), getRestaurant(), restaurantThemeClass(), db, main() (+1 more)

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
Nodes (16): name, private, version, eslint, eslint-config-next, react-dom, tailwindcss, @tailwindcss/postcss (+8 more)

### Community 58 - "commande/page.tsx"
Cohesion: 0.38
Nodes (5): CheckoutPage(), metadata, CheckIcon(), getActiveShippingMethods(), paymentsEnabled()

### Community 63 - "shop/types.ts"
Cohesion: 0.04
Nodes (75): allura, cormorant, dmSans, dmSerif, FONT_VARIABLES, generateMetadata(), inter, montserrat (+67 more)

### Community 64 - "_template/profile.json"
Cohesion: 0.06
Nodes (30): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+22 more)

### Community 65 - "item-form-modal.tsx"
Cohesion: 0.28
Nodes (19): ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft(), FormuleFormModal() (+11 more)

### Community 67 - "temps.ts"
Cohesion: 0.08
Nodes (62): PANE_TAGLINES, PaneId, PANES, ROLES, TeamManager(), metadata, PlanningPage(), PlanningPayload (+54 more)

### Community 68 - "tarifs-planifies.tsx"
Cohesion: 0.29
Nodes (9): formatAdjustment(), formatDays(), formatTargets(), formatWindow(), parseTargetKey(), RuleForm(), targetKey(), TarifsPlanifies() (+1 more)

### Community 69 - "add-to-order.tsx"
Cohesion: 0.31
Nodes (9): AddToOrder(), choiceRowClass(), isUnavailable(), OptionsModal(), CallServerButton(), CallState, CartChoice, cartLineKey() (+1 more)

### Community 70 - "lead-panel.tsx"
Cohesion: 0.08
Nodes (38): metadata, ArrowRightIcon(), BotIcon(), CalendarIcon(), ChartIcon(), ClockIcon(), GlobeIcon(), ImportIcon() (+30 more)

### Community 71 - "gestion/menu/page.tsx"
Cohesion: 0.09
Nodes (33): MenuPage(), View, CartLine, cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), lineKey() (+25 more)

### Community 72 - "espace/shell.tsx"
Cohesion: 0.07
Nodes (29): AnalyticsView, compact, VIEW_SUBTITLES, VIEWS, ClipEspaceLayout(), metadata, NavItem, Dropzone() (+21 more)

### Community 73 - "markOrderPaidFromSession"
Cohesion: 0.36
Nodes (8): POST(), loadOrder(), addOrderEvent(), addressFromStripe(), applyRefundFromCharge(), loadShop(), markOrderPaidFromSession(), markSessionExpired()

### Community 74 - "services/autoresearch.py"
Cohesion: 0.13
Nodes (25): _credentials_env(), _parse(), parse_structured(), The Agent SDK spawns a Claude Code subprocess that authenticates from the…, Single-turn, tool-less Claude call returning schema-validated output. Sync on…, AnalysisFindings, ProposedVariant, ProspectScore (+17 more)

### Community 75 - "carte/page.tsx"
Cohesion: 0.19
Nodes (18): CartePage(), MapCanvas, CrosshairIcon(), FollowUpChoice, VisitedFlow(), FOLLOW_UP_QUICK_OPTIONS, GEOLOCATION_TIMEOUT_MS, capturePosition() (+10 more)

### Community 76 - "Bridge"
Cohesion: 0.14
Nodes (13): BaseSettings, Settings, Bridge, ensure_token(), main(), Client, Boucle Omilink. Un boîtier neuf génère son jeton, n'en confie que l'empreinte…, Hôtes du réseau local répondant sur le port des imprimantes. (+5 more)

### Community 77 - "shared.ts"
Cohesion: 0.17
Nodes (16): POST(), ResolvedLine, resolveOptions(), GET(), isTerminal(), OrderConfirmation(), STATUS_COPY, CartChoice (+8 more)

### Community 78 - "collect/[slug]/page.tsx"
Cohesion: 0.48
Nodes (5): CollectPage(), generateMetadata(), getPage, revalidate, isCollectActive()

### Community 79 - "admin/constants.ts"
Cohesion: 0.05
Nodes (59): FindingsCard(), hostOf(), percent(), PROSPECT_TILES, ProspectsPanel(), scoreColor(), TabId, VARIANT_ORDER (+51 more)

### Community 80 - "cart-bar.tsx"
Cohesion: 0.13
Nodes (16): CartBar(), PaymentChoice, SubmitState, TIP_PERCENTS, TipChoice, loadSdk(), PaymentState, SquareCard (+8 more)

### Community 81 - "setup-stripe.ts"
Cohesion: 0.22
Nodes (7): collectOffer, shopOffer, Plan, plans, shopPlans, stripe, zeroPriced

### Community 82 - "stage.tsx"
Cohesion: 0.05
Nodes (35): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView() (+27 more)

### Community 83 - "gestion/api.ts"
Cohesion: 0.09
Nodes (53): CategoryManager(), apply(), assertTransition(), assignTable(), createCategory(), createFormule(), createItem(), createStaff() (+45 more)

### Community 84 - "portal-data.ts"
Cohesion: 0.25
Nodes (8): unsplash(), brand, buildLabel, footer, nav, openLabel, portalHost, products

### Community 85 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+4 more)

### Community 86 - "inscription-tabs.tsx"
Cohesion: 0.29
Nodes (4): InscriptionTabs(), Profile, TABS, metadata

### Community 87 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx, @types/node, @types/qrcode (+4 more)

### Community 88 - "public-menu.ts"
Cohesion: 0.26
Nodes (9): ConfirmationPage(), metadata, EnCeMoment(), assembleCategories(), applyTarifs(), fetchActiveTarifs(), Tarif, fetchRestaurant() (+1 more)

### Community 89 - "dish-card.tsx"
Cohesion: 0.22
Nodes (6): DishCard(), FeaturedCard(), MenuSection(), ItemInput, Badge, BADGE_LABELS

### Community 90 - "createClient"
Cohesion: 0.07
Nodes (54): LeaPage(), SignOutButton(), approveOutreachEmail(), fetchLatestResearchRun(), fetchOutreachEmails(), fetchOutreachProspects(), fetchOutreachRuns(), fetchOutreachStats() (+46 more)

### Community 91 - "must"
Cohesion: 0.22
Nodes (15): createPriceRule(), priceRuleColumns(), replaceTargets(), reprintTickets(), updateCashDetails(), updatePriceRule(), voidCashPayment(), rowToOrder() (+7 more)

### Community 92 - "invite/route.ts"
Cohesion: 0.31
Nodes (11): RFC-2047, POST(), Role, accessToken(), card(), escapeHtml(), mailConfig(), ROLE_LABELS (+3 more)

### Community 93 - "captions/route.ts"
Cohesion: 0.48
Nodes (5): POST(), CAPTION_CONTEXT_MAX_CHARS, captionsSchema(), generateCaptions(), @anthropic-ai/sdk

### Community 94 - "react"
Cohesion: 0.20
Nodes (8): metadata, DUPLICATE_REASON_LABELS, CaptionEditor(), Status, ShopLoginForm(), Field(), inputClass, react

### Community 95 - "admin/format.ts"
Cohesion: 0.15
Nodes (28): ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, TachesPage(), PlusIcon() (+20 more)

### Community 96 - "shop/constants.ts"
Cohesion: 0.08
Nodes (52): ShopCustomersPage(), ShopOrderPage(), FILTERS, ShopMessagesPage(), ShopDashboardPage(), metadata, PackingSlipPage(), OrdersTable() (+44 more)

### Community 97 - "demo/layout.tsx"
Cohesion: 0.38
Nodes (4): metadata, DemoBanner(), emptySubscribe(), DEMO_BANNER

### Community 98 - "form.tsx"
Cohesion: 0.48
Nodes (4): CollectSignupForm(), slugify(), metadata, startCheckout()

### Community 99 - "gestion/photo.ts"
Cohesion: 0.50
Nodes (4): compressPhoto(), PHOTO_JPEG_QUALITY, PHOTO_MAX_EDGE, uploadPhoto()

### Community 101 - "portal/hero.tsx"
Cohesion: 0.50
Nodes (3): PARTICLES, PortalHero(), hero

### Community 102 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): Important notes, /new-restaurant, Phase 1 — Intake, Phase 2 — Research, Phase 3 — Verify with user, Phase 4 — Build the demo profile, Phase 5 — Summary, Updating an existing profile (+1 more)

### Community 105 - "filter-bar.tsx"
Cohesion: 0.16
Nodes (20): FilterBar(), toggleInSet(), FilterIcon(), SearchIcon(), NO_CONTACT_OPTIONS, appointmentIds(), countActiveFilters(), filterLeads() (+12 more)

### Community 109 - "gestion/types.ts"
Cohesion: 0.07
Nodes (43): EncaisserCard(), EncaisserPanel(), sumLines(), sumUnits(), toSelection(), Unit, unitsOf(), CheckMark() (+35 more)

### Community 110 - "tickets.py"
Cohesion: 0.36
Nodes (11): _group_by_category(), _line(), _local(), datetime, Tickets rendus en ESC/POS. Omilink envoie ces octets tels quels à l'imprimante…, Group items by category name, sorted by category position., _render_items(), render_job() (+3 more)

### Community 113 - "desinscription/route.ts"
Cohesion: 0.31
Nodes (10): RFC-8058, confirmFormHtml(), DONE_HTML, GET(), LEAD_DEMOTABLE_FROM, PAGE_SHELL(), params(), POST() (+2 more)

### Community 116 - "clip/constants.ts"
Cohesion: 0.25
Nodes (8): PlatformBadge(), PostCard(), STATUS_CLASSES, PLATFORM_LABELS, POLL_INTERVAL_MS, POLL_TIMEOUT_MS, STATUS_LABELS, ClipPostStatus

### Community 121 - "components/gestion/shell.tsx"
Cohesion: 0.10
Nodes (22): metadata, ApercuIcon(), BellIcon(), CheckIcon(), ChevronDownIcon(), ClockIcon(), CommandesIcon(), GearIcon() (+14 more)

### Community 123 - "restaurants/page.tsx"
Cohesion: 0.08
Nodes (37): RFC-4180, ActivitePage(), EmailsRedirect(), Analysis, ImportPage(), parseCoordinate(), ParsedRow, Phase (+29 more)

### Community 125 - "orders.ts"
Cohesion: 0.18
Nodes (30): POST(), POST(), POST(), POST(), base64url(), buildRawMessage(), encodeSubject(), getAccessToken() (+22 more)

### Community 145 - "shop/server.ts"
Cohesion: 0.08
Nodes (46): GET(), CollectEtablissementPage(), ShopSettingsPage(), ShopDiscountsPage(), ShopOrdersPage(), ShopContentPage(), metadata, ShopGestionLayout() (+38 more)

### Community 146 - "services/inbox.py"
Cohesion: 0.14
Nodes (23): BaseSettings, Settings, InboxVerdict, BaseModel, daily_cold_count(), log_email_activity(), Cold emails already sent today, Paris time (the cap's clock)., Send every approved outbound email of the given kinds, oldest first. cold_cap… (+15 more)

### Community 147 - "gmail.py"
Cohesion: 0.13
Nodes (22): archive_to_label(), ensure_label(), extract_body_text(), extract_headers(), get_message(), list_inbox(), Move a message out of the inbox into the given label., Walk MIME parts for text/plain; fall back to stripped text/html. (+14 more)

### Community 148 - "shop-landing-data.ts"
Cohesion: 0.12
Nodes (25): metadata, ShopNav(), ShopFaq(), ShopFeatures(), ShopFinalCta(), ShopFooter(), ShopHero(), ShopHowItWorks() (+17 more)

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
Cohesion: 0.10
Nodes (39): BADGE, DeviceCard(), DOT_CLASS, Editing, Health, LinkState, PrinterCard(), printerHealth() (+31 more)

### Community 161 - "get_supabase"
Cohesion: 0.11
Nodes (26): get_supabase(), Client, Device, Authentifie un appareil Omilink par l'empreinte SHA-256 de son jeton., require_device(), _apply_routing(), _build_routing(), enroll() (+18 more)

### Community 167 - "next"
Cohesion: 0.06
Nodes (74): AboutPage(), metadata, revalidate, CatalogPage(), generateMetadata(), revalidate, ConfirmationPage(), metadata (+66 more)

### Community 171 - "useLanguage"
Cohesion: 0.25
Nodes (8): metadata, ContactForm(), LanguageToggle(), PortalNav(), SurMesure(), languageToggle, surMesure, useLanguage()

### Community 172 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 178 - "app/layout.tsx"
Cohesion: 0.13
Nodes (14): fraunces, instrumentSans, metadata, viewport, MENU_PATHS, Providers(), Choice, CookieConsent() (+6 more)

### Community 179 - "shop/checkout.ts"
Cohesion: 0.13
Nodes (27): POST(), POST(), POST(), absoluteImage(), Admin, createCheckoutSession(), priceItems(), validateDiscountCode() (+19 more)

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

### Community 188 - "useToast"
Cohesion: 0.10
Nodes (31): EtablissementForm(), NoteComposer, AdminLockButton(), CollectSettings(), LockIcon(), NO_SQUARE, NO_STRIPE, PaymentSettings() (+23 more)

### Community 189 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 195 - "site.ts"
Cohesion: 0.24
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
Cohesion: 0.18
Nodes (10): 1. Étapes du service et équipe sans comptes (2026-09-10), 2. Capacités par restaurant et gestes de salle (2026-09-10), 3. Square, deuxième encaisseur du menu QR (2026-09-09), 4. Analytique du menu QR et tableau de bord client (2026-09-11), 5. Commission des boutiques : poser le taux (2026-09-09), 6. Tablette de salle et serveurs sans compte (2026-09-09), 7. Identité des boutiques : icône et aperçu de partage (2026-09-09), 8. Service direct, badgeuse et planning, Google Analytics (2026-09-08) (+2 more)

## Knowledge Gaps
- **680 isolated node(s):** `backend`, `$schema`, `slug`, `name`, `tagline` (+675 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 934 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `useGestionAccess`, `landing-data.ts`, `clients.ts`, `collect-landing-data.ts`, `gestion/selectors.ts`, `supabase/client.ts`, `admin/store.ts`, `clip/context.tsx`, `menu/gestion/produits/page.tsx`, `collect/landing/demo-showcase.tsx`, `ui.tsx`, `clip/demo/data.ts`, `shop/server.ts`, `metrics.ts`, `notifications/page.tsx`, `gestion/constants.ts`, `espace/comptes/creation/page.tsx`, `shop/icons.tsx`, `app/page.tsx`, `terminaux/page.tsx`, `lead-cache.ts`, `auth-form.tsx`, `m/[slug]/page.tsx`, `app/layout.tsx`, `menu/cart.tsx`, `language.tsx`, `package.json`, `useToast`, `shop/types.ts`, `item-form-modal.tsx`, `temps.ts`, `tarifs-planifies.tsx`, `add-to-order.tsx`, `lead-panel.tsx`, `gestion/menu/page.tsx`, `espace/shell.tsx`, `carte/page.tsx`, `shared.ts`, `collect/[slug]/page.tsx`, `admin/constants.ts`, `cart-bar.tsx`, `stage.tsx`, `inscription-tabs.tsx`, `admin/format.ts`, `demo/layout.tsx`, `form.tsx`, `filter-bar.tsx`, `gestion/types.ts`, `clip/constants.ts`, `components/gestion/shell.tsx`, `restaurants/page.tsx`?**
  _High betweenness centrality (0.248) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `createAdminClient` to `clip/server.ts`, `next`, `markOrderPaidFromSession`, `square/server.ts`, `sumup/server.ts`, `shared.ts`, `collect/[slug]/page.tsx`, `ui.tsx`, `desinscription/route.ts`, `shop/server.ts`, `shop/checkout.ts`, `api/contact/route.ts`, `notifications/page.tsx`, `commande/page.tsx`, `invite/route.ts`, `orders.ts`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `next` connect `next` to `landing-data.ts`, `collect-landing-data.ts`, `supabase/client.ts`, `collect/landing/demo-showcase.tsx`, `ui.tsx`, `clip-landing-data.ts`, `shop/server.ts`, `shop-landing-data.ts`, `app/page.tsx`, `auth-form.tsx`, `m/[slug]/page.tsx`, `getRestaurant`, `useLanguage`, `app/layout.tsx`, `next.config.ts`, `package.json`, `commande/page.tsx`, `shop/types.ts`, `temps.ts`, `site.ts`, `lead-panel.tsx`, `espace/shell.tsx`, `collect/[slug]/page.tsx`, `inscription-tabs.tsx`, `public-menu.ts`, `react`, `shop/constants.ts`, `demo/layout.tsx`, `form.tsx`, `components/gestion/shell.tsx`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `backend`, `$schema`, `slug` to the rest of the system?**
  _680 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07127882599580712 - nodes in this community are weakly interconnected._
- **Should `collect-landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07535460992907801 - nodes in this community are weakly interconnected._
- **Should `gestion/selectors.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07985480943738657 - nodes in this community are weakly interconnected._
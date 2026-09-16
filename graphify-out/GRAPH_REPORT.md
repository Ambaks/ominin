# Graph Report - ominin  (2026-09-16)

## Corpus Check
- 630 files · ~1,681,634 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3426 nodes · 10226 edges · 151 communities (130 shown, 13 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 196 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc945806`
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
- checkout-form.tsx
- admin/store.ts
- sumup/server.ts
- square/server.ts
- clip/context.tsx
- menu/gestion/produits/page.tsx
- shop/server.ts
- What You Must Do When Invoked
- shop/icons.tsx
- clip/demo/data.ts
- clip-landing-data.ts
- metrics.ts
- compilerOptions
- upload-post.ts
- api/contact/route.ts
- menu-data.ts
- Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)
- shop/types.ts
- admin/api.ts
- espace/comptes/creation/page.tsx
- managers.tsx
- getStripe
- boho/profile.json
- proxy.ts
- app/page.tsx
- createAdminClient
- auth-form.tsx
- seed-crm.ts
- Setup guide (written for an LLM agent)
- Ominin
- gestion/store.ts
- What you must do when invoked
- supabase/client.ts
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
- database.types.ts
- postcss.config.mjs
- backend
- add-to-cart-form.tsx
- _template/profile.json
- collect/demo/provider.tsx
- temps.ts
- components/gestion/shell.tsx
- notifications/page.tsx
- lead-panel.tsx
- encaisser-card.tsx
- espace/generateur/page.tsx
- invite/route.ts
- services/autoresearch.py
- clip/demo-showcase.tsx
- Bridge
- collect/checkout/route.ts
- payment-settings.tsx
- admin/constants.ts
- next.config.ts
- restaurants/page.tsx
- stage.tsx
- gestion/api.ts
- clip/store.ts
- dependencies
- gestion/menu/page.tsx
- devDependencies
- CollectDemoValue
- shared.ts
- createClient
- public-menu.ts
- push/server.ts
- section-heading.tsx
- ui.tsx
- admin/format.ts
- settings.tsx
- setup-stripe.ts
- clip/constants.ts
- react
- order-confirmation.tsx
- m/[slug]/page.tsx
- What you must do when invoked
- provider/types.ts
- restaurant-pane.tsx
- add-to-order.tsx
- qr-showcase.tsx
- rowToOrder
- tickets.py
- desinscription/route.ts
- captions/route.ts
- use-order-chime.ts
- filter-bar.tsx
- orders.ts
- shop/constants.ts
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
2. `react` - 150 edges
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
- `Body` --references--> `ShopOrderStatus`  [EXTRACTED]
  frontend/app/api/shop/gestion/orders/route.ts → frontend/lib/shop/types.ts
- `GenerateurPage()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/generateur/page.tsx → frontend/lib/clip/context.tsx
- `CollectEtablissementPage()` --calls--> `createClient()`  [EXTRACTED]
  frontend/app/collect/inscription/etablissement/page.tsx → frontend/lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (151 total, 13 thin omitted)

### Community 0 - "useGestionAccess"
Cohesion: 0.17
Nodes (22): BadgeagePage(), CommandesPage(), dedupeById(), EMPTY_BODIES, matchesFilter(), EquipePage(), EtablissementPage(), TablesPage() (+14 more)

### Community 1 - "admin.ts"
Cohesion: 0.23
Nodes (15): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+7 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.08
Nodes (32): metadata, Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter(), LandingNav() (+24 more)

### Community 3 - "gestion/constants.ts"
Cohesion: 0.08
Nodes (40): NavItem, ACTION_FEATURE, ACTION_LABELS, ANALYTICS_PERIOD_DAYS, COLLECT_FEATURES, DEFAULT_VAT_RATE, EXCLUDED_STATUSES, FEATURES (+32 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.08
Nodes (30): metadata, CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter(), CollectHero(), CollectHowItWorks(), CollectModes() (+22 more)

### Community 5 - "scripts"
Cohesion: 0.11
Nodes (19): scripts, build, db:diff, db:link, db:login, db:push, db:types, dev (+11 more)

### Community 6 - "gestion/selectors.ts"
Cohesion: 0.09
Nodes (38): ApercuPage(), Period, RevenueChart(), TopVentesChart(), DayGroup, dedupeById(), displayMode(), groupByDay() (+30 more)

### Community 7 - "checkout-form.tsx"
Cohesion: 0.10
Nodes (28): POST(), CheckoutPage(), metadata, CheckIcon(), CheckoutForm(), CheckoutFormInner(), CheckoutFormProps, absoluteImage() (+20 more)

### Community 8 - "admin/store.ts"
Cohesion: 0.16
Nodes (26): AppointmentFormModal(), RestaurantPicker(), TaskFormModal(), adminLoginPath(), fromDatetimeLocalValue(), toDatetimeLocalValue(), commit(), fetchAll() (+18 more)

### Community 9 - "sumup/server.ts"
Cohesion: 0.16
Nodes (22): GET(), stateCookie(), GET(), POST(), POST(), POST(), POST(), confirmOrderPaid() (+14 more)

### Community 10 - "square/server.ts"
Cohesion: 0.10
Nodes (43): GET(), stateCookie(), GET(), PATCH(), POST(), Line, orderBody(), POST() (+35 more)

### Community 11 - "clip/context.tsx"
Cohesion: 0.15
Nodes (21): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), replacePost() (+13 more)

### Community 12 - "menu/gestion/produits/page.tsx"
Cohesion: 0.13
Nodes (24): CollectSignupForm(), slugify(), ProduitsPage(), CheckIcon(), ExternalLinkIcon(), SubscriptionGate(), cardClass, DiscoverLink() (+16 more)

### Community 13 - "shop/server.ts"
Cohesion: 0.10
Nodes (41): GET(), ClipEspaceLayout(), metadata, ShopDiscountsPage(), ShopOrdersPage(), ShopContentPage(), metadata, ShopGestionLayout() (+33 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "shop/icons.tsx"
Cohesion: 0.11
Nodes (23): metadata, AccountPage(), metadata, SignOutButton(), isActive(), NAV_ITEMS, NavItem, ROLE_LABELS (+15 more)

### Community 16 - "clip/demo/data.ts"
Cohesion: 0.11
Nodes (26): metadata, DemoBanner(), emptySubscribe(), ClipData, ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics() (+18 more)

### Community 17 - "clip-landing-data.ts"
Cohesion: 0.10
Nodes (27): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero(), ClipHowItWorks(), ClipNav() (+19 more)

### Community 18 - "metrics.ts"
Cohesion: 0.08
Nodes (50): ActivitePage(), load(), ClientsPage(), PERIOD_TABS, ClientDetail(), isView(), PERIOD_TABS, BarPoint (+42 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "upload-post.ts"
Cohesion: 0.12
Nodes (16): PROVIDER_API_URL, PROVIDER_TIMEOUT_MS, providerApiKey(), PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider, ensureProfile() (+8 more)

### Community 21 - "api/contact/route.ts"
Cohesion: 0.14
Nodes (19): invalid(), isContactSource(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, LeadForm() (+11 more)

### Community 22 - "menu-data.ts"
Cohesion: 0.08
Nodes (33): CartLine, cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), lineKey(), lineUnitPrice(), OptionsDialog() (+25 more)

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "shop/types.ts"
Cohesion: 0.07
Nodes (27): LegalPage(), PAGES, ChevronDownIcon(), FaqAccordion(), ProductGallery(), Multiline(), ProductBadge(), DashboardStats (+19 more)

### Community 25 - "admin/api.ts"
Cohesion: 0.05
Nodes (97): LeaPage(), CreateRestaurantModal(), ActivityInput, addActivity(), apply(), availableSlug(), byDue(), completeTask() (+89 more)

### Community 26 - "espace/comptes/creation/page.tsx"
Cohesion: 0.11
Nodes (7): FLEET, PILLARS, STEPS, WEEK, ComptesTab, ComptesTabs(), TABS

### Community 27 - "managers.tsx"
Cohesion: 0.09
Nodes (41): CreateShopForm(), ImageUploader(), UploadedImage, CategoriesManager(), DiscountDraft, DiscountManager(), FaqManager(), ShippingDraft (+33 more)

### Community 28 - "getStripe"
Cohesion: 0.13
Nodes (24): isTerminal(), POST(), Product, PRODUCTS_BY_CHOICE, GET(), POST(), requireGerant(), POST() (+16 more)

### Community 29 - "boho/profile.json"
Cohesion: 0.06
Nodes (31): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+23 more)

### Community 30 - "proxy.ts"
Cohesion: 0.36
Nodes (7): config, matchesPath(), ProductConfig, PRODUCTS, proxy(), rewritePrefixFor(), @supabase/ssr

### Community 31 - "app/page.tsx"
Cohesion: 0.14
Nodes (13): metadata, PortalApproach(), PortalFinalCta(), PARTICLES, PortalHero(), BENTO, PortalProducts(), ProductCube() (+5 more)

### Community 32 - "createAdminClient"
Cohesion: 0.15
Nodes (19): GET(), EXTENSIONS, POST(), POST(), DELETE(), GET(), POST(), requireUser() (+11 more)

### Community 34 - "auth-form.tsx"
Cohesion: 0.07
Nodes (18): metadata, metadata, metadata, metadata, CollectEtablissementPage(), metadata, metadata, metadata (+10 more)

### Community 35 - "seed-crm.ts"
Cohesion: 0.21
Nodes (11): Category, daysAgo(), daysAhead(), db, LeadStatus, main(), Priority, R (+3 more)

### Community 36 - "Setup guide (written for an LLM agent)"
Cohesion: 0.15
Nodes (12): 1. Prerequisites, 2. Frontend, 3. Backend, 4. Supabase (database & auth), 5. Graphify (knowledge-graph CLI), 6. Project skills (nothing to install), 7. Outreach agent « Léa » (one-time setup, human-only), 8. Final checklist (+4 more)

### Community 37 - "Ominin"
Cohesion: 0.18
Nodes (10): Business constraints, Code quality, Commands, Conventions, graphify, Ominin, Repo structure, Stack (+2 more)

### Community 38 - "gestion/store.ts"
Cohesion: 0.17
Nodes (25): TeamManager(), FeatureLocked(), rowToEtablissement(), rowToMember(), rowToTable(), planFeature(), resolveFeatures(), activeProducts() (+17 more)

### Community 39 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): /commit, Execution requirement, Step 1 — Understand what changed, Step 2 — Project upkeep (required before every push), Step 3 — Safety checks, Step 4 — Write the commit message, Step 5 — Commit and push, Step 6 — Report back (+1 more)

### Community 40 - "supabase/client.ts"
Cohesion: 0.16
Nodes (11): InvitationForm(), InvitationPage(), OnboardingForm(), RESERVED_SLUGS, slugify(), metadata, OnboardingPage(), StaffPending() (+3 more)

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

### Community 50 - "clients.ts"
Cohesion: 0.20
Nodes (17): CapacitesPage(), openViews(), Capabilities(), OrderTabsCard(), Client, clientFeatures(), fetchClients(), isFeature() (+9 more)

### Community 51 - "frontend/README.md"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 52 - ".claude/CLAUDE.md"
Cohesion: 0.50
Nodes (3): commit, graphify, new-restaurant

### Community 55 - "package.json"
Cohesion: 0.11
Nodes (17): name, private, version, @anthropic-ai/sdk, eslint, eslint-config-next, react-dom, supabase (+9 more)

### Community 58 - "database.types.ts"
Cohesion: 0.13
Nodes (21): ClientDemoPage(), generateMetadata(), legsOf(), seed(), getRestaurant(), restaurantThemeClass(), CompositeTypes, Constants (+13 more)

### Community 63 - "add-to-cart-form.tsx"
Cohesion: 0.08
Nodes (39): CartPage(), metadata, BagIcon(), CloseIcon(), LockIcon(), MenuIcon(), MinusIcon(), PlusIcon() (+31 more)

### Community 64 - "_template/profile.json"
Cohesion: 0.06
Nodes (30): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+22 more)

### Community 65 - "collect/demo/provider.tsx"
Cohesion: 0.18
Nodes (13): buildDemoMenu(), COLLECT_DEMO, DEMO_MENU_SPEC, DemoMenuSection, demoRestaurantInfo, DemoStep, CollectDemoContext, CollectDemoProvider() (+5 more)

### Community 67 - "temps.ts"
Cohesion: 0.08
Nodes (57): PANE_TAGLINES, PaneId, PANES, ROLES, metadata, PlanningPage(), PlanningPayload, BadgeagesLog() (+49 more)

### Community 68 - "components/gestion/shell.tsx"
Cohesion: 0.10
Nodes (25): NavItem, ClipShell(), isActive(), NAV_ITEMS, NavItem, signOut(), ApercuIcon(), BellIcon() (+17 more)

### Community 69 - "notifications/page.tsx"
Cohesion: 0.14
Nodes (26): DevicesCard(), DeviceStatusCard(), IOS_STEPS, NotificationsPage(), PrefsCard(), PushPrompt(), PUSH_PROMPT_DISMISSED_KEY, currentEndpoint() (+18 more)

### Community 70 - "lead-panel.tsx"
Cohesion: 0.08
Nodes (38): metadata, ArrowRightIcon(), BotIcon(), CalendarIcon(), ChartIcon(), ClockIcon(), FilterIcon(), GlobeIcon() (+30 more)

### Community 71 - "encaisser-card.tsx"
Cohesion: 0.11
Nodes (28): EncaisserCard(), EncaisserPanel(), sumLines(), sumUnits(), toSelection(), Unit, unitsOf(), OrderCard() (+20 more)

### Community 72 - "espace/generateur/page.tsx"
Cohesion: 0.14
Nodes (8): GenerateurPage(), MOMENTS, STEPS, PublierTab, PublierTabs(), TABS, SubTab, SubTabs()

### Community 73 - "invite/route.ts"
Cohesion: 0.31
Nodes (11): RFC-2047, POST(), Role, accessToken(), card(), escapeHtml(), mailConfig(), ROLE_LABELS (+3 more)

### Community 74 - "services/autoresearch.py"
Cohesion: 0.13
Nodes (25): _credentials_env(), _parse(), parse_structured(), The Agent SDK spawns a Claude Code subprocess that authenticates from the…, Single-turn, tool-less Claude call returning schema-validated output. Sync on…, AnalysisFindings, ProposedVariant, ProspectScore (+17 more)

### Community 75 - "clip/demo-showcase.tsx"
Cohesion: 0.16
Nodes (9): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, BrowserFrame(), DemoShowcase(), IphoneFrame(), QrCorners(), demoSection (+1 more)

### Community 76 - "Bridge"
Cohesion: 0.13
Nodes (13): BaseSettings, Settings, Bridge, ensure_token(), main(), Client, Boucle Omilink. Un boîtier neuf génère son jeton, n'en confie que l'empreinte…, Hôtes du réseau local répondant sur le port des imprimantes. (+5 more)

### Community 77 - "collect/checkout/route.ts"
Cohesion: 0.24
Nodes (10): POST(), ResolvedLine, resolveOptions(), CollectPage(), generateMetadata(), getPage, revalidate, isCollectActive() (+2 more)

### Community 78 - "payment-settings.tsx"
Cohesion: 0.23
Nodes (11): NO_SQUARE, NO_STRIPE, PaymentSettings(), Provider, readStatus(), SquareLocation, SquareStatus, StripeStatus (+3 more)

### Community 79 - "admin/constants.ts"
Cohesion: 0.04
Nodes (71): MapCanvas, FindingsCard(), hostOf(), percent(), PROSPECT_TILES, ProspectsPanel(), scoreColor(), TabId (+63 more)

### Community 80 - "next.config.ts"
Cohesion: 0.40
Nodes (4): csp, nextConfig, securityHeaders, supabaseOrigins

### Community 81 - "restaurants/page.tsx"
Cohesion: 0.08
Nodes (35): RFC-4180, EmailsRedirect(), Analysis, ImportPage(), parseCoordinate(), ParsedRow, Phase, RowStatus (+27 more)

### Community 82 - "stage.tsx"
Cohesion: 0.16
Nodes (15): CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView(), TIMELINE, TrackingView(), useNow() (+7 more)

### Community 83 - "gestion/api.ts"
Cohesion: 0.08
Nodes (57): CategoryManager(), apply(), assertTransition(), assignTable(), createCategory(), createFormule(), createItem(), createPriceRule() (+49 more)

### Community 84 - "clip/store.ts"
Cohesion: 0.23
Nodes (14): POSTS_PAGE_SIZE, ClipDataProvider(), fetchApi(), getClientSnapshot(), getErrorSnapshot(), getServerSnapshot(), listeners, load() (+6 more)

### Community 85 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+4 more)

### Community 86 - "gestion/menu/page.tsx"
Cohesion: 0.10
Nodes (44): View, ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft() (+36 more)

### Community 87 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, eslint-config-next, supabase, tailwindcss, @tailwindcss/postcss, tsx, @types/node (+5 more)

### Community 89 - "shared.ts"
Cohesion: 0.18
Nodes (14): GET(), metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), demoSection, CartChoice, collectDemoHref() (+6 more)

### Community 90 - "createClient"
Cohesion: 0.06
Nodes (61): SignOutButton(), MenuPage(), isoAt(), ShiftModal(), timeInput(), approveOutreachEmail(), promoteVariant(), updateImportantNotes() (+53 more)

### Community 91 - "public-menu.ts"
Cohesion: 0.36
Nodes (7): ConfirmationPage(), metadata, assembleCategories(), applyTarifs(), fetchActiveTarifs(), Tarif, fetchRestaurant()

### Community 92 - "push/server.ts"
Cohesion: 0.11
Nodes (24): CallBody, POST(), POST(), POST(), CallServerButton(), CallState, CALL_THROTTLE_MS, DispatchBody (+16 more)

### Community 93 - "section-heading.tsx"
Cohesion: 0.33
Nodes (6): CollectComparison(), CostBar(), euros(), SectionHeading(), comparisonSection, faqSection

### Community 94 - "ui.tsx"
Cohesion: 0.08
Nodes (41): AccountConversationPage(), metadata, metadata, TrackingPage(), AlertIcon(), InfoIcon(), SearchIcon(), LoginForm() (+33 more)

### Community 95 - "admin/format.ts"
Cohesion: 0.15
Nodes (29): ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, TachesPage(), PlusIcon() (+21 more)

### Community 96 - "settings.tsx"
Cohesion: 0.07
Nodes (38): ShopSettingsPage(), generateMetadata(), ShopLayout(), ProductActiveToggle(), Section, StripePanel(), SubscriptionPanel(), ThemeEditor() (+30 more)

### Community 97 - "setup-stripe.ts"
Cohesion: 0.25
Nodes (6): shopOffer, Plan, plans, shopPlans, stripe, zeroPriced

### Community 98 - "clip/constants.ts"
Cohesion: 0.23
Nodes (9): PlatformBadge(), PostCard(), STATUS_CLASSES, PLATFORM_LABELS, POLL_INTERVAL_MS, POLL_TIMEOUT_MS, STATUS_LABELS, PlatformResult (+1 more)

### Community 99 - "react"
Cohesion: 0.16
Nodes (25): EtablissementForm(), NoteComposer, FollowUpChoice, DUPLICATE_REASON_LABELS, AdminLockButton(), CollectSettings(), ProfileRow(), TabletSettings() (+17 more)

### Community 100 - "order-confirmation.tsx"
Cohesion: 0.43
Nodes (6): isTerminal(), OrderConfirmation(), STATUS_COPY, COLLECT_ORDER_POLL_MS, collectHref(), mapsDirectionsHref()

### Community 101 - "m/[slug]/page.tsx"
Cohesion: 0.18
Nodes (9): generateMetadata(), getRestaurant, MenuPage(), revalidate, Hero(), PARTICLES, LANGUAGES, MenuFooter() (+1 more)

### Community 102 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): Important notes, /new-restaurant, Phase 1 — Intake, Phase 2 — Research, Phase 3 — Verify with user, Phase 4 — Build the demo profile, Phase 5 — Summary, Updating an existing profile (+1 more)

### Community 103 - "provider/types.ts"
Cohesion: 0.07
Nodes (29): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, CreationComptesPage(), ComptesPage() (+21 more)

### Community 104 - "restaurant-pane.tsx"
Cohesion: 0.24
Nodes (7): OrderCardDemo(), RestaurantPane(), STATUS_CLASSES, StatusBadge(), COLLECT_ETA_CHOICES_MIN, ORDER_STATUS_LABELS, OrderStatus

### Community 105 - "add-to-order.tsx"
Cohesion: 0.36
Nodes (8): AddToOrder(), choiceRowClass(), isUnavailable(), OptionsModal(), CategoryLink, CategoryNav(), cartLineKey(), useCart()

### Community 106 - "qr-showcase.tsx"
Cohesion: 0.40
Nodes (4): QrLive(), QrShowcase(), qrShowcase, qrcode

### Community 107 - "rowToOrder"
Cohesion: 0.40
Nodes (6): replaceOrder(), updateOrderPayment(), voidPayment(), rowToOrder(), fetchOrderHistory(), fetchPaidOrders()

### Community 110 - "tickets.py"
Cohesion: 0.36
Nodes (11): _group_by_category(), _line(), _local(), datetime, Tickets rendus en ESC/POS. Omilink envoie ces octets tels quels à l'imprimante…, Group items by category name, sorted by category position., _render_items(), render_job() (+3 more)

### Community 113 - "desinscription/route.ts"
Cohesion: 0.31
Nodes (10): RFC-8058, confirmFormHtml(), DONE_HTML, GET(), LEAD_DEMOTABLE_FROM, PAGE_SHELL(), params(), POST() (+2 more)

### Community 116 - "captions/route.ts"
Cohesion: 0.60
Nodes (4): POST(), CAPTION_CONTEXT_MAX_CHARS, captionsSchema(), generateCaptions()

### Community 121 - "use-order-chime.ts"
Cohesion: 0.16
Nodes (18): metadata, ChimeCard(), GestionShell(), isActive(), signOut(), CHIME_STORAGE_KEY, awaitsOnlinePayment(), armedListeners (+10 more)

### Community 123 - "filter-bar.tsx"
Cohesion: 0.12
Nodes (31): CartePage(), FilterBar(), toggleInSet(), CrosshairIcon(), GEOLOCATION_TIMEOUT_MS, NO_CONTACT_OPTIONS, appointmentIds(), countActiveFilters() (+23 more)

### Community 125 - "orders.ts"
Cohesion: 0.12
Nodes (40): POST(), Body, POST(), STATUS_MESSAGES, POST(), POST(), ORDER_STATUS_FLOW, base64url() (+32 more)

### Community 145 - "shop/constants.ts"
Cohesion: 0.08
Nodes (45): ShopCustomersPage(), ShopOrderPage(), FILTERS, ShopMessagesPage(), ShopDashboardPage(), metadata, PackingSlipPage(), metadata (+37 more)

### Community 146 - "get_supabase"
Cohesion: 0.15
Nodes (11): get_supabase(), Client, BaseSettings, Settings, daily_cold_count(), Cold emails already sent today, Paris time (the cap's clock)., execute(), Overlap guard: one run per job at a time. Returns the new run id, or None if a… (+3 more)

### Community 147 - "services/inbox.py"
Cohesion: 0.09
Nodes (41): archive_to_label(), ensure_label(), extract_body_text(), decode(), walk(), extract_headers(), get_message(), list_inbox() (+33 more)

### Community 148 - "landing/sections.tsx"
Cohesion: 0.12
Nodes (27): metadata, ShopNav(), ShopAudiences(), ShopContact(), ShopFaq(), ShopFeatures(), ShopFooter(), ShopHero() (+19 more)

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

### Community 167 - "next"
Cohesion: 0.07
Nodes (62): POST(), AboutPage(), metadata, revalidate, CatalogPage(), generateMetadata(), revalidate, ConfirmationPage() (+54 more)

### Community 171 - "portal-data.ts"
Cohesion: 0.12
Nodes (28): metadata, ContactForm(), PortalFooter(), LanguageToggle(), PortalNav(), SurMesure(), brand, buildLabel (+20 more)

### Community 172 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 178 - "app/layout.tsx"
Cohesion: 0.13
Nodes (14): fraunces, instrumentSans, metadata, viewport, MENU_PATHS, Providers(), Choice, CookieConsent() (+6 more)

### Community 179 - "validation.ts"
Cohesion: 0.27
Nodes (15): POST(), AddressInput, CheckoutItemInput, ContactInput, fail(), optionalText(), parseAddress(), parseCheckout() (+7 more)

### Community 182 - "seed-shop.ts"
Cohesion: 0.10
Nodes (24): metadata, ShopLoginForm(), PHONE_LOGIN_DOMAIN, loginEmailFor(), looksLikePhone(), normalizePhone(), phoneToLoginEmail(), CATEGORIES (+16 more)

### Community 183 - "menu/cart.tsx"
Cohesion: 0.18
Nodes (18): CLICK_FLUSH_MS, HEARTBEAT_MS, ITEM_CLICK_RETENTION_DAYS, MenuStage, SESSION_RETENTION_DAYS, STAGE_RANK, createTracker(), MenuTracker (+10 more)

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
- **698 isolated node(s):** `backend`, `$schema`, `slug`, `name`, `tagline` (+693 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 956 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `useGestionAccess`, `gestion/selectors.ts`, `checkout-form.tsx`, `admin/store.ts`, `clip/context.tsx`, `menu/gestion/produits/page.tsx`, `shop/server.ts`, `clip/demo/data.ts`, `metrics.ts`, `api/contact/route.ts`, `menu-data.ts`, `shop/types.ts`, `admin/api.ts`, `managers.tsx`, `app/page.tsx`, `terminaux/page.tsx`, `auth-form.tsx`, `gestion/store.ts`, `supabase/client.ts`, `cart-bar.tsx`, `portal-data.ts`, `clients.ts`, `app/layout.tsx`, `seed-shop.ts`, `menu/cart.tsx`, `package.json`, `add-to-cart-form.tsx`, `collect/demo/provider.tsx`, `temps.ts`, `notifications/page.tsx`, `lead-panel.tsx`, `encaisser-card.tsx`, `clip/demo-showcase.tsx`, `collect/checkout/route.ts`, `payment-settings.tsx`, `admin/constants.ts`, `restaurants/page.tsx`, `stage.tsx`, `clip/store.ts`, `gestion/menu/page.tsx`, `shared.ts`, `push/server.ts`, `section-heading.tsx`, `ui.tsx`, `admin/format.ts`, `settings.tsx`, `clip/constants.ts`, `order-confirmation.tsx`, `m/[slug]/page.tsx`, `provider/types.ts`, `restaurant-pane.tsx`, `add-to-order.tsx`, `qr-showcase.tsx`, `use-order-chime.ts`, `filter-bar.tsx`?**
  _High betweenness centrality (0.252) - this node is a cross-community bridge._
- **Why does `createClient()` connect `createClient` to `admin/store.ts`, `menu/gestion/produits/page.tsx`, `shop/icons.tsx`, `metrics.ts`, `menu-data.ts`, `admin/api.ts`, `terminaux/page.tsx`, `auth-form.tsx`, `gestion/store.ts`, `supabase/client.ts`, `cart-bar.tsx`, `clients.ts`, `seed-shop.ts`, `temps.ts`, `components/gestion/shell.tsx`, `notifications/page.tsx`, `lead-panel.tsx`, `payment-settings.tsx`, `gestion/api.ts`, `clip/store.ts`, `gestion/menu/page.tsx`, `ui.tsx`, `admin/format.ts`, `rowToOrder`, `use-order-chime.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `createAdminClient` to `settings.tsx`, `admin.ts`, `checkout-form.tsx`, `next`, `invite/route.ts`, `square/server.ts`, `sumup/server.ts`, `collect/checkout/route.ts`, `getStripe`, `shop/server.ts`, `desinscription/route.ts`, `validation.ts`, `api/contact/route.ts`, `shared.ts`, `push/server.ts`, `orders.ts`, `ui.tsx`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `backend`, `$schema`, `slug` to the rest of the system?**
  _698 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0824524312896406 - nodes in this community are weakly interconnected._
- **Should `gestion/constants.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.080338266384778 - nodes in this community are weakly interconnected._
- **Should `collect-landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0786308973172988 - nodes in this community are weakly interconnected._
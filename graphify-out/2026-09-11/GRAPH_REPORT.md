# Graph Report - ominin  (2026-09-11)

## Corpus Check
- 616 files · ~1,670,496 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3389 nodes · 10056 edges · 143 communities (122 shown, 13 thin omitted)
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
- database.types.ts
- Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)
- notifications/page.tsx
- import/page.tsx
- espace/comptes/creation/page.tsx
- shop/icons.tsx
- admin.ts
- boho/profile.json
- proxy.ts
- app/page.tsx
- admin/api.ts
- auth-form.tsx
- seed-crm.ts
- Setup guide (written for an LLM agent)
- Ominin
- m/[slug]/page.tsx
- What you must do when invoked
- settings.tsx
- graphify reference: extra exports and benchmark
- push/server.ts
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
- clip/store.ts
- postcss.config.mjs
- backend
- add-to-cart-form.tsx
- _template/profile.json
- react
- temps.ts
- gestion/icons.tsx
- add-to-order.tsx
- lead-panel.tsx
- menu-data.ts
- espace/shell.tsx
- shop/constants.ts
- services/autoresearch.py
- carte/page.tsx
- Bridge
- shared.ts
- payment-settings.tsx
- admin/constants.ts
- cart-bar.tsx
- collect/checkout/route.ts
- stage.tsx
- gestion/api.ts
- prefs.ts
- dependencies
- gestion/photo.ts
- devDependencies
- dispatchCallServer
- check
- createClient
- invite/route.ts
- admin/format.ts
- managers.tsx
- shop/connexion/page.tsx
- What you must do when invoked
- filter-bar.tsx
- encaisser-card.tsx
- tickets.py
- desinscription/route.ts
- provider/types.ts
- components/gestion/shell.tsx
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
- `FindingsCard()` --calls--> `formatDayTime()`  [EXTRACTED]
  frontend/app/admin/(shell)/lea/page.tsx → frontend/lib/admin/format.ts
- `GET()` --calls--> `createAdminClient()`  [EXTRACTED]
  frontend/app/api/collect/order/route.ts → frontend/lib/supabase/admin.ts
- `Body` --references--> `ShopOrderStatus`  [EXTRACTED]
  frontend/app/api/shop/gestion/orders/route.ts → frontend/lib/shop/types.ts
- `GET()` --calls--> `createClient()`  [EXTRACTED]
  frontend/app/auth/callback/route.ts → frontend/lib/supabase/server.ts
- `AnalytiquePage()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/analytique/page.tsx → frontend/lib/clip/context.tsx

## Import Cycles
- None detected.

## Communities (143 total, 13 thin omitted)

### Community 0 - "equipe/page.tsx"
Cohesion: 0.11
Nodes (34): BadgeagePage(), CommandesPage(), dedupeById(), EMPTY_BODIES, matchesFilter(), EquipePage(), PANE_TAGLINES, PaneId (+26 more)

### Community 1 - "clip/server.ts"
Cohesion: 0.20
Nodes (17): GET(), GET(), POST(), GET(), POST(), GET(), POST(), POST() (+9 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.07
Nodes (39): metadata, DemoShowcase(), Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter() (+31 more)

### Community 3 - "gestion/constants.ts"
Cohesion: 0.05
Nodes (69): CapacitesPage(), openViews(), OnboardingForm(), slugify(), metadata, OnboardingPage(), StaffPending(), Capabilities() (+61 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.07
Nodes (34): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter() (+26 more)

### Community 5 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, dev, lint, prebuild, predev, seed:crm, seed:demo (+5 more)

### Community 6 - "gestion/selectors.ts"
Cohesion: 0.08
Nodes (45): ApercuPage(), Period, RevenueChart(), TopVentesChart(), DayGroup, dedupeById(), displayMode(), groupByDay() (+37 more)

### Community 7 - "createAdminClient"
Cohesion: 0.13
Nodes (16): GET(), EXTENSIONS, POST(), POST(), DELETE(), GET(), POST(), requireUser() (+8 more)

### Community 8 - "admin/store.ts"
Cohesion: 0.13
Nodes (27): metadata, AdminShell(), isActive(), sectionOf(), signOut(), adminLoginPath(), rowToAppointment(), rowToLeadLite() (+19 more)

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
Cohesion: 0.14
Nodes (22): CollectSignupForm(), slugify(), ProduitsPage(), CheckIcon(), ExternalLinkIcon(), SubscriptionGate(), cardClass, DiscoverLink() (+14 more)

### Community 13 - "shop/types.ts"
Cohesion: 0.06
Nodes (37): metadata, LegalPage(), PAGES, PrintButton(), ChevronDownIcon(), FaqAccordion(), ORDER, OrderItemsList() (+29 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "ui.tsx"
Cohesion: 0.09
Nodes (37): metadata, metadata, TrackingPage(), AlertIcon(), InfoIcon(), SearchIcon(), CheckoutFormProps, CustomerReplyForm() (+29 more)

### Community 16 - "clip/demo/data.ts"
Cohesion: 0.11
Nodes (25): metadata, DemoBanner(), emptySubscribe(), ClipData, ClipDataContext, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics() (+17 more)

### Community 17 - "clip-landing-data.ts"
Cohesion: 0.07
Nodes (34): metadata, ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter() (+26 more)

### Community 18 - "metrics.ts"
Cohesion: 0.08
Nodes (47): ActivitePage(), load(), ClientsPage(), PERIOD_TABS, ClientDetail(), isView(), PERIOD_TABS, BarPoint (+39 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "upload-post.ts"
Cohesion: 0.12
Nodes (16): PROVIDER_API_URL, PROVIDER_TIMEOUT_MS, providerApiKey(), PostStatus, PostSubmission, CAPTION_FIELDS, ClipProvider, ensureProfile() (+8 more)

### Community 21 - "api/contact/route.ts"
Cohesion: 0.16
Nodes (18): invalid(), isContactSource(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, LeadFormCopy (+10 more)

### Community 22 - "database.types.ts"
Cohesion: 0.14
Nodes (17): SEED_TABLE_COUNT, CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, TablesInsert (+9 more)

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "notifications/page.tsx"
Cohesion: 0.21
Nodes (19): DevicesCard(), DeviceStatusCard(), IOS_STEPS, NotificationsPage(), currentEndpoint(), deviceLabel(), DeviceSubscription, disablePush() (+11 more)

### Community 25 - "import/page.tsx"
Cohesion: 0.10
Nodes (23): RFC-4180, Analysis, ImportPage(), parseCoordinate(), ParsedRow, Phase, RowStatus, STATUS_META (+15 more)

### Community 26 - "espace/comptes/creation/page.tsx"
Cohesion: 0.06
Nodes (18): CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, ComptesPage(), GenerateurPage(), MOMENTS (+10 more)

### Community 27 - "shop/icons.tsx"
Cohesion: 0.07
Nodes (36): AccountPage(), metadata, SignOutButton(), metadata, ImageUploader(), UploadedImage, isActive(), NAV_ITEMS (+28 more)

### Community 28 - "admin.ts"
Cohesion: 0.10
Nodes (34): POST(), EXTENSIONS, POST(), GET(), POST(), isTerminal(), POST(), isTerminal() (+26 more)

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
Nodes (76): ActivityInput, addActivity(), apply(), AppointmentInput, byDue(), completeTask(), createAppointment(), createTask() (+68 more)

### Community 34 - "auth-form.tsx"
Cohesion: 0.08
Nodes (16): metadata, metadata, metadata, metadata, metadata, metadata, InscriptionTabs(), Profile (+8 more)

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
Cohesion: 0.15
Nodes (10): generateMetadata(), getRestaurant, MenuPage(), revalidate, Hero(), PARTICLES, LANGUAGES, MenuFooter() (+2 more)

### Community 39 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): /commit, Execution requirement, Step 1 — Understand what changed, Step 2 — Project upkeep (required before every push), Step 3 — Safety checks, Step 4 — Write the commit message, Step 5 — Commit and push, Step 6 — Report back (+1 more)

### Community 40 - "settings.tsx"
Cohesion: 0.11
Nodes (22): ShopSettingsPage(), ShopLayout(), ProductActiveToggle(), Section, StripePanel(), SubscriptionPanel(), ThemeEditor(), CheckCircleIcon() (+14 more)

### Community 41 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 42 - "push/server.ts"
Cohesion: 0.13
Nodes (19): POST(), CallServerButton(), CallState, CALL_THROTTLE_MS, DispatchBody, PUSH_EVENT_HINTS, PUSH_EVENT_LABELS, PUSH_EVENTS (+11 more)

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

### Community 58 - "clip/store.ts"
Cohesion: 0.19
Nodes (17): ClipEspaceLayout(), metadata, POSTS_PAGE_SIZE, ClipDataProvider(), commit(), fetchApi(), getClientSnapshot(), getErrorSnapshot() (+9 more)

### Community 63 - "add-to-cart-form.tsx"
Cohesion: 0.06
Nodes (48): allura, cormorant, dmSans, dmSerif, FONT_VARIABLES, generateMetadata(), inter, montserrat (+40 more)

### Community 64 - "_template/profile.json"
Cohesion: 0.06
Nodes (30): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+22 more)

### Community 65 - "react"
Cohesion: 0.08
Nodes (53): EtablissementForm(), RESERVED_SLUGS, NoteComposer, FollowUpChoice, AppointmentFormModal(), RestaurantPicker(), DUPLICATE_REASON_LABELS, TaskFormModal() (+45 more)

### Community 67 - "temps.ts"
Cohesion: 0.10
Nodes (48): metadata, PlanningPage(), PlanningPayload, BadgeagesLog(), CorrectionModal(), localInput(), Action, ACTION_LABELS (+40 more)

### Community 68 - "gestion/icons.tsx"
Cohesion: 0.11
Nodes (14): ApercuIcon(), BellIcon(), ChevronDownIcon(), ClockIcon(), CommandesIcon(), GearIcon(), LockIcon(), MenuIcon() (+6 more)

### Community 69 - "add-to-order.tsx"
Cohesion: 0.36
Nodes (8): AddToOrder(), choiceRowClass(), isUnavailable(), OptionsModal(), CategoryLink, CategoryNav(), cartLineKey(), useCart()

### Community 70 - "lead-panel.tsx"
Cohesion: 0.09
Nodes (35): ArrowRightIcon(), BotIcon(), CalendarIcon(), ChartIcon(), ClockIcon(), CrosshairIcon(), FilterIcon(), GlobeIcon() (+27 more)

### Community 71 - "menu-data.ts"
Cohesion: 0.06
Nodes (43): CartLine, cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), lineKey(), lineUnitPrice(), OptionsDialog() (+35 more)

### Community 72 - "espace/shell.tsx"
Cohesion: 0.07
Nodes (30): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, NavItem, Dropzone() (+22 more)

### Community 73 - "shop/constants.ts"
Cohesion: 0.15
Nodes (12): ShippingDraft, BADGE_LABELS, DASHBOARD_CHART_DAYS, DASHBOARD_KPI_DAYS, LOW_STOCK_THRESHOLD, ORDERS_PAGE_SIZE, PAYMENT_STATUS_LABELS, PHOTO_MAX_WIDTH (+4 more)

### Community 74 - "services/autoresearch.py"
Cohesion: 0.13
Nodes (25): _credentials_env(), _parse(), parse_structured(), The Agent SDK spawns a Claude Code subprocess that authenticates from the…, Single-turn, tool-less Claude call returning schema-validated output. Sync on…, AnalysisFindings, ProposedVariant, ProspectScore (+17 more)

### Community 75 - "carte/page.tsx"
Cohesion: 0.24
Nodes (15): CartePage(), MapCanvas, VisitedFlow(), GEOLOCATION_TIMEOUT_MS, capturePosition(), getSnapshot(), isWatching(), listeners (+7 more)

### Community 76 - "Bridge"
Cohesion: 0.13
Nodes (13): BaseSettings, Settings, Bridge, ensure_token(), main(), Client, Boucle Omilink. Un boîtier neuf génère son jeton, n'en confie que l'empreinte…, Hôtes du réseau local répondant sur le port des imprimantes. (+5 more)

### Community 77 - "shared.ts"
Cohesion: 0.12
Nodes (23): GET(), metadata, ConfirmationPage(), metadata, BackToLandingLink(), CollectDemoStage(), CollectDemoShowcase(), isTerminal() (+15 more)

### Community 78 - "payment-settings.tsx"
Cohesion: 0.23
Nodes (11): NO_SQUARE, NO_STRIPE, PaymentSettings(), Provider, readStatus(), SquareLocation, SquareStatus, StripeStatus (+3 more)

### Community 79 - "admin/constants.ts"
Cohesion: 0.05
Nodes (53): FindingsCard(), hostOf(), percent(), PROSPECT_TILES, ProspectsPanel(), scoreColor(), TabId, VARIANT_ORDER (+45 more)

### Community 80 - "cart-bar.tsx"
Cohesion: 0.14
Nodes (15): PaymentChoice, SubmitState, TIP_PERCENTS, TipChoice, loadSdk(), PaymentState, SquareCard, SquarePayment() (+7 more)

### Community 81 - "collect/checkout/route.ts"
Cohesion: 0.24
Nodes (10): POST(), ResolvedLine, resolveOptions(), CollectPage(), generateMetadata(), getPage, revalidate, isCollectActive() (+2 more)

### Community 82 - "stage.tsx"
Cohesion: 0.06
Nodes (34): ClientDemoPage(), generateMetadata(), CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView(), TIMELINE (+26 more)

### Community 83 - "gestion/api.ts"
Cohesion: 0.09
Nodes (50): MenuPage(), CategoryManager(), apply(), assertTransition(), assignTable(), createCategory(), createFormule(), createItem() (+42 more)

### Community 84 - "prefs.ts"
Cohesion: 0.53
Nodes (5): PrefsCard(), loadPrefs(), PrefValues, requireUser(), savePrefs()

### Community 85 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+4 more)

### Community 86 - "gestion/photo.ts"
Cohesion: 0.50
Nodes (4): compressPhoto(), PHOTO_JPEG_QUALITY, PHOTO_MAX_EDGE, uploadPhoto()

### Community 87 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx, @types/node, @types/qrcode (+4 more)

### Community 88 - "dispatchCallServer"
Cohesion: 0.67
Nodes (3): CallBody, POST(), dispatchCallServer()

### Community 90 - "check"
Cohesion: 0.06
Nodes (44): isoAt(), ShiftModal(), timeInput(), updateImportantNotes(), clockOut(), correctEntry(), createShift(), deleteShift() (+36 more)

### Community 91 - "createClient"
Cohesion: 0.11
Nodes (38): LeaPage(), SignOutButton(), CreateRestaurantModal(), CartBar(), approveOutreachEmail(), availableSlug(), createRestaurant(), fetchAppointments() (+30 more)

### Community 92 - "invite/route.ts"
Cohesion: 0.31
Nodes (11): RFC-2047, POST(), Role, accessToken(), card(), escapeHtml(), mailConfig(), ROLE_LABELS (+3 more)

### Community 95 - "admin/format.ts"
Cohesion: 0.18
Nodes (25): ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, TachesPage(), PlusIcon() (+17 more)

### Community 96 - "managers.tsx"
Cohesion: 0.08
Nodes (63): ShopCustomersPage(), ShopDiscountsPage(), ShopOrderPage(), FILTERS, ShopContentPage(), ShopConversationPage(), ShopMessagesPage(), OptionGroupPage() (+55 more)

### Community 102 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): Important notes, /new-restaurant, Phase 1 — Intake, Phase 2 — Research, Phase 3 — Verify with user, Phase 4 — Build the demo profile, Phase 5 — Summary, Updating an existing profile (+1 more)

### Community 105 - "filter-bar.tsx"
Cohesion: 0.19
Nodes (18): FilterBar(), toggleInSet(), NO_CONTACT_OPTIONS, appointmentIds(), countActiveFilters(), filterLeads(), filters, listeners (+10 more)

### Community 109 - "encaisser-card.tsx"
Cohesion: 0.09
Nodes (33): OrderCardDemo(), EncaisserCard(), EncaisserPanel(), sumLines(), sumUnits(), toSelection(), Unit, unitsOf() (+25 more)

### Community 110 - "tickets.py"
Cohesion: 0.36
Nodes (11): _group_by_category(), _line(), _local(), datetime, Tickets rendus en ESC/POS. Omilink envoie ces octets tels quels à l'imprimante…, Group items by category name, sorted by category position., _render_items(), render_job() (+3 more)

### Community 113 - "desinscription/route.ts"
Cohesion: 0.31
Nodes (10): RFC-8058, confirmFormHtml(), DONE_HTML, GET(), LEAD_DEMOTABLE_FROM, PAGE_SHELL(), params(), POST() (+2 more)

### Community 116 - "provider/types.ts"
Cohesion: 0.12
Nodes (20): POST(), PublierPage(), PublicationsPage(), CaptionEditor(), PlatformBadge(), PostCard(), STATUS_CLASSES, CAPTION_CONTEXT_MAX_CHARS (+12 more)

### Community 121 - "components/gestion/shell.tsx"
Cohesion: 0.15
Nodes (20): metadata, ChimeCard(), GestionShell(), isActive(), LoadError(), NAV_ITEMS, PRODUITS_ITEM, signOut() (+12 more)

### Community 123 - "restaurants/page.tsx"
Cohesion: 0.09
Nodes (34): EmailsRedirect(), EmailTable(), COLUMNS, exportColumns(), RestaurantsPage(), MapLeadCard(), StatusMenu(), ALL_COLUMNS (+26 more)

### Community 125 - "orders.ts"
Cohesion: 0.13
Nodes (39): POST(), Body, POST(), STATUS_MESSAGES, POST(), POST(), ORDER_STATUS_FLOW, base64url() (+31 more)

### Community 145 - "shop/server.ts"
Cohesion: 0.10
Nodes (36): ShopOrdersPage(), metadata, ShopGestionLayout(), ShopShippingPage(), PackingSlipPage(), CreateShopPage(), metadata, CheckoutPage() (+28 more)

### Community 146 - "get_supabase"
Cohesion: 0.15
Nodes (11): get_supabase(), Client, BaseSettings, Settings, daily_cold_count(), Cold emails already sent today, Paris time (the cap's clock)., execute(), Overlap guard: one run per job at a time. Returns the new run id, or None if a… (+3 more)

### Community 147 - "services/inbox.py"
Cohesion: 0.09
Nodes (41): archive_to_label(), ensure_label(), extract_body_text(), decode(), walk(), extract_headers(), get_message(), list_inbox() (+33 more)

### Community 148 - "landing/sections.tsx"
Cohesion: 0.08
Nodes (35): metadata, ShopNav(), ShopAudiences(), ShopContact(), ShopFaq(), ShopFeatures(), ShopFooter(), ShopHero() (+27 more)

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
Nodes (37): BADGE, DeviceCard(), DOT_CLASS, Editing, Health, LinkState, PrinterCard(), printerHealth() (+29 more)

### Community 161 - "omilink.py"
Cohesion: 0.15
Nodes (20): Device, Authentifie un appareil Omilink par l'empreinte SHA-256 de son jeton., require_device(), require_trigger_secret(), _apply_routing(), _build_routing(), enroll(), EnrollRequest (+12 more)

### Community 167 - "next"
Cohesion: 0.07
Nodes (65): AboutPage(), metadata, revalidate, CatalogPage(), generateMetadata(), revalidate, ConfirmationPage(), metadata (+57 more)

### Community 171 - "portal-data.ts"
Cohesion: 0.16
Nodes (17): metadata, LeadForm(), ContactForm(), PortalFooter(), LanguageToggle(), PortalNav(), SurMesure(), brand (+9 more)

### Community 172 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native AGENTS.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 178 - "app/layout.tsx"
Cohesion: 0.13
Nodes (14): fraunces, instrumentSans, metadata, viewport, MENU_PATHS, Providers(), Choice, CookieConsent() (+6 more)

### Community 179 - "shop/checkout.ts"
Cohesion: 0.10
Nodes (35): POST(), POST(), POST(), CheckoutFormInner(), absoluteImage(), Admin, createCheckoutSession(), PricedItem (+27 more)

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

### Community 188 - "gestion/store.ts"
Cohesion: 0.13
Nodes (32): read(), subscribe(), useAdminUnlocked(), assembleCategories(), OrderRow, rowToEtablissement(), rowToFormule(), rowToMember() (+24 more)

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
Cohesion: 0.17
Nodes (11): 0. MyBox : photos, accueil, personnalisation (2026-09-11, branche `ShopMyBox`), 1. Étapes du service et équipe sans comptes (2026-09-10), 2. Capacités par restaurant et gestes de salle (2026-09-10), 3. Square, deuxième encaisseur du menu QR (2026-09-09), 4. Analytique du menu QR et tableau de bord client (2026-09-11), 5. Commission des boutiques : poser le taux (2026-09-09), 6. Tablette de salle et serveurs sans compte (2026-09-09), 7. Identité des boutiques : icône et aperçu de partage (2026-09-09) (+3 more)

## Knowledge Gaps
- **683 isolated node(s):** `backend`, `$schema`, `slug`, `name`, `tagline` (+678 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 940 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `equipe/page.tsx`, `landing-data.ts`, `gestion/constants.ts`, `collect-landing-data.ts`, `gestion/selectors.ts`, `admin/store.ts`, `clip/context.tsx`, `menu/gestion/produits/page.tsx`, `shop/types.ts`, `ui.tsx`, `clip/demo/data.ts`, `clip-landing-data.ts`, `metrics.ts`, `shop/server.ts`, `api/contact/route.ts`, `notifications/page.tsx`, `import/page.tsx`, `espace/comptes/creation/page.tsx`, `shop/icons.tsx`, `app/page.tsx`, `terminaux/page.tsx`, `admin/api.ts`, `auth-form.tsx`, `m/[slug]/page.tsx`, `next`, `settings.tsx`, `push/server.ts`, `app/layout.tsx`, `menu/cart.tsx`, `language.tsx`, `package.json`, `clip/store.ts`, `gestion/store.ts`, `add-to-cart-form.tsx`, `temps.ts`, `gestion/icons.tsx`, `add-to-order.tsx`, `lead-panel.tsx`, `menu-data.ts`, `espace/shell.tsx`, `carte/page.tsx`, `shared.ts`, `payment-settings.tsx`, `admin/constants.ts`, `cart-bar.tsx`, `collect/checkout/route.ts`, `stage.tsx`, `admin/format.ts`, `managers.tsx`, `filter-bar.tsx`, `encaisser-card.tsx`, `provider/types.ts`, `components/gestion/shell.tsx`, `restaurants/page.tsx`?**
  _High betweenness centrality (0.251) - this node is a cross-community bridge._
- **Why does `createClient()` connect `createClient` to `equipe/page.tsx`, `gestion/constants.ts`, `createAdminClient`, `admin/store.ts`, `menu/gestion/produits/page.tsx`, `ui.tsx`, `metrics.ts`, `import/page.tsx`, `shop/icons.tsx`, `admin/api.ts`, `terminaux/page.tsx`, `auth-form.tsx`, `clip/store.ts`, `gestion/store.ts`, `add-to-cart-form.tsx`, `react`, `temps.ts`, `lead-panel.tsx`, `menu-data.ts`, `espace/shell.tsx`, `payment-settings.tsx`, `cart-bar.tsx`, `gestion/api.ts`, `prefs.ts`, `check`, `admin/format.ts`, `shop/connexion/page.tsx`, `components/gestion/shell.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `createAdminClient` to `clip/server.ts`, `next`, `settings.tsx`, `sumup/server.ts`, `square/server.ts`, `push/server.ts`, `shared.ts`, `admin.ts`, `ui.tsx`, `collect/checkout/route.ts`, `desinscription/route.ts`, `shop/checkout.ts`, `shop/server.ts`, `api/contact/route.ts`, `dispatchCallServer`, `invite/route.ts`, `orders.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `backend`, `$schema`, `slug` to the rest of the system?**
  _683 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `equipe/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11400966183574879 - nodes in this community are weakly interconnected._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06818181818181818 - nodes in this community are weakly interconnected._
- **Should `gestion/constants.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05225576111652061 - nodes in this community are weakly interconnected._
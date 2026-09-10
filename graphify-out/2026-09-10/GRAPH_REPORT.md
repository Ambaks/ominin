# Graph Report - ominin  (2026-09-10)

## Corpus Check
- 607 files · ~1,677,740 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3319 nodes · 9829 edges · 153 communities (133 shown, 12 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 191 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a7d7906e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- equipe/page.tsx
- clip/server.ts
- landing-data.ts
- gestion/store.ts
- collect-landing-data.ts
- scripts
- gestion/selectors.ts
- react
- admin/store.ts
- sumup/server.ts
- square/server.ts
- clip/context.tsx
- menu/gestion/produits/page.tsx
- stage.tsx
- What You Must Do When Invoked
- ui.tsx
- clip/demo/data.ts
- clip-landing-data.ts
- metrics.ts
- compilerOptions
- upload-post.ts
- api/contact/route.ts
- seed-crm.ts
- Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)
- notifications/page.tsx
- gestion/constants.ts
- espace/comptes/creation/page.tsx
- commande/page.tsx
- createAdminClient
- boho/profile.json
- proxy.ts
- app/page.tsx
- menu-data.ts
- auth-form.tsx
- shared.ts
- Setup guide (written for an LLM agent)
- Ominin
- m/[slug]/page.tsx
- What you must do when invoked
- admin/api.ts
- graphify reference: extra exports and benchmark
- createClient
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
- database.types.ts
- postcss.config.mjs
- backend
- [slug]/layout.tsx
- _template/profile.json
- item-form-modal.tsx
- temps.ts
- field.tsx
- shop/types.ts
- lead-panel.tsx
- lea/page.tsx
- espace/shell.tsx
- gestion/menu/page.tsx
- services/autoresearch.py
- espace/generateur/page.tsx
- Bridge
- collect/landing/demo-showcase.tsx
- collect/checkout/route.ts
- admin/constants.ts
- cart-bar.tsx
- use-order-chime.ts
- collect/demo/provider.tsx
- gestion/api.ts
- portal-data.ts
- dependencies
- shop/icons.tsx
- devDependencies
- clip/demo-showcase.tsx
- add-to-order.tsx
- check
- useAdmin
- dish-card.tsx
- setup-stripe.ts
- provider/types.ts
- admin/format.ts
- managers.tsx
- [token]/page.tsx
- public-menu.ts
- settings.tsx
- gestion/photo.ts
- portal/hero.tsx
- What you must do when invoked
- push/server.ts
- filter-bar.tsx
- espace/analytique/page.tsx
- formatPrice
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
- payment-settings.tsx
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
- `CreationComptesPage()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/comptes/creation/page.tsx → frontend/lib/clip/context.tsx
- `GenerateurPage()` --calls--> `useClipData()`  [EXTRACTED]
  frontend/app/clip/espace/generateur/page.tsx → frontend/lib/clip/context.tsx

## Import Cycles
- None detected.

## Communities (153 total, 12 thin omitted)

### Community 0 - "equipe/page.tsx"
Cohesion: 0.12
Nodes (32): BadgeagePage(), CommandesPage(), dedupeById(), EMPTY_BODIES, matchesFilter(), EquipePage(), PANE_TAGLINES, PaneId (+24 more)

### Community 1 - "clip/server.ts"
Cohesion: 0.28
Nodes (13): GET(), GET(), POST(), GET(), POST(), GET(), POST(), SIGNED_URL_TTL_SECONDS (+5 more)

### Community 2 - "landing-data.ts"
Cohesion: 0.07
Nodes (37): metadata, Faq(), Features(), FinalCta(), Hero(), HowItWorks(), LandingFooter(), LandingNav() (+29 more)

### Community 3 - "gestion/store.ts"
Cohesion: 0.12
Nodes (35): TeamManager(), AdminLockButton(), listeners, lockAdmin(), read(), subscribe(), unlockAdmin(), useAdminUnlocked() (+27 more)

### Community 4 - "collect-landing-data.ts"
Cohesion: 0.08
Nodes (31): metadata, CollectComparison(), CostBar(), euros(), CollectFaq(), CollectFeatures(), CollectFinalCta(), CollectFooter() (+23 more)

### Community 5 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, dev, lint, prebuild, predev, seed:crm, seed:demo (+5 more)

### Community 6 - "gestion/selectors.ts"
Cohesion: 0.11
Nodes (34): ApercuPage(), Period, RevenueChart(), TopVentesChart(), DayGroup, dedupeById(), displayMode(), groupByDay() (+26 more)

### Community 7 - "react"
Cohesion: 0.15
Nodes (22): EtablissementForm(), NoteComposer, FollowUpChoice, VisitedFlow(), DUPLICATE_REASON_LABELS, CollectSettings(), ServirPanel(), ProfileRow() (+14 more)

### Community 8 - "admin/store.ts"
Cohesion: 0.19
Nodes (19): LoadError(), APPOINTMENTS_WINDOW_DAYS, fetchAll(), fetchLeads(), fetchOpenTasks(), fetchPendingDraftCount(), getClientSnapshot(), getErrorSnapshot() (+11 more)

### Community 9 - "sumup/server.ts"
Cohesion: 0.16
Nodes (22): GET(), stateCookie(), GET(), POST(), POST(), POST(), POST(), confirmOrderPaid() (+14 more)

### Community 10 - "square/server.ts"
Cohesion: 0.10
Nodes (43): GET(), stateCookie(), GET(), PATCH(), POST(), Line, orderBody(), POST() (+35 more)

### Community 11 - "clip/context.tsx"
Cohesion: 0.10
Nodes (33): apply(), fetchAnalytics(), fetchPostAnalytics(), generateCaptions(), pollPostStatus(), publishClip(), refreshAccounts(), replacePost() (+25 more)

### Community 12 - "menu/gestion/produits/page.tsx"
Cohesion: 0.16
Nodes (18): ProduitsPage(), CheckIcon(), SubscriptionGate(), cardClass, DiscoverLink(), eyebrowClass, Pill(), ProductCard() (+10 more)

### Community 13 - "stage.tsx"
Cohesion: 0.13
Nodes (18): CheckoutView(), CustomerPane(), DishRow(), ItineraryButton(), MenuView(), TIMELINE, TrackingView(), useNow() (+10 more)

### Community 14 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "ui.tsx"
Cohesion: 0.06
Nodes (54): metadata, metadata, TrackingPage(), ShippingDraft, AlertIcon(), InfoIcon(), MailIcon(), PhoneIcon() (+46 more)

### Community 16 - "clip/demo/data.ts"
Cohesion: 0.11
Nodes (28): metadata, DemoBanner(), emptySubscribe(), ClipData, ANALYTICS_BASE, buildDemoAnalytics(), buildDemoPostAnalytics(), buildDemoPosts() (+20 more)

### Community 17 - "clip-landing-data.ts"
Cohesion: 0.10
Nodes (26): metadata, ClipFaq(), ClipFeatures(), ClipFinalCta(), ClipFooter(), ClipHero(), ClipHowItWorks(), ClipNav() (+18 more)

### Community 18 - "metrics.ts"
Cohesion: 0.10
Nodes (41): ActivitePage(), load(), ClientsPage(), PERIOD_TABS, ClientDetail(), isView(), PERIOD_TABS, BarPoint (+33 more)

### Community 19 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 20 - "upload-post.ts"
Cohesion: 0.13
Nodes (15): PROVIDER_API_URL, PROVIDER_TIMEOUT_MS, providerApiKey(), STORAGE_RETENTION_DAYS, CAPTION_FIELDS, ClipProvider, ensureProfile(), getPostStatus() (+7 more)

### Community 21 - "api/contact/route.ts"
Cohesion: 0.23
Nodes (12): invalid(), isRateLimited(), POST(), RATE_LIMIT, readString(), sentAtByIp, CONTACT_LIMITS, ContactField (+4 more)

### Community 22 - "seed-crm.ts"
Cohesion: 0.19
Nodes (12): TablesInsert, Category, daysAgo(), daysAhead(), db, LeadStatus, main(), Priority (+4 more)

### Community 23 - "Ominin Clip — Phase 2 : Espace clipper (connexions, publication, analytics)"
Cohesion: 0.13
Nodes (14): 1. DB migration — `supabase/migrations/20260715000001_clip.sql`, 2. Provider adapter — `frontend/lib/clip/provider/` (server-only), 3. Route handlers — `frontend/app/api/clip/*`, 4. Storage & upload flow, 5. Claude captions, 6. Dashboard UI — replaces the stub, 7. Post lifecycle, 8. Analytics page (+6 more)

### Community 24 - "notifications/page.tsx"
Cohesion: 0.18
Nodes (20): DevicesCard(), DeviceStatusCard(), IOS_STEPS, PushPrompt(), PUSH_PROMPT_DISMISSED_KEY, currentEndpoint(), deviceLabel(), DeviceSubscription (+12 more)

### Community 25 - "gestion/constants.ts"
Cohesion: 0.07
Nodes (51): CapacitesPage(), openViews(), Capabilities(), OrderTabsCard(), STATUS_CLASSES, StatusBadge(), NavItem, Client (+43 more)

### Community 26 - "espace/comptes/creation/page.tsx"
Cohesion: 0.10
Nodes (8): CreationComptesPage(), FLEET, PILLARS, STEPS, WEEK, ComptesTab, ComptesTabs(), TABS

### Community 27 - "commande/page.tsx"
Cohesion: 0.32
Nodes (6): CheckoutPage(), metadata, CheckIcon(), CheckoutForm(), getActiveShippingMethods(), paymentsEnabled()

### Community 28 - "createAdminClient"
Cohesion: 0.10
Nodes (39): GET(), EXTENSIONS, POST(), POST(), DELETE(), GET(), POST(), requireUser() (+31 more)

### Community 29 - "boho/profile.json"
Cohesion: 0.06
Nodes (31): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+23 more)

### Community 30 - "proxy.ts"
Cohesion: 0.36
Nodes (7): config, matchesPath(), ProductConfig, PRODUCTS, proxy(), rewritePrefixFor(), @supabase/ssr

### Community 31 - "app/page.tsx"
Cohesion: 0.16
Nodes (11): metadata, PortalApproach(), PortalFinalCta(), PortalFooter(), BENTO_SPANS, PortalProducts(), ProductCube(), Reveal() (+3 more)

### Community 32 - "menu-data.ts"
Cohesion: 0.12
Nodes (21): ClientDemoPage(), generateMetadata(), FEATURES, SEED_TABLE_COUNT, seed(), boho, DEMO_SLUG, getRestaurant() (+13 more)

### Community 34 - "auth-form.tsx"
Cohesion: 0.08
Nodes (16): metadata, metadata, metadata, metadata, metadata, metadata, InscriptionTabs(), Profile (+8 more)

### Community 35 - "shared.ts"
Cohesion: 0.25
Nodes (12): GET(), isTerminal(), OrderConfirmation(), STATUS_COPY, CartChoice, COLLECT_ORDER_POLL_MS, collectHref(), CollectOrderView (+4 more)

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
Nodes (76): ActivityInput, addActivity(), apply(), AppointmentInput, byDue(), completeTask(), createAppointment(), createTask() (+68 more)

### Community 41 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 42 - "createClient"
Cohesion: 0.12
Nodes (32): LeaPage(), SignOutButton(), CreateRestaurantModal(), CartBar(), approveOutreachEmail(), availableSlug(), createRestaurant(), fetchLatestResearchRun() (+24 more)

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

### Community 58 - "database.types.ts"
Cohesion: 0.13
Nodes (21): RFC-2047, POST(), Role, isTerminal(), POST(), Product, PRODUCTS_BY_CHOICE, accessToken() (+13 more)

### Community 63 - "[slug]/layout.tsx"
Cohesion: 0.06
Nodes (54): allura, cormorant, dmSans, dmSerif, FONT_VARIABLES, generateMetadata(), inter, montserrat (+46 more)

### Community 64 - "_template/profile.json"
Cohesion: 0.06
Nodes (30): address, city, collect_settings, prep_minutes, slot_capacity, slot_count, slot_interval_minutes, cuisine (+22 more)

### Community 65 - "item-form-modal.tsx"
Cohesion: 0.27
Nodes (19): ArticleDraft, draftToEtapes(), emptyArticle(), emptyEtape(), EtapeDraft, EtapeEditor(), etapesToDraft(), FormuleFormModal() (+11 more)

### Community 67 - "temps.ts"
Cohesion: 0.12
Nodes (45): BadgeagesLog(), CorrectionModal(), localInput(), Action, ACTION_LABELS, Badgeuse(), dayLabel(), isToday() (+37 more)

### Community 68 - "field.tsx"
Cohesion: 0.10
Nodes (21): CollectSignupForm(), slugify(), CollectEtablissementPage(), metadata, InvitationForm(), InvitationPage(), OnboardingForm(), RESERVED_SLUGS (+13 more)

### Community 69 - "shop/types.ts"
Cohesion: 0.07
Nodes (35): metadata, PrintButton(), ChevronDownIcon(), FaqAccordion(), ORDER, OrderItemsList(), OrderTotals(), STEPS (+27 more)

### Community 70 - "lead-panel.tsx"
Cohesion: 0.08
Nodes (40): metadata, ArrowRightIcon(), BotIcon(), CalendarIcon(), ChartIcon(), ChevronLeftIcon(), ClockIcon(), GlobeIcon() (+32 more)

### Community 71 - "lea/page.tsx"
Cohesion: 0.10
Nodes (21): FindingsCard(), hostOf(), percent(), PROSPECT_TILES, ProspectsPanel(), scoreColor(), TabId, VARIANT_ORDER (+13 more)

### Community 72 - "espace/shell.tsx"
Cohesion: 0.17
Nodes (10): ClipEspaceLayout(), metadata, ClipLoader(), ClipShell(), isActive(), NAV_ITEMS, NavItem, signOut() (+2 more)

### Community 73 - "gestion/menu/page.tsx"
Cohesion: 0.23
Nodes (13): MenuPage(), View, FormuleCard(), EditIcon(), TrashIcon(), MenuItemCard(), useRunMutation(), deleteFormule() (+5 more)

### Community 74 - "services/autoresearch.py"
Cohesion: 0.13
Nodes (25): _credentials_env(), _parse(), parse_structured(), The Agent SDK spawns a Claude Code subprocess that authenticates from the…, Single-turn, tool-less Claude call returning schema-validated output. Sync on…, AnalysisFindings, ProposedVariant, ProspectScore (+17 more)

### Community 75 - "espace/generateur/page.tsx"
Cohesion: 0.14
Nodes (8): GenerateurPage(), MOMENTS, STEPS, PublierTab, PublierTabs(), TABS, SubTab, SubTabs()

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
Nodes (53): MapCanvas, MapCanvas(), savedViewport(), statusColorExpression, toFeatureCollection(), Viewport, StatusMenu(), ALL_COLUMNS (+45 more)

### Community 80 - "cart-bar.tsx"
Cohesion: 0.14
Nodes (15): PaymentChoice, SubmitState, TIP_PERCENTS, TipChoice, loadSdk(), PaymentState, SquareCard, SquarePayment() (+7 more)

### Community 81 - "use-order-chime.ts"
Cohesion: 0.16
Nodes (17): metadata, ChimeCard(), GestionShell(), isActive(), signOut(), CHIME_STORAGE_KEY, armedListeners, CHIME_NOTES (+9 more)

### Community 82 - "collect/demo/provider.tsx"
Cohesion: 0.11
Nodes (14): buildDemoMenu(), COLLECT_DEMO, DEMO_MENU_SPEC, DemoMenuSection, demoRestaurantInfo, DemoStep, CollectDemoContext, CollectDemoProvider() (+6 more)

### Community 83 - "gestion/api.ts"
Cohesion: 0.10
Nodes (47): CategoryManager(), apply(), assertTransition(), assignTable(), createCategory(), createFormule(), createItem(), createStaff() (+39 more)

### Community 84 - "portal-data.ts"
Cohesion: 0.25
Nodes (8): unsplash(), brand, buildLabel, footer, nav, openLabel, portalHost, products

### Community 85 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @anthropic-ai/sdk, maplibre-gl, next, next-themes, qrcode, react, react-dom (+4 more)

### Community 86 - "shop/icons.tsx"
Cohesion: 0.08
Nodes (31): AccountPage(), metadata, SignOutButton(), ImageUploader(), UploadedImage, isActive(), NAV_ITEMS, NavItem (+23 more)

### Community 87 - "devDependencies"
Cohesion: 0.17
Nodes (12): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx, @types/node, @types/qrcode (+4 more)

### Community 88 - "clip/demo-showcase.tsx"
Cohesion: 0.16
Nodes (9): ClipDemoShowcase(), DESKTOP_VIEWPORT, PHONE_SIZE, BrowserFrame(), DemoShowcase(), IphoneFrame(), QrCorners(), demoSection (+1 more)

### Community 89 - "add-to-order.tsx"
Cohesion: 0.27
Nodes (10): AddToOrder(), choiceRowClass(), isUnavailable(), OptionsModal(), CallServerButton(), CallState, CartChoice, cartLineKey() (+2 more)

### Community 90 - "check"
Cohesion: 0.07
Nodes (41): isoAt(), ShiftModal(), timeInput(), createShift(), deleteShift(), updateShift(), CategoryInput, deleteCategory() (+33 more)

### Community 91 - "useAdmin"
Cohesion: 0.53
Nodes (6): AppointmentFormModal(), RestaurantPicker(), TaskFormModal(), fromDatetimeLocalValue(), toDatetimeLocalValue(), useAdmin()

### Community 92 - "dish-card.tsx"
Cohesion: 0.29
Nodes (4): DishCard(), FeaturedCard(), MenuSection(), BADGE_LABELS

### Community 93 - "setup-stripe.ts"
Cohesion: 0.25
Nodes (6): shopOffer, Plan, plans, shopPlans, stripe, zeroPriced

### Community 94 - "provider/types.ts"
Cohesion: 0.17
Nodes (11): POST(), PublierPage(), CaptionEditor(), CAPTION_CONTEXT_MAX_CHARS, captionsSchema(), generateCaptions(), ClipUploadInput, ClipPlatform (+3 more)

### Community 95 - "admin/format.ts"
Cohesion: 0.13
Nodes (35): EmailTable(), ApercuPage(), dayTitle(), groupByDay(), RdvPage(), STATUS_CLASSES, TabId, TachesPage() (+27 more)

### Community 96 - "managers.tsx"
Cohesion: 0.07
Nodes (67): ShopCustomersPage(), ShopDiscountsPage(), ShopOrderPage(), ShopContentPage(), ShopConversationPage(), ShopMessagesPage(), OptionGroupPage(), ShopOptionsPage() (+59 more)

### Community 97 - "[token]/page.tsx"
Cohesion: 0.43
Nodes (5): metadata, PlanningPage(), PlanningPayload, PlanningPublic(), weekStart()

### Community 98 - "public-menu.ts"
Cohesion: 0.60
Nodes (3): ConfirmationPage(), metadata, fetchRestaurant()

### Community 99 - "settings.tsx"
Cohesion: 0.11
Nodes (22): ShopSettingsPage(), ShopLayout(), ProductActiveToggle(), Section, StripePanel(), SubscriptionPanel(), ThemeEditor(), CheckCircleIcon() (+14 more)

### Community 100 - "gestion/photo.ts"
Cohesion: 0.50
Nodes (4): compressPhoto(), PHOTO_JPEG_QUALITY, PHOTO_MAX_EDGE, uploadPhoto()

### Community 101 - "portal/hero.tsx"
Cohesion: 0.50
Nodes (3): PARTICLES, PortalHero(), hero

### Community 102 - "What you must do when invoked"
Cohesion: 0.20
Nodes (9): Important notes, /new-restaurant, Phase 1 — Intake, Phase 2 — Research, Phase 3 — Verify with user, Phase 4 — Build the demo profile, Phase 5 — Summary, Updating an existing profile (+1 more)

### Community 103 - "push/server.ts"
Cohesion: 0.11
Nodes (24): CallBody, POST(), POST(), PrefsCard(), DispatchBody, PUSH_EVENT_HINTS, PUSH_EVENT_LABELS, PUSH_EVENTS (+16 more)

### Community 105 - "filter-bar.tsx"
Cohesion: 0.11
Nodes (33): CartePage(), FilterBar(), toggleInSet(), CrosshairIcon(), FilterIcon(), SearchIcon(), GEOLOCATION_TIMEOUT_MS, NO_CONTACT_OPTIONS (+25 more)

### Community 106 - "espace/analytique/page.tsx"
Cohesion: 0.11
Nodes (17): AnalyticsView, AnalytiquePage(), compact, PostAnalyticsList(), VIEW_SUBTITLES, VIEWS, ComptesPage(), LinkIcon() (+9 more)

### Community 109 - "formatPrice"
Cohesion: 0.09
Nodes (33): CartLine, cartTotal(), CheckoutDialog(), CollectExperience(), ItemRow(), lineKey(), lineUnitPrice(), OptionsDialog() (+25 more)

### Community 110 - "tickets.py"
Cohesion: 0.36
Nodes (11): _group_by_category(), _line(), _local(), datetime, Tickets rendus en ESC/POS. Omilink envoie ces octets tels quels à l'imprimante…, Group items by category name, sorted by category position., _render_items(), render_job() (+3 more)

### Community 113 - "desinscription/route.ts"
Cohesion: 0.31
Nodes (10): RFC-8058, confirmFormHtml(), DONE_HTML, GET(), LEAD_DEMOTABLE_FROM, PAGE_SHELL(), params(), POST() (+2 more)

### Community 116 - "clip/constants.ts"
Cohesion: 0.13
Nodes (17): POST(), PublicationsPage(), Dropzone(), formatSize(), CheckIcon(), UploadIcon(), PlatformBadge(), PostCard() (+9 more)

### Community 121 - "components/gestion/shell.tsx"
Cohesion: 0.12
Nodes (20): NavItem, ApercuIcon(), BellIcon(), ChevronDownIcon(), ClockIcon(), CommandesIcon(), ExternalLinkIcon(), GearIcon() (+12 more)

### Community 123 - "restaurants/page.tsx"
Cohesion: 0.09
Nodes (31): RFC-4180, EmailsRedirect(), Analysis, ImportPage(), parseCoordinate(), ParsedRow, Phase, RowStatus (+23 more)

### Community 125 - "orders.ts"
Cohesion: 0.11
Nodes (43): POST(), POST(), Body, POST(), STATUS_MESSAGES, POST(), POST(), loadOrder() (+35 more)

### Community 145 - "shop/server.ts"
Cohesion: 0.12
Nodes (30): GET(), FILTERS, ShopOrdersPage(), metadata, ShopGestionLayout(), ShopShippingPage(), PackingSlipPage(), CreateShopPage() (+22 more)

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
Cohesion: 0.11
Nodes (35): BADGE, DeviceCard(), DOT_CLASS, Editing, Health, LinkState, PrinterCard(), printerHealth() (+27 more)

### Community 161 - "get_supabase"
Cohesion: 0.11
Nodes (26): get_supabase(), Client, Device, Authentifie un appareil Omilink par l'empreinte SHA-256 de son jeton., require_device(), _apply_routing(), _build_routing(), enroll() (+18 more)

### Community 163 - "gestion/types.ts"
Cohesion: 0.14
Nodes (17): CuisinierApercu(), ServiceClock(), ServiceClock(), SERVICE_CLOCK_TICK_MS, OrderRow, unavailableItems(), Article, Etablissement (+9 more)

### Community 167 - "next"
Cohesion: 0.07
Nodes (64): AboutPage(), metadata, revalidate, CatalogPage(), generateMetadata(), revalidate, ConfirmationPage(), metadata (+56 more)

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

### Community 188 - "payment-settings.tsx"
Cohesion: 0.24
Nodes (9): NO_SQUARE, NO_STRIPE, PaymentSettings(), Provider, readStatus(), SquareLocation, SquareStatus, StripeStatus (+1 more)

### Community 189 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 195 - "site.ts"
Cohesion: 0.27
Nodes (7): PRIVATE_PATHS, sitemap(), adminSiteUrl, clipSiteUrl, collectSiteUrl, menuSiteUrl, siteUrl

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
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `equipe/page.tsx`, `landing-data.ts`, `gestion/store.ts`, `collect-landing-data.ts`, `gestion/selectors.ts`, `admin/store.ts`, `clip/context.tsx`, `menu/gestion/produits/page.tsx`, `stage.tsx`, `ui.tsx`, `clip/demo/data.ts`, `shop/server.ts`, `metrics.ts`, `notifications/page.tsx`, `gestion/constants.ts`, `app/page.tsx`, `terminaux/page.tsx`, `auth-form.tsx`, `shared.ts`, `gestion/types.ts`, `m/[slug]/page.tsx`, `admin/api.ts`, `app/layout.tsx`, `menu/cart.tsx`, `language.tsx`, `package.json`, `payment-settings.tsx`, `[slug]/layout.tsx`, `item-form-modal.tsx`, `temps.ts`, `field.tsx`, `shop/types.ts`, `lead-panel.tsx`, `lea/page.tsx`, `gestion/menu/page.tsx`, `collect/landing/demo-showcase.tsx`, `collect/checkout/route.ts`, `admin/constants.ts`, `cart-bar.tsx`, `use-order-chime.ts`, `collect/demo/provider.tsx`, `shop/icons.tsx`, `clip/demo-showcase.tsx`, `add-to-order.tsx`, `useAdmin`, `provider/types.ts`, `admin/format.ts`, `managers.tsx`, `settings.tsx`, `filter-bar.tsx`, `espace/analytique/page.tsx`, `formatPrice`, `clip/constants.ts`, `restaurants/page.tsx`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `createAdminClient` to `clip/server.ts`, `shared.ts`, `settings.tsx`, `next`, `push/server.ts`, `sumup/server.ts`, `square/server.ts`, `collect/checkout/route.ts`, `ui.tsx`, `desinscription/route.ts`, `shop/server.ts`, `shop/checkout.ts`, `clip/constants.ts`, `api/contact/route.ts`, `database.types.ts`, `commande/page.tsx`, `orders.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `next` connect `next` to `landing-data.ts`, `collect-landing-data.ts`, `ui.tsx`, `clip/demo/data.ts`, `clip-landing-data.ts`, `shop/server.ts`, `shop-landing-data.ts`, `commande/page.tsx`, `app/page.tsx`, `menu-data.ts`, `auth-form.tsx`, `m/[slug]/page.tsx`, `useLanguage`, `app/layout.tsx`, `next.config.ts`, `package.json`, `[slug]/layout.tsx`, `site.ts`, `field.tsx`, `shop/types.ts`, `lead-panel.tsx`, `espace/shell.tsx`, `collect/landing/demo-showcase.tsx`, `collect/checkout/route.ts`, `use-order-chime.ts`, `shop/icons.tsx`, `[token]/page.tsx`, `public-menu.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `backend`, `$schema`, `slug` to the rest of the system?**
  _677 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `equipe/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12435897435897436 - nodes in this community are weakly interconnected._
- **Should `landing-data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07088989441930618 - nodes in this community are weakly interconnected._
- **Should `gestion/store.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12091038406827881 - nodes in this community are weakly interconnected._
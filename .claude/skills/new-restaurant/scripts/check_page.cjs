// Recette mécanique d'une carte, avant de la confier à un correcteur : tout ce
// qui se mesure sans jugement. Chaque ligne ÉCHEC est un défaut à corriger.
//
//   pw.sh check_page.cjs <url>
//
// Contrôles : thème et polices réellement appliqués, photos chargées,
// débordement horizontal de 320 à 1440 px, chaque pastille de catégorie
// atterrit bien sous la barre collante, mouvement réduit respecté, aucune
// erreur console ni requête en échec. Code de sortie 1 si un contrôle échoue.
const { chromium } = require("playwright");

const url = process.argv[2];
if (!url) {
  console.error("usage : pw.sh check_page.cjs <url>");
  process.exit(2);
}

const failures = [];
const ok = (label, detail = "") => console.log(`  OK      ${label}${detail ? " — " + detail : ""}`);
const fail = (label, detail = "") => {
  failures.push(label);
  console.log(`  ÉCHEC   ${label}${detail ? " — " + detail : ""}`);
};

async function settle(page) {
  let last = -1, stable = 0;
  for (let i = 0; i < 40 && stable < 3; i++) {
    await page.waitForTimeout(150);
    const y = await page.evaluate(() => window.scrollY);
    stable = y === last ? stable + 1 : 0;
    last = y;
  }
}

async function open(browser, width, extra = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, ...extra });
  const page = await context.newPage();
  // Un robot de recette ne doit jamais compter comme visite d'un client réel.
  await page.route(/\/rpc\/menu_track/, (route) => route.abort());
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(1200);
  return { context, page };
}

(async () => {
  const browser = await chromium.launch();
  console.log(`\n${url}\n`);

  // --- Passe principale, mobile (le cas d'usage d'un QR code) --------------
  const { context, page } = await open(browser, 390);
  const errors = [], failed = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url().slice(0, 100)}`));

  console.log("Thème et typographie");
  const t = await page.evaluate(() => {
    const root = [...document.querySelectorAll("[class]")].find((el) =>
      [...el.classList].some((c) => /^theme-[a-z0-9-]+$/.test(c))
    );
    const first = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).fontFamily.split(",")[0].replace(/"/g, "").trim() : null;
    };
    const vars = root ? getComputedStyle(root) : null;
    return {
      theme: root ? [...root.classList].find((c) => c.startsWith("theme-")) : null,
      ember1: vars?.getPropertyValue("--ember-1").trim() || null,
      brandDisplay: vars?.getPropertyValue("--brand-display").trim().split(",")[0].replace(/"/g, "") || null,
      brandWordmark: vars?.getPropertyValue("--brand-wordmark").trim().split(",")[0].replace(/"/g, "") || null,
      brandSans: vars?.getPropertyValue("--brand-sans").trim().split(",")[0].replace(/"/g, "") || null,
      h1: first("h1"),
      h2: first("main h2"),
      dish: first("article h3"),
      // Une description sur plusieurs lignes est une liste (DishCard).
      body: first("article p, article li"),
      nav: first("nav a"),
    };
  });
  if (t.theme) ok("classe de thème", `${t.theme}, --ember-1 ${t.ember1}`);
  else console.log("  INFO    aucune classe theme-* — palette Ominin (attendu pour ?theme=ominin)");
  console.log(`  INFO    polices : titre ${t.h1} · sections ${t.h2} · plats ${t.dish} · texte ${t.body} · navigation ${t.nav}`);
  // Piège connu : body résout --font-sans dans son propre scope, où le thème
  // (posé sur une div) n'existe pas. Sans `font-family: var(--brand-sans)` sur
  // la classe du thème, tout le texte courant reste en police Ominin.
  if (t.brandSans) {
    const want = t.brandSans.replace(/ Fallback$/, "");
    if (t.body && t.body.startsWith(want)) ok("police de texte du thème appliquée", want);
    else fail("police de texte du thème NON appliquée", `attendu ${want}, obtenu ${t.body} — ajouter font-family: var(--brand-sans) sur .${t.theme}`);
  }
  // Un thème peut composer le nom dans la police de son enseigne
  // (--brand-wordmark) et garder --brand-display pour les titres des plats :
  // le h1 se mesure alors contre la première, les plats contre la seconde.
  if (t.brandWordmark) {
    const want = t.brandWordmark.replace(/ Fallback$/, "");
    if (t.h1 && t.h1.startsWith(want)) ok("police de l'enseigne appliquée au nom", want);
    else fail("police de l'enseigne NON appliquée au nom", `attendu ${want}, obtenu ${t.h1}`);
  }
  if (t.brandDisplay) {
    const want = t.brandDisplay.replace(/ Fallback$/, "");
    const [what, got] = t.brandWordmark ? ["plats", t.dish] : ["titrage", t.h1];
    if (got && got.startsWith(want)) ok(`police de titrage du thème appliquée (${what})`, want);
    else fail(`police de titrage du thème NON appliquée (${what})`, `attendu ${want}, obtenu ${got}`);
  }

  console.log("\nPhotos");
  await page.evaluate(() => document.querySelectorAll("img").forEach((i) => (i.loading = "eager")));
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 1600) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(3000);
  const imgs = await page.evaluate(() =>
    [...document.querySelectorAll("article img")].map((i) => ({ src: i.currentSrc || i.src, w: i.naturalWidth }))
  );
  const broken = imgs.filter((i) => !i.w);
  const cards = await page.evaluate(() => document.querySelectorAll("article").length);
  if (broken.length) fail(`${broken.length} photo(s) cassée(s)`, broken.slice(0, 5).map((b) => b.src).join(" | "));
  else ok("photos", `${imgs.length} chargées pour ${cards} plats`);
  if (imgs.length < cards) console.log(`  INFO    ${cards - imgs.length} plat(s) sans photo`);

  console.log("\nNavigation par catégories");
  const pills = await page.evaluate(() =>
    [...document.querySelectorAll('nav a[href^="#"]')].map((a) => ({ href: a.getAttribute("href"), name: a.textContent.trim() }))
  );
  for (const pill of pills) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.click(`nav a[href="${pill.href}"]`);
    await settle(page);
    const r = await page.evaluate((href) => {
      const target = document.getElementById(decodeURIComponent(href.slice(1)));
      if (!target) return null;
      const heading = target.querySelector("h2") || target;
      const nav = document.querySelector("nav").getBoundingClientRect();
      return { top: Math.round(heading.getBoundingClientRect().top), navBottom: Math.round(nav.bottom) };
    }, pill.href);
    if (!r) fail(`« ${pill.name} » : ancre introuvable`, pill.href);
    else if (r.top < r.navBottom) fail(`« ${pill.name} » : titre caché sous la barre`, `${r.top}px < ${r.navBottom}px`);
    else if (r.top > r.navBottom + 200) fail(`« ${pill.name} » : n'atteint pas sa section`, `titre à ${r.top}px`);
  }
  if (!failures.some((f) => f.startsWith("« "))) ok(`${pills.length} catégories`, "chacune atterrit sous la barre collante");

  if (errors.length) fail(`${errors.length} erreur(s) console`, [...new Set(errors)].slice(0, 3).join(" | "));
  else ok("console", "aucune erreur");
  if (failed.length) fail(`${failed.length} requête(s) en échec`, [...new Set(failed)].slice(0, 3).join(" | "));
  else ok("réseau", "aucune requête en échec");
  await context.close();

  console.log("\nDébordement horizontal");
  for (const width of [320, 390, 768, 1024, 1440]) {
    const { context: c, page: p } = await open(browser, width);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) fail(`${width}px : la page déborde de ${over}px`);
    else ok(`${width}px`);
    await c.close();
  }

  console.log("\nMouvement réduit");
  const { context: rc, page: rp } = await open(browser, 390, { reducedMotion: "reduce" });
  const hidden = await rp.evaluate(() =>
    [...document.querySelectorAll(".reveal, .hero-entrance")].filter((el) => getComputedStyle(el).opacity === "0").length
  );
  if (hidden) fail(`${hidden} bloc(s) invisibles avec prefers-reduced-motion`);
  else ok("contenu visible sans animation");
  await rc.close();

  await browser.close();
  console.log(failures.length ? `\n${failures.length} ÉCHEC(S)` : "\nTous les contrôles passent.");
  process.exit(failures.length ? 1 : 0);
})();

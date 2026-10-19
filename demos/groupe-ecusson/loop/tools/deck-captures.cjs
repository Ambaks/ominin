// Les captures de la présentation Groupe CKL × Ominin (frontend/public/pitch/groupe-ckl) :
// les cartes QR en production, le parcours d'une commande au Café des Arts, le Mojito du Novelty,
// la salle du Victoria et la vue groupe (serveur de dev de ce worktree), puis l'image de partage.
// Aucune requête vers Supabase, Stripe ou Square ne sort : les démos simulent tout, et le
// navigateur les coupe quand même.
//
//   cd /Users/naiahoard/ominin-groupe
//   .claude/skills/new-restaurant/scripts/pw.sh <ce fichier> [nom…]
//
// Noms : cartes, parcours, happy, salle, groupe, og (sans nom : tout sauf og, qui photographie la
// présentation elle-même et se lance une fois celle-ci à jour). Variables d'environnement :
//   MENU_BASE  défaut https://menu.ominin.com/demo  (les cartes QR, /<slug>?table=12)
//   APP        défaut http://localhost:5200          (salle, vue groupe, présentation)
//   LAISSAC    l'adresse de la carte de la Brasserie Laissac tant qu'elle n'est pas en production,
//              ex. http://localhost:5150/menu/demo/brasserie-laissac
// Une carte absente (404) est sautée : la présentation montre alors « carte en préparation ».
// captures.json, à côté des images, dit quelles cartes existent et où sont, sur la vue groupe, les
// zones que la présentation annote : reprendre la vue groupe y recale ses repères.
const { chromium } = require("playwright");
const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const OUT = resolve("frontend/public/pitch/groupe-ckl");
const MANIFEST = join(OUT, "captures.json");
const MENU_BASE = process.env.MENU_BASE ?? "https://menu.ominin.com/demo";
const APP = process.env.APP ?? "http://localhost:5200";
const only = new Set(process.argv.slice(2));
const wanted = (name) => (only.size ? only.has(name) : name !== "og");

const JPEG_QUALITY = 80;
const TABLE = 12;
// Le samedi soir de la vue groupe (?jour=2026-10-10&heure=19:40) : le ticket affiche la même heure.
const EVENING = "2026-10-10T19:40:00+02:00";
const GROUP_URL = `${APP}/menu/demo/groupe/ckl?heure=19:40&jour=2026-10-10&vitesse=0`;
const PHONE = { width: 390, height: 844 };
const TABLET = { width: 1180, height: 820 };
const DESKTOP = { width: 1600, height: 1000 };
const SCALE = 2;
// Le haut de chaque écran de téléphone, sous la caméra du cadre (components/pitch/pitch.css) : une
// barre d'état à la couleur de la carte, comme sur un vrai téléphone.
const STATUS_BAR = 30;
const VENUES = ["cafe-des-arts", "le-victoria", "le-novelty", "brasserie-laissac"];
const BLOCKED = /supabase\.co|stripe\.com|squareup\.com/;
// Le temps que les feuilles finissent de glisser et que la vue groupe pose ses entrées.
const SETTLE_MS = 900;
const GROUP_SETTLE_MS = 3000;

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
const save = () => writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
const settle = (page, ms = SETTLE_MS) => page.waitForTimeout(ms);

async function shot(target, name, options = {}) {
  await target.screenshot({ path: join(OUT, `${name}.jpg`), type: "jpeg", quality: JPEG_QUALITY, ...options });
  console.log("✓", `${name}.jpg`);
}

async function context(browser, viewport, extra = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: SCALE, locale: "fr-FR", timezoneId: "Europe/Paris", ...extra });
  await ctx.route(BLOCKED, (route) => route.abort());
  for (const url of [MENU_BASE, APP]) await ctx.addCookies([{ name: "ominin-consent", value: "denied", url: new URL(url).origin }]);
  return ctx;
}

const carteUrl = (slug) => (slug === "brasserie-laissac" && process.env.LAISSAC) || `${MENU_BASE}/${slug}?table=${TABLE}`;

/** La carte de slug à la table 12, un vendredi à 20 h 40 ; null si elle n'existe pas encore. */
async function openCarte(browser, slug) {
  const ctx = await context(browser, PHONE, { isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  await page.clock.install({ time: new Date(EVENING) });
  const url = carteUrl(slug);
  const response = await page.goto(url.includes("?") ? url : `${url}?table=${TABLE}`, { waitUntil: "load", timeout: 120_000 });
  if (!response || response.status() >= 400) {
    console.log("–", slug, "absente", response?.status());
    await ctx.close();
    return null;
  }
  const ground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.addStyleTag({
    content: `nextjs-portal{display:none!important}html{border-top:${STATUS_BAR}px solid ${ground}}`,
  });
  await page.evaluate(() => document.fonts.ready);
  await settle(page, 1500);
  return { ctx, page };
}

const button = (page, name) => page.getByRole("button", { name });

async function cartes(browser) {
  manifest.cartes = [];
  for (const slug of VENUES) {
    const opened = await openCarte(browser, slug);
    if (!opened) continue;
    await shot(opened.page, `carte-${slug}`);
    manifest.cartes.push(slug);
    await opened.ctx.close();
  }
  save();
}

/** Au Café des Arts : un burger à point, un mojito passion, payés en ligne, suivis jusqu'au service. */
async function parcours(browser) {
  const { ctx, page } = await openCarte(browser, "cafe-des-arts");
  await button(page, /^Choisir : Burger Café des Arts/).click();
  await settle(page);
  await page.getByText("À point", { exact: true }).click();
  await settle(page, 300);
  await shot(page, "parcours-choisir");
  await button(page, /^Ajouter · /).click();
  await settle(page);
  await button(page, /^Choisir : Mojito/).click();
  await settle(page);
  await page.getByText("Passion", { exact: true }).click();
  await button(page, /^Ajouter · /).click();
  await settle(page);
  await button(page, /^Voir la commande/).click();
  await settle(page);
  await shot(page, "parcours-panier");
  await button(page, /^Payer en ligne · /).click();
  await settle(page);
  await shot(page, "parcours-paiement");
  await button(page, /^Payer \d/).click();
  await page.getByText("Commande reçue", { exact: false }).first().waitFor();
  await settle(page);
  await shot(page, "parcours-suivi");
  // En préparation, puis servie : « Bon appétit ! ».
  await button(page, /étape suivante/).click();
  await settle(page);
  await button(page, /étape suivante/).click();
  await page.locator("[data-serve-box]").waitFor();
  await settle(page, 1500);
  await shot(page, "parcours-servi");
  await ctx.close();
}

/** Le Mojito du Novelty en XXL : 9 € + 3 €, le prix hors happy hour. */
async function happy(browser) {
  const { ctx, page } = await openCarte(browser, "le-novelty");
  await button(page, /^Composer : Mojito$/).click();
  await settle(page);
  await page.getByText("XXL", { exact: true }).click();
  await settle(page, 300);
  await shot(page, "happy-novelty");
  await ctx.close();
}

async function salle(browser) {
  const ctx = await context(browser, TABLET);
  const page = await ctx.newPage();
  await page.goto(`${APP}/menu/demo/le-victoria/salle`, { waitUntil: "load", timeout: 180_000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.evaluate(() => document.fonts.ready);
  await settle(page, GROUP_SETTLE_MS);
  await shot(page, "salle-victoria");
  await ctx.close();
}

/**
 * La vue groupe : son premier écran, puis ses heures fortes à part. Les zones annotées, en px CSS de
 * la capture : l'encaissé de chaque adresse (de son libellé à sa courbe), le bandeau « À surveiller »,
 * l'indicateur « Additions ouvertes ». Chaque partie se trouve par son titre, pas par sa place.
 */
async function groupe(browser) {
  const ctx = await context(browser, DESKTOP);
  const page = await ctx.newPage();
  await page.goto(GROUP_URL, { waitUntil: "load", timeout: 180_000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.evaluate(() => document.fonts.ready);
  await settle(page, GROUP_SETTLE_MS);
  await shot(page, "groupe");
  manifest.groupe = await page.evaluate(() => {
    const box = (rects) => {
      const left = Math.min(...rects.map((r) => r.left));
      const top = Math.min(...rects.map((r) => r.top));
      const right = Math.max(...rects.map((r) => r.right));
      const bottom = Math.max(...rects.map((r) => r.bottom));
      return { x: Math.round(left), y: Math.round(top), width: Math.round(right - left), height: Math.round(bottom - top) };
    };
    const heading = (pattern) => [...document.querySelectorAll("h2, h3")].find((node) => pattern.test(node.textContent.trim()));
    const section = (pattern) => heading(pattern).closest("section");
    const panels = [...section(/^Vos établissements/).querySelectorAll(":scope > div > *")];
    const revenue = panels.flatMap((panel) => {
      const label = [...panel.querySelectorAll("p")].find((node) => /^Encaissé/.test(node.textContent.trim()));
      const curve = label && [...panel.querySelectorAll("svg")].find((svg) => label.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING && svg.getBoundingClientRect().width > 120);
      return curve ? [label.getBoundingClientRect(), curve.getBoundingClientRect()] : [];
    });
    const open = [...section(/^Le groupe aujourd/).children].find((card) => /Additions ouvertes/.test(card.textContent) && card.getBoundingClientRect().height > 60);
    // Le cadre des heures fortes : le premier parent de son titre assez grand pour tenir la grille.
    let hours = heading(/^Heures fortes/);
    while (hours.getBoundingClientRect().height < 150) hours = hours.parentElement;
    hours.setAttribute("data-capture", "heures");
    return {
      venues: panels.length,
      boxes: {
        revenue: box(revenue),
        late: box([section(/^À surveiller/).getBoundingClientRect()]),
        open: box([open.getBoundingClientRect()]),
      },
    };
  });
  const hours = page.locator('[data-capture="heures"]');
  await hours.scrollIntoViewIfNeeded();
  await settle(page, GROUP_SETTLE_MS);
  await shot(hours, "groupe-heures");
  const size = await hours.boundingBox();
  manifest.groupe.heures = { width: Math.round(size.width), height: Math.round(size.height) };
  save();
  await ctx.close();
}

/** L'image de partage : la couverture, recadrée au format 1 200 × 630 des aperçus de lien. */
async function og(browser) {
  const OG = { width: 1200, height: 630 };
  const SLIDE = { width: 1920, height: 1080 };
  const ctx = await browser.newContext({ viewport: SLIDE, deviceScaleFactor: OG.width / SLIDE.width });
  await ctx.addCookies([{ name: "ominin-consent", value: "denied", url: APP }]);
  const page = await ctx.newPage();
  await page.goto(`${APP}/groupe-ckl/presentation`, { waitUntil: "networkidle", timeout: 180_000 });
  await page.emulateMedia({ media: "print" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.evaluate(() => document.fonts.ready);
  const slide = await page.locator(".deck-slide").first().boundingBox();
  const height = Math.round((SLIDE.width * OG.height) / OG.width);
  await shot(page, "og", { clip: { x: slide.x, y: slide.y + (SLIDE.height - height) / 2, width: SLIDE.width, height } });
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const [name, run] of Object.entries({ cartes, parcours, happy, salle, groupe, og })) if (wanted(name)) await run(browser);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

// Les captures du deck et de la page Baï-Kō : la carte à la table 7 sur le Corn Cheese et son fromage
// filé, puis le parcours de la table 7 — la carte du Dak Bap Spicy, composé en dolsot, un kimchi, la
// commande réglée en ligne, la confirmation —, enfin l'écran de la salle.
// Aperçu seulement : le bouton d'envoi de la démo ne fait rien partir.
//
//   .claude/skills/new-restaurant/scripts/pw.sh demos/bai-ko/pitch/captures.cjs <origine> \
//     frontend/public/pitch/bai-ko frontend/lib/pitch/bai-ko-captures.json [capture…]
//
// Chaque capture s'écrit <nom>.<empreinte>.jpg et le manifeste, que lit lib/pitch/bai-ko.ts, donne son
// nom : une nouvelle prise change d'adresse, ni le navigateur ni l'optimiseur d'images de Next ne
// servent l'ancienne. Du JPEG et non du WebP : Chrome l'embarque tel quel dans le PDF de la
// présentation au lieu de le décompresser. Sans liste, toutes les captures ; sinon, celles nommées.
const { chromium } = require("playwright");
const { createHash } = require("node:crypto");
const { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const [origin, out, manifestPath, ...names] = process.argv.slice(2);
const only = new Set(names);
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
const JPEG_QUALITY = 76;

const ORDERED_AT = "2026-10-10T12:41:00+02:00";
// La barre des catégories, une fois collée en haut, descendue sous la caméra du cadre de téléphone
// (components/pitch/pitch.css : son bas tombe à ≈ 24 px) : les onglets passent sous le point noir.
const STATUS_BAR = 32;
const HIDE = `nextjs-portal{display:none!important}nav[aria-label="Catégories"]{padding-top:${STATUS_BAR}px}`;
const PHONE = { width: 390, height: 844 };
// Les quatre écrans de « La solution », que le deck recadre : la carte mise en page sur 280 px puis
// rendue à la taille des autres captures, comme le zoom d'affichage d'un téléphone. Le texte y est
// 39 % plus grand, lisible dans les colonnes de la diapositive et le défilement de la page.
const ZOOMED_WIDTH = 280;
// Les positions utiles à chaque recadrage (lib/pitch/bai-ko.ts), dans le repère de 390 × 844 des captures.
const UNITS = (width) => (value) => Math.round((value * PHONE.width) / width);

const settle = (page, ms = 800) => page.waitForTimeout(ms);
async function shot(page, name) {
  if (only.size && !only.has(name)) return;
  const jpeg = await page.screenshot({ type: "jpeg", quality: JPEG_QUALITY });
  const file = `${name}.${createHash("sha256").update(jpeg).digest("hex").slice(0, 10)}.jpg`;
  for (const old of readdirSync(out)) if (old.startsWith(`${name}.`) && old !== file) rmSync(join(out, old));
  writeFileSync(join(out, file), jpeg);
  manifest[name] = file;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log("✓", file);
}

const wanted = (prefix) => !only.size || [...only].some((name) => name.startsWith(prefix));

(async () => {
  const browser = await chromium.launch();
  if (wanted("phone-")) await phone(browser);
  if (wanted("salle-")) await room(browser);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });

/** La carte de la table 7, sur un téléphone de layoutWidth px de large rendu en 1 170 × 2 532. */
async function openCarte(browser, layoutWidth) {
  const ctx = await browser.newContext({
    viewport: { width: layoutWidth, height: Math.round((PHONE.height * layoutWidth) / PHONE.width) },
    deviceScaleFactor: (3 * PHONE.width) / layoutWidth,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    isMobile: true,
    hasTouch: true,
  });
  await ctx.addCookies([{ name: "ominin-consent", value: "denied", url: origin }]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(120_000);
  await page.clock.install({ time: new Date(ORDERED_AT) });
  await page.goto(`${origin}/menu/demo/bai-ko?table=7`, { waitUntil: "load", timeout: 180_000 });
  await page.addStyleTag({ content: HIDE });
  await page.evaluate(() => document.fonts.ready);
  await settle(page, 1500);
  return { ctx, page };
}

/** La carte d'un plat, posée gap px sous la barre des catégories collée en haut. */
async function scrollToDish(page, name, gap) {
  const card = page.getByRole("button", { name: new RegExp(`^(Choisir|Ajouter) : ${name}$`) }).locator("xpath=ancestor::*[self::article or self::li][1]");
  await card.evaluate((node, offset) => {
    const nav = document.querySelector('nav[aria-label="Catégories"]').getBoundingClientRect().height;
    window.scrollBy({ top: node.getBoundingClientRect().top - nav - offset, behavior: "instant" });
  }, gap);
  await settle(page, 1200);
  return card;
}

async function logBoxes(page, label, locators, toUnits) {
  const boxes = [];
  for (const locator of locators) {
    const box = await locator.boundingBox();
    if (box) boxes.push(`${toUnits(box.y)}–${toUnits(box.y + box.height)}`);
  }
  console.log(label, boxes.join(" "));
}

async function phone(browser) {
  if (wanted("phone-partage")) {
    // Une carte entière, photo comprise : le Corn Cheese et son fromage filé, le sujet de leurs vidéos les plus vues.
    const { ctx, page } = await openCarte(browser, PHONE.width);
    const card = await scrollToDish(page, "Corn Cheese", 16);
    await logBoxes(page, "phone-partage, carte", [card], UNITS(PHONE.width));
    await shot(page, "phone-partage");
    await ctx.close();
  }
  if (["phone-menu", "phone-composer", "phone-commande", "phone-envoyee"].some(wanted)) await solutionScreens(browser);
}

async function solutionScreens(browser) {
  const { ctx, page } = await openCarte(browser, ZOOMED_WIDTH);
  const units = UNITS(ZOOMED_WIDTH);
  const card = await scrollToDish(page, "Dak Bap Spicy", 24);
  await logBoxes(page, "phone-menu, carte · photo · allergènes", [card, card.locator("img"), card.getByText(/^Allergènes/)], units);
  await shot(page, "phone-menu");

  const dialog = page.getByRole("dialog");
  const pick = async (name) => {
    await dialog.getByRole("radio", { name }).first().locator("xpath=ancestor::label[1]").click();
    await settle(page, 700);
  };
  await page.getByRole("button", { name: "Choisir : Dak Bap Spicy" }).click();
  await settle(page, 1000);
  await pick(/^Dolsot/);
  await logBoxes(page, "phone-composer, feuille", [dialog], units);
  await shot(page, "phone-composer");
  await page.getByRole("button", { name: /^Ajouter · / }).click();
  await settle(page, 900);

  await page.getByRole("button", { name: "Ajouter : Kimchi", exact: true }).click();
  await settle(page, 900);

  await page.getByRole("button", { name: /^Voir la commande/ }).click();
  await settle(page, 1200);
  // Le bouton de la vraie carte : l'aperçu dit « voir la confirmation », le client lit « Envoyer la commande ».
  const submit = await page.getByRole("button", { name: "Aperçu : voir la confirmation" }).elementHandle();
  await submit.evaluate((node) => (node.textContent = "Envoyer la commande"));
  await logBoxes(page, "phone-commande, Retour · envoi", [dialog.getByRole("button", { name: "Retour" }), dialog.getByRole("button", { name: "Envoyer la commande" })], units);
  await shot(page, "phone-commande");
  await submit.click();
  await settle(page, 1500);
  // La mention de l'aperçu part aussi : à table, la confirmation n'en a pas.
  await page.getByText(/^Aperçu.*rien.*envoyé/).evaluate((node) => node.remove());
  await settle(page, 600);
  await logBoxes(page, "phone-envoyee, feuille", [dialog], units);
  await shot(page, "phone-envoyee");
  await ctx.close();
}

async function room(browser) {
  // La salle au coup de feu, figée ; la démo tient son heure (12 h 43), l'horloge figée l'arrête là.
  const tablet = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, locale: "fr-FR", timezoneId: "Europe/Paris" });
  await tablet.clock.setFixedTime(new Date("2026-10-10T12:43:00+02:00"));
  await tablet.addCookies([{ name: "ominin-consent", value: "denied", url: origin }]);
  const salle = await tablet.newPage();
  salle.setDefaultTimeout(120_000);
  await salle.goto(`${origin}/menu/demo/bai-ko/salle?scenario=fige`, { waitUntil: "load", timeout: 180_000 });
  // Sans le fondu du bas d'écran : il couvrait la fin de la rangée de la table 7 ; sans le lien « Voir le
  // service en direct », propre à la démo. Sans l'en-tête collé non plus, qu'aucun recadrage ne montre :
  // sous lui, les deux rangées (avec « Déjà servi », la première a grandi) ne tenaient plus dans l'écran.
  await salle.addStyleTag({ content: "nextjs-portal{display:none!important}.bg-gradient-to-t.fixed.bottom-0{display:none}a[href$='/salle']{display:none!important}header{visibility:hidden}" });
  await salle.evaluate(() => document.fonts.ready);
  await settle(salle, 2500);
  // Les tables 10, 5 et 7 (celle que suit le deck), puis 14 et 12, en haut de l'écran : les deux rangées
  // tiennent entières, les cartes d'au-dessus sortent de l'écran.
  await salle.locator('[data-table="10"]').evaluate((node) => {
    window.scrollBy({ top: node.getBoundingClientRect().top - 12, behavior: "instant" });
  });
  await settle(salle, 600);
  await shot(salle, "salle-service");
  for (const table of [10, 5, 7, 12, 14]) console.log(`table ${table}`, JSON.stringify(await salle.locator(`[data-table="${table}"]`).boundingBox()));
  await tablet.close();
}

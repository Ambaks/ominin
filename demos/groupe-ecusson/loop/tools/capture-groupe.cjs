// Captures de la vue groupe pour un tour de notation : largeurs, mouvement réduit,
// fenêtres, direct accéléré, débordements et erreurs console.
//   pw.sh capture-groupe.cjs <origine> <dossier>
const { chromium } = require("playwright");
const fs = require("fs");
const origin = process.argv[2] ?? "http://localhost:5200";
const out = process.argv[3];
fs.mkdirSync(out, { recursive: true });
const path = "/menu/demo/groupe/ckl";
const fixed = "?heure=19:40&jour=2026-10-10&vitesse=0";
const report = [];

(async () => {
  const browser = await chromium.launch();
  const shot = async (name, { width, height, query = fixed, full = true, reduced = false, then } = {}) => {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width < 500 ? 2 : 1, reducedMotion: reduced ? "reduce" : "no-preference" });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(origin + path + query, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await page.waitForTimeout(3000);
    // La semaine se découvre au défilement : on la fait défiler une fois pour la page entière.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (then) await then(page);
    // Une capture pleine page ne défile pas : la semaine, révélée au défilement, y resterait cachée.
    if (full) await page.addStyleTag({ content: "[data-reveal]{opacity:1!important;transform:none!important;animation:none!important}.groupe-grow{animation:none!important}" });
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: full });
    report.push(`${name} ${width}x${height}${reduced ? " reduced" : ""}: overflow ${overflow}px, console errors ${errors.length}${errors.length ? " — " + errors.slice(0, 3).join(" | ") : ""}`);
    await context.close();
  };
  await shot("desktop-1440", { width: 1440, height: 900 });
  await shot("desktop-1440-top", { width: 1440, height: 900, full: false });
  await shot("wall-1920", { width: 1920, height: 1080, full: false });
  await shot("tablet-768", { width: 768, height: 1024 });
  await shot("phone-390", { width: 390, height: 844 });
  await shot("phone-320", { width: 320, height: 568 });
  await shot("week-scrolled-1440", { width: 1440, height: 900, full: false, then: async (p) => { await p.locator("#semaine").scrollIntoViewIfNeeded(); await p.mouse.wheel(0, 300); await p.waitForTimeout(900); } });
  await shot("reduced-1440", { width: 1440, height: 900, full: false, reduced: true });
  await shot("hypotheses", { width: 1440, height: 900, full: false, then: async (p) => { await p.getByRole("button", { name: "Hypothèses" }).click(); await p.waitForTimeout(400); } });
  await shot("cartes", { width: 1440, height: 900, full: false, then: async (p) => { await p.getByRole("button", { name: /Côté client/ }).first().click(); await p.waitForTimeout(400); } });
  await shot("chart-hover", { width: 1440, height: 900, full: false, then: async (p) => {
    const bars = p.locator("[aria-label^=\"Ventes du jour\"] button");
    await bars.nth(10).scrollIntoViewIfNeeded(); await bars.nth(10).click(); await p.waitForTimeout(300);
  } });
  await shot("morning-0700", { width: 1440, height: 900, full: false, query: "?heure=07:00&jour=2026-10-10&vitesse=0" });
  await shot("phone-card-open", { width: 390, height: 844, full: false, then: async (p) => {
    const b = p.getByRole("button", { name: /Tables, service/ }).first(); await b.scrollIntoViewIfNeeded(); await b.click(); await p.waitForTimeout(300);
  } });
  await shot("phone-feed-open", { width: 390, height: 844, full: false, then: async (p) => {
    const b = p.getByRole("button", { name: /Voir les/ }); await b.scrollIntoViewIfNeeded(); await b.click(); await p.waitForTimeout(300);
  } });
  // Le direct, accéléré : deux instants à 4 s d'écart.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(origin + path + "?heure=19:30&jour=2026-10-10&vitesse=30", { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/live-a.png` });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/live-b.png` });
  await context.close();
  await browser.close();
  fs.writeFileSync(`${out}/report.txt`, report.join("\n") + "\n");
  console.log(report.join("\n"));
})();

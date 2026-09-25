// Captures d'écran réparties du haut en bas de la page, pour la regarder
// comme un client la ferait défiler.
//
//   pw.sh tour.cjs <url> <prefixe> [largeur=390] [hauteur=844] [nombre=6]
//
// Écrit <prefixe>-00.png … — LIS-LES, ne te contente pas du compte rendu.
const { chromium } = require("playwright");

const [url, prefix, w = "390", h = "844", n = "6"] = process.argv.slice(2);
if (!url || !prefix) {
  console.error("usage : pw.sh tour.cjs <url> <prefixe> [largeur] [hauteur] [nombre]");
  process.exit(2);
}

(async () => {
  const width = Number(w), height = Number(h), count = Math.max(2, Number(n));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  // Un robot de recette ne doit jamais compter comme visite d'un client réel.
  await page.route(/\/rpc\/menu_track/, (route) => route.abort());
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  // Pastille des outils de dev de Next : absente en production, parasite ici.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(1500);

  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let i = 0; i < count; i++) {
    const y = Math.round((total - height) * (i / (count - 1)));
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(1100);
    await page.screenshot({ path: `${prefix}-${String(i).padStart(2, "0")}.png` });
  }
  console.log(`hauteur de page ${total}px — ${count} captures ${prefix}-00..${String(count - 1).padStart(2, "0")}.png`);
  if (errors.length) console.log("ERREURS :\n  " + [...new Set(errors)].slice(0, 10).join("\n  "));
  await browser.close();
})();

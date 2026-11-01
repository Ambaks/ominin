// Rend index.html en PDF, fond perdu compris. Usage : node render.cjs <dossier> <playwright-core> <sortie.pdf>
const path = require("path");
const [, , folder, playwrightPath, output] = process.argv;
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${path.resolve(folder, "index.html")}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: output, preferCSSPageSize: true, printBackground: true });
  await browser.close();
})();

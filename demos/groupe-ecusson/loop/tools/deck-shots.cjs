// Chaque diapositive de la présentation, dans son état final (mouvement réduit), plus une planche.
//   pw.sh deck-shots.cjs <origine> <dossier>
const { chromium } = require("playwright");
const fs = require("fs");
const [origin = "http://localhost:5200", out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(origin + "/groupe-ckl/presentation", { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    const frames = page.locator(".deck-frame");
    const n = await frames.count();
    for (let i = 0; i < n; i++) {
      await frames.nth(i).scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await frames.nth(i).screenshot({ path: `${out}/s${String(i + 1).padStart(2, "0")}.png` });
    }
    console.log(`${n} slides, errors: ${errors.length} ${errors.slice(0, 3).join(" | ")}`);
  } finally {
    await browser.close();
  }
})();

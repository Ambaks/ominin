/*
 * Exporte la présentation d'un pitch (<chemin>/presentation, ex. /chicken-street)
 * en PDF : une page 1 920 × 1 080 par diapositive, texte sélectionnable et
 * liens cliquables. N'écrit que le fichier PDF.
 *
 * Usage, depuis frontend/, un serveur Next lancé :
 *   ../.claude/skills/new-restaurant/scripts/pw.sh scripts/pitch-pdf.mjs <chemin> [origine] [fichier.pdf]
 * Défauts : http://localhost:3000, ./<pitch>-ominin.pdf. Contre la
 * production, l'origine est https://ominin.com — le QR code et l'adresse
 * imprimés sont alors ceux de menu.ominin.com.
 *
 * Playwright n'est pas une dépendance du projet : pw.sh le trouve dans le
 * cache npx et le passe par NODE_PATH, que seul require() consulte — d'où
 * createRequire pour ce seul module.
 */
import { statSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const { chromium } = createRequire(import.meta.url)("playwright");

const path = process.argv[2]?.replace(/\/+$/, "");
if (!path?.startsWith("/")) {
  console.error("Usage : pitch-pdf.mjs <chemin du pitch, ex. /big-smash> [origine] [fichier.pdf]");
  process.exit(1);
}
const origin = process.argv[3] ?? "http://localhost:3000";
const output = resolve(process.argv[4] ?? `${path.slice(1)}-ominin.pdf`);

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  // Pas de bannière de consentement dans le document.
  await context.addCookies([{ name: "ominin-consent", value: "denied", url: origin }]);
  const page = await context.newPage();
  await page.goto(`${origin}${path}/presentation`, { waitUntil: "networkidle" });
  // L'indicateur du serveur de dev ne doit pas finir imprimé.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((image) => {
        image.loading = "eager";
        return image.decode().catch(() => undefined);
      })
    );
  });
  const slides = await page.locator(".deck-frame").count();
  await page.pdf({ path: output, preferCSSPageSize: true, printBackground: true });
  await browser.close();
  const megabytes = (statSync(output).size / 1_048_576).toFixed(1);
  console.log(`✓ ${slides} diapositives · ${megabytes} Mo · ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

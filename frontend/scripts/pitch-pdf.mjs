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
  // Garde-fou : un texte ou une image qui déborde sur le pied de page (sources, numéro) l'imprimerait
  // par-dessus. Le PDF n'est pas écrit tant qu'une diapositive déborde.
  await page.emulateMedia({ media: "print" });
  const overprints = await page.evaluate(overlapsFooter);
  if (overprints.length) {
    console.error(`✗ Texte sur le pied de page :\n${overprints.join("\n")}`);
    process.exit(1);
  }
  await page.pdf({ path: output, preferCSSPageSize: true, printBackground: true });
  await browser.close();
  const megabytes = (statSync(output).size / 1_048_576).toFixed(1);
  console.log(`✓ ${slides} diapositives · ${megabytes} Mo · ${output}`);
}

/**
 * Dans la page : pour chaque diapositive, ce qui, dans son contenu, chevauche
 * le texte de son pied de page (sources, numéro) — les lignes de texte, une
 * par rectangle de leur Range, et la partie visible des images.
 * « 07 : Une serveuse seule… » par diapositive fautive.
 */
function overlapsFooter() {
  const meets = (a, b) => a.bottom > b.top && a.top < b.bottom && a.right > b.left && a.left < b.right && a.width > 0 && a.height > 0;
  const textRects = (root) => {
    const rects = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      rects.push(...[...range.getClientRects()].map((rect) => ({ rect, text: node.textContent.trim().slice(0, 48) })));
    }
    return rects;
  };
  // Une capture recadrée déborde de son cadre, qui la coupe : seule compte sa partie visible.
  const visible = (element) => {
    let { left, top, right, bottom } = element.getBoundingClientRect();
    for (let parent = element.parentElement; parent && !parent.classList.contains("deck-slide"); parent = parent.parentElement) {
      if (getComputedStyle(parent).overflow === "visible") continue;
      const clip = parent.getBoundingClientRect();
      left = Math.max(left, clip.left);
      top = Math.max(top, clip.top);
      right = Math.min(right, clip.right);
      bottom = Math.min(bottom, clip.bottom);
    }
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  };
  return [...document.querySelectorAll(".deck-slide")].flatMap((slide, i) => {
    const footer = slide.querySelector(":scope > div > footer");
    const footerText = textRects(footer).map(({ rect }) => rect);
    const content = footer.previousElementSibling;
    const hits = [
      ...textRects(content).filter(({ rect }) => footerText.some((box) => meets(rect, box))).map(({ text }) => text),
      ...[...content.querySelectorAll("img, svg")].filter((image) => footerText.some((box) => meets(visible(image), box))).map((image) => `<${image.tagName.toLowerCase()}>`),
    ];
    return hits.length ? [`${String(i + 1).padStart(2, "0")} : ${hits[0]}`] : [];
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

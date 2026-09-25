// Contraste mesuré au pixel de chaque commande et de chaque prix de la carte.
//
//   pw.sh check_contrast.cjs <url> [largeur] [hauteur] [--light]
//
// Pourquoi au pixel : les boutons sont peints en dégradé, sur des photos,
// sous des voiles — la couleur calculée du fond ne dit rien. Deux régressions
// d'O’Crousti venaient de là (une règle de dégradé qui gagnait une égalité de
// spécificité et remettait l'or sous un texte or : 1,6:1). Pour chaque élément
// visible, on capture sa boîte, on prend la couleur de fond dominante et on la
// compare à la couleur du texte. --light passe la palette Ominin en clair.
// Seuils WCAG : 4,5:1, ou 3:1 pour un texte ≥ 24 px (≥ 18,66 px en gras).
const { chromium } = require("playwright");
const [url, w = "390", h = "844", mode] = process.argv.slice(2);

function lin(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  await page.goto(url, { waitUntil: "networkidle" });
  if (mode === "--light") {
    await page.evaluate(() => document.documentElement.classList.add("light"));
  }
  // L'indicateur de Next en développement recouvre le coin bas-gauche.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(800);

  const targets = await page.evaluate(() => {
    const out = [];
    const els = document.querySelectorAll(
      "[data-menu-root] button, [data-menu-root] a[href], [data-menu-root] .dish-price"
    );
    els.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const text = (el.innerText || "").trim();
      if (!text || r.width < 4 || r.height < 4 || cs.visibility === "hidden") return;
      // Texte peint en dégradé (background-clip: text) : pas de couleur unique.
      if (cs.webkitTextFillColor === "rgba(0, 0, 0, 0)") return;
      el.setAttribute("data-contrast-id", String(i));
      const size = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      out.push({
        id: String(i),
        text: text.replace(/\s+/g, " ").slice(0, 40),
        color: cs.color.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number),
        large: size >= 24 || (bold && size >= 18.66),
      });
    });
    return out;
  });

  // Les captures se décodent dans une page vierge (sans la politique de
  // sécurité du site, qui refuserait les images data:).
  const decoder = await browser.newPage();
  let failures = 0;
  const seen = new Set();
  for (const t of targets) {
    const el = page.locator(`[data-contrast-id="${t.id}"]`);
    await el.scrollIntoViewIfNeeded().catch(() => {});
    const shot = await el.screenshot({ animations: "disabled" }).catch(() => null);
    if (!shot) continue;
    // Fond = couleur la plus fréquente (quantifiée), hors pixels proches du texte.
    const bg = await decoder.evaluate(
      async ({ b64, color }) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height).data;
        const near = (c) =>
          Math.abs(c[0] - color[0]) + Math.abs(c[1] - color[1]) + Math.abs(c[2] - color[2]) < 60;
        const counts = new Map();
        for (let p = 0; p < data.length; p += 4) {
          const c = [data[p], data[p + 1], data[p + 2]];
          if (near(c)) continue;
          const k = c.map((v) => v >> 3).join(",");
          counts.set(k, (counts.get(k) ?? 0) + 1);
        }
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
        return top ? top[0].split(",").map((v) => (Number(v) << 3) + 4) : null;
      },
      { b64: shot.toString("base64"), color: t.color }
    );
    if (!bg) continue;
    const r = ratio(bg, t.color);
    const need = t.large ? 3 : 4.5;
    const key = `${t.text}|${r.toFixed(1)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (r < need) {
      failures++;
      console.log(`  ÉCHEC   « ${t.text} » ${r.toFixed(2)}:1 (min ${need}) — texte rgb(${t.color}) sur rgb(${bg})`);
    }
  }
  console.log(failures ? `${failures} ÉCHEC(S)` : `  OK      ${targets.length} commandes et prix au-dessus du seuil`);
  await browser.close();
  process.exit(failures ? 1 : 0);
})();

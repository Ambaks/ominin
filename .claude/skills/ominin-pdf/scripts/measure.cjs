// Relève chaque page et ses panneaux de verre pour glass.py, et refuse un texte qui déborde. Usage : node measure.cjs <dossier> <playwright-core>
const fs = require("fs");
const path = require("path");
const [, , folder, playwrightPath] = process.argv;
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1270 } });
  await page.goto(`file://${path.resolve(folder, "index.html")}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const { pages, overflow, soft } = await page.evaluate(() => {
    const numbers = (value) => (value ? value.split(",").map(Number) : null);
    const rect = (el, origin) => {
      const box = el.getBoundingClientRect();
      return {
        x: box.left - origin.left,
        y: box.top - origin.top,
        w: box.width,
        h: box.height,
        radius: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 18,
      };
    };
    // Un flou imprimé par Chromium devient un rectangle gris sur iPhone et dans Aperçu.
    const blurred = (el) => {
      const style = getComputedStyle(el);
      const lengths = /-?[\d.]+px -?[\d.]+px ([\d.]+)px/g;
      return [style.boxShadow, style.textShadow].some((value) => [...value.matchAll(lengths)].some((match) => parseFloat(match[1]) > 0)) || /blur|drop-shadow/.test(style.filter);
    };
    const all = [...document.querySelectorAll(".page")];
    return {
      overflow: all.flatMap((p, i) => {
        const inner = p.querySelector(".inner");
        return inner && inner.scrollHeight > inner.clientHeight + 1 ? [i + 1] : [];
      }),
      soft: all.flatMap((p, i) => [p, ...p.querySelectorAll("*")].filter(blurred).map((el) => `page ${i + 1} : ${el.tagName.toLowerCase()}.${el.className}`)),
      pages: all.map((p) => {
        const origin = p.getBoundingClientRect();
        const chevron = p.dataset.chevron === "none" ? null : numbers(p.dataset.chevron);
        return {
          width: origin.width,
          height: origin.height,
          theme: p.dataset.theme === "paper" ? "paper" : "dark",
          chevron,
          clear: numbers(p.dataset.clear) ?? [0, origin.height],
          panels: [...p.querySelectorAll(".glass")].map((el) => ({ ...rect(el, origin), solid: el.classList.contains("solid") })),
          devices: [...p.querySelectorAll(".phone, .tablet")].map((el) => rect(el, origin)),
        };
      }),
    };
  });
  fs.writeFileSync(path.resolve(folder, "rects.json"), JSON.stringify(pages));
  await browser.close();
  if (soft.length) {
    console.error(`Ombre ou flou CSS interdit (rectangle gris sur iPhone et dans Aperçu) :\n${[...new Set(soft)].join("\n")}`);
    process.exit(1);
  }
  if (overflow.length) {
    console.error(`Texte qui déborde, page(s) ${overflow.join(", ")}`);
    process.exit(1);
  }
})();

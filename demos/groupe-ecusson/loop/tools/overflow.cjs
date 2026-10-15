const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(process.argv[2], { waitUntil: "networkidle" });
  await p.waitForTimeout(2000);
  const r = await p.evaluate(() => {
    const W = window.innerWidth; const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const rect = el.getBoundingClientRect();
      if (el.closest(".overflow-x-auto")) continue;
      if (rect.right > W + 1 && rect.width > 0) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 90)} right=${Math.round(rect.right)} w=${Math.round(rect.width)}`);
    }
    return out.slice(0, 12);
  });
  console.log(r.join("\n"));
  await b.close();
})();

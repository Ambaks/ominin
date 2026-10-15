// La présentation lue au téléphone (vue défilante) et en mode présentation sur un portable.
const { chromium } = require("playwright");
const fs = require("fs");
const [origin = "http://localhost:5200", out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  try {
    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await phone.goto(origin + "/groupe-ckl/presentation", { waitUntil: "networkidle" });
    await phone.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    for (let i = 0; i < 4; i++) {
      await phone.waitForTimeout(1200);
      await phone.screenshot({ path: `${out}/phone-${i + 1}.png` });
      await phone.mouse.wheel(0, 700);
    }
    const laptop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await laptop.goto(origin + "/groupe-ckl/presentation", { waitUntil: "networkidle" });
    await laptop.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await laptop.waitForTimeout(1500);
    await laptop.screenshot({ path: `${out}/laptop-top.png` });
    const present = laptop.getByRole("button", { name: /Présenter/ }).first();
    if (await present.count()) {
      await present.click();
      await laptop.waitForTimeout(1500);
      await laptop.screenshot({ path: `${out}/present-1.png` });
      await laptop.keyboard.press("ArrowRight");
      await laptop.waitForTimeout(300);
      await laptop.screenshot({ path: `${out}/present-2-mid.png` });
      await laptop.waitForTimeout(1500);
      await laptop.screenshot({ path: `${out}/present-2.png` });
      for (let i = 0; i < 6; i++) { await laptop.keyboard.press("ArrowRight"); await laptop.waitForTimeout(900); }
      await laptop.screenshot({ path: `${out}/present-8.png` });
    }
  } finally {
    await browser.close();
  }
})();

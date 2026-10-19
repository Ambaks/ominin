import { mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { CLIPS } from "../../frontend/lib/social/clips.ts";
import { DEMO_SLUG } from "../../frontend/lib/menu/format.ts";
import { collectSiteUrl, menuSiteUrl } from "../../frontend/lib/site.ts";

/*
 * Démos filmées des Reels (catalogue : frontend/lib/social/clips.ts). Chaque
 * parcours est joué par Playwright sur une démo publique aux données
 * fictives, dans un téléphone, et filmé. Rien n'est envoyé : la carte Menu
 * s'arrête au panier, la démo Collect simule le paiement.
 *
 * L'enregistrement commence à l'ouverture de la page ; chaque parcours
 * marque le moment où l'écran est prêt (start), et la scène du Reel ne
 * garde que ce qui suit.
 */

const VIEWPORT = { width: 390, height: 844 };
/* Les captures du catalogue ont la même définition (780 × 1688). */
const VIDEO = { width: 780, height: 1688 };
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

/* La démo Collect pose ses deux volets dans des cadres de démonstration ;
 * filmé, le volet doit remplir l'écran. Les bascules client / restaurant
 * restent cliquables par le DOM (dispatchEvent) sous ce volet. */
const COLLECT_FULLSCREEN = `
[data-demo-phone], section[aria-label="Démo — votre espace de gestion"] {
  position: fixed !important; inset: 0 !important; z-index: 9999 !important;
  max-width: none !important; width: 100vw !important; height: 100vh !important;
  border-radius: 0 !important; border: 0 !important; box-shadow: none !important;
  --demo-pane-h: 844px; --demo-restaurant-h: 844px;
}
section[aria-label="Démo — votre espace de gestion"] > div { border-radius: 0 !important; border: 0 !important; height: 100%; }
section[aria-label="Démo — votre espace de gestion"] > div > div[aria-hidden="true"]:first-child { display: none !important; }
`;

type Mark = () => void;
type Recorder = (page: Page, start: Mark) => Promise<void>;

const pause = (page: Page, ms: number) => page.waitForTimeout(ms);
const menuUrl = `${menuSiteUrl}/m/${DEMO_SLUG}?table=12`;
const collectDemoUrl = `${collectSiteUrl}/demo`;

async function openCollect(page: Page) {
  await page.goto(collectDemoUrl, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: COLLECT_FULLSCREEN });
  await pause(page, 800);
}

/** Collect, jusqu'au paiement simulé, puis bascule côté restaurant. */
async function payCollectOrder(page: Page) {
  for (const dish of ["Margherita D.O.P.", "Spaghetti alla carbonara", "Tiramisù de la nonna"]) {
    await page.getByRole("button", { name: `Ajouter : ${dish}` }).dispatchEvent("click");
    await pause(page, 500);
  }
  await page.getByRole("button", { name: /Commander/ }).dispatchEvent("click");
  await pause(page, 1500);
  await page.getByRole("button", { name: /Payer/ }).dispatchEvent("click");
  await pause(page, 6000);
}

const RECORDERS: Record<string, Recorder> = {
  "menu-carte": async (page, start) => {
    await page.goto(menuUrl, { waitUntil: "networkidle" });
    await pause(page, 1200);
    start();
    for (let step = 0; step < 6; step++) {
      await page.evaluate(() => window.scrollBy({ top: 420, behavior: "smooth" }));
      await pause(page, 900);
    }
  },
  "menu-commande": async (page, start) => {
    await page.goto(menuUrl, { waitUntil: "networkidle" });
    const diavola = page.getByRole("button", { name: /Ajouter : Diavola/ });
    await diavola.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 300));
    await pause(page, 1000);
    start();
    await page.getByRole("button", { name: /Choisir : Margherita/ }).click();
    await pause(page, 1000);
    await page.getByText("Grande 33 cm").click();
    await pause(page, 800);
    await page.locator("button", { hasText: /Ajouter|Valider|€/ }).last().click();
    await pause(page, 900);
    await diavola.click();
    await pause(page, 700);
    await page.getByRole("button", { name: /Ajouter : Tiramisù/ }).click();
    await pause(page, 900);
    await page.getByRole("button", { name: /Voir la commande/ }).click();
    await pause(page, 2200);
  },
  "collect-commande": async (page, start) => {
    await openCollect(page);
    start();
    await payCollectOrder(page);
  },
  "collect-cuisine": async (page, start) => {
    await openCollect(page);
    await payCollectOrder(page);
    await page.getByRole("button", { name: "Côté restaurant", exact: true }).dispatchEvent("click");
    await pause(page, 1200);
    start();
    await pause(page, 1200);
    await page.locator("[data-action]").first().dispatchEvent("click");
    await pause(page, 1500);
    await page.getByRole("button", { name: "15 min", exact: true }).dispatchEvent("click");
    await pause(page, 2500);
  },
  "collect-suivi": async (page, start) => {
    await openCollect(page);
    await payCollectOrder(page);
    await page.getByRole("button", { name: "Côté restaurant", exact: true }).dispatchEvent("click");
    await pause(page, 1000);
    await page.locator("[data-action]").first().dispatchEvent("click");
    await pause(page, 1000);
    await page.getByRole("button", { name: "15 min", exact: true }).dispatchEvent("click");
    await pause(page, 1000);
    await page.getByRole("button", { name: "Côté client", exact: true }).dispatchEvent("click");
    await pause(page, 800);
    start();
    await pause(page, 4000);
  },
};

const missing = CLIPS.filter((clip) => !(clip.id in RECORDERS));
if (missing.length) {
  throw new Error(`Démos sans enregistreur : ${missing.map((c) => c.id).join(", ")}`);
}

export interface Recording {
  /** Chemin relatif au dossier public du bundle. */
  file: string;
  start: number;
  seconds: number;
}

/** Filme les démos demandées dans <publicDir>/clips. */
export async function recordClips(
  ids: string[],
  publicDir: string,
): Promise<Map<string, Recording>> {
  const recordings = new Map<string, Recording>();
  if (!ids.length) return recordings;
  const dir = join(publicDir, "clips");
  await mkdir(dir, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const id of ids) {
      const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        locale: "fr-FR",
        userAgent: IPHONE,
        recordVideo: { dir, size: VIDEO },
      });
      const opened = Date.now();
      let start = 0;
      const page = await context.newPage();
      await RECORDERS[id](page, () => {
        start = (Date.now() - opened) / 1000;
      });
      const seconds = (Date.now() - opened) / 1000 - start;
      await context.close();
      const file = `clips/${id}.webm`;
      await rename(await page.video()!.path(), join(publicDir, file));
      recordings.set(id, { file, start, seconds });
    }
  } finally {
    await browser.close();
  }
  return recordings;
}

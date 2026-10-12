/*
 * Captures of the live demo for the film, re-runnable at will:
 *   node scripts/capture.mjs [phone] [salle] [collect]   (all by default)
 * against the baiko-pitch dev server (CAPTURE_URL overrides it).
 * Writes WebP files and manifest.json (sizes, tap targets, scroll offsets)
 * into public/captures/, which the scenes read.
 *
 * The one order followed on every screen is table 7's in the salle fixture
 * (frontend/app/menu/demo/[slug]/salle/fixtures.ts): a Dak Bap Spicy in its
 * dolsot and a kimchi, ordered at 12:41 from the table, paid online.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.CAPTURE_URL ?? "http://localhost:4600";
const SLUG = "bai-ko";
const TABLE = 7;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "captures");
const MANIFEST = join(OUT, "manifest.json");

// The phone orders at 12:41; the room tablet's clock is set so table 7's order lands on the same minute (captureSalle).
const ORDERED_AT = "2026-10-10T12:41:00+02:00";
const ORDER_TIME = new Date(ORDERED_AT).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
// The main dish and its one choice, in the sheet's order; the ticket prints the choice as the app names it.
const MAIN = { category: "Bibimbap", name: "Dak Bap Spicy", choices: [["Version", /^Dolsot/, "radio", 0]] };
const SIDE = { category: "Sides", name: "Kimchi" };

// The phone's page area: its screen (393 × 852) under the status bar the film draws.
const PHONE = { width: 393, height: 798, scale: 3 };
const TABLET = { width: 1180, height: 820, scale: 2 };

// The Next dev badge, and the carte's ticker held still: the film reads it, it does not race it.
const HIDE_DEV = "nextjs-portal{display:none!important}.menu-ticker-track{animation:none!important}";

const settle = (page, ms = 700) => page.waitForTimeout(ms);

/** PNG from Playwright, stored as lossless WebP. */
async function shot(page, name, options = {}) {
  const png = join(OUT, `${name}.png`);
  await page.screenshot({ path: png, ...options });
  execFileSync("cwebp", ["-quiet", "-lossless", "-z", "6", png, "-o", join(OUT, `${name}.webp`)]);
  rmSync(png);
  return `captures/${name}.webp`;
}

const rect = async (locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Not on screen: ${locator}`);
  return { x: box.x, y: box.y, width: box.width, height: box.height };
};

/** The first match of `pattern` in `text`, or a clear error naming what was looked for. */
const read = (text, pattern, what) => {
  const match = text.match(pattern);
  if (!match) throw new Error(`No ${what} in: ${text.slice(0, 200)}`);
  return match[1] ?? match[0];
};

async function context(browser, { width, height, scale }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    colorScheme: "dark",
  });
  await ctx.addCookies([{ name: "ominin-consent", value: "denied", url: BASE }]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(15_000);
  return page;
}

/** Top edge of the open sheet's panel, in viewport px. */
const sheetTop = (page) =>
  page.getByRole("dialog").evaluate((dialog) => {
    const panel = dialog.matches('[class*="max-h-"]') ? dialog : dialog.querySelector('[class*="max-h-"]');
    return (panel ?? dialog).getBoundingClientRect().top;
  });

/** The composer sheet's scrolling body. */
const sheetBody = (page) => page.getByRole("dialog").locator("div.overflow-y-auto").last();

/** Scrolls so a card sits mid-screen; returns the scroll. */
const centre = (card) =>
  card.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const top = Math.round(box.top + window.scrollY - (window.innerHeight - box.height) / 2);
    window.scrollTo({ top, behavior: "instant" });
    return top;
  });

async function capturePhone(browser) {
  const page = await context(browser, PHONE);
  await page.clock.install({ time: new Date(ORDERED_AT) });
  await page.goto(`${BASE}/menu/demo/${SLUG}?table=${TABLE}`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: HIDE_DEV });
  await page.evaluate(() => document.fonts.ready);
  // The ticker held on the restaurant's own line, mid-screen: its first one is Uber Eats' delivery.
  await page.locator(".menu-ticker-track").evaluate((track) => {
    const box = track.querySelector('[data-tone="brand"]').getBoundingClientRect();
    track.style.translate = `${window.innerWidth / 2 - (box.left + box.width / 2)}px 0`;
  });
  await settle(page, 1500);

  // The carte, top to the main dish's card, while nothing has been ordered.
  const mainButton = page.getByRole("button", { name: `Choisir : ${MAIN.name}` });
  const mainCard = mainButton.locator("xpath=ancestor::article[1]");
  const menuScroll = await mainCard.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return Math.round(box.top + window.scrollY - (window.innerHeight - box.height) / 2);
  });
  const menuHeight = menuScroll + PHONE.height;
  // The category bar sticks to the top once scrolled past: the film pins a copy of it.
  const categoryBar = await rect(page.locator("nav").first());
  const menu = await shot(page, "phone-menu", { fullPage: true, clip: { x: 0, y: 0, width: PHONE.width, height: menuHeight } });

  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), menuScroll);
  await settle(page);
  const composerTap = await rect(mainButton);
  await mainButton.click();
  await settle(page, 1200);

  const body = sheetBody(page);
  const composerTop = await sheetTop(page);
  const states = [];
  const labels = [];
  const expanded = async (index) => {
    const scrollTop = await body.evaluate((node) => node.scrollTop);
    await page.setViewportSize({ width: PHONE.width, height: 4000 });
    await settle(page, 400);
    const full = await rect(body);
    const content = await shot(page, `phone-main-${index}-body`, { clip: full });
    await page.setViewportSize({ width: PHONE.width, height: PHONE.height });
    await body.evaluate((node, top) => (node.scrollTop = top), scrollTop);
    await settle(page, 400);
    return { content, contentHeight: full.height };
  };
  for (let index = 0; index <= MAIN.choices.length; index++) {
    const scrollTop = await body.evaluate((node) => node.scrollTop);
    const bodyAt = await rect(body);
    const screen = await shot(page, `phone-main-${index}`);
    const { content, contentHeight } = await expanded(index);
    const state = { screen, content, contentHeight, scrollTop, body: bodyAt };
    if (index < MAIN.choices.length) {
      const [, choice, role, nth] = MAIN.choices[index];
      const radio = body.getByRole(role, { name: choice }).nth(nth);
      const row = radio.locator("xpath=ancestor::label[1]");
      // The ticket prints the choice's name: its row's first line, the supplement under it.
      labels.push((await row.innerText()).split("\n")[0].trim());
      const inBody = (box) => ({ ...box, y: box.y - bodyAt.y + scrollTop });
      state.tap = inBody(await rect(row));
      state.radio = inBody(await rect(radio));
      await row.click();
      await settle(page, 1300);
    }
    states.push(state);
  }

  const add = page.getByRole("button", { name: /^Ajouter · / });
  const addTap = await rect(add);
  await add.click();
  await settle(page, 1000);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), menuScroll);
  await settle(page);
  const addedMain = await shot(page, "phone-added-main");

  // The side, its card centered, before and after its tap.
  const sideButton = page.getByRole("button", { name: `Ajouter : ${SIDE.name}`, exact: true });
  const sideCard = sideButton.locator("xpath=ancestor::article[1]");
  await centre(sideCard);
  await settle(page);
  const sideTap = await rect(sideButton);
  const sidePrice = read(await sideCard.innerText(), /\d+,\d\d\s*€/, "side price");
  const side = await shot(page, "phone-side");
  await sideButton.click();
  await settle(page, 1000);
  const added = await shot(page, "phone-added");
  const cartButton = page.getByRole("button", { name: /^Voir la commande/ });
  const cartTap = await rect(cartButton);
  await cartButton.click();
  await settle(page, 1200);

  // The preview's submit reads « Aperçu : voir la confirmation »; at the table it says « Envoyer la commande ».
  const submit = await page.getByRole("button", { name: "Aperçu : voir la confirmation" }).elementHandle();
  const total = read(await page.getByRole("dialog").innerText(), /Total\s*([\d\s ,]+€)/, "cart total").trim();
  await submit.evaluate((node) => (node.textContent = "Envoyer la commande"));
  const payTap = await submit.boundingBox();
  if (!payTap) throw new Error("The cart's submit button is not on screen");
  const cartTop = await sheetTop(page);
  const cart = await shot(page, "phone-cart");

  await page.context().close();
  return {
    viewport: { width: PHONE.width, height: PHONE.height },
    table: TABLE,
    total,
    // The order as the kitchen printer receives it.
    order: {
      at: ORDER_TIME,
      items: [
        { category: MAIN.category, name: MAIN.name, options: MAIN.choices.map(([group], k) => ({ group, choice: labels[k] })) },
        { category: SIDE.category, name: SIDE.name, options: [] },
      ],
    },
    menu: { src: menu, height: menuHeight, scrollTo: menuScroll, composerTap, categoryBar },
    composer: { sheetTop: composerTop, states, addTap },
    added: { main: addedMain, side: { src: side, tap: sideTap, price: sidePrice }, src: added, cartTap },
    cart: { src: cart, sheetTop: cartTop, payTap },
  };
}

/**
 * The room tablet, mid-service: the live room (?scenario=rush, its tables
 * ordering one after another) on a paused clock. The room opens at its own
 * 12:43 (salle/fixtures.ts); set back SALLE_CLOCK.back seconds, its next
 * arrivals come in before it, so table 7 orders at 12:41 as on the phone.
 * The clock then runs on, every timer firing in turn, to SALLE_CLOCK.at: the
 * room as a waiter sees it nine minutes after table 7 ordered.
 */
const SALLE_CLOCK = { back: 150, at: "12:50" };
/** The card leaving the queue, the cards after it sliding up and the header's message rising, sampled every this many ms. */
const LEAVE_STEP_MS = 100;

async function captureSalle(browser) {
  const page = await context(browser, TABLET);
  const opened = new Date(ORDERED_AT).getTime();
  await page.clock.install({ time: opened });
  await page.clock.pauseAt(opened + 1_000);
  await page.goto(`${BASE}/menu/demo/${SLUG}/salle`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: HIDE_DEV });
  await settle(page, 1500);
  await page.clock.setSystemTime(opened + 1_000 - SALLE_CLOCK.back * 1_000);
  const card = page.locator(`[data-table="${TABLE}"]`);
  const clockShows = (hhmm) => page.locator("header").getByText(hhmm, { exact: true }).isVisible();
  for (let second = 0; !(await card.isVisible()) || !(await clockShows(SALLE_CLOCK.at)); second++) {
    if (second > 900) throw new Error(`The room never reached ${SALLE_CLOCK.at} with table ${TABLE}'s card`);
    await page.clock.runFor(1_000);
  }
  await page.clock.runFor(5_000);
  const placed = read(await card.innerText(), /(\d\d:\d\d) · il y a/, "table 7's order time");
  if (placed !== ORDER_TIME) throw new Error(`Table ${TABLE} ordered at ${placed}, the phone at ${ORDER_TIME}`);
  // The film frames the screen as the restaurant's own: no « Démonstration ».
  await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeValue.trim() === "Démonstration") node.nodeValue = "";
    }
  });
  await card.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await settle(page);
  // A line's « Servi » carries it in its accessible name: « Servi : 1× Kimchi ».
  const serve = (name) => card.locator("li").filter({ hasText: name }).getByRole("button", { name: /^Servi\b/ });
  // The side went out first, as sides do: the film comes in on the kimchi already under « Déjà servi ».
  await serve(SIDE.name).click();
  await page.mouse.move(0, 0);
  const message = page.locator("header [aria-live] > *");
  await page.clock.runFor(4_000);
  await message.waitFor({ state: "detached" });
  await settle(page, 500);
  const main = serve(MAIN.name);
  const tap = await rect(main);
  const whole = await rect(card);
  // The card down to its last line and its padding: the row is as tall as its tallest card.
  const content = await card.evaluate((node) => {
    const lines = node.querySelectorAll("li");
    const padding = parseFloat(getComputedStyle(node.querySelector("section")).paddingBottom);
    return lines[lines.length - 1].getBoundingClientRect().bottom + padding - node.getBoundingClientRect().top;
  });
  const before = await shot(page, "tablet-salle");
  // The dish served, the table is: the app takes its card out of the queue, the cards after it
  // slide up and « Table 7 servie. » rises in the header. Held at each step, as the app animates them.
  await main.click();
  await page.mouse.move(0, 0);
  const served = message.filter({ hasText: `Table ${TABLE} servie.` });
  await served.waitFor();
  // The queue's and the header message's animations only: the live dot pulses on.
  const leaving = "[data-table], header [aria-live]";
  const length = await page.evaluate((selector) => {
    const animations = document.getAnimations().filter(({ effect }) => effect.target.closest(selector));
    for (const animation of animations) animation.pause();
    return Math.max(...animations.map(({ effect }) => Number(effect.getTiming().duration)));
  }, leaving);
  const leave = [];
  for (let at = 0; at <= length; at += LEAVE_STEP_MS) {
    await page.evaluate(
      ([selector, time]) =>
        document.getAnimations().forEach((animation) => animation.effect.target.closest(selector) && (animation.currentTime = time)),
      [leaving, at],
    );
    leave.push({ at, src: await shot(page, `tablet-salle-served-${at}`) });
  }
  const toast = await rect(served);
  await page.context().close();
  return {
    viewport: { width: TABLET.width, height: TABLET.height },
    before,
    leave,
    tap,
    card: { ...whole, content },
    served: toast,
    clock: SALLE_CLOCK.at,
  };
}

/** The lunch takeaway: the dish the film prices, at its carte's price. */
const TAKEAWAY_DISH = "Pad Thaï Chicken";

/**
 * The takeaway demo's customer phone (/collect/demo/bai-ko — a demo: its
 * payment is simulated, nothing leaves the page): the dish, a pickup slot,
 * paid. Its screen is set to the film phone's page proportions, its own
 * Dynamic Island hidden under the film's, and its demo notice dropped as on
 * the other screens.
 */
async function captureCollect(browser) {
  const page = await context(browser, { width: 1440, height: 1000, scale: PHONE.scale });
  await page.goto(`${BASE}/collect/demo/${SLUG}`, { waitUntil: "networkidle" });
  const pane = page.locator('[class*="h-[var(--demo-pane-h"]:visible');
  const width = (await rect(pane)).width;
  const height = Math.round((width * PHONE.height) / PHONE.width);
  await page.addStyleTag({ content: `${HIDE_DEV}[class*="--demo-pane-h:"]{--demo-pane-h:${height}px!important}` });
  // The film's phone draws its own island and corners: the demo frame's go.
  await pane.evaluate((node) => {
    for (const chrome of node.parentElement.querySelectorAll(":scope > [aria-hidden]")) chrome.style.display = "none";
    Object.assign(node.parentElement.style, { borderRadius: "0", boxShadow: "none" });
  });
  await page.evaluate(() => document.fonts.ready);
  await settle(page, 1000);
  await pane.getByRole("button", { name: `Ajouter : ${TAKEAWAY_DISH}` }).click();
  await settle(page);
  await pane.getByRole("button", { name: /Commander/ }).click();
  await settle(page, 1000);
  // The first slot with room left, not « dès que possible »: the order is placed for a time.
  const slot = pane.getByRole("button", { name: /^\d\d:\d\d \d+ places?$/ }).first();
  const pickup = read(await slot.innerText(), /\d\d:\d\d/, "pickup slot");
  await slot.click();
  await pane.getByText(/^Démo — paiement simulé/).evaluate((node) => node.remove());
  await settle(page);
  const inPane = async (locator) => {
    const [box, origin] = [await rect(locator), await rect(pane)];
    return { ...box, x: box.x - origin.x, y: box.y - origin.y };
  };
  const pay = pane.getByRole("button", { name: /^Payer/ });
  const payTap = await inPane(pay);
  const checkout = await shot(page, "collect-checkout", { clip: await rect(pane) });
  await pay.click();
  await pane.getByText("Commande reçue !").waitFor({ timeout: 15_000 });
  await settle(page, 1200);
  // The order's time, as the confirmation reads it: « CAMILLE · 12:20 ».
  const at = read(await pane.innerText(), /·\s*(\d\d:\d\d)/, "takeaway order time");
  const paid = await shot(page, "collect-paid", { clip: await rect(pane) });
  await page.context().close();
  return { viewport: { width, height }, dish: TAKEAWAY_DISH, at, pickup, checkout, payTap, paid };
}

const JOBS = { phone: capturePhone, salle: captureSalle, collect: captureCollect };
const wanted = process.argv.slice(2).length > 0 ? process.argv.slice(2) : Object.keys(JOBS);

mkdirSync(OUT, { recursive: true });
let manifest = {};
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch {
  // First run.
}

const browser = await chromium.launch();
try {
  for (const name of wanted) {
    console.log(`capturing ${name}`);
    manifest[name] = await JOBS[name](browser);
    writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  }
} finally {
  await browser.close();
}

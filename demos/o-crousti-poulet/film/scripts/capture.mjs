/*
 * Captures of the live demo for the film, re-runnable at will:
 *   node scripts/capture.mjs [phone] [counter] [network]   (all by default)
 * against the pitch preview, a production build of the shipping frontend
 * (CAPTURE_URL overrides it). A production build has no dev overlay; a dev
 * server also works.
 * Writes WebP files and manifest.json (sizes, tap targets, scroll offsets)
 * into public/captures/, which the scenes read.
 *
 * The one order followed on every screen is the counter fixture's N° 39
 * (frontend/app/menu/demo/[slug]/comptoir/fixtures.ts): a Menu Duo with
 * sauce Verte, Potatoes, Pâtes Crémo, Pepsi and 7Up, plus a Tarte Daim,
 * ordered at 12:35. The phone places 38 throwaway orders first so its preview
 * ticket carries the same number.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE = process.env.CAPTURE_URL ?? "http://localhost:3700";
const SLUG = "o-crousti-poulet";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "captures");
const MANIFEST = join(OUT, "manifest.json");

const ORDER_NUMBER = 39;
const ORDERED_AT = "2026-09-29T12:35:00+02:00";
// The counter fixture dates its orders back from the page's clock: the
// clock is set so that N° 39 was placed at ORDERED_AT.
const COUNTER_FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "../../../../frontend/app/menu/demo/[slug]/comptoir/fixtures.ts");
// The network view at one time, then the same view once N° 39 has come
// in: on top of the live feed, and on Montpellier's row of the day's
// ranking, which it takes one place up. At this time the simulated feed
// shows no other N° 39, no other order like it and no Montpellier order
// (checked at every run), and few orders paid at the till.
const NETWORK_CLOCK = "12:37";
// The same simulated day once every restaurant has closed: its till hours freed, whole.
const NETWORK_DAY_END = "23:59";
// The view's lowest share of orders taken by QR: the conservative case.
const QR_SHARE = "30 %";
// Each choice: its group, its label, and which of the sheet's radios bearing
// that label (the two side dishes and the two cans offer the same lists).
const DUO = {
  category: "Nos Menus",
  name: "Menu Duo",
  // In the sheet's own order: it moves on to the next group after each.
  choices: [
    ["Sauce", "Sauce Verte", 0],
    ["1er accompagnement", "Potatoes", 0],
    ["2e accompagnement", "Pâtes Crémo", 1],
    ["1re canette", "Pepsi", 0],
    ["2e canette", "7Up", 1],
  ],
};
const DESSERT = { category: "Desserts", name: "Tarte Daim" };
// The ready time on the ticket, a minute apart from the order on: the film's time-lapse.
const TICKET_MINUTES = [6, 5, 4, 3];

// The phone's page area: its screen (393 × 852) under the status bar the film draws.
// The panels the film points at on the network view: key, how its heading
// starts (the view's wording is still settling), and the least height of
// the panel that holds it.
const NETWORK_TILES = [
  ["orders", /^Commandes par QR/, 90],
  ["till", /^Attente en caisse/, 90],
  ["sales", /^CA command/, 90],
  ["feed", /^Commandes en direct/, 300],
  ["ranking", /^Classement du jour/, 300],
];
/** The network's restaurant the film follows, as the day's ranking lists it. */
const HOME = "Montpellier";

const PHONE = { width: 393, height: 798, scale: 3 };
const TABLET = { width: 1180, height: 820, scale: 2 };
const DESKTOP = { width: 1920, height: 1080, scale: 2 };

// The Next dev badge (a dev server only).
const HIDE_DEV = "nextjs-portal{display:none!important}";
// The preview's « Suivant → », which production lacks.
const PREVIEW_STEP = "Suivant\u00a0: aperçu de l’étape suivante";
const HIDE_PREVIEW_STEP = `[aria-label="${PREVIEW_STEP}"]{display:none!important}`;

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
  return { x: box.x, y: box.y, width: box.width, height: box.height };
};

async function context(browser, { width, height, scale }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15_000);
  return page;
}

async function hideDevBadge(page) {
  await page.addStyleTag({ content: HIDE_DEV });
}

/**
 * Hides a screen's "demonstration" badge where the film frames it as a
 * leftover; the network view keeps its disclosure banner.
 */
async function hideDemoBadge(page, label) {
  await page.getByText(label, { exact: true }).evaluateAll((nodes) =>
    nodes.forEach((node) => ((node.closest('[class*="border"]') ?? node).style.visibility = "hidden")),
  );
}

/**
 * Hides the network view's price line (« … d’abonnement · … % des
 * commandes … »): the film is no place for terms, which the meeting sets.
 */
const hidePricing = (page) =>
  page.evaluate(() => {
    for (const node of document.querySelectorAll("body *")) {
      if (node.children.length === 0 && /abonnement/i.test(node.textContent)) node.style.visibility = "hidden";
    }
  });

/** A style tag that can be taken off again. */
async function withStyle(page, css, run) {
  const tag = await page.addStyleTag({ content: css });
  try {
    return await run();
  } finally {
    await tag.evaluate((node) => node.remove());
  }
}

async function ticketNumber(page) {
  const text = await page.getByRole("dialog").innerText();
  return Number(/N°\s*(\d+)/.exec(text)?.[1]);
}

async function throwawayOrder(page) {
  await page.getByRole("button", { name: "Ajouter : Potatoes" }).click();
  await page.getByRole("button", { name: /^Voir la commande/ }).click();
  await page.getByRole("button", { name: "Aperçu : voir le ticket" }).click();
  const next = page.getByRole("button", { name: PREVIEW_STEP });
  await next.click();
  await next.click();
  await page.getByRole("button", { name: "Fermer" }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
}

/**
 * Hides the cards' waiting times, and the other cards' order times: the
 * fixture dates its orders back from its own clock, which runs a few
 * minutes past the 12:41 the film tells. N° 39 keeps its 12:35.
 */
const hideTimers = (page) =>
  page.evaluate((followed) => {
    for (const node of document.querySelectorAll("[data-commande] *")) {
      const text = node.textContent.trim();
      const card = node.closest("[data-commande]").getAttribute("data-commande");
      if (node.children.length > 0) continue;
      if (/^\d+\s*min$/.test(text) || (card !== followed && /^\d{1,2}:\d{2}$/.test(text))) node.style.visibility = "hidden";
    }
  }, String(ORDER_NUMBER));

/** Top edge of the open sheet's panel, in viewport px. */
const sheetTop = (page) =>
  page.getByRole("dialog").evaluate((dialog) => {
    const panel = dialog.matches('[class*="max-h-"]') ? dialog : dialog.querySelector('[class*="max-h-"]');
    return (panel ?? dialog).getBoundingClientRect().top;
  });

/** The composer sheet's scrolling body. */
const sheetBody = (page) =>
  page.getByRole("dialog").locator("div.overflow-y-auto").last();

async function capturePhone(browser) {
  const page = await context(browser, PHONE);
  await page.clock.install({ time: new Date(ORDERED_AT) });
  await page.goto(`${BASE}/menu/demo/${SLUG}?service=fast-food`, { waitUntil: "networkidle" });
  await hideDevBadge(page);
  await settle(page, 1500);

  // The carte, top to the Menu Duo card, while nothing has been ordered.
  const duoButton = page.getByRole("button", { name: `Composer : ${DUO.name}` });
  const duoCard = duoButton.locator("xpath=ancestor::article[1]");
  // Scrolled so the Menu Duo card sits mid-screen: the capture runs to the
  // bottom of that view, so the film's scroll never runs out of page.
  const menuScroll = await duoCard.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return Math.round(box.top + window.scrollY - (window.innerHeight - box.height) / 2);
  });
  const menuHeight = menuScroll + PHONE.height;
  // The category bar sticks to the top once scrolled past: the film pins a
  // copy of it (taken from phone-added-duo) over the scrolling capture.
  const categoryBar = await rect(page.locator("nav").first());
  const menu = await shot(page, "phone-menu", {
    fullPage: true,
    clip: { x: 0, y: 0, width: PHONE.width, height: menuHeight },
  });

  for (let n = 1; n < ORDER_NUMBER; n++) {
    await throwawayOrder(page);
    process.stdout.write(`\r  throwaway orders ${n}/${ORDER_NUMBER - 1}`);
  }
  process.stdout.write("\n");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.clock.setSystemTime(new Date(ORDERED_AT));

  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), menuScroll);
  await settle(page);
  const composerTap = await rect(duoButton);
  await duoButton.click();
  await settle(page, 1200);

  const body = sheetBody(page);
  const composerTop = await sheetTop(page);
  const states = [];
  const expanded = async (index) => {
    // The whole body at once: a viewport tall enough that the sheet stops scrolling.
    const scrollTop = await body.evaluate((node) => node.scrollTop);
    await page.setViewportSize({ width: PHONE.width, height: 4000 });
    await settle(page, 400);
    const full = await rect(body);
    const content = await shot(page, `phone-duo-${index}-body`, { clip: full });
    await page.setViewportSize({ width: PHONE.width, height: PHONE.height });
    await body.evaluate((node, top) => (node.scrollTop = top), scrollTop);
    await settle(page, 400);
    return { content, contentHeight: full.height };
  };

  // The sheet's header grows or shrinks with its summary line: the body's
  // box is taken again at every state.
  for (let index = 0; index <= DUO.choices.length; index++) {
    const scrollTop = await body.evaluate((node) => node.scrollTop);
    const bodyAt = await rect(body);
    const screen = await shot(page, `phone-duo-${index}`);
    const { content, contentHeight } = await expanded(index);
    const state = { screen, content, contentHeight, scrollTop, body: bodyAt };
    if (index < DUO.choices.length) {
      const [, choice, nth] = DUO.choices[index];
      const radio = body.getByRole("radio", { name: choice }).nth(nth);
      const row = radio.locator("xpath=ancestor::label[1]");
      // Both in the body's content px: the row, and its radio the film taps.
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
  const addedDuo = await shot(page, "phone-added-duo");

  // The dessert, its card centered, before and after its tap.
  const dessertButton = page.getByRole("button", { name: `Ajouter : ${DESSERT.name}` });
  await dessertButton.locator("xpath=ancestor::article[1]").evaluate((node) => {
    const box = node.getBoundingClientRect();
    window.scrollTo({ top: box.top + window.scrollY - (window.innerHeight - box.height) / 2, behavior: "instant" });
  });
  await settle(page);
  const dessertScroll = await page.evaluate(() => window.scrollY);
  const dessertTap = await rect(dessertButton);
  const dessertPrice = (await dessertButton.locator("xpath=ancestor::article[1]").innerText()).match(/\d+,\d\d\s*€/)[0];
  const dessert = await shot(page, "phone-dessert");
  await dessertButton.click();
  await settle(page, 1000);
  const added = await shot(page, "phone-added");
  const cartButton = page.getByRole("button", { name: /^Voir la commande/ });
  const cartTap = await rect(cartButton);
  await cartButton.click();
  await settle(page, 1200);

  // The preview's submit reads "Aperçu : voir le ticket"; production says
  // what the tap does. Same element, same styles: only the words change.
  const submit = await page.getByRole("button", { name: "Aperçu : voir le ticket" }).elementHandle();
  const total = (await page.getByRole("dialog").innerText()).match(/Total\s*([\d\s ,]+€)/)?.[1]?.trim();
  await submit.evaluate((node, label) => (node.textContent = label), `Commander et payer · ${total}`);
  const payTap = await submit.boundingBox();
  const cartTop = await sheetTop(page);
  const cart = await shot(page, "phone-cart");
  await submit.click();
  await settle(page, 1500);

  const number = await ticketNumber(page);
  if (number !== ORDER_NUMBER) throw new Error(`Ticket shows N° ${number}, expected N° ${ORDER_NUMBER}`);

  const ticketTop = await sheetTop(page);
  // The ready-time block, which the film frames on, and the big number it
  // morphs its own into.
  const etaBox = await rect(page.locator(".order-eta").first());
  const numberBox = await rect(page.getByRole("dialog").getByText(String(ORDER_NUMBER), { exact: true }).first());
  const tickets = {};
  await withStyle(page, HIDE_PREVIEW_STEP, async () => {
    for (const minutes of TICKET_MINUTES) {
      if (minutes < 6) {
        await page.clock.fastForward("01:00");
        await settle(page, 1500);
      }
      tickets[minutes] = await shot(page, `phone-ticket-${minutes}`);
    }
  });
  await page.getByRole("button", { name: PREVIEW_STEP }).click();
  await settle(page, 1500);
  const ready = await withStyle(page, HIDE_PREVIEW_STEP, () => shot(page, "phone-ticket-ready"));

  await page.context().close();
  return {
    viewport: { width: PHONE.width, height: PHONE.height },
    orderNumber: ORDER_NUMBER,
    total,
    // The order as the kitchen printer receives it.
    order: {
      at: new Date(ORDERED_AT).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }),
      items: [
        { category: DUO.category, name: DUO.name, options: DUO.choices.map(([group, choice]) => ({ group, choice })) },
        { ...DESSERT, options: [] },
      ],
    },
    menu: { src: menu, height: menuHeight, scrollTo: menuScroll, composerTap, categoryBar },
    composer: { sheetTop: composerTop, states, addTap },
    added: { duo: addedDuo, dessert: { src: dessert, scrollTo: dessertScroll, tap: dessertTap, price: dessertPrice }, src: added, cartTap },
    cart: { src: cart, sheetTop: cartTop, payTap },
    ticket: { sheetTop: ticketTop, etaBox, numberBox, eta: tickets, ready },
  };
}

function counterClock() {
  const fixture = readFileSync(COUNTER_FIXTURE, "utf8");
  const minutesAgo = Number(new RegExp(`number: ${ORDER_NUMBER}, minutesAgo: (\\d+)`).exec(fixture)?.[1]);
  if (!minutesAgo) throw new Error(`N° ${ORDER_NUMBER} is not in the counter fixture`);
  return new Date(new Date(ORDERED_AT).getTime() + minutesAgo * 60_000);
}

/** Marks an order ready from its card, and waits for its toast to go. */
async function markReady(page, number) {
  await page.locator(`[data-commande="${number}"]`).getByRole("button", { name: "Marquer prête", exact: true }).click();
  // No hover left on the card.
  await page.mouse.move(0, 0);
  await page.getByText(new RegExp(`N° ${number} prête`)).waitFor({ state: "hidden", timeout: 15_000 });
  await settle(page, 500);
}

/** Hands an order over from its card: it leaves the queue. */
async function handOver(page, number) {
  await page.locator(`[data-commande="${number}"]`).getByRole("button", { name: /^Remettre/ }).click();
  await page.mouse.move(0, 0);
  await page.locator(`[data-commande="${number}"]`).waitFor({ state: "detached", timeout: 15_000 });
  await page.getByText(new RegExp(`N° ${number} remise`)).waitFor({ state: "hidden", timeout: 15_000 });
  await settle(page, 500);
}

async function captureCounter(browser) {
  const page = await context(browser, TABLET);
  await page.clock.install({ time: counterClock() });
  await page.goto(`${BASE}/menu/demo/${SLUG}/comptoir?scenario=fige`, { waitUntil: "networkidle" });
  await hideDevBadge(page);
  await hideDemoBadge(page, "Démonstration");
  await settle(page, 1500);
  // Before N° 39, nothing reads late or waits to be handed over: late
  // orders are made ready, then every ready one is handed over and leaves
  // the queue, so N° 39 opens it.
  for (const card of await page.locator("[data-commande]").all()) {
    const number = Number(await card.getAttribute("data-commande"));
    const late = await card.getByText("En retard", { exact: true }).count();
    if (number < ORDER_NUMBER && late) await markReady(page, number);
  }
  const waiting = [];
  for (const card of await page.locator("[data-commande]").all()) {
    const number = Number(await card.getAttribute("data-commande"));
    if (number < ORDER_NUMBER && (await card.getByRole("button", { name: /^Remettre/ }).count())) waiting.push(number);
  }
  for (const number of waiting) await handOver(page, number);
  await hideTimers(page);
  // The whole card in view, its button just above the bottom edge
  // ([data-commande] is a layout-less wrapper: measure the button).
  const ready = page
    .locator(`[data-commande="${ORDER_NUMBER}"]`)
    .getByRole("button", { name: "Marquer prête", exact: true });
  await ready.evaluate((node) => {
    const bottom = node.getBoundingClientRect().bottom + window.scrollY;
    window.scrollTo({ top: bottom - window.innerHeight + 52, behavior: "instant" });
  });
  await settle(page);
  const tap = await rect(ready);
  // The card's header band: number, state, time; the film ends on it.
  const header = await rect(page.locator(`[data-commande="${ORDER_NUMBER}"] article > div`).first());
  const before = await shot(page, "tablet-counter");
  // Once its toast has gone: it sits over the next card's button.
  await markReady(page, ORDER_NUMBER);
  await hideTimers(page);
  const after = await shot(page, "tablet-counter-ready");
  await page.context().close();
  return { viewport: { width: TABLET.width, height: TABLET.height }, before, after, tap, header };
}

/**
 * N° 39 comes in, as the view would show it: a row on top of the live feed
 * (the last one drops out), one more order and its total on Montpellier's
 * row of the ranking, which moves up past those it now outsells, and one
 * more order in the feed's count. Returns the feed's new row, the ranking
 * row's place before and after, and the right edge of its rank number.
 */
const addOrder = (page, order) =>
  page.evaluate(({ home, number, lines, cents }) => {
    const shown = (node) => node.offsetParent !== null;
    const box = (node) => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { x, y, width, height };
    };
    const heading = [...document.querySelectorAll("h2, h3")].find((node) => node.textContent.startsWith("Commandes en direct"));
    let card = heading;
    while (!card.className.includes("rounded")) card = card.parentElement;
    const rows = [...card.querySelectorAll("li[data-row]")];
    const row = rows[0].cloneNode(true);
    row.classList.remove("reseau-enter");
    const [head, body] = row.querySelectorAll("button > span");
    const [who, total] = head.children;
    who.children[0].textContent = home;
    who.children[2].textContent = `N°\u00a0${number}`;
    // The total in the view's own format: its digits replaced.
    const euros = (cents / 100).toFixed(2).replace(".", ",");
    total.textContent = total.textContent.replace(/^[\d\u202f,]+/, euros);
    // Paid online: no « réglée en caisse »; its age is the newest row's.
    const [basket] = body.children;
    for (const tag of basket.querySelectorAll(":scope > .rounded")) tag.remove();
    for (const variant of basket.children) variant.replaceChildren(Object.assign(document.createElement("span"), { className: "min-w-0 truncate", textContent: lines }));
    rows[0].before(row);
    rows[rows.length - 1].remove();
    // The day's count, « 364 aujourd'hui »: its figure is a text node of its own.
    const texts = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    while (texts.nextNode()) {
      const node = texts.currentNode;
      if (/^\d+$/.test(node.nodeValue) && /^\d+\s*aujourd/.test(node.parentElement.textContent.trim())) {
        node.nodeValue = String(Number(node.nodeValue) + 1);
      }
    }

    const table = [...document.querySelectorAll("tbody")].find(shown);
    const ranked = [...table.querySelectorAll("tr")];
    const ranks = ranked.map((tr) => tr.querySelector("th span").textContent);
    const mine = ranked.find((tr) => tr.querySelector("th").textContent.includes(home));
    const before = box(mine);
    const [count, sales] = mine.querySelectorAll("td");
    count.textContent = String(Number(count.textContent) + 1);
    const revenue = (tr) => Number(tr.querySelectorAll("td")[1].textContent.replace(/[^\d]/g, ""));
    const now = revenue(mine) + Math.round(cents / 100);
    sales.textContent = sales.textContent.replace(/^[\d\u202f]+/, String(now));
    let place = ranked.indexOf(mine);
    while (place > 0 && revenue(ranked[place - 1]) < now) place--;
    ranked[place].before(mine);
    [...table.querySelectorAll("tr")].forEach((tr, i) => (tr.querySelector("th span").textContent = ranks[i]));
    // Where the rank numbers end: the rows slide right of it, their numbers stay.
    const rank = mine.querySelector("th span").getBoundingClientRect().right;
    return { fresh: box(row), before, after: box(mine), rank, passed: ranked.indexOf(mine) - place };
  }, order);

async function captureNetwork(browser) {
  // The minutes may have changed since the last run: no stale view left behind.
  for (const file of readdirSync(OUT)) if (file.startsWith("desktop-network")) rmSync(join(OUT, file));
  const page = await context(browser, DESKTOP);
  await page.goto(`${BASE}/menu/demo/${SLUG}/reseau?heure=${NETWORK_CLOCK}&vitesse=0`, { waitUntil: "networkidle" });
  await hideDevBadge(page);
  await page.getByRole("group", { name: /^Hypothèse/ }).getByRole("button", { name: QR_SHARE, exact: true }).click();
  await page.mouse.move(0, 0);
  await hidePricing(page);
  // The page's header and its disclosure band sit under the film's title,
  // which says « Simulation » itself: left out rather than cut through.
  await page.addStyleTag({ content: "header, header + div { visibility: hidden !important }" });
  await settle(page, 3000);
  const feed = page.getByRole("heading", { name: /^Commandes en direct/ }).locator("xpath=ancestor::*[contains(@class, 'rounded')][1]");
  const clash = (pattern) => feed.getByText(pattern).filter({ visible: true }).count();
  if (await clash(new RegExp(`N°\\s*${ORDER_NUMBER}\\b`))) throw new Error(`At ${NETWORK_CLOCK} the live feed shows another N° ${ORDER_NUMBER}: pick another time`);
  if (await clash(new RegExp(`${DUO.name}.*${DESSERT.name}`))) throw new Error(`At ${NETWORK_CLOCK} the live feed shows another ${DUO.name} + ${DESSERT.name}: pick another time`);
  if (await clash(new RegExp(`^${HOME}$`))) throw new Error(`At ${NETWORK_CLOCK} the live feed shows a ${HOME} order: pick another time`);
  // The till's wait with QR beside its wait without: the film marks it.
  const compare = await rect(page.getByText(/^sans QR/).first());
  // The key-figure panels the film points at, by their label.
  const tiles = {};
  for (const [key, label, minHeight] of NETWORK_TILES) {
    tiles[key] = await page.getByText(label).first().evaluate((node, least) => {
      let card = node;
      while (card.getBoundingClientRect().height < least) card = card.parentElement;
      const { x, y, width, height } = card.getBoundingClientRect();
      return { x, y, width, height };
    }, minHeight);
  }
  const name = `desktop-network-${NETWORK_CLOCK.replace(":", "")}`;
  const before = await shot(page, name);
  if (!manifest.phone?.total) throw new Error("Capture the phone first: the network view adds its order's total");
  const cents = Number(manifest.phone.total.replace(/[^\d]/g, ""));
  const { fresh, passed, ...home } = await addOrder(page, { home: HOME, number: ORDER_NUMBER, lines: `${DUO.name} + ${DESSERT.name}`, cents });
  if (passed !== 1) throw new Error(`At ${NETWORK_CLOCK} N° ${ORDER_NUMBER} takes ${HOME} ${passed} places up, not one: pick another time`);
  await settle(page);
  const after = await shot(page, `${name}-n${ORDER_NUMBER}`);
  // The restaurant in rush in the day's ranking: the film points at it.
  const rush = await rect(page.locator("tbody tr").filter({ has: page.locator(".bg-ember-2"), visible: true }).first());
  // The panels' own background, left under their rows as they slide.
  const surface = await feed.evaluate((node) => getComputedStyle(node).backgroundColor);
  // The till hours the orders' panel says were freed over the whole day, for the film's last claim.
  await page.goto(`${BASE}/menu/demo/${SLUG}/reseau?heure=${NETWORK_DAY_END}&vitesse=0`, { waitUntil: "networkidle" });
  await page.getByRole("group", { name: /^Hypothèse/ }).getByRole("button", { name: QR_SHARE, exact: true }).click();
  await settle(page, 3000);
  const freed = (await page.getByText(/h de caisse libérées$/).first().textContent()).match(/≈\s*([\d\s\u202f]+)\s*h/)[1].trim();
  await page.context().close();
  return { viewport: { width: DESKTOP.width, height: DESKTOP.height }, states: [before, after], tiles, compare, home, fresh, rush, surface, freed, share: QR_SHARE };
}

const JOBS = { phone: capturePhone, counter: captureCounter, network: captureNetwork };
const wanted = process.argv.slice(2).length > 0 ? process.argv.slice(2) : Object.keys(JOBS);

mkdirSync(OUT, { recursive: true });
let manifest = {};
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch {
  // First run.
}

// The preview server restarts when it is rebuilt: a failed job waits and
// starts over.
const ATTEMPTS = 3;
const RETRY_WAIT_MS = 30_000;

const browser = await chromium.launch();
try {
  for (const name of wanted) {
    for (let attempt = 1; ; attempt++) {
      console.log(`capturing ${name}${attempt > 1 ? ` (attempt ${attempt})` : ""}`);
      try {
        manifest[name] = await JOBS[name](browser);
        break;
      } catch (error) {
        if (attempt === ATTEMPTS) throw error;
        console.warn(`  ${error.message.split("\n")[0]}`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_WAIT_MS));
      }
    }
    writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  }
} finally {
  await browser.close();
}

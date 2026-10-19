/*
 * What the club film says, in one place. Typography: no-break space ( )
 * before « : ; ! ? », before « € » and « % », and inside « ».
 *
 * The price mirrors the site: Connect's (frontend/lib/landing-data.ts,
 * connectCommission and connectPrice). Change it there first, then here,
 * then re-render.
 */

/**
 * Choosing which bar collects the order, shown as live at the owner's
 * request though the product has one pickup counter per venue for now:
 * "soon" would tag the step « Bientôt ». The page has the same switch
 * (frontend/lib/pitch/club.ts).
 */
export const BAR_CHOICE = "live" as "soon" | "live";

export const SOON_TAG = "Bientôt";

export const VENUE = "L’Étoile";
export const ORDER_NUMBER = 42;

/**
 * The bars, each with the wait the AI estimates for a new order, in minutes;
 * `busy` flags the one that's overloaded. Also shown as live at the owner's
 * request, not built yet: per-bar estimates and sending orders to the bar
 * that serves fastest.
 */
export const BARS = [
  { name: "Bar Central", where: "Rez-de-chaussée", wait: 12, busy: true },
  { name: "Bar Rooftop", where: "3ᵉ étage, en terrasse", wait: 3, busy: false },
  { name: "Bar VIP", where: "Côté carrés", wait: 6, busy: false },
] as const;

/** The bar the guest picks: the fastest one. */
export const PICKED = BARS[1];

export const DRINKS = [
  { name: "Nébuleuse", note: "Gin, litchi, citron vert", price: 14 },
  { name: "Comète", note: "Vodka, passion, vanille", price: 13 },
  { name: "Supernova", note: "Rhum, ananas, piment doux", price: 14 },
  { name: "Mojito", note: "Rhum, menthe, citron vert", price: 12 },
] as const;

/** The guest orders the first two. */
export const ORDER_TOTAL = DRINKS[0].price + DRINKS[1].price;

export const PRICE = { monthly: 0, commissionPercent: 3 } as const;

export const DEMO_URL = "menu.ominin.com/demo/club";

/** Loyalty on the return visit: her balance before and after the first night (a point a euro), and the reward it opens. */
export const LOYALTY = { before: 27, points: 54, reward: "Une consommation offerte", threshold: 50 } as const;

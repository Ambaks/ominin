import { AFTER_MEAL_DELAY_MS, AFTER_MEAL_EXPIRY_MS } from "@/lib/gestion/constants";
import { lineName } from "@/lib/menu/format";
import { canSuggest } from "@/lib/menu/pairings";
import type { MenuItem, Restaurant } from "@/lib/menu-data";

/*
 * La suite du repas : ce qu'un serveur demanderait en repassant à table. La
 * minuterie part du scan du retrait au bar (aperçu) ou de l'heure où la commande
 * passe servie (production) et se relit à chaque retour sur la page : son heure
 * est gardée dans le navigateur, la page peut se fermer entre-temps. Une nouvelle
 * commande l'arrête, son service la relance, et la suite se décide alors sur elle
 * seule.
 */

export interface AfterMealOffer {
  desserts: MenuItem[];
  coffees: MenuItem[];
  snacks: MenuItem[];
  /** Les boissons qui se reprennent d'un toucher. */
  drinks: MenuItem[];
  /** Les noms de toutes les boissons : un repas se reconnaît à ce qui n'en est pas. */
  drinkNames: string[];
  /** Le lien « laisser un avis Google », le même pour tous les clients. */
  reviewUrl?: string;
  /** Le temps laissé au client avant de proposer la suite. */
  delayMs: number;
  /** Le petit mot au-dessus des titres, dans la langue de la maison. */
  kickers?: { finir: string; encore: string; merci: string };
}

/** La dernière commande servie sur ce téléphone, et où en est la proposition. */
export interface AfterMealVisit {
  servedAt: number;
  /** Toutes les commandes déjà comptées, pour ne pas relancer sur l'une d'elles. */
  orders: string[];
  lines: string[];
  /** Plus rien à proposer sur cette commande : déjà montrée, expirée, ou une autre est passée. */
  shown: boolean;
}

export type AfterMealMoment =
  | "repas"
  | "dessert"
  | "sucre"
  | "tournee"
  | "verre"
  | "grignoter"
  | "fin";

export interface AfterMealStep {
  moment: AfterMealMoment;
  items: MenuItem[];
}

/** Se prend d'un toucher : rien à choisir d'obligatoire, les suppléments restent facultatifs. */
const oneTap = (item: MenuItem) =>
  !item.options?.some((group) => group.obligatoire || group.formats);

export function resolveAfterMeal(restaurant: Restaurant): AfterMealOffer {
  const config = restaurant.afterMeal;
  const items = restaurant.categories.flatMap((category) => category.items);
  // Par id dans l'aperçu ; par nom en production, où les ids sont ceux de la base.
  const pick = (refs: string[] = []) =>
    refs.flatMap((ref) => {
      const item = items.find((candidate) => candidate.id === ref || candidate.name === ref);
      return item && oneTap(item) ? [withPhoto(item)] : [];
    });
  const withPhoto = (item: MenuItem): MenuItem => {
    const image = config?.images?.[item.id];
    return image ? { ...item, image } : item;
  };
  const coffees = pick(config?.coffees);
  const drinks = restaurant.categories
    .filter((category) =>
      config?.drinkCategories ? config.drinkCategories.includes(category.name) : category.boissons
    )
    .flatMap((category) => category.items);
  return {
    desserts: pick(config?.desserts),
    coffees,
    snacks: pick(config?.snacks),
    drinks: drinks
      .filter((item) => oneTap(item) && !coffees.some((coffee) => coffee.id === item.id))
      .map(withPhoto),
    drinkNames: drinks.map(lineName),
    reviewUrl: config?.reviewUrl ?? restaurant.googleReviewUrl,
    delayMs: config?.live ? config.live.delayMinutes * 60_000 : AFTER_MEAL_DELAY_MS,
    kickers: config?.kickers,
  };
}

/**
 * La suite logique de ce qui a été servi : le dessert et le café après un plat,
 * le café après un dessert, la même chose et de quoi grignoter après une
 * tournée. Le café dit la fin du repas : il ne reste que le remerciement et
 * l'avis, comme quand plus rien ne peut se proposer.
 */
export function nextStep(
  offer: AfterMealOffer,
  served: string[],
  closed: ReadonlySet<string>
): AfterMealStep | null {
  const had = new Set(served);
  const among = (items: MenuItem[]) => items.filter((item) => had.has(lineName(item)));
  const open = (items: MenuItem[]) => items.filter((item) => canSuggest(item, closed));
  const thanks: AfterMealStep | null = offer.reviewUrl ? { moment: "fin", items: [] } : null;
  if (among(offer.coffees).length > 0) return thanks;

  const coffees = open(offer.coffees);
  // Le moment nomme ce qui se propose : la phrase ne promet jamais plus que les assiettes.
  const step = (moment: AfterMealMoment, items: MenuItem[]) =>
    items.length > 0 ? { moment, items } : thanks;
  if (among(offer.desserts).length > 0) return step("dessert", coffees);
  if (served.some((name) => !offer.drinkNames.includes(name))) {
    const [first, ...others] = open(offer.desserts);
    if (!first) return step("dessert", coffees);
    return coffees.length > 0
      ? { moment: "repas", items: [first, ...coffees, ...others] }
      : { moment: "sucre", items: [first, ...others] };
  }
  const again = open(among(offer.drinks));
  const snacks = open(offer.snacks);
  if (again.length === 0) return step("grignoter", snacks);
  return { moment: snacks.length > 0 ? "tournee" : "verre", items: [...again, ...snacks] };
}

/** Dans combien de ms proposer la suite ; null si la visite n'attend plus rien. */
export function afterMealWait(
  visit: AfterMealVisit | null,
  now: number,
  delayMs: number
): number | null {
  if (!visit || visit.shown || now >= visit.servedAt + AFTER_MEAL_EXPIRY_MS) return null;
  return Math.max(0, visit.servedAt + delayMs - now);
}

const storageKey = (slug: string) => `ominin-apres-repas:${slug}`;
const ordersKey = (slug: string) => `ominin-apres-repas:commandes:${slug}`;

const listeners = new Set<() => void>();

export function subscribeVisit(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Le texte gardé, tel quel : assez pour dire à React que rien n'a changé. */
export function readVisitText(slug: string): string | null {
  try {
    return localStorage.getItem(storageKey(slug));
  } catch {
    return null;
  }
}

export function parseVisit(text: string | null): AfterMealVisit | null {
  try {
    const visit: Partial<AfterMealVisit> | null = text ? JSON.parse(text) : null;
    return typeof visit?.servedAt === "number" && Array.isArray(visit.orders) && Array.isArray(visit.lines)
      ? (visit as AfterMealVisit)
      : null;
  } catch {
    return null;
  }
}

export function saveVisit(slug: string, visit: AfterMealVisit | null) {
  try {
    if (visit) localStorage.setItem(storageKey(slug), JSON.stringify(visit));
    else localStorage.removeItem(storageKey(slug));
  } catch {
    // Stockage refusé : la suite ne se proposera pas, le reste de la carte tient.
  }
  for (const listener of listeners) listener();
}

/** Les commandes de ce téléphone pas encore servies (production). */
export function readOrdersText(slug: string): string | null {
  try {
    return localStorage.getItem(ordersKey(slug));
  } catch {
    return null;
  }
}

export function parseOrders(text: string | null): string[] {
  try {
    const orders: unknown = text ? JSON.parse(text) : [];
    return Array.isArray(orders) ? orders.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveOrders(slug: string, orders: string[]) {
  try {
    if (orders.length > 0) localStorage.setItem(ordersKey(slug), JSON.stringify(orders));
    else localStorage.removeItem(ordersKey(slug));
  } catch {
    // Stockage refusé : la suite ne se proposera pas, le reste de la carte tient.
  }
  for (const listener of listeners) listener();
}

export function rememberOrder(slug: string, orderId: string) {
  const orders = parseOrders(readOrdersText(slug));
  if (!orders.includes(orderId)) saveOrders(slug, [...orders, orderId]);
}

export function forgetOrder(slug: string, orderId: string) {
  saveOrders(
    slug,
    parseOrders(readOrdersText(slug)).filter((id) => id !== orderId)
  );
}

/** L'apparition d'où vient un ajout au panier : le temps de l'onglet, comme le panier. */
const appearanceKey = (slug: string) => `ominin-apres-repas:apparition:${slug}`;

export function keepAppearance(slug: string, appearance: string, shownAt: number) {
  try {
    sessionStorage.setItem(appearanceKey(slug), JSON.stringify({ appearance, shownAt }));
  } catch {
    // Stockage refusé : la commande qui suit ne se rattachera pas à la feuille.
  }
}

/** Une commande passée : l'apparition qui l'a précédée, une seule fois. */
export function takeAppearance(slug: string): { appearance: string; ms: number } | null {
  try {
    const saved = sessionStorage.getItem(appearanceKey(slug));
    sessionStorage.removeItem(appearanceKey(slug));
    if (!saved) return null;
    const { appearance, shownAt } = JSON.parse(saved);
    return { appearance, ms: Date.now() - shownAt };
  } catch {
    return null;
  }
}

import { parisParts, toMinutes } from "@/lib/collect/hours";
import { formatHeure } from "@/lib/gestion/fermetures";
import type { Formule } from "@/lib/gestion/types";
import type { MenuCategory, MenuItem, RuleHours } from "@/lib/menu-data";
import { isDrinkCategory } from "./category-icons";
import { fitsVignette } from "./compact-preview";
import { cents } from "./tarifs";

/*
 * La happy hour en cours : les remises à heures fixes que les tarifs planifiés
 * appliquent en ce moment (tarifs_actifs). Rien ne la déclare : une remise
 * avec des heures en est une ; une majoration (le tarif week-end) ou une
 * remise de toute la journée n'en sont pas. Elle se lit sur la carte déjà
 * aux prix du moment : ce qu'elle annonce est ce que place_order facturera.
 * Les formules à heures (le petit déjeuner de 9 h à 10 h 30) s'y rangent
 * aussi : elles n'existent que pendant leur créneau.
 */

export const HAPPY_HOUR_SECTION_ID = "happy-hour";

const DAY_MINUTES = 24 * 60;

/** Une offre : un article, ou un seul de ses formats (le verre, pas la bouteille). */
export interface HappyHourOffer {
  item: MenuItem;
  /** Le format remisé (le 50 cl), quand la règle ne vise que lui. */
  format?: { id: string; name: string };
  price: number;
  basePrice: number;
  hours: RuleHours;
  /** Le nom de la règle qui la fait. */
  rule: string;
}

/** Une formule à heures, et ce que coûteraient ses plats à la carte, quand on le sait. */
export interface HappyHourFormule {
  formule: Formule & { hours: RuleHours };
  wasPrice?: number;
}

export interface HappyHour {
  /** Le nom de la règle (« Aperitivo Happy Hour »), ou « Happy hour » quand plusieurs se chevauchent. */
  title: string;
  /** Celle des fenêtres qui finit le plus tard. */
  hours: RuleHours;
  /** Par catégorie, dans l'ordre de la carte. */
  groups: { id: string; category: string; offers: HappyHourOffer[] }[];
  formules: HappyHourFormule[];
}

/** Minutes passées et restantes d'une fenêtre, à `minutes` (heure de Paris) ; null hors fenêtre. */
export function windowAt(hours: RuleHours, minutes: number) {
  const start = toMinutes(hours.startsAt);
  const length = (toMinutes(hours.endsAt) - start + DAY_MINUTES) % DAY_MINUTES;
  const elapsed = (minutes - start + DAY_MINUTES) % DAY_MINUTES;
  return elapsed < length ? { elapsed, left: length - elapsed, length } : null;
}

function offersOf(item: MenuItem): HappyHourOffer[] {
  const own = item.tarif;
  const offers: HappyHourOffer[] =
    own?.hours && item.price < own.basePrice
      ? [{ item, price: item.price, basePrice: own.basePrice, hours: own.hours, rule: own.name }]
      : [];
  for (const choice of item.options?.find((group) => group.formats)?.choices ?? []) {
    const tarif = choice.tarif;
    const price = cents(item.price + choice.supplement);
    if (tarif?.hours && price < tarif.basePrice) {
      offers.push({
        item,
        format: { id: choice.id, name: choice.name },
        price,
        basePrice: tarif.basePrice,
        hours: tarif.hours,
        rule: tarif.name,
      });
    }
  }
  return offers;
}

/**
 * Les plats d'une formule à la carte : pour chaque étape obligatoire, le
 * moins cher de ses choix, au prix de la carte (hors happy hour). Inconnu dès
 * qu'un choix n'est pas un article de la carte (un croissant saisi à part).
 */
function wasPriceOf(formule: Formule, itemsById: Map<string, MenuItem>): number | undefined {
  let total = 0;
  for (const etape of formule.etapes.filter((etape) => etape.obligatoire)) {
    const prices = etape.articles.map((article) => {
      const item = article.itemId ? itemsById.get(article.itemId) : undefined;
      return item ? (item.tarif?.basePrice ?? item.price) : undefined;
    });
    if (prices.length === 0 || prices.some((price) => price === undefined)) return undefined;
    total += Math.min(...(prices as number[]));
  }
  return total > formule.price ? cents(total) : undefined;
}

/** `formules` : celles du moment (jours et heures déjà vérifiés). */
export function happyHourOf(
  categories: MenuCategory[],
  formules: Formule[],
  at: Date
): HappyHour | null {
  const minutes = parisParts(at).minutes;
  const groups = categories.flatMap((category) => {
    const offers = category.items.flatMap(offersOf);
    return offers.length > 0 ? [{ id: category.id, category: category.name, offers }] : [];
  });
  const offers = groups.flatMap((group) => group.offers);
  const itemsById = new Map(categories.flatMap((category) => category.items.map((item) => [item.id, item])));
  const timed = formules.flatMap((formule) =>
    formule.hours
      ? [{ formule: { ...formule, hours: formule.hours }, wasPrice: wasPriceOf(formule, itemsById) }]
      : []
  );
  const windows = [...offers.map((offer) => offer.hours), ...timed.map(({ formule }) => formule.hours)];
  if (windows.length === 0) return null;
  const left = (hours: RuleHours) => windowAt(hours, minutes)?.left ?? 0;
  const last = windows.reduce((a, b) => (left(b) > left(a) ? b : a));
  const rules = new Set(offers.map((offer) => offer.rule));
  return {
    title: rules.size === 1 ? [...rules][0] : "Happy hour",
    hours: last,
    groups,
    formules: timed,
  };
}

/**
 * La section « Happy hour » : ses articles, repris de leur catégorie (qui les
 * garde), juste avant les boissons — sans boissons, avant la première
 * catégorie qui en a, sinon en tête. En vignettes quand la carte en montre et
 * que tous s'y prêtent. Ses formules, la page les pose en tête de section.
 */
export function withHappyHourSection(
  categories: MenuCategory[],
  happyHour: HappyHour | null
): MenuCategory[] {
  if (!happyHour) return categories;
  const ids = new Set(happyHour.groups.flatMap((group) => group.offers.map((offer) => offer.item.id)));
  const items = categories.flatMap((category) => category.items.filter((item) => ids.has(item.id)));
  const drinkItemIds = categories
    .filter(isDrinkCategory)
    .flatMap((category) => category.items.filter((item) => ids.has(item.id)).map((item) => item.id));
  const section: MenuCategory = {
    id: HAPPY_HOUR_SECTION_ID,
    name: "Happy hour",
    tagline: `Jusqu’à ${formatHeure(happyHour.hours.endsAt)}`,
    items,
    drinkItemIds,
    ...(categories.some((category) => category.compact) &&
      items.every(fitsVignette) && { compact: true as const }),
  };
  const drinks = categories.findIndex(isDrinkCategory);
  const offered = categories.findIndex((category) => category.items.some((item) => ids.has(item.id)));
  const at = Math.max(0, drinks >= 0 ? drinks : offered);
  return [...categories.slice(0, at), section, ...categories.slice(at)];
}

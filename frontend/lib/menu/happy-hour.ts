import { parisParts, toMinutes } from "@/lib/collect/hours";
import { formatHeure } from "@/lib/gestion/fermetures";
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

export interface HappyHour {
  /** Le nom de la règle (« Aperitivo Happy Hour »), ou « Happy hour » quand plusieurs se chevauchent. */
  title: string;
  /** Celle des fenêtres qui finit le plus tard. */
  hours: RuleHours;
  /** Par catégorie, dans l'ordre de la carte. */
  groups: { id: string; category: string; offers: HappyHourOffer[] }[];
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

export function happyHourOf(categories: MenuCategory[], at: Date): HappyHour | null {
  const minutes = parisParts(at).minutes;
  const groups = categories.flatMap((category) => {
    const offers = category.items.flatMap(offersOf);
    return offers.length > 0 ? [{ id: category.id, category: category.name, offers }] : [];
  });
  const offers = groups.flatMap((group) => group.offers);
  if (offers.length === 0) return null;
  const left = (hours: RuleHours) => windowAt(hours, minutes)?.left ?? 0;
  const last = offers.reduce((a, b) => (left(b.hours) > left(a.hours) ? b : a));
  const rules = new Set(offers.map((offer) => offer.rule));
  return {
    title: rules.size === 1 ? last.rule : "Happy hour",
    hours: last.hours,
    groups,
  };
}

/**
 * La section « Happy hour » : ses articles, repris de leur catégorie (qui les
 * garde), juste avant les boissons — sans boissons, avant la première
 * catégorie qui en a. En vignettes quand la carte en montre et que tous s'y
 * prêtent.
 */
export function withHappyHourSection(
  categories: MenuCategory[],
  happyHour: HappyHour | null
): MenuCategory[] {
  if (!happyHour) return categories;
  const ids = new Set(happyHour.groups.flatMap((group) => group.offers.map((offer) => offer.item.id)));
  const items = categories.flatMap((category) => category.items.filter((item) => ids.has(item.id)));
  const section: MenuCategory = {
    id: HAPPY_HOUR_SECTION_ID,
    name: "Happy hour",
    tagline: `Jusqu’à ${formatHeure(happyHour.hours.endsAt)}`,
    items,
    ...(categories.some((category) => category.compact) &&
      items.every(fitsVignette) && { compact: true as const }),
  };
  const drinks = categories.findIndex((category) => isDrinkCategory(category.name));
  const at =
    drinks >= 0 ? drinks : categories.findIndex((category) => category.items.some((item) => ids.has(item.id)));
  return [...categories.slice(0, at), section, ...categories.slice(at)];
}

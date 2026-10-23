import type { Formule } from "@/lib/gestion/types";
import { isChoiceAvailable, type MenuCategory, type MenuItem } from "@/lib/menu-data";
import type { CartChoice, CartLine } from "./cart";

/**
 * Les accords d'un plat dans le registre : les plats qui l'accompagnent, par
 * leur nom en base, et pourquoi. `format` nomme le choix d'un article à
 * formats (« Verre 12 cl » d'un vin servi aussi en bouteille).
 */
export type PairingNotes = Record<string, { with: string; format?: string; why: string }[]>;

/** Un plat proposé avec un autre, et la raison dite au client. */
export interface Pairing {
  /** Au format de l'accord, s'il en a un : son prix entier, le format en `detail`. */
  item: MenuItem;
  why: string;
  /** Le format retenu, tel que la ligne du panier le transmet. */
  choices?: CartChoice[];
}

/**
 * La cible d'un accord, ajoutée d'un toucher : un plat sans options, ou un
 * article à formats dont l'accord nomme un format disponible — ses autres
 * groupes, s'il en a, doivent pouvoir rester vides.
 */
function pairingTarget(target: MenuItem, why: string, format: string | undefined): Pairing | null {
  if (!target.options?.length) return { item: target, why };
  const formats = target.options.find((group) => group.formats);
  const choice = formats?.choices.find((candidate) => candidate.name === format);
  if (
    !formats ||
    !choice ||
    !isChoiceAvailable(choice) ||
    target.options.some((group) => group !== formats && group.obligatoire && !group.when)
  ) {
    return null;
  }
  return {
    item: {
      ...target,
      price: target.price + choice.supplement,
      detail: choice.name,
      options: undefined,
      tarifs: undefined,
    },
    why,
    choices: [{ group_id: formats.id, choice_id: choice.id }],
  };
}

/**
 * Rattache les accords du registre (par nom, comme withPrintedDetails) aux
 * plats de la carte en ligne, par id. Ne restent que les plats qui
 * s'ajoutent d'un toucher (pairingTarget) : un plat à options ouvrirait sa
 * propre feuille par-dessus celle du panier.
 */
export function resolvePairings(
  categories: MenuCategory[],
  notes: PairingNotes | undefined
): Record<string, Pairing[]> | undefined {
  if (!notes) return undefined;
  const byName = new Map(
    categories.flatMap((category) => category.items.map((item) => [item.name, item]))
  );
  const resolved: Record<string, Pairing[]> = {};
  for (const [name, list] of Object.entries(notes)) {
    const item = byName.get(name);
    if (!item) continue;
    const pairings = list.flatMap(({ with: other, format, why }) => {
      const target = byName.get(other);
      const pairing = target && pairingTarget(target, why, format);
      return pairing ? [pairing] : [];
    });
    if (pairings.length > 0) resolved[item.id] = pairings;
  }
  return resolved;
}

/**
 * Une formule à deux étapes qu'un plat déjà commandé entame : le reste
 * coûte alors moins cher en formule qu'à la carte (le dessert de la Formule
 * Boho à 6,90 € quand le cocktail est commandé seul).
 */
export interface FormuleOffer {
  formule: Formule;
  /** L'étape que remplit le plat commandé. */
  etapeId: string;
  /** Par id de plat : son article dans l'étape, et ce que coûte le reste en formule. */
  anchors: Record<string, { articleId: string; extra: number }>;
  /** L'étape restante, son prix habituel à la carte et une photo. */
  rest: { name: string; regularPrice: number; image?: string };
}

/**
 * Le prix que paient la plupart des choix d'une étape (à égalité, le plus
 * bas) : « au lieu de 8 € » vaut pour les desserts à 8 €, pas pour la seule
 * coupe de glace à 6 € qui ferait tomber l'offre.
 */
function usualPrice(prices: number[]): number {
  const counts = new Map<number, number>();
  for (const price of prices) counts.set(price, (counts.get(price) ?? 0) + 1);
  return [...counts].sort(([a, countA], [b, countB]) => countB - countA || a - b)[0][0];
}

/**
 * Les offres de formule de la carte : chaque formule à deux étapes
 * obligatoires, dans les deux sens, gardée seulement pour les plats où elle
 * fait vraiment payer le reste moins cher qu'à la carte.
 */
export function resolveFormuleOffers(
  formules: Formule[],
  categories: MenuCategory[]
): FormuleOffer[] {
  const items = new Map(
    categories.flatMap((category) => category.items.map((item) => [item.id, item]))
  );
  return formules.flatMap((formule) => {
    if (formule.etapes.length !== 2 || !formule.etapes.every((etape) => etape.obligatoire)) {
      return [];
    }
    return formule.etapes.flatMap((anchor, index) => {
      const restEtape = formule.etapes[1 - index];
      const restItems = restEtape.articles.flatMap((article) => {
        const item = article.itemId ? items.get(article.itemId) : undefined;
        return item ? [item] : [];
      });
      if (restItems.length === 0) return [];
      const regularPrice = usualPrice(restItems.map((item) => item.price));
      const anchors: FormuleOffer["anchors"] = {};
      for (const article of anchor.articles) {
        const item = article.itemId ? items.get(article.itemId) : undefined;
        if (!item) continue;
        const extra = Math.round((formule.price + article.supplement - item.price) * 100) / 100;
        if (extra > 0 && extra < regularPrice) anchors[item.id] = { articleId: article.id, extra };
      }
      if (Object.keys(anchors).length === 0) return [];
      return [
        {
          formule,
          etapeId: anchor.id,
          anchors,
          rest: {
            name: restEtape.name,
            regularPrice,
            image: restItems.find((item) => item.image)?.image,
          },
        },
      ];
    });
  });
}

/** Une ligne du panier qui entame une formule. */
export interface FormuleMatch {
  offer: FormuleOffer;
  line: CartLine;
  articleId: string;
  extra: number;
}

/**
 * La première formule qu'entame une ligne commandée seule (ni formule, ni
 * offerte). `servable` dit si la formule se commande en ce moment, avec
 * l'article de la ligne.
 */
export function formuleMatch(
  lines: CartLine[],
  offers: FormuleOffer[],
  servable: (offer: FormuleOffer, articleId: string) => boolean
): FormuleMatch | null {
  for (const line of lines) {
    if (line.formule || line.reward) continue;
    for (const offer of offers) {
      const anchor = offer.anchors[line.itemId];
      if (anchor && servable(offer, anchor.articleId)) {
        return { offer, line, articleId: anchor.articleId, extra: anchor.extra };
      }
    }
  }
  return null;
}

/** Un plat proposé doit pouvoir partir : en carte, en stock, pas coupé. */
export function canSuggest(item: MenuItem, closed: ReadonlySet<string>): boolean {
  return item.disponible !== false && item.stock !== 0 && !closed.has(item.id);
}

/**
 * Les accords du panier : ceux de chaque ligne, dans l'ordre où elles sont
 * arrivées, sans ce qui est déjà commandé ni ce qui ne peut pas partir.
 */
export function cartPairings(
  lines: CartLine[],
  pairings: Record<string, Pairing[]>,
  closed: ReadonlySet<string>,
  limit: number
): Pairing[] {
  const ordered = new Set(lines.map((line) => line.itemId));
  const picked = new Map<string, Pairing>();
  for (const line of lines) {
    for (const pairing of pairings[line.itemId] ?? []) {
      const { id } = pairing.item;
      if (ordered.has(id) || picked.has(id) || !canSuggest(pairing.item, closed)) continue;
      picked.set(id, pairing);
      if (picked.size === limit) return [...picked.values()];
    }
  }
  return [...picked.values()];
}

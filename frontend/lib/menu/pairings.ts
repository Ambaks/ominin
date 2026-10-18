import type { MenuCategory, MenuItem } from "@/lib/menu-data";
import type { CartLine } from "./cart";

/** Les accords d'un plat dans le registre : les plats qui l'accompagnent, par leur nom en base, et pourquoi. */
export type PairingNotes = Record<string, { with: string; why: string }[]>;

/** Un plat proposé avec un autre, et la raison dite au client. */
export interface Pairing {
  item: MenuItem;
  why: string;
}

/**
 * Rattache les accords du registre (par nom, comme withPrintedDetails) aux
 * plats de la carte en ligne, par id. Ne restent que les plats qui
 * s'ajoutent d'un toucher : un plat à options ouvrirait sa propre feuille
 * par-dessus celle du panier.
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
    const pairings = list.flatMap(({ with: other, why }) => {
      const target = byName.get(other);
      return target && !target.options?.length ? [{ item: target, why }] : [];
    });
    if (pairings.length > 0) resolved[item.id] = pairings;
  }
  return resolved;
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

import { WHEEL_POINTS, WHEEL_SLOTS, WHEEL_VOUCHER_DAYS } from "./wheel-config";

/*
 * La roue d'une maison, des réglages du gérant aux cases. Les lots se
 * partagent le budget à parts égales : chacun coûte en moyenne autant par
 * tour, donc sa chance est le budget divisé par le nombre de lots et par son
 * prix. Un café à 2 € sort dix fois plus souvent qu'une bouteille à 20 €. Le
 * reste de la chance va aux points (WHEEL_POINTS). Le même calcul sert la
 * page du gérant, le règlement affiché sous la roue et le tirage en base :
 * ce que lit le client est ce qui se tire.
 */

/** Un lot : un article de la carte (itemId) ou un lot hors carte, remis avec une commande. */
export interface WheelPrize {
  itemId?: string;
  /** Son nom sur la roue et sur le bon. */
  label: string;
  image?: string;
  /** Sa valeur (€) : le prix à la carte, ou celle du lot. */
  price: number;
}

/** La roue telle que le gérant la règle (loyalty_wheels, ou le registre pour un aperçu). */
export interface WheelSettings {
  /** Lots offerts en moyenne à chaque tour (€, prix de carte). */
  budget: number;
  /** Marchandise payée (€, hors pourboire et articles offerts) qui ouvre le tour. */
  minOrder: number;
  /** Le `every`-ième tour de la carte, puis tous les `every` : points multipliés. */
  golden: { every: number; multiplier: number } | null;
  prizes: WheelPrize[];
}

/** Une case : des points, ou un lot (points 0). `weight` : sa chance, sur 1 pour toute la roue. */
export interface WheelSlice {
  points: number;
  weight: number;
  prize?: WheelPrize;
}

/** La roue prête à tourner. */
export interface LoyaltyWheelConfig {
  slices: WheelSlice[];
  minOrder: number;
  golden: { every: number; multiplier: number } | null;
}

/**
 * La chance de chaque lot (sur 1), dans l'ordre. Des lots qui
 * réclameraient plus que toute la roue se partagent la roue entière, à
 * proportion : le budget n'est alors pas tenu (overBudget le dit au gérant).
 */
export function prizeChances(budget: number, prices: number[]): number[] {
  const raw = prices.map((price) => budget / (prices.length * price));
  const total = raw.reduce((sum, chance) => sum + chance, 0);
  return total > 1 ? raw.map((chance) => chance / total) : raw;
}

/** Le budget demande plus de chance que la roue n'en a. */
export function overBudget(budget: number, prices: number[]): boolean {
  return prices.reduce((sum, price) => sum + budget / (prices.length * price), 0) > 1;
}

/** Points gagnés en moyenne par tour, hors roue dorée. */
export function averagePoints(pointsChance: number): number {
  return (pointsChance * WHEEL_POINTS.reduce((sum, { points, share }) => sum + points * share, 0)) / 100;
}

/** Copies de chaque valeur de points sur `slots` cases : une au moins, puis au prorata de leur part. */
function pointCopies(slots: number): number[] {
  const seats = WHEEL_POINTS.map(() => 1);
  for (let left = slots - WHEEL_POINTS.length; left > 0; left--) {
    let best = 0;
    WHEEL_POINTS.forEach(({ share }, i) => {
      if (share / (seats[i] + 1) > WHEEL_POINTS[best].share / (seats[best] + 1)) best = i;
    });
    seats[best]++;
  }
  return seats;
}

/** Les points des cases sans lot, chaque valeur revenant à son rythme, jamais deux fois de suite. */
function pointRing(slots: number): number[] {
  const left = pointCopies(slots);
  const credit = left.map(() => 0);
  const ring: number[] = [];
  for (let slot = 0; slot < slots; slot++) {
    left.forEach((copies, i) => (credit[i] += copies));
    let pick = -1;
    left.forEach((copies, i) => {
      if (!copies || (i === ring.at(-1) && left.some((other, k) => other && k !== i))) return;
      if (pick < 0 || credit[i] > credit[pick]) pick = i;
    });
    credit[pick] -= slots;
    left[pick]--;
    ring.push(pick);
  }
  return ring.map((i) => WHEEL_POINTS[i].points);
}

/**
 * Les cases de la roue : les lots à intervalles réguliers, une case chacun,
 * les points entre eux. Une valeur de points partage sa chance entre ses
 * copies, et deux cases voisines ne portent jamais les mêmes points.
 */
export function buildWheel(settings: WheelSettings): LoyaltyWheelConfig {
  const { prizes } = settings;
  const chances = prizeChances(settings.budget, prizes.map((prize) => prize.price));
  const pointsChance = Math.max(0, 1 - chances.reduce((sum, chance) => sum + chance, 0));
  const lotAt = new Map(prizes.map((_, k) => [Math.round((k * WHEEL_SLOTS) / prizes.length), k]));
  const ring = pointRing(WHEEL_SLOTS - prizes.length);
  const copies = new Map<number, number>();
  for (const points of ring) copies.set(points, (copies.get(points) ?? 0) + 1);

  let next = 0;
  const cells = Array.from({ length: WHEEL_SLOTS }, (_, slot) =>
    lotAt.has(slot) ? null : ring[next++]
  );
  // Deux points identiques voisins par-dessus la boucle (roue sans lot) : l'un change de place.
  const at = (slot: number) => cells[(slot + WHEEL_SLOTS) % WHEEL_SLOTS];
  for (let slot = 0; slot < WHEEL_SLOTS; slot++) {
    const after = (slot + 1) % WHEEL_SLOTS;
    if (at(slot) === null || at(slot) !== at(after)) continue;
    const swap = cells.findIndex(
      (points, k) =>
        points !== null &&
        Math.abs(k - after) > 1 &&
        points !== at(slot) &&
        points !== at(after + 1) &&
        at(k - 1) !== at(after) &&
        at(k + 1) !== at(after)
    );
    if (swap >= 0) [cells[after], cells[swap]] = [cells[swap], cells[after]];
  }

  const share = new Map<number, number>(WHEEL_POINTS.map(({ points, share }) => [points, share / 100]));
  return {
    minOrder: settings.minOrder,
    golden: settings.golden,
    slices: cells.map((points, slot) => {
      if (points === null) {
        const k = lotAt.get(slot)!;
        return { points: 0, weight: chances[k], prize: prizes[k] };
      }
      return { points, weight: (pointsChance * share.get(points)!) / copies.get(points)! };
    }),
  };
}

/** Les cases, comme loyalty_wheel_spin les tire : le lot porte de quoi écrire son bon. */
export function spinSlices(slices: WheelSlice[]) {
  return slices.map(({ points, weight, prize }) =>
    prize
      ? {
          points: 0,
          weight,
          prize: {
            label: prize.label,
            item_id: prize.itemId ?? null,
            image: prize.image ?? null,
            days: WHEEL_VOUCHER_DAYS,
          },
        }
      : { points, weight }
  );
}

/** Indice de la case tirée, au prorata des poids (l'aperçu, sans base). */
export function drawSlice(slices: WheelSlice[]): number {
  let draw = Math.random() * slices.reduce((sum, slice) => sum + slice.weight, 0);
  for (let i = 0; i < slices.length; i++) {
    draw -= slices[i].weight;
    if (draw < 0) return i;
  }
  return slices.length - 1;
}

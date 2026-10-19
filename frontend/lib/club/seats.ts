/*
 * Les places d'une table partagée, remplies payeur après payeur dans
 * l'ordre d'arrivée : une part égale (prix ÷ places) remplit une place, une
 * part plus grande déborde sur les suivantes, une plus petite en remplit une
 * fraction. Partagé par l'anneau du client (seat-ring.tsx) et celui de la
 * gestion.
 */

export type FilledSeat<T> = {
  /** Remplie de 0 à 1. */
  fill: number;
  /** Le premier payeur dont la part touche cette place. */
  owner: T | null;
  /** La première place de son payeur : celle qui porte son nom. */
  home: boolean;
};

export function fillSeats<T>(
  count: number,
  priceCents: number,
  payers: readonly T[],
  amountOf: (payer: T) => number,
): FilledSeat<T>[] {
  const seats: FilledSeat<T>[] = Array.from({ length: count }, () => ({ fill: 0, owner: null, home: false }));
  const unit = priceCents / count;
  let cursor = 0;
  for (const payer of payers) {
    const start = cursor;
    const end = Math.min(count, cursor + amountOf(payer) / unit);
    for (let index = Math.floor(start); index < Math.ceil(end); index++) {
      const covered = Math.min(end, index + 1) - Math.max(start, index);
      if (covered <= 0) continue;
      seats[index].fill = Math.min(1, seats[index].fill + covered);
      seats[index].owner ??= payer;
    }
    const home = seats.findIndex((seat, index) => index >= Math.floor(start) && seat.owner === payer);
    if (home >= 0) seats[home].home = true;
    cursor = end;
  }
  return seats;
}

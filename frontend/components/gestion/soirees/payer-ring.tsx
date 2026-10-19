"use client";

import type { Payer } from "@/lib/gestion/club-selectors";

/*
 * Une table partagée vue d'en haut, côté gestion, comme le client la voit :
 * une place par personne attendue, chaque payeur remplissant des places à
 * proportion de ce qu'il a payé (hors frais), dans l'ordre de ses
 * paiements ; sa première place porte ses initiales. Les places vides
 * restent à encaisser. L'anneau extérieur dit la part du prix réglée. La
 * liste « Qui a payé », juste dessous, est la source : mêmes payeurs, même
 * ordre.
 */

/* Repère du dessin (unités du viewBox) : taille, anneau, cercle des places, rayon maximal d'une place. */
const RING = { size: 240, progress: 108, seats: 74, seatMax: 21, gap: 4 } as const;

type Seat = { fill: number; owner: number | null; first: boolean };

function initials(name: string): string {
  const [first, second] = name.replace(/\./g, "").trim().split(/\s+/);
  return `${first?.[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase();
}

/** Les places remplies payeur après payeur : une part égale (prix ÷ places) remplit une place. */
function fillSeats(count: number, priceCents: number, payers: Payer[]): Seat[] {
  const seats: Seat[] = Array.from({ length: count }, () => ({ fill: 0, owner: null, first: false }));
  const unit = priceCents / count;
  let cursor = 0;
  payers.forEach((payer, owner) => {
    const start = cursor;
    const end = Math.min(count, cursor + payer.amountCents / unit);
    for (let index = Math.floor(start); index < Math.ceil(end); index++) {
      const covered = Math.min(end, index + 1) - Math.max(start, index);
      if (covered <= 0) continue;
      seats[index].fill = Math.min(1, seats[index].fill + covered);
      seats[index].owner ??= owner;
    }
    const home = seats.findIndex((seat, index) => index >= Math.floor(start) && seat.owner === owner);
    if (home >= 0) seats[home].first = true;
    cursor = end;
  });
  return seats;
}

export function PayerRing({
  label,
  seats: count,
  priceCents,
  paidCents,
  payers,
}: {
  label: string;
  /** Personnes attendues : une place chacune. */
  seats: number;
  priceCents: number;
  paidCents: number;
  payers: Payer[];
}) {
  const centre = RING.size / 2;
  const share = priceCents > 0 ? Math.min(1, paidCents / priceCents) : 1;
  const seats = fillSeats(Math.max(count, 1), priceCents, payers);
  const radius = Math.min(RING.seatMax, (Math.PI * RING.seats) / seats.length - RING.gap);
  return (
    <svg
      viewBox={`0 0 ${RING.size} ${RING.size}`}
      className="anneau-payeurs mx-auto block w-full max-w-[15rem]"
      role="img"
      aria-label={`Table ${label}, ${count} places : ${payers.map((payer) => payer.name).join(", ")}`}
    >
      <circle className="anneau-piste" cx={centre} cy={centre} r={RING.progress} />
      <circle
        className="anneau-part"
        cx={centre}
        cy={centre}
        r={RING.progress}
        pathLength={1}
        style={{ strokeDashoffset: 1 - share }}
        transform={`rotate(-90 ${centre} ${centre})`}
      />
      <g transform={`translate(${centre} ${centre})`}>
        <circle className="anneau-table" r={30} />
        <text className="anneau-numero" textAnchor="middle" dominantBaseline="central">
          {label}
        </text>
      </g>
      {seats.map((seat, index) => {
        const angle = (index / seats.length) * Math.PI * 2 - Math.PI / 2;
        const payer = seat.owner === null ? null : payers[seat.owner];
        return (
          <g
            key={index}
            transform={`translate(${centre + Math.cos(angle) * RING.seats} ${centre + Math.sin(angle) * RING.seats})`}
          >
            <g
              className="anneau-place"
              data-organiser={payer?.organiser || undefined}
              data-vide={payer ? undefined : true}
              style={{ "--i": index } as React.CSSProperties}
            >
              <circle className="anneau-socle" r={radius} />
              {seat.fill > 0 && (
                <circle className="anneau-plein" r={radius} style={{ "--fill": seat.fill } as React.CSSProperties} />
              )}
              {seat.first && payer && (
                <text className="anneau-initiales" textAnchor="middle" dominantBaseline="central">
                  {initials(payer.name)}
                </text>
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}

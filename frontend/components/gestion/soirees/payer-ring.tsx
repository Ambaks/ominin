"use client";

import { initials } from "@/lib/club/mappers";
import { fillSeats } from "@/lib/club/seats";
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
  const seats = fillSeats(Math.max(count, 1), priceCents, payers, (payer) => payer.amountCents);
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
        style={{ "--part": share } as React.CSSProperties}
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
        const payer = seat.owner;
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
              {seat.home && payer && (
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

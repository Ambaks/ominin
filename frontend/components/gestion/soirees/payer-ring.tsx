"use client";

import { formatCents } from "@/lib/club/format";

/*
 * Une table partagée vue d'en haut, côté gestion : une place par payeur
 * (l'organisateur en or, ses amis en violet), ses initiales et ce qu'il a
 * payé, frais compris ; l'anneau dit la part du prix de la table déjà
 * réglée. La même lecture que la liste « Qui a payé » juste dessous.
 */

export type RingPayer = { id: string; name: string; totalCents: number; organiser: boolean };

/* Repère du dessin (unités du viewBox) : centre, anneau, cercle des places, rayon d'une place. */
const RING = { size: 240, progress: 108, seats: 74, seat: 21 } as const;

function initials(name: string): string {
  const [first, second] = name.replace(/\./g, "").trim().split(/\s+/);
  return `${first?.[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase();
}

export function PayerRing({
  label,
  priceCents,
  paidCents,
  payers,
}: {
  label: string;
  priceCents: number;
  paidCents: number;
  payers: RingPayer[];
}) {
  const centre = RING.size / 2;
  const share = priceCents > 0 ? Math.min(1, paidCents / priceCents) : 1;
  return (
    <svg
      viewBox={`0 0 ${RING.size} ${RING.size}`}
      className="anneau-payeurs mx-auto block w-full max-w-[15rem]"
      role="img"
      aria-label={`Table ${label} : ${payers.map((payer) => `${payer.name} ${formatCents(payer.totalCents)}`).join(", ")}`}
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
      {payers.map((payer, index) => {
        const angle = (index / payers.length) * Math.PI * 2 - Math.PI / 2;
        const x = centre + Math.cos(angle) * RING.seats;
        const y = centre + Math.sin(angle) * RING.seats;
        return (
          <g
            key={payer.id}
            className="anneau-place"
            data-organiser={payer.organiser || undefined}
            transform={`translate(${x} ${y})`}
            style={{ "--i": index } as React.CSSProperties}
          >
            <circle r={RING.seat} />
            <text className="anneau-initiales" textAnchor="middle" y={-4}>
              {initials(payer.name)}
            </text>
            <text className="anneau-montant" textAnchor="middle" y={9}>
              {formatCents(payer.totalCents)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

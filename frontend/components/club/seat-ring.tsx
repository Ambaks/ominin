"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/*
 * Une table partagée vue d'en haut : la table au centre, une place par
 * personne attendue tout autour. Chaque part payée remplit des places à
 * proportion de son montant (une part égale = une place), dans l'ordre
 * d'arrivée ; la première place qu'elle touche porte les initiales du
 * payeur. Les places pleines se relient en constellation, l'anneau
 * extérieur dit la part de la table déjà réglée. Les places vides
 * respirent doucement ; la plus récente pulse. Les remplissages arrivent un
 * à un au montage et glissent ensuite d'une valeur à l'autre.
 */

export type SeatShare = {
  id: string;
  name: string;
  amountCents: number;
  /** organiser : l'hôte ; you : la personne qui regarde ; preview : la part en cours de choix. */
  tone: "organiser" | "friend" | "you" | "preview";
};

type Seat = { fill: number; owner: SeatShare | null; tone: SeatShare["tone"] | null };

/* Repère du dessin (unités du viewBox) : centre, rayon des places, de l'anneau, de la table. */
const RING = { size: 260, seats: 92, progress: 120, table: 44, seatMax: 22, gap: 4 } as const;

function initials(name: string): string {
  const [first, second] = name.replace(/\./g, "").split(/\s+/);
  return `${first?.[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase();
}

/** Les places remplies par les parts, dans l'ordre : une part égale (prix ÷ places) = une place. */
function fillSeats(count: number, priceCents: number, shares: SeatShare[]): Seat[] {
  const seats: Seat[] = Array.from({ length: count }, () => ({ fill: 0, owner: null, tone: null }));
  const unit = priceCents / count;
  let cursor = 0;
  for (const share of shares) {
    const start = cursor;
    const end = Math.min(count, cursor + share.amountCents / unit);
    for (let index = Math.floor(start); index < Math.ceil(end) && index < count; index++) {
      const covered = Math.min(end, index + 1) - Math.max(start, index);
      if (covered <= 0) continue;
      seats[index].fill = Math.min(1, seats[index].fill + covered);
      seats[index].tone ??= share.tone;
    }
    const home = seats.findIndex((seat, index) => index >= Math.floor(start) && !seat.owner);
    if (home >= 0 && home < Math.ceil(end)) seats[home].owner = share;
    cursor = end;
  }
  return seats;
}

export function SeatRing({
  seats: count,
  priceCents,
  shares,
  label,
  freshId,
  className = "",
}: {
  seats: number;
  priceCents: number;
  shares: SeatShare[];
  /** Au centre : le numéro de la table. */
  label: string;
  /** La part qui vient d'arriver : sa place pulse. */
  freshId?: string | null;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  /* Les respirations s'arrêtent hors de l'écran. */
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => node.toggleAttribute("data-offscreen", !entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const seats = fillSeats(count, priceCents, shares);
  const paid = Math.min(1, shares.reduce((sum, share) => sum + share.amountCents, 0) / priceCents);
  const centre = RING.size / 2;
  const seatRadius = Math.min(RING.seatMax, (Math.PI * RING.seats) / count - RING.gap);
  const points = seats.map((_, index) => {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    return { x: centre + Math.cos(angle) * RING.seats, y: centre + Math.sin(angle) * RING.seats };
  });
  const lit = points.filter((_, index) => seats[index].fill >= 1);
  const names = shares.filter((share) => share.tone !== "preview").map((share) => share.name);
  const free = seats.filter((seat) => seat.fill < 1).length;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${RING.size} ${RING.size}`}
      className={`club-seats ${className}`}
      role="img"
      aria-label={`${count} places${names.length ? ` · ${names.join(", ")} ${names.length > 1 ? "ont" : "a"} payé` : ""} · ${free} place${free > 1 ? "s" : ""} à prendre`}
    >
      <circle className="club-seats-track" cx={centre} cy={centre} r={RING.progress} />
      <circle
        className="club-seats-progress"
        cx={centre}
        cy={centre}
        r={RING.progress}
        pathLength={1}
        style={{ "--paid": paid } as CSSProperties}
        transform={`rotate(-90 ${centre} ${centre})`}
      />
      {lit.length > 1 && (
        <polyline
          key={lit.length}
          className="club-seats-lines"
          points={lit.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}
          pathLength={1}
        />
      )}
      <g className="club-seats-table" transform={`translate(${centre} ${centre})`}>
        <circle r={RING.table} />
        <path
          className="club-seats-star"
          d="M0-14C.5-4 1.4-1.4 14 0 1.4 1.4.5 4 0 14-.5 4-1.4 1.4-14 0-1.4-1.4-.5-4 0-14Z"
          transform="translate(0 -12)"
        />
        <text y={16} textAnchor="middle" dominantBaseline="central">
          {label}
        </text>
      </g>
      {seats.map((seat, index) => {
        const point = points[index];
        const fresh = seat.owner && seat.owner.id === freshId;
        return (
          <g
            key={index}
            className="club-seat"
            data-tone={seat.tone ?? undefined}
            data-full={seat.fill >= 1 || undefined}
            data-empty={seat.fill === 0 || undefined}
            data-fresh={fresh || undefined}
            transform={`translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`}
            style={{ "--i": index } as CSSProperties}
          >
            <circle className="club-seat-halo" r={seatRadius + 7} />
            <circle className="club-seat-base" r={seatRadius} />
            <circle className="club-seat-fill" r={seatRadius} style={{ "--fill": seat.fill } as CSSProperties} />
            {seat.owner && (
              <text className="club-seat-initials" textAnchor="middle" dominantBaseline="central">
                {seat.owner.tone === "preview" || seat.owner.tone === "you" ? "Vous" : initials(seat.owner.name)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

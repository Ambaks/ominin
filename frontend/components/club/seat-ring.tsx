"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { formatCents } from "@/lib/club/format";

/*
 * Une table partagée vue d'en haut : la table au centre, une place par
 * personne attendue tout autour. Chaque part payée remplit des places à
 * proportion de son montant (une part égale = une place), dans l'ordre
 * d'arrivée ; la première place qu'elle touche porte les initiales du
 * payeur. Les places pleines se relient en constellation, l'anneau
 * extérieur dit la part de la table déjà réglée. Les places vides
 * respirent doucement ; une part arrivée pendant qu'on regarde pulse. Le
 * disque d'une place pleine à moitié a la moitié de sa surface (échelle en
 * racine). Toucher ou survoler une place dit qui l'a payée et combien.
 */

export type SeatShare = {
  id: string;
  name: string;
  amountCents: number;
  /** organiser : l'hôte ; you : la personne qui regarde ; preview : la part en cours de choix. */
  tone: "organiser" | "friend" | "you" | "preview";
};

type Seat = { fill: number; owner: SeatShare | null; tone: SeatShare["tone"] | null };

/* Au-delà de cette échelle, le disque couvre assez la place pour porter des initiales sombres. */
const SOLID = 0.72;

/* Repère du dessin (unités du viewBox) : centre, rayon des places, de l'anneau, de la table. */
const RING = { size: 260, seats: 92, progress: 120, table: 44, seatMax: 22, gap: 4, amountGap: 16 } as const;

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
  scrubbing = false,
  className = "",
}: {
  seats: number;
  priceCents: number;
  shares: SeatShare[];
  /** Au centre : le numéro de la table. */
  label: string;
  /** Une part à fêter dès le montage (celle qu'on vient de payer) ; les autres pulsent si elles arrivent ensuite. */
  freshId?: string | null;
  /** Le montant est en train d'être glissé : les places suivent sans délai ni rebond. */
  scrubbing?: boolean;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  // Les parts déjà là au montage ne pulsent pas : seules celles qui arrivent ensuite.
  const [known] = useState(() => new Set(shares.map((share) => share.id)));
  const [active, setActive] = useState<number | null>(null);
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
  const paidCents = shares.reduce((sum, share) => sum + share.amountCents, 0);
  const remaining = Math.max(0, priceCents - paidCents);
  const caption = active !== null ? seats[active]?.owner : null;

  return (
    <figure className={`club-seats-figure ${className}`} data-scrub={scrubbing || undefined}>
      <svg
        ref={ref}
        viewBox={`0 0 ${RING.size} ${RING.size}`}
        className="club-seats"
        role="group"
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
          <text y={6} textAnchor="middle" dominantBaseline="central">
            {label}
          </text>
          <text className="club-seats-left" y={24} textAnchor="middle" dominantBaseline="central">
            {remaining > 0 ? `${free} pl. · ${formatCents(remaining)}` : "Réglée"}
          </text>
        </g>
        {seats.map((seat, index) => {
          const point = points[index];
          const owner = seat.owner;
          const fresh = owner && (owner.id === freshId || !known.has(owner.id));
          // La surface du disque suit la part de la place : échelle en racine.
          const scale = Math.sqrt(seat.fill);
          // Le montant d'une part, à l'extérieur de sa place, dans l'axe du centre.
          const outward = { x: (point.x - centre) / RING.seats, y: (point.y - centre) / RING.seats };
          return (
            <g
              key={index}
              className="club-seat"
              data-tone={seat.tone ?? undefined}
              data-solid={scale >= SOLID || undefined}
              data-empty={seat.fill === 0 || undefined}
              data-fresh={fresh || undefined}
              data-active={active === index || undefined}
              // En propriété CSS, pas en attribut : une place qui se déplace (personnes en plus ou en moins) glisse.
              style={{ "--i": index, transform: `translate(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px)` } as CSSProperties}
              {...(owner && owner.tone !== "preview"
                ? {
                    role: "button",
                    tabIndex: 0,
                    "aria-label": `${owner.tone === "you" ? "Vous" : owner.name} : ${formatCents(owner.amountCents)}`,
                    onClick: () => setActive((current) => (current === index ? null : index)),
                    onPointerEnter: (event: React.PointerEvent) => event.pointerType === "mouse" && setActive(index),
                    onPointerLeave: (event: React.PointerEvent) => event.pointerType === "mouse" && setActive(null),
                    onFocus: () => setActive(index),
                    onBlur: () => setActive(null),
                  }
                : {})}
            >
              <circle className="club-seat-halo" r={seatRadius + 7} />
              <circle className="club-seat-base" r={seatRadius} />
              <circle className="club-seat-fill" r={seatRadius} style={{ "--fill": scale } as CSSProperties} />
              {seat.owner && (
                <text className="club-seat-initials" textAnchor="middle" dominantBaseline="central">
                  {seat.owner.tone === "preview" || seat.owner.tone === "you" ? "Vous" : initials(seat.owner.name)}
                </text>
              )}
              {seat.owner && seat.owner.tone !== "preview" && (
                <text
                  className="club-seat-amount"
                  x={outward.x * (seatRadius + RING.amountGap)}
                  y={outward.y * (seatRadius + RING.amountGap)}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {formatCents(seat.owner.amountCents)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="club-seats-caption" aria-live="polite">
        {caption ? (
          <>
            <strong>{caption.tone === "you" || caption.tone === "preview" ? "Vous" : caption.name}</strong>
            <span className="club-mono">{formatCents(caption.amountCents)}</span>
          </>
        ) : (
          <>
            <span>
              1 place ≈ <span className="club-mono">{formatCents(Math.ceil(priceCents / count))}</span>
            </span>
            <span className="club-seats-legend" aria-hidden>
              <i data-tone="you" /> Vous
              <i data-tone="friend" /> Payé
              <i /> Libre
            </span>
          </>
        )}
      </figcaption>
    </figure>
  );
}

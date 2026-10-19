"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { curve } from "@/lib/demo/curve";
import type { Venue } from "@/lib/demo/groupe/data";
import type { OrderStatus } from "@/lib/demo/groupe/simulation";

/* Les pièces communes de la vue groupe : cartes, titres, emblèmes, tendances, apparitions. */

export const CARD = "rounded-2xl border border-hairline bg-surface";
export const PANEL_TITLE = "text-[0.8125rem] font-semibold uppercase tracking-wider text-faint";
export const ICON = "size-3.5 shrink-0";
export const LINK =
  "whitespace-nowrap font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground";

/** Une entrée de la page au chargement : elle monte et apparaît, l'une après l'autre (`order`). */
export const rise = (order: number) => ({ className: "groupe-rise", style: { "--i": order } as React.CSSProperties });

/**
 * Plus bas dans la page, un bloc apparaît une fois, quand on l'atteint. Rendu
 * visible côté serveur (impression, sans JavaScript) ; masqué à l'hydratation
 * seulement s'il est encore sous le pli, puis révélé pour de bon.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");
  useEffect(() => {
    const element = ref.current;
    if (!element || element.getBoundingClientRect().top < window.innerHeight) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setState("shown");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(element);
    // Sous le pli à l'hydratation : on le masque jusqu'à ce qu'on l'atteigne.
    requestAnimationFrame(() => setState((current) => (current === "idle" ? "hidden" : current)));
    return () => observer.disconnect();
  }, []);
  return { ref, "data-reveal": state };
}

export function ArrowIcon({ className = ICON }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17L17 7M8 7h9v9" />
    </svg>
  );
}

/** L'emblème rond d'une adresse ; un liseré quand son disque se perd dans le fond. */
export function Avatar({ venue, size, className = "" }: { venue: Venue; size: number; className?: string }) {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-full bg-black ${venue.avatar.ring ? "ring-1 ring-foreground/25" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      <Image src={venue.avatar.src} alt="" fill sizes={`${size * 2}px`} className="object-cover" />
    </span>
  );
}

/** « Maintenant » : un point fixe, un anneau qui pulse (immobile sans mouvement). */
export function LiveDot({ className = "bg-ember-2" }: { className?: string }) {
  return (
    <span aria-hidden className="relative flex size-1.5 shrink-0">
      <span className="groupe-pulse absolute inset-0 rounded-full border border-foreground/50" />
      <span className={`size-1.5 rounded-full ${className}`} />
    </span>
  );
}

/** L'état d'une commande ; en retard, il le dit en rouge, quel que soit l'état. */
export function StatusPill({ status, kitchen, late }: { status: OrderStatus; kitchen: boolean; late: boolean }) {
  const label = late
    ? "En retard"
    : status === "en_preparation"
      ? kitchen
        ? "En cuisine"
        : "Au bar"
      : status === "a_encaisser"
        ? "À encaisser"
        : status === "paiement"
          ? "Paiement en ligne"
          : status === "a_servir"
            ? "À servir"
            : "Servie";
  const tone = late
    ? "border-(--late)/50 text-(--late)"
    : status === "a_encaisser"
      ? "border-ember-1/50 text-ember-1"
      : status === "a_servir"
        ? "border-foreground/40 text-foreground"
        : status === "servie"
          ? "border-transparent text-faint"
          : "border-hairline text-muted";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tone}`}>
      {late && <LateIcon />}
      {label}
    </span>
  );
}

/** Le signe du retard : une horloge, pour ne pas dire l'alerte par la seule couleur. */
export function LateIcon({ className = "size-3 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/**
 * L'encaissé cumulé de la journée, sur l'axe entier (`span` tranches, de la
 * première ouverture à la dernière fermeture) : aujourd'hui jusqu'à
 * l'instant, en trait plein, la même journée de la semaine dernière en
 * pointillés. Cumulée, la courbe ne redescend jamais : l'écart au point est
 * l'avance ou le retard sur la semaine dernière.
 */
export function Sparkline({
  values,
  ghost,
  span,
  tail = 1,
  color,
}: {
  values: number[];
  ghost: number[];
  span: number;
  /** Le dernier point de `values` est l'instant : il tombe à cette part de sa tranche, pas à sa fin. */
  tail?: number;
  color: string;
}) {
  const max = Math.max(...values, ...ghost, 1);
  const last = values.length - 1;
  const x = (i: number) => ((i === last && last > 0 ? i - 1 + tail : i) / Math.max(1, span - 1)) * 100;
  const y = (v: number) => 30 - (v / max) * 27;
  const line = (series: number[], own: boolean) => curve(series.map((v, i) => [own ? x(i) : (i / Math.max(1, span - 1)) * 100, y(v)]));
  return (
    <div className="relative h-10 w-full">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="groupe-wipe absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <line x1={0} x2={100} y1={30} y2={30} className="stroke-hairline" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {ghost.length > 1 && (
          <path d={line(ghost, false)} className="fill-none stroke-foreground/35" strokeWidth={1} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
        )}
        {values.length > 1 && (
          <path d={line(values, true)} className="fill-none" stroke={color} strokeWidth={1.75} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {last >= 0 && (
        <span
          aria-hidden
          className="groupe-dot absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${x(last)}%`, top: `${(y(values[last]) / 30) * 100}%`, backgroundColor: color }}
        />
      )}
    </div>
  );
}

/** Une variation : « +12 % », « −4 % », « stable » ; la couleur dit le sens, le signe aussi. */
export function Trend({ ratio, suffix }: { ratio: number | null; suffix: string }) {
  if (ratio == null || !Number.isFinite(ratio)) return null;
  const pct = Math.round(ratio * 100);
  const tone = pct > 0 ? "text-(--up)" : pct < 0 ? "text-(--late)" : "text-muted";
  const text = pct === 0 ? "stable" : `${pct > 0 ? "+" : "−"}${Math.abs(pct)} %`;
  return (
    <span className="text-muted">
      <span className={`font-semibold tabular-nums ${tone}`}>{text}</span> {suffix}
    </span>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { Venue } from "@/lib/demo/groupe/data";
import { formatEuroAmount, formatHour, formatWait } from "@/lib/demo/reseau/format";

/** Les paliers ronds de l'échelle : 1, 2 ou 5 × 10ⁿ. */
const NICE = [1, 2, 5];

/** La tranche en cours, hachurée couleur de fond (la légende le dit). */
const HATCH = "repeating-linear-gradient(135deg, transparent 0 3px, var(--surface) 3px 4.5px)";

const sum = (values: number[]) => values.reduce((s, v) => s + v, 0);
const euros = (cents: number) => `${formatEuroAmount(cents)} €`;

/**
 * Le plus petit palier rond (un euro au moins, en centimes) dont `lines`
 * multiples couvrent `peak` : au plus `lines` lignes, et le haut de
 * l'échelle tombe sur la dernière.
 */
function niceStep(peak: number, lines: number): number {
  const target = peak / lines;
  const power = 10 ** Math.floor(Math.log10(target));
  return Math.max(100, (NICE.find((m) => m * power >= target) ?? 10) * power);
}

/**
 * Les ventes de la journée, une barre par tranche, empilée adresse par
 * adresse dans leurs couleurs. Un tiret marque le total de la même tranche
 * la semaine dernière ; sur la tranche en cours, hachurée, il n'en compte
 * que la part écoulée. Les tranches à venir ne gardent que leur tiret.
 *
 * Un seul arrêt de tabulation : les flèches, Début et Fin parcourent les
 * tranches passées ; survol, appui ou focus détaillent une tranche au-dessus
 * du graphique. Le détail n'est annoncé que quand on le parcourt, jamais à
 * chaque nouvelle commande.
 */
export function DayChart({
  venues,
  names,
  stacks,
  reference,
  start,
  bucket,
  current,
  progress,
  tickHours,
  gridLines,
}: {
  /** Les adresses, dans l'ordre de l'empilement (de bas en haut). */
  venues: Venue[];
  /** Leur nom complet, pour la légende. */
  names: string[];
  /** Ventes des tranches écoulées, celle en cours comprise (centimes) : stacks[tranche][adresse]. */
  stacks: number[][];
  /** Le total de chaque tranche de l'axe, même jour la semaine dernière (centimes). */
  reference: number[];
  /** Début de la première tranche (secondes depuis minuit) et largeur d'une tranche (secondes). */
  start: number;
  bucket: number;
  /** La tranche de l'instant : -1 avant la première. */
  current: number;
  /** La part écoulée de la tranche en cours, de 0 à 1 (1 : journée finie). */
  progress: number;
  /** L'écart entre deux heures de l'axe, en heures. */
  tickHours: number;
  /** Au plus autant de lignes de repère horizontales. */
  gridLines: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);

  const last = stacks.length - 1;
  const live = current >= 0 && current < reference.length && progress < 1 ? current : -1;
  const totals = stacks.map(sum);
  // Une tranche entamée ne se compare qu'au prorata de la semaine dernière.
  const refs = reference.map((value, i) => (i === live ? value * progress : value));

  const peak = Math.max(0, ...totals, ...refs);
  const step = peak > 0 ? niceStep(peak, gridLines) : 0;
  const levels = step ? Array.from({ length: Math.ceil(peak / step) }, (_, k) => (k + 1) * step) : [];
  const top = levels.at(-1) ?? 1;
  const pct = (cents: number) => `${(cents / top) * 100}%`;

  const minutes = (i: number) => (start + i * bucket) / 60;
  const label = (i: number) => `${formatHour(minutes(i))}–${formatHour(minutes(i + 1))}`;
  const tickSeconds = tickHours * 3600;
  const ticks = reference.flatMap((_, i) => ((start + i * bucket) % tickSeconds === 0 ? [i] : []));

  // Une tranche retenue la veille (l'horloge a passé minuit) ne compte plus.
  const within = (i: number | null) => (i !== null && i <= last ? i : null);
  const driven = within(hover) ?? within(picked);
  const shown = driven ?? (live >= 0 ? live : null);
  const stop = within(picked) ?? last;
  // La tranche en cours change à chaque commande : elle ne s'annonce pas.
  const announce = driven !== null && driven !== live;

  const detail =
    shown !== null
      ? { title: shown === live ? `${label(shown)} · en cours` : label(shown), values: stacks[shown], ref: refs[shown], prorata: shown === live }
      : last >= 0
        ? { title: "Toute la journée", values: venues.map((_, v) => sum(stacks.map((stack) => stack[v]))), ref: sum(reference), prorata: false }
        : null;

  const slotName = (i: number) =>
    `${label(i)}${i === live ? ", en cours" : ""} : ${euros(totals[i])} (${venues
      .map((venue, v) => `${venue.short} ${euros(stacks[i][v])}`)
      .join(", ")}), semaine dernière ${euros(refs[i])}${i === live ? " au prorata" : ""}`;

  const move = (e: React.KeyboardEvent, from: number) => {
    const to =
      e.key === "ArrowLeft" ? from - 1 : e.key === "ArrowRight" ? from + 1 : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (to === null) return;
    e.preventDefault();
    const target = Math.min(last, Math.max(0, to));
    setPicked(target);
    row.current?.querySelectorAll("button")[target]?.focus();
  };

  // Au doigt, rien ne « quitte » le graphique : un appui ailleurs rend la tranche de l'instant.
  useEffect(() => {
    if (picked === null) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setPicked(null);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [picked]);

  const tick = (i: number) => (
    <span aria-hidden className="absolute -inset-x-px border-t-2 border-dashed border-foreground/45" style={{ bottom: pct(refs[i]) }} />
  );

  return (
    <div
      ref={root}
      role="group"
      aria-label={`Ventes du jour par tranche de ${formatWait(bucket / 60)}, empilées par adresse, avec la semaine dernière en repère`}
      className="@container flex h-full flex-col"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPicked(null);
      }}
    >
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[0.8125rem] text-muted">
        {venues.map((venue, v) => (
          <li key={venue.slug} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ backgroundColor: venue.color }} />
            {names[v]}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-0 w-3 border-t-2 border-dashed border-foreground/45" />
          Semaine dernière
        </li>
        {live >= 0 && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[3px] bg-muted" style={{ backgroundImage: HATCH }} />
            Tranche en cours
          </li>
        )}
      </ul>

      <div aria-live={announce ? "polite" : "off"} aria-atomic className="mt-3 text-[0.8125rem] text-muted">
        {detail ? (
          <>
            <p>
              <span className="font-medium text-foreground">{detail.title}</span>
              {" · "}
              <span className="text-foreground tabular-nums">{euros(sum(detail.values))}</span>
              {` · semaine dernière ${euros(detail.ref)}${detail.prorata ? " au prorata" : ""}`}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {venues.map((venue, v) => (
                <span key={venue.slug} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span aria-hidden className="size-2 rounded-[2px]" style={{ backgroundColor: venue.color }} />
                  <span>
                    {venue.short}
                    {" "}
                    <span className="text-foreground tabular-nums">{euros(detail.values[v])}</span>
                  </span>
                </span>
              ))}
            </p>
          </>
        ) : (
          <p>Pas encore de vente aujourd’hui</p>
        )}
      </div>

      <div
        className="relative mt-3 min-h-52 flex-1"
        onPointerLeave={(e) => {
          setHover(null);
          // À la souris, sortir rend la tranche de l'instant ; un focus clavier, lui, reste.
          if (e.pointerType === "mouse" && !e.currentTarget.contains(document.activeElement)) setPicked(null);
        }}
      >
        {/* La marge du haut porte l'étiquette de la dernière ligne de repère. */}
        <div className="absolute inset-x-0 top-4 bottom-6">
          <div aria-hidden className="absolute inset-x-0 bottom-0 border-t border-hairline" />
          {levels.map((level) => (
            <div key={level} aria-hidden className="absolute inset-x-0 border-t border-hairline" style={{ bottom: pct(level) }} />
          ))}

          <div ref={row} className="absolute inset-0 flex gap-[2px]">
            {reference.map((_, i) =>
              i <= last ? (
                <button
                  key={i}
                  type="button"
                  tabIndex={i === stop ? 0 : -1}
                  aria-label={slotName(i)}
                  onPointerEnter={() => setHover(i)}
                  // La souris ne prend pas le focus : seul le clavier déplace l'arrêt de tabulation.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setPicked(i)}
                  onFocus={() => setPicked(i)}
                  onKeyDown={(e) => move(e, i)}
                  className={`relative h-full min-w-0 flex-1 rounded-[3px] ${driven === i ? "bg-foreground/6" : ""}`}
                >
                  <span className="relative mx-auto block h-full w-full max-w-6">
                    <span className="absolute inset-0 flex flex-col-reverse">
                      {stacks[i].map(
                        (value, v) =>
                          value > 0 && (
                            <span
                              key={v}
                              className="w-full shrink-0 transition-[height] duration-700 ease-out not-first:shadow-[inset_0_-2px_0_var(--surface)] last:rounded-t-[3px] motion-reduce:transition-none"
                              style={{ height: pct(value), backgroundColor: venues[v].color, backgroundImage: i === live ? HATCH : undefined }}
                            />
                          )
                      )}
                    </span>
                    {tick(i)}
                  </span>
                </button>
              ) : (
                <span key={i} aria-hidden className="relative h-full min-w-0 flex-1" onPointerEnter={() => setHover(null)}>
                  <span className="relative mx-auto block h-full w-full max-w-6">{tick(i)}</span>
                </span>
              )
            )}
          </div>

          {levels.map((level) => (
            <span
              key={level}
              aria-hidden
              className="pointer-events-none absolute left-0 mb-1 text-[0.6875rem] leading-none text-faint tabular-nums"
              style={{ bottom: pct(level) }}
            >
              {euros(level)}
            </span>
          ))}
        </div>

        <div aria-hidden className="absolute inset-x-0 bottom-0 h-4 text-[0.6875rem] leading-4 text-faint tabular-nums">
          {ticks.map((i, k) => (
            <span
              key={i}
              className={`absolute top-0 whitespace-nowrap ${i === 0 ? "" : "-translate-x-1/2"} ${k % 2 ? "hidden @xs:block" : ""}`}
              style={{ left: `${(i / reference.length) * 100}%` }}
            >
              {formatHour(minutes(i))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

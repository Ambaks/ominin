"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PillTabs } from "@/components/ui/pill-tabs";
import { OFFRE_LABELS, ORDER_TAB_LABELS, WAIT_TICK_MS } from "@/lib/gestion/constants";
import { awaitsService, cardCount } from "@/lib/gestion/selectors";
import { commit, getState } from "@/lib/gestion/store";
import type { GestionState, OrderTab } from "@/lib/gestion/types";
import type { Scenario, ServiceDemo } from "./fixtures";

/*
 * L'écran du personnel des démonstrations (../comptoir, ../salle) : le store
 * de l'espace de gestion amorcé sans base, les commandes qui arrivent, et les
 * briques de l'en-tête.
 */

/** L'heure du service : `at` (ms) à l'instant `since` de l'appareil ; elle court tant que `running`. */
interface Clock {
  at: number;
  since: number;
  running: boolean;
}

const readClock = (clock: Clock, device: number) =>
  clock.running ? clock.at + device - clock.since : clock.at;

/**
 * Ouvre le service et le rend, avec son heure (now, rafraîchie toutes les
 * WAIT_TICK_MS) : le store est amorcé avant que quiconque s'y abonne — cet
 * effet précède useGestion, et les cartes n'existent pas encore. Sans cela,
 * le store partirait charger l'établissement du visiteur.
 *
 * Sans serviceStart, l'heure est celle de l'appareil. Avec, elle en part,
 * reste tenue en fige, et s'arrête — arrivées comprises — tant que l'onglet
 * est caché : un onglet ouvert avant une réunion n'a pas vieilli au retour.
 */
export function useServiceDemo(
  open: (slug: string, openedAt: number, scenario: Scenario) => ServiceDemo | null,
  slug: string,
  scenario: Scenario
): { demo: ServiceDemo | null; now: Date; arrive: () => void } {
  // L'heure d'ouverture prise au premier rendu, avant l'horloge de la page :
  // amorcées plus tard (dans l'effet), les commandes paraissaient d'une minute
  // plus jeunes jusqu'au premier battement.
  const [openedAt] = useState(() => Date.now());
  const demo = useMemo(() => open(slug, openedAt, scenario), [open, slug, openedAt, scenario]);
  const pinned = demo?.serviceStart !== undefined;
  const [clock, setClock] = useState<Clock>(() => ({
    at: demo?.serviceStart ?? openedAt,
    since: openedAt,
    // Rendue au serveur, la page n'a pas d'onglet : il est supposé visible.
    running: !pinned || (scenario === "rush" && (typeof document === "undefined" || !document.hidden)),
  }));
  // Le battement : toutes les WAIT_TICK_MS au plus, et à chaque minute
  // pleine du service, pour que l'horloge de l'en-tête tourne avec les
  // cartes ; reprogrammé quand l'heure reprend (onglet revenu). Il peut dater
  // d'avant cette reprise : il compte alors pour elle.
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!clock.running) return;
    const service = readClock(clock, Date.now());
    const timer = window.setTimeout(() => setTick(Date.now()), Math.min(WAIT_TICK_MS, 60_000 - (service % 60_000)));
    return () => window.clearTimeout(timer);
  }, [clock, tick]);
  const now = useMemo(() => new Date(readClock(clock, Math.max(tick, clock.since))), [clock, tick]);
  const arrived = useRef(0);

  useEffect(() => {
    if (!demo) return;
    commit(demo.state);
    arrived.current = 0;
  }, [demo]);

  useEffect(() => {
    if (!pinned || scenario === "fige") return;
    const onVisibility = () => {
      const device = Date.now();
      setClock((clock) => {
        if (document.hidden === !clock.running) return clock;
        return document.hidden
          ? { at: readClock(clock, device), since: device, running: false }
          : { ...clock, since: device, running: true };
      });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [pinned, scenario]);

  // L'arrivée suivante, à l'heure du service, tant que l'heure court et que
  // les cartes ouvertes restent sous maxOpen. L'écran peut l'appeler aussitôt
  // (arrive) ; sinon elle vient à son rythme (delayMs).
  const arrive = useCallback(() => {
    if (!demo || scenario === "fige" || !clock.running) return;
    const state = getState();
    if (cardCount(state.orders.filter(awaitsService)) >= demo.maxOpen) return;
    const order = demo.arrival(arrived.current, new Date(readClock(clock, Date.now())).toISOString(), state);
    arrived.current += 1;
    if (order) commit({ ...state, orders: [...state.orders, order] });
  }, [demo, scenario, clock]);

  useEffect(() => {
    if (!demo || scenario === "fige" || !clock.running) return;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => {
        arrive();
        schedule();
      }, demo.delayMs(arrived.current));
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [demo, scenario, clock, arrive]);

  return { demo, now, arrive };
}

export const plural = (count: number, word: string) =>
  `${count} ${count > 1 ? `${word}s` : word}`;

/**
 * Le produit, la mention de démonstration, et l'écran. La mention ne se
 * tronque jamais : à l'étroit, elle passe sous le produit ; c'est le nom,
 * sans largeur propre (contain), qui cède.
 */
export function DemoBrand({ name, className }: { name: string; className?: string }) {
  return (
    <div className={className}>
      <p className="flex flex-wrap items-baseline gap-x-2 whitespace-nowrap text-[10px] font-semibold">
        <span className="ember-text uppercase tracking-[0.28em]">Ominin {OFFRE_LABELS.connect}</span>
        <span className="text-xs font-medium text-muted">Démonstration</span>
      </p>
      <p className="truncate font-display text-lg font-medium [contain:inline-size]">{name}</p>
    </div>
  );
}

/**
 * Les onglets de la page Commandes, remontés dans la barre : la file commence
 * tout de suite sous elle. Leur marge laisse respirer le halo de l'onglet actif.
 */
export function OrderTabs({
  state,
  active,
  onSelect,
  className = "",
}: {
  state: GestionState;
  active: OrderTab;
  onSelect: (tab: OrderTab) => void;
  /** Sa place dans la barre de l'écran. */
  className?: string;
}) {
  return (
    <nav aria-label="Commandes" className={`min-w-0 lg:shrink-0 [&>div]:-m-4 [&>div]:p-4 ${className}`}>
      <PillTabs
        tabs={state.orderTabs.map((id) => ({
          id,
          label: ORDER_TAB_LABELS[id],
          count: id === "a_servir" ? cardCount(state.orders.filter(awaitsService)) : undefined,
        }))}
        activeId={active}
        onSelect={(id) => onSelect(id as OrderTab)}
      />
    </nav>
  );
}

/** « En direct » tant que les commandes arrivent ; figé, le libellé frozen. */
export function LiveLabel({ frozen }: { frozen: string | null }) {
  return (
    frozen ?? (
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 animate-pulse rounded-full bg-ember-2" aria-hidden />
        En direct
      </span>
    )
  );
}

type ChimeState = "on" | "off" | "locked";

/**
 * Le carillon de chaque nouvelle commande, comme à l'espace de gestion :
 * coupable d'un appui — un interrupteur d'un seul nom, « Son des nouvelles
 * commandes », que son état (aria-pressed) dit allumé ou coupé, et qui l'écrit
 * (« Son activé », « Son coupé »). « locked » : le navigateur tient
 * le son fermé jusqu'à un geste, que le bouton demande (« Activer le son ») ;
 * il n'est pas encore un interrupteur. onPress reçoit l'état au moment de
 * l'appui : ce geste ouvre aussi le son de la page (useOrderChime), et le
 * bouton passerait à « on » avant le clic d'un appui tenu ou d'Espace.
 */
export function ChimeButton({
  state,
  onPress,
}: {
  state: ChimeState;
  onPress: (from: ChimeState) => void;
}) {
  const pressedFrom = useRef<ChimeState | null>(null);
  const locked = state === "locked";
  return (
    <button
      type="button"
      aria-pressed={locked ? undefined : state === "on"}
      aria-label={locked ? "Activer le son des nouvelles commandes" : "Son des nouvelles commandes"}
      onPointerDown={() => {
        pressedFrom.current = state;
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") pressedFrom.current = state;
      }}
      onClick={() => {
        onPress(pressedFrom.current ?? state);
        pressedFrom.current = null;
      }}
      className={`flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold normal-case tracking-normal transition-colors hover:text-foreground ${
        locked ? "border-ember-2/60 text-ember-1" : state === "on" ? "border-hairline text-foreground" : "border-hairline text-muted"
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 5 6 9H3v6h3l5 4V5z" />
        {state === "on" ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m16 9 6 6M22 9l-6 6" />}
      </svg>
      {/* Sur deux lignes sous sm (w-min) : la barre d'un téléphone garde sa place aux onglets. */}
      <span className="max-sm:w-min">{locked ? "Activer le son" : state === "on" ? "Son activé" : "Son coupé"}</span>
    </button>
  );
}

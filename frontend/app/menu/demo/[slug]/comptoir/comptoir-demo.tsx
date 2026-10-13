"use client";

import { useEffect, useRef, useState } from "react";
import { CounterCard } from "@/components/gestion/commandes/counter-card";
import { OrderCard } from "@/components/gestion/commandes/order-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastProvider } from "@/components/ui/toast";
import {
  COUNTER_WAIT_LATE_MINUTES,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
} from "@/lib/gestion/constants";
import { awaitsService, isHistoryStatus, placeLabel } from "@/lib/gestion/selectors";
import { commit, getState, useGestion } from "@/lib/gestion/store";
import type { OrderStatus, OrderTab } from "@/lib/gestion/types";
import { minutesSince } from "@/lib/gestion/use-now";
import { useOrderChime } from "@/lib/gestion/use-order-chime";
import type { Scenario } from "../_service/fixtures";
import {
  ChimeButton,
  DemoBrand,
  LiveLabel,
  OrderTabs,
  plural,
  useServiceDemo,
} from "../_service/screen";
import { counterDemo } from "./fixtures";

/*
 * L'onglet Commandes d'un restaurant fast food, sans connexion ni base : le
 * store de l'espace de gestion est amorcé avec le service de démonstration,
 * et les cartes du comptoir sont celles du personnel. Leur geste est joué sur
 * le store seul, avec la règle de passage de l'espace : rien ne part vers la
 * base ni vers les notifications.
 */

async function setStatusLocally(orderId: string, status: OrderStatus) {
  const state = getState();
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (!order) throw new Error("Commande introuvable.");
  if (!ORDER_STATUS_FLOW[order.status].includes(status)) {
    throw new Error(
      `Impossible de passer une commande « ${ORDER_STATUS_LABELS[order.status]} » à « ${ORDER_STATUS_LABELS[status]} ».`
    );
  }
  commit({
    ...state,
    orders: state.orders.map((candidate) =>
      candidate.id === orderId ? { ...candidate, status } : candidate
    ),
  });
}

/** Onglets vides : les textes de la page Commandes, en fast food. */
const EMPTY_QUEUE =
  "Les commandes payées apparaîtront ici par numéro, de la préparation à la remise au comptoir.";
const EMPTY_HISTORY =
  "Les commandes servies, retirées ou annulées apparaîtront ici.";

/** Les cartes gardent la largeur qu'elles ont dans l'espace, quel que soit l'écran. */
const GRID = "grid grid-cols-[repeat(auto-fill,minmax(min(21rem,100%),1fr))] gap-4";

/**
 * Cartes de la file dont le titre — état et numéro — est hors de vue, au
 * dessus (sous la barre) ou en dessous du bord, dans l'ordre de la file.
 * Relu quand la file change (key).
 */
function useOffscreen(key: string) {
  const grid = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  const [offscreen, setOffscreen] = useState<{
    above: HTMLElement[];
    below: HTMLElement[];
  }>({ above: [], below: [] });
  useEffect(() => {
    const cards = [
      ...(grid.current?.querySelectorAll<HTMLElement>("[data-commande]") ?? []),
    ];
    const titles = new Map(
      cards.flatMap((card) => {
        const title = card.querySelector("h3");
        return title ? [[title, card] as const] : [];
      })
    );
    const barBottom = header.current?.getBoundingClientRect().bottom ?? 0;
    const side = new Map<HTMLElement, "above" | "below">();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const { target, intersectionRatio, boundingClientRect, rootBounds } of entries) {
          const card = titles.get(target as HTMLHeadingElement);
          if (!card) continue;
          if (intersectionRatio > 0.99 || !rootBounds) side.delete(card);
          else side.set(card, boundingClientRect.bottom > rootBounds.bottom ? "below" : "above");
        }
        setOffscreen({
          above: cards.filter((card) => side.get(card) === "above"),
          below: cards.filter((card) => side.get(card) === "below"),
        });
      },
      {
        rootMargin: `-${Math.ceil(barBottom)}px 0px 0px 0px`,
        threshold: [0, 1],
      }
    );
    for (const title of titles.keys()) observer.observe(title);
    return () => observer.disconnect();
  }, [key]);
  const connected = (cards: HTMLElement[]) => cards.filter((card) => card.isConnected);
  return {
    grid,
    header,
    above: connected(offscreen.above),
    below: connected(offscreen.below),
  };
}

/** Des commandes hors de vue, comptées par urgence. */
interface Tally {
  late: number;
  ready: number;
  numbers: number[];
}

/** « N° 36 », « N° 41 · 42 », « N° 42–45 » : les numéros qu'un client appelle. */
function numbersLabel(numbers: number[]): string {
  const sorted = [...numbers].sort((a, b) => a - b);
  const consecutive = sorted.every((number, index) => index === 0 || number === sorted[index - 1] + 1);
  return sorted.length > 3 && consecutive
    ? `N° ${sorted[0]}–${sorted[sorted.length - 1]}`
    : sorted.length > 3
      ? plural(sorted.length, "commande")
      : `N° ${sorted.join(" · ")}`;
}

/**
 * Aller aux commandes hors de vue : le bouton dit leurs numéros et prend la
 * couleur de la plus urgente — en retard, puis prête.
 */
function OffscreenCue({
  arrow,
  where,
  tally,
  onClick,
}: {
  arrow: "↑" | "↓";
  where: string;
  tally: Tally;
  onClick: () => void;
}) {
  const { late, ready, numbers } = tally;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${numbersLabel(numbers)} ${where}`}
      className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold tabular-nums transition-colors ${
        late > 0
          ? "border-ember-3/70 bg-ember-3/10 text-ember-3"
          : ready > 0
            ? "border-ember-2/60 bg-ember-2/10 text-ember-1"
            : "border-transparent bg-surface-raised text-foreground"
      }`}
    >
      <span aria-hidden className={late > 0 || ready > 0 ? "" : "text-ember-1"}>
        {arrow}
      </span>
      {numbersLabel(numbers)}
      {/* Une prête cachée derrière un retard : le rouge l'emporte, un point
          la signale quand même. */}
      {late > 0 && ready > 0 && (
        <span className="size-1.5 rounded-full bg-ember-1">
          <span className="sr-only">{`, dont ${plural(ready, "prête")}`}</span>
        </span>
      )}
    </button>
  );
}

/** « 2 prêtes · 1 en retard · 3 en préparation » : la file d'un coup d'œil. */
function QueueSummary({ ready, late, cooking }: { ready: number; late: number; cooking: number }) {
  const dot = (
    <span aria-hidden className="mx-2 text-faint">
      ·
    </span>
  );
  return (
    <p className="whitespace-nowrap text-sm font-semibold tabular-nums">
      <span className="text-ember-1">{plural(ready, "prête")}</span>
      {late > 0 && (
        <>
          {dot}
          <span className="text-ember-3">{`${late} en retard`}</span>
        </>
      )}
      {dot}
      <span className="text-muted">{`${cooking} en préparation`}</span>
    </p>
  );
}

export function ComptoirDemo({
  slug,
  name,
  scenario,
}: {
  slug: string;
  name: string;
  scenario: Scenario;
}) {
  const { now } = useServiceDemo(counterDemo, slug, scenario);
  const state = useGestion();
  // Le son de la démo, à elle : le réglage du vrai comptoir reste intact.
  const [chimeOn, setChimeOn] = useState(true);
  useOrderChime(chimeOn);
  const [tab, setTab] = useState<OrderTab>("a_servir");

  const orders = state?.orders ?? [];
  const queue = orders
    .filter(awaitsService)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const history = orders
    .filter((order) => isHistoryStatus(order.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const shown = tab === "a_servir" ? queue : history;
  const readyNumbers = new Set(
    queue.filter((order) => order.status === "prete").map((order) => order.orderNumber)
  );
  // Même règle que la carte : une commande en préparation depuis trop longtemps.
  const lateNumbers = new Set(
    queue
      .filter(
        (order) =>
          order.status !== "prete" &&
          minutesSince(order.createdAt, now) >= COUNTER_WAIT_LATE_MINUTES
      )
      .map((order) => order.orderNumber)
  );
  const { grid, header, above, below } = useOffscreen(
    tab === "a_servir" ? queue.map((order) => order.id).join() : ""
  );
  const tally = (cards: HTMLElement[]): Tally => {
    const numbers = cards.map((card) => Number(card.dataset.commande));
    return {
      late: numbers.filter((number) => lateNumbers.has(number)).length,
      ready: numbers.filter((number) => readyNumbers.has(number)).length,
      numbers,
    };
  };
  /*
   * Descendre vers les commandes cachées : la première arrive là où le
   * premier rang se tient au repos, sous la barre — état, numéro et attente
   * lisibles, le rang d'avant caché derrière.
   */
  const revealBelow = () => {
    if (!grid.current || !header.current) return;
    const bar = header.current.getBoundingClientRect().bottom;
    const rest = grid.current.getBoundingClientRect().top + window.scrollY - bar;
    window.scrollBy({
      top: below[0].getBoundingClientRect().top - bar - rest,
      behavior: "smooth",
    });
  };
  const summary = state && (
    <QueueSummary
      ready={readyNumbers.size}
      late={lateNumbers.size}
      cooking={queue.length - readyNumbers.size - lateNumbers.size}
    />
  );
  const cues = (
    <>
      {above.length > 0 && (
        <OffscreenCue
          arrow="↑"
          where="plus haut"
          tally={tally(above)}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        />
      )}
      {below.length > 0 && (
        <OffscreenCue
          arrow="↓"
          where="plus bas"
          tally={tally(below)}
          onClick={revealBelow}
        />
      )}
    </>
  );
  // Figée, la file n'attend plus rien : elle ne se dit pas « en direct ».
  const live = (
    <span className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
      <LiveLabel frozen={scenario === "fige" ? "File figée" : null} />
      <ChimeButton state={chimeOn ? "on" : "off"} onPress={() => setChimeOn((on) => !on)} />
    </span>
  );

  return (
    // Grand écran de comptoir : la grille de la tablette, lue de plus loin.
    // L'anneau de focus aux braises de la page, comme la vue réseau : celui du navigateur, bleu et fin, s'y perdait.
    <div className="flex min-h-dvh w-full flex-col min-[1600px]:min-h-[calc(100dvh/1.32)] min-[1600px]:[zoom:1.32] [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-ember-2">
      {/* Le message en haut, sous l'en-tête : en bas, il cachait le bouton d'une carte. */}
      <ToastProvider placement="top">
        {/* Sous le filet, une bande pleine de l'écart des cartes : ce qui
            défile passe derrière elle, jamais une lamelle de carte coupée. */}
        <header ref={header} className="sticky top-0 z-40 bg-background pb-4">
          <div className="border-b border-hairline">
            {/* Une seule ligne dès lg, le nom se tronquant : un renvoi qui apparaît
                faisait passer la barre sur deux lignes, ce qui changeait sa mesure
                et le faisait disparaître, sans fin (1024 px). */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-2 lg:flex-nowrap lg:px-10">
              <DemoBrand name={name} />
              {state && <OrderTabs state={state} active={tab} onSelect={setTab} />}
              <div className="ml-auto hidden shrink-0 items-center gap-2 lg:flex">
                {cues}
                {/* Le résumé de la file dès 1120 px : en dessous, avec les renvois, il ne laissait rien au nom. */}
                <div className="hidden pl-3 min-[1120px]:block">{summary}</div>
                <div className="pl-3">{live}</div>
              </div>
            </div>
            {/* Portrait : l'état de la file sur une seconde ligne, à la hauteur
                d'un renvoi — un renvoi qui apparaît ne pousse pas la grille.
                Sur un téléphone, la ligne défile seule plutôt que la page :
                ses bords s'estompent, et la marge garde l'anneau de focus entier. */}
            <div className="px-5 pb-2.5 lg:hidden">
              <div className="no-scrollbar -mx-3 -my-1 flex min-h-9 items-center gap-3 overflow-x-auto px-3 py-1 [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)] [&>*]:shrink-0">
                {summary}
                <div className="ml-auto flex items-center gap-3">
                  {cues}
                  {live}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 pb-10 lg:px-10">
          <h1 className="sr-only">Commandes</h1>
          {!state ? (
            <div aria-busy className={GRID}>
              <div className="shimmer h-64 rounded-2xl" />
              <div className="shimmer h-64 rounded-2xl" />
              <div className="shimmer h-64 rounded-2xl" />
            </div>
          ) : shown.length === 0 ? (
            <EmptyState
              title="Aucune commande"
              body={tab === "a_servir" ? EMPTY_QUEUE : EMPTY_HISTORY}
            />
          ) : (
            <div ref={grid} className={GRID}>
              {tab === "a_servir"
                ? queue.map((order) => (
                    // Entrée des commandes comme en salle (order-pop) ; la
                    // grille intérieure étire la carte à la hauteur du rang.
                    <div key={order.id} data-commande={order.orderNumber} className="order-pop grid">
                      <CounterCard
                        order={order}
                        now={now}
                        resetHour={state.orderNumberResetHour}
                        setStatus={setStatusLocally}
                      />
                    </div>
                  ))
                : history.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      place={placeLabel(order, state.tables)}
                    />
                  ))}
            </div>
          )}
        </main>

        {/* Le bas de l'écran s'estompe au lieu de trancher une carte. */}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-6 bg-gradient-to-t from-background to-transparent" />
      </ToastProvider>
    </div>
  );
}

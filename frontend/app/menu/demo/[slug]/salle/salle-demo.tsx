"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { OrderCard } from "@/components/gestion/commandes/order-card";
import { articlesToServe, ServirCard } from "@/components/gestion/commandes/servir-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastOutlet, ToastProvider, useToast } from "@/components/ui/toast";
import { ORDER_TAB_LABELS } from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import { awaitsService, isHistoryStatus, lastServedAt, placeLabel } from "@/lib/gestion/selectors";
import { commit, getState, useGestion } from "@/lib/gestion/store";
import type { Order, OrderTab } from "@/lib/gestion/types";
import { playChime, useChimeArmed, useOrderChime } from "@/lib/gestion/use-order-chime";
import type { Scenario } from "../_service/fixtures";
import { ChimeButton, DemoBrand, LiveLabel, OrderTabs, plural, useServiceDemo } from "../_service/screen";
import { salleDemo } from "./fixtures";

/*
 * L'onglet Commandes d'un restaurant à table, sans connexion ni base : le
 * store de l'espace de gestion est amorcé avec le service de démonstration
 * (./fixtures), à son heure, et les cartes « À servir » sont celles de la
 * salle. Leur « Servi » est joué sur le store seul ; rien ne part vers la
 * base.
 */

/** « Servi » sur le store : la ligne arrive à table, la commande se clôt avec sa dernière ligne. */
async function serveLocally(itemIds: string[], servedAt: string) {
  const state = getState();
  const ids = new Set(itemIds);
  commit({
    ...state,
    orders: state.orders.map((order) => {
      if (!order.items.some((item) => ids.has(item.id))) return order;
      const items = order.items.map((item) => (ids.has(item.id) ? { ...item, servedAt } : item));
      return { ...order, items, status: items.every((item) => item.servedAt) ? "servie" : order.status };
    }),
  });
}

const EMPTY_QUEUE = "Les commandes réglées depuis les tables apparaîtront ici, table par table, jusqu'à leur service.";
const EMPTY_FROZEN = "Ce service-là n'attend plus personne\u00a0: rejouez\u2011le, ou voyez les tables commander en\u00a0direct.";
const EMPTY_HISTORY = "Les commandes servies apparaîtront ici.";

/** Les cartes d'un rang à la même hauteur : pas de bande morte sous la plus courte. */
const GRID = "grid grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))] gap-4";

/** Le glissement des cartes vers leur nouvelle place, quand une table servie quitte la file. */
const REFLOW: KeyframeAnimationOptions = { duration: 400, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };

/**
 * La place de chaque carte de la file, par numéro de table : son décalage
 * dans la grille (relative), que ni le défilement ni un glissement en cours
 * ne faussent.
 */
type CardPlaces = Map<string, { x: number; y: number }>;

/**
 * Chaque table qui commande s'annonce, où que l'on soit : sa carte arrive
 * souvent sous le pli, et l'annonce y mène (« Voir »). Une annonce (notice) :
 * un « Servi » qui la suit ne l'efface pas, elle reprend après lui.
 */
function ArrivalToasts({ onReveal }: { onReveal: (tableId: string) => void }) {
  const state = useGestion();
  const toast = useToast();
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!state) return;
    const previous = known.current;
    known.current = new Set(state.orders.map((order) => order.id));
    if (!previous) return;
    for (const order of state.orders) {
      const { tableId } = order;
      if (previous.has(order.id) || !awaitsService(order)) continue;
      toast.notice(
        `${placeLabel(order, state.tables, false).replaceAll(" ", "\u00a0")}\u00a0: nouvelle commande.`,
        tableId ? { label: "Voir", onPress: () => onReveal(tableId) } : undefined
      );
    }
  }, [state, toast, onReveal]);
  return null;
}

/**
 * Une table de la file, nommée par le titre de sa carte, que le focus rejoint
 * quand celle servie avant elle en sort. Elle s'annonce (order-pop) une fois :
 * l'Historique la masque sans la démonter, et au retour seule celle d'une
 * table arrivée entre-temps — jamais affichée, donc jamais animée — s'annonce
 * encore. Arrivée pendant le service (fresh), elle garde « Nouveau » jusqu'à
 * ce qu'on y touche : un appui, une touche, pas le seul passage du focus.
 */
function QueueSlot({
  table,
  headingId,
  fresh,
  children,
}: {
  table: number;
  headingId: string;
  fresh: boolean;
  children: React.ReactNode;
}) {
  const [arriving, setArriving] = useState(true);
  const [unseen, setUnseen] = useState(fresh);
  return (
    <div
      data-table={table}
      role="group"
      aria-labelledby={headingId}
      tabIndex={-1}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setArriving(false);
      }}
      onPointerDownCapture={() => setUnseen(false)}
      onKeyDownCapture={() => setUnseen(false)}
      className={`relative grid rounded-2xl ${arriving ? "order-pop" : ""}`}
    >
      {unseen && (
        <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-b-lg bg-ember-2 px-2.5 pb-0.5 text-xs font-semibold text-background">
          Nouveau
        </span>
      )}
      {children}
    </div>
  );
}

/**
 * « Voir le service en direct » : la même salle, où les tables commandent.
 * Dans la barre (fit), une action et pas un état — « Voir en direct » sous
 * xl, sur deux lignes sur un téléphone —, nommé en entier.
 */
function LiveLink({ slug, fit = false }: { slug: string; fit?: boolean }) {
  return (
    <Link
      href={`/menu/demo/${slug}/salle`}
      className={`flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-ember-2/60 text-sm font-semibold text-ember-1 transition-colors hover:bg-ember-2/10 ${
        fit ? "px-3 sm:px-4" : "px-4"
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="currentColor" aria-hidden>
        <path d="M8 5.5v13l11-6.5z" />
      </svg>
      {fit ? (
        <>
          <span className="xl:hidden">
            Voir
            <br className="sm:hidden" /> en direct
          </span>
          <span className="hidden xl:inline">Voir le service en direct</span>
        </>
      ) : (
        "Voir le service en direct"
      )}
    </Link>
  );
}

/** La salle, rejouable : « Rejouer » la rouvre comme au premier chargement. */
export function SalleDemo(props: { slug: string; name: string; scenario: Scenario }) {
  const [run, setRun] = useState(0);
  return <Salle key={run} {...props} replayed={run > 0} onReplay={() => setRun((count) => count + 1)} />;
}

function Salle({
  slug,
  name,
  scenario,
  replayed,
  onReplay,
}: {
  slug: string;
  name: string;
  scenario: Scenario;
  /** Rouverte par « Rejouer » : le focus, parti avec le bouton, revient au titre de la liste. */
  replayed: boolean;
  onReplay: () => void;
}) {
  const { demo, now, arrive } = useServiceDemo(salleDemo, slug, scenario);
  // Les commandes de l'ouverture : toute autre table est arrivée depuis, « Nouveau ».
  const opening = useMemo(() => new Set(demo?.state.orders.map((order) => order.id)), [demo]);
  const state = useGestion();
  const [chimeOn, setChimeOn] = useState(true);
  useOrderChime(chimeOn);
  const armed = useChimeArmed();
  const chime = !chimeOn ? "off" : armed ? "on" : "locked";
  const [tab, setTab] = useState<OrderTab>("a_servir");
  const grid = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const replay = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  /** Le « Servi » en cours : sa table, son rang, sa ligne, et où était chaque carte avant lui. */
  const servedFrom = useRef<{ table: number; card: number; line: number; places: CardPlaces } | null>(null);
  useEffect(() => {
    if (replayed) heading.current?.focus();
  }, [replayed]);
  // « Voir » d'une annonce : la file, ouverte s'il le faut, et la carte de la
  // table, amenée sous l'en-tête par le focus.
  const revealTable = useCallback((tableId: string) => {
    flushSync(() => setTab("a_servir"));
    const number = getState().tables.find((table) => table.id === tableId)?.number;
    grid.current?.querySelector<HTMLElement>(`[data-table="${number}"]`)?.focus();
  }, []);
  // Le focus ne finit jamais sous l'en-tête collé : la page réserve sa
  // hauteur, mesurée (elle change avec la largeur) ; ses propres boutons,
  // eux, n'ont rien à révéler (scroll-mt négatif).
  useEffect(() => {
    const node = header.current;
    if (!node) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => root.style.setProperty("--salle-band", `${node.offsetHeight}px`));
    observer.observe(node);
    root.style.scrollPaddingTop = "var(--salle-band)";
    return () => {
      observer.disconnect();
      root.style.removeProperty("--salle-band");
      root.style.removeProperty("scroll-padding-top");
    };
  }, []);

  const orders = state?.orders ?? [];
  // Une carte par table, la plus ancienne commande en tête.
  const byTable = new Map<string, Order[]>();
  for (const order of orders.filter(awaitsService).sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const key = order.tableId ?? order.id;
    byTable.set(key, [...(byTable.get(key) ?? []), order]);
  }
  // L'Historique dans l'ordre du service : la table servie à l'instant en tête.
  const closedAt = (order: Order) => lastServedAt(order) ?? order.createdAt;
  const history = orders.filter((order) => isHistoryStatus(order.status)).sort((a, b) => closedAt(b).localeCompare(closedAt(a)));
  const articles = articlesToServe([...byTable.values()].flat());
  const tableNumber = (id: string) => state?.tables.find((table) => table.id === id)?.number ?? 0;
  // Figée et vide, la salle propose « Rejouer » et le direct au centre : la
  // barre ne répète pas ce dernier.
  const emptyRoom = !!state && scenario === "fige" && tab === "a_servir" && byTable.size === 0;
  // En direct, la salle ne reste jamais vide : servie jusqu'à sa dernière
  // table, elle en reçoit une aussitôt, avant que l'écran ne se peigne.
  const queueEmpty = !!state && byTable.size === 0;
  useLayoutEffect(() => {
    if (queueEmpty) arrive();
  }, [queueEmpty, arrive]);

  const cardPlaces = (): CardPlaces =>
    new Map(
      [...(grid.current?.querySelectorAll<HTMLElement>("[data-table]") ?? [])].map((card) => [
        card.dataset.table ?? "",
        { x: card.offsetLeft, y: card.offsetTop },
      ])
    );
  const serveFrom = (table: number, card: number, pending: string[]) => (itemIds: string[]) => {
    servedFrom.current = { table, card, line: Math.max(0, pending.indexOf(itemIds[0])), places: cardPlaces() };
    return serveLocally(itemIds, now.toISOString());
  };
  // Une ligne servie quitte sa liste, une table servie la file : le focus,
  // resté sur leur bouton, tomberait sur la page. Il passe au « Servi »
  // suivant de la table, sinon à la table suivante, sinon au titre.
  // Puis les cartes qui suivent glissent de leur ancienne place à la nouvelle
  // (FLIP) au lieu d'y sauter sous le doigt — après le focus, que le
  // navigateur amène ainsi à sa place finale. Une carte qui change de rang ne
  // traverse pas ses voisines en diagonale : elle entre par le bord du sien,
  // d'une place, du côté d'où viennent les autres, et apparaît. Mouvement
  // réduit : elles y sont aussitôt.
  useLayoutEffect(() => {
    const from = servedFrom.current;
    servedFrom.current = null;
    if (!from) return;
    const cards = [...(grid.current?.querySelectorAll<HTMLElement>("[data-table]") ?? [])];
    if (!document.activeElement || document.activeElement === document.body) {
      const buttons = cards.find((card) => card.dataset.table === String(from.table))?.querySelectorAll<HTMLElement>("li button");
      const target = buttons?.length
        ? buttons[Math.min(from.line, buttons.length - 1)]
        : (cards[Math.min(from.card, cards.length - 1)] ?? replay.current ?? heading.current);
      target?.focus();
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gap = grid.current ? parseFloat(getComputedStyle(grid.current).columnGap) : 0;
    for (const card of cards) {
      const place = from.places.get(card.dataset.table ?? "");
      if (!place) continue;
      const dx = place.x - card.offsetLeft;
      const dy = place.y - card.offsetTop;
      if (dx && dy) {
        const slot = Math.sign(dx) * -(card.offsetWidth + gap);
        card.animate([{ opacity: 0, transform: `translateX(${slot}px)` }, { opacity: 1, transform: "none" }], REFLOW);
      } else if (dx || dy) {
        card.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], REFLOW);
      }
    }
  }, [state]);

  return (
    <div className="flex min-h-dvh w-full flex-col [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-ember-2 [&_[data-table]:focus-visible]:-outline-offset-2">
      {/* Les messages (« Table 4 servie. », une table qui commande) dans la
          barre collée, jamais sur les cartes : ToastOutlet. */}
      <ToastProvider placement="outlet">
        {/* Monté une fois le service amorcé : abonné plus tôt, le store
            partirait charger l'établissement du visiteur. */}
        {state && <ArrivalToasts onReveal={revealTable} />}
        {/* Debout, sous lg, deux rangs : le nom et le son (ou le lien vers le
            direct), puis les onglets et l'heure — dès md, le compte entre les
            deux. Couché, sous lg (un téléphone tenu de côté), un seul rang
            sans le compte : la hauteur manque. Dès lg, un rang : le nom, les
            onglets et leur compte, puis l'heure et le son. L'ordre du DOM est
            celui du clavier, onglets puis son. Chaque bouton fait 44 px, sous
            le doigt d'un serveur.

            Un message prend, le temps de s'afficher, la place du nom sous
            lg ; dès lg, l'espace entre le compte et l'heure. Le compte ne lui
            cède sa place que s'il n'y tient pas à côté : il passe alors à la
            ligne d'une bande d'un rang (flex-wrap, overflow caché), sans seuil
            de largeur. */}
        <header
          ref={header}
          className="sticky top-0 z-40 bg-background pb-3 lg:pb-4 [&_:is(a,button)]:scroll-mt-[calc(-1*var(--salle-band))]"
        >
          <div className="border-b border-hairline">
            <div className="group/band grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-2 px-5 py-2 sm:gap-x-4 max-lg:landscape:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:flex lg:gap-x-5 lg:px-10 [&_button]:min-h-11">
              <DemoBrand
                name={name}
                className="col-start-1 row-start-1 max-lg:group-has-[[aria-live]>*]/band:invisible md:portrait:col-end-3"
              />
              <p className="col-start-3 row-start-2 flex flex-col items-end whitespace-nowrap text-xs font-semibold text-muted max-lg:landscape:row-start-1 lg:order-3">
                <span className="max-[359px]:sr-only max-lg:landscape:sr-only">
                  <LiveLabel frozen={scenario === "fige" ? "Service du midi" : null} />
                </span>
                <span className="text-sm tabular-nums text-foreground">{formatTime(now.toISOString())}</span>
              </p>
              {state && (
                <OrderTabs
                  state={state}
                  active={tab}
                  onSelect={(next) => {
                    setTab(next);
                    window.scrollTo({ top: 0 });
                  }}
                  className="col-start-1 col-end-3 row-start-2 max-sm:[&_button]:px-3 md:portrait:col-end-2 max-lg:landscape:col-start-2 max-lg:landscape:col-end-3 max-lg:landscape:row-start-1"
                />
              )}
              <div className="contents lg:order-2 lg:flex lg:h-11 lg:min-w-0 lg:flex-1 lg:flex-row-reverse lg:flex-wrap lg:content-start lg:justify-between lg:gap-x-5 lg:overflow-hidden">
                <ToastOutlet
                  compact
                  className="pointer-events-none col-start-1 row-start-1 flex items-center justify-center md:portrait:col-end-3 lg:h-11 lg:min-w-0"
                />
                {state && tab === "a_servir" && (
                  // Le compte de l'onglet ouvert, en tables et en articles :
                  // l'onglet, lui, compte les tables. « à servir » cède entre
                  // lg et xl, jamais les noms.
                  <p className="col-start-2 row-start-2 hidden whitespace-nowrap text-sm font-semibold tabular-nums md:max-lg:portrait:block lg:flex lg:h-11 lg:items-center">
                    {byTable.size === 0 ? (
                      <span className="text-muted">Tout est servi</span>
                    ) : (
                      <>
                        <span className="text-ember-1">{plural(byTable.size, "table")}</span>
                        <span aria-hidden className="mx-2 text-faint">
                          ·
                        </span>
                        <span className="text-muted">
                          {plural(articles, "article")}
                          <span className="lg:max-xl:hidden">{"\u00a0à servir"}</span>
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>
              {/* Figée, la salle ne reçoit rien : pas de son à régler, mais le
                  chemin vers celle où les tables commandent. */}
              <div className="col-start-2 col-end-4 row-start-1 flex justify-end md:portrait:col-start-3 max-lg:landscape:col-start-4 max-lg:landscape:col-end-5 lg:order-4">
                {scenario === "fige" ? (
                  !emptyRoom && <LiveLink slug={slug} fit />
                ) : (
                  <ChimeButton
                    state={chime}
                    onPress={(from) => {
                      if (from === "on") {
                        setChimeOn(false);
                      } else {
                        // Le geste ouvre le son du navigateur : un carillon le prouve.
                        setChimeOn(true);
                        void playChime();
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* overflow-x-clip : une carte qui entre par le bord droit de son rang
            ne fait pas défiler la page de côté. */}
        <main className="flex-1 overflow-x-clip px-5 pb-10 lg:px-10">
          <h1 ref={heading} tabIndex={-1} className="sr-only">
            Commandes de la salle
          </h1>
          {/* Le plan de la page : l'onglet ouvert, puis ses tables (h3). */}
          <h2 className="sr-only">{ORDER_TAB_LABELS[tab]}</h2>
          {!state ? (
            <div aria-busy className={GRID}>
              <div className="shimmer h-64 rounded-2xl" />
              <div className="shimmer h-64 rounded-2xl" />
              <div className="shimmer h-64 rounded-2xl" />
            </div>
          ) : (
            <>
              {/* Les deux onglets restent montés : une table de la file garde,
                  sous l'Historique, son arrivée déjà jouée (QueueSlot). */}
              <div hidden={tab !== "a_servir"}>
                {emptyRoom ? (
                  <EmptyState
                    title="Toutes les tables sont servies"
                    body={EMPTY_FROZEN}
                    action={
                      <div className="flex flex-wrap justify-center gap-3">
                        <button
                          type="button"
                          ref={replay}
                          onClick={onReplay}
                          className="ember-gradient flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-background"
                        >
                          Rejouer
                        </button>
                        <LiveLink slug={slug} />
                      </div>
                    }
                  />
                ) : byTable.size === 0 ? (
                  <EmptyState title="Aucune commande" body={EMPTY_QUEUE} />
                ) : (
                  // overflow-anchor : une table servie en haut de l'écran laisse
                  // la suivante monter à sa place, sans que le navigateur fasse
                  // défiler la page pour garder celle-ci immobile.
                  <div ref={grid} className={`relative [overflow-anchor:none] ${GRID}`}>
                    {[...byTable.entries()].map(([id, tableOrders], card) => (
                      <QueueSlot
                        key={id}
                        table={tableNumber(id)}
                        headingId={`table-${tableNumber(id)}`}
                        fresh={!opening.has(tableOrders[0].id)}
                      >
                        <ServirCard
                          orders={tableOrders}
                          title={`Table ${tableNumber(id)}`}
                          headingId={`table-${tableNumber(id)}`}
                          now={now}
                          onServe={serveFrom(
                            tableNumber(id),
                            card,
                            tableOrders.flatMap((order) => order.items).filter((line) => !line.servedAt).map((line) => line.id)
                          )}
                        />
                      </QueueSlot>
                    ))}
                  </div>
                )}
              </div>
              <div hidden={tab !== "historique"}>
                {history.length === 0 ? (
                  <EmptyState title="Aucune commande" body={EMPTY_HISTORY} />
                ) : (
                  <div className={GRID}>
                    {history.map((order) => (
                      <OrderCard key={order.id} order={order} place={placeLabel(order, state.tables, false)} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </ToastProvider>
    </div>
  );
}

"use client";

import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { CheckIcon } from "@/components/gestion/icons";
import { Sheet, useNoSheet } from "@/components/menu/sheet";
import { QrCode } from "@/components/pitch/qr-code";
import { SERVICE_CLOCK_TICK_MS } from "@/lib/gestion/constants";
import { frenchTime } from "@/lib/gestion/format";
import type { OrderStatus } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import { formatPrice } from "@/lib/menu/format";
import { useCart } from "@/lib/menu/cart";
import { fallBackToCounter } from "@/lib/menu/online-payment";
import {
  CARD_NOTICES,
  isActiveTicket,
  servedGreeting,
  useTickets,
  type ReadyEstimate,
  type Ticket,
} from "@/lib/menu/tickets";

/*
 * Le ticket du client fast food : son numéro, en très grand — c'est ce que le
 * comptoir appellera —, et où en est sa commande, en direct. Il s'ouvre à
 * l'envoi de la commande, se rouvre de lui-même quand elle est prête, et
 * depuis la pastille qui reste au bas de la carte tant qu'elle n'est pas
 * remise.
 *
 * À table (Restaurant.suivi) : le même ticket, pour la table — reçue, en
 * préparation, servie. Servie, sa pastille reste, repliée : le client revoit
 * ce qu'il a déjà commandé ; et la page la salue d'une feuille aux couleurs
 * de la maison, « Bon appétit ! » ou « Bonne dégustation ! ».
 *
 * Retrait au bar : prête, le ticket porte le code que le client montre au
 * bar ; scanné, la commande est remise et la page la salue de même.
 */

const STEPS = ["Commandée", "En cuisine", "Prête"] as const;

interface Stage {
  title: string;
  body: string;
  /** Étape en cours du suivi ; au-delà de la dernière, tout est fait. */
  step: number;
  /** L'étape en cours attend le règlement : elle ne commence qu'après lui. */
  waiting?: boolean;
  chip: string;
}

// Espaces insécables avant « : » et « ! » : la ponctuation ne part jamais
// seule en début de ligne. Les états du click & collect (en_preparation,
// retiree) n'arrivent pas à une commande numérotée.
const STAGES: Partial<Record<OrderStatus, Stage>> = {
  en_attente: {
    title: "À régler au\u00a0comptoir",
    body: "Présentez ce numéro au\u00a0comptoir\u00a0:\nvotre\u00a0commande part en\u00a0cuisine dès le règlement.",
    step: 1,
    waiting: true,
    chip: "À régler",
  },
  payee: {
    title: "En cuisine",
    body: "On s’en occupe. Gardez cette page ouverte\u00a0: elle vous prévient dès que c’est prêt.",
    step: 1,
    chip: "En cuisine",
  },
  prete: {
    title: "C’est prêt\u00a0!",
    body: "Venez chercher votre commande au\u00a0comptoir.",
    step: 2,
    chip: "Prête\u00a0!",
  },
  servie: {
    title: "Bon appétit\u00a0!",
    body: "Votre commande vous a été remise.\nMerci de votre visite.",
    step: STEPS.length,
    chip: "Remise",
  },
  annulee: {
    title: "Commande annulée",
    body: "Adressez-vous au\u00a0comptoir.",
    step: -1,
    chip: "Annulée",
  },
};

/**
 * Règlement en ligne en cours : la commande n'est pas encore partie, et le
 * comptoir ne la voit qu'une fois le client passé par son bouton.
 */
const PAYING: Stage = {
  title: "Paiement en cours",
  body: "Le paiement en ligne n’est pas terminé. Touchez «\u00a0Payer au\u00a0comptoir\u00a0»\u00a0: votre commande y apparaîtra.",
  step: 1,
  waiting: true,
  chip: "Paiement…",
};

const TABLE_STEPS = ["Reçue", "En préparation", "Servie"] as const;

// Le titre de « servie » est la salutation du service (servedGreeting).
// À régler : un serveur passe avec le terminal (« Payer au comptoir » à table).
const TABLE_STAGES: Partial<Record<OrderStatus, Stage>> = {
  en_attente: {
    title: "À régler",
    body: "Réglez-la auprès d’un serveur ou au\u00a0comptoir\u00a0: elle part en\u00a0préparation dès l’encaissement.",
    step: 1,
    waiting: true,
    chip: "À régler",
  },
  payee: {
    title: "Commande reçue",
    body: "Paiement accepté\u00a0: elle part en\u00a0préparation.",
    step: 0,
    chip: "Reçue",
  },
  en_preparation: {
    title: "En préparation",
    body: "Un serveur vous l’apporte à\u00a0table dès qu’elle est prête.",
    step: 1,
    chip: "En préparation",
  },
  servie: {
    title: "",
    body: "Servie à votre table.\nUne autre envie\u00a0? La carte reste ouverte.",
    step: TABLE_STEPS.length,
    chip: "Servie",
  },
  annulee: {
    title: "Commande annulée",
    body: "Adressez-vous à un\u00a0serveur.",
    step: -1,
    chip: "Annulée",
  },
};

/** À table, le règlement en ligne commencé, pas encore abouti. */
const TABLE_PAYING: Stage = {
  title: "Paiement en cours",
  body: "Le paiement en ligne n’est pas terminé\u00a0: sans lui, réglez auprès d’un serveur.",
  step: 0,
  waiting: true,
  chip: "Paiement…",
};

const BAR_STEPS = ["Reçue", "En préparation", "Prête au bar"] as const;

// Le titre de « servie » est la salutation du service (servedGreeting).
const BAR_STAGES: Partial<Record<OrderStatus, Stage>> = {
  ...TABLE_STAGES,
  en_preparation: {
    title: "En préparation",
    body: "Gardez cette page ouverte\u00a0: elle vous prévient dès que c’est prêt au\u00a0bar.",
    step: 1,
    chip: "En préparation",
  },
  prete: {
    title: "C’est prêt\u00a0!",
    body: "Venez au bar et montrez ce code\u00a0:\non le scanne et on vous remet votre commande.",
    step: 2,
    chip: "Prête au bar",
  },
  servie: {
    title: "",
    body: "Remise au bar.\nUne autre envie\u00a0? La carte reste ouverte.",
    step: BAR_STEPS.length,
    chip: "Remise",
  },
};

/** Réglée au comptoir, la commande le dit : on sait qui a encaissé. */
const SETTLED_AT_COUNTER =
  "Réglée au\u00a0comptoir\u00a0: elle est en\u00a0préparation.\nUn serveur vous l’apporte à\u00a0table.";

const SETTLED_AT_COUNTER_BAR =
  "Réglée au\u00a0comptoir\u00a0: elle est en\u00a0préparation.\nCette page vous prévient dès qu’elle est prête au\u00a0bar.";

/** table : à table, ses étapes et ses mots ; bar : retrait au bar (aperçu). */
const stageOf = (ticket: Ticket, table: number | null, bar = false): Stage | null => {
  if (table !== null) {
    if (ticket.status === "en_attente" && ticket.paying) return TABLE_PAYING;
    const stage = ticket.status ? (bar ? BAR_STAGES : TABLE_STAGES)[ticket.status] : undefined;
    if (!stage) return null;
    if (ticket.status === "servie") return { ...stage, title: servedGreeting(ticket) };
    if (ticket.status === "en_preparation" && ticket.atCounter) {
      return { ...stage, body: bar ? SETTLED_AT_COUNTER_BAR : SETTLED_AT_COUNTER };
    }
    return stage;
  }
  return ticket.status === "en_attente" && ticket.paying
    ? PAYING
    : ticket.status
      ? (STAGES[ticket.status] ?? null)
      : null;
};

/**
 * En cuisine, quand ce sera prêt : les minutes qui restent, l'heure, et une
 * barre qui se remplit du règlement à l'heure prévue. L'heure passée, jamais
 * « 0 min » : la commande arrive, sans nouvelle promesse chiffrée. Rien ici
 * ne s'annonce — la zone annoncée dit l'heure prévue une fois, pas chaque
 * minute qui passe ; la barre, muette, double le texte.
 */
function ReadyCountdown({ estimate, ai }: { estimate: ReadyEstimate; ai?: boolean }) {
  const now = useNow(SERVICE_CLOCK_TICK_MS).getTime();
  const from = Date.parse(estimate.from);
  const at = Date.parse(estimate.readyAt);
  const late = now >= at;
  const progress = late ? 1 : Math.max(0, (now - from) / (at - from));
  return (
    <div data-late={late || undefined} className="order-eta mb-3 flex w-full flex-col items-center">
      <p className="flex flex-col items-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">
          {late ? "Presque prête" : "Prête dans environ"}
        </span>
        {late ? (
          <span className="mt-2.5 font-display text-xl font-semibold">
            Encore quelques instants
          </span>
        ) : (
          <span className="order-eta-minutes mt-2 font-display text-5xl font-semibold leading-none tabular-nums">
            {Math.ceil((at - now) / 60_000)}
            <span className="font-sans text-lg font-semibold normal-case text-muted"> min</span>
          </span>
        )}
      </p>
      <span aria-hidden className="order-eta-track mt-5 block h-1.5 w-full rounded-full">
        <span
          className="order-eta-fill block h-full min-w-1.5 rounded-full"
          style={{
            width: `${progress * 100}%`,
            transitionDuration: `${SERVICE_CLOCK_TICK_MS}ms`,
          }}
        />
      </span>
      <p className="order-eta-caption mt-2.5 flex w-full items-baseline justify-between gap-3 text-xs text-muted">
        {/* L'heure prévue n'existe que dans l'aperçu : elle le dit. */}
        <span>{ai ? "Estimation IA" : "Estimation · aperçu"}</span>
        {!late && (
          <time dateTime={estimate.readyAt} className="font-semibold tabular-nums text-foreground">
            vers {frenchTime(new Date(at))}
          </time>
        )}
      </p>
    </div>
  );
}

/** Ce que fait la table : le montant de ses commandes, et ce qui reste à régler. */
const tableTotals = (orders: Ticket[]) => ({
  total: orders.reduce((sum, order) => sum + (order.total ?? 0), 0),
  due: orders.reduce((sum, order) => sum + (order.paid ? 0 : (order.due ?? order.total ?? 0)), 0),
});

/**
 * Aperçu à table, deux commandes ou plus : toutes d'un coup d'œil, à côté du
 * ticket au bureau, dessous au téléphone (la ligne « Vos commandes » du bas
 * de la feuille y mène) — numéro, état, contenu, montant, et ce que fait la
 * table. Chacune s'ouvre au toucher, à la place de celle qu'on lit.
 */
function TableOrders({
  orders,
  shownId,
  onShow,
  listRef,
}: {
  orders: Ticket[];
  shownId: string;
  onShow: (orderId: string) => void;
  listRef: React.RefObject<HTMLElement | null>;
}) {
  const tickets = useTickets();
  const headingId = useId();
  const table = tickets?.table ?? null;
  const { total, due } = tableTotals(orders);
  return (
    <section
      ref={listRef}
      tabIndex={-1}
      aria-labelledby={headingId}
      className="table-orders scroll-mb-40 rounded-2xl border border-hairline bg-background px-4 pb-3 pt-3.5 outline-none"
    >
      <p
        id={headingId}
        className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted"
      >
        Vos commandes
      </p>
      <ul className="mt-1.5 divide-y divide-hairline">
        {orders.map((order) => {
          const current = order.id === shownId;
          return (
            <li key={order.id}>
              <button
                type="button"
                aria-current={current || undefined}
                onClick={() => onShow(order.id)}
                className="table-order flex min-h-11 w-full items-start gap-3 py-2.5 text-left"
              >
                <span
                  className={`w-11 shrink-0 font-display text-base font-semibold lining-nums tabular-nums ${
                    current ? "text-ember-1" : "text-muted"
                  }`}
                >
                  N°&nbsp;{order.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold">
                    {stageOf(order, table, tickets?.barPickup)?.chip ?? "…"}
                    {current && <span className="font-normal text-muted"> (celle-ci)</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {order.lines.map((line) => line.name).join(" · ")}
                  </span>
                </span>
                {order.total !== null && (
                  <span className="shrink-0 font-display text-sm font-semibold lining-nums tabular-nums text-ember-1">
                    {formatPrice(order.total)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-1 flex items-baseline justify-between gap-3 border-t border-hairline pt-2.5 text-sm font-semibold">
        <span>
          Total de la table
          {due > 0 && (
            <span className="block text-xs font-normal text-muted">
              dont {formatPrice(due)} à régler
            </span>
          )}
        </span>
        <span className="font-display text-base lining-nums tabular-nums text-ember-1">
          {formatPrice(total)}
        </span>
      </p>
    </section>
  );
}

function OrderTicket({
  ticket,
  titleId,
  onClose,
}: {
  ticket: Ticket;
  titleId: string;
  onClose: () => void;
}) {
  const { restaurantName, estimatorLive } = useCart();
  const tickets = useTickets();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const [footScrolls, setFootScrolls] = useState(false);
  const table = tickets?.table ?? null;
  const bar = tickets?.barPickup ?? false;
  const steps = table === null ? STEPS : bar ? BAR_STEPS : TABLE_STEPS;
  const stage = stageOf(ticket, table, bar);
  const tracked = !!stage && stage.step >= 0;
  const ready = ticket.status === "prete";
  const active = isActiveTicket(ticket);
  // À table, deux commandes ou plus : « Vos commandes » sous le ticket.
  const orders =
    table === null ? [] : (tickets?.tickets ?? []).filter((order) => order.number !== null);
  const listed = orders.length >= 2;
  const listRef = useRef<HTMLElement>(null);
  // Téléphone couché : le volet de l'état défile seul. Quand il déborde, le
  // clavier doit pouvoir y entrer — une zone nommée, dans l'ordre de tabulation.
  // Les étapes paraissent ou disparaissent avec le paiement : on réobserve.
  useEffect(() => {
    const foot = footRef.current;
    if (!foot) return;
    const measure = () => {
      // La place du fondu du bas (globals.css) ne cache rien ; sa moitié, le
      // bas ordinaire du volet : une ligne collée au bord se lit coupée.
      const pad = parseFloat(getComputedStyle(foot).paddingBottom) / 2;
      const scrolls = foot.scrollHeight - pad > foot.clientHeight + 1;
      // Plus un arrêt de tabulation : le focus ne retombe pas sur la page.
      if (!scrolls && document.activeElement === foot) {
        closeRef.current?.focus({ preventScroll: true });
      }
      setFootScrolls(scrolls);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(foot);
    for (const child of foot.children) observer.observe(child);
    // Défilé, le haut du volet s'efface aussi (globals.css).
    const onScroll = () => foot.toggleAttribute("data-scrolled", foot.scrollTop > 0);
    foot.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      foot.removeEventListener("scroll", onScroll);
    };
  }, [tracked]);
  const estimate = ticket.status === "payee" ? ticket.estimate : null;
  // Payée entre-temps (un débit qui aboutit après la fermeture de la feuille) :
  // un avis de paiement manqué mentirait.
  const cardNotices: string[] = Object.values(CARD_NOTICES);
  const notices =
    tickets?.notices.filter((notice) => !ticket.paid || !cardNotices.includes(notice)) ?? [];

  // Prête pendant que le client lisait le bas du ticket : le numéro revient
  // en vue, c'est lui qu'il montrera au comptoir — et, téléphone couché,
  // « C'est prêt ! » en haut de son volet.
  useEffect(() => {
    if (!ready) return;
    rootRef.current?.closest('[role="dialog"]')?.scrollTo({ top: 0 });
    footRef.current?.scrollTo({ top: 0 });
  }, [ready]);

  // À table, « Vos commandes » change le ticket lu sous le doigt : son haut
  // revient en vue, la liste est plus bas.
  useEffect(() => {
    rootRef.current?.closest('[role="dialog"]')?.scrollTo({ top: 0 });
    footRef.current?.scrollTo({ top: 0 });
  }, [ticket.id]);

  // Le bouton qui vient de servir disparaît : le focus reste dans le ticket.
  const keepFocus = () =>
    requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));

  // Le client renonce au paiement en ligne : l'addition passe au comptoir,
  // où la salle la voit tout de suite.
  const payAtCounter = async () => {
    setBusy(true);
    setProblem(null);
    const ok = await fallBackToCounter(ticket.id);
    setBusy(false);
    if (!ok) {
      setProblem("Le changement n’est pas passé. Vérifiez votre connexion et réessayez.");
      return;
    }
    tickets?.patch(ticket.id, { paying: false });
    keepFocus();
  };

  return (
    <div
      ref={rootRef}
      data-ticket-sheet={ticket.status ?? undefined}
      data-table={table ?? undefined}
      data-bar={bar || undefined}
      data-orders={listed || undefined}
      className="order-ticket-sheet flex flex-col gap-5 p-5 pt-6"
    >
      <div
        data-ready={ready || undefined}
        // À table, la commande servie garde son numéro en couleur : c'est
        // l'une de celles de la table, pas un ticket périmé.
        data-done={(!active && table === null) || undefined}
        data-issued={tickets?.handedOff || undefined}
        className="order-ticket relative"
      >
        <div className="order-ticket-head flex flex-col items-center rounded-t-2xl border border-b-0 border-hairline bg-background px-6 pb-6 pt-5 text-center">
          <p className="order-ticket-meta flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
            <span className="truncate">{restaurantName ?? "Commande"}</span>
            {ticket.createdAt && (
              <time dateTime={ticket.createdAt} className="normal-case tabular-nums">
                <span className="sr-only">Commandée à </span>
                {frenchTime(new Date(ticket.createdAt))}
              </time>
            )}
          </p>
          {/* Le titre de la feuille : le lecteur d'écran l'annonce avec le numéro. */}
          <h2 id={titleId} className="mt-5 flex flex-col items-center">
            <span className="order-ticket-label text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">
              {table === null ? "Votre numéro" : bar ? "Retrait au bar" : `Table ${table}`}
            </span>
            {ticket.number === null ? (
              <span aria-busy className="shimmer mt-3 block h-24 w-40 rounded-2xl" />
            ) : (
              <span className="order-ticket-number mt-1 flex items-start justify-center gap-1.5 font-display leading-none">
                <span aria-hidden className="mt-3 text-2xl font-medium text-muted">N°</span>
                {/* À table, le grand numéro est celui de la commande : la table
                    est dite au-dessus. */}
                {table !== null && <span className="sr-only">, commande n° </span>}
                <span
                  // Taille : globals.css, selon la hauteur de l'écran, et la
                  // largeur du ticket passé 99.
                  data-digits={String(ticket.number).length}
                  className="order-ticket-digits ember-text font-semibold tabular-nums tracking-tight"
                >
                  {ticket.number}
                </span>
              </span>
            )}
          </h2>
          {ticket.total !== null && ticket.status !== "annulee" && (
            <p
              className={`order-ticket-amount mt-3 rounded-full border px-3.5 py-1.5 text-xs font-semibold tabular-nums ${
                ticket.paid
                  ? "border-hairline text-muted"
                  : "border-ember-2/50 bg-ember-2/10 text-foreground"
              }`}
            >
              {/* Paiement en cours : le titre de l'état le dit, le montant
                  reste à régler — sur une ligne, comme au comptoir. */}
              {ticket.paid
                ? `${formatPrice(ticket.total)} · réglée`
                : `${formatPrice(ticket.due ?? ticket.total)} à régler`}
            </p>
          )}
          {ticket.tip ? (
            <p className="order-ticket-tip mt-1.5 text-xs text-muted lining-nums tabular-nums">
              dont pourboire {formatPrice(ticket.tip)}
            </p>
          ) : null}
        </div>

        {/* La découpe du ticket : deux encoches et un pointillé. */}
        <div aria-hidden className="order-ticket-tear relative flex h-5 items-center overflow-hidden bg-background">
          {/* aria-hidden aussi sur les encoches : un thème à angles droits
              (Le Novelty) épargne ce qui est décoratif, et les gardait rondes. */}
          <span aria-hidden className="absolute -left-2.5 size-5 rounded-full border border-hairline bg-surface" />
          <span className="mx-4 flex-1 border-t-2 border-dashed border-hairline" />
          <span aria-hidden className="absolute -right-2.5 size-5 rounded-full border border-hairline bg-surface" />
        </div>

        <div
          ref={footRef}
          {...(footScrolls && {
            tabIndex: 0,
            role: "region",
            "aria-label": "Suivi et détail de la commande",
          })}
          className="order-ticket-foot rounded-b-2xl border border-t-0 border-hairline bg-background px-6 pb-6 pt-4"
        >
          {tracked && (
            <ol className="grid grid-cols-3" aria-label="Avancement de la commande">
              {steps.map((label, index) => {
                const done = index < stage.step;
                const current = index === stage.step;
                const state = done
                  ? "done"
                  : current
                    ? stage.waiting
                      ? "waiting"
                      : "current"
                    : "todo";
                return (
                  <li
                    key={label}
                    // En attente du règlement, l'étape n'a pas commencé.
                    aria-current={state === "current" ? "step" : undefined}
                    data-state={state}
                    className="order-step flex flex-col items-center gap-2 text-center"
                  >
                    <span className="order-step-dot relative flex size-3.5 items-center justify-center rounded-full" />
                    <span
                      // Deux lignes réservées (« après règlement ») : d'un
                      // état à l'autre, le ticket ne bouge pas.
                      className={`order-step-label min-h-[2lh] text-[11px] font-semibold leading-tight ${
                        current || done ? "text-foreground" : "text-muted"
                      }`}
                    >
                      {label}
                      {done && <span className="sr-only"> (fait)</span>}
                      {/* « Prête (en cours) » se lisait mal : la dernière étape se dit seule. */}
                      {state === "current" && index < steps.length - 1 && (
                        <span className="sr-only"> (en cours)</span>
                      )}
                      {state === "todo" && <span className="sr-only"> (à venir)</span>}
                      {state === "waiting" && (
                        <span className="block whitespace-nowrap font-normal text-muted">
                          après règlement
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          <div className="order-ticket-status mt-5 flex flex-col items-center text-center">
            {!stage ? (
              <p className="text-sm text-muted">Un instant…</p>
            ) : (
              // Sous l'heure prévue, le titre reste dit : chaque état a le sien.
              <h3
                className={
                  estimate
                    ? "sr-only"
                    : `order-ticket-title text-balance font-display font-medium ${
                        ready ? "ember-text text-3xl" : "text-2xl"
                      } ${table !== null && ticket.status === "servie" ? "order-ticket-greeting" : ""}`
                }
              >
                {stage.title}
              </h3>
            )}
            {estimate && <ReadyCountdown estimate={estimate} ai={estimatorLive} />}
            {/* Noir sur blanc quel que soit le thème : la douchette lit le
                contraste. Aperçu : le code ne porte qu'un texte de démo. */}
            {bar && ready && ticket.number !== null && (
              <div className="order-ticket-code mb-2 mt-4 rounded-2xl bg-white p-3 text-black">
                <QrCode
                  value={`Démo Ominin · retrait au bar · commande n° ${ticket.number}`}
                  label={`Code de retrait de la commande n° ${ticket.number}`}
                  className="block size-44"
                />
              </div>
            )}
            {/* Sous le titre de l'état, dans le ticket : un avis qui s'en va ne
                déplace pas le numéro, et ne glisse pas sous les boutons. */}
            {notices.map((notice) => (
              <p
                key={notice}
                className="mb-1.5 mt-3 w-full rounded-xl border border-ember-3/40 bg-ember-3/10 px-4 py-3 text-sm leading-relaxed text-foreground"
              >
                {notice}
              </p>
            ))}
            {/* Une phrase par ligne quand le texte le demande (\n), chacune
                équilibrée : avec pre-line, Chrome n'équilibrait plus et
                laissait « règlement. » seul sur sa ligne. */}
            {stage?.body && (
              <p className="mx-auto mt-1.5 max-w-xs text-balance text-sm leading-relaxed text-muted">
                {stage.body.split("\n").map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
            )}
          </div>
          {ticket.lines.length > 0 && (
            <ul
              aria-label="Votre commande"
              className="mt-5 flex flex-col gap-1.5 border-t border-dashed border-hairline pt-4 text-xs text-muted"
            >
              {ticket.lines.map((line, index) => (
                // Par position : deux compositions d'un plat portent son nom.
                <li key={index} className="flex gap-2">
                  <span className="w-6 shrink-0 tabular-nums">{line.quantity}×</span>
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground">{line.name}</span>
                    {/* Les choix sur une ligne, comme au panier : chacun d'un bloc
                        (« Coca-Cola » ne se coupe pas), le point avec celui qui le
                        précède — un par ligne, un tacos en prenait sept. Sauf une
                        formule de l'aperçu : une étape par ligne, comme au panier. */}
                    {line.choices.length > 0 && (
                      <span className="block">
                        {line.choices.map((choice, i) => (
                          <Fragment key={i}>
                            <span className={line.formule ? "block" : "inline-block max-w-full"}>
                              {choice}
                              {!line.formule && i < line.choices.length - 1 && "\u00a0·"}
                            </span>{" "}
                          </Fragment>
                        ))}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {table !== null && tickets?.simulated && (
            <p className="mt-4 text-center text-[11px] text-muted">
              Démo&nbsp;: {bar ? "le bar est simulé, son scan aussi" : "la salle est simulée"}.
            </p>
          )}
        </div>
      </div>

      {listed && tickets && (
        <TableOrders orders={orders} shownId={ticket.id} onShow={tickets.show} listRef={listRef} />
      )}

      {/* Collé au bas de la feuille : sur un petit écran, la sortie reste en
          vue — avec, tant que le paiement en ligne n'a pas abouti, de quoi
          passer au comptoir (le formulaire de paiement vivait dans la feuille
          du panier, refermée), et, dans l'aperçu commercial, l'étape
          suivante. */}
      <div className="order-ticket-exit sticky bottom-0 -mx-5 -mb-5 flex flex-col gap-2 bg-surface px-5 pb-5 pt-3">
        {/* Au téléphone, la liste est sous le ticket : cette ligne, toujours
            en vue, y mène. Au bureau, elle est à côté. */}
        {listed && (
          <button
            type="button"
            onClick={() => {
              listRef.current?.scrollIntoView({ block: "end" });
              listRef.current?.focus({ preventScroll: true });
            }}
            className="flex min-h-11 items-center justify-between gap-3 rounded-full border border-hairline bg-background px-4 text-sm lg:hidden"
          >
            <span className="font-semibold">
              Vos commandes · <span className="lining-nums tabular-nums">{orders.length}</span>
            </span>
            <span className="font-display font-semibold lining-nums tabular-nums text-ember-1">
              {formatPrice(tableTotals(orders).total)} <span aria-hidden>↓</span>
            </span>
          </button>
        )}
        {stage === PAYING && (
          <div className="order-ticket-paying flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void payAtCounter()}
              disabled={busy}
              className="ember-gradient min-h-11 rounded-full px-6 py-3 text-sm font-semibold text-background disabled:opacity-60"
            >
              {busy ? "Un instant…" : "Payer au\u00a0comptoir"}
            </button>
            {problem && (
              <p role="alert" className="text-center text-xs text-ember-3">
                {problem}
              </p>
            )}
          </div>
        )}
        {/* À table, l'étape suivante se dit démo, sur sa propre ligne : son
            libellé laisse « Retour à la carte » entier à 320 px. */}
        <div className={`flex gap-2 ${table === null ? "" : "flex-col"}`}>
          {tickets?.advance && ticket.status && active && (
            <button
              type="button"
              aria-label={
                table === null
                  ? "Suivant\u00a0: aperçu de l’étape suivante"
                  : bar && ticket.status === "prete"
                    ? "Démo\u00a0: le bar scanne le code"
                    : "Démo\u00a0: étape suivante"
              }
              onClick={() => {
                tickets.advance?.(ticket.id);
                // Remise, le bouton s'en va : le focus reste dans le ticket.
                // Servie à table, la feuille du service prend la place du ticket.
                if (ticket.status === "prete") keepFocus();
              }}
              className={`min-h-11 shrink-0 rounded-full border border-dashed px-4 py-3 text-sm font-semibold text-foreground ${
                table === null ? "border-hairline" : "border-muted bg-surface"
              }`}
            >
              {table === null
                ? "Suivant →"
                : bar && ticket.status === "prete"
                  ? "Démo · le bar scanne le code →"
                  : "Démo · étape suivante →"}
            </button>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            // À table, une seule sortie, la même à chaque état.
            className={`min-h-11 flex-1 rounded-full border px-4 py-3 text-sm font-semibold ${
              active || table !== null
                ? "border-hairline text-foreground"
                : "ember-gradient border-transparent bg-origin-border text-background"
            }`}
          >
            {active || table !== null ? "Retour à la carte" : "Fermer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Ce qui s'efface d'une rangée trop étroite, dans l'ordre (globals.css). */
const DOCK_FIT_STEPS = ["served", "pill", "tight", "cooking", "total", "due", "ready", "count"] as const;

/** Au bas de l'écran : les commandes en cours ; à table, les servies aussi. */
const docked = (ticket: Ticket, table: number | null) =>
  ticket.number !== null &&
  (isActiveTicket(ticket) || (table !== null && ticket.status === "servie"));

/**
 * Le service salué, aux couleurs de la maison : la feuille elle-même porte
 * la salutation — le titre, la table, la commande —, et se ferme par ×,
 * Échap ou le fond.
 */
function ServeBox({
  ticket,
  table,
  bar,
  titleId,
  onClose,
}: {
  ticket: Ticket;
  table: number;
  bar: boolean;
  titleId: string;
  onClose: () => void;
}) {
  const drinks = Boolean(ticket.drinksOnly);
  return (
    <div
      data-serve-box={drinks ? "boire" : "manger"}
      className="serve-box relative flex flex-col items-center px-6 pb-10 pt-10 text-center"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="serve-box-close absolute right-3 top-3 z-10 flex size-11 items-center justify-center text-2xl leading-none text-muted"
      >
        ×
      </button>
      <span
        aria-hidden
        className="serve-box-mark flex size-14 items-center justify-center rounded-full border border-hairline text-ember-1"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {ticket.hotDrinksOnly ? (
            // Une tasse sur sa soucoupe.
            <path d="M5 9h11v4a5 5 0 01-5 5h-1a5 5 0 01-5-5V9zM16 10.5h1.5a2.5 2.5 0 010 5H15.5M3.5 20.5h15M9 3.5c-.6.8-.6 1.7 0 2.5M12.5 3.5c-.6.8-.6 1.7 0 2.5" />
          ) : drinks ? (
            // Un verre à pied.
            <path d="M7 3.5h10l-.5 5a4.5 4.5 0 01-9 0L7 3.5zM12 13v7M8.5 20.5h7M7.3 6.5h9.4" />
          ) : (
            // Une cloche de service.
            <path d="M3 17h18M5 17a7 7 0 0114 0M12 10V8.5M10.5 8.5h3M4 20h16" />
          )}
        </svg>
      </span>
      <p className="serve-box-kicker mt-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted lining-nums">
        Commande n°&nbsp;{ticket.number} · {bar ? "Remise au bar" : `Table ${table}`}
      </p>
      <h2
        id={titleId}
        className="serve-box-title mt-3 text-balance font-display text-4xl font-medium leading-tight"
      >
        {servedGreeting(ticket)}
      </h2>
      <span aria-hidden className="serve-box-rule ember-gradient mt-5 block h-px w-16" />
      {ticket.lines.length > 0 && (
        <p className="serve-box-items mt-4 line-clamp-3 max-w-xs text-pretty text-sm leading-relaxed text-muted">
          {ticket.lines
            .map((line) => (line.quantity > 1 ? `${line.quantity}\u00a0× ${line.name}` : line.name))
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

/**
 * Les commandes en cours, en pastilles au-dessus de la barre du panier : le
 * numéro et l'état d'un coup d'œil, le ticket entier au toucher. Une zone
 * annoncée dit chaque changement aux lecteurs d'écran, ticket fermé compris.
 */
export function TicketTracker() {
  const tickets = useTickets();
  // Relu à chaque changement du panier : sa pastille change de largeur.
  useCart();
  const titleId = useId();
  const serveTitleId = useId();
  const shownId = tickets?.shownId ?? null;
  const table = tickets?.table ?? null;
  const servedId = tickets?.served?.id ?? null;
  const dockRef = useRef<HTMLDivElement>(null);

  // Le salut du service s'ouvre de lui-même : seulement quand aucune feuille
  // n'est ouverte ni ne descend (Sheet le compte) — empilé sur une feuille
  // qui part, il se voyait rendre la page et le défilement. Fixé à son
  // ouverture : sa propre feuille compte, elle aussi.
  const noSheet = useNoSheet();
  const [greetingId, setGreetingId] = useState<string | null>(null);
  if (servedId && greetingId === null && noSheet) setGreetingId(servedId);

  // Une seule rangée, à gauche de la pastille du panier : si elle déborde, des
  // mots s'effacent — voir globals.css, data-dock-fit —, puis, en dernier
  // recours, elle passe à la ligne. Mesuré, pas calculé : la largeur tient à
  // la police de la maison et au montant du panier.
  const fitDock = useRef(() => {});
  useLayoutEffect(() => {
    const dock = dockRef.current;
    const root = dock?.closest<HTMLElement>("[data-menu-root]");
    if (!dock || !root) return;
    fitDock.current = () => {
      const steps: string[] = [];
      const apply = () => {
        root.dataset.dockFit = steps.join(" ");
      };
      dock.style.paddingRight = "";
      apply();
      // La pastille du panier se lit à sa place au repos (offset*, dans son
      // conteneur fixe) : son rectangle à l'écran suit son entrée animée
      // (ec-panier, elle monte du bas) et ses sauts, et la donnait sous les
      // tickets au premier rendu — rien ne se serrait, elle couvrait le dernier.
      const room = () => {
        const box = dock.getBoundingClientRect();
        const bar = root.querySelector<HTMLElement>(".cart-bar");
        const holder = bar?.offsetParent?.getBoundingClientRect();
        if (!bar || !holder) return box.right;
        const top = holder.top + bar.offsetTop;
        const beside = top < box.bottom && top + bar.offsetHeight > box.top;
        return beside
          ? Math.min(
              box.right,
              holder.left + bar.offsetLeft - parseFloat(getComputedStyle(dock).columnGap)
            )
          : box.right;
      };
      const fits = () => (dock.lastElementChild?.getBoundingClientRect().right ?? 0) <= room();
      for (const step of DOCK_FIT_STEPS) {
        if (fits()) return;
        steps.push(step);
        apply();
      }
      if (fits()) return;
      // Sur deux rangées, la place revient : le compte du panier aussi.
      steps.splice(steps.indexOf("count"), 1, "wrap");
      apply();
      dock.style.paddingRight = `${dock.getBoundingClientRect().right - room()}px`;
    };
    fitDock.current();
    return () => {
      fitDock.current = () => {};
      delete root.dataset.dockFit;
    };
  });
  // Le fondu sous les pastilles efface la carte qui passe derrière elles ; sur
  // le pied de page de l'établissement, il le salissait : il s'en va quand
  // sa bande ne couvre plus que le pied.
  const inDock = (tickets?.tickets ?? []).some((ticket) => docked(ticket, table));
  useEffect(() => {
    const dock = dockRef.current?.parentElement;
    const root = dock?.closest<HTMLElement>("[data-menu-root]");
    const footer = root?.querySelector("footer");
    if (!dock || !root || !footer) return;
    let observer: IntersectionObserver | null = null;
    let band = -1;
    // La bande du fondu (::before de .ticket-dock) change avec l'orientation :
    // l'observateur ne se refait que si elle a changé.
    const watch = () => {
      const next = parseFloat(getComputedStyle(dock, "::before").height) || 0;
      if (next === band) return;
      band = next;
      observer?.disconnect();
      observer = new IntersectionObserver(
        (entries) =>
          root.toggleAttribute("data-footer-seen", entries[entries.length - 1].isIntersecting),
        { rootMargin: `0px 0px -${band}px 0px` }
      );
      observer.observe(footer);
    };
    watch();
    window.addEventListener("resize", watch);
    return () => {
      window.removeEventListener("resize", watch);
      observer?.disconnect();
      root.removeAttribute("data-footer-seen");
    };
  }, [inDock]);

  useEffect(() => {
    const refit = () => fitDock.current();
    let live = true;
    void document.fonts.ready.then(() => live && refit());
    window.addEventListener("resize", refit);
    return () => {
      live = false;
      window.removeEventListener("resize", refit);
    };
  }, []);

  // Ticket refermé : le focus rejoint sa pastille — ouvert à l'envoi, il n'a
  // plus de déclencheur (le panier est vide). Après le nettoyage de la feuille,
  // qui rend la page à la navigation : plus tôt, la pastille était inerte.
  const lastShown = useRef<string | null>(null);
  // Refermé au doigt, le ticket rend le focus à sa pastille sans l'anneau du
  // clavier : au toucher, il passait pour une pastille « choisie ».
  // L'anneau revient à la première touche.
  const byPointer = useRef(false);
  useEffect(() => {
    const onPointer = () => {
      byPointer.current = true;
    };
    const onKey = () => {
      byPointer.current = false;
      document.querySelector("[data-quiet-focus]")?.removeAttribute("data-quiet-focus");
    };
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, []);
  useEffect(() => {
    if (shownId) {
      lastShown.current = shownId;
      return;
    }
    // La feuille du service a pris la place du ticket : elle a le focus, et
    // le rendra à la pastille en partant (cet effet, de nouveau).
    if (servedId) return;
    const id = lastShown.current;
    lastShown.current = null;
    // Remise, sa pastille est partie : la première qui reste prend le focus,
    // ou, plus aucune, la barre du panier.
    const target = id
      ? (document.querySelector<HTMLElement>(`[data-ticket="${id}"]`) ??
        document.querySelector<HTMLElement>("[data-ticket]") ??
        document.querySelector<HTMLElement>(".cart-bar"))
      : null;
    if (!target) return;
    if (byPointer.current) {
      target.setAttribute("data-quiet-focus", "");
      target.addEventListener("blur", () => target.removeAttribute("data-quiet-focus"), {
        once: true,
      });
    }
    target.focus({ preventScroll: true });
  }, [shownId, servedId]);

  if (!tickets) return null;
  // Ce que le client doit faire d'abord : venir chercher, puis payer. À
  // table, dans l'ordre des commandes : une pastille servie ne change pas de
  // place.
  const urgency = (ticket: Ticket) =>
    ticket.status === "prete" ? 0 : ticket.status === "en_attente" ? 1 : 2;
  const docks = tickets.tickets.filter((ticket) => docked(ticket, table));
  const active = table === null ? docks.sort((a, b) => urgency(a) - urgency(b)) : docks;
  const shown = tickets.tickets.find((ticket) => ticket.id === shownId);
  const served = tickets.served;
  const greeting = tickets.tickets.find((ticket) => ticket.id === greetingId);

  return (
    <>
      <p role="status" className="sr-only">
        {tickets.announcement}
      </p>
      {active.length > 0 && (
        <div className="ticket-dock pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4">
          <div
            ref={dockRef}
            role="group"
            aria-label="Vos commandes"
            className="ticket-dock-column flex w-full max-w-md items-end gap-2"
          >
            {active.map((ticket) => {
              const stage = stageOf(ticket, table, tickets.barPickup);
              const ready = ticket.status === "prete";
              const due = ticket.status === "en_attente";
              const done = !isActiveTicket(ticket);
              return (
                <button
                  key={ticket.id}
                  type="button"
                  data-ticket={ticket.id}
                  data-ticket-status={ticket.status ?? undefined}
                  data-ready={ready || undefined}
                  data-due={due || undefined}
                  data-done={done || undefined}
                  onClick={(event) => {
                    event.currentTarget.focus({ preventScroll: true });
                    tickets.show(ticket.id);
                  }}
                  aria-label={
                    table === null
                      ? `Ouvrir le ticket de la commande n° ${ticket.number}${stage ? `, ${stage.chip}` : ""}`
                      : `Ouvrir le suivi de la commande n° ${ticket.number}${stage ? `, ${stage.chip}` : ""}`
                  }
                  className={`ticket-chip pointer-events-auto flex h-12 items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-3.5 shadow-2xl shadow-black/40 ${
                    ready
                      ? "border-transparent bg-foreground text-background"
                      : due
                        ? "border-ember-2 bg-surface-raised text-foreground"
                        : done
                          ? "border-hairline bg-surface text-muted"
                          : "border-ember-2/70 bg-surface text-foreground"
                  }`}
                >
                  <span
                    className={`ticket-chip-number flex h-9 min-w-9 items-center justify-center rounded-full px-2 font-display text-lg font-semibold tabular-nums ${
                      ready ? "ember-gradient text-background" : "bg-background text-ember-1"
                    }`}
                  >
                    {/* À table, « N° » : le chiffre seul passait pour la table. */}
                    {table !== null && (
                      <span aria-hidden className="mr-0.5 font-sans text-[10px] font-semibold">
                        N°
                      </span>
                    )}
                    {ticket.number}
                  </span>
                  <span className="ticket-chip-label whitespace-nowrap text-[13px] font-semibold">
                    {stage?.chip ?? "…"}
                  </span>
                  {/* Servie : plus rien à guetter ; une coche à la place du point d'état. */}
                  {done ? (
                    <CheckIcon className="size-3.5 shrink-0 stroke-[2.6] text-ember-1" />
                  ) : (
                    <span aria-hidden className="ticket-chip-dot size-2 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {/* Une feuille à la fois : un ticket ouvert pendant le salut du service,
          ou pendant qu'il attend son tour, attend qu'il se referme. */}
      {shown && !served && (
        <Sheet
          onClosed={tickets.hide}
          backdropCloses
          labelledBy={titleId}
          enter={tickets.handedOff ? "swap" : "rise"}
        >
          {(dismiss) => <OrderTicket ticket={shown} titleId={titleId} onClose={dismiss} />}
        </Sheet>
      )}
      {greeting && table !== null && (
        <Sheet
          key={greeting.id}
          onClosed={() => {
            setGreetingId(null);
            tickets.dismissServed();
          }}
          backdropCloses
          labelledBy={serveTitleId}
        >
          {(dismiss) => (
            <ServeBox
              ticket={greeting}
              table={table}
              bar={tickets.barPickup}
              titleId={serveTitleId}
              onClose={dismiss}
            />
          )}
        </Sheet>
      )}
    </>
  );
}

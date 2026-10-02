"use client";

import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Sheet } from "@/components/menu/sheet";
import { SERVICE_CLOCK_TICK_MS } from "@/lib/gestion/constants";
import { frenchTime } from "@/lib/gestion/format";
import type { OrderStatus } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import { formatPrice } from "@/lib/menu-data";
import { useCart } from "@/lib/menu/cart";
import { fallBackToCounter } from "@/lib/menu/online-payment";
import {
  CARD_NOTICES,
  isActiveTicket,
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
  body: "Le paiement en ligne n’est pas terminé. Reprenez-le, ou touchez «\u00a0Payer au\u00a0comptoir à la place\u00a0»\u00a0: votre commande y apparaîtra.",
  step: 1,
  waiting: true,
  chip: "Paiement…",
};

const stageOf = (ticket: Ticket): Stage | null =>
  ticket.status === "en_attente" && ticket.paying
    ? PAYING
    : ticket.status
      ? (STAGES[ticket.status] ?? null)
      : null;

/**
 * En cuisine, quand ce sera prêt : les minutes qui restent, l'heure, et une
 * barre qui se remplit du règlement à l'heure prévue. L'heure passée, jamais
 * « 0 min » : la commande arrive, sans nouvelle promesse chiffrée. Rien ici
 * ne s'annonce — la zone annoncée dit l'heure prévue une fois, pas chaque
 * minute qui passe ; la barre, muette, double le texte.
 */
function ReadyCountdown({ estimate }: { estimate: ReadyEstimate }) {
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
        <span>Estimation · aperçu</span>
        {!late && (
          <time dateTime={estimate.readyAt} className="font-semibold tabular-nums text-foreground">
            vers {frenchTime(new Date(at))}
          </time>
        )}
      </p>
    </div>
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
  const { restaurantName, paymentProvider } = useCart();
  const tickets = useTickets();
  const [busy, setBusy] = useState<"reprise" | "comptoir" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const [footScrolls, setFootScrolls] = useState(false);
  const stage = stageOf(ticket);
  const tracked = !!stage && stage.step >= 0;
  const ready = ticket.status === "prete";
  const active = isActiveTicket(ticket);
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
  // Seul Stripe se reprend d'ici (une nouvelle session de paiement) ; le
  // formulaire carte de SumUp ou de Square vivait dans la feuille du panier,
  // refermée : il ne reste que le comptoir — qui ne voit la commande qu'une
  // fois le bouton touché.
  const resumable = paymentProvider === "stripe";
  const body =
    stage === PAYING && !resumable
      ? "Le paiement en ligne n’est pas terminé. Touchez «\u00a0Payer au\u00a0comptoir\u00a0»\u00a0: votre commande y apparaîtra."
      : stage?.body;
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

  // Retour arrière depuis Stripe, page restituée telle quelle : le bouton
  // restait figé sur « Un instant… ».
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  // Le bouton qui vient de servir disparaît : le focus reste dans le ticket.
  const keepFocus = () =>
    requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));

  // Le client renonce au paiement en ligne : l'addition passe au comptoir,
  // où la salle la voit tout de suite.
  const payAtCounter = async () => {
    setBusy("comptoir");
    setProblem(null);
    const ok = await fallBackToCounter(ticket.id);
    setBusy(null);
    if (!ok) {
      setProblem("Le changement n’est pas passé. Vérifiez votre connexion et réessayez.");
      return;
    }
    tickets?.patch(ticket.id, { paying: false });
    keepFocus();
  };

  const resumePayment = async () => {
    setBusy("reprise");
    setProblem(null);
    try {
      const response = await fetch("/api/stripe/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: ticket.id }),
      });
      const body = (await response.json()) as { url?: string };
      if (response.ok && body.url) {
        window.location.assign(body.url);
        return;
      }
    } catch {
      // Traité comme un refus, juste en dessous.
    }
    setBusy(null);
    setProblem("Le paiement en ligne n’a pas pu reprendre. Réglez au\u00a0comptoir, ou réessayez.");
  };

  return (
    <div ref={rootRef} className="order-ticket-sheet flex flex-col gap-5 p-5 pt-6">
      <div
        data-ready={ready || undefined}
        data-done={!active || undefined}
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
              Votre numéro
            </span>
            {ticket.number === null ? (
              <span aria-busy className="shimmer mt-3 block h-24 w-40 rounded-2xl" />
            ) : (
              <span className="order-ticket-number mt-1 flex items-start justify-center gap-1.5 font-display leading-none">
                <span aria-hidden className="mt-3 text-2xl font-medium text-muted">N°</span>
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
        </div>

        {/* La découpe du ticket : deux encoches et un pointillé. */}
        <div aria-hidden className="order-ticket-tear relative flex h-5 items-center overflow-hidden bg-background">
          <span className="absolute -left-2.5 size-5 rounded-full border border-hairline bg-surface" />
          <span className="mx-4 flex-1 border-t-2 border-dashed border-hairline" />
          <span className="absolute -right-2.5 size-5 rounded-full border border-hairline bg-surface" />
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
              {STEPS.map((label, index) => {
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
                      {state === "current" && index < STEPS.length - 1 && (
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
                      }`
                }
              >
                {stage.title}
              </h3>
            )}
            {estimate && <ReadyCountdown estimate={estimate} />}
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
            {body && (
              <p className="mx-auto mt-1.5 max-w-xs text-balance text-sm leading-relaxed text-muted">
                {body.split("\n").map((line) => (
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
                        précède. Un par ligne, un tacos en prenait sept. */}
                    {line.choices.length > 0 && (
                      <span className="block">
                        {line.choices.map((choice, i) => (
                          <Fragment key={i}>
                            <span className="inline-block max-w-full">
                              {choice}
                              {i < line.choices.length - 1 && "\u00a0·"}
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
        </div>
      </div>

      {/* Collé au bas de la feuille : sur un petit écran, la sortie reste en
          vue — avec, tant que le paiement en ligne n'a pas abouti, de quoi le
          reprendre ou passer au comptoir, et, dans l'aperçu commercial,
          l'étape suivante. */}
      <div className="order-ticket-exit sticky bottom-0 -mx-5 -mb-5 flex flex-col gap-2 bg-surface px-5 pb-5 pt-3">
        {stage === PAYING && (
          <div className="order-ticket-paying flex flex-col gap-2">
            {resumable && (
              <button
                type="button"
                onClick={() => void resumePayment()}
                disabled={busy !== null}
                className="ember-gradient min-h-11 rounded-full px-6 py-3 text-sm font-semibold text-background disabled:opacity-60"
              >
                {busy === "reprise" ? "Un instant…" : "Reprendre le paiement"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void payAtCounter()}
              disabled={busy !== null}
              className={`min-h-11 rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-60 ${
                resumable
                  ? "border border-ember-2/50 text-foreground"
                  : "ember-gradient text-background"
              }`}
            >
              {busy === "comptoir"
                ? "Un instant…"
                : resumable
                  ? "Payer au\u00a0comptoir à la place"
                  : "Payer au\u00a0comptoir"}
            </button>
            {problem && (
              <p role="alert" className="text-center text-xs text-ember-3">
                {problem}
              </p>
            )}
          </div>
        )}
        <div className="flex gap-2">
          {tickets?.advance && ticket.status && active && (
            <button
              type="button"
              aria-label={"Suivant\u00a0: aperçu de l’étape suivante"}
              onClick={() => {
                tickets.advance?.(ticket.id);
                // Remise, le bouton s'en va : le focus reste dans le ticket.
                if (ticket.status === "prete") keepFocus();
              }}
              className="min-h-11 shrink-0 rounded-full border border-dashed border-hairline px-4 py-3 text-sm font-semibold text-foreground"
            >
              Suivant →
            </button>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={`min-h-11 flex-1 rounded-full border px-4 py-3 text-sm font-semibold ${
              active
                ? "border-hairline text-foreground"
                : "ember-gradient border-transparent bg-origin-border text-background"
            }`}
          >
            {active ? "Retour à la carte" : "Fermer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Ce qui s'efface d'une rangée trop étroite, dans l'ordre (globals.css). */
const DOCK_FIT_STEPS = ["pill", "tight", "cooking", "total", "due", "ready", "count"] as const;

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
  const shownId = tickets?.shownId ?? null;
  const dockRef = useRef<HTMLDivElement>(null);

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
      const room = () => {
        const box = dock.getBoundingClientRect();
        const bar = root.querySelector(".cart-bar")?.getBoundingClientRect();
        const beside = bar && bar.top < box.bottom && bar.bottom > box.top;
        return beside
          ? Math.min(box.right, bar.left - parseFloat(getComputedStyle(dock).columnGap))
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
  const docked = (tickets?.tickets ?? []).some(
    (ticket) => isActiveTicket(ticket) && ticket.number !== null
  );
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
  }, [docked]);

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
  useEffect(() => {
    if (shownId) {
      lastShown.current = shownId;
      return;
    }
    const id = lastShown.current;
    lastShown.current = null;
    // Remise, sa pastille est partie : la première qui reste prend le focus,
    // ou, plus aucune, la barre du panier.
    if (id) {
      (
        document.querySelector<HTMLElement>(`[data-ticket="${id}"]`) ??
        document.querySelector<HTMLElement>("[data-ticket]") ??
        document.querySelector<HTMLElement>(".cart-bar")
      )?.focus({ preventScroll: true });
    }
  }, [shownId]);

  if (!tickets) return null;
  // Ce que le client doit faire d'abord : venir chercher, puis payer.
  const urgency = (ticket: Ticket) =>
    ticket.status === "prete" ? 0 : ticket.status === "en_attente" ? 1 : 2;
  const active = tickets.tickets
    .filter((ticket) => isActiveTicket(ticket) && ticket.number !== null)
    .sort((a, b) => urgency(a) - urgency(b));
  const shown = tickets.tickets.find((ticket) => ticket.id === shownId);

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
              const stage = stageOf(ticket);
              const ready = ticket.status === "prete";
              const due = ticket.status === "en_attente";
              return (
                <button
                  key={ticket.id}
                  type="button"
                  data-ticket={ticket.id}
                  data-ready={ready || undefined}
                  data-due={due || undefined}
                  onClick={(event) => {
                    event.currentTarget.focus({ preventScroll: true });
                    tickets.show(ticket.id);
                  }}
                  aria-label={`Ouvrir le ticket de la commande n° ${ticket.number}${stage ? `, ${stage.chip}` : ""}`}
                  className={`ticket-chip pointer-events-auto flex h-12 items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-3.5 shadow-2xl shadow-black/40 ${
                    ready
                      ? "border-transparent bg-foreground text-background"
                      : due
                        ? "border-ember-2 bg-surface-raised text-foreground"
                        : "border-ember-2/70 bg-surface text-foreground"
                  }`}
                >
                  <span
                    className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 font-display text-lg font-semibold tabular-nums ${
                      ready ? "ember-gradient text-background" : "bg-background text-ember-1"
                    }`}
                  >
                    {ticket.number}
                  </span>
                  <span className="ticket-chip-label whitespace-nowrap text-[13px] font-semibold">
                    {stage?.chip ?? "…"}
                  </span>
                  <span aria-hidden className="ticket-chip-dot size-2 rounded-full" />
                </button>
              );
            })}
          </div>
        </div>
      )}
      {shown && (
        <Sheet
          onClosed={tickets.hide}
          backdropCloses
          labelledBy={titleId}
          enter={tickets.handedOff ? "swap" : "rise"}
        >
          {(dismiss) => <OrderTicket ticket={shown} titleId={titleId} onClose={dismiss} />}
        </Sheet>
      )}
    </>
  );
}

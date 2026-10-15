"use client";

import { useEffect, useRef, useState } from "react";
import { LineOptions } from "@/components/gestion/commandes/order-line";
import { StatusBadge } from "@/components/gestion/commandes/status-badge";
import { isNextDay, pickupStatus, useCollectDemo } from "@/lib/collect/demo/provider";
import { COLLECT_ETA_CHOICES_MIN } from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import type { OrderStatus } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";

/*
 * Volet dashboard de la démo Collect : la grammaire visuelle du vrai écran
 * Commandes (badge Emporter, chip « Payée en ligne », pilules d'action,
 * puces de délai), sans le store gestion — tout vient du contexte démo.
 */

function EmptyState() {
  const { step, cart } = useCollectDemo();
  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      <div className="rounded-2xl border border-dashed border-ember-2/40 bg-ember-2/5 p-6 text-center">
        <span className="relative mx-auto flex size-10 items-center justify-center" aria-hidden>
          <span className="absolute inset-0 animate-ping rounded-full bg-ember-2/30 motion-reduce:animate-none" />
          <span className="ember-gradient relative size-3 rounded-full" />
        </span>
        <p className="mt-3 text-sm font-semibold">En attente de commandes…</p>
        {/* Le message suit le client : il compose, valide, paie. */}
        <p className="mt-1 text-xs text-muted">
          {step === "menu" && cart.length > 0 ? (
            "Le client compose sa commande : elle arrive ici dès qu'il a payé."
          ) : step === "menu" ? (
            <>
              <span className="lg:hidden">Passez commande côté client : elle arrive ici, payée.</span>
              <span className="hidden lg:inline">← Ajoutez un plat sur le téléphone : la commande arrive ici, payée.</span>
            </>
          ) : step === "checkout" ? (
            "Le client choisit son retrait : la commande arrive ici dès qu'il a payé."
          ) : step === "paiement" ? (
            "Le client paie : la commande arrive dans un instant."
          ) : (
            "Paiement reçu : la commande arrive…"
          )}
        </p>
      </div>
    </div>
  );
}

function OrderCardDemo() {
  const demo = useCollectDemo();
  const [choosingEta, setChoosingEta] = useState(false);
  const order = demo.order!;
  // Pour demain : en attente, comme sur le vrai écran ; elle se lance comme les autres.
  const status = (demo.step === "programmee" ? "en_attente" : demo.step) as OrderStatus;
  const pulse = demo.hintActive;
  const real = demo.settings.realPhone;
  const articles = order.lines.reduce((sum, line) => sum + line.quantity, 0);
  // Vrai téléphone : sous lg, l'écran du restaurant se touche aussi (44 px).
  const action = `ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background ${
    real ? "max-lg:min-h-11" : ""
  } ${pulse ? "soft-pulse" : ""}`;

  // Le bouton d'une action de la carte disparaît avec elle : le focus passe
  // à l'action suivante (data-action), ou au titre une fois la commande close.
  const acted = useRef(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const act = (fn: () => void) => () => {
    acted.current = true;
    fn();
  };
  // Le ✕ du choix du délai : sur la ligne du libellé sous lg, à la suite des
  // délais au-delà (deux places, une seule affichée).
  const closeEta = (placement: string) => (
    <button
      type="button"
      onClick={act(() => setChoosingEta(false))}
      aria-label="Fermer le choix de délai"
      className={`flex size-11 items-center justify-center rounded-full text-base text-faint transition-colors hover:text-foreground lg:pointer-fine:size-9 ${placement}`}
    >
      ✕
    </button>
  );
  // La liste passe sous la barre d'actions seulement quand elle déborde de
  // l'écran : alors seulement la barre masque sa marge, et le choix du délai
  // rappelle les plats qu'il recouvre.
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const area = actionsRef.current?.closest<HTMLElement>(".overflow-y-auto");
    if (!area) return;
    const observer = new ResizeObserver(() =>
      setOverflowing(area.scrollHeight > area.clientHeight + 1)
    );
    observer.observe(area);
    if (area.firstElementChild) observer.observe(area.firstElementChild);
    return () => observer.disconnect();
  }, []);

  // Arrivée de la carte alors que le focus est perdu (le bouton qui l'avait est
  // parti avec le paiement ou la bascule) : il passe à sa première action.
  useEffect(() => {
    if (document.activeElement !== document.body) return;
    actionsRef.current?.querySelector<HTMLElement>("[data-action]")?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!acted.current) return;
    acted.current = false;
    // Commande close : la suite est « Rejouer » — sous la puce guide pour un
    // vrai téléphone, sur le téléphone côte à côte sinon.
    const replay = actionsRef.current
      ?.closest("[data-demo-stage]")
      ?.querySelector<HTMLElement>("[data-demo-replay], [data-demo-phone] [data-action]");
    (
      actionsRef.current?.querySelector<HTMLElement>("[data-action]") ??
      (replay?.offsetParent ? replay : headingRef.current)
    )?.focus({ preventScroll: true });
  }, [demo.step, choosingEta]);

  return (
    <article className="order-pop rounded-2xl border border-hairline bg-surface p-5">
      {/* Vrai téléphone : le statut reste sur la ligne du nom, à droite, quel
          que soit son libellé ; c'est le nom qui cède. */}
      <div
        className={`flex items-center justify-between gap-x-3 gap-y-1.5 ${
          real ? "" : "flex-wrap"
        }`}
      >
        <div className="flex min-w-0 items-baseline gap-2.5">
          {/* Vrai téléphone, sous lg : le nom garde la place (tout est à emporter ici). */}
          <span
            className={`shrink-0 rounded-full border border-ember-2/30 bg-ember-2/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2 ${
              real ? "max-lg:hidden" : ""
            }`}
          >
            Emporter
          </span>
          <h3 ref={headingRef} tabIndex={-1} className="truncate font-display text-lg font-medium outline-none">
            {order.customerName}
          </h3>
          <span className="shrink-0 text-[13px] tabular-nums text-muted">
            {/* Au lendemain, l'heure de commande est celle de la veille. */}
            {isNextDay(order) ? "hier " : ""}
            {formatTime(order.createdAt)}
          </span>
        </div>
        <StatusBadge status={status} />
      </div>

      <p className={real ? "mt-1.5 text-sm font-semibold" : "mt-1 text-xs text-muted"}>
        {order.readyAt && status === "en_preparation"
          ? `Prête vers : ${formatTime(order.readyAt)}`
          : pickupStatus(order, demo.step)}
      </p>
      {real ? (
        // « Payée en ligne » est la puce du pied de carte, comme sur le vrai
        // écran ; sous lg, la note cède sa place aux lignes.
        <p className="mt-1 text-[11px] text-muted max-lg:hidden">
          {"Paiement versé sur votre compte\u00a0·\u00a0ticket imprimé en cuisine (avec imprimante)"}
        </p>
      ) : (
        <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] font-semibold text-ember-1">
          <span>Payée en ligne · versée sur votre compte</span>
          <span aria-hidden className="text-faint">·</span>
          <span>Ticket imprimé en cuisine (avec imprimante)</span>
        </p>
      )}

      {/* Les choix sous la ligne (LineOptions), suppléments dans le prix : comme le vrai écran (order-card). */}
      <ul className="mt-3 flex flex-col gap-1.5">
        {order.lines.map((line) => (
          <li key={line.key} className="flex flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span>
                <span className="tabular-nums text-muted">{line.quantity}×</span>{" "}
                {line.name}
              </span>
              <span className="tabular-nums text-muted">
                {formatPrice(line.quantity * line.unitPrice)}
              </span>
            </div>
            <LineOptions
              line={{
                id: line.key,
                name: line.name,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                options: line.options,
              }}
            />
          </li>
        ))}
      </ul>

      {/* Collée au bas de l'écran quand la commande défile : ses boutons
          restent toujours visibles. -mb-5 pb-5 : son fond couvre la marge de
          la carte ; -bottom-1 : celle de la zone de défilement. */}
      <div
        ref={actionsRef}
        // L'ombre, de la couleur de la carte, couvre la marge de la liste
        // dessous ; le fondu (before:), les lignes qui passent dessous.
        className={`sticky -bottom-1 -mb-5 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline bg-surface pb-5 pt-3 before:pointer-events-none before:absolute before:inset-x-0 before:-top-4 before:h-4 before:bg-linear-to-t before:from-surface before:to-transparent ${
          real ? "max-lg:gap-y-2" : ""
        } ${overflowing ? "shadow-[0_4px_0_var(--surface)]" : ""}`}
      >
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="font-display text-lg text-ember-1">
            {formatPrice(order.total)}
          </span>
          <span className="rounded-full border border-ember-2/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-1">
            Payée en ligne
          </span>
          {/* Vrai téléphone : une longue commande défile derrière cette barre ; elle dit combien. */}
          {real && order.lines.length > 1 && (
            <span className="text-[11px] text-muted">
              {articles === order.lines.length ? (
                `${articles} articles`
              ) : (
                <>
                  {order.lines.length} lignes
                  {/* Sous lg, le nombre de lignes seul tient sur la ligne du total. */}
                  <span className="max-lg:hidden">{` · ${articles} articles`}</span>
                </>
              )}
            </span>
          )}
        </div>

        {(demo.step === "en_attente" || demo.step === "programmee") &&
          (choosingEta ? (
            real ? (
              // Le choix du délai du vrai écran (order-card) : « Sans estimation » et ✕
              // compris. ✕ sur la ligne du libellé ; sous lg, les délais en trois
              // colonnes, « Sans estimation » sur deux.
              <div
                className="flex w-full flex-col gap-2"
                // Échap referme le choix, comme ✕.
                onKeyDown={(event) => {
                  if (event.key === "Escape") act(() => setChoosingEta(false))();
                }}
              >
                {/* Sous lg, quand le choix couvre les lignes : leurs noms en une ligne au-dessus. */}
                {overflowing && (
                  <p className="truncate text-xs text-muted lg:hidden">
                    {order.lines.map((line) => line.name).join(", ")}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted">Prête dans&nbsp;:</span>
                  {closeEta("lg:hidden")}
                </div>
                <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-wrap">
                  {COLLECT_ETA_CHOICES_MIN.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      // Le focus va au délai que la puce guide fait respirer.
                      data-action={minutes === COLLECT_ETA_CHOICES_MIN[1] || undefined}
                      onClick={act(() => demo.accept(minutes))}
                      className={`rounded-full border border-hairline px-3.5 py-2 text-sm font-semibold tabular-nums transition-colors hover:border-ember-2/40 hover:text-ember-1 max-lg:min-h-11 ${
                        pulse && minutes === COLLECT_ETA_CHOICES_MIN[1] ? "soft-pulse" : ""
                      }`}
                    >
                      {minutes} min
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={act(() => demo.accept(null))}
                    className="col-span-2 rounded-full border border-hairline px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 max-lg:min-h-11"
                  >
                    Sans estimation
                  </button>
                  {closeEta("max-lg:hidden")}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted">Prête dans&nbsp;:</span>
                {COLLECT_ETA_CHOICES_MIN.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    data-action={minutes === COLLECT_ETA_CHOICES_MIN[1] || undefined}
                    onClick={act(() => demo.accept(minutes))}
                    className={`rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors hover:border-ember-2/40 hover:text-ember-1 ${
                      pulse && minutes === COLLECT_ETA_CHOICES_MIN[1] ? "soft-pulse" : ""
                    }`}
                  >
                    {minutes} min
                  </button>
                ))}
                <button
                  type="button"
                  onClick={act(() => setChoosingEta(false))}
                  className="px-1 text-xs font-semibold text-faint transition-colors hover:text-foreground"
                >
                  Retour
                </button>
              </div>
            )
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                // Un créneau choisi dit déjà l'heure : pas de délai à estimer,
                // comme order-card quand pickupAt est posé.
                data-action
                onClick={act(() => (order.pickupAt ? demo.accept(null) : setChoosingEta(true)))}
                className={action}
              >
                Commencer la préparation
              </button>
            </div>
          ))}

        {status === "en_preparation" && (
          <button type="button" data-action onClick={act(demo.markReady)} className={action}>
            Marquer prête
          </button>
        )}

        {status === "prete" && (
          <button type="button" data-action onClick={act(demo.markPickedUp)} className={action}>
            Marquer retirée
          </button>
        )}

        {status === "retiree" && (
          <span className="text-xs font-semibold text-muted">
            Remise au comptoir — commande clôturée.
          </span>
        )}
      </div>
    </article>
  );
}

export function RestaurantPane() {
  const demo = useCollectDemo();
  const hasOrder =
    demo.orderVisible &&
    demo.order &&
    demo.step !== "menu" &&
    demo.step !== "checkout" &&
    demo.step !== "paiement";

  return (
    <div
      className={`flex h-[var(--demo-restaurant-h,var(--demo-pane-h,35rem))] w-full flex-col gap-4 bg-background p-5 text-left ${
        // Vrai téléphone : le cerne du focus d'Ominin, pas celui du navigateur.
        demo.settings.realPhone
          ? "[&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-ember-2"
          : ""
      }`}
    >
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div>
          <p className="font-display text-lg font-medium">Commandes</p>
          <p className="text-xs text-muted">{demo.restaurant.name}</p>
        </div>
        <span className="flex items-center gap-2">
          {/* Une commande pour demain a fait passer la nuit à la démo : on le dit. */}
          {hasOrder && isNextDay(demo.order!) && (
            <span className="rounded-full border border-ember-1/40 bg-ember-1/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-1">
              Le lendemain
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <span className="size-1.5 animate-pulse rounded-full bg-ember-2" />
            En direct
          </span>
        </span>
      </div>
      {/* La commande défile dans l'écran, comme la vraie liste Commandes : une
          longue commande ne cache jamais ses boutons. */}
      {hasOrder ? (
        // -m-1 p-1 : la marge où déborde l'arrivée de la carte (order-pop).
        <div className="-m-1 min-h-0 flex-1 overflow-y-auto p-1">
          <OrderCardDemo />
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

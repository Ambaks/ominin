"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CounterLines } from "@/components/gestion/commandes/counter-lines";
import { CheckIcon } from "@/components/gestion/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { HANDOVER_STATUSES } from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import { can } from "@/lib/gestion/permissions";
import { fetchRemise, handOver, type Remise } from "@/lib/gestion/remise";
import { lineTotal, orderTotal } from "@/lib/gestion/selectors";
import type { OrderStatus, Role } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import { useOrderSignal } from "@/lib/supabase/use-order-signal";

/*
 * La remise d'une commande dont l'équipe a scanné le code — depuis le
 * scanner de l'espace, ou l'appareil photo du téléphone (/gestion/remise).
 * Prête, elle est remise sans autre geste, et l'écran dit ce qu'il faut
 * donner. Le code ne sert qu'une fois : scanné de nouveau, il dit l'heure de
 * la remise. Pas encore réglée, elle s'encaisse d'abord. Seule une commande
 * prête est remise d'office — le client n'a de code qu'à « prête » : réglée
 * mais pas prête (un « Pas encore prête » repris après coup), ou réglée
 * pendant que l'écran était ouvert, elle attend qu'on touche « Remettre ».
 * L'écran suit la commande par son canal Realtime, comme le ticket du client.
 */

/** Une remise partie d'ici : en cours, faite (ou trouvée faite ailleurs), ou en échec. */
type Attempt =
  | { state: "pending" }
  | { state: "done"; handed: boolean }
  // lost : le réseau a coupé, la requête a pu passer et sa réponse se perdre.
  | { state: "error"; message: string; lost: boolean };

const handable = (status: OrderStatus) => HANDOVER_STATUSES.includes(status);

/** L'anneau de focus clavier de la remise et du scanner, comme ailleurs dans l'espace. */
export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1";

export interface ManualAction {
  action: React.ReactNode;
  primary: boolean;
}

const messageOf = (error: unknown) =>
  error instanceof TypeError
    ? "Le réseau a coupé : vérifiez la connexion, puis réessayez."
    : error instanceof Error
      ? error.message
      : "Une erreur est survenue.";

export function RemiseView({
  orderId,
  venueId,
  focusResult = false,
  onHanded,
  actions,
}: {
  orderId: string;
  /**
   * Scanner de l'espace : l'établissement ouvert. La commande d'un autre
   * établissement du compte ne se remet pas d'office — le client n'est
   * sans doute pas au bon bar.
   */
  venueId?: string;
  /**
   * Scanner : chaque résultat prend le focus, pas seulement l'issue d'une
   * remise — le lecteur d'écran dit ce que le code a donné.
   */
  focusResult?: boolean;
  /** La commande vient d'être remise depuis cet écran. */
  onHanded?: () => void;
  /**
   * Sous la commande : la suite (voir les commandes, scanner la suivante),
   * avec, quand elle est à faire à la main, la remise (« Remettre »,
   * « Réessayer ») — à placer par l'appelant, bouton principal sauf pour
   * une commande d'un autre établissement.
   */
  actions: (manual: ManualAction | null) => React.ReactNode;
}) {
  // undefined : pas encore lue ; null : aucune commande du compte.
  const [remise, setRemise] = useState<Remise | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const started = useRef(false);
  // Une remise d'ici perdue en route (réseau) : trouvée servie ensuite, c'est
  // la nôtre — l'équipe ne refuse pas un client à qui elle vient de la remettre.
  const lost = useRef(false);
  // Chaque remise rend caduques les lectures parties avant elle : arrivées
  // après, elles la défaisaient à l'écran.
  const handOvers = useRef(0);
  // Le rôle du compte, lu avec la première lecture : les suivantes ne le relisent pas.
  const role = useRef<Role | null | undefined>(undefined);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const numberId = useId();
  const bodyId = useId();

  const load = useCallback(
    (current: () => boolean) => {
      const generation = handOvers.current;
      const fresh = () => current() && generation === handOvers.current;
      return fetchRemise(orderId, role.current).then(
        (next) => {
          if (!fresh()) return;
          if (next) role.current = next.role;
          setRemise(next);
          setLoadError(null);
        },
        (error: unknown) => {
          if (fresh()) setLoadError(messageOf(error));
        }
      );
    },
    [orderId]
  );
  useOrderSignal(orderId, load);

  const order = remise?.order;
  // L'état trouvé à l'ouverture, une fois la commande lue.
  const [openedOn, setOpenedOn] = useState<OrderStatus | null>(null);
  if (order && openedOn === null) setOpenedOn(order.status);

  const numbered = order?.type === "sur_place" && order.orderNumber !== undefined;
  const allowed = remise?.role != null && can(remise.role, "orders.setStatus:servie");
  const elsewhere = venueId !== undefined && remise != null && remise.etablissementId !== venueId;
  const auto = numbered && allowed && !elsewhere && openedOn === "prete";

  const handOverNow = useCallback(async () => {
    started.current = true;
    handOvers.current += 1;
    setAttempt({ state: "pending" });
    try {
      const at = await handOver(orderId);
      // Une lecture partie pendant la remise, avant qu'elle ne soit écrite,
      // ne la défait pas à l'écran en arrivant après.
      handOvers.current += 1;
      setAttempt({ state: "done", handed: at !== null || lost.current });
      if (at) {
        setRemise(
          (current) =>
            current && { ...current, order: { ...current.order, status: "servie", handedOverAt: at } }
        );
      } else {
        await load(() => true);
      }
    } catch (error) {
      if (error instanceof TypeError) lost.current = true;
      setAttempt({
        state: "error",
        message: messageOf(error),
        lost: error instanceof TypeError,
      });
    }
  }, [orderId, load]);

  useEffect(() => {
    if (auto && !started.current) void handOverNow();
  }, [auto, handOverNow]);

  // Servie après une remise partie d'ici, c'est la nôtre — en cours, perdue en
  // route, ou faite. Trouvée servie par la requête, elle l'a été ailleurs.
  const ours =
    attempt !== null &&
    (attempt.state === "pending" ||
      (attempt.state === "error" && attempt.lost) ||
      (attempt.state === "done" && attempt.handed));
  const handedHere = ours && order?.status === "servie";
  useEffect(() => {
    if (handedHere) onHanded?.();
  }, [handedHere, onHanded]);

  // L'issue prend le focus : le lecteur d'écran dit le titre, puis sa phrase.
  // Une erreur suivie de la remise la reprend.
  const outcome =
    order?.status === "servie" ? "servie" : attempt?.state === "error" ? "erreur" : null;
  useEffect(() => {
    if (outcome) titleRef.current?.focus({ preventScroll: true });
  }, [outcome]);
  const loaded = remise !== undefined || loadError !== null;
  useEffect(() => {
    if (focusResult && loaded) {
      resultRef.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
    }
  }, [focusResult, loaded]);

  if (remise === undefined) {
    return (
      <div ref={resultRef} className="contents">
        <Kicker />
        {loadError ? (
          <EmptyState
            heading
            title="La commande ne s'est pas chargée"
            body={loadError}
            action={<ActionButton onClick={() => void load(() => true)} label="Réessayer" />}
          />
        ) : (
          <p className="py-12 text-center text-sm text-muted">Un instant…</p>
        )}
        {actions(null)}
      </div>
    );
  }
  if (!remise || !order || !numbered) {
    return (
      <div ref={resultRef} className="contents">
        <Kicker />
        <EmptyState
          heading
          title="Code inconnu"
          body="Ce code n'est pas une commande à retirer dans vos établissements. Vérifiez que ce téléphone est connecté au bon compte."
        />
        {actions(null)}
      </div>
    );
  }
  if (!allowed) {
    return (
      <div ref={resultRef} className="contents">
        <Kicker etablissementName={remise.etablissementName} />
        <EmptyState
          heading
          title="Réservé à la salle"
          body="Votre rôle ne remet pas les commandes : un serveur ou le gérant scanne ce code."
        />
        {actions(null)}
      </div>
    );
  }

  const due = order.items
    .filter((line) => !line.paidMode)
    .reduce((sum, line) => sum + lineTotal(line), 0);
  const handedAt = order.handedOverAt ? formatTime(order.handedOverAt) : null;
  // Remettable, mais rien n'est en cours : on la remet à la main.
  const manual = handable(order.status) && attempt?.state !== "pending";

  const head: { kicker: string; body: string; tone: "done" | "warn" | "plain" } =
    order.status === "servie"
      ? ours
        ? {
            kicker: "Remise au client",
            body: `${handedAt ? `À ${handedAt}. ` : ""}Donnez-lui sa commande.`,
            tone: "done",
          }
        : {
            kicker: "Déjà remise",
            body: handedAt
              ? `Ce code a servi à ${handedAt} : la commande a été remise.`
              : "Ce code a déjà servi : la commande a été remise.",
            tone: "warn",
          }
      : order.status === "annulee"
        ? { kicker: "Commande annulée", body: "Elle ne se remet pas.", tone: "warn" }
        : attempt?.state === "error"
          ? { kicker: "La remise n'est pas passée", body: attempt.message, tone: "warn" }
          : order.status === "en_attente"
            ? {
                kicker: "À encaisser d'abord",
                body: `${formatPrice(due)} à régler : encaissée, elle part en préparation.`,
                tone: "warn",
              }
            : attempt?.state === "pending"
              ? { kicker: "Remise…", body: "Un instant.", tone: "plain" }
              : elsewhere
                ? {
                    kicker: "Autre établissement",
                    body: `Commande de ${remise.etablissementName}\u00a0: remettez-la seulement si le client y a commandé.`,
                    tone: "warn",
                  }
                : {
                  kicker: order.status === "prete" ? "Prête" : "En préparation",
                  body: "Réglée : remettez-la quand le client est là.",
                  tone: "plain",
                };

  return (
    <div ref={resultRef} className="contents">
      {/* Un scan à l'appareil photo ouvre un onglet : son titre dit lequel. */}
      <title>{`N° ${order.orderNumber} · Retrait au bar`}</title>
      <Kicker etablissementName={remise.etablissementName} />
      <article
        className={`flex flex-col overflow-hidden rounded-2xl border bg-surface ${
          head.tone === "done"
            ? "border-foreground"
            : head.tone === "warn"
              ? "border-ember-3"
              : "border-hairline"
        }`}
      >
        {/* Remise : l'inverse du fond, lisible de loin dans les deux thèmes
            (le dégradé clair tombait à 3:1 en thème clair). */}
        <div
          className={`flex flex-col gap-1 px-5 pb-5 pt-4 ${
            head.tone === "done"
              ? "bg-foreground text-background"
              : head.tone === "warn"
                ? "bg-ember-3/20"
                : ""
          }`}
        >
          <h1
            ref={titleRef}
            tabIndex={-1}
            // Le lecteur d'écran dit le verdict, puis le numéro et la phrase.
            aria-describedby={`${numberId} ${bodyId}`}
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] outline-none"
          >
            {head.tone === "done" && <CheckIcon className="size-4 shrink-0 stroke-[2.6]" />}
            {head.kicker}
          </h1>
          <p id={numberId} className="flex items-baseline gap-1.5 font-semibold leading-none tabular-nums">
            <span className="text-3xl opacity-60">N°</span>
            <span className="text-7xl tracking-tight">{order.orderNumber}</span>
          </p>
          {remise.table !== null && (
            <p
              className={`text-sm font-semibold tabular-nums ${
                head.tone === "done" ? "text-background/75" : "text-foreground/75"
              }`}
            >
              Table {remise.table}
            </p>
          )}
          <p
            id={bodyId}
            className={`mt-2 text-base leading-snug ${
              head.tone === "done" ? "text-background" : "text-foreground"
            }`}
          >
            {head.body}
          </p>
        </div>
        <CounterLines items={order.items} className="py-4" />
        <p className="flex items-baseline justify-between gap-3 border-t border-hairline px-5 py-3 text-sm">
          {order.status === "annulee" ? (
            <>
              <span className="text-foreground/75">Annulée</span>
              <span className="tabular-nums text-foreground/75 line-through">
                {formatPrice(orderTotal(order))}
              </span>
            </>
          ) : (
            <>
              <span className="text-foreground/75">{due > 0 ? "À régler" : "Réglée"}</span>
              <span className="font-semibold tabular-nums">
                {formatPrice(due > 0 ? due : orderTotal(order))}
              </span>
            </>
          )}
        </p>
      </article>

      {actions(
        manual
          ? {
              // D'un autre établissement : la remise reste possible, pas mise en avant.
              action: (
                <ActionButton
                  onClick={() => void handOverNow()}
                  label={attempt ? "Réessayer" : `Remettre N° ${order.orderNumber}`}
                  secondary={elsewhere}
                />
              ),
              primary: !elsewhere,
            }
          : null
      )}
    </div>
  );
}

function Kicker({ etablissementName }: { etablissementName?: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/75">
      Retrait au bar{etablissementName && ` · ${etablissementName}`}
    </p>
  );
}

/** L'inverse du fond, comme la remise faite : le dégradé clair tombait sous 3:1. */
function ActionButton({
  onClick,
  label,
  secondary = false,
}: {
  onClick: () => void;
  label: string;
  secondary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 w-full rounded-full px-5 text-sm font-semibold ${FOCUS_RING} ${
        secondary ? "border border-hairline" : "bg-foreground text-background"
      }`}
    >
      {label}
    </button>
  );
}

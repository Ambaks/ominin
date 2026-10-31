import { HubriseRef } from "@/components/gestion/commandes/hubrise-ref";
import { BagIcon, EditIcon, TrashIcon } from "@/components/gestion/icons";
import { Chip, GlassButton } from "@/components/gestion/ui";
import { PAYMENT_MODE_LABELS } from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import {
  isCancelledPaid,
  orderTotal,
  paidAt,
  placeLabel,
  totalsByMode,
} from "@/lib/gestion/selectors";
import type { GestionState, Order, PaymentMode } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import { AlertIcon, RefundIcon, TillIcon } from "./icons";

/** Mode affiché : un règlement en ligne (Stripe/SumUp) prime sur la colonne. */
export function displayMode(order: Order): PaymentMode | undefined {
  return order.paidOnline ? "en_ligne" : order.paymentMode;
}

/**
 * Un encaissement : l'heure, qui a payé, ce qu'il reste à savoir (mixte,
 * monnaie rendue), le mode, le montant — et les gestes de correction quand
 * ils existent. Tout encaissement au comptoir se corrige et s'annule ; un
 * règlement en ligne, y compris ceux de l'ancien tunnel click & collect
 * (mode « en_ligne »), est une transaction réelle chez le prestataire : il
 * reste tel quel. Une vente de la caisse se corrige sur la caisse.
 */
export function PaymentRow({
  order,
  state,
  onEdit,
  onVoid,
}: {
  order: Order;
  state: GestionState;
  onEdit: () => void;
  onVoid: () => void;
}) {
  const isCollect = order.type === "collect";
  const heading = isCollect
    ? order.customerName ?? "Client"
    : placeLabel(order, state.tables, state.etablissement.showTableNumber);
  const mode = displayMode(order);
  const articleCount = order.items.reduce((sum, line) => sum + line.quantity, 0);
  const editable =
    order.paymentMode != null &&
    order.paymentMode !== "en_ligne" &&
    order.paymentMode !== "caisse" &&
    !order.paidOnline &&
    !order.fromTill;
  const cancelled = isCancelledPaid(order);
  // Une addition partagée n'a pas de montant unique à afficher : ses deux
  // jambes le disent, et c'est la jambe espèces qui porte la monnaie rendue.
  const split = mode === "mixte" ? totalsByMode(order) : null;
  const cashLeg = split ? order.payments.find((leg) => leg.mode === "especes") : undefined;
  const received = split ? cashLeg?.cashGiven : order.cashGiven;
  const returned = split ? cashLeg?.cashChange : order.cashChange;
  const details = [
    `${articleCount} article${articleCount > 1 ? "s" : ""}`,
    split && `espèces ${formatPrice(split.especes)} · carte ${formatPrice(split.carte)}`,
    received != null && `reçu ${formatPrice(received)}`,
    returned ? `rendu ${formatPrice(returned)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-hairline px-4 py-3 first:border-t-0">
      <span className="w-11 shrink-0 text-g-meta text-muted tabular-nums">
        {formatTime(paidAt(order))}
      </span>
      {/* Le nom d'abord : sur un téléphone, mode, total et gestes passent à
          la ligne plutôt que de le réduire à une lettre. */}
      <div className="min-w-36 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-medium [overflow-wrap:anywhere]">{heading}</p>
          {isCollect && (
            <Chip icon={<BagIcon />}>Emporter</Chip>
          )}
          {order.fromTill && (
            <span title="Saisie sur la caisse : elle se modifie sur la caisse.">
              <Chip icon={<TillIcon />}>Caisse</Chip>
            </span>
          )}
          {cancelled &&
            (order.refundedAt ? (
              <span title="Refusée par la caisse : le client a été remboursé.">
                <Chip icon={<RefundIcon />}>Remboursée</Chip>
              </span>
            ) : (
              <span title="Refusée par la caisse : le remboursement n'est pas passé, à faire chez le prestataire.">
                <Chip tone="problem" icon={<AlertIcon />}>
                  À rembourser
                </Chip>
              </span>
            ))}
        </div>
        <p className="text-g-meta text-muted">{details}</p>
        <HubriseRef orders={[order]} />
      </div>
      {mode && (
        <span className="shrink-0 text-g-meta text-muted">{PAYMENT_MODE_LABELS[mode]}</span>
      )}
      <span
        className={`shrink-0 font-semibold tabular-nums ${cancelled ? "text-muted line-through" : ""}`}
      >
        {formatPrice(orderTotal(order))}
      </span>
      {editable && (
        <div className="flex shrink-0 items-center gap-1.5">
          <GlassButton
            variant="icon"
            onClick={onEdit}
            title="Modifier l'encaissement"
            aria-label="Modifier l'encaissement"
          >
            <EditIcon />
          </GlassButton>
          <GlassButton
            variant="icon"
            onClick={onVoid}
            title="Annuler l'encaissement"
            aria-label="Annuler l'encaissement"
          >
            <TrashIcon />
          </GlassButton>
        </div>
      )}
    </li>
  );
}

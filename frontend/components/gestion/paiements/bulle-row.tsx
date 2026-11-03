import { AlertIcon, BullesIcon } from "@/components/gestion/icons";
import { Chip } from "@/components/gestion/ui";
import { PAYMENT_MODE_LABELS } from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import type { BulleEncaissement } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import { RefundIcon } from "./icons";

const ETATS: Record<Exclude<BulleEncaissement["etat"], "encaissee">, { chip: string; detail: string }> = {
  remboursee: { chip: "Remboursée", detail: "rendue au client" },
  a_rembourser: { chip: "À rembourser", detail: "réservation fermée, remboursement en cours" },
  annulee: { chip: "Annulée", detail: "réservation annulée après le règlement" },
};

/**
 * Une part de bulle payée, au fil des encaissements : la bulle, qui a payé,
 * le mode et le montant. Elle se règle et se rend depuis Bulles : aucun geste
 * de correction ici, sa colonne reste vide pour garder les montants alignés.
 */
export function BulleRow({ part }: { part: BulleEncaissement }) {
  const etat = part.etat === "encaissee" ? null : ETATS[part.etat];
  const details = [
    part.name,
    `${part.places} place${part.places > 1 ? "s" : ""}`,
    etat?.detail,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="grid grid-cols-[var(--g-control)_minmax(0,1fr)_auto_auto] items-center gap-x-3 border-t border-hairline px-4 py-3 first:border-t-0">
      <span className="self-start pt-0.5 text-g-meta text-muted tabular-nums sm:self-center sm:pt-0">
        {formatTime(part.paidAt)}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-medium [overflow-wrap:anywhere]">{part.bulleName}</p>
          <Chip icon={<BullesIcon />}>Bulle</Chip>
          {etat && (
            <Chip
              tone={part.etat === "a_rembourser" ? "problem" : undefined}
              icon={part.etat === "a_rembourser" ? <AlertIcon /> : <RefundIcon />}
            >
              {etat.chip}
            </Chip>
          )}
        </div>
        <p className="text-g-meta text-muted">{details}</p>
      </div>
      <div className="text-right">
        <p className={`font-semibold tabular-nums ${etat ? "text-muted line-through" : ""}`}>
          {formatPrice(part.amount)}
        </p>
        <p className="text-g-meta text-muted">{PAYMENT_MODE_LABELS[part.mode]}</p>
      </div>
      <span aria-hidden className="w-g-control sm:w-[calc(2*var(--g-control)+0.75rem)]" />
    </li>
  );
}

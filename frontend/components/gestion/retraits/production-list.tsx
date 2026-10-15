import { formatTime } from "@/lib/gestion/format";
import { productionLines, toProduce } from "@/lib/gestion/retraits";
import type { Order } from "@/lib/gestion/types";

/**
 * La feuille du laboratoire pour un jour : combien de chaque article reste à
 * préparer, choix par choix, puis les mots des clients à lire avant de
 * dresser. Elle s'imprime en noir sur blanc, une case à cocher par ligne.
 */
export function ProductionList({
  orders,
  title,
  shopName,
}: {
  orders: Order[];
  title: string;
  /** En tête de la feuille imprimée. */
  shopName: string;
}) {
  const pending = orders.filter(toProduce);
  const ready = orders.filter((order) => order.status === "prete").length;
  const handedOver = orders.filter((order) => order.status === "retiree").length;
  const lines = productionLines(orders);
  const notes = pending.filter((order) => order.customerNote);
  const pieces = lines.reduce((sum, line) => sum + line.quantity, 0);
  // Ce qui est déjà fait se lit à part : la tâche d'abord.
  const done = [
    ready > 0 && `${ready} déjà prête${ready > 1 ? "s" : ""}`,
    handedOver > 0 && `${handedOver} déjà remise${handedOver > 1 ? "s" : ""}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-label={`À produire, ${title}`} className="production-sheet flex flex-col gap-4">
      <h2 className="hidden font-display text-2xl print:block">
        À produire — {title}
        <span className="block text-sm font-normal">{shopName}</span>
      </h2>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5 text-sm">
          {pending.length > 0 && (
            <p className="font-medium">
              {`${pieces} pièce${pieces > 1 ? "s" : ""} à préparer pour ${pending.length} commande${pending.length > 1 ? "s" : ""}`}
            </p>
          )}
          {done && <p className="text-muted">{done}</p>}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground print:hidden lg:pointer-fine:py-2 lg:pointer-fine:text-xs"
        >
          Imprimer la feuille
        </button>
      </div>

      {lines.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-hairline px-5 py-6 text-center text-sm text-muted">
          Plus rien à produire pour ce jour-là.
        </p>
      ) : (
        <ul className="flex flex-col rounded-2xl border border-hairline bg-surface">
          {lines.map((line, index) => (
            <li
              key={line.key}
              className={`flex items-center gap-4 px-5 py-3.5 ${index > 0 ? "border-t border-hairline" : ""}`}
            >
              {/* La case à cocher du papier : le laboratoire raye ce qui est sorti. */}
              <span aria-hidden className="hidden size-5 shrink-0 rounded border print:block" />
              <span className="w-12 shrink-0 text-right font-display text-2xl tabular-nums text-ember-1">
                {line.quantity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{line.name}</p>
                {line.choices && <p className="text-sm text-muted">{line.choices}</p>}
              </div>
              <span className="shrink-0 text-sm tabular-nums text-muted">
                {line.asap || !line.firstPickup ? "dès que possible" : `pour ${formatTime(line.firstPickup)}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {notes.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Mots des clients
          </p>
          <ul className="flex flex-col gap-2">
            {notes.map((order) => (
              <li
                key={order.id}
                className="rounded-2xl border border-hairline bg-surface px-5 py-3.5 text-sm leading-relaxed"
              >
                <p className="whitespace-pre-line font-medium">« {order.customerNote} »</p>
                <p className="mt-0.5 text-xs text-muted">
                  {order.customerName}
                  {order.pickupAt && ` · retrait ${formatTime(order.pickupAt)}`} ·{" "}
                  {order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

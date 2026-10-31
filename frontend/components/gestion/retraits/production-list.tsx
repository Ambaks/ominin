import { PrinterIcon } from "@/components/gestion/icons";
import { EmptyState, GlassButton, Plate } from "@/components/gestion/ui";
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
      <h2 className="hidden font-display text-g-h2 print:block">
        À produire — {title}
        <span className="block text-g-body font-normal">{shopName}</span>
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          {pending.length > 0 && (
            <p className="font-medium">
              {`${pieces} pièce${pieces > 1 ? "s" : ""} à préparer pour ${pending.length} commande${pending.length > 1 ? "s" : ""}`}
            </p>
          )}
          {done && <p className="text-g-meta text-muted">{done}</p>}
        </div>
        <GlassButton onClick={() => window.print()} className="print:hidden">
          <PrinterIcon />
          Imprimer la feuille
        </GlassButton>
      </div>

      {lines.length === 0 ? (
        <EmptyState text="Plus rien à produire pour ce jour-là." />
      ) : (
        <Plate>
          <ul className="m-0 flex list-none flex-col p-0">
            {lines.map((line) => (
              <li
                key={line.key}
                className="flex min-h-g-control items-center gap-4 border-t border-hairline px-4 py-3 first:border-t-0"
              >
                {/* La case à cocher du papier : le laboratoire raye ce qui est sorti. */}
                <span aria-hidden className="hidden size-5 shrink-0 rounded border print:block" />
                <span className="w-12 shrink-0 text-right text-g-kpi tabular-nums">{line.quantity}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{line.name}</p>
                  {line.choices && <p className="text-g-meta text-muted">{line.choices}</p>}
                </div>
                <span className="shrink-0 text-g-meta text-muted tabular-nums">
                  {line.asap || !line.firstPickup ? "dès que possible" : `pour ${formatTime(line.firstPickup)}`}
                </span>
              </li>
            ))}
          </ul>
        </Plate>
      )}

      {notes.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-display text-g-h2">Mots des clients</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {notes.map((order) => (
              <li key={order.id}>
                <Plate className="px-4 py-3">
                  <p className="whitespace-pre-line font-medium">« {order.customerNote} »</p>
                  <p className="mt-0.5 text-g-meta text-muted">
                    {order.customerName}
                    {order.pickupAt && ` · retrait ${formatTime(order.pickupAt)}`} ·{" "}
                    {order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}
                  </p>
                </Plate>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

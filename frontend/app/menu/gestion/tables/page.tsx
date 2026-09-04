"use client";

import { useState } from "react";
import { CreateOrderFab } from "@/components/gestion/commandes/create-order-fab";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { TableSheet } from "@/components/gestion/tables/table-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { activeTables } from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { formatPrice } from "@/lib/menu-data";

/*
 * La salle vue par ses tables : seules celles en service apparaissent, avec
 * ce qu'il leur reste à encaisser et à servir. Une table se touche pour voir
 * son addition et ses plats ; le bouton + ouvre une table (numéro connu ou
 * nouveau) en y prenant une commande.
 */
export default function TablesPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  const [openTableId, setOpenTableId] = useState<string | null>(null);

  if (!state) return null;
  if (!hasFeature("tables")) return <FeatureLocked />;

  const tables = activeTables(state);
  const sheet = tables.find((entry) => entry.table.id === openTableId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
          Tables
        </h1>
        <p className="mt-1 text-sm text-muted">
          Les tables en service. Touchez une table pour voir son addition et
          ses plats.
        </p>
      </div>

      {tables.length === 0 ? (
        <EmptyState
          title="Aucune table en service"
          body="Appuyez sur + pour ouvrir une table et prendre une commande. Les commandes du menu QR ouvrent leur table d'elles-mêmes."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map(({ table, toPay, toServe }) => (
            <button
              key={table.id}
              type="button"
              onClick={() => setOpenTableId(table.id)}
              className="flex flex-col items-start gap-2 rounded-2xl border border-hairline bg-surface p-4 text-left transition-colors hover:border-ember-2/40"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
                Table
              </span>
              <span className="font-display text-3xl font-medium">
                {table.number}
              </span>
              <span className="flex flex-wrap gap-1.5">
                {toPay > 0 && (
                  <span className="rounded-full border border-ember-1/40 bg-ember-1/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-1">
                    {formatPrice(toPay)} à encaisser
                  </span>
                )}
                {toServe > 0 && (
                  <span className="rounded-full border border-ember-2/40 bg-ember-2/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
                    {toServe} à servir
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {sheet && (
        <TableSheet
          tableNo={sheet.table.number}
          orders={sheet.orders}
          onClose={() => setOpenTableId(null)}
        />
      )}

      <CreateOrderFab state={state} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { CreateOrderFab } from "@/components/gestion/commandes/create-order-fab";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { TableSheet } from "@/components/gestion/tables/table-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { activeTables } from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { formatPrice } from "@/lib/menu-data";

/*
 * La salle vue par ses tables : seules celles en service apparaissent, avec
 * ce qu'il leur reste à encaisser et à servir. Une table se touche pour voir
 * son addition et ses plats ; le bouton + ouvre une table (numéro connu ou
 * nouveau) en y prenant une commande. Deux tables réunies n'en font qu'une
 * ici — c'est l'addition qui compte, pas le mobilier.
 */
export default function TablesPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  const toast = useToast();
  const [openTableId, setOpenTableId] = useState<string | null>(null);
  // Sélection en cours pour réunir des tables ; null quand on ne réunit pas.
  const [joining, setJoining] = useState<string[] | null>(null);

  if (!state) return null;
  if (!hasFeature("tables")) return <FeatureLocked feature="tables" />;

  const tables = activeTables(state);
  const sheet = tables.find((entry) => entry.table.id === openTableId);
  const staffById = new Map(state.staff.map((member) => [member.id, member]));
  const canJoin = hasFeature("groupes_tables");

  const join = async () => {
    const ids = joining ?? [];
    setJoining(null);
    try {
      await api.groupTables(ids);
      toast.success("Tables réunies.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
            Tables
          </h1>
          <p className="mt-1 text-sm text-muted">
            {joining
              ? "Choisissez les tables à réunir sous une même addition."
              : "Les tables en service. Touchez une table pour voir son addition et ses plats."}
          </p>
        </div>
        {canJoin && tables.length > 1 && (
          <div className="flex shrink-0 items-center gap-2">
            {joining && (
              <button
                type="button"
                onClick={() => setJoining(null)}
                className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
              >
                Annuler
              </button>
            )}
            <button
              type="button"
              onClick={() => (joining ? void join() : setJoining([]))}
              disabled={joining != null && joining.length < 2}
              className="ember-gradient rounded-full px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
            >
              {joining ? `Réunir (${joining.length})` : "Réunir des tables"}
            </button>
          </div>
        )}
      </div>

      {tables.length === 0 ? (
        <EmptyState
          title="Aucune table en service"
          body="Appuyez sur + pour ouvrir une table et prendre une commande. Les commandes du menu QR ouvrent leur table d'elles-mêmes."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map((service) => {
            const { table, tables: joined, toPay, toServe } = service;
            const selected = joining?.includes(table.id) ?? false;
            // Une table déjà réunie ne se réunit pas une seconde fois.
            const selectable = joining != null && joined.length === 1;
            const serveur = table.staffId
              ? staffById.get(table.staffId)
              : undefined;
            return (
              <button
                key={table.id}
                type="button"
                disabled={joining != null && !selectable}
                onClick={() =>
                  joining
                    ? setJoining((current) =>
                        (current ?? []).includes(table.id)
                          ? (current ?? []).filter((id) => id !== table.id)
                          : [...(current ?? []), table.id]
                      )
                    : setOpenTableId(table.id)
                }
                className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors disabled:opacity-40 ${
                  selected
                    ? "border-ember-2 bg-surface shadow-[0_0_18px_rgba(226,118,75,0.25)]"
                    : "border-hairline bg-surface hover:border-ember-2/40"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
                  {joined.length > 1 ? "Tables" : "Table"}
                </span>
                <span className="font-display text-3xl font-medium">
                  {joined.map((entry) => entry.number).join(" + ")}
                </span>
                {serveur && (
                  <span className="truncate text-xs text-muted">
                    {serveur.name}
                  </span>
                )}
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
            );
          })}
        </div>
      )}

      {sheet && (
        <TableSheet service={sheet} onClose={() => setOpenTableId(null)} />
      )}

      {hasFeature("prise_commande") && <CreateOrderFab state={state} />}
    </div>
  );
}

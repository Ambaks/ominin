"use client";

import { useState } from "react";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { TableGrid } from "@/components/gestion/tables/table-grid";
import { TableGroupCard } from "@/components/gestion/tables/table-group-card";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { freeTables, groupTableNumbers } from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";

export default function TablesPage() {
  const state = useGestion();
  const { can, hasFeature } = useGestionAccess();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [askIntegrate, setAskIntegrate] = useState(false);

  if (!state) return null;
  if (!hasFeature("tables")) return <FeatureLocked />;

  const canGroup = can("tables.group");
  const takenIds = new Set(state.groups.flatMap((group) => group.tableIds));
  const activeOrderTableIds = new Set(
    state.orders
      .filter((order) => order.status !== "payee" && order.status !== "annulee")
      .map((order) => order.tableId)
  );
  const free = freeTables(state);

  const toggle = (tableId: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(tableId)) next.delete(tableId);
      else next.add(tableId);
      return next;
    });
  };

  const create = async (integrateOrders: boolean) => {
    try {
      await api.createGroup([...selected], integrateOrders);
      setSelected(new Set());
      toast.success("Groupe créé.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  const onCreateClick = () => {
    if ([...selected].some((id) => activeOrderTableIds.has(id))) {
      setAskIntegrate(true);
    } else {
      create(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
          Tables
        </h1>
        {canGroup && (
          <p className="mt-1 text-sm text-muted">
            Sélectionnez au moins deux tables libres pour créer un groupe.
          </p>
        )}
      </div>

      <TableGrid
        tables={state.tables}
        takenIds={takenIds}
        activeOrderTableIds={activeOrderTableIds}
        selected={selected}
        selectable={canGroup}
        onToggle={toggle}
      />

      {state.groups.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-medium">Groupes</h2>
          {state.groups.map((group) => {
            const numbers = groupTableNumbers(state, group.tableIds);
            const memberTables = state.tables
              .filter((table) => group.tableIds.includes(table.id))
              .sort((a, b) => a.number - b.number);
            const hasActiveOrders = state.orders.some(
              (order) =>
                order.groupeId === group.id &&
                order.status !== "payee" &&
                order.status !== "annulee"
            );
            return (
              <TableGroupCard
                key={group.id}
                group={group}
                title={`Tables ${numbers.join(" + ")}`}
                memberTables={memberTables}
                freeTables={free}
                hasActiveOrders={hasActiveOrders}
                canManage={canGroup}
              />
            );
          })}
        </section>
      )}

      {selected.size >= 2 && (
        <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-5 lg:bottom-8">
          <div className="rise flex items-center gap-2 rounded-full border border-hairline bg-surface-raised p-1.5 pl-4 shadow-lg shadow-background/60">
            <span className="text-sm text-muted">
              {selected.size} tables
            </span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-foreground"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onCreateClick}
              className="ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background"
            >
              Créer un groupe
            </button>
          </div>
        </div>
      )}

      {askIntegrate && (
        <Modal
          title="Commandes en cours"
          onClose={() => setAskIntegrate(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setAskIntegrate(false);
                  create(false);
                }}
                className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
              >
                Créer sans les commandes
              </button>
              <button
                type="button"
                onClick={() => {
                  setAskIntegrate(false);
                  create(true);
                }}
                className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
              >
                Intégrer les commandes
              </button>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-muted">
            Certaines tables sélectionnées ont des commandes en cours.
            Voulez-vous les intégrer au groupe ?
          </p>
        </Modal>
      )}
    </div>
  );
}

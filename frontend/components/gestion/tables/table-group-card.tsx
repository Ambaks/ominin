"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import type { Table, TableGroup } from "@/lib/gestion/types";

export function TableGroupCard({
  group,
  title,
  memberTables,
  freeTables,
  hasActiveOrders,
  canManage,
}: {
  group: TableGroup;
  title: string;
  memberTables: Table[];
  freeTables: Table[];
  hasActiveOrders: boolean;
  canManage: boolean;
}) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [dissolving, setDissolving] = useState(false);

  const showError = (error: unknown) =>
    toast.error(
      error instanceof Error ? error.message : "Une erreur est survenue."
    );

  const remove = async (tableId: string) => {
    if (group.tableIds.length <= 2) {
      setDissolving(true);
      return;
    }
    try {
      await api.removeTableFromGroup(group.id, tableId);
      toast.success("Table retirée du groupe.");
    } catch (error) {
      showError(error);
    }
  };

  const add = async (tableId: string) => {
    try {
      await api.addTableToGroup(group.id, tableId);
      toast.success("Table ajoutée au groupe.");
    } catch (error) {
      showError(error);
    }
  };

  return (
    <div className="rounded-2xl border border-hairline bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-baseline gap-2.5">
          <span className="ember-text text-[10px] font-bold uppercase tracking-wider">
            Groupe
          </span>
          <span className="font-display text-base font-medium">{title}</span>
        </div>
        <svg
          viewBox="0 0 24 24"
          className={`size-4 text-faint transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div className="flex flex-col gap-4 border-t border-hairline px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {memberTables.map((table) => (
              <span
                key={table.id}
                className="flex items-center gap-2 rounded-full border border-hairline bg-background px-3 py-1.5 text-sm"
              >
                Table {table.number}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => remove(table.id)}
                    aria-label={`Retirer la table ${table.number}`}
                    className="text-faint transition-colors hover:text-ember-3"
                  >
                    <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </span>
            ))}
          </div>

          {canManage && (
            <div className="flex flex-wrap items-center gap-4">
              {freeTables.length > 0 && (
                <select
                  value=""
                  onChange={(event) => {
                    if (event.target.value) add(event.target.value);
                  }}
                  className="appearance-none rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-muted outline-none transition-colors hover:text-foreground focus:border-ember-2/50"
                >
                  <option value="">Ajouter une table…</option>
                  {freeTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      Table {table.number}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => setDissolving(true)}
                className="text-xs font-semibold text-ember-3 transition-opacity hover:opacity-80"
              >
                Dissoudre le groupe
              </button>
            </div>
          )}
        </div>
      )}

      {dissolving && (
        <ConfirmDialog
          title="Dissoudre le groupe ?"
          message={
            hasActiveOrders
              ? "Ce groupe a des commandes en cours : elles redeviendront des commandes individuelles par table."
              : "Les tables redeviendront indépendantes."
          }
          confirmLabel="Dissoudre"
          destructive
          onClose={() => setDissolving(false)}
          onConfirm={async () => {
            setDissolving(false);
            try {
              await api.dissolveGroup(group.id);
              toast.success("Groupe dissous.");
            } catch (error) {
              showError(error);
            }
          }}
        />
      )}
    </div>
  );
}

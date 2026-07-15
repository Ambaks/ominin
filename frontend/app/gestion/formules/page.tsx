"use client";

import { useState } from "react";
import { FormuleCard } from "@/components/gestion/formules/formule-card";
import { FormuleFormModal } from "@/components/gestion/formules/formule-form-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useRunMutation } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { Formule } from "@/lib/gestion/types";

export default function FormulesPage() {
  const state = useGestion();
  const { can } = useGestionAccess();
  const run = useRunMutation();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Formule | null>(null);
  const [deleting, setDeleting] = useState<Formule | null>(null);

  if (!state) return null;

  const canEdit = can("formules.edit");
  const menuItems = state.categories.flatMap((category) => category.items);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
            Formules
          </h1>
          <p className="mt-1 text-sm text-muted">
            Les formules s’affichent au-dessus des catégories sur le menu
            client — inutile de créer une catégorie pour elles.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="ember-gradient shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-background"
          >
            + Nouvelle formule
          </button>
        )}
      </div>

      {state.formules.length === 0 ? (
        <EmptyState
          title="Aucune formule"
          body="Créez une formule pour proposer un menu à étapes (entrée + plat + dessert…)."
          action={
            canEdit && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
              >
                Créer une formule
              </button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {state.formules.map((formule) => (
            <FormuleCard
              key={formule.id}
              formule={formule}
              onEdit={() => setEditing(formule)}
              onDelete={() => setDeleting(formule)}
            />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <FormuleFormModal
          formule={editing ?? undefined}
          menuItems={menuItems}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Supprimer « ${deleting.name} » ?`}
          message="La formule sera retirée définitivement du menu."
          confirmLabel="Supprimer"
          destructive
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            void run(async () => {
              await api.deleteFormule(deleting.id);
              setDeleting(null);
            }, "Formule supprimée.")
          }
        />
      )}
    </div>
  );
}

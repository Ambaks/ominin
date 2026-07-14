"use client";

import { EditIcon, TrashIcon } from "@/components/gestion/icons";
import { useRunMutation } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import * as api from "@/lib/gestion/api";
import { useGestionAccess } from "@/lib/gestion/store";
import type { Formule } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu-data";

export function FormuleCard({
  formule,
  onEdit,
  onDelete,
}: {
  formule: Formule;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { can } = useGestionAccess();
  const run = useRunMutation();
  const canEdit = can("formules.edit");

  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-5 ${
        formule.disponible ? "" : "opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-medium">{formule.name}</h3>
          <p className="text-xs text-faint">
            {formule.etapes.length} étape{formule.etapes.length > 1 ? "s" : ""}
          </p>
        </div>
        <span className="shrink-0 font-display text-lg text-ember-1">
          {formatPrice(formule.price)}
        </span>
      </div>

      {formule.description && (
        <p className="text-sm leading-relaxed text-muted">{formule.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {formule.etapes.map((etape) => (
          <span
            key={etape.id}
            className="rounded-full border border-hairline px-2.5 py-1 text-[11px] text-muted"
          >
            {etape.name} · {etape.articles.length} choix
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-hairline pt-3">
        <label className="flex items-center gap-2 text-xs text-muted">
          <Toggle
            checked={formule.disponible}
            disabled={!canEdit}
            onChange={(checked) =>
              void run(
                () => api.setFormuleAvailability(formule.id, checked),
                checked ? "Formule remise en vente." : "Formule retirée de la vente."
              )
            }
            label={`Disponibilité de ${formule.name}`}
          />
          {formule.disponible ? "En vente" : "Retirée"}
        </label>
        {canEdit && (
          <span className="flex gap-1">
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Modifier ${formule.name}`}
              className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
            >
              <EditIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Supprimer ${formule.name}`}
              className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-3/50 hover:text-ember-3"
            >
              <TrashIcon className="size-3.5" />
            </button>
          </span>
        )}
      </div>
    </article>
  );
}

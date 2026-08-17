"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/admin/api";
import { PRIORITY_LABELS } from "@/lib/admin/constants";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/admin/format";
import { useAdmin } from "@/lib/admin/store";
import type { LeadLite, Priority, TaskRow } from "@/lib/admin/types";
import { RestaurantPicker } from "../restaurant-picker";

/*
 * Création/édition d'une tâche. `restaurantId` pré-rempli (fiche lead) fige
 * le restaurant ; sinon le picker est libre.
 */
export function TaskFormModal({
  task,
  restaurantId,
  onClose,
}: {
  /** Tâche à éditer, ou null pour une création. */
  task: TaskRow | null;
  /** Restaurant imposé (ouverture depuis une fiche). */
  restaurantId?: string;
  onClose: () => void;
}) {
  const state = useAdmin();
  const toast = useToast();
  const fixedRestaurantId = restaurantId ?? null;
  const initialRestaurant =
    state?.leads.find(
      (lead) =>
        lead.restaurantId === (fixedRestaurantId ?? task?.restaurantId)
    ) ?? null;

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [dueAt, setDueAt] = useState(
    task?.dueAt ? toDatetimeLocalValue(task.dueAt) : ""
  );
  const [priority, setPriority] = useState<Priority>(
    task?.priority ?? "medium"
  );
  const [restaurant, setRestaurant] = useState<LeadLite | null>(
    initialRestaurant
  );
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Le titre est requis.");
      return;
    }
    setBusy(true);
    try {
      const input: api.TaskInput = {
        title,
        description,
        dueAt: dueAt ? fromDatetimeLocalValue(dueAt) : null,
        priority,
        restaurantId: restaurant?.restaurantId ?? null,
      };
      if (task) await api.updateTask(task.id, input);
      else await api.createTask(input);
      toast.success(task ? "Tâche mise à jour" : "Tâche créée");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  return (
    <Modal
      title={task ? "Modifier la tâche" : "Nouvelle tâche"}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="ember-gradient rounded-full px-5 py-2 text-sm font-semibold text-background disabled:opacity-60"
          >
            Enregistrer
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Titre" required>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </Field>
        <Field label="Échéance">
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Priorité
          </span>
          <div className="flex gap-1.5">
            {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  className={`flex-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    priority === value
                      ? "border-ember-2/60 bg-surface text-foreground"
                      : "border-hairline text-muted hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>
        {!fixedRestaurantId && (
          <Field label="Restaurant">
            <RestaurantPicker value={restaurant} onSelect={setRestaurant} />
          </Field>
        )}
      </div>
    </Modal>
  );
}

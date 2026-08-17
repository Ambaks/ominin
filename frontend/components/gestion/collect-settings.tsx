"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { setCollectSlotCapacity } from "@/lib/gestion/api";

export function CollectSettings({
  initialSlotCapacity,
}: {
  initialSlotCapacity: number;
}) {
  const toast = useToast();
  const [capacity, setCapacity] = useState(initialSlotCapacity);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await setCollectSlotCapacity(capacity);
      toast.success("Réglage enregistré.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex max-w-xl flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 lg:p-6"
    >
      <div>
        <h2 className="font-display text-lg font-medium">Click &amp; Collect</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Paramètres du retrait en ligne.
        </p>
      </div>
      <Field
        label="Commandes par créneau"
        hint="Nombre maximal de commandes que vous pouvez préparer sur un même créneau de retrait."
      >
        <input
          type="number"
          min={1}
          value={capacity}
          onChange={(event) => setCapacity(Number(event.target.value))}
          required
          className={`${inputClass} w-24`}
        />
      </Field>
      <div className="flex justify-end">
        <button
          type="submit"
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
        >
          Enregistrer
        </button>
      </div>
    </form>
  );
}

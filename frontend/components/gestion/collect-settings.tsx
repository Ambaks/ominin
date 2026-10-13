"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { setCollectSlotCapacity } from "@/lib/gestion/api";
import { formatPrice } from "@/lib/menu-data";

export function CollectSettings({
  initialSlotCapacity,
  onlineMinOrder,
  onlinePayment,
}: {
  initialSlotCapacity: number;
  onlineMinOrder: number | null;
  /** Le minimum se règle sous l'interrupteur « Paiement en ligne », allumé. */
  onlinePayment: boolean;
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
      <p className="text-xs leading-relaxed text-faint">
        {!onlinePayment
          ? "Pour fixer une commande minimum, activez «\u00a0Paiement en ligne\u00a0» dans «\u00a0Paiement à table\u00a0»."
          : onlineMinOrder === null
            ? "Aucune commande minimum. Elle se règle dans «\u00a0Paiement à table\u00a0»."
            : `Commande minimum\u00a0: ${formatPrice(onlineMinOrder)}, réglée dans «\u00a0Paiement à table\u00a0».`}
      </p>
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

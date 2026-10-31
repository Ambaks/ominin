"use client";

import { useState } from "react";
import { describeError } from "@/components/gestion/paiements/describe-error";
import { Plate } from "@/components/gestion/ui";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { setCollectSlotCapacity } from "@/lib/gestion/api";
import { formatPrice } from "@/lib/menu/format";

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
  const [saved, setSaved] = useState(initialSlotCapacity);
  const [busy, setBusy] = useState(false);
  const valid = Number.isInteger(capacity) && capacity >= 1;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      await setCollectSlotCapacity(capacity);
      setSaved(capacity);
      toast.success("Réglage enregistré.");
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Plate className="max-w-xl p-5">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-g-h2">Click &amp; Collect</h2>
          <p className="mt-1 text-muted">Paramètres du retrait en ligne.</p>
        </div>
        <Field
          label="Commandes par créneau"
          hint="Nombre maximal de commandes que vous pouvez préparer sur un même créneau de retrait."
          error={valid ? undefined : "Indiquez au moins 1 commande par créneau."}
        >
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(event) => setCapacity(Number(event.target.value))}
            required
            aria-invalid={valid ? undefined : true}
            className={`${inputClass} w-24`}
          />
        </Field>
        <p className="text-g-meta text-muted">
          {!onlinePayment
            ? "Pour fixer une commande minimum, activez « Paiement en ligne » dans « Paiement à table »."
            : onlineMinOrder === null
              ? "Aucune commande minimum. Elle se règle dans « Paiement à table »."
              : `Commande minimum : ${formatPrice(onlineMinOrder)}, réglée dans « Paiement à table ».`}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {valid && capacity === saved && !busy && (
            <span className="mr-auto text-g-meta text-muted">Rien à enregistrer.</span>
          )}
          <button
            type="submit"
            disabled={busy || !valid || capacity === saved}
            className="g-btn g-btn-primary g-press"
          >
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Plate>
  );
}

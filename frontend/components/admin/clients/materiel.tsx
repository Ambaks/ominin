"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { MATERIEL_ITEMS, type MaterielItem } from "@/lib/admin/constants";
import { createClient } from "@/lib/supabase/client";

/*
 * Ce qu'on livre à ce client. Une quantité à 0 retire la ligne : un article
 * absent de la table est un article qu'on ne livre pas.
 */
type Quantities = Partial<Record<MaterielItem, number>>;

export function ClientMateriel({ etablissementId }: { etablissementId: string }) {
  const toast = useToast();
  const [quantities, setQuantities] = useState<Quantities | null>(null);

  useEffect(() => {
    createClient()
      .from("client_materiel")
      .select("item, quantity")
      .eq("etablissement_id", etablissementId)
      .then(({ data, error }) => {
        if (error) {
          toast.error(error.message);
          return;
        }
        setQuantities(Object.fromEntries(data.map((row) => [row.item, row.quantity])));
      });
    // toast est stable (contexte).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etablissementId]);

  async function save(item: MaterielItem, quantity: number) {
    const previous = quantities?.[item] ?? 0;
    if (quantity === previous) return;
    setQuantities((current) => ({ ...current, [item]: quantity }));

    const table = createClient().from("client_materiel");
    const { error } =
      quantity > 0
        ? await table.upsert({ etablissement_id: etablissementId, item, quantity })
        : await table.delete().eq("etablissement_id", etablissementId).eq("item", item);
    if (error) {
      setQuantities((current) => ({ ...current, [item]: previous }));
      toast.error(error.message);
    }
  }

  if (!quantities) {
    return <div aria-busy className="shimmer h-64 rounded-2xl" />;
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface">
      <ul className="divide-y divide-hairline text-sm">
        {MATERIEL_ITEMS.map((item) => {
          const quantity = quantities[item.id] ?? 0;
          return (
            <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className={quantity > 0 ? "font-medium" : "text-muted"}>{item.label}</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={`Quantité : ${item.label}`}
                defaultValue={quantity}
                key={quantity}
                onBlur={(event) => {
                  const value = Math.max(0, Math.floor(Number(event.target.value)) || 0);
                  event.target.value = String(value);
                  void save(item.id, value);
                }}
                className="w-20 rounded-lg border border-hairline bg-background px-2 py-1.5 text-right tabular-nums"
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

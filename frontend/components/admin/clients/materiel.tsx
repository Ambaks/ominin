"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { MATERIEL_ITEMS, type MaterielItem } from "@/lib/admin/constants";
import { featuredTills, tillSupport } from "@/lib/composer";
import { otherTills } from "@/lib/landing-data";
import { createClient } from "@/lib/supabase/client";

/*
 * Ce qu'on livre à ce client. Une quantité à 0 retire la ligne : un article
 * absent de la table est un article qu'on ne livre pas. La caisse que le
 * client a déjà se choisit dans les listes du composeur Connect, ou se tape.
 */
const TILL_NAMES = [...featuredTills, ...otherTills].map((till) => till.name);
const TILL_LIST_ID = "materiel-tills";
const TILL_NAME_MAX_LENGTH = 80;

type Quantities = Partial<Record<MaterielItem, number>>;

export function ClientMateriel({
  etablissementId,
}: {
  etablissementId: string;
}) {
  const toast = useToast();
  const [quantities, setQuantities] = useState<Quantities | null>(null);
  const [till, setTill] = useState("");

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
        setQuantities(
          Object.fromEntries(data.map((row) => [row.item, row.quantity])),
        );
      });
    // toast est stable (contexte).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etablissementId]);

  useEffect(() => {
    createClient()
      .from("client_caisse")
      .select("name")
      .eq("etablissement_id", etablissementId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setTill(data?.name ?? "");
      });
    // toast est stable (contexte).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etablissementId]);

  async function saveTill(value: string) {
    const name = value.trim();
    if (name === till) return;
    const previous = till;
    setTill(name);
    const table = createClient().from("client_caisse");
    const { error } = name
      ? await table.upsert({ etablissement_id: etablissementId, name })
      : await table.delete().eq("etablissement_id", etablissementId);
    if (error) {
      setTill(previous);
      toast.error(error.message);
    }
  }

  async function save(item: MaterielItem, quantity: number) {
    const previous = quantities?.[item] ?? 0;
    if (quantity === previous) return;
    setQuantities((current) => ({ ...current, [item]: quantity }));

    const table = createClient().from("client_materiel");
    const { error } =
      quantity > 0
        ? await table.upsert({
            etablissement_id: etablissementId,
            item,
            quantity,
          })
        : await table
            .delete()
            .eq("etablissement_id", etablissementId)
            .eq("item", item);
    if (error) {
      setQuantities((current) => ({ ...current, [item]: previous }));
      toast.error(error.message);
    }
  }

  if (!quantities) {
    return <div aria-busy className="shimmer h-64 rounded-2xl" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface px-4 py-3 text-sm">
        <label htmlFor="materiel-till" className="text-muted">
          Caisse qu&apos;il a déjà
        </label>
        <div className="flex min-w-0 flex-col items-end gap-1">
          <input
            id="materiel-till"
            list={TILL_LIST_ID}
            defaultValue={till}
            key={till}
            maxLength={TILL_NAME_MAX_LENGTH}
            placeholder="Aucune"
            onBlur={(event) => void saveTill(event.target.value)}
            className="w-56 max-w-full rounded-lg border border-hairline bg-background px-2 py-1.5 text-right"
          />
          {till && (
            <span className="text-xs text-faint">
              {tillSupport(till) === "compatible" ? "Compatible" : "À vérifier"}
            </span>
          )}
          <datalist id={TILL_LIST_ID}>
            {TILL_NAMES.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="rounded-2xl border border-hairline bg-surface">
        <ul className="divide-y divide-hairline text-sm">
          {MATERIEL_ITEMS.map((item) => {
            const quantity = quantities[item.id] ?? 0;
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <span className={quantity > 0 ? "font-medium" : "text-muted"}>
                  {item.label}
                </span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={`Quantité : ${item.label}`}
                  defaultValue={quantity}
                  key={quantity}
                  onBlur={(event) => {
                    const value = Math.max(
                      0,
                      Math.floor(Number(event.target.value)) || 0,
                    );
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
    </div>
  );
}

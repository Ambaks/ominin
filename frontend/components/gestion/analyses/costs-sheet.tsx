"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/gestion/icons";
import { Field, GlassButton, Input, Sheet } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import type { AnalysesData } from "@/lib/gestion/analyses";
import { saveAnalysesCosts } from "@/lib/gestion/api";
import { ANALYSES } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";

const display = (value: number | null | undefined) =>
  value == null ? "" : String(value).replace(".", ",");

/** Vide : pas de valeur. NaN : à corriger. */
function parse(text: string): number | null {
  const cleaned = text.trim().replace(",", ".");
  return cleaned === "" ? null : Number(cleaned);
}

const isBad = (value: number | null, max?: number) =>
  value != null && (!Number.isFinite(value) || value < 0 || (max != null && value > max));
/** Un objectif de 0 % n'en est pas un : tout le dépasserait à l'infini. */
const isBadTarget = (value: number | null) => isBad(value, 100) || value === 0;

/**
 * Les coûts ne se lisent qu'ici et dans le calcul : ni le menu ni la salle n'y ont
 * accès. La part de catégorie suffit à démarrer, le coût exact d'un plat la remplace.
 */
export function CostsSheet({
  data,
  onClose,
  onSaved,
}: {
  data: AnalysesData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState({
    hourly: display(data.settings?.hourly_labor_cost),
    food: display(data.settings?.food_cost_target),
    labor: display(data.settings?.labor_cost_target),
    prime: display(data.settings?.prime_cost_target),
  });
  const [categories, setCategories] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.categories.map((row) => [row.category_id, display(row.cost_percent)]))
  );
  const [items, setItems] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.items.map((row) => [row.item_id, display(row.unit_cost)]))
  );

  const parsed = {
    hourly: parse(settings.hourly),
    food: parse(settings.food),
    labor: parse(settings.labor),
    prime: parse(settings.prime),
  };
  const invalid =
    isBad(parsed.hourly) ||
    isBadTarget(parsed.food) ||
    isBadTarget(parsed.labor) ||
    isBadTarget(parsed.prime) ||
    Object.values(categories).some((text) => isBad(parse(text), 100)) ||
    Object.values(items).some((text) => isBad(parse(text)));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await saveAnalysesCosts({
        settings: {
          hourly_labor_cost: parsed.hourly,
          food_cost_target: parsed.food,
          labor_cost_target: parsed.labor,
          prime_cost_target: parsed.prime,
        },
        categories: data.categories
          .filter((row) => categories[row.category_id] !== display(row.cost_percent))
          .map((row) => ({ id: row.category_id, value: parse(categories[row.category_id]) })),
        items: data.items
          .filter((row) => items[row.item_id] !== display(row.unit_cost))
          .map((row) => ({ id: row.item_id, value: parse(items[row.item_id]) })),
      });
      toast.success("Coûts enregistrés.");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(describeError(error).message);
      // Une partie a pu passer : l'écran relit ce qui est réellement enregistré.
      onSaved();
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Mes coûts"
      description="Visibles par le gérant seulement."
      onClose={onClose}
      footer={
        <>
          {invalid && <p role="status">Corrigez les valeurs : des nombres positifs, objectifs de 1 à 100 %.</p>}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" type="submit" form="costs-form" disabled={busy || invalid}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </GlassButton>
        </>
      }
    >
      <form id="costs-form" onSubmit={save} className="flex flex-col gap-5">
        <Field
          label="Coût horaire moyen"
          hint="Salaire et charges, tous postes confondus."
          error={isBad(parsed.hourly) ? "Un nombre positif." : undefined}
        >
          <Input
            numeric
            unit="€/h"
            data-autofocus
            value={settings.hourly}
            onChange={(event) => setSettings({ ...settings, hourly: event.target.value })}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Objectif matière" error={isBadTarget(parsed.food) ? "De 1 à 100." : undefined}>
            <Input
              numeric
              unit="%"
              placeholder={String(ANALYSES.foodCostTarget)}
              value={settings.food}
              onChange={(event) => setSettings({ ...settings, food: event.target.value })}
            />
          </Field>
          <Field label="Objectif équipe" error={isBadTarget(parsed.labor) ? "De 1 à 100." : undefined}>
            <Input
              numeric
              unit="%"
              placeholder={String(ANALYSES.laborCostTarget)}
              value={settings.labor}
              onChange={(event) => setSettings({ ...settings, labor: event.target.value })}
            />
          </Field>
          <Field label="Objectif total" error={isBadTarget(parsed.prime) ? "De 1 à 100." : undefined}>
            <Input
              numeric
              unit="%"
              placeholder={String(ANALYSES.primeCostTarget)}
              value={settings.prime}
              onChange={(event) => setSettings({ ...settings, prime: event.target.value })}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-g-meta text-muted">
            Part matière du prix HT par catégorie. Ouvrez une catégorie pour poser le coût exact d’un plat.
          </p>
          {data.categories.map((category) => {
            const dishes = data.items.filter((item) => item.category_id === category.category_id);
            return (
              <div key={category.category_id} className="flex flex-col gap-2">
                <Field
                  label={category.name}
                  error={isBad(parse(categories[category.category_id]), 100) ? "De 0 à 100." : undefined}
                >
                  <Input
                    numeric
                    unit="%"
                    value={categories[category.category_id]}
                    onChange={(event) =>
                      setCategories({ ...categories, [category.category_id]: event.target.value })
                    }
                  />
                </Field>
                {dishes.length > 0 && (
                  <details className="group">
                    <summary className="flex min-h-[var(--g-control)] cursor-pointer list-none items-center gap-2 text-g-label text-muted">
                      <span className="flex transition-transform group-open:rotate-180 *:size-4" aria-hidden>
                        <ChevronDownIcon />
                      </span>
                      Coût exact par plat ({dishes.filter((dish) => items[dish.item_id] !== "").length}/{dishes.length})
                    </summary>
                    <div className="mt-2 flex flex-col gap-2">
                      {dishes.map((dish) => (
                        <label key={dish.item_id} className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate">{dish.name}</span>
                          <span className="w-28 shrink-0">
                            <Input
                              numeric
                              unit="€"
                              aria-label={`Coût de ${dish.name}`}
                              aria-invalid={isBad(parse(items[dish.item_id])) || undefined}
                              value={items[dish.item_id]}
                              onChange={(event) => setItems({ ...items, [dish.item_id]: event.target.value })}
                            />
                          </span>
                        </label>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </form>
    </Sheet>
  );
}

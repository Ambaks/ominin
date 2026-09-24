"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { LoyaltyTier, LoyaltyTierInput } from "@/lib/gestion/fidelite";
import type { MenuCategory } from "@/lib/menu-data";

/**
 * Un palier : ce que le client lit sur le menu (« 1 café ou thé ou soft
 * offert »), son prix en points, et les articles parmi lesquels il choisit.
 */
export function TierFormModal({
  tier,
  categories,
  onSubmit,
  onClose,
}: {
  /** Palier à modifier, ou null pour en créer un. */
  tier: LoyaltyTier | null;
  categories: MenuCategory[];
  /** Ne rejette jamais : l'appelant signale l'erreur et laisse le formulaire ouvert. */
  onSubmit: (input: LoyaltyTierInput) => Promise<void>;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(tier?.label ?? "");
  const [points, setPoints] = useState(tier ? String(tier.points) : "");
  const [itemIds, setItemIds] = useState<Set<string>>(
    () => new Set(tier?.itemIds ?? [])
  );
  const [busy, setBusy] = useState(false);

  const toggleItem = (itemId: string) =>
    setItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });

  const toggleCategory = (category: MenuCategory) =>
    setItemIds((current) => {
      const next = new Set(current);
      const all = category.items.every((item) => next.has(item.id));
      for (const item of category.items) {
        if (all) next.delete(item.id);
        else next.add(item.id);
      }
      return next;
    });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit({
        label: label.trim(),
        points: Number(points),
        itemIds: [...itemIds],
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={tier ? "Modifier le palier" : "Ajouter un palier"}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="tier-form"
            disabled={busy || itemIds.size === 0}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            {tier ? "Enregistrer" : "Ajouter"}
          </button>
        </>
      }
    >
      <form id="tier-form" onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Récompense" required hint="Ce que le client lit sur le menu.">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            required
            placeholder="1 café ou thé ou soft offert"
            className={inputClass}
          />
        </Field>
        <Field label="Points" required>
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            required
            placeholder="50"
            className={inputClass}
          />
        </Field>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-medium text-muted">
            Articles au choix ({itemIds.size})
          </legend>
          {categories
            .filter((category) => category.items.length > 0)
            .map((category) => (
              <div key={category.id} className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="w-fit text-xs font-semibold text-ember-1"
                >
                  {category.name}
                </button>
                <div className="flex flex-wrap gap-1.5">
                  {category.items.map((item) => {
                    const checked = itemIds.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={checked}
                        onClick={() => toggleItem(item.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          checked
                            ? "border-ember-2/60 bg-surface-raised text-foreground"
                            : "border-hairline text-muted"
                        }`}
                      >
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </fieldset>
      </form>
    </Modal>
  );
}

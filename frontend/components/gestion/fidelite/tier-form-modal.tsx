"use client";

import { useRef, useState } from "react";
import { GlassButton } from "@/components/gestion/ui";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { LoyaltyTier, LoyaltyTierInput } from "@/lib/gestion/fidelite";
import type { MenuCategory } from "@/lib/menu-data";

/**
 * Une récompense : ce que le client lit sur le menu (« 1 café ou thé ou soft
 * offert »), son prix en points, et les articles parmi lesquels il choisit.
 * La retirer se fait d'ici aussi, en bas, à l'écart du reste.
 */
export function TierFormModal({
  tier,
  categories,
  onSubmit,
  onDelete,
  onClose,
}: {
  /** Récompense à modifier, ou null pour en créer une. */
  tier: LoyaltyTier | null;
  categories: MenuCategory[];
  /** Ne rejette jamais : l'appelant signale l'erreur et laisse le formulaire ouvert. */
  onSubmit: (input: LoyaltyTierInput) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [label, setLabel] = useState(tier?.label ?? "");
  const [points, setPoints] = useState(tier ? String(tier.points) : "");
  const [itemIds, setItemIds] = useState<Set<string>>(
    () => new Set(tier?.itemIds ?? [])
  );
  const [touched, setTouched] = useState(false);
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

  const pointsValue = Number(points);
  const errors = {
    label: label.trim() === "" ? "Ce que le client lit sur le menu." : undefined,
    points:
      !Number.isInteger(pointsValue) || pointsValue < 1 ? "Un nombre entier de points, 1 au moins." : undefined,
    items: itemIds.size === 0 ? "Cochez au moins un article : sans article, la récompense n'apparaît pas sur le menu." : undefined,
  };
  const invalid = Boolean(errors.label || errors.points || errors.items);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (invalid) return;
    setBusy(true);
    try {
      await onSubmit({ label: label.trim(), points: pointsValue, itemIds: [...itemIds] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={tier ? "Modifier la récompense" : "Ajouter une récompense"}
      onClose={onClose}
      footer={
        <>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="mr-auto text-g-label font-semibold text-muted underline-offset-4 hover:text-foreground hover:underline"
            >
              Retirer cette récompense
            </button>
          )}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton
            variant="primary"
            disabled={busy}
            onClick={() => form.current?.requestSubmit()}
          >
            {tier ? "Enregistrer" : "Ajouter"}
          </GlassButton>
        </>
      }
    >
      <form ref={form} noValidate onSubmit={submit} className="flex flex-col gap-4">
        <Field
          label="Récompense"
          required
          hint="Ce que le client lit sur le menu."
          error={touched ? errors.label : undefined}
        >
          <input
            data-autofocus
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="1 café ou thé ou soft offert"
            aria-invalid={touched && errors.label ? true : undefined}
            className={inputClass}
          />
        </Field>
        <Field label="Points" required error={touched ? errors.points : undefined}>
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            placeholder="50"
            aria-invalid={touched && errors.points ? true : undefined}
            className={inputClass}
          />
        </Field>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
            Articles au choix <span className="tabular-nums">({itemIds.size})</span>
          </legend>
          {categories
            .filter((category) => category.items.length > 0)
            .map((category) => {
              const all = category.items.every((item) => itemIds.has(item.id));
              return (
                <div key={category.id} className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    aria-pressed={all}
                    onClick={() => toggleCategory(category)}
                    className="flex min-h-9 w-fit items-center text-g-label font-semibold text-ember-1 underline-offset-4 hover:underline"
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
                          className={`g-press flex min-h-9 items-center rounded-full border px-3 text-g-label transition-colors ${
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
              );
            })}
          {touched && errors.items && (
            <p role="alert" className="text-xs font-medium text-ember-3">
              {errors.items}
            </p>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}

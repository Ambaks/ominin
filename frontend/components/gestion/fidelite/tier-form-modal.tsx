"use client";

import { useId, useState } from "react";
import { CheckIcon } from "@/components/gestion/icons";
import { Field, GlassButton, Input, Sheet } from "@/components/gestion/ui";
import type { LoyaltyTier, LoyaltyTierInput } from "@/lib/gestion/fidelite";
import type { MenuCategory } from "@/lib/menu-data";

/**
 * Une récompense : ce que le client lit sur le menu (« 1 café ou thé ou soft
 * offert »), son prix en points, et les articles parmi lesquels il choisit.
 * La retirer se fait d'ici aussi, à gauche du pied, à l'écart du reste.
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
  const formId = useId();
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
    label: label.trim() === "" ? "Indiquez ce que le client lit sur le menu." : undefined,
    points:
      !Number.isInteger(pointsValue) || pointsValue < 1 ? "Un nombre entier de points, 1 au moins." : undefined,
    items: itemIds.size === 0 ? "Cochez au moins un article." : undefined,
  };
  const shown = touched ? errors : { label: undefined, points: undefined, items: undefined };
  const missing = errors.label
    ? "Indiquez la récompense pour enregistrer."
    : errors.points
      ? "Indiquez les points pour enregistrer."
      : errors.items
        ? "Cochez au moins un article pour enregistrer."
        : null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    // Le premier champ fautif prend le focus : son erreur est lue avec lui.
    const form = event.currentTarget;
    const focus = (name: string) => (form.elements.namedItem(name) as HTMLElement | null)?.focus();
    if (errors.label) return focus("label");
    if (errors.points) return focus("points");
    if (errors.items) return form.querySelector<HTMLElement>("fieldset button")?.focus();
    setBusy(true);
    try {
      await onSubmit({ label: label.trim(), points: pointsValue, itemIds: [...itemIds] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={tier ? "Modifier la récompense" : "Ajouter une récompense"}
      onClose={onClose}
      footer={
        <>
          {touched && missing && <p className="text-g-meta text-muted">{missing}</p>}
          {onDelete && (
            <GlassButton variant="danger" className="mr-auto" onClick={onDelete}>
              Retirer la récompense
            </GlassButton>
          )}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" type="submit" form={formId} disabled={busy}>
            {tier ? "Enregistrer" : "Ajouter"}
          </GlassButton>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Récompense" required hint="Ce que le client lit sur le menu." error={shown.label}>
          <Input
            name="label"
            data-autofocus
            value={label}
            autoComplete="off"
            onChange={(event) => setLabel(event.target.value)}
            placeholder="1 café ou thé ou soft offert"
          />
        </Field>
        <Field label="Points" required hint="Le prix de la récompense." error={shown.points}>
          <Input
            name="points"
            numeric
            unit="pts"
            inputMode="numeric"
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            placeholder="50"
            className="max-w-40"
          />
        </Field>
        <fieldset className="g-field" aria-describedby={shown.items ? `${formId}-items` : undefined}>
          <legend className="g-field-label">
            Articles au choix <b aria-hidden>*</b>
            <span className="ml-1 font-normal tabular-nums">· {itemIds.size}</span>
          </legend>
          {shown.items ? (
            <p id={`${formId}-items`} role="alert" className="g-field-error">
              <span>{shown.items}</span>
            </p>
          ) : (
            <p className="g-field-hint">Le client choisit parmi eux ; un nom de catégorie coche toute la catégorie.</p>
          )}
          <div className="mt-2 flex flex-col gap-3">
            {categories
              .filter((category) => category.items.length > 0)
              .map((category) => {
                const all = category.items.every((item) => itemIds.has(item.id));
                return (
                  <div key={category.id} className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      aria-pressed={all}
                      aria-label={`${all ? "Tout décocher" : "Tout cocher"} : ${category.name}`}
                      onClick={() => toggleCategory(category)}
                      className="g-press flex min-h-(--g-control) w-fit items-center gap-1.5 text-g-label font-semibold text-ember-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1"
                    >
                      {category.name}
                      <span className="font-normal text-muted">· {all ? "tout décocher" : "tout cocher"}</span>
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
                            className={`g-press flex min-h-(--g-control) items-center gap-1.5 rounded-full border px-3 text-g-label transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1 ${
                              checked
                                ? "border-ember-2/60 bg-surface-raised text-foreground"
                                : "border-hairline text-muted"
                            }`}
                          >
                            {checked && <CheckIcon className="size-(--g-icon-chip) text-ember-2" />}
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </fieldset>
      </form>
    </Sheet>
  );
}

"use client";

import { useState } from "react";
import { cartLineKey, useCart, type CartChoice } from "@/lib/menu/cart";
import { formatPrice, type MenuItem } from "@/lib/menu-data";

function isUnavailable(item: MenuItem): boolean {
  return item.disponible === false || item.stock === 0;
}

/** Bouton « + Ajouter ». Ouvre la modale d'options si l'article en a. */
export function AddToOrder({ item }: { item: MenuItem }) {
  const { orderingEnabled, tableNumber, addLine } = useCart();
  const [modalOpen, setModalOpen] = useState(false);
  const [added, setAdded] = useState(false);

  if (!orderingEnabled) return null;

  if (isUnavailable(item)) {
    return (
      <span className="shrink-0 rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-faint">
        Indisponible
      </span>
    );
  }

  if (tableNumber === null) {
    return (
      <button
        type="button"
        disabled
        title="Scannez le Cachet de votre table pour commander"
        className="ember-gradient shrink-0 cursor-not-allowed rounded-full px-5 py-2.5 text-sm font-semibold text-background opacity-45"
      >
        + Ajouter
      </button>
    );
  }

  const hasOptions = (item.options?.length ?? 0) > 0;

  const addPlain = () => {
    addLine({
      key: cartLineKey(item.id, []),
      itemId: item.id,
      name: item.name,
      unitPrice: item.price,
      optionSummary: [],
      choices: [],
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <>
      <button
        type="button"
        onClick={hasOptions ? () => setModalOpen(true) : addPlain}
        className="ember-gradient shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-background transition-transform active:scale-95"
      >
        {added ? "Ajouté ✓" : hasOptions ? "Choisir" : "+ Ajouter"}
      </button>
      {modalOpen && (
        <OptionsModal item={item} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}

function OptionsModal({
  item,
  onClose,
}: {
  item: MenuItem;
  onClose: () => void;
}) {
  const { addLine } = useCart();
  const groups = item.options ?? [];
  const [selected, setSelected] = useState<Record<string, string>>({});

  const missingRequired = groups.some(
    (group) => group.obligatoire && !selected[group.id]
  );

  const supplement = groups.reduce((sum, group) => {
    const choice = group.choices.find((c) => c.id === selected[group.id]);
    return sum + (choice?.supplement ?? 0);
  }, 0);
  const unitPrice = item.price + supplement;

  const confirm = () => {
    if (missingRequired) return;
    const choices: CartChoice[] = [];
    const optionSummary: string[] = [];
    for (const group of groups) {
      const choiceId = selected[group.id];
      if (!choiceId) continue;
      const choice = group.choices.find((c) => c.id === choiceId);
      if (!choice) continue;
      choices.push({ group_id: group.id, choice_id: choice.id });
      optionSummary.push(
        choice.supplement > 0
          ? `${choice.name} (+${formatPrice(choice.supplement)})`
          : choice.name
      );
    }
    addLine({
      key: cartLineKey(item.id, choices),
      itemId: item.id,
      name: item.name,
      unitPrice,
      optionSummary,
      choices,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-hairline bg-surface p-6 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="font-display text-xl font-medium">{item.name}</h3>
        <div className="mt-5 flex flex-col gap-6">
          {groups.map((group) => (
            <fieldset key={group.id}>
              <legend className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
                {group.name}
                {group.obligatoire ? (
                  <span className="text-[11px] font-medium text-ember-2">
                    obligatoire
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-faint">
                    optionnel
                  </span>
                )}
              </legend>
              <div className="flex flex-col gap-2">
                {group.choices.map((choice) => {
                  const checked = selected[group.id] === choice.id;
                  return (
                    <label
                      key={choice.id}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                        checked
                          ? "border-ember-2/60 bg-surface-raised"
                          : "border-hairline"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name={group.id}
                          checked={checked}
                          onChange={() =>
                            setSelected((s) => ({ ...s, [group.id]: choice.id }))
                          }
                          className="accent-ember-2"
                        />
                        {choice.name}
                      </span>
                      {choice.supplement > 0 && (
                        <span className="text-muted">
                          +{formatPrice(choice.supplement)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={missingRequired}
            className="ember-gradient flex-1 rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-45"
          >
            {missingRequired
              ? "Choisissez les options"
              : `Ajouter · ${formatPrice(unitPrice)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

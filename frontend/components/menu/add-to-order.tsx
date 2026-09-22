"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cartLineKey, useCart, type CartChoice } from "@/lib/menu/cart";
import { formatPrice, type MenuItem, type OptionGroup } from "@/lib/menu-data";

function isUnavailable(item: MenuItem): boolean {
  return item.disponible === false || item.stock === 0;
}

/** Durée du « Ajouté ✓ » sur le bouton, avant retour au libellé normal. */
const ADDED_FLASH_MS = 1200;

const choiceRow =
  "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors";

const choiceRowClass = (checked: boolean) =>
  `${choiceRow} ${checked ? "border-ember-2/60 bg-surface-raised" : "border-hairline"}`;

/** Bouton « + Ajouter ». Ouvre la modale d'options si l'article en a. */
export function AddToOrder({ item }: { item: MenuItem }) {
  const { orderingEnabled, tableNumber, addLine, track } = useCart();
  const [modalOpen, setModalOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashAdded = useCallback(() => {
    setAdded(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setAdded(false), ADDED_FLASH_MS);
  }, []);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    []
  );

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
      stock: item.stock,
    });
    // « panier » implique « plat » : l'étape ne recule pas, un seul envoi suffit.
    track("panier", { items: [item.id] });
    flashAdded();
  };

  return (
    <>
      <button
        type="button"
        onClick={
          hasOptions
            ? () => {
                track("plat", { items: [item.id] });
                setModalOpen(true);
              }
            : addPlain
        }
        className="ember-gradient shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-background transition-transform active:scale-95"
      >
        {added ? "Ajouté ✓" : hasOptions ? "Choisir" : "+ Ajouter"}
      </button>
      {modalOpen && (
        <OptionsModal
          item={item}
          onClose={() => setModalOpen(false)}
          onAdded={flashAdded}
        />
      )}
    </>
  );
}

function OptionsModal({
  item,
  onClose,
  onAdded,
}: {
  item: MenuItem;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { addLine, track } = useCart();
  const groups = item.options ?? [];
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const chosen = (groupId: string) => selected[groupId] ?? [];
  const missingGroups = groups.filter(
    (group) => group.obligatoire && chosen(group.id).length === 0
  );
  /* Un choix posé, même optionnel : fermer par le fond le perdrait sans
     prévenir, sur une feuille qui ne couvre parfois que la moitié de l'écran. */
  const touched = Object.values(selected).some((ids) => ids.length > 0);

  const toggle = (group: OptionGroup, choiceId: string) =>
    setSelected((current) => {
      const previous = current[group.id] ?? [];
      if (!group.multiple) return { ...current, [group.id]: [choiceId] };
      return {
        ...current,
        [group.id]: previous.includes(choiceId)
          ? previous.filter((id) => id !== choiceId)
          : [...previous, choiceId],
      };
    });

  /*
   * Clavier et lecteurs d'écran : la feuille s'annonce comme dialogue, prend
   * le focus, le rend à son déclencheur en partant, se ferme par Échap et
   * fige le défilement derrière elle.
   */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const opener = document.activeElement as HTMLElement | null;
    const bodyOverflow = document.body.style.overflow;
    panel.focus();
    document.body.style.overflow = "hidden";

    // Dans un groupe de radios, un seul est dans l'ordre de tabulation :
    // celui qui est coché, ou le premier si aucun ne l'est.
    const tabbables = () => {
      const all = [
        ...panel.querySelectorAll<HTMLElement>("button, input, [href]"),
      ].filter((el) => !el.hasAttribute("disabled"));
      const seen = new Set<string>();
      return all.filter((el) => {
        if (!(el instanceof HTMLInputElement) || el.type !== "radio") return true;
        if (el.checked) return true;
        if (seen.has(el.name)) return false;
        const group = panel.querySelectorAll<HTMLInputElement>(
          `input[name="${el.name}"]`
        );
        seen.add(el.name);
        return ![...group].some((radio) => radio.checked);
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const stops = tabbables();
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = bodyOverflow;
      opener?.focus();
    };
  }, [onClose]);

  const supplement = groups.reduce(
    (sum, group) =>
      sum +
      group.choices
        .filter((choice) => chosen(group.id).includes(choice.id))
        .reduce((groupSum, choice) => groupSum + choice.supplement, 0),
    0
  );
  const unitPrice = item.price + supplement;

  const confirm = () => {
    // Il manque un choix obligatoire : on emmène le client dessus plutôt que
    // de lui présenter un bouton mort à 1 600 px du groupe concerné.
    if (missingGroups.length > 0) {
      const field = panelRef.current?.querySelector<HTMLElement>(
        `[data-group="${missingGroups[0].id}"]`
      );
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }
    const choices: CartChoice[] = [];
    const optionSummary: string[] = [];
    for (const group of groups) {
      for (const choice of group.choices) {
        if (!chosen(group.id).includes(choice.id)) continue;
        choices.push({ group_id: group.id, choice_id: choice.id });
        optionSummary.push(
          choice.supplement > 0
            ? `${choice.name} (+${formatPrice(choice.supplement)})`
            : choice.name
        );
      }
    }
    addLine({
      key: cartLineKey(item.id, choices),
      itemId: item.id,
      name: item.name,
      unitPrice,
      optionSummary,
      choices,
      stock: item.stock,
    });
    track("panier");
    onAdded();
    onClose();
  };

  /*
   * Rendue dans document.body : un ancêtre animé en transform (la révélation
   * au scroll des sections) deviendrait sinon le bloc conteneur du
   * position: fixed, et la feuille s'ouvrirait hors de l'écran le temps de
   * l'animation.
   */
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={touched ? undefined : onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-hairline bg-surface sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto p-6">
          <h3 id={titleId} className="font-display text-xl font-medium">
            {item.name}
          </h3>
          <div className="mt-5 flex flex-col gap-6">
            {groups.map((group) => (
              <fieldset key={group.id} data-group={group.id}>
                <legend className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
                  {group.name}{" "}
                  {group.obligatoire ? (
                    <span className="text-[11px] font-medium text-ember-2">
                      obligatoire
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-muted">
                      optionnel
                    </span>
                  )}
                </legend>
                <div className="flex flex-col gap-2">
                  {/* Groupe optionnel : « Aucun » est l'état par défaut et le
                      seul moyen de revenir en arrière (un radio coché ne se
                      décoche pas). */}
                  {!group.obligatoire && !group.multiple && (
                    <label className={choiceRowClass(chosen(group.id).length === 0)}>
                      <span className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name={group.id}
                          checked={chosen(group.id).length === 0}
                          onChange={() =>
                            setSelected((current) => ({
                              ...current,
                              [group.id]: [],
                            }))
                          }
                          className="accent-ember-2"
                        />
                        Aucun
                      </span>
                    </label>
                  )}
                  {group.choices.map((choice) => {
                    const checked = chosen(group.id).includes(choice.id);
                    return (
                      <label key={choice.id} className={choiceRowClass(checked)}>
                        <span className="flex items-center gap-2.5">
                          <input
                            type={group.multiple ? "checkbox" : "radio"}
                            name={group.id}
                            checked={checked}
                            onChange={() => toggle(group, choice.id)}
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
        </div>

        {/* Épinglée : les options d'un tacos 3 viandes défilent sur plus de
            1 600 px, le bouton ne doit pas partir avec elles. */}
        <div className="flex items-center gap-3 border-t border-hairline bg-surface p-4">
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
            aria-disabled={missingGroups.length > 0}
            className={`ember-gradient flex-1 rounded-full px-5 py-2.5 text-sm font-semibold text-background ${
              missingGroups.length > 0 ? "opacity-60" : ""
            }`}
          >
            <span aria-live="polite">
              {missingGroups.length === 1
                ? `Choisir : ${missingGroups[0].name}`
                : missingGroups.length > 1
                  ? `${missingGroups.length} choix manquants`
                  : `Ajouter · ${formatPrice(unitPrice)}`}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

"use client";

import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import { cartLineKey, useCart, type CartChoice } from "@/lib/menu/cart";
import { formatPrice, type MenuItem, type OptionGroup } from "@/lib/menu-data";
import { Sheet } from "./sheet";

export function isUnavailable(item: MenuItem): boolean {
  return item.disponible === false || item.stock === 0;
}

/** Durée du « Ajouté ✓ » sur le bouton, avant retour au libellé normal. */
const ADDED_FLASH_MS = 1200;

const choiceRow =
  "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors";

const choiceRowClass = (checked: boolean) =>
  `choice-row ${choiceRow} ${checked ? "is-checked border-ember-2/60 bg-surface-raised" : "border-hairline"}`;

/** Défilement doux, sauf si le client a demandé moins de mouvement. */
const scrollBehavior = (): ScrollBehavior =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/*
 * La barre du panier apparaît en bas de l'écran, souvent pile sous le pouce
 * qui vient d'ajouter : le toucher suivant l'ouvrait au lieu d'ajouter une
 * seconde portion. La page remonte juste assez pour dégager le bouton — la
 * marge est celle qui entoure la barre, lue dans sa mise en page.
 */
function revealAboveCartBar(button: HTMLElement | null) {
  requestAnimationFrame(() => {
    const bar = document.querySelector<HTMLElement>(".cart-bar");
    if (!button?.isConnected || !bar?.parentElement) return;
    const gap = parseFloat(getComputedStyle(bar.parentElement).paddingTop);
    const overlap =
      button.getBoundingClientRect().bottom + gap - bar.getBoundingClientRect().top;
    if (overlap > 0) window.scrollBy({ top: overlap, behavior: scrollBehavior() });
  });
}

/** Nom de la ligne du panier : avec son format, « Pilons x3 », « Boisson 33 cl ». */
const lineName = (item: MenuItem) =>
  item.detail ? `${item.name} ${item.detail}` : item.name;

/** Bouton « + Ajouter ». Ouvre la modale d'options si l'article en a. */
export function AddToOrder({ item }: { item: MenuItem }) {
  const { orderingEnabled, tableNumber, addLine, track, lines } = useCart();
  const [modalOpen, setModalOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
  // Un menu à plusieurs choix se compose ; un seul choix se choisit.
  const verb =
    (item.options?.length ?? 0) > 1 ? "Composer" : hasOptions ? "Choisir" : "Ajouter";
  const label = hasOptions ? verb : "+ Ajouter";
  // Combien de ce plat sont déjà au panier, toutes options confondues : le
  // « Ajouté ✓ » s'efface, le compte reste sur la carte.
  const inCart = lines
    .filter((line) => line.itemId === item.id)
    .reduce((sum, line) => sum + line.quantity, 0);

  const addPlain = () => {
    addLine({
      key: cartLineKey(item.id, []),
      itemId: item.id,
      name: lineName(item),
      unitPrice: item.price,
      optionSummary: [],
      choices: [],
      stock: item.stock,
    });
    // « panier » implique « plat » : l'étape ne recule pas, un seul envoi suffit.
    track("panier", { items: [item.id] });
    flashAdded();
    revealAboveCartBar(buttonRef.current);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          // Second toucher d'un double-tap : un seul ajout, une seule feuille.
          if (event.detail > 1) return;
          if (!hasOptions) return addPlain();
          track("plat", { items: [item.id] });
          setModalOpen(true);
        }}
        // Onze « + Ajouter » identiques ne disent rien à un lecteur d'écran.
        aria-label={`${added ? "Ajouté" : verb}\u00a0: ${lineName(item)}${
          inCart > 0 ? `, ${inCart} au panier` : ""
        }`}
        className="ember-gradient min-h-11 shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-background transition-transform active:scale-95"
      >
        {added ? "Ajouté ✓" : label}
        {/* Le compte au panier, en pastille au coin de la carte (la carte
            est le repère) : dans le bouton, il le faisait passer à la ligne. */}
        {inCart > 0 && (
          <span className="cart-count absolute right-2 top-2 z-10 flex min-w-7 items-center justify-center rounded-full bg-foreground px-2 py-1 text-xs font-bold text-background shadow-lg">
            {inCart}
          </span>
        )}
      </button>
      {modalOpen && (
        <OptionsModal
          item={item}
          onClose={() => {
            setModalOpen(false);
            revealAboveCartBar(buttonRef.current);
          }}
          onAdded={flashAdded}
        />
      )}
    </>
  );
}

/**
 * Feuille des options d'un article. Avec `reward`, l'article est offert par
 * un palier de fidélité : il se paie en points, ses suppléments en euros.
 */
export function OptionsModal({
  item,
  reward,
  onClose,
  onAdded,
}: {
  item: MenuItem;
  reward?: { id: string; points: number };
  onClose: () => void;
  onAdded: () => void;
}) {
  const { addLine, track } = useCart();
  const groups = item.options ?? [];
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  // Groupe manquant signalé au toucher du bouton grisé ; n alterne deux
  // animations identiques pour la rejouer à chaque toucher.
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Dernier geste au doigt ou à la souris (et non au clavier) : seul lui fait
  // défiler la feuille vers le groupe suivant — au clavier, le focus resterait
  // sur un groupe parti hors de vue.
  const pointer = useRef(false);
  const autoScrolling = useRef(false);
  const titleId = useId();

  const chosen = (groupId: string) => selected[groupId] ?? [];
  const missingGroups = groups.filter(
    (group) => group.obligatoire && chosen(group.id).length === 0
  );
  /* Un choix posé, même optionnel : fermer par le fond le perdrait sans
     prévenir, sur une feuille qui ne couvre parfois que la moitié de l'écran. */
  const touched = Object.values(selected).some((ids) => ids.length > 0);

  const toggle = (group: OptionGroup, choiceId: string) => {
    // Choisi : le groupe n'a plus à être signalé (surlignage fixe en
    // mouvement réduit).
    setFlash((current) => (current?.id === group.id ? null : current));
    // Premier choix d'un groupe obligatoire à choix unique : la feuille
    // descend d'elle-même au prochain groupe qui attend.
    if (
      pointer.current &&
      group.obligatoire &&
      !group.multiple &&
      chosen(group.id).length === 0
    ) {
      const next = groups.find(
        (other) =>
          other.id !== group.id &&
          other.obligatoire &&
          chosen(other.id).length === 0
      );
      // Seulement là où la fin du glissement se signale (scrollend) : sans
      // elle, pas moyen de savoir quand les touchers redeviennent sûrs.
      const body = bodyRef.current;
      if (next && body && "onscrollend" in body) {
        requestAnimationFrame(() => {
          const target = body.querySelector<HTMLElement>(
            `[data-group="${next.id}"]`
          );
          if (!target) return;
          // Son titre et sa première option déjà sous les yeux : on ne bouge
          // rien. Le client vise peut-être une option qu'il voit — la faire
          // glisser sous son doigt lui faisait choisir la voisine.
          const view = body.getBoundingClientRect();
          const firstOption =
            target.querySelector("label")?.getBoundingClientRect() ??
            target.getBoundingClientRect();
          const top = target.getBoundingClientRect().top;
          if (top >= view.top - 1 && firstOption.bottom <= view.bottom + 1) return;
          if (scrollBehavior() === "auto") {
            target.scrollIntoView({ block: "nearest" });
            return;
          }
          const before = body.scrollTop;
          autoScrolling.current = true;
          body.addEventListener(
            "scrollend",
            () => {
              autoScrolling.current = false;
            },
            { once: true }
          );
          target.scrollIntoView({ behavior: "smooth", block: "nearest" });
          // Filet : si le navigateur n'a finalement pas bougé d'un pixel,
          // pas de scrollend non plus — la garde tombe deux images plus tard.
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              if (body.scrollTop === before) autoScrolling.current = false;
            })
          );
        });
      }
    }
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
  };

  const supplement = groups.reduce(
    (sum, group) =>
      sum +
      group.choices
        .filter((choice) => chosen(group.id).includes(choice.id))
        .reduce((groupSum, choice) => groupSum + choice.supplement, 0),
    0
  );
  const unitPrice = reward ? supplement : item.price + supplement;
  // Offert : le prix se dit en points, plus les suppléments éventuels.
  const priceLabel = reward
    ? `${reward.points}\u00a0pts${unitPrice > 0 ? ` + ${formatPrice(unitPrice)}` : ""}`
    : formatPrice(unitPrice);

  /* Un menu à composer : ce qui est choisi, et le nom des groupes qui
     attendent encore — au moment de valider, le premier choix est loin
     au-dessus. */
  const recap =
    groups.length > 1
      ? groups.flatMap((group) => {
          const names = group.choices
            .filter((choice) => chosen(group.id).includes(choice.id))
            .map((choice) => choice.name);
          if (names.length > 0)
            return [{ id: group.id, text: names.join(", "), done: true }];
          return group.obligatoire
            ? [{ id: group.id, text: group.name, done: false }]
            : [];
        })
      : [];

  const confirm = (close: () => void) => {
    // Il manque un choix obligatoire : on emmène le client dessus plutôt que
    // de lui présenter un bouton mort à 1 600 px du groupe concerné.
    if (missingGroups.length > 0) {
      const id = missingGroups[0].id;
      const field = bodyRef.current?.querySelector<HTMLElement>(
        `[data-group="${id}"]`
      );
      field?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      // Sans preventScroll, le focus refait son propre défilement et annule
      // le précédent : le groupe restait sous le bouton.
      field
        ?.querySelector<HTMLInputElement>("input")
        ?.focus({ preventScroll: true });
      // Au doigt, le focus ne se voit pas : le groupe clignote.
      setFlash((current) => ({ id, n: (current?.n ?? 0) + 1 }));
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
      key: cartLineKey(item.id, choices, reward?.id),
      itemId: item.id,
      name: lineName(item),
      unitPrice,
      optionSummary,
      choices,
      stock: item.stock,
      reward,
    });
    track("panier");
    onAdded();
    close();
  };

  return (
    <Sheet onClosed={onClose} backdropCloses={!touched} labelledBy={titleId}>
      {(close) => (
        <>
          {/* Titre et prix épinglés : les choix défilent dessous, on garde
              sous les yeux ce qu'on compose et ce qu'il coûte. */}
          <div className="border-b border-hairline px-6 pb-4 pt-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3
                id={titleId}
                data-compose={groups.length > 1 || undefined}
                className="font-display text-xl font-medium"
              >
                {lineName(item)}
              </h3>
              <span className="dish-price shrink-0 font-display text-lg text-ember-1">
                {priceLabel}
              </span>
            </div>
            {/* Sur toute la largeur : dans la colonne du titre, le premier
                choix faisait passer la ligne à deux et descendre les options
                sous le doigt. */}
            {recap.length > 0 && (
              <p className="mt-1.5 text-xs text-muted">
                {recap.map((part, i) => (
                  <Fragment key={part.id}>
                    {i > 0 && " · "}
                    <span
                      className={`whitespace-nowrap ${part.done ? "text-foreground" : ""}`}
                    >
                      {part.text}
                    </span>
                  </Fragment>
                ))}
              </p>
            )}
          </div>
          <div
            ref={bodyRef}
            className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5"
            onPointerDown={() => {
              pointer.current = true;
            }}
            onKeyDown={() => {
              pointer.current = false;
            }}
            onClickCapture={(event) => {
              // La liste glisse vers le groupe suivant : un toucher pendant
              // ce temps tomberait sur une option qui vient d'arriver sous le
              // doigt.
              if (!autoScrolling.current) return;
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <div className="flex flex-col gap-6">
              {groups.map((group) => (
                <div
                  key={group.id}
                  data-group={group.id}
                  // Le défilement vers un groupe s'arrête avant l'en-tête épinglé.
                  // scroll-mt-3 + p-2 : la marge intérieure du corps de la feuille.
                  // Le surlignage sur l'enveloppe : peint sur le fieldset, il partait du
                  // milieu de sa légende. -m-2 p-2 : le cerne passe à distance du texte
                  // sans rien déplacer.
                  className={`-m-2 scroll-mt-3 p-2 ${
                    flash?.id === group.id
                      ? flash.n % 2
                        ? "group-flash-a"
                        : "group-flash-b"
                      : ""
                  }`}
                >
                  <fieldset data-required={group.obligatoire || undefined}>
                    {/* « Au choix », comme le dit le panneau d'un comptoir ;
                        une fois choisi, une coche. */}
                    <legend className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
                      {group.name}{" "}
                      {!group.obligatoire ? (
                        <span className="text-xs font-medium text-muted">
                          facultatif
                        </span>
                      ) : chosen(group.id).length > 0 ? (
                        <span className="text-xs font-medium text-ember-2">
                          <span aria-hidden>✓</span>
                          <span className="sr-only">, choix fait</span>
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-ember-2">
                          {group.multiple ? "au choix" : "1 au choix"}
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
                </div>
              ))}
            </div>
          </div>

          {/* Épinglée : les options d'un tacos 3 viandes défilent sur plus de
              1 600 px, le bouton ne doit pas partir avec elles. */}
          <div className="flex items-center gap-3 border-t border-hairline bg-surface p-4">
            {/* Resserré sous 400 px : le bouton de validation, qui nomme le
                groupe manquant, garde la place de son libellé. */}
            <button
              type="button"
              onClick={close}
              className="min-h-11 rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold max-[399px]:px-3.5 max-[399px]:text-[13px]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => confirm(close)}
              // Incomplet, il reste actif — il emmène au groupe qui manque — et
              // lisible : pas d'estompage, un aplat neutre.
              className={`min-h-11 min-w-0 flex-1 rounded-full px-5 py-2.5 text-sm font-semibold max-[389px]:px-3 max-[389px]:text-[13px] ${
                missingGroups.length > 0
                  ? "border border-hairline bg-surface-raised text-foreground"
                  : "ember-gradient text-background"
              }`}
            >
              <span aria-live="polite" className="block text-balance leading-tight">
                {missingGroups.length > 0
                  ? `Choisir\u00a0: ${missingGroups[0].name}`
                  : `Ajouter · ${priceLabel}`}
              </span>
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { cartLineKey, plainLine, useCart, type CartChoice } from "@/lib/menu/cart";
import {
  addVerb,
  formatPrice,
  keepVisible,
  lineName,
  sheetDescription,
  visibleGroups,
} from "@/lib/menu/format";
import { scrollBehavior } from "@/lib/menu/scroll";
import {
  hasBlockedRequiredGroup,
  isChoiceAvailable,
  type MenuItem,
  type OptionGroup,
} from "@/lib/menu-data";
import { SheetPairings, useSheetPairings } from "./chef-pairings";
import { keepHyphenated } from "./keep-hyphenated";
import { Sheet } from "./sheet";

export function isUnavailable(item: MenuItem): boolean {
  return (
    item.disponible === false ||
    item.stock === 0 ||
    hasBlockedRequiredGroup(item.options)
  );
}

/** Durée du « Ajouté ✓ » sur le bouton, avant retour au libellé normal. */
const ADDED_FLASH_MS = 1200;

const choiceRow =
  "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors";

const choiceRowClass = (checked: boolean) =>
  `choice-row ${choiceRow} ${checked ? "is-checked border-ember-2/60 bg-surface-raised" : "border-hairline"}`;

/** Une ligne de choix : le bouton, son libellé, son supplément. */
export function ChoiceRow({
  type,
  name,
  checked,
  onChange,
  supplement = 0,
  price,
  wasPrice,
  describedBy,
  invalid,
  soldOut,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: () => void;
  supplement?: number;
  /** Prix entier du format choisi, affiché à la place du supplément. */
  price?: number;
  /** Prix du format hors tarif planifié, barré à côté de `price`. */
  wasPrice?: number;
  describedBy?: string;
  /** Le groupe obligatoire est resté vide après l'appui sur un bouton incomplet. */
  invalid?: boolean;
  /** Épuisé : visible mais pas sélectionnable, le prix laisse place au mot. */
  soldOut?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={`${choiceRowClass(checked)} ${
        soldOut ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      <span className="flex items-center gap-2.5">
        <input
          type={type}
          name={name}
          checked={checked}
          onChange={onChange}
          disabled={soldOut}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className="accent-ember-2"
        />
        <span className={soldOut ? "line-through" : undefined}>{children}</span>
      </span>
      {soldOut ? (
        <span className="text-muted">Épuisé</span>
      ) : price !== undefined ? (
        <span className="text-muted">
          {wasPrice !== undefined && wasPrice > price && (
            <span className="mr-1.5 text-faint line-through">{formatPrice(wasPrice)}</span>
          )}
          {formatPrice(price)}
        </span>
      ) : (
        supplement > 0 && <span className="text-muted">+{formatPrice(supplement)}</span>
      )}
    </label>
  );
}

/**
 * Les choix d'un groupe d'options — feuille d'un plat, questions d'un plat
 * de formule. Facultatif à choix unique, il commence par « Aucun » : l'état
 * par défaut, et le seul moyen de revenir en arrière (un radio coché ne se
 * décoche pas).
 */
export function GroupChoices({
  group,
  name,
  chosen,
  onToggle,
  onClear,
  invalid,
  basePrice,
}: {
  group: OptionGroup;
  name: string;
  chosen: string[];
  onToggle: (choiceId: string) => void;
  onClear: () => void;
  invalid?: boolean;
  /** Prix de l'article hors ce groupe : un groupe de formats l'ajoute à chaque choix. */
  basePrice?: number;
}) {
  const formatPrices = group.formats && basePrice !== undefined;
  return (
    <>
      {!group.obligatoire && !group.multiple && (
        <ChoiceRow type="radio" name={name} checked={chosen.length === 0} onChange={onClear}>
          {group.aucun ?? "Aucun"}
        </ChoiceRow>
      )}
      {group.choices.map((choice) => (
        <ChoiceRow
          key={choice.id}
          type={group.multiple ? "checkbox" : "radio"}
          name={name}
          checked={chosen.includes(choice.id)}
          onChange={() => onToggle(choice.id)}
          supplement={choice.supplement}
          price={formatPrices ? basePrice + choice.supplement : undefined}
          wasPrice={formatPrices ? choice.tarif?.basePrice : undefined}
          invalid={invalid}
          soldOut={!isChoiceAvailable(choice)}
        >
          {choice.name}
        </ChoiceRow>
      ))}
    </>
  );
}

/**
 * L'étiquette d'un groupe à côté de son nom : « · Facultatif », « · 1 au
 * choix » (« · Au choix » s'il en prend plusieurs), puis une coche une fois
 * choisi — comme le dit le panneau d'un comptoir. Une étiquette et non un
 * adjectif : « Sauce facultatif » ne s'accordait pas. Feuille d'un plat et
 * formules.
 */
export function ChoiceTag({
  required,
  multiple,
  done,
}: {
  required: boolean;
  multiple?: boolean;
  done: boolean;
}) {
  // Le point à égale distance du nom (gap-2 de la légende) et de l'étiquette.
  const dot = (
    <span aria-hidden className="mr-2">
      ·
    </span>
  );
  if (!required) {
    return (
      <span className="text-xs font-medium text-muted">
        {dot}Facultatif
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-ember-2">
      {done ? (
        <>
          <span aria-hidden>✓</span>
          <span className="sr-only">(choix fait)</span>
        </>
      ) : (
        <>
          {dot}
          {multiple ? "Au choix" : "1 au choix"}
          <span className="sr-only">, obligatoire</span>
        </>
      )}
    </span>
  );
}

/**
 * Sous le titre d'une feuille à composer, ce qui est choisi et, estompé, ce
 * qui attend encore. Sur toute la largeur : dans la colonne du titre, le
 * premier choix faisait passer la ligne à deux et descendre les options sous
 * le doigt.
 */
export function ChoiceRecap({
  parts,
  className = "",
}: {
  parts: { id: string; text: string; done: boolean }[];
  className?: string;
}) {
  return (
    <p className={className ? `text-xs text-muted ${className}` : "text-xs text-muted"}>
      {parts.map((part, i) => (
        <Fragment key={part.id}>
          {i > 0 && "\u00a0· "}
          <span className={part.done ? "text-foreground" : undefined}>
            {keepHyphenated(part.text)}
          </span>
        </Fragment>
      ))}
    </p>
  );
}

/**
 * Un groupe obligatoire à choix unique (options d'un plat, étape d'une
 * formule) s'annonce « obligatoire ». Pas `required` sur ses boutons radio :
 * Chrome les déclarait tous invalides dès l'ouverture de la feuille.
 */
export const requiredGroup = (group: { obligatoire: boolean; multiple?: boolean }) =>
  group.obligatoire && !group.multiple
    ? ({ role: "radiogroup", "aria-required": true } as const)
    : {};

/*
 * Pied des feuilles : Annuler et la validation, resserrés ensemble sous
 * 400 px pour laisser au libellé « Choisir : … » sa place. La validation y
 * garde deux lignes de haut : passée d'un libellé sur deux lignes à
 * « Ajouter · 15,00 € », elle raccourcissait la feuille, qui descendait sous
 * le doigt.
 */
export const sheetCancelClass =
  "min-h-11 rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold max-[399px]:px-3.5 max-[399px]:text-[13px]";

export const sheetConfirmClass = (ready: boolean) =>
  `min-h-11 min-w-0 flex-1 rounded-full px-5 py-2.5 text-sm font-semibold max-[399px]:min-h-14 max-[399px]:px-3 max-[399px]:text-[13px] ${
    ready ? "ember-gradient text-background" : "border border-hairline bg-surface-raised text-foreground"
  }`;

/** Choix manquant signalé ; n alterne deux animations identiques pour la rejouer à chaque toucher. */
export type Flash = { key: string; n: number } | null;

/**
 * L'enveloppe d'un groupe qu'on peut signaler. Le surlignage est sur elle :
 * peint sur le fieldset, il partait du milieu de sa légende. -m-2 p-2 : le
 * cerne passe à distance du texte sans rien déplacer ; scroll-mt-3 + p-2 :
 * le défilement s'arrête à la marge intérieure de la feuille.
 */
export const pickFrameClass = (flash: Flash, key: string) =>
  `-m-2 scroll-mt-3 p-2 ${
    flash?.key === key ? (flash.n % 2 ? "group-flash-a" : "group-flash-b") : ""
  }`;

/**
 * Il manque un choix : on emmène le client dessus plutôt que de lui présenter
 * un bouton mort loin du groupe concerné. Sans preventScroll, le focus
 * referait son propre défilement et annulerait le premier ; au doigt, le
 * focus ne se voit pas, d'où le surlignage.
 */
export function revealMissing(
  field: HTMLElement | null | undefined,
  key: string,
  setFlash: Dispatch<SetStateAction<Flash>>
) {
  field?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  field?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  setFlash((current) => ({ key, n: (current?.n ?? 0) + 1 }));
}

/*
 * La barre du panier apparaît en bas de l'écran, souvent pile sous le pouce
 * qui vient d'ajouter : le toucher suivant l'ouvrait au lieu d'ajouter une
 * seconde portion. La page remonte juste assez pour dégager le bouton — la
 * marge est celle qui entoure la barre, lue dans sa mise en page.
 */
export function revealAboveCartBar(button: HTMLElement | null) {
  requestAnimationFrame(() => {
    const bar = document.querySelector<HTMLElement>(".cart-bar");
    if (!button?.isConnected || !bar?.parentElement) return;
    const gap = parseFloat(getComputedStyle(bar.parentElement).paddingTop);
    // La place de la barre dans sa mise en page (offsetTop), pas celle de son
    // entrée animée : un thème la fait monter du bas de l'écran.
    const barTop = bar.parentElement.getBoundingClientRect().top + bar.offsetTop;
    const overlap = button.getBoundingClientRect().bottom + gap - barTop;
    if (overlap > 0) window.scrollBy({ top: overlap, behavior: scrollBehavior() });
  });
}

/** « Sans salade, tomate » plutôt que « Sans salade, Sans tomate » : un premier mot commun ne se répète pas. */
function shared(names: string[]): string {
  const first = names[0].split(" ")[0];
  const prefix = `${first} `;
  return names.length > 1 && names.every((name) => name.startsWith(prefix) && name.length > prefix.length)
    ? `${names[0]}, ${names.slice(1).map((name) => name.slice(prefix.length)).join(", ")}`
    : names.join(", ");
}

/** Bouton « + Ajouter ». Ouvre la modale d'options si l'article en a. */
export function AddToOrder({ item }: { item: MenuItem }) {
  const { orderingEnabled, canOrder, addLine, track, lines, closed, closedAt, collect } =
    useCart();
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

  // Épuisé, ou coupé par une fermeture (la cuisine ne sert plus) : le plat
  // reste à la carte, sans bouton. En click & collect, la fermeture se juge à
  // l'heure de retrait, que le panier connaît seul.
  if (isUnavailable(item) || (!collect && closed.has(item.id))) {
    return (
      <span
        className={`shrink-0 rounded-full border border-hairline px-4 py-2 text-xs font-semibold ${
          isUnavailable(item) ? "text-faint" : "text-muted"
        }`}
      >
        {isUnavailable(item) ? "Indisponible" : "Plus servi"}
      </span>
    );
  }

  if (!canOrder) {
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

  const groups = item.options ?? [];
  const hasOptions = groups.length > 0;
  const verb = addVerb(item);
  const label = verb === "Ajouter" ? "+ Ajouter" : verb;
  // Combien de ce plat sont déjà au panier, toutes options confondues : le
  // « Ajouté ✓ » s'efface, le compte reste sur la carte.
  const inCart = lines
    .filter((line) => line.itemId === item.id)
    .reduce((sum, line) => sum + line.quantity, 0);

  const addPlain = () => {
    addLine(plainLine(item));
    // « panier » implique « plat » : l'étape ne recule pas, un seul envoi suffit.
    track("panier", { items: [item.id] });
    flashAdded();
    revealAboveCartBar(buttonRef.current);
  };

  return (
    <>
      {/* Click & collect : coupé à l'heure jugée, le plat reste ajoutable — un
          retrait plus tard ou un autre jour le servira. */}
      {collect && closed.has(item.id) && (
        <span className="mr-3 self-center text-xs text-muted">
          {closedAt
            ? "Plus servi à l’heure choisie"
            : "Plus servi maintenant · possible pour un retrait plus tard"}
        </span>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          // Second toucher d'un double-tap : un seul ajout, une seule feuille.
          if (event.detail > 1) return;
          if (!hasOptions) return addPlain();
          track("plat", { items: [item.id] });
          // Safari ne donne pas le focus au bouton touché : la feuille le
          // retrouve en se refermant, et le lecteur d'écran sa place.
          event.currentTarget.focus({ preventScroll: true });
          setModalOpen(true);
        }}
        aria-haspopup={hasOptions ? "dialog" : undefined}
        // Repères pour l'habillage d'un établissement (le « Ajouté ✓ » et le
        // compte au panier, plus bas) : un thème dont le bouton n'est qu'un
        // « + » y montre sa coche (globals.css).
        data-added={added || undefined}
        // Onze « + Ajouter » identiques ne disent rien à un lecteur d'écran.
        aria-label={`${added ? "Ajouté" : verb}\u00a0: ${lineName(item)}${
          inCart > 0 ? `, ${inCart} au panier` : ""
        }`}
        className="ember-gradient min-h-11 shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-background transition-transform active:scale-95"
      >
        {added ? "Ajouté ✓" : label}
        {/* Le compte au panier, en pastille au coin de la carte (la carte
            est le repère) : dans le bouton, il le faisait passer à la ligne.
            Une pastille neuve à chaque compte : un thème la fait sauter. */}
        {inCart > 0 && (
          <span
            key={inCart}
            data-in-cart={inCart}
            className="cart-count absolute right-2 top-2 z-10 flex min-w-7 items-center justify-center rounded-full bg-foreground px-2 py-1 text-xs font-bold text-background shadow-lg"
          >
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
  // Un plat offert se compose seul : ses accords se paieraient en euros.
  const sheetPairings = useSheetPairings(item.id);
  const pairings = reward ? [] : sheetPairings;
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const pickedPairings = pairings.filter(({ item: other }) => picked.has(other.id));
  // Groupe manquant signalé au toucher du bouton qui le nomme.
  const [flash, setFlash] = useState<Flash>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Dernier geste au doigt ou à la souris (et non au clavier) : seul lui fait
  // défiler la feuille vers le groupe suivant — au clavier, le focus resterait
  // sur un groupe parti hors de vue.
  const pointer = useRef(false);
  const autoScrolling = useRef(false);
  const titleId = useId();

  // Les groupes à condition (la cuisson, quand le menu prend le steak)
  // n'existent qu'une fois leur choix fait : `selected` ne garde que les
  // choix des groupes montrés (keepVisible).
  const shown = visibleGroups(groups, selected);
  const chosen = (groupId: string) => selected[groupId] ?? [];
  const missingGroups = shown.filter(
    (group) => group.obligatoire && chosen(group.id).length === 0
  );
  /* Un choix posé, même optionnel : fermer par le fond le perdrait sans
     prévenir, sur une feuille qui ne couvre parfois que la moitié de l'écran. */
  const touched = Object.values(selected).some((ids) => ids.length > 0);
  const description = sheetDescription(item);

  const toggle = (group: OptionGroup, choiceId: string) => {
    // Choisi : le groupe n'a plus à être signalé (surlignage fixe en
    // mouvement réduit).
    setFlash((current) => (current?.key === group.id ? null : current));
    const previous = chosen(group.id);
    const nextSelected = keepVisible(groups, {
      ...selected,
      [group.id]: !group.multiple
        ? [choiceId]
        : previous.includes(choiceId)
          ? previous.filter((id) => id !== choiceId)
          : [...previous, choiceId],
    });
    const nextShown = visibleGroups(groups, nextSelected);
    // Premier choix d'un groupe obligatoire à choix unique, ou choix qui
    // fait paraître un groupe : la feuille descend d'elle-même au groupe qui
    // vient de paraître, sinon au prochain qui attend — jamais à un groupe
    // laissé plus haut (choisir le steak menait à l'entrée oubliée, pas à
    // sa cuisson).
    const revealed = nextShown.filter((other) => !shown.includes(other));
    if (
      pointer.current &&
      ((group.obligatoire && !group.multiple && previous.length === 0) || revealed.length > 0)
    ) {
      const waiting = (other: OptionGroup) =>
        other.obligatoire && !nextSelected[other.id]?.length;
      const next =
        revealed.find(waiting) ??
        nextShown.slice(nextShown.indexOf(group) + 1).find(waiting);
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
    setSelected(nextSelected);
  };

  const groupSupplement = (group: OptionGroup) =>
    group.choices
      .filter((choice) => chosen(group.id).includes(choice.id))
      .reduce((sum, choice) => sum + choice.supplement, 0);
  const supplement = shown.reduce((sum, group) => sum + groupSupplement(group), 0);
  const unitPrice = reward ? supplement : item.price + supplement;
  // Offert : le prix se dit en points, plus les suppléments éventuels. Format
  // pas encore choisi : le prix est celui du plus petit, comme sur la fiche.
  const fromPrice = shown.some((group) => group.formats && chosen(group.id).length === 0);
  const priceLabel = reward
    ? `${reward.points}\u00a0pts${unitPrice > 0 ? ` + ${formatPrice(unitPrice)}` : ""}`
    : `${fromPrice ? "dès\u00a0" : ""}${formatPrice(unitPrice)}`;

  // Le bouton dit ce qui part avec le plat : ses accords cochés compris.
  const confirmLabel =
    pickedPairings.length > 0
      ? `Ajouter ${pickedPairings.length + 1} articles · ${fromPrice ? "dès\u00a0" : ""}${formatPrice(
          unitPrice + pickedPairings.reduce((sum, { item: other }) => sum + other.price, 0)
        )}`
      : `Ajouter · ${priceLabel}`;

  /* Un menu à composer : ce qui est choisi, et le nom des groupes qui
     attendent encore — au moment de valider, le premier choix est loin
     au-dessus. Les groupes facultatifs n'y figurent pas : jamais manquants,
     et le prix dit déjà leurs suppléments — chaque case cochée allongeait
     la ligne et faisait descendre les options sous le doigt. */
  const recap =
    shown.length > 1
      ? shown.flatMap((group) => {
          if (!group.obligatoire) return [];
          const names = group.choices
            .filter((choice) => chosen(group.id).includes(choice.id))
            .map((choice) => choice.name);
          return [
            names.length > 0
              ? { id: group.id, text: shared(names), done: true }
              : { id: group.id, text: group.name, done: false },
          ];
        })
      : [];

  const confirm = (close: () => void) => {
    if (missingGroups.length > 0) {
      const id = missingGroups[0].id;
      revealMissing(
        bodyRef.current?.querySelector<HTMLElement>(`[data-group="${id}"]`),
        id,
        setFlash
      );
      return;
    }
    const choices: CartChoice[] = [];
    const optionSummary: string[] = [];
    for (const group of shown) {
      for (const choice of group.choices) {
        if (!chosen(group.id).includes(choice.id)) continue;
        choices.push({ group_id: group.id, choice_id: choice.id });
        // Un nom déjà entre parenthèses (« … (épicé) ») y range son supplément,
        // « (épicé, +1,00 €) » : deux parenthèses de suite se lisaient mal, et
        // un point médian se confondait avec celui qui sépare les choix.
        const supplement = `+${formatPrice(choice.supplement)}`;
        optionSummary.push(
          choice.supplement > 0 && !(group.formats && !reward)
            ? choice.name.endsWith(")")
              ? `${choice.name.slice(0, -1)},\u00a0${supplement})`
              : `${choice.name} (${supplement})`
            : choice.name
        );
      }
    }
    addLine({
      key: cartLineKey(item.id, choices, reward?.id),
      itemId: item.id,
      name: lineName(item),
      detail: item.detail,
      unitPrice,
      optionSummary,
      choices,
      stock: item.stock,
      noticeHours: item.noticeHours,
      reward,
    });
    for (const { item: other, choices } of pickedPairings) addLine(plainLine(other, "fiche", choices));
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
                data-compose={shown.length > 1 || undefined}
                className="font-display text-xl font-medium"
              >
                {/* Le format en petit, comme sur la fiche : « x4 », « pour 2 » ; l'espace
                    insécable le garde avec le dernier mot. */}
                {item.detail ? `${item.name}\u00a0` : item.name}
                {item.detail && (
                  <span className="sheet-detail whitespace-nowrap align-middle text-sm font-normal text-muted">
                    {item.detail}
                  </span>
                )}
              </h3>
              <span className="dish-price shrink-0 font-display text-lg text-ember-1">
                {priceLabel}
              </span>
            </div>
            {/* Seul, le récapitulatif répétait le nom du groupe juste
                dessous (« Viande » sur « Viande ») : il ne sert qu'à
                plusieurs choix. */}
            {recap.length > 1 && <ChoiceRecap parts={recap} className="mt-1.5" />}
            {item.noticeHours && (
              <p className="mt-1.5 text-xs font-semibold text-ember-2">
                À commander {item.noticeHours}&nbsp;h à l&apos;avance
              </p>
            )}
          </div>
          <div
            ref={bodyRef}
            // relative : les textes masqués (« choix fait ») se placent dans la
            // liste — hors d'elle, ils faisaient défiler la feuille entière,
            // titre compris.
            className="relative flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5"
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
            {/* Ce que contient le plat, relu au moment de le composer ; il
                défile avec les choix pour laisser le titre seul épinglé.
                Caché sauf là où un thème le montre (.sheet-description,
                globals.css) : ailleurs, un long menu repoussait ses choix. */}
            {description && (
              <p className="sheet-description mb-5 hidden whitespace-pre-line text-sm leading-relaxed text-muted">
                {keepHyphenated(description)}
              </p>
            )}
            <div className="flex flex-col gap-6">
              {shown.map((group) => (
                <div
                  key={group.id}
                  data-group={group.id}
                  className={pickFrameClass(flash, group.id)}
                >
                  <fieldset
                    data-required={group.obligatoire || undefined}
                    {...requiredGroup(group)}
                  >
                    <legend className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
                      {group.name}{" "}
                      <ChoiceTag
                        required={group.obligatoire}
                        multiple={group.multiple}
                        done={chosen(group.id).length > 0}
                      />
                    </legend>
                    <div className="flex flex-col gap-2">
                      <GroupChoices
                        group={group}
                        name={group.id}
                        chosen={chosen(group.id)}
                        // Le prix de la commande hors ce groupe : un format se lit
                        // avec les autres suppléments déjà choisis.
                        basePrice={reward ? undefined : unitPrice - groupSupplement(group)}
                        onToggle={(choiceId) => toggle(group, choiceId)}
                        invalid={flash?.key === group.id && chosen(group.id).length === 0}
                        onClear={() =>
                          setSelected((current) =>
                            keepVisible(groups, { ...current, [group.id]: [] })
                          )
                        }
                      />
                    </div>
                  </fieldset>
                </div>
              ))}
            </div>
          </div>

          {/* Épinglée : les options d'un tacos 3 viandes défilent sur plus de
              1 600 px, le bouton ne doit pas partir avec elles. */}
          <div className="flex flex-col gap-4 border-t border-hairline bg-surface px-6 py-4">
            {pairings.length > 0 && (
              <SheetPairings
                pairings={pairings}
                picked={picked}
                onToggle={(id) =>
                  setPicked((current) => {
                    const next = new Set(current);
                    if (!next.delete(id)) next.add(id);
                    return next;
                  })
                }
              />
            )}
            <div className="flex items-center gap-3">
              <button type="button" onClick={close} className={sheetCancelClass}>
                Annuler
              </button>
              <button
                type="button"
                onClick={() => confirm(close)}
                // Incomplet, il reste actif — il emmène au groupe qui manque — et
                // lisible : pas d'estompage, un aplat neutre.
                className={sheetConfirmClass(missingGroups.length === 0)}
              >
                <span aria-live="polite" className="block text-balance leading-tight">
                  {missingGroups.length > 0
                    ? `Choisir\u00a0: ${missingGroups[0].name}`
                    : confirmLabel}
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}

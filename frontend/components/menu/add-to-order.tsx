"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react";
import { cartLineKey, itemCount, useCart, type CartChoice } from "@/lib/menu/cart";
import {
  formatPrice,
  stockSrcSet,
  typographie,
  typographieNom,
  type MenuItem,
  type OptionGroup,
} from "@/lib/menu-data";
import { Sheet } from "./sheet";

export function isUnavailable(item: MenuItem): boolean {
  return item.disponible === false || item.stock === 0;
}

/** Durée du « Ajouté ✓ » sur le bouton, avant retour au libellé normal. */
export const ADDED_FLASH_MS = 1200;

const choiceRow =
  "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors";

export const choiceRowClass = (checked: boolean) =>
  `choice-row ${choiceRow} ${checked ? "is-checked border-ember-2/60 bg-surface-raised" : "border-hairline"}`;

/** Défilement doux, sauf si le client a demandé moins de mouvement. */
export const scrollBehavior = (): ScrollBehavior =>
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

/** Événement posé sur l'article d'un plat quand sa feuille photo l'a ajouté. */
const DISH_ADDED = "menu-dish-added";

/**
 * Une feuille à composer descend d'elle-même au prochain choix qui attend
 * (advanceTo, avec le sélecteur de son bloc). Au doigt ou à la souris
 * seulement : au clavier, le focus resterait sur un groupe parti hors de
 * vue. Là seulement où la fin du glissement se signale (scrollend) : sans
 * elle, pas moyen de savoir quand les touchers redeviennent sûrs — pendant le
 * glissement, un toucher tomberait sur une option arrivée sous le doigt, il
 * est ignoré (bodyProps, sur le corps qui défile).
 */
export function useGuidedScroll(bodyRef: RefObject<HTMLElement | null>) {
  const pointer = useRef(false);
  const autoScrolling = useRef(false);

  const advanceTo = (selector: string) => {
    const body = bodyRef.current;
    if (!pointer.current || !body || !("onscrollend" in body)) return;
    requestAnimationFrame(() => {
      const target = body.querySelector<HTMLElement>(selector);
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
  };

  const bodyProps = {
    onPointerDown: () => {
      pointer.current = true;
    },
    onKeyDown: () => {
      pointer.current = false;
    },
    onClickCapture: (event: MouseEvent) => {
      if (!autoScrolling.current) return;
      event.preventDefault();
      event.stopPropagation();
    },
  };

  return { advanceTo, bodyProps };
}

/** Nom de la ligne du panier : avec son format, « Pilons x3 », « Boisson 33 cl ». */
export const lineName = (item: MenuItem) =>
  typographieNom(item.detail ? `${item.name} ${item.detail}` : item.name);

/** Bouton « + Ajouter ». Ouvre la modale d'options si l'article en a. */
export function AddToOrder({ item }: { item: MenuItem }) {
  const { orderingEnabled, canOrder, addLine, track, lines } = useCart();
  const [modalOpen, setModalOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // La feuille a-t-elle ajouté ? Fermée sans rien (Annuler, Échap, fond,
  // Retour), elle ne doit pas faire bouger la page.
  const addedFromSheet = useRef(false);

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

  // Un ajout fait depuis la feuille de la photo (DishPhotoOpener) dit aussi
  // « Ajouté ✓ » ici : le même retour que depuis ce bouton.
  useEffect(() => {
    const article = buttonRef.current?.closest("article");
    if (!canOrder || !article) return;
    article.addEventListener(DISH_ADDED, flashAdded);
    return () => article.removeEventListener(DISH_ADDED, flashAdded);
  }, [canOrder, flashAdded]);

  if (!orderingEnabled) return null;

  if (isUnavailable(item)) {
    return (
      <span className="shrink-0 rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-faint">
        Indisponible
      </span>
    );
  }

  // Carte ouverte sans QR code : elle se lit seulement, la page dit une fois
  // comment commander (voir /m/[slug]) plutôt que d'aligner des boutons morts.
  if (!canOrder) return null;

  const hasOptions = (item.options?.length ?? 0) > 0;
  // Le verbe dit ce qui attend : rien d'obligatoire (des suppléments au
  // choix), on ajoute ; un choix à faire, on choisit ; plusieurs, on compose.
  const required = item.options?.filter((group) => group.obligatoire).length ?? 0;
  const verb = required > 1 ? "Composer" : required === 1 ? "Choisir" : "Ajouter";
  const label = verb === "Ajouter" ? "+ Ajouter" : verb;
  // Combien de ce plat sont déjà au panier, toutes options confondues : le
  // « Ajouté ✓ » s'efface, le compte reste sur la carte.
  const inCart = itemCount(lines, item.id);

  // Stock atteint : le panier n'en prendrait pas un de plus (addLine plafonne
  // en silence) — le bouton le dit au lieu d'annoncer « Ajouté ✓ ». Il reste
  // le même bouton (aria-disabled), pour que le focus clavier ne tombe pas.
  const atMax = item.stock != null && inCart >= item.stock;

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
          if (event.detail > 1 || atMax) return;
          // Safari ne donne pas le focus au bouton touché : la feuille le
          // rendrait sinon à ce qui l'avait avant (voir Sheet).
          event.currentTarget.focus({ preventScroll: true });
          if (!hasOptions) return addPlain();
          track("plat", { items: [item.id] });
          setModalOpen(true);
        }}
        // Onze « + Ajouter » identiques ne disent rien à un lecteur d'écran.
        // « Ajouté » d'abord : l'ajout qui atteint le plafond (la seule chicha
        // en stock) se confirme aussi, « Maximum » vient après.
        aria-label={`${added ? "Ajouté" : atMax ? "Maximum atteint" : verb}\u00a0: ${lineName(item)}${
          inCart > 0 ? `, ${inCart} au panier` : ""
        }`}
        aria-disabled={atMax || undefined}
        aria-haspopup={hasOptions && !atMax ? "dialog" : undefined}
        className={`min-h-11 shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-transform ${
          atMax
            ? "border border-hairline text-muted"
            : "ember-gradient text-background motion-safe:active:scale-95"
        }`}
      >
        {added ? (
          "Ajouté ✓"
        ) : atMax ? (
          <>
            Maximum<span className="add-max-rest"> au panier</span>
          </>
        ) : (
          label
        )}
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
            if (addedFromSheet.current) revealAboveCartBar(buttonRef.current);
            addedFromSheet.current = false;
          }}
          onAdded={() => {
            addedFromSheet.current = true;
            flashAdded();
          }}
        />
      )}
    </>
  );
}

/**
 * La photo d'un plat se touche : elle ouvre sa feuille, où elle s'affiche en
 * grand (sur la carte, ce n'est qu'une vignette). Un calque sur la photo,
 * hors tabulation : un agrandissement pour l'œil, le plat se commande au
 * clavier par son bouton. Sans QR code, la feuille se regarde seulement.
 */
export function DishPhotoOpener({ item }: { item: MenuItem }) {
  const { canOrder, track, lines } = useCart();
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLButtonElement>(null);
  // Le même plafond que le bouton du plat : sans lui, la feuille ouverte par
  // la photo « ajoutait » un article que le panier refusait en silence.
  const atMax = item.stock != null && itemCount(lines, item.id) >= item.stock;
  return (
    <>
      <button
        ref={overlayRef}
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={(event) => {
          if (event.detail > 1) return;
          // La feuille rendra le focus au bouton du plat (le calque est
          // masqué aux lecteurs d'écran) ; sans lui, à la section à l'écran.
          const order = event.currentTarget
            .closest("article")
            ?.querySelector<HTMLElement>(".dish-action > button");
          if (order) order.focus({ preventScroll: true });
          else (document.activeElement as HTMLElement | null)?.blur();
          track("plat", { items: [item.id] });
          setOpen(true);
        }}
        className="dish-photo-open absolute inset-0 cursor-zoom-in"
      />
      {open && (
        <OptionsModal
          item={item}
          readOnly={!canOrder || isUnavailable(item)}
          atMax={atMax}
          onClose={() => setOpen(false)}
          onAdded={() =>
            overlayRef.current?.closest("article")?.dispatchEvent(new Event(DISH_ADDED))
          }
        />
      )}
    </>
  );
}

/**
 * La photo en tête de la feuille d'un plat, dans un cadre 16:10 plafonné (en
 * paysage, elle cachait le premier choix). Une photo en largeur le remplit ;
 * en hauteur ou carrée — une chicha, une planche vue de haut —, rognée, elle
 * perdait son sujet : elle y tient entière, sur sa propre copie floutée,
 * comme l'affiche sur tablette. Invisible jusqu'à ce que sa forme soit connue.
 */
function SheetPhoto({ src }: { src: string }) {
  const [shape, setShape] = useState<{ tall: boolean; url: string } | null>(null);
  const measure = (img: HTMLImageElement) =>
    setShape({ tall: img.naturalHeight >= img.naturalWidth, url: img.currentSrc || img.src });
  return (
    <div className="relative aspect-[16/10] max-h-[40dvh] w-full overflow-hidden rounded-2xl bg-surface-raised">
      {shape?.tall && (
        <div
          aria-hidden
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-80 blur-2xl brightness-75 saturate-125"
          style={{ backgroundImage: `url(${shape.url})` }}
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- URL saisie par l'utilisateur, hors remotePatterns de next/image */}
      <img
        // Déjà en cache, l'image peut être chargée avant l'écoute de onLoad.
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0 && !shape) measure(img);
        }}
        src={src}
        srcSet={stockSrcSet(src, [640, 960])}
        sizes="min(28rem, 100vw)"
        alt=""
        onLoad={(event) => measure(event.currentTarget)}
        className={`relative size-full transition-opacity duration-300 ${
          shape ? "opacity-100" : "opacity-0"
        } ${shape?.tall ? "object-contain" : "object-cover"}`}
      />
    </div>
  );
}

/**
 * Feuille des options d'un article. Avec `reward`, l'article est offert par
 * un palier de fidélité : il se paie en points, ses suppléments en euros.
 */
export function OptionsModal({
  item,
  reward,
  readOnly,
  atMax,
  onClose,
  onAdded,
}: {
  item: MenuItem;
  reward?: { id: string; points: number };
  /** Le plat se regarde seulement (sans QR code, indisponible) : pas d'ajout. */
  readOnly?: boolean;
  /** Stock atteint au panier : la validation le dit au lieu d'ajouter. */
  atMax?: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { addLine, track, orderingEnabled, canOrder } = useCart();
  const groups = item.options ?? [];
  // En lecture seule, la raison, à côté de « Fermer ».
  const readOnlyHint = !readOnly
    ? null
    : isUnavailable(item)
      ? "Indisponible pour le moment."
      : orderingEnabled && !canOrder
        ? "Sur place, scannez le QR code de votre table pour commander."
        : null;
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  // Groupe manquant signalé au toucher du bouton grisé ; n alterne deux
  // animations identiques pour la rejouer à chaque toucher.
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { advanceTo, bodyProps } = useGuidedScroll(bodyRef);
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
    if (group.obligatoire && !group.multiple && chosen(group.id).length === 0) {
      const next = groups.find(
        (other) =>
          other.id !== group.id &&
          other.obligatoire &&
          chosen(other.id).length === 0
      );
      if (next) advanceTo(`[data-group="${next.id}"]`);
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
    ? `Offert · ${reward.points}\u00a0pts${unitPrice > 0 ? ` + ${formatPrice(unitPrice)}` : ""}`
    : formatPrice(unitPrice);

  /* Un menu à composer : ce qui est déjà choisi, sous le titre — au moment
     de valider, le premier choix est loin au-dessus. Un même nom dans deux
     groupes (Caramel en nappage et en coulis) garde son groupe. Avant tout
     choix, ce qu'il reste à faire. */
  const picked = groups.flatMap((group) =>
    group.choices
      .filter((choice) => chosen(group.id).includes(choice.id))
      .map((choice) => ({ group: group.name, name: choice.name }))
  );
  const recap =
    picked.length > 0
      ? picked.map(({ group, name }) =>
          picked.filter((other) => other.name === name).length > 1
            ? `${group}\u00a0: ${name}`
            : name
        )
      : [
          missingGroups.length > 0
            ? `${missingGroups.length} choix à faire`
            : "Tout est facultatif",
        ];

  const confirm = (close: () => void) => {
    if (atMax) return;
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
        // Plusieurs groupes : chaque choix dit le sien (« Coulis : Caramel »),
        // au panier comme sur le ticket qu'on relit à table.
        // Sauf si le choix le dit déjà (« Chantilly supplémentaire »).
        const name =
          groups.length > 1 && !choice.name.startsWith(group.name)
            ? `${group.name}\u00a0: ${choice.name}`
            : choice.name;
        optionSummary.push(
          choice.supplement > 0
            ? `${name} (+${formatPrice(choice.supplement)})`
            : name
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
            {/* Sur toute la largeur, une seule ligne réservée d'avance :
                l'en-tête ne grandit pas en cours de choix, et les options ne
                glissent pas sous le doigt. */}
            {groups.length > 1 && !readOnly && (
              <p
                className={`mt-1.5 line-clamp-2 min-h-[2lh] text-xs ${picked.length > 0 ? "text-foreground" : "text-muted"}`}
              >
                {recap.map((part, i) => (
                  // Le « · » reste avec le choix qui le précède : une ligne
                  // ne commence jamais par lui.
                  <span key={i} className="inline-block">
                    {part}
                    {i < recap.length - 1 && "\u00a0·\u00a0"}
                  </span>
                ))}
              </p>
            )}
          </div>
          {/* relative : le bloc conteneur des « , choix fait » réservés aux
              lecteurs d'écran (sr-only, donc absolus). Sans lui, ils se
              posaient sous la feuille et la rendaient défilable tout entière :
              l'en-tête glissait hors de l'écran. */}
          <div
            ref={bodyRef}
            className="relative flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5"
            {...bodyProps}
          >
            {/* La photo en grand et la description, en tête de ce qui défile :
                sur la carte, une vignette de 112 px ; ici, le plat se regarde,
                puis s'efface quand on compose. */}
            {(item.image || item.description) && (
              <div className="mb-6 flex flex-col gap-3">
                {item.image && (
                  <SheetPhoto src={item.image} />
                )}
                {item.description && (
                  <p className="text-sm leading-relaxed text-muted">
                    {typographie(item.description)}
                  </p>
                )}
              </div>
            )}
            {readOnly ? (
              // Rien ne se commande : les choix se lisent comme sur la carte,
              // sans cases à cocher (comme la feuille d'une formule).
              <div className="flex flex-col gap-5">
                {groups.map((group) => (
                  <section key={group.id}>
                    <h4 className="group-title mb-1.5 text-sm font-semibold">{group.name}</h4>
                    <p className="text-sm leading-relaxed text-muted">
                      {group.choices
                        .map((choice) =>
                          choice.supplement > 0
                            ? `${choice.name} (+${formatPrice(choice.supplement)})`
                            : choice.name
                        )
                        .join(" · ")}
                    </p>
                  </section>
                ))}
              </div>
            ) : (
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
                        {group.name}
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
                                  // Dit « obligatoire » aux lecteurs d'écran.
                                  required={group.obligatoire && !group.multiple}
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
            )}
          </div>

          {/* Épinglée : les options d'un tacos 3 viandes défilent sur plus de
              1 600 px, le bouton ne doit pas partir avec elles. */}
          <div className="flex items-center gap-3 border-t border-hairline bg-surface p-4">
            {/* Resserré sous 400 px : le bouton de validation, qui nomme le
                groupe manquant, garde la place de son libellé. */}
            <button
              type="button"
              onClick={close}
              className={`min-h-11 rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold max-[399px]:px-3.5 max-[399px]:text-[13px] ${readOnly && !readOnlyHint ? "flex-1" : ""}`}
            >
              {readOnly || atMax ? "Fermer" : "Annuler"}
            </button>
            {readOnly ? (
              readOnlyHint && <p className="flex-1 text-xs text-muted">{readOnlyHint}</p>
            ) : (
              <button
                type="button"
                onClick={() => confirm(close)}
                aria-disabled={atMax || undefined}
                // Incomplet, il reste actif — il emmène au groupe qui manque — et
                // lisible : pas d'estompage, un aplat neutre.
                className={`min-h-11 min-w-0 flex-1 rounded-full px-5 py-2.5 text-sm font-semibold max-[389px]:px-3 max-[389px]:text-[13px] ${
                  atMax
                    ? "border border-hairline text-muted"
                    : missingGroups.length > 0
                      ? "border border-hairline bg-surface-raised text-foreground"
                      : "ember-gradient text-background"
                }`}
              >
                <span aria-live="polite" className="block text-balance leading-tight">
                  {atMax
                    ? "Maximum au panier"
                    : missingGroups.length > 0
                      ? `Choisir\u00a0: ${missingGroups[0].name}`
                      : `Ajouter · ${priceLabel}`}
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}

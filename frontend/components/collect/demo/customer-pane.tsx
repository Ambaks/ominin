"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { DishIndicators } from "@/components/menu/dish-indicators";
import { COLLECT_DEMO } from "@/lib/collect/demo/data";
import {
  cartTotal,
  demoLine,
  type DemoLine,
  formatSlotTime,
  isNextDay,
  pickupStatus,
  slotSeats,
  useCollectDemo,
} from "@/lib/collect/demo/provider";
import { formatTime } from "@/lib/gestion/format";
import { addVerb, allergenLine, formatPrice, lineName } from "@/lib/menu/format";
import { type MenuItem, type OptionGroup } from "@/lib/menu-data";

/*
 * Volet téléphone de la démo Collect : le parcours de commande dans une
 * version resserrée mais premium — couverture (photo ou logo), rail de
 * catégories collant, cartes de plats, feuille d'options, paiement simulé,
 * suivi animé. Calqué sur la grammaire du vrai collect-experience, jouable
 * en 30 secondes.
 */

/** Défilement doux, sauf si le visiteur a demandé moins de mouvement. */
const scrollBehavior = (): ScrollBehavior =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/** Ramène une pastille au centre du rail si elle en sort (courante, ou atteinte au clavier). */
function revealPill(rail: HTMLElement, pill: HTMLElement) {
  const view = rail.getBoundingClientRect();
  const box = pill.getBoundingClientRect();
  if (box.left >= view.left && box.right <= view.right) return;
  rail.scrollTo({
    left: rail.scrollLeft + box.left - view.left - (view.width - box.width) / 2,
    behavior: scrollBehavior(),
  });
}

/** Horloge de la démo — un tic par seconde tant que monté. */
function useNow(clock: () => number): number {
  // Lue à chaque rendu : quand un geste du restaurant pose l'horloge, le
  // compte à rebours suit tout de suite, sans attendre le tic suivant.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setTick((tick) => tick + 1),
      COLLECT_DEMO.timings.countdownTickMs
    );
    return () => clearInterval(id);
  }, []);
  return clock();
}

/** Les choix d'une ligne, comme le panier de la carte : « Dolsot Beef (+1,00 €) · Coca ». */
const optionSummary = (line: DemoLine) =>
  line.options
    .map((option) =>
      option.supplement > 0
        ? `${option.choiceName} (+${formatPrice(option.supplement)})`
        : option.choiceName
    )
    .join(" · ");

/** Ligne de choix : celle de la carte (choice-row, que les thèmes habillent), resserrée au téléphone. */
const choiceRowClass = (checked: boolean) =>
  `choice-row flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm transition-colors ${
    checked ? "is-checked border-ember-2/60 bg-surface-raised" : "border-hairline"
  }`;

/** Contrôles d'une ligne de plat : ceux des démos livrées, ou ceux d'un vrai
 * téléphone (44 px au toucher ; le compteur, 36 px élargis par before:). */
const ROW_CONTROLS = {
  delivered: { add: "size-8 text-lg", step: "size-6.5 text-sm", count: "w-4" },
  real: {
    add: "size-11 text-xl",
    step: "relative size-9 text-base before:absolute before:-inset-1",
    count: "w-5",
  },
};

function DishRow({
  item,
  quantity,
  pulseAdd,
  onChoose,
}: {
  item: MenuItem;
  quantity: number;
  pulseAdd: boolean;
  /** Ouvre la feuille d'options de l'article. */
  onChoose: (item: MenuItem) => void;
}) {
  const demo = useCollectDemo();
  const groups = item.options ?? [];
  const verb = addVerb(item);
  const add = () =>
    groups.length > 0 ? onChoose(item) : demo.addLine(demoLine(item));
  const real = demo.settings.realPhone;
  const size = ROW_CONTROLS[real ? "real" : "delivered"];
  // Le « + » reste le même élément quand le compteur apparaît : la feuille
  // d'options lui rend le focus en se fermant.
  const controls = (
    <div
      className={
        quantity > 0
          ? "flex shrink-0 items-center gap-1 rounded-full border border-hairline bg-background/60 p-0.5"
          : "contents"
      }
    >
      {quantity > 0 && (
        <button
          type="button"
          onClick={() => demo.removeItem(item.id)}
          aria-label={`Retirer ${lineName(item)}`}
          className={`${size.step} flex items-center justify-center rounded-full text-muted transition-colors hover:text-foreground`}
        >
          −
        </button>
      )}
      {quantity > 0 && (
        <span
          key={quantity}
          className={`pop ${size.count} text-center text-sm font-semibold tabular-nums`}
        >
          {quantity}
        </span>
      )}
      <button
        type="button"
        onClick={add}
        aria-label={`${verb}\u00a0: ${lineName(item)}`}
        className={`ember-gradient flex shrink-0 items-center justify-center rounded-full font-semibold text-background transition-transform active:scale-90 ${
          quantity > 0 ? size.step : `${size.add} ${pulseAdd ? "soft-pulse" : ""}`
        }`}
      >
        +
      </button>
    </div>
  );

  return (
    // demo-dish, demo-dish-name : accroches des formules d'un thème (globals.css).
    <div
      className={`flex items-center gap-3 rounded-2xl border border-hairline bg-surface p-3 transition-colors hover:border-ember-2/40 ${
        real ? "demo-dish" : ""
      }`}
    >
      {item.image && (
        // Des photos en 16:9 dans une vignette carrée : servies pour 114 px de
        // large, elles en couvrent la hauteur sans être agrandies (228 px en 2x).
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
          <Image src={item.image} alt="" fill sizes="114px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        {real ? (
          // La typo de la fiche de la carte : texte de la marque, format et
          // prix par leurs accroches (dish-detail, dish-price), que les thèmes habillent.
          <p className="demo-dish-name font-sans text-lg leading-snug">
            {item.detail ? `${item.name}\u00a0` : item.name}
            {item.detail && (
              <span
                data-detail={item.detail}
                className="dish-detail whitespace-nowrap text-xs text-muted"
              >
                {item.detail}
              </span>
            )}
          </p>
        ) : (
          <p className="truncate font-display text-sm font-medium">
            {item.name}
            {item.detail && <span className="text-faint"> {item.detail}</span>}
          </p>
        )}
        {/* Vrai téléphone : la première ligne seule, sur deux lignes au plus ;
            les suivantes détaillent un menu. */}
        {item.description && (
          <p
            className={`mt-0.5 ${
              real
                ? "line-clamp-2 text-xs leading-snug text-muted"
                : "line-clamp-1 text-[11px] leading-relaxed text-faint"
            }`}
          >
            {real ? item.description.split("\n")[0] : item.description}
          </p>
        )}
        {real && <DishIndicators item={item} compact />}
        {/* Les allergènes de la carte : à emporter, on les doit avant le paiement. */}
        {real && item.allergens?.length ? (
          <p className="mt-1 text-[11px] leading-snug text-faint">
            {allergenLine(item.allergens)}
          </p>
        ) : null}
        {real ? (
          // Prix et contrôles sur une ligne, sous le texte : le compteur ne
          // rétrécit pas la colonne du nom.
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="dish-price font-display text-lg text-ember-1">
              {formatPrice(item.price)}
            </span>
            {controls}
          </div>
        ) : (
          <p className="mt-0.5 font-display text-xs text-ember-1">
            {formatPrice(item.price)}
          </p>
        )}
      </div>
      {!real && controls}
    </div>
  );
}

/**
 * Feuille d'options d'un article, dans l'écran du téléphone : la même règle
 * que celle de la carte (groupes obligatoires exigés, suppléments au prix),
 * sans ce qui la lie à une page entière (historique, défilement figé).
 */
function OptionSheet({
  item,
  section,
  framed,
  onClose,
}: {
  item: MenuItem;
  /** Sa catégorie : une formule garde dans la feuille le nom de sa carte. */
  section?: string;
  framed: boolean;
  onClose: () => void;
}) {
  const demo = useCollectDemo();
  const groups = item.options ?? [];
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  // Groupe manquant signalé au toucher du bouton ; n alterne deux animations
  // identiques pour la rejouer à chaque toucher.
  const [flash, setFlash] = useState<{ id: string; n: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Dernier geste au doigt ou à la souris, et non au clavier.
  const pointer = useRef(false);
  const titleId = useId();

  // Le focus entre dans la feuille et revient au bouton qui l'a ouverte, lu
  // au rendu : une fois le menu inerte derrière la feuille, il l'a perdu.
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
    return () => opener?.focus({ preventScroll: true });
  }, [opener]);

  // Échap ferme la feuille, d'où que vienne la touche ; Tab tourne dans la
  // feuille. Un groupe de radios est un seul arrêt : le coché, sinon le premier.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const groupStop = (radio: HTMLInputElement) =>
        panel.querySelector(`input[name="${radio.name}"]:checked`) ??
        panel.querySelector(`input[name="${radio.name}"]`);
      const stops = [...panel.querySelectorAll<HTMLElement>("button, input")].filter(
        (el) =>
          !el.hasAttribute("disabled") &&
          (!(el instanceof HTMLInputElement) || el.type !== "radio" || el === groupStop(el))
      );
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;
      const inside = active !== panel && panel.contains(active);
      if (!first || (inside && active !== (event.shiftKey ? first : last))) return;
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const chosen = (group: OptionGroup) =>
    group.choices.filter((choice) => selected[group.id]?.includes(choice.id));
  const missing = groups.filter(
    (group) => group.obligatoire && chosen(group).length === 0
  );
  const touched = Object.values(selected).some((ids) => ids.length > 0);
  const formulaDishes =
    demo.settings.realPhone &&
    groups.some((group) => group.choices.some((choice) => demo.dishAllergens.has(choice.name)));
  const pickedAllergens = [
    ...new Set(
      groups.flatMap((group) =>
        chosen(group).flatMap((choice) => demo.dishAllergens.get(choice.name) ?? [])
      )
    ),
  ];
  const unitPrice = groups.reduce(
    (sum, group) =>
      sum + chosen(group).reduce((groupSum, choice) => groupSum + choice.supplement, 0),
    item.price
  );

  // Amène un groupe sous les yeux s'il n'y est pas (titre et premier choix),
  // en ne faisant défiler que la feuille : scrollIntoView ferait aussi
  // défiler la page hôte.
  const reveal = (id: string) => {
    const body = bodyRef.current;
    const target = body?.querySelector<HTMLElement>(`[data-group="${id}"]`);
    if (!body || !target) return;
    const view = body.getBoundingClientRect();
    const first = target.querySelector("label") ?? target;
    if (
      target.getBoundingClientRect().top >= view.top &&
      first.getBoundingClientRect().bottom <= view.bottom
    ) {
      return;
    }
    body.scrollTo({ top: target.offsetTop, behavior: scrollBehavior() });
  };

  const pick = (group: OptionGroup, choiceId: string) => {
    setFlash((current) => (current?.id === group.id ? null : current));
    const previous = selected[group.id] ?? [];
    setSelected({
      ...selected,
      [group.id]: !group.multiple
        ? [choiceId]
        : previous.includes(choiceId)
          ? previous.filter((id) => id !== choiceId)
          : [...previous, choiceId],
    });
    // Premier choix d'un groupe obligatoire à choix unique, au doigt ou à la
    // souris : la feuille descend au prochain groupe qui attend (le plat, puis
    // la boisson). Au clavier, le focus resterait sur un groupe parti.
    const next = missing.find((other) => other.id !== group.id);
    if (pointer.current && group.obligatoire && !group.multiple && previous.length === 0 && next) {
      requestAnimationFrame(() => reveal(next.id));
    }
  };

  const confirm = () => {
    // Il manque un choix obligatoire : on emmène le client dessus.
    if (missing.length > 0) {
      const { id } = missing[0];
      reveal(id);
      bodyRef.current
        ?.querySelector<HTMLInputElement>(`[data-group="${id}"] input`)
        ?.focus({ preventScroll: true });
      setFlash((current) => ({ id, n: (current?.n ?? 0) + 1 }));
      return;
    }
    demo.addLine(
      demoLine(
        item,
        groups.flatMap((group) => chosen(group).map((choice) => ({ group, choice })))
      )
    );
    onClose();
  };

  return (
    <div
      className={`absolute inset-0 z-15 flex flex-col justify-end bg-black/60 ${
        framed ? "pt-14" : "pt-6"
      }`}
      // Un choix posé ne se perd pas d'un toucher à côté de la feuille.
      onClick={touched ? undefined : onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-section={section}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="sheet-rise flex min-h-0 flex-col rounded-t-3xl border-t border-hairline bg-surface outline-none"
      >
        <div className="border-b border-hairline px-5 pb-3 pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id={titleId} className="demo-dish-name font-display text-lg font-medium leading-tight">
              {lineName(item)}
            </h3>
            <span className="dish-price shrink-0 font-display text-base tabular-nums text-ember-1">
              {formatPrice(unitPrice)}
            </span>
          </div>
          {/* Une formule : les allergènes du plat choisi, pris sur la carte. */}
          {formulaDishes && (
            <p className="mt-1 text-[11px] leading-snug text-muted">
              {pickedAllergens.length > 0
                ? allergenLine(pickedAllergens)
                : "Allergènes : ceux du plat choisi, sur la carte"}
            </p>
          )}
        </div>
        <div
          ref={bodyRef}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"
          onPointerDown={() => {
            pointer.current = true;
          }}
          onKeyDown={() => {
            pointer.current = false;
          }}
        >
          <div className="flex flex-col gap-5">
            {groups.map((group) => {
              const done = chosen(group).length > 0;
              return (
                <div
                  key={group.id}
                  data-group={group.id}
                  // Le cerne du groupe manquant passe à distance du texte.
                  className={`-m-2 p-2 ${
                    flash?.id === group.id
                      ? flash.n % 2
                        ? "group-flash-a"
                        : "group-flash-b"
                      : ""
                  }`}
                >
                  <fieldset>
                    <legend className="mb-2 flex items-baseline gap-2 text-xs font-semibold">
                      {group.name}{" "}
                      {!group.obligatoire ? (
                        <span className="font-medium text-muted">facultatif</span>
                      ) : done ? (
                        <span className="font-medium text-ember-2">
                          <span aria-hidden>✓</span>
                          <span className="sr-only">, choix fait</span>
                        </span>
                      ) : (
                        <span className="font-medium text-ember-2">
                          {group.multiple ? "au choix" : "1 au choix"}
                        </span>
                      )}
                    </legend>
                    <div className="flex flex-col gap-1.5">
                      {/* Groupe optionnel : « Aucun » est l'état par défaut et le
                          seul moyen de revenir en arrière. */}
                      {!group.obligatoire && !group.multiple && (
                        <label className={choiceRowClass(!done)}>
                          <span className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name={`${titleId}-${group.id}`}
                              checked={!done}
                              onChange={() =>
                                setSelected({ ...selected, [group.id]: [] })
                              }
                              className="accent-ember-2"
                            />
                            Aucun
                          </span>
                        </label>
                      )}
                      {group.choices.map((choice) => {
                        const checked = selected[group.id]?.includes(choice.id) ?? false;
                        return (
                          <label key={choice.id} className={choiceRowClass(checked)}>
                            <span className="flex items-center gap-2.5">
                              <input
                                type={group.multiple ? "checkbox" : "radio"}
                                name={`${titleId}-${group.id}`}
                                required={group.obligatoire && !group.multiple}
                                checked={checked}
                                onChange={() => pick(group, choice.id)}
                                className="accent-ember-2"
                              />
                              {choice.name}
                            </span>
                            {group.formats ? (
                              <span className="shrink-0 text-xs text-muted">
                                {formatPrice(item.price + choice.supplement)}
                              </span>
                            ) : (
                              choice.supplement > 0 && (
                                <span className="shrink-0 text-xs text-muted">
                                  +{formatPrice(choice.supplement)}
                                </span>
                              )
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-hairline px-4 pb-5 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full border border-hairline px-4 text-xs font-semibold"
          >
            Annuler
          </button>
          {/* Incomplet, il reste actif : il emmène au groupe qui manque. */}
          <button
            type="button"
            onClick={confirm}
            className={`min-h-11 min-w-0 flex-1 rounded-full px-4 text-xs font-semibold ${
              missing.length > 0
                ? "border border-hairline bg-surface-raised text-foreground"
                : "ember-gradient text-background"
            }`}
          >
            <span aria-live="polite">
              {missing.length > 0
                ? `Choisir : ${missing[0].name}`
                : `Ajouter · ${formatPrice(unitPrice)}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuView({ framed }: { framed: boolean }) {
  const demo = useCollectDemo();
  const [activeCategory, setActiveCategory] = useState(demo.sections[0]?.id);
  const [choosing, setChoosing] = useState<MenuItem | null>(null);
  // La barre collante ne dégage la Dynamic Island qu'une fois réellement
  // collée : une sentinelle en tête de défilement pilote l'état.
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stickyBarRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  // Défilement lancé par une pastille : le rail la garde jusqu'au bout, sans
  // s'arrêter sur les catégories traversées.
  const pinnedRef = useRef(false);

  // Le rail suit la lecture : la catégorie courante est la dernière dont le
  // titre est entré dans le haut de la zone visible (railFollowFraction) ;
  // tout en bas, la dernière. La pastille touchée reste choisie jusqu'à la
  // fin de son défilement, ou jusqu'au geste suivant (molette, toucher,
  // clavier).
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const follow = () => {
      if (pinnedRef.current) return;
      const top = stickyBarRef.current?.getBoundingClientRect().bottom ?? 0;
      const line =
        top + (container.getBoundingClientRect().bottom - top) * COLLECT_DEMO.railFollowFraction;
      const atEnd =
        container.scrollTop + container.clientHeight >= container.scrollHeight - 1;
      const passed = demo.sections.filter(
        (section) =>
          (sectionRefs.current.get(section.id)?.getBoundingClientRect().top ?? Infinity) <= line
      );
      const current = atEnd
        ? demo.sections[demo.sections.length - 1]
        : (passed[passed.length - 1] ?? demo.sections[0]);
      if (current) setActiveCategory(current.id);
    };
    const release = () => {
      pinnedRef.current = false;
    };
    const gestures = ["scrollend", "wheel", "pointerdown", "keydown"] as const;
    container.addEventListener("scroll", follow, { passive: true });
    for (const gesture of gestures) container.addEventListener(gesture, release, { passive: true });
    return () => {
      container.removeEventListener("scroll", follow);
      for (const gesture of gestures) container.removeEventListener(gesture, release);
    };
  }, [demo.sections]);

  // La pastille courante reste dans le rail.
  useEffect(() => {
    const rail = railRef.current;
    const pill = rail?.querySelector<HTMLElement>('[aria-current="true"]');
    if (rail && pill) revealPill(rail, pill);
  }, [activeCategory]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { root: scrollRef.current, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);
  const count = demo.cart.reduce((sum, line) => sum + line.quantity, 0);
  const total = cartTotal(demo.cart);
  const real = demo.settings.realPhone;
  const { coverImage, logo, logoIsName, mark, highlight, brandName: name } = demo.restaurant;
  // Vrai téléphone sans photo de couverture : le logo en tient lieu ; sans
  // l'un ni l'autre, pas de bandeau, l'encart « À emporter » dégage l'île.
  const logoCover = real && !coverImage;
  const cover = !logoCover || Boolean(logo);
  const nameInLogo = logoCover && logo && logoIsName;

  // Défilement borné au volet : scrollIntoView remonterait aussi la page
  // hôte (tous les ancêtres défilables), inacceptable au milieu de la landing.
  // L'offset est mesuré sur la barre : si sa transition pt-3 → pt-12 se joue
  // pendant le défilement, contenu et barre glissent du même delta — le
  // calcul pré-transition reste juste.
  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    pinnedRef.current = true;
    const container = scrollRef.current;
    const section = sectionRefs.current.get(id);
    if (!container || !section) return;
    container.scrollTo({
      top:
        section.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop -
        (stickyBarRef.current?.offsetHeight ?? 0),
      behavior: scrollBehavior(),
    });
  };

  return (
    <>
      <div
        ref={scrollRef}
        inert={choosing !== null}
        // Vrai téléphone : la liste s'efface au-dessus de la barre du panier.
        className={`flex flex-1 flex-col overflow-y-auto ${
          real ? "[mask-image:linear-gradient(to_bottom,black_calc(100%_-_2rem),transparent)]" : ""
        }`}
      >
        {/* Couverture pleine largeur, fondue vers le fond — file sous l'île */}
        {!logoCover ? (
          <div className="relative h-28 shrink-0">
            {coverImage && (
              <Image
                src={coverImage}
                alt=""
                fill
                sizes="384px"
                className="object-cover"
              />
            )}
            <div
              className="absolute inset-0 bg-linear-to-t from-background via-background/25 to-background/30"
              aria-hidden
            />
          </div>
        ) : (
          logo && (
            // Le logo sous l'île, dans la lueur de la marque, comme le héros de sa carte.
            <div
              className={`phone-logo-cover flex shrink-0 items-end justify-center pb-1 ${framed ? "h-28" : "h-20"}`}
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 60% 70% at 50% 50%, color-mix(in srgb, var(--hero-glow-1, var(--ember-1)) 18%, transparent), transparent 70%)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- actif local de marque, dimensions libres */}
              <img
                src={logo}
                alt={nameInLogo ? name : ""}
                // Un mot-symbole très large (Caffè Panis) ne déborde pas du téléphone.
                className="h-16 w-auto max-w-[85%] object-contain"
              />
            </div>
          )
        )}

        {/* Vrai téléphone : ce que dit la vraie page collect sous son en-tête ;
            sans couverture ni logo, c'est lui qui dégage l'île. */}
        {real && (
          <div className={`mx-4 ${framed && !cover ? "mt-12" : "mt-1"} flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-xl border border-hairline bg-surface px-3 py-2 text-xs`}>
            <span className="font-semibold">
              À emporter{highlight && <span className="font-normal text-muted"> · {highlight}</span>}
            </span>
            <span className="phone-open inline-flex items-center gap-1.5 font-semibold text-ember-1">
              <span aria-hidden className="ember-gradient size-2 rounded-full" />
              Ouvert : retrait dès que possible
            </span>
            <span className="w-full text-muted">Payé en ligne, prêt à l&apos;heure choisie</span>
          </div>
        )}

        {/* La sentinelle précède la barre : elle sort du cadre pile quand la
            barre atteint le haut et se colle. */}
        <div ref={sentinelRef} aria-hidden />
        {/* Barre collante : nom + rail de catégories sous la Dynamic Island */}
        <div
          ref={stickyBarRef}
          // Vrai téléphone : opaque, comme la barre de la carte.
          className={`sticky top-0 z-10 flex flex-col gap-2 px-4 pb-2.5 transition-[padding] duration-300 motion-reduce:transition-none ${
            real ? "bg-background" : "bg-background/90 backdrop-blur-md"
          } ${framed && scrolled ? "pt-12" : "pt-3"}`}
        >
          <div className="px-1">
            {/* Le logo écrit déjà le nom : il ne se retape pas. */}
            {!nameInLogo && (
              <p className="font-display text-lg font-medium leading-tight">
                {name}
              </p>
            )}
            <p className="flex items-center gap-2 text-[11px] text-muted">
              {/* Le logo part avec la couverture : la barre collée reprend la
                  marque en petit, son icône d'écran d'accueil s'il y en a une. */}
              {nameInLogo && scrolled && (
                // eslint-disable-next-line @next/next/no-img-element -- actif local de marque, dimensions libres
                <img src={mark ?? logo} alt="" className={mark ? "size-8 rounded-lg" : "h-8 w-auto"} />
              )}
              {demo.restaurant.tagline}
            </p>
          </div>
          {/* Le rail garde la marge que son défilement couperait sinon : le
              cerne du focus, et sur un vrai téléphone les pastilles de 33 px
              touchées sur 45. */}
          {/* nav et data-category : les accroches des pastilles de la carte,
              que les thèmes habillent. Le focus sorti du rail, la pastille
              courante y revient. */}
          <nav
            ref={railRef}
            aria-label="Catégories"
            onBlur={(event) => {
              const rail = event.currentTarget;
              if (rail.contains(event.relatedTarget)) return;
              const pill = rail.querySelector<HTMLElement>('[aria-current="true"]');
              if (pill) revealPill(rail, pill);
            }}
            className="no-scrollbar -mx-4 -my-1.5 flex gap-1.5 overflow-x-auto px-4 py-1.5"
          >
            {demo.sections.map((section) => (
              <button
                key={section.id}
                type="button"
                data-category={real ? section.id : undefined}
                aria-current={activeCategory === section.id ? "true" : undefined}
                onClick={() => scrollToCategory(section.id)}
                onFocus={(event) => {
                  if (railRef.current) revealPill(railRef.current, event.currentTarget);
                }}
                className={`shrink-0 rounded-full px-3 text-[11px] font-semibold transition-colors ${
                  real ? "relative py-2 before:absolute before:inset-x-0 before:-inset-y-1.5" : "py-1.5"
                } ${
                  activeCategory === section.id
                    ? "ember-gradient text-background"
                    : "border border-hairline text-muted hover:text-foreground"
                }`}
              >
                {section.name}
              </button>
            ))}
          </nav>
        </div>

        <div className={`flex flex-col gap-4 px-4 pt-1 ${real ? "pb-10" : "pb-4"}`}>
          {demo.sections.map((section, sectionIndex) => (
            <section
              key={section.id}
              ref={(node) => {
                if (node) sectionRefs.current.set(section.id, node);
                else sectionRefs.current.delete(section.id);
              }}
              aria-label={section.name}
              data-section={section.id}
            >
              {/* Vrai téléphone : le titre de la carte, son nom dans la langue de
                  la cuisine et son accroche (category-*, que les thèmes habillent). */}
              <div className={real && section.tagline ? "mb-2.5" : "mb-2"}>
                <div className="flex items-center gap-2.5">
                  <h4 className={`${real ? "category-heading text-xl" : "text-base"} font-display font-medium`}>
                    {real && section.kicker && (
                      <span lang={section.kicker.lang} className="category-kicker mr-1.5">
                        {`${section.kicker.text} `}
                      </span>
                    )}
                    {section.name}
                  </h4>
                  <span
                    aria-hidden
                    className={`${real ? "category-rule" : ""} ember-gradient h-px flex-1 opacity-30`}
                  />
                </div>
                {real && section.tagline && (
                  <p className="category-tagline mt-1 text-xs italic leading-snug text-muted">
                    {section.tagline}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {section.items.map((item, itemIndex) => (
                  <DishRow
                    key={item.id}
                    item={item}
                    quantity={demo.cart
                      .filter((line) => line.item.id === item.id)
                      .reduce((sum, line) => sum + line.quantity, 0)}
                    pulseAdd={
                      demo.hintActive &&
                      count === 0 &&
                      sectionIndex === 0 &&
                      itemIndex === 0
                    }
                    onChoose={setChoosing}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div inert={choosing !== null} className="px-4 pb-6 pt-2">
        {count > 0 ? (
          <button
            type="button"
            data-action
            onClick={demo.openCheckout}
            className={`ember-gradient flex w-full items-center justify-between rounded-full px-4 py-3 text-sm font-semibold text-background shadow-[0_8px_24px_rgba(226,118,75,0.25)] transition-transform active:scale-[0.98] ${
              demo.hintActive ? "soft-pulse" : ""
            }`}
          >
            <span className="flex items-center gap-2.5">
              <span
                key={count}
                className="pop flex size-6 items-center justify-center rounded-full bg-background/25 text-xs font-bold tabular-nums"
              >
                {count}
              </span>
              Commander
            </span>
            <span className="tabular-nums">{formatPrice(total)}</span>
          </button>
        ) : (
          <p className="text-center text-[11px] text-faint">
            Ajoutez un plat pour commander
          </p>
        )}
      </div>

      {choosing && (
        <OptionSheet
          key={choosing.id}
          item={choosing}
          section={demo.sections.find((section) => section.items.includes(choosing))?.id}
          framed={framed}
          onClose={() => setChoosing(null)}
        />
      )}
    </>
  );
}

function CheckoutView({ topPad }: { topPad: string }) {
  const demo = useCollectDemo();
  const nameId = useId();
  const phoneId = useId();
  const nameProblemId = useId();
  const missingName = !demo.customerName.trim();
  const total = cartTotal(demo.cart);
  const real = demo.settings.realPhone;
  // Le titre prend le focus à l'ouverture : le bouton Commander n'est plus.
  const headingRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => headingRef.current?.focus({ preventScroll: true }), []);

  const recap = (
    <ul className="flex flex-col gap-2.5 rounded-2xl border border-hairline bg-surface p-4">
      {demo.cart.map((line) => (
        <li key={line.key} className="flex items-center gap-3">
          {!real && line.item.image && (
            <div className="relative size-10 shrink-0 overflow-hidden rounded-lg">
              <Image src={line.item.image} alt="" fill sizes="71px" className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                <span className="tabular-nums text-muted">{line.quantity}×</span>{" "}
                {line.name}
              </span>
              <span className="shrink-0 tabular-nums text-muted">
                {formatPrice(line.quantity * line.unitPrice)}
              </span>
            </div>
            {line.options.length > 0 && (
              <p className="pl-5 text-[11px] leading-snug text-faint">
                {optionSummary(line)}
              </p>
            )}
          </div>
        </li>
      ))}
      <li className="mt-0.5 flex items-baseline justify-between border-t border-hairline pt-2.5">
        <span className="text-sm font-semibold">Total</span>
        <span className="font-display text-ember-1">{formatPrice(total)}</span>
      </li>
    </ul>
  );

  const nameField = (
    <input
      id={nameId}
      value={demo.customerName}
      onChange={(e) => demo.setCustomerName(e.target.value)}
      placeholder="Votre nom"
      autoComplete="off"
      className={`${real ? "min-h-11 min-w-0" : "py-2"} rounded-xl border border-hairline bg-background px-3 text-sm outline-none transition-colors focus:border-ember-2/50`}
    />
  );
  const contact = real ? (
    // Nom et téléphone côte à côte, comme le vrai formulaire ; le numéro de
    // la démo est posé, pas à saisir.
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1.5">
      <label htmlFor={nameId} className="text-[11px] font-semibold text-muted">
        Votre nom
      </label>
      <label htmlFor={phoneId} className="text-[11px] font-semibold text-muted">
        Téléphone
      </label>
      {nameField}
      <input
        id={phoneId}
        type="tel"
        value={COLLECT_DEMO.customer.phone}
        readOnly
        size={COLLECT_DEMO.customer.phone.length}
        className="min-h-11 rounded-xl border border-hairline bg-surface px-3 text-sm text-muted outline-none"
      />
    </div>
  ) : (
    <>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={nameId} className="text-[11px] font-semibold text-muted">
          Votre nom
        </label>
        {nameField}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs text-muted">
          {COLLECT_DEMO.customer.phone}
        </span>
      </div>
    </>
  );

  const pickup = (
    <fieldset className="flex flex-col gap-1.5">
      <legend className={`${real ? "mb-1.5" : ""} text-xs font-semibold text-muted`}>
        Retrait · {demo.pickupTomorrow ? "par créneau" : "dès que possible ou par créneau"} de{" "}
        {COLLECT_DEMO.slots.intervalMinutes} min
      </legend>
      <div className="flex gap-1.5" role="group" aria-label="Jour de retrait">
        {([false, true] as const).map((tomorrow) => (
          <button
            key={String(tomorrow)}
            type="button"
            aria-pressed={demo.pickupTomorrow === tomorrow}
            onClick={() => demo.setPickupTomorrow(tomorrow)}
            className={`${real ? "min-h-11 rounded-xl px-4" : "rounded-lg px-3 py-1"} text-xs font-semibold transition-colors ${
              demo.pickupTomorrow === tomorrow
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tomorrow ? "Demain" : "Aujourd’hui"}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {!demo.pickupTomorrow && (
          <button
            type="button"
            onClick={() => demo.setPickupSlot(null)}
            className={`${real ? "min-h-11" : "py-1.5"} rounded-full px-3 text-xs font-medium transition-colors ${
              demo.pickupSlot === null
                ? "ember-gradient text-background"
                : "border border-hairline text-muted hover:border-ember-2/40"
            }`}
          >
            Dès que possible
          </button>
        )}
        {/* Comme le vrai collect : un créneau complet ne se propose pas, et les
            places restantes ne se disent pas. */}
        {Array.from({ length: COLLECT_DEMO.slots.count }, (_, i) => i)
          .filter((slot) => slotSeats(slot, demo.pickupTomorrow, demo.settings) > 0)
          .map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => demo.setPickupSlot(slot)}
              className={`rounded-full px-3 text-xs font-medium transition-colors ${
                real ? "min-h-11" : "py-1.5"
              } ${
                demo.pickupSlot === slot
                  ? "ember-gradient text-background"
                  : "border border-hairline text-muted hover:border-ember-2/40"
              }`}
            >
              {formatSlotTime(slot, demo.pickupTomorrow, demo.checkoutAt)}
            </button>
          ))}
      </div>
    </fieldset>
  );

  return (
    <>
      <header className={`flex items-center gap-3 px-5 pb-3 ${topPad}`}>
        <button
          type="button"
          onClick={demo.backToMenu}
          aria-label="Retour au menu"
          className="relative flex size-7 items-center justify-center rounded-full border border-hairline text-sm text-muted transition-colors before:absolute before:-inset-2 hover:border-ember-2/40"
        >
          ←
        </button>
        <p
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-lg font-medium outline-none"
        >
          Votre commande
        </p>
      </header>
      {/* Vrai téléphone : le récapitulatif s'efface sous la barre Payer (la
          suite défile) et la marge le dégage, défilé jusqu'au bout. */}
      <div
        className={`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 ${
          real ? "pb-10 [mask-image:linear-gradient(to_bottom,black_calc(100%_-_2rem),transparent)]" : "pb-6"
        }`}
      >
        {real ? (
          // Le créneau d'abord, sous les yeux : c'est ce que le client vient
          // choisir ; le récapitulatif suit, le total est sur le bouton.
          <>
            {pickup}
            {contact}
            {recap}
          </>
        ) : (
          <>
            {recap}
            <div className="flex flex-col gap-3">
              {contact}
              {pickup}
            </div>
          </>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-t border-hairline bg-background px-5 pb-6 pt-3">
        <button
          type="button"
          data-action
          onClick={demo.pay}
          disabled={missingName}
          aria-describedby={missingName ? nameProblemId : undefined}
          className={`ember-gradient w-full rounded-full py-3 text-sm font-semibold text-background shadow-[0_8px_24px_rgba(226,118,75,0.25)] transition-transform active:scale-[0.98] disabled:opacity-50 ${
            demo.hintActive && !missingName ? "soft-pulse" : ""
          }`}
        >
          Payer {formatPrice(total)}
        </button>
        {/* Comme le vrai formulaire : pas de commande sans nom. */}
        {missingName && (
          <p id={nameProblemId} className="text-center text-xs font-semibold text-ember-3">
            Indiquez votre nom.
          </p>
        )}
        <p className="text-center text-[11px] leading-relaxed text-faint">
          {COLLECT_DEMO.paymentNotice}
        </p>
      </div>
    </>
  );
}

function PayingView() {
  // Le bouton Payer est parti : le focus passe à l'état du paiement.
  const statusRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => statusRef.current?.focus({ preventScroll: true }), []);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5">
      {/* Carte bancaire stylisée */}
      <div
        className="flex w-56 flex-col gap-3 rounded-2xl border border-hairline bg-surface-raised p-4 shadow-lg shadow-black/20"
        aria-hidden
      >
        <div className="flex items-center justify-between">
          <span className="ember-gradient h-6 w-8 rounded-md opacity-80" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
            Carte
          </span>
        </div>
        <div className="shimmer h-2.5 w-36 rounded-full" />
        <div className="flex justify-between">
          <span className="shimmer h-2 w-16 rounded-full" />
          <span className="shimmer h-2 w-8 rounded-full" />
        </div>
      </div>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-surface">
        <div className="loader-bar ember-gradient h-full w-1/3 rounded-full" />
      </div>
      <p ref={statusRef} role="status" tabIndex={-1} className="text-sm text-muted outline-none">
        Paiement en cours…
      </p>
    </div>
  );
}

const TIMELINE = [
  { step: "en_attente", label: "Reçue" },
  { step: "en_preparation", label: "En préparation" },
  { step: "prete", label: "Prête" },
  { step: "retiree", label: "Retirée" },
] as const;

function ItineraryButton() {
  const demo = useCollectDemo();
  return (
    <a
      href={demo.restaurant.itineraryUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-full border border-hairline px-4 text-xs font-semibold text-ember-1 transition-colors hover:border-ember-2/40 ${
        demo.settings.realPhone ? "min-h-11" : "py-2"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 11 21 3l-8 18-2.5-7.5L3 11z" />
      </svg>
      Itinéraire
    </a>
  );
}

/** Cloche fumante : la commande est en cuisine. */
function SteamingDish() {
  return (
    <span
      className="relative mb-1 flex h-12 w-16 items-end justify-center"
      aria-hidden
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="steam absolute bottom-7 h-4 w-0.5 rounded-full bg-muted"
          style={{ left: `${37 + index * 15}%`, animationDelay: `${index * 0.5}s` }}
        />
      ))}
      <svg
        viewBox="0 0 48 26"
        className="h-6.5 w-13 text-ember-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 22h40" />
        <path d="M8 22a16 16 0 0 1 32 0" />
        <path d="M24 6V4" />
      </svg>
    </span>
  );
}

function TrackingView({ topPad }: { topPad: string }) {
  const demo = useCollectDemo();
  const now = useNow(demo.now);
  const order = demo.order!;
  const real = demo.settings.realPhone;
  const copy =
    COLLECT_DEMO.customerStatus[
      demo.step as keyof typeof COLLECT_DEMO.customerStatus
    ] ?? COLLECT_DEMO.customerStatus.en_attente;
  // Programmée pour demain : reçue, rien de plus aujourd'hui.
  const currentIndex = TIMELINE.findIndex(
    (entry) => entry.step === (demo.step === "programmee" ? "en_attente" : demo.step)
  );
  const pickupLine = pickupStatus(order, demo.step);
  // Le titre prend le focus à l'arrivée du suivi : le bouton Payer n'est plus.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => titleRef.current?.focus({ preventScroll: true }), []);

  const remainingMs = order.readyAt
    ? Math.max(0, Date.parse(order.readyAt) - now)
    : 0;
  // En minutes, comme order-confirmation ; la barre, elle, avance à la seconde.
  const minutesLeft = Math.round(remainingMs / 60_000);
  const progress = order.etaMinutes
    ? Math.min(1, 1 - remainingMs / (order.etaMinutes * 60_000))
    : 0;

  return (
    <>
      {/* Les étapes restent hors du défilement, sous l'île, comme le titre du
          paiement : seul le suivi défile — en fondu en haut et en bas sur un
          vrai téléphone, la marge du bas le dégageant, défilé jusqu'au bout. */}
      <div className={`shrink-0 px-5 ${topPad} ${real ? "" : "pb-4"}`}>
        <ol className="flex items-start justify-between" aria-label="Avancement">
          {TIMELINE.map((entry, index) => {
            const done = currentIndex > index;
            const active = currentIndex === index;
            return (
              <li
                key={entry.step}
                aria-current={active ? "step" : undefined}
                className="relative flex flex-1 flex-col items-center gap-1.5"
              >
                {index > 0 && (
                  <span
                    aria-hidden
                    className={`absolute right-1/2 top-1.25 h-px w-full ${
                      done || active ? "ember-gradient opacity-60" : "bg-hairline"
                    }`}
                  />
                )}
                <span
                  className={`relative z-10 size-2.5 rounded-full ${
                    done || active ? "ember-gradient" : "bg-faint/40"
                  } ${active && demo.step !== "retiree" ? "animate-pulse" : ""}`}
                />
                <span
                  className={`text-center ${real ? "text-[10px]" : "text-[9px]"} leading-tight ${
                    active ? "font-semibold text-foreground" : "text-faint"
                  }`}
                >
                  {entry.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <div
        className={`flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 ${
          real
            ? "pb-10 pt-4 [mask-image:linear-gradient(to_bottom,transparent,black_1rem,black_calc(100%_-_2rem),transparent)]"
            : "pb-6"
        }`}
      >
        <div
          className="flex flex-col items-center gap-1 rounded-2xl border border-hairline bg-surface p-5 text-center"
        >
          {demo.step === "en_preparation" && <SteamingDish />}
          {demo.step === "prete" && (
            <span className="relative mb-2 flex size-12 items-center justify-center">
              <span
                aria-hidden
                className="pulse-ring absolute inset-0 rounded-full border-2 border-ember-1"
              />
              <span
                aria-hidden
                className="pulse-ring absolute inset-0 rounded-full border-2 border-ember-2"
                style={{ animationDelay: "0.45s" }}
              />
              <span className="ember-gradient flex size-10 items-center justify-center rounded-full text-background">
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              </span>
            </span>
          )}
          <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
            {/* Au lendemain, l'heure de commande est celle de la veille. */}
            {order.customerName} · {isNextDay(order) ? "hier " : ""}
            {formatTime(order.createdAt)}
          </p>
          <h3 ref={titleRef} tabIndex={-1} className="font-display text-xl font-medium outline-none">
            {copy.title}
          </h3>
          <p className="text-xs leading-relaxed text-muted">{copy.hint}</p>

          {demo.step === "en_preparation" && order.readyAt ? (
            <div className="mt-2 flex w-full flex-col items-center gap-1.5">
              <p className="font-display text-lg font-semibold">
                Prête vers {formatTime(order.readyAt)}
              </p>
              <p className="text-xs tabular-nums text-muted">
                {minutesLeft > 0 ? `dans ~${minutesLeft} min` : "Plus que quelques instants"}
              </p>
              <div className="h-1 w-full overflow-hidden rounded-full bg-background/70">
                <div
                  // Une nouvelle barre par préparation : elle ne recule jamais.
                  key={order.startedAt}
                  className="ember-gradient h-full origin-left rounded-full transition-transform ease-linear motion-reduce:transition-none"
                  style={{
                    transform: `scaleX(${progress})`,
                    transitionDuration: `${COLLECT_DEMO.timings.countdownTickMs}ms`,
                  }}
                />
              </div>
            </div>
          ) : (
            // Un créneau se dit à la place du compte à rebours ; vrai
            // téléphone : l'heure de retrait toujours, comme order-confirmation.
            (order.pickupAt || real) && (
              <p className="mt-2 text-sm font-semibold">{pickupLine}</p>
            )
          )}
        </div>

        {/* Ce que le client viendra chercher, ligne à ligne et ses choix dessous,
            comme order-confirmation. */}
        {real && (
          <ul className="flex flex-col gap-1 rounded-2xl border border-hairline bg-surface px-4 py-3 text-xs">
            {order.lines.map((line) => (
              <li key={line.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-muted">
                    <span className="tabular-nums">{line.quantity}×</span> {line.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {formatPrice(line.quantity * line.unitPrice)}
                  </span>
                </div>
                {line.options.map((option, index) => (
                  <p key={index} className="pl-5 text-[11px] text-faint">
                    {option.groupName} : {option.choiceName}
                  </p>
                ))}
              </li>
            ))}
            <li className="mt-1 flex items-baseline justify-between gap-3 border-t border-hairline pt-1.5 font-semibold">
              <span>Total payé</span>
              <span className="font-display text-base leading-none text-ember-1">
                {formatPrice(order.total)}
              </span>
            </li>
          </ul>
        )}

        {/* Où retirer, dès la commande reçue : l'écran ne reste pas vide en attendant le restaurant. */}
        {demo.step !== "retiree" && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {demo.restaurant.brandName}
              </p>
              <p className="line-clamp-2 text-xs text-muted">
                {demo.restaurant.address}
              </p>
            </div>
            <ItineraryButton />
          </div>
        )}

        {/* Vrai téléphone : « Rejouer » est hors du téléphone, avec la puce guide (stage). */}
        {demo.step === "retiree" && !real && (
          <button
            type="button"
            data-action
            onClick={demo.replay}
            className={`mx-auto rounded-full border border-hairline px-5 py-2.5 text-xs font-semibold text-foreground transition-colors hover:border-ember-2/40 ${
              demo.hintActive ? "soft-pulse" : ""
            }`}
          >
            Rejouer la démo
          </button>
        )}
      </div>
    </>
  );
}

export function CustomerPane({ framed = true }: { framed?: boolean }) {
  const demo = useCollectDemo();
  const tracking =
    demo.step !== "menu" && demo.step !== "checkout" && demo.step !== "paiement";
  // Le menu laisse sa couverture filer sous la Dynamic Island ; les autres
  // vues dégagent le haut de l'écran.
  const topPad = framed ? "pt-14" : "pt-5";
  // Le menu revient : après « Rejouer », le focus va à la catégorie courante ;
  // après « Retour au menu », au panier (« Commander »).
  const rootRef = useRef<HTMLDivElement>(null);
  const previousStep = useRef(demo.step);
  useEffect(() => {
    if (demo.step === "menu" && (previousStep.current === "retiree" || previousStep.current === "checkout")) {
      rootRef.current
        ?.querySelector<HTMLElement>(
          previousStep.current === "checkout" ? "[data-action]" : '[aria-current="true"]'
        )
        ?.focus({ preventScroll: true });
    }
    previousStep.current = demo.step;
  }, [demo.step]);

  return (
    <div
      ref={rootRef}
      // phone-screen : l'écran seul, sans le cadre du téléphone, pour les thèmes (globals.css).
      className="phone-screen relative flex h-[var(--demo-pane-h,35rem)] w-full flex-col bg-background text-left"
    >
      {demo.step === "menu" && <MenuView framed={framed} />}
      {demo.step === "checkout" && <CheckoutView topPad={topPad} />}
      {demo.step === "paiement" && <PayingView />}
      {tracking && demo.order && <TrackingView topPad={topPad} />}
    </div>
  );
}

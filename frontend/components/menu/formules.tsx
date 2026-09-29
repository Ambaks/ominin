"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { preload } from "react-dom";
import { Reveal } from "@/components/portal/reveal";
import {
  choiceRowClass,
  scrollBehavior,
  useGuidedScroll,
} from "@/components/menu/add-to-order";
import { Sheet } from "@/components/menu/sheet";
import { formatDays } from "@/lib/gestion/format";
import type { Article, Formule } from "@/lib/gestion/types";
import {
  useCart,
  type CartChoice,
  type FormuleSelection,
} from "@/lib/menu/cart";
import {
  formatPrice,
  typographie,
  type FormulesBanner as Banner,
  type OptionGroup,
} from "@/lib/menu-data";

/*
 * Formules du menu QR : un choix par étape (« Soft », « Dessert »), puis les
 * options de l'article retenu, comme pour un plat seul. La formule rejoint le
 * panier en une ligne ; la base revérifie prix et choix (formule_line).
 */

type Picks = Record<string, { articleId: string; options: Record<string, string[]> }>;

function optionsSupplement(article: Article, chosen: Record<string, string[]>) {
  return (article.options ?? []).reduce(
    (sum, group) =>
      sum +
      group.choices
        .filter((choice) => chosen[group.id]?.includes(choice.id))
        .reduce((groupSum, choice) => groupSum + choice.supplement, 0),
    0
  );
}

/**
 * « 1 au choix » (ou « au choix » quand plusieurs se cochent), « facultatif »,
 * puis une coche une fois choisi : les mots de la feuille d'un plat.
 */
function ChoiceHint({
  required,
  multiple,
  done,
}: {
  required: boolean;
  multiple?: boolean;
  done: boolean;
}) {
  if (!required) {
    return <span className="text-xs font-medium text-muted">facultatif</span>;
  }
  return (
    <span className="text-xs font-medium text-ember-2">
      {done ? (
        <>
          <span aria-hidden>✓</span>
          <span className="sr-only">, choix fait</span>
        </>
      ) : multiple ? (
        "au choix"
      ) : (
        "1 au choix"
      )}
    </span>
  );
}

function FormuleModal({
  formule,
  onClose,
}: {
  formule: Formule;
  onClose: () => void;
}) {
  const { orderingEnabled, canOrder, addLine, track } = useCart();
  const [picks, setPicks] = useState<Picks>({});
  // Choix manquant signalé au toucher du bouton ; n alterne deux animations
  // identiques pour la rejouer (voir la feuille d'un plat).
  const [flash, setFlash] = useState<{ key: string; n: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { advanceTo, bodyProps } = useGuidedScroll(bodyRef);
  const titleId = useId();

  const pickedArticle = (etapeId: string) => {
    const pick = picks[etapeId];
    return pick
      ? formule.etapes
          .find((etape) => etape.id === etapeId)
          ?.articles.find((article) => article.id === pick.articleId)
      : undefined;
  };

  // Ce qui manque encore, dans l'ordre de lecture : une étape sans choix,
  // ou une option obligatoire de l'article choisi.
  const missing: { key: string; label: string }[] = [];
  for (const etape of formule.etapes) {
    const article = pickedArticle(etape.id);
    if (!article) {
      if (etape.obligatoire) missing.push({ key: etape.id, label: etape.name });
      continue;
    }
    for (const group of article.options ?? []) {
      if (group.obligatoire && !picks[etape.id].options[group.id]?.length) {
        missing.push({ key: `${etape.id}/${group.id}`, label: group.name });
      }
    }
  }

  const unitPrice = formule.etapes.reduce((sum, etape) => {
    const article = pickedArticle(etape.id);
    return article
      ? sum + article.supplement + optionsSupplement(article, picks[etape.id].options)
      : sum;
  }, formule.price);

  const pickArticle = (etapeId: string, article: Article) => {
    setFlash(null);
    // Première réponse d'une étape obligatoire, sans options à régler : la
    // feuille descend d'elle-même à l'étape suivante qui attend, comme la
    // feuille d'un plat (le Soft choisi, le Dessert restait sous le bord).
    const etape = formule.etapes.find((candidate) => candidate.id === etapeId);
    if (etape?.obligatoire && !picks[etapeId] && !article.options?.length) {
      const next = formule.etapes.find(
        (other) => other.id !== etapeId && other.obligatoire && !picks[other.id]
      );
      if (next) advanceTo(`[data-pick="${next.id}"]`);
    }
    setPicks((current) =>
      current[etapeId]?.articleId === article.id
        ? current
        : { ...current, [etapeId]: { articleId: article.id, options: {} } }
    );
    // Ses options s'ouvrent sous lui : tombées sous le bord de la feuille
    // (la Coupe de glace, dernier dessert), la ligne choisie remonte en haut
    // avec elles — l'article reste sous les yeux, ses options dessous.
    if (!article.options?.length) return;
    requestAnimationFrame(() => {
      const body = bodyRef.current;
      const block = body?.querySelector<HTMLElement>(`[data-options="${etapeId}"]`);
      if (!body || !block) return;
      if (block.getBoundingClientRect().bottom > body.getBoundingClientRect().bottom) {
        block.previousElementSibling?.scrollIntoView({
          behavior: scrollBehavior(),
          block: "start",
        });
      }
    });
  };

  // Une étape facultative se laisse vide : « Aucun » la vide.
  const clearArticle = (etapeId: string) =>
    setPicks((current) => {
      const next = { ...current };
      delete next[etapeId];
      return next;
    });

  const setOption = (etapeId: string, groupId: string, ids: string[]) =>
    setPicks((current) => {
      const pick = current[etapeId];
      return {
        ...current,
        [etapeId]: { ...pick, options: { ...pick.options, [groupId]: ids } },
      };
    });

  const toggleOption = (etapeId: string, group: OptionGroup, choiceId: string) => {
    setFlash(null);
    const previous = picks[etapeId].options[group.id] ?? [];
    setOption(
      etapeId,
      group.id,
      !group.multiple
        ? [choiceId]
        : previous.includes(choiceId)
          ? previous.filter((id) => id !== choiceId)
          : [...previous, choiceId]
    );
  };

  // Ce qui est déjà composé, sous le titre (le premier choix est vite loin
  // au-dessus) ; avant tout choix, ce qu'il reste à faire.
  const composed = formule.etapes.flatMap((etape) => {
    const article = pickedArticle(etape.id);
    if (!article) return [];
    // Mêmes libellés qu'au panier : le groupe devant le choix dès que
    // l'article en a plusieurs.
    const groups = article.options ?? [];
    const options = groups.flatMap((group) =>
      group.choices
        .filter((choice) => picks[etape.id].options[group.id]?.includes(choice.id))
        .map((choice) =>
          groups.length > 1 && !choice.name.startsWith(group.name)
            ? `${group.name}\u00a0: ${choice.name}`
            : choice.name
        )
    );
    return [article.name, ...options];
  });
  const recap = composed.length > 0 ? composed : [`${missing.length} choix à faire`];

  const flashClass = (key: string) =>
    flash?.key === key ? (flash.n % 2 ? "group-flash-a" : "group-flash-b") : "";

  const confirm = (close: () => void) => {
    // Il manque un choix : on y emmène le client, on y pose le focus, et le
    // groupe clignote — comme sur la feuille d'un plat.
    if (missing.length > 0) {
      const key = missing[0].key;
      const field = bodyRef.current?.querySelector<HTMLElement>(`[data-pick="${key}"]`);
      // Une option de l'article choisi : c'est la ligne de l'article qui
      // remonte en haut, ses options dessous — sinon elle passait sous
      // l'en-tête épinglé.
      const etapeId = key.split("/")[0];
      const anchor = key.includes("/")
        ? bodyRef.current?.querySelector<HTMLElement>(`[data-options="${etapeId}"]`)
            ?.previousElementSibling
        : field;
      anchor?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      // Le groupe manquant, s'il reste sous le pied épinglé, remonte aussi.
      if (anchor !== field) field?.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
      field?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
      setFlash((current) => ({ key, n: (current?.n ?? 0) + 1 }));
      return;
    }
    const selections: FormuleSelection[] = [];
    // Le panier montre une ligne par étape : l'article, puis ses options.
    const optionSummary: string[] = [];
    for (const etape of formule.etapes) {
      const article = pickedArticle(etape.id);
      if (!article) continue;
      const chosen = picks[etape.id].options;
      const choices: CartChoice[] = [];
      const parts = [
        article.supplement > 0
          ? `${article.name} +${formatPrice(article.supplement)}`
          : article.name,
      ];
      const groups = article.options ?? [];
      for (const group of groups) {
        for (const choice of group.choices) {
          if (!chosen[group.id]?.includes(choice.id)) continue;
          choices.push({ group_id: group.id, choice_id: choice.id });
          // Plusieurs groupes : chaque choix dit le sien, comme pour un plat
          // (« Coulis : Caramel » après « Nappage : Caramel »).
          const name =
            groups.length > 1 && !choice.name.startsWith(group.name)
              ? `${group.name}\u00a0: ${choice.name}`
              : choice.name;
          parts.push(
            choice.supplement > 0 ? `${name} +${formatPrice(choice.supplement)}` : name
          );
        }
      }
      // « Dessert : Crêpes (Nappage : Caramel · Boule de glace : Chocolat
      // +2,00 €) » : l'article à part de ses options, le « · » des plats.
      const [articleLabel, ...optionParts] = parts;
      optionSummary.push(
        `${etape.name}\u00a0: ${articleLabel}${
          optionParts.length > 0 ? ` (${optionParts.join(" · ")})` : ""
        }`
      );
      selections.push({ etape_id: etape.id, article_id: article.id, choices });
    }
    const signature = selections
      .map((s) =>
        [s.etape_id, s.article_id, ...s.choices.map((c) => `${c.group_id}:${c.choice_id}`).sort()].join(",")
      )
      .join("|");
    addLine({
      key: `formule:${formule.id}#${signature}`,
      itemId: formule.id,
      name: formule.name,
      unitPrice,
      optionSummary,
      choices: [],
      formule: { selections },
    });
    track("panier");
    close();
  };

  return (
    <Sheet
      onClosed={onClose}
      backdropCloses={Object.keys(picks).length === 0}
      labelledBy={titleId}
    >
      {(close) => (
        <>
          {/* Titre et prix épinglés, comme la feuille d'options d'un plat. */}
          <div className="border-b border-hairline px-6 pb-4 pt-6">
            <div className="flex items-baseline justify-between gap-4">
              <h3 id={titleId} className="font-display text-xl font-medium">
                {formule.name}
              </h3>
              <span className="dish-price shrink-0 font-display text-lg text-ember-1">
                {formatPrice(unitPrice)}
              </span>
            </div>
            {formule.description && (
              <p className="mt-1 text-sm text-muted">{typographie(formule.description)}</p>
            )}
            {canOrder && (
              <p
                // Deux lignes réservées d'avance : l'en-tête ne grandit pas en
              // cours de composition, les choix ne glissent pas sous le doigt.
              className={`mt-1.5 line-clamp-2 min-h-[2lh] text-xs ${Object.keys(picks).length > 0 ? "text-foreground" : "text-muted"}`}
              >
                {recap.map((part, i) => (
                  // Le « · » reste avec le choix qui le précède : une ligne
                  // ne commence jamais par lui (comme au panier).
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
            {canOrder ? (
              <div className="flex flex-col gap-6">
                {formule.etapes.map((etape) => {
                  const pick = picks[etape.id];
                  return (
                    <div
                      key={etape.id}
                      data-pick={etape.id}
                      className={`-m-2 scroll-mt-3 p-2 ${flashClass(etape.id)}`}
                    >
                      <fieldset>
                        <legend className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
                          {etape.name}
                          <ChoiceHint required={etape.obligatoire} done={Boolean(pick)} />
                        </legend>
                        <div className="flex flex-col gap-2">
                          {!etape.obligatoire && (
                            <label className={choiceRowClass(!pick)}>
                              <span className="flex items-center gap-2.5">
                                <input
                                  type="radio"
                                  name={etape.id}
                                  checked={!pick}
                                  onChange={() => clearArticle(etape.id)}
                                  className="accent-ember-2"
                                />
                                Aucun
                              </span>
                            </label>
                          )}
                          {etape.articles.map((article) => {
                            const checked = pick?.articleId === article.id;
                            return (
                              <div key={article.id} className="flex flex-col gap-2">
                                {/* scroll-mt-3 : ramenée en haut (option manquante),
                                    la ligne s'arrête sous l'en-tête, pas contre lui. */}
                                <label className={`scroll-mt-3 ${choiceRowClass(checked)}`}>
                                  <span className="flex items-center gap-2.5">
                                    <input
                                      type="radio"
                                      name={etape.id}
                                      required={etape.obligatoire}
                                      checked={checked}
                                      onChange={() => pickArticle(etape.id, article)}
                                      className="accent-ember-2"
                                    />
                                    <span>
                                      {article.name}
                                      {article.detail && (
                                        <span className="ml-1.5 text-xs text-muted">
                                          {article.detail}
                                        </span>
                                      )}
                                    </span>
                                  </span>
                                  {article.supplement > 0 && (
                                    <span className="text-muted">
                                      +{formatPrice(article.supplement)}
                                    </span>
                                  )}
                                </label>
                                {checked && (article.options?.length ?? 0) > 0 && (
                                  <div
                                    data-options={etape.id}
                                    className="ml-6 flex flex-col gap-4 pb-1 pt-1"
                                  >
                                    {article.options!.map((group) => {
                                      const chosen = pick.options[group.id] ?? [];
                                      const key = `${etape.id}/${group.id}`;
                                      return (
                                        <div
                                          key={group.id}
                                          data-pick={key}
                                          className={`-m-2 scroll-mt-3 p-2 ${flashClass(key)}`}
                                        >
                                          <fieldset>
                                            <legend className="mb-1.5 flex items-baseline gap-2 text-xs font-semibold">
                                              {group.name}
                                              <ChoiceHint
                                                required={group.obligatoire}
                                                multiple={group.multiple}
                                                done={chosen.length > 0}
                                              />
                                            </legend>
                                            <div className="flex flex-col gap-1.5">
                                              {/* Un supplément coché par erreur se retire : sans
                                                  « Aucun », un bouton radio ne se décoche pas. */}
                                              {!group.obligatoire && !group.multiple && (
                                                <label className={choiceRowClass(chosen.length === 0)}>
                                                  <span className="flex items-center gap-2.5">
                                                    <input
                                                      type="radio"
                                                      name={key}
                                                      checked={chosen.length === 0}
                                                      onChange={() => setOption(etape.id, group.id, [])}
                                                      className="accent-ember-2"
                                                    />
                                                    Aucun
                                                  </span>
                                                </label>
                                              )}
                                              {group.choices.map((choice) => {
                                                const on = chosen.includes(choice.id);
                                                return (
                                                  <label key={choice.id} className={choiceRowClass(on)}>
                                                    <span className="flex items-center gap-2.5">
                                                      <input
                                                        type={group.multiple ? "checkbox" : "radio"}
                                                        name={key}
                                                        required={group.obligatoire && !group.multiple}
                                                        checked={on}
                                                        onChange={() => toggleOption(etape.id, group, choice.id)}
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
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </fieldset>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Sans QR code, rien ne se commande : la formule se lit comme
              // une carte, sans cases à cocher.
              <div className="flex flex-col gap-5">
                {formule.etapes.map((etape) => (
                  <section key={etape.id}>
                    <h4 className="group-title mb-1.5 text-sm font-semibold">{etape.name}</h4>
                    <p className="text-sm leading-relaxed text-muted">
                      {etape.articles
                        .map((article) =>
                          article.supplement > 0
                            ? `${article.name} (+${formatPrice(article.supplement)})`
                            : article.name
                        )
                        .join(" · ")}
                    </p>
                  </section>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-hairline bg-surface p-4">
            <button
              type="button"
              onClick={close}
              className="min-h-11 rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold max-[399px]:px-3.5 max-[399px]:text-[13px]"
            >
              {canOrder ? "Annuler" : "Fermer"}
            </button>
            {canOrder ? (
              <button
                type="button"
                onClick={() => confirm(close)}
                // Incomplet, il reste actif : il emmène au choix qui manque.
                className={`min-h-11 min-w-0 flex-1 rounded-full px-5 py-2.5 text-sm font-semibold max-[389px]:px-3 max-[389px]:text-[13px] ${
                  missing.length > 0
                    ? "border border-hairline bg-surface-raised text-foreground"
                    : "ember-gradient text-background"
                }`}
              >
                <span aria-live="polite" className="block text-balance leading-tight">
                  {missing.length > 0
                    ? `Choisir\u00a0: ${missing[0].label}`
                    : `Ajouter · ${formatPrice(unitPrice)}`}
                </span>
              </button>
            ) : (
              orderingEnabled && (
                <p className="flex-1 text-xs text-muted">
                  Sur place, scannez le QR code de votre table pour commander.
                </p>
              )
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}

/** Les jours communs aux offres (« vendredi, samedi et dimanche ») ; rien
    si elles valent tous les jours ou n'ont pas les mêmes. */
function sharedDays(formules: Formule[]): string | null {
  const key = (days?: number[]) => (days ? [...days].sort().join() : "");
  const [first, ...rest] = formules;
  if (!first?.days || rest.some((formule) => key(formule.days) !== key(first.days))) {
    return null;
  }
  return first.days.length < 7 ? formatDays(first.days) : null;
}

/**
 * Le visuel des offres. Au téléphone, une image par offre (sa moitié du
 * visuel, recadrée) : une offre entière à l'écran, jamais un mot coupé. Les
 * panneaux se balaient au doigt ou par leurs points, et passent seuls de
 * l'un à l'autre jusqu'au premier geste du client — toucher, molette,
 * survol, focus, un point ; le mouvement réduit l'empêche. Dès 640 px, le
 * visuel entier, immobile, découpé en zones égales : chacune ouvre sa
 * formule.
 */
function OffersArt({
  banner,
  zones,
  onOpen,
  onActive,
}: {
  banner: Banner;
  zones: (Formule | undefined)[];
  onOpen: (formule: Formule) => void;
  /** Le panneau à l'écran ; null quand le visuel entier est visible. */
  onActive: (index: number | null) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const stopTimer = useRef<() => void>(() => {});
  const [active, setActive] = useState<number | null>(null);
  const last = zones.length - 1;

  const measure = () => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const index = max > 1 && last > 0 ? Math.round((el.scrollLeft / max) * last) : null;
    setActive(index);
    onActive(index);
  };

  const show = (index: number, behavior: ScrollBehavior) => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: (max * index) / last, behavior });
  };

  useEffect(() => {
    const el = scroller.current;
    measure();
    if (!el || last < 1) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Hors de l'écran, il attend ; une feuille ouverte par-dessus aussi.
    let visible = true;
    const watch = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    watch.observe(el);
    let index = 0;
    const timer = setInterval(() => {
      if (
        !visible ||
        el.scrollWidth - el.clientWidth <= 1 ||
        document.querySelector("[role=dialog]")
      ) {
        return;
      }
      index = (index + 1) % zones.length;
      show(index, "smooth");
      // Un seul tour, jusqu'à la première offre : ensuite, le visuel se tait.
      if (index === 0) stop();
    }, banner.secondsPerFormule * 1000);
    const stop = () => {
      clearInterval(timer);
      watch.disconnect();
    };
    stopTimer.current = stop;
    // Tout geste dans le bloc des offres — le visuel, ses points, une carte —
    // l'arrête : le client a pris la main.
    const block = el.closest("section") ?? el;
    const gestures = ["pointerdown", "wheel", "mouseenter", "focusin"] as const;
    for (const gesture of gestures) {
      block.addEventListener(gesture, stop, { once: true, passive: true });
    }
    return () => {
      stop();
      for (const gesture of gestures) block.removeEventListener(gesture, stop);
    };
    // measure, show et onActive ne changent rien au minuteur : un seul par visuel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner, zones.length, last]);

  // Les panneaux suivants attendent la fin du chargement de la page : hors
  // champ mais dans le rail horizontal, le navigateur les demandait avec
  // l'affiche et le premier panneau, sur la même bande passante. Le premier
  // passage du carrousel n'a lieu que plusieurs secondes après.
  const pageLoaded = useSyncExternalStore(
    (notify) => {
      window.addEventListener("load", notify);
      return () => window.removeEventListener("load", notify);
    },
    () => document.readyState === "complete",
    () => false
  );

  // Le premier panneau est dans le premier écran du téléphone : demandé dès
  // l'en-tête du document, au téléphone seulement (sm de Tailwind, comme la
  // <source> vide des panneaux).
  const [firstPanel] = banner.phonePanels;
  if (firstPanel) {
    preload(firstPanel.src, {
      as: "image",
      fetchPriority: "high",
      media: "(max-width: 39.99rem)",
    });
  }

  return (
    <>
      <div
        ref={scroller}
        onScroll={measure}
        // Les cartes sous le visuel sont le chemin du clavier : le défilement
        // ne prend pas de tabulation à lui seul.
        tabIndex={-1}
        className="offers-art no-scrollbar -mx-5 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain sm:mx-0 sm:block sm:rounded-2xl"
      >
        {/* Zones et panneaux au doigt et à la souris ; au clavier et aux
            lecteurs d'écran, les cartes des offres sous le visuel. */}
        {banner.phonePanels.map((panel, index) => {
          const formule = zones[index];
          return (
            <button
              key={panel.src}
              type="button"
              tabIndex={-1}
              aria-hidden
              disabled={!formule}
              onClick={() => formule && onOpen(formule)}
              className="w-full shrink-0 snap-center bg-cover bg-center sm:hidden"
              // Sa miniature floue tient la place pendant qu'il arrive.
              style={panel.placeholder ? { backgroundImage: `url(${panel.placeholder})` } : undefined}
            >
              {/* Dès 640 px, les panneaux sont masqués : une <img> masquée se
                  télécharge quand même. La source des écrans plus larges est
                  une image vide en ligne — rien ne part sur le réseau. Dans un
                  <picture>, React ne la précharge pas non plus (le premier
                  panneau l'est plus haut, au téléphone seulement). */}
              <picture>
                <source media="(min-width: 40rem)" srcSet={EMPTY_IMAGE} />
                <img
                  src={index === 0 || pageLoaded ? panel.src : undefined}
                  alt=""
                  width={panel.width}
                  height={panel.height}
                  // Le second attend son tour.
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  className="block h-auto w-full"
                />
              </picture>
            </button>
          );
        })}
        <div className="relative max-sm:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- actif local de marque, dimensions connues */}
          <img
            src={banner.src}
            alt={banner.alt}
            width={banner.width}
            height={banner.height}
            // Au téléphone il reste masqué : paresseux, il n'y est pas chargé.
            loading="lazy"
            className="block h-auto w-full"
          />
          <div aria-hidden className="absolute inset-0 flex">
            {zones.map((formule, index) => (
              <button
                key={formule?.id ?? index}
                type="button"
                tabIndex={-1}
                disabled={!formule}
                onClick={() => formule && onOpen(formule)}
                className="flex-1 transition-colors hover:bg-white/5 active:bg-white/10 disabled:pointer-events-none"
              />
            ))}
          </div>
        </div>
      </div>
      {/* Au téléphone, un point par offre : où l'on est, et de quoi passer à
          l'autre sans deviner que le visuel se balaie. */}
      {/* Comme le visuel qu'ils pilotent, masqués aux lecteurs d'écran et hors
          tabulation : les cartes des offres, dessous, sont le chemin du clavier. */}
      {last > 0 && (
        <div aria-hidden className="mt-1 flex justify-center sm:hidden">
          {zones.map((formule, index) => (
            <button
              key={formule?.id ?? index}
              type="button"
              tabIndex={-1}
              onClick={() => {
                stopTimer.current();
                show(
                  index,
                  matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
                );
              }}
              // rounded-full : l'anneau de focus fait le tour du point, pas un carré.
              className="flex size-11 items-center justify-center rounded-full"
            >
              <span
                className={`block size-1.5 rounded-full transition-colors ${
                  active === index ? "bg-ember-1" : "bg-hairline ring-1 ring-muted/60"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Les offres sous l'affiche : leur visuel, puis une carte par offre — le nom,
 * ce qu'elle comprend, son prix — qui ouvre sa composition.
 */
export function FormulesBanner({
  banner,
  formules,
}: {
  banner: Banner;
  formules: Formule[];
}) {
  const { canOrder, lines } = useCart();
  const [open, setOpen] = useState<Formule | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  // Combien de chaque formule sont au panier, toutes compositions confondues.
  const inCart = (formule: Formule) =>
    lines
      .filter((line) => line.formule && line.itemId === formule.id)
      .reduce((sum, line) => sum + line.quantity, 0);
  const zones = banner.formules.map((name) =>
    formules.find((formule) => formule.name === name)
  );
  const days = sharedDays(zones.filter((formule) => formule !== undefined));

  return (
    <section
      aria-labelledby={titleId}
      className="offers hero-entrance mx-auto w-full max-w-3xl px-5 pb-14 pt-1 md:pt-10"
      style={{ animationDelay: "250ms" }}
    >
      <div className="mb-5 flex flex-col items-center text-center lg:mb-6">
        {/* Le nom des offres (« Côté Jardin ») : au téléphone, les panneaux
            recadrés n'ont plus le logo central qui le portait. */}
        {(banner.title || days) && (
          <p className="offers-days text-balance text-xs font-semibold uppercase tracking-[0.26em] text-ember-1 max-[359px]:tracking-[0.18em]">
            {[banner.title, days].filter(Boolean).join(" · ")}
          </p>
        )}
        <h2
          id={titleId}
          className="offers-title mt-2 font-display text-4xl font-medium leading-none tracking-tight lg:text-5xl"
        >
          Nos offres
        </h2>
        <span aria-hidden className="offers-rule ember-gradient mt-4 h-px w-16 opacity-60" />
      </div>

      <OffersArt
        banner={banner}
        zones={zones}
        // Le visuel est masqué aux lecteurs d'écran : la feuille rendra le
        // focus à la carte de l'offre, son équivalent au clavier.
        onOpen={(formule) => {
          document
            .querySelector<HTMLElement>(`[data-formule="${formule.id}"]`)
            ?.focus({ preventScroll: true });
          setOpen(formule);
        }}
        onActive={setActive}
      />

      <ul className="mt-4 grid grid-cols-2 gap-3 lg:mt-5 lg:gap-4">
        {zones.map(
          (formule, index) =>
            formule && (
              <li key={formule.id} className="flex">
                <button
                  type="button"
                  onClick={(event) => {
                    // Safari ne donne pas le focus au bouton touché (voir Sheet).
                    event.currentTarget.focus({ preventScroll: true });
                    setOpen(formule);
                  }}
                  aria-haspopup="dialog"
                  data-formule={formule.id}
                  data-active={active === index || undefined}
                  className="offer-ticket relative flex w-full flex-col items-start rounded-2xl border border-hairline bg-surface/70 p-4 text-left transition-colors hover:border-ember-1/50 data-[active]:border-ember-1/60 lg:p-5"
                >
                  {inCart(formule) > 0 && (
                    <span className="cart-count absolute -right-1.5 -top-1.5 flex min-w-7 items-center justify-center rounded-full bg-ember-1 px-2 py-1 text-xs font-bold text-background shadow-lg">
                      {inCart(formule)}
                      <span className="sr-only"> au panier</span>
                    </span>
                  )}
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                    Formule
                  </span>
                  <span className="offer-name mt-1 font-display text-[2rem] italic leading-none lg:text-4xl">
                    {shortName(formule.name)}
                  </span>
                  {formule.description && (
                    <span className="mt-2 text-[13px] leading-snug text-muted lg:text-base">
                      {typographie(formule.description)}
                    </span>
                  )}
                  <span className="mt-auto flex w-full flex-wrap items-baseline justify-between gap-x-2 gap-y-1 pt-4">
                    <span className="dish-price font-display text-[1.35rem] leading-none text-ember-1">
                      {formatPrice(formule.price)}
                    </span>
                    {/* Sans QR code, la formule se consulte seulement. */}
                    <span className="offer-cta text-xs font-semibold uppercase tracking-[0.14em]">
                      {canOrder ? "Composer" : "Voir"}
                    </span>
                  </span>
                </button>
              </li>
            )
        )}
      </ul>
      {open && <FormuleModal formule={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

/** Un GIF transparent d'un pixel : la <source> d'une image à ne pas charger. */
const EMPTY_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** Nom affiché en grand : « Formule » est déjà écrit au-dessus. */
function shortName(name: string): string {
  return name.replace(/^formule\s+/i, "") || name;
}

/**
 * Une offre dessinée en code, sans visuel : le nom en grand, le contenu, le
 * prix en pastille. Les teintes alternent pour que deux offres voisines ne
 * se confondent pas.
 */
export function FormuleTile({
  formule,
  index,
  onOpen,
  className = "",
}: {
  formule: Formule;
  index: number;
  onOpen: () => void;
  className?: string;
}) {
  const tint = index % 2 === 0 ? "from-ember-1/25" : "from-ember-3/25";
  return (
    <button
      type="button"
      onClick={(event) => {
        // Safari ne donne pas le focus au bouton touché (voir Sheet).
        event.currentTarget.focus({ preventScroll: true });
        onOpen();
      }}
      className={`relative flex flex-col justify-between gap-3 overflow-hidden rounded-2xl border border-ember-2/30 bg-linear-to-br ${tint} to-surface p-5 text-left transition-transform active:scale-[0.98] ${className}`}
    >
      <span
        aria-hidden
        className="ember-gradient absolute -right-12 -top-12 size-40 rounded-full opacity-20 blur-2xl"
      />
      <span>
        <span className="ember-text block text-[11px] font-semibold uppercase tracking-[0.28em]">
          Formule
        </span>
        <span className="mt-1 block font-display text-4xl font-medium italic leading-none">
          {shortName(formule.name)}
        </span>
      </span>
      <span className="text-xs font-medium uppercase tracking-wider text-muted">
        {formule.description ||
          formule.etapes.map((etape) => etape.name).join(" + ")}
      </span>
      <span className="flex items-center justify-between gap-3">
        <span className="ember-gradient rounded-full px-3 py-1 font-display text-lg font-semibold text-background">
          {formatPrice(formule.price)}
        </span>
        <span className="text-xs font-semibold text-muted">Composer →</span>
      </span>
    </button>
  );
}

/** Les formules en tête de carte, pour un restaurant sans visuel dédié. */
export function FormulesSection({ formules }: { formules: Formule[] }) {
  const [open, setOpen] = useState<Formule | null>(null);

  return (
    <Reveal>
      <section id="formules" className="scroll-mt-28 lg:scroll-mt-32">
        <div className="mb-6 flex items-baseline gap-4 lg:mb-8">
          <h2
            tabIndex={-1}
            className="category-heading font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl"
          >
            Formules
          </h2>
          <span aria-hidden className="category-rule ember-gradient h-px flex-1 opacity-40" />
        </div>
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:gap-5">
          {formules.map((formule, index) => (
            <FormuleTile
              key={formule.id}
              formule={formule}
              index={index}
              onOpen={() => setOpen(formule)}
              className="min-h-44"
            />
          ))}
        </div>
        {open && <FormuleModal formule={open} onClose={() => setOpen(null)} />}
      </section>
    </Reveal>
  );
}

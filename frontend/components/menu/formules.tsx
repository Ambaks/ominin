"use client";

import { Fragment, useId, useRef, useState } from "react";
import {
  ChoiceRecap,
  ChoiceRow,
  ChoiceTag,
  GroupChoices,
  pickFrameClass,
  requiredGroup,
  sheetCancelClass,
  sheetConfirmClass,
  revealAboveCartBar,
  revealMissing,
  scrollBehavior,
  type Flash,
} from "@/components/menu/add-to-order";
import { heroDelay } from "@/components/menu/hero-delay";
import { Sheet } from "@/components/menu/sheet";
import type { Article, Formule } from "@/lib/gestion/types";
import {
  useCart,
  type CartChoice,
  type FormuleSelection,
} from "@/lib/menu/cart";
import {
  FORMULES_LINK,
  formatPrice,
  type FormulesBanner as Banner,
  type OptionGroup,
} from "@/lib/menu-data";

/*
 * Formules du menu QR : un choix par étape (« Soft », « Dessert »), puis les
 * options de l'article retenu, comme pour un plat seul. La formule rejoint le
 * panier en une ligne ; la base revérifie prix et choix (formule_line).
 */

type Picks = Record<string, { articleId: string; options: Record<string, string[]> }>;

/**
 * La formule telle qu'elle se commande en ce moment : sans les choix dont le
 * plat est fermé (cuisine fermée) ; une étape obligatoire vidée l'emporte,
 * comme un plat épuisé au rendu de la page.
 */
function openFormule(
  formule: Formule,
  closed: ReadonlySet<string>
): Formule | null {
  const etapes = formule.etapes.map((etape) => ({
    ...etape,
    articles: etape.articles.filter(
      (article) => !article.itemId || !closed.has(article.itemId)
    ),
  }));
  const kept = etapes.filter((etape) => etape.articles.length > 0);
  return kept.length > 0 &&
    etapes.every((etape) => !etape.obligatoire || etape.articles.length > 0)
    ? { ...formule, etapes: kept }
    : null;
}

/**
 * La formule telle qu'elle se commande, ou null. En click & collect, la
 * fermeture se juge à l'heure de retrait : au panier.
 */
function useServable(): (formule: Formule) => Formule | null {
  const { closed, collect } = useCart();
  return (formule) => (collect ? formule : openFormule(formule, closed));
}

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

function FormuleModal({
  formule,
  onClose,
  onAdded,
}: {
  formule: Formule;
  onClose: () => void;
  onAdded?: () => void;
}) {
  const { orderingEnabled, canOrder, addLine, track } = useCart();
  const [picks, setPicks] = useState<Picks>({});
  const [flash, setFlash] = useState<Flash>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Au doigt seulement, la feuille amène les questions d'un plat choisi (voir
  // la feuille d'un plat) : au clavier, le focus reste sur le choix.
  const pointer = useRef(false);
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

  // Une étape n'est acquise qu'avec les questions obligatoires de son plat
  // répondues : coche de l'étape et récapitulatif disent la même chose que
  // le bouton (« Choisir : Préparation du poulet »).
  const etapeDone = (etapeId: string) =>
    Boolean(picks[etapeId]) && !missing.some((m) => m.key.startsWith(`${etapeId}/`));

  /* Ce qui est composé, étape par étape : la liste dépasse l'écran dès
     qu'un plat ouvre ses questions. Une étape qui attend s'y lit estompée,
     sauf si la description du gérant les nomme déjà (« Entrée, plat,
     dessert ») : la même liste se répétait deux fois. */
  const recap = formule.etapes.flatMap((etape) => {
    const article = pickedArticle(etape.id);
    if (article) return [{ id: etape.id, text: article.name, done: etapeDone(etape.id) }];
    return formule.description ? [] : [{ id: etape.id, text: etape.name, done: false }];
  });

  // Un plat de la formule ouvre des questions sous lui.
  const hasQuestions = formule.etapes.some((etape) =>
    etape.articles.some((article) => article.options?.length)
  );

  const unitPrice = formule.etapes.reduce((sum, etape) => {
    const article = pickedArticle(etape.id);
    return article
      ? sum + article.supplement + optionsSupplement(article, picks[etape.id].options)
      : sum;
  }, formule.price);

  // Une étape ou un groupe enfin choisi n'a plus à être signalé (en
  // mouvement réduit, le surlignage est fixe).
  const clearFlash = (key: string) =>
    setFlash((current) =>
      current && (current.key === key || current.key.startsWith(`${key}/`)) ? null : current
    );

  const pickArticle = (etapeId: string, article: Article) => {
    clearFlash(etapeId);
    setPicks((current) =>
      current[etapeId]?.articleId === article.id
        ? current
        : { ...current, [etapeId]: { articleId: article.id, options: {} } }
    );
    // Ses questions (cuisson, accompagnement…) s'ouvrent sous le choix : on
    // les amène à l'écran, sinon elles restaient sous le pli.
    if (pointer.current && article.options?.length) {
      requestAnimationFrame(() =>
        bodyRef.current
          ?.querySelector(`[data-article="${etapeId}/${article.id}"]`)
          ?.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" })
      );
    }
  };

  // « Aucun » : une étape facultative retirée, ou une option facultative
  // revenue à rien.
  const clearArticle = (etapeId: string) => {
    clearFlash(etapeId);
    setPicks((current) => {
      const next = { ...current };
      delete next[etapeId];
      return next;
    });
  };

  const clearOption = (etapeId: string, groupId: string) =>
    setPicks((current) => ({
      ...current,
      [etapeId]: {
        ...current[etapeId],
        options: { ...current[etapeId].options, [groupId]: [] },
      },
    }));

  const toggleOption = (etapeId: string, group: OptionGroup, choiceId: string) => {
    clearFlash(`${etapeId}/${group.id}`);
    setPicks((current) => {
      const pick = current[etapeId];
      const previous = pick.options[group.id] ?? [];
      const next = !group.multiple
        ? [choiceId]
        : previous.includes(choiceId)
          ? previous.filter((id) => id !== choiceId)
          : [...previous, choiceId];
      return {
        ...current,
        [etapeId]: { ...pick, options: { ...pick.options, [group.id]: next } },
      };
    });
  };

  const confirm = (close: () => void) => {
    if (missing.length > 0) {
      const key = missing[0].key;
      const body = bodyRef.current;
      // La première question d'un plat s'amène avec le nom du plat au-dessus :
      // seule en haut de la liste, on ne savait plus à quel plat elle était.
      const questions = body?.querySelector<HTMLElement>(`[data-article^="${key.split("/")[0]}/"]`);
      const firstQuestion = questions?.querySelector("[data-pick]")?.getAttribute("data-pick") === key;
      revealMissing(
        firstQuestion ? questions : body?.querySelector<HTMLElement>(`[data-pick="${key}"]`),
        key,
        setFlash
      );
      return;
    }
    const selections: FormuleSelection[] = [];
    const items: { id: string; name: string }[] = [];
    const optionSummary: string[] = [];
    // Une entrée par étape, ses choix après un tiret, leurs suppléments notés
    // comme ceux d'un plat : « Plat : Faux filet — Bleu, Purée en plus
    // (+4,00 €) ». À la suite des étapes, « Bleu » ne disait plus de quel plat.
    for (const etape of formule.etapes) {
      const article = pickedArticle(etape.id);
      if (!article) continue;
      const chosen = picks[etape.id].options;
      const choices: CartChoice[] = [];
      const extras: string[] = [];
      for (const group of article.options ?? []) {
        for (const choice of group.choices) {
          if (!chosen[group.id]?.includes(choice.id)) continue;
          choices.push({ group_id: group.id, choice_id: choice.id });
          extras.push(
            choice.supplement > 0
              ? `${choice.name} (+${formatPrice(choice.supplement)})`
              : choice.name
          );
        }
      }
      optionSummary.push(
        `${etape.name}\u00a0: ${article.name}` +
          (article.supplement > 0 ? ` (+${formatPrice(article.supplement)})` : "") +
          (extras.length > 0 ? ` — ${extras.join(", ")}` : "")
      );
      selections.push({ etape_id: etape.id, article_id: article.id, choices });
      if (article.itemId) items.push({ id: article.itemId, name: article.name });
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
      formule: { selections, items },
    });
    track("panier");
    onAdded?.();
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
        {/* data-questions : la feuille prend d'emblée toute sa hauteur
            (globals.css). */}
        <div
          className="formule-sheet border-b border-hairline px-6 pb-4 pt-6"
          data-questions={hasQuestions || undefined}
        >
          <div className="flex items-baseline justify-between gap-4">
            <h3 id={titleId} className="font-display text-xl font-medium">
              {formule.name}
            </h3>
            <span className="dish-price shrink-0 font-display text-lg text-ember-1">
              {formatPrice(unitPrice)}
            </span>
          </div>
          {/* La description du gérant (« midi uniquement… ») reste entière ;
              dessous, deux lignes réservées au récapitulatif : il s'allonge
              sans faire descendre la liste sous le doigt. */}
          {formule.description && (
            <p className="mt-1 text-sm text-muted">{formule.description}</p>
          )}
          {formule.etapes.length > 1 && (
            <ChoiceRecap parts={recap} className="mt-1.5 min-h-[2lh]" />
          )}
        </div>
        <div
          ref={bodyRef}
          // relative : les textes masqués (« choix fait ») se placent dans la
          // liste, comme dans la feuille d'un plat.
          className="relative flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5"
          onPointerDown={() => {
            pointer.current = true;
          }}
          onKeyDown={() => {
            pointer.current = false;
          }}
        >
          <div className="flex flex-col gap-6">
            {formule.etapes.map((etape) => {
              const pick = picks[etape.id];
              const picked = pickedArticle(etape.id);
              return (
                <div
                  key={etape.id}
                  data-pick={etape.id}
                  className={pickFrameClass(flash, etape.id)}
                >
                  <fieldset {...requiredGroup(etape)}>
                    <legend className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
                      {etape.name}{" "}
                      <ChoiceTag required={etape.obligatoire} done={etapeDone(etape.id)} />
                    </legend>
                    <div className="flex flex-col gap-2">
                      {!etape.obligatoire && (
                        <ChoiceRow
                          type="radio"
                          name={etape.id}
                          checked={!pick}
                          onChange={() => clearArticle(etape.id)}
                        >
                          Aucun
                        </ChoiceRow>
                      )}
                      {etape.articles.map((article) => {
                        const detailId = `${titleId}${etape.id}-${article.id}`;
                        return (
                          <ChoiceRow
                            key={article.id}
                            type="radio"
                            name={etape.id}
                            checked={pick?.articleId === article.id}
                            onChange={() => pickArticle(etape.id, article)}
                            supplement={article.supplement}
                            describedBy={article.detail ? detailId : undefined}
                          >
                            <span>
                              {article.name}
                              {/* La composition se lit en description : dans
                                  le nom, chaque salade s'annonçait par toute
                                  sa recette. */}
                              {article.detail && (
                                <span id={detailId} aria-hidden className="text-xs text-muted">
                                  {" "}
                                  {article.detail}
                                </span>
                              )}
                            </span>
                          </ChoiceRow>
                        );
                      })}
                    </div>
                  </fieldset>
                  {/* Les questions du plat retenu suivent l'étape, hors de son
                      groupe (un groupe de radios ne contient que ses radios),
                      sous le nom du plat qu'elles complètent. */}
                  {picked?.options?.length ? (
                    <div
                      role="group"
                      aria-labelledby={`${titleId}${etape.id}-questions`}
                      data-article={`${etape.id}/${picked.id}`}
                      className="ml-4 mt-4 flex scroll-mb-4 flex-col gap-3"
                    >
                      <p id={`${titleId}${etape.id}-questions`} className="text-sm font-semibold">
                        {picked.name}
                      </p>
                      {picked.options.map((group) => (
                        <div
                          key={group.id}
                          data-pick={`${etape.id}/${group.id}`}
                          className={pickFrameClass(flash, `${etape.id}/${group.id}`)}
                        >
                          {/* Un groupe, une question : « Purée » se lit
                              sous « Accompagnement », pas sous « Plat ». */}
                          <fieldset className="flex flex-col gap-1.5" {...requiredGroup(group)}>
                            <legend className="mb-1.5 flex items-baseline gap-2 text-xs font-semibold">
                              {group.name}{" "}
                              <ChoiceTag
                                required={group.obligatoire}
                                multiple={group.multiple}
                                done={Boolean(pick.options[group.id]?.length)}
                              />
                            </legend>
                            <GroupChoices
                              group={group}
                              name={`${etape.id}/${group.id}`}
                              chosen={pick.options[group.id] ?? []}
                              onToggle={(choiceId) => toggleOption(etape.id, group, choiceId)}
                              onClear={() => clearOption(etape.id, group.id)}
                            />
                          </fieldset>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-hairline bg-surface p-4">
          <button type="button" onClick={close} className={sheetCancelClass}>
            {canOrder ? "Annuler" : "Fermer"}
          </button>
          {canOrder ? (
            <button
              type="button"
              onClick={() => confirm(close)}
              // Incomplet, il reste actif : il emmène au choix qui manque.
              className={sheetConfirmClass(missing.length === 0)}
            >
              <span aria-live="polite" className="block text-balance leading-tight">
                {missing.length > 0
                  ? `Choisir : ${missing[0].label}`
                  : `Ajouter · ${formatPrice(unitPrice)}`}
              </span>
            </button>
          ) : (
            orderingEnabled && (
              <p className="flex-1 text-xs text-muted">
                Scannez le Cachet de votre table pour commander.
              </p>
            )
          )}
        </div>
        </>
      )}
    </Sheet>
  );
}

/**
 * Le bandeau défile en continu : la piste porte trois copies (le keyframe
 * `marquee` recule d'un tiers). Seule la première compte pour les lecteurs
 * d'écran et le clavier, les boutons sous le bandeau font le reste.
 */
const MARQUEE_COPIES = [0, 1, 2];

/** Le visuel des formules, découpé en zones : chacune ouvre sa formule. */
export function FormulesBanner({
  banner,
  formules,
}: {
  banner: Banner;
  formules: Formule[];
}) {
  const [open, setOpen] = useState<Formule | null>(null);
  const servable = useServable();
  const shown = formules.flatMap((formule) => servable(formule) ?? []);
  const zones = banner.formules.map((name) =>
    shown.find((formule) => formule.name === name)
  );
  // Proposée aujourd'hui mais fermée en ce moment : sa zone le dit, au lieu
  // de rester muette sous le doigt.
  const closedZone = (index: number) =>
    formules.some((formule) => formule.name === banner.formules[index]);
  const duration = banner.secondsPerFormule * zones.length;

  return (
    <div
      className="hero-entrance mx-auto w-full max-w-3xl px-4 pt-4 pb-20"
      style={heroDelay("350ms")}
    >
      <h2 className="mb-3 text-center font-display text-2xl font-medium tracking-tight">
        Nos Offres
      </h2>
      <div className="overflow-hidden rounded-2xl motion-reduce:overflow-x-auto">
        <div
          className="marquee-track flex w-max"
          style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
        >
          {MARQUEE_COPIES.map((copy) => (
            <div
              key={copy}
              aria-hidden={copy > 0 || undefined}
              className="relative h-44 shrink-0 lg:h-60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- actif local de marque, dimensions connues */}
              <img
                src={banner.src}
                alt={copy === 0 ? banner.alt : ""}
                width={banner.width}
                height={banner.height}
                className="h-full w-auto max-w-none"
              />
              <div className="absolute inset-0 flex">
                {zones.map((formule, index) =>
                  formule ? (
                    <button
                      key={formule.id}
                      type="button"
                      tabIndex={copy > 0 ? -1 : undefined}
                      onClick={() => setOpen(formule)}
                      aria-label={`Choisir la ${formule.name}`}
                      className="flex-1 transition-colors hover:bg-white/5 active:bg-white/10"
                    />
                  ) : (
                    <span key={index} className="flex flex-1 items-end justify-center pb-3">
                      {closedZone(index) && (
                        <span className="rounded-full bg-background/85 px-3 py-1 text-xs font-semibold text-muted">
                          Plus servie
                        </span>
                      )}
                    </span>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* La marge du bas laisse la place au bouton flottant « Appeler un
          serveur », qui couvrirait sinon ces boutons. */}
      <div className="mt-2 flex gap-2">
        {zones.map((formule, index) =>
          formule ? (
            <button
              key={formule.id}
              type="button"
              onClick={() => setOpen(formule)}
              className="flex-1 rounded-full border border-hairline bg-surface/70 px-3 py-2.5 text-xs font-semibold backdrop-blur transition-colors hover:border-ember-2/50"
            >
              {formule.name} · {formatPrice(formule.price)}
            </button>
          ) : closedZone(index) ? (
            <span
              key={index}
              className="flex-1 rounded-full border border-hairline px-3 py-2.5 text-center text-xs font-semibold text-faint"
            >
              {banner.formules[index]} · Plus servie
            </span>
          ) : (
            <span key={index} className="flex-1" />
          )
        )}
      </div>
      {open && <FormuleModal formule={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** Nom affiché en grand : « Formule » est déjà écrit au-dessus. */
function shortName(name: string): string {
  return name.replace(/^formule\s+/i, "") || name;
}

/**
 * Une offre dessinée en code, sans visuel : le nom en grand, ce qu'elle
 * contient étape par étape, le prix en pastille. Les teintes alternent pour
 * que deux offres voisines ne se confondent pas.
 */
export function FormuleTile({
  formule,
  index,
  onOpen,
  closed = false,
  note,
  className = "",
}: {
  formule: Formule;
  index: number;
  onOpen: (tile: HTMLButtonElement) => void;
  /** Une étape obligatoire n'a plus rien de servi : l'offre reste, estompée. */
  closed?: boolean;
  /** Click & collect : ce qui la rend imprenable à l'heure jugée, sans la fermer. */
  note?: string;
  className?: string;
}) {
  const { lines } = useCart();
  const tint = index % 2 === 0 ? "from-ember-1/25" : "from-ember-3/25";
  const descriptionId = useId();
  const etapesId = useId();
  // Comme sous un plat : le compte au panier reste sur l'offre.
  const inCart = lines
    .filter((line) => line.itemId === formule.id)
    .reduce((sum, line) => sum + line.quantity, 0);
  return (
    // Nom court, contenu en description : sans cela, le lecteur d'écran
    // lisait chaque plat de chaque étape comme nom du bouton.
    <button
      type="button"
      disabled={closed}
      onClick={(event) => {
        // Safari ne donne pas le focus au bouton touché : la feuille le
        // retrouve en se refermant (voir AddToOrder).
        event.currentTarget.focus({ preventScroll: true });
        onOpen(event.currentTarget);
      }}
      aria-label={`${closed ? "Plus servie" : "Composer"} : ${formule.name}, ${formatPrice(formule.price)}${
        inCart > 0 ? `, ${inCart} au panier` : ""
      }`}
      aria-describedby={formule.description ? `${descriptionId} ${etapesId}` : etapesId}
      className={`formule-tile relative flex flex-col justify-between gap-3 overflow-hidden rounded-2xl border border-ember-2/30 bg-linear-to-br ${tint} to-surface p-5 text-left transition-transform active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 ${className}`}
    >
      <span
        aria-hidden
        className="formule-glow ember-gradient absolute -right-12 -top-12 size-40 rounded-full opacity-20 blur-2xl"
      />
      <span>
        <span className="ember-text block text-[11px] font-semibold uppercase tracking-[0.28em]">
          Formule
        </span>
        <span className="formule-name mt-1 block font-display text-4xl font-medium italic leading-none">
          {shortName(formule.name)}
        </span>
      </span>
      {formule.description && (
        <span
          id={descriptionId}
          className="formule-description text-xs font-medium uppercase tracking-wider text-muted"
        >
          {formule.description}
        </span>
      )}
      {/* Les crochets (formule-etape…) laissent un thème la composer comme
          la page « Menu » d'une carte : un plat par ligne. */}
      <span id={etapesId} className="formule-etapes flex flex-col gap-1 text-sm text-muted">
        {formule.etapes.map((etape) => (
          <span key={etape.id} className="formule-etape">
            <span className="formule-etape-nom font-semibold text-foreground">
              {etape.name}
            </span>
            <span className="formule-deux-points"> : </span>
            {/* « ou » devant chaque choix, comme la carte : une virgule se
                confondait avec celle d'un nom (« Tagliatelles, saumon »).
                Chaque nom d'un bloc : la ligne se coupe avant « ou », pas
                dans « Faux / filet ». */}
            {etape.articles.map((article, i) => (
              <Fragment key={article.id}>
                {i > 0 && " "}
                <span className="formule-article inline-block max-w-full">
                  {i > 0 && <span className="formule-ou">ou </span>}
                  {article.name}
                </span>
              </Fragment>
            ))}
          </span>
        ))}
      </span>
      {note && <span className="text-xs font-medium text-muted">{note}</span>}
      <span className="formule-foot flex items-center justify-between gap-3">
        <span className="ember-gradient rounded-full px-3 py-1 font-display text-lg font-semibold text-background">
          {formatPrice(formule.price)}
        </span>
        <span className="formule-action inline-flex items-center gap-1 text-xs font-semibold text-muted">
          {closed ? "Plus servie" : <>Composer <span aria-hidden>→</span></>}
          {inCart > 0 && (
            <span
              aria-hidden
              className="inline-flex min-w-6 items-center justify-center rounded-full bg-foreground px-1.5 py-0.5 text-xs font-bold text-background"
            >
              {inCart}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

/** Les formules en tête de carte, pour un restaurant sans visuel dédié. */
export function FormulesSection({ formules }: { formules: Formule[] }) {
  const servable = useServable();
  const { closed, closedAt, collect } = useCart();
  const [open, setOpen] = useState<Formule | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const added = useRef(false);

  /* Pas de révélation au défilement, comme les sections de la carte (voir
     MenuSection) : masquées jusqu'au JavaScript, les offres restaient
     blanches au premier écran. */
  return (
    <section id={FORMULES_LINK.id} className="scroll-mt-4 lg:scroll-mt-6">
      <div className="mb-6 flex items-baseline gap-4 lg:mb-8">
        <h2 className="category-heading font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
          {FORMULES_LINK.name}
        </h2>
        <span aria-hidden className="category-rule ember-gradient h-px flex-1 opacity-40" />
      </div>
      <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:gap-5">
        {formules.map((formule, index) => {
          const served = servable(formule);
          return (
            <FormuleTile
              key={formule.id}
              formule={served ?? formule}
              index={index}
              closed={served === null}
              // Click & collect : le plat se juge à l'heure de retrait ; la
              // formule reste composable, mais le client le sait d'avance.
              note={
                collect && openFormule(formule, closed) === null
                  ? closedAt
                    ? "Plus servie à l’heure choisie"
                    : "Plus servie maintenant · possible pour un retrait plus tard"
                  : undefined
              }
              onOpen={(tile) => {
                if (!served) return;
                opener.current = tile;
                added.current = false;
                setOpen(served);
              }}
              className="min-h-44"
            />
          );
        })}
      </div>
      {open && (
        <FormuleModal
          formule={open}
          onAdded={() => {
            added.current = true;
          }}
          // Après un ajout, le pied de l'offre (prix, « Composer ») passe
          // au-dessus de la barre du panier qui vient d'apparaître ; pas
          // l'offre entière, plus haute que l'écran d'un petit téléphone.
          onClose={() => {
            setOpen(null);
            if (added.current) {
              revealAboveCartBar(opener.current?.querySelector<HTMLElement>(".formule-foot") ?? null);
            }
          }}
        />
      )}
    </section>
  );
}

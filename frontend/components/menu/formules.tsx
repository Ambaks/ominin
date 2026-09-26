"use client";

import { useId, useRef, useState } from "react";
import { Reveal } from "@/components/portal/reveal";
import { choiceRowClass } from "@/components/menu/add-to-order";
import { Sheet } from "@/components/menu/sheet";
import type { Article, Formule } from "@/lib/gestion/types";
import {
  useCart,
  type CartChoice,
  type FormuleSelection,
} from "@/lib/menu/cart";
import {
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
}: {
  formule: Formule;
  onClose: () => void;
}) {
  const { orderingEnabled, tableNumber, addLine, track } = useCart();
  const [picks, setPicks] = useState<Picks>({});
  const bodyRef = useRef<HTMLDivElement>(null);
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

  const pickArticle = (etapeId: string, articleId: string) =>
    setPicks((current) =>
      current[etapeId]?.articleId === articleId
        ? current
        : { ...current, [etapeId]: { articleId, options: {} } }
    );

  const toggleOption = (etapeId: string, group: OptionGroup, choiceId: string) =>
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

  const canOrder = orderingEnabled && tableNumber !== null;

  const confirm = (close: () => void) => {
    if (missing.length > 0) {
      bodyRef.current
        ?.querySelector(`[data-pick="${missing[0].key}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const selections: FormuleSelection[] = [];
    const optionSummary: string[] = [];
    for (const etape of formule.etapes) {
      const article = pickedArticle(etape.id);
      if (!article) continue;
      const chosen = picks[etape.id].options;
      const choices: CartChoice[] = [];
      optionSummary.push(
        article.supplement > 0
          ? `${etape.name} : ${article.name} (+${formatPrice(article.supplement)})`
          : `${etape.name} : ${article.name}`
      );
      for (const group of article.options ?? []) {
        for (const choice of group.choices) {
          if (!chosen[group.id]?.includes(choice.id)) continue;
          choices.push({ group_id: group.id, choice_id: choice.id });
          optionSummary.push(
            choice.supplement > 0
              ? `${choice.name} (+${formatPrice(choice.supplement)})`
              : choice.name
          );
        }
      }
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
            <p className="mt-1 text-sm text-muted">{formule.description}</p>
          )}
        </div>
        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5"
        >
          <div className="flex flex-col gap-6">
            {formule.etapes.map((etape) => {
              const pick = picks[etape.id];
              return (
                <fieldset key={etape.id} data-pick={etape.id}>
                  <legend className="mb-2 flex items-baseline gap-2 text-sm font-semibold">
                    {etape.name}{" "}
                    <span
                      className={`text-[11px] font-medium ${etape.obligatoire ? "text-ember-2" : "text-muted"}`}
                    >
                      {etape.obligatoire ? "au choix" : "optionnel"}
                    </span>
                  </legend>
                  <div className="flex flex-col gap-2">
                    {etape.articles.map((article) => {
                      const checked = pick?.articleId === article.id;
                      return (
                        <div key={article.id} className="flex flex-col gap-2">
                          <label className={choiceRowClass(checked)}>
                            <span className="flex items-center gap-2.5">
                              <input
                                type="radio"
                                name={etape.id}
                                checked={checked}
                                onChange={() => pickArticle(etape.id, article.id)}
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
                          {checked &&
                            (article.options ?? []).map((group) => (
                              <div
                                key={group.id}
                                data-pick={`${etape.id}/${group.id}`}
                                className="ml-6 flex flex-col gap-1.5"
                              >
                                <p className="text-xs font-semibold">
                                  {group.name}{" "}
                                  <span
                                    className={`font-medium ${group.obligatoire ? "text-ember-2" : "text-muted"}`}
                                  >
                                    {group.obligatoire ? "obligatoire" : "optionnel"}
                                  </span>
                                </p>
                                {group.choices.map((choice) => {
                                  const on = pick.options[group.id]?.includes(choice.id) ?? false;
                                  return (
                                    <label key={choice.id} className={choiceRowClass(on)}>
                                      <span className="flex items-center gap-2.5">
                                        <input
                                          type={group.multiple ? "checkbox" : "radio"}
                                          name={`${etape.id}/${group.id}`}
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
                            ))}
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
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
  const zones = banner.formules.map((name) =>
    formules.find((formule) => formule.name === name)
  );
  const duration = banner.secondsPerFormule * zones.length;

  return (
    <div
      className="hero-entrance mx-auto w-full max-w-3xl px-4 pt-4 pb-20"
      style={{ animationDelay: "350ms" }}
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
                    <span key={index} className="flex-1" />
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
      onClick={onOpen}
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
          <h2 className="category-heading font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
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

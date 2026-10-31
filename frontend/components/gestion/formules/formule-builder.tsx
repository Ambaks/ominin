"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "@/components/gestion/day-picker";
import { HoursField } from "@/components/gestion/hours-field";
import { ChevronDownIcon, XIcon } from "@/components/gestion/icons";
import { Chip, GlassButton, Segmented } from "@/components/gestion/ui";
import { Field, inputClass } from "@/components/ui/field";
import { PriceInput } from "@/components/ui/price-input";
import { useToast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import * as api from "@/lib/gestion/api";
import { FORMULE_MODELES } from "@/lib/gestion/constants";
import { formatHeure } from "@/lib/gestion/fermetures";
import { formatDays, parsePriceInput, priceToInput } from "@/lib/gestion/format";
import { useGestion } from "@/lib/gestion/store";
import type { Formule } from "@/lib/gestion/types";
import type { MenuCategory } from "@/lib/menu-data";
import { moved } from "@/lib/move";
import {
  draftChoices,
  draftToEtapes,
  emptyEtape,
  etapesToDraft,
  modeleCategory,
  modeleEtapes,
  type EtapeDraft,
} from "./etape-draft";
import { EtapeSheet } from "./etape-sheet";
import { formuleSchedule } from "./formule-card";
import { FormulePreview } from "./formule-preview";
import { ALL_DAYS, WEEKDAYS, lunchWindow, quandOf, type Quand } from "./presets";

/*
 * Le constructeur de formules en trois pas (UX-SIMPLICITÉ § 6) : quelle
 * formule, le client choisit parmi quoi, quand ; l'aperçu client suit en
 * direct. Au plus quatorze contrôles visibles pour la formule type. Le modèle
 * Formule / Etape ne change pas.
 */

type Step = "1" | "2" | "3";
const STEP_ORDER: Step[] = ["1", "2", "3"];

const STEPS: { value: Step; label: string; question: string }[] = [
  { value: "1", label: "1 · Formule", question: "Quelle formule ?" },
  { value: "2", label: "2 · Choix", question: "Le client choisit parmi quoi ?" },
  { value: "3", label: "3 · Quand", question: "Quand la proposer ?" },
];

const QUAND: { value: Quand; label: string }[] = [
  { value: "toujours", label: "Toujours" },
  { value: "midi", label: "Le midi en semaine" },
  { value: "choix", label: "Je choisis" },
];

export function FormuleBuilder({
  formule,
  slot,
  categories,
  onClose,
}: {
  /** undefined ⇒ création. */
  formule?: Formule;
  /** Création depuis un emplacement d'image : la formule y est placée. */
  slot?: Formule["affiche"];
  categories: MenuCategory[];
  onClose: () => void;
}) {
  const toast = useToast();
  const dialog = useRef<HTMLDialogElement>(null);
  const openingHours = useGestion()?.etablissement.openingHours ?? null;
  const lunch = lunchWindow(openingHours);

  const [step, setStep] = useState<Step>("1");
  const [name, setName] = useState(formule?.name ?? "");
  const [price, setPrice] = useState(formule ? priceToInput(formule.price) : "");
  const [description, setDescription] = useState(formule?.description ?? "");
  const [disponible, setDisponible] = useState(formule?.disponible ?? true);
  const [quand, setQuand] = useState<Quand>(() => quandOf(formule, lunch));
  const [days, setDays] = useState<number[]>(formule?.days ?? ALL_DAYS);
  const [allDay, setAllDay] = useState(!formule?.hours);
  const [startsAt, setStartsAt] = useState(formule?.hours?.startsAt.slice(0, 5) ?? "");
  const [endsAt, setEndsAt] = useState(formule?.hours?.endsAt.slice(0, 5) ?? "");
  const [etapes, setEtapes] = useState<EtapeDraft[]>(
    formule ? etapesToDraft(formule.etapes) : []
  );
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const parsedPrice = parsePriceInput(price);
  const nameError = submitted && !name.trim() ? "Donnez un nom à la formule." : undefined;
  const priceError =
    submitted && parsedPrice === null ? "Indiquez un prix, par exemple 16,00." : undefined;
  const identityOk = Boolean(name.trim()) && parsedPrice !== null;
  const hoursOk =
    quand !== "choix" ||
    allDay ||
    (startsAt !== "" && endsAt !== "" && startsAt !== endsAt);
  const daysOk = quand !== "choix" || days.length > 0;

  // Ce que la formule retient du pas 3, selon la carte choisie.
  const schedule: Pick<Formule, "days" | "hours"> =
    quand === "toujours"
      ? {}
      : quand === "midi"
        ? { days: WEEKDAYS, hours: lunch }
        : {
            days: days.length === ALL_DAYS.length ? undefined : [...days].sort((a, b) => a - b),
            hours: allDay ? undefined : { startsAt, endsAt },
          };
  const previewEtapes = draftToEtapes(etapes, categories);

  const goTo = (next: Step) => {
    if (next !== "1" && !identityOk) {
      setSubmitted(true);
      setStep("1");
      return;
    }
    setStep(next);
  };
  const at = STEP_ORDER.indexOf(step);

  const submit = async () => {
    setSubmitted(true);
    if (!identityOk || parsedPrice === null) {
      setStep("1");
      return;
    }
    if (!hoursOk || !daysOk) {
      setStep("3");
      return;
    }
    const input: api.FormuleInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: parsedPrice,
      disponible,
      ...schedule,
      etapes: previewEtapes,
      affiche: formule ? formule.affiche : slot,
    };
    setSaving(true);
    try {
      if (formule) {
        await api.updateFormule(formule.id, input);
        toast.success(`« ${input.name} » modifiée.`);
      } else {
        await api.createFormule(input);
        toast.success(`« ${input.name} » ajoutée : vos clients la voient en tête du menu.`);
      }
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible d'enregistrer. Rechargez la page et réessayez."
      );
      setSaving(false);
    }
  };

  const openEtape = (etape: EtapeDraft) => setSheetFor(etape.id);
  const addEtape = () => {
    const etape = emptyEtape();
    setEtapes((current) => [...current, etape]);
    setSheetFor(etape.id);
  };
  const sheetEtape = etapes.find((etape) => etape.id === sheetFor);

  const current = STEPS.find((entry) => entry.value === step)!;
  const lunchLabel = `lun.–ven., ${formatHeure(lunch.startsAt)} – ${formatHeure(lunch.endsAt)}`;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
      className="m-0 mt-auto max-h-dvh w-full max-w-none bg-transparent p-0 text-foreground backdrop:bg-background/70 backdrop:backdrop-blur-sm lg:m-auto lg:max-w-5xl lg:p-6"
    >
      <div className="flex max-h-dvh flex-col overflow-hidden rounded-t-g-hero border border-hairline bg-surface-raised lg:max-h-[90dvh] lg:rounded-g-hero">
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3">
          <div className="min-w-0">
            <p className="g-eyebrow g-orders">
              {formule ? "Modifier la formule" : "Nouvelle formule"}
            </p>
            <h2 className="font-display text-g-h2 truncate">{current.question}</h2>
          </div>
          <GlassButton variant="icon" aria-label="Fermer" onClick={onClose}>
            <XIcon />
          </GlassButton>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto overscroll-contain px-5 py-5 lg:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-5">
            <Segmented<Step> glass={false} label="Pas" options={STEPS} value={step} onChange={goTo} />

            {step === "1" && (
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                  <Field label="Nom" required error={nameError}>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Formule midi"
                      aria-invalid={nameError ? true : undefined}
                      data-autofocus=""
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Prix" required error={priceError}>
                    <PriceInput value={price} onChange={setPrice} invalid={Boolean(priceError)} />
                  </Field>
                </div>

                {etapes.length === 0 && (
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-g-body font-semibold">Le client choisit…</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {FORMULE_MODELES.map((modele) => (
                        <ModeleCard
                          key={modele.join("+")}
                          modele={modele}
                          categories={categories}
                          onPick={() => {
                            setEtapes(modeleEtapes(modele, categories));
                            goTo("2");
                          }}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          addEtape();
                          goTo("2");
                        }}
                        className="g-plate g-press flex min-h-g-control flex-col justify-center gap-1 p-4 text-left"
                      >
                        <span className="text-g-body font-semibold">Je compose</span>
                        <span className="text-g-meta text-muted">
                          Une étape à la fois, parmi vos catégories ou des plats précis.
                        </span>
                      </button>
                    </div>
                  </fieldset>
                )}
              </div>
            )}

            {step === "2" && (
              <div className="flex flex-col gap-3">
                {etapes.length === 0 ? (
                  <p className="text-g-meta text-muted">
                    Aucune étape : ajoutez ce que le client choisit, dans l&rsquo;ordre du repas.
                  </p>
                ) : (
                  <ol className="m-0 flex list-none flex-col gap-2 p-0">
                    {etapes.map((etape, index) => {
                      const category = categories.find((c) => c.id === etape.categoryId);
                      const choices = draftChoices(etape, categories);
                      const label = etape.name.trim() || category?.name || `Choix ${index + 1}`;
                      return (
                        <li key={etape.id} className="g-plate flex items-center gap-2 p-2">
                          <button
                            type="button"
                            onClick={() => openEtape(etape)}
                            className="g-press flex min-h-g-control min-w-0 flex-1 flex-col justify-center rounded-g-card px-2 text-left"
                          >
                            <span className="truncate text-g-body font-semibold">
                              {index + 1} · {label}
                            </span>
                            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-g-meta text-muted">
                              {choices.length === 0 ? (
                                <Chip tone="problem">À compléter</Chip>
                              ) : (
                                <>
                                  {category ? `${category.name}, ` : ""}
                                  {choices.length} choix
                                </>
                              )}
                              {!etape.obligatoire && <Chip>facultatif</Chip>}
                            </span>
                          </button>
                          <GlassButton
                            variant="icon"
                            disabled={index === 0}
                            onClick={() => setEtapes(moved(etapes, index, -1))}
                            aria-label={`Monter ${label}`}
                          >
                            <ChevronDownIcon className="rotate-180" />
                          </GlassButton>
                          <GlassButton
                            variant="icon"
                            disabled={index === etapes.length - 1}
                            onClick={() => setEtapes(moved(etapes, index, 1))}
                            aria-label={`Descendre ${label}`}
                          >
                            <ChevronDownIcon />
                          </GlassButton>
                        </li>
                      );
                    })}
                  </ol>
                )}
                <GlassButton className="self-start" onClick={addEtape}>
                  + Ajouter un choix au client
                </GlassButton>
              </div>
            )}

            {step === "3" && (
              <div className="flex flex-col gap-4">
                <div role="radiogroup" aria-label="Quand la proposer" className="grid gap-2 sm:grid-cols-3">
                  {QUAND.map((option) => {
                    const selected = quand === option.value;
                    const sub =
                      option.value === "toujours"
                        ? "Tous les jours, toute la journée"
                        : option.value === "midi"
                          ? lunchLabel
                          : "Jours et heures à votre main";
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setQuand(option.value)}
                        className={`g-plate g-press flex flex-col gap-1 p-4 text-left ${
                          selected ? "border-ember-2/60" : ""
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2 text-g-body font-semibold">
                          {option.label}
                          <span
                            aria-hidden
                            className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                              selected ? "border-ember-2" : "border-hairline"
                            }`}
                          >
                            {selected && <span className="ember-gradient size-2.5 rounded-full" />}
                          </span>
                        </span>
                        <span className="text-g-meta text-muted">{sub}</span>
                      </button>
                    );
                  })}
                </div>
                {quand === "midi" && openingHours === null && (
                  <p className="text-g-meta text-muted">
                    Heures du midi par défaut : renseignez vos horaires dans Réglages pour qu&rsquo;elles suivent les vôtres.
                  </p>
                )}
                {quand === "choix" && (
                  <div className="g-plate flex flex-col gap-4 p-4">
                    <DayPicker value={days} onChange={setDays} />
                    {submitted && days.length === 0 && (
                      <p role="alert" className="text-g-meta font-medium text-ember-3">
                        Cochez au moins un jour.
                      </p>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-g-axis font-semibold uppercase tracking-wider text-faint">
                        Heures
                      </span>
                      <HoursField
                        allDay={allDay}
                        onAllDayChange={setAllDay}
                        startsAt={startsAt}
                        onStartsAtChange={setStartsAt}
                        endsAt={endsAt}
                        onEndsAtChange={setEndsAt}
                      />
                      {submitted && !hoursOk && (
                        <p role="alert" className="text-g-meta font-medium text-ember-3">
                          Indiquez une heure de début et une heure de fin différentes.
                        </p>
                      )}
                    </div>
                    <p className="text-g-meta text-muted">
                      Jours de service : la soirée compte jusqu&rsquo;à l&rsquo;heure de fin de journée de l&rsquo;établissement.
                    </p>
                  </div>
                )}

                <label className="flex min-h-g-control items-center gap-3 text-g-body">
                  <Toggle checked={disponible} onChange={setDisponible} label="Formule disponible" />
                  Formule disponible sur le menu
                </label>

                <details open={Boolean(description)} className="group">
                  <summary className="flex min-h-g-control cursor-pointer list-none items-center gap-2 text-g-body font-semibold [&::-webkit-details-marker]:hidden">
                    Description
                    <span className="text-g-meta font-normal text-muted group-open:hidden">facultative</span>
                  </summary>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={2}
                    placeholder="Entrée + plat au choix…"
                    aria-label="Description"
                    className={`${inputClass} mt-2 resize-none`}
                  />
                </details>
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-0 lg:self-start">
            <FormulePreview
              name={name}
              price={parsedPrice}
              etapes={previewEtapes}
              categories={categories}
              schedule={formuleSchedule(schedule)}
              disponible={disponible}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-hairline px-5 py-4">
          <span className="mr-auto text-g-meta text-muted">
            {quand === "choix" && `Proposée ${formatDays(days)}`}
          </span>
          {at > 0 ? (
            <GlassButton onClick={() => goTo(STEP_ORDER[at - 1])}>Précédent</GlassButton>
          ) : (
            <GlassButton onClick={onClose}>Annuler</GlassButton>
          )}
          {at < STEP_ORDER.length - 1 ? (
            <GlassButton variant="primary" onClick={() => goTo(STEP_ORDER[at + 1])}>
              Suivant
            </GlassButton>
          ) : (
            <GlassButton variant="primary" disabled={saving} onClick={() => void submit()}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </GlassButton>
          )}
        </div>
      </div>

      {sheetEtape && (
        <EtapeSheet
          etape={sheetEtape}
          index={etapes.indexOf(sheetEtape)}
          categories={categories}
          onChange={(next) =>
            setEtapes((current) => current.map((etape) => (etape.id === next.id ? next : etape)))
          }
          onRemove={() => {
            setEtapes((current) => current.filter((etape) => etape.id !== sheetEtape.id));
            setSheetFor(null);
          }}
          onClose={() => setSheetFor(null)}
        />
      )}
    </dialog>
  );
}

/** Un modèle d'étapes, avec ce qu'il a trouvé sur la carte sous son nom. */
function ModeleCard({
  modele,
  categories,
  onPick,
}: {
  modele: readonly string[];
  categories: MenuCategory[];
  onPick: () => void;
}) {
  const found = modele.map((name) => ({ name, category: modeleCategory(name, categories) }));
  return (
    <button
      type="button"
      onClick={onPick}
      className="g-plate g-press flex min-h-g-control flex-col justify-center gap-1 p-4 text-left"
    >
      <span className="text-g-body font-semibold">{modele.join(" + ")}</span>
      <span className="text-g-meta text-muted">
        {found
          .map(({ name, category }) =>
            category ? `${category.name} (${category.items.length})` : `${name} : à choisir`
          )
          .join(" · ")}
      </span>
    </button>
  );
}

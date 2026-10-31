"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "@/components/gestion/day-picker";
import { HoursField } from "@/components/gestion/hours-field";
import { ChevronDownIcon } from "@/components/gestion/icons";
import { PrixInput } from "@/components/gestion/menu/prix-input";
import {
  Chip,
  Field,
  GlassButton,
  Input,
  Segmented,
  Sheet,
  Switch,
  Textarea,
} from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { FORMULE_MODELES } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";
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
import { EtapeEditor, etapeTitle } from "./etape-sheet";
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
  { value: "2", label: "2 · Étapes", question: "Le client choisit parmi quoi ?" },
  { value: "3", label: "3 · Quand", question: "Quand la proposer ?" },
];

const QUAND: { value: Quand; label: string }[] = [
  { value: "toujours", label: "Toujours" },
  { value: "midi", label: "Le midi en semaine" },
  { value: "choix", label: "Je choisis" },
];

export function FormuleBuilder({
  formule,
  categories,
  onClose,
}: {
  /** undefined ⇒ création. */
  formule?: Formule;
  categories: MenuCategory[];
  onClose: () => void;
}) {
  const toast = useToast();
  const openingHours = useGestion()?.etablissement.openingHours ?? null;
  const lunch = lunchWindow(openingHours);

  const [step, setStep] = useState<Step>("1");
  const [name, setName] = useState(formule?.name ?? "");
  const [price, setPrice] = useState(formule ? priceToInput(formule.price) : "");
  const [description, setDescription] = useState(formule?.description ?? "");
  // Ouvert à l'arrivée seulement : React réécrirait l'attribut à chaque frappe.
  const [descriptionOpen] = useState(Boolean(formule?.description));
  const [disponible, setDisponible] = useState(formule?.disponible ?? true);
  const [quand, setQuand] = useState<Quand>(() => quandOf(formule, lunch));
  const [days, setDays] = useState<number[]>(formule?.days ?? ALL_DAYS);
  const [allDay, setAllDay] = useState(!formule?.hours);
  const [startsAt, setStartsAt] = useState(formule?.hours?.startsAt.slice(0, 5) ?? "");
  const [endsAt, setEndsAt] = useState(formule?.hours?.endsAt.slice(0, 5) ?? "");
  const [etapes, setEtapes] = useState<EtapeDraft[]>(
    formule ? etapesToDraft(formule.etapes, categories) : []
  );
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  // Le modèle choisi au pas 1 ; « libre » = je compose. Nul à la modification.
  const [modele, setModele] = useState<number | "libre" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const parsedPrice = parsePriceInput(price);
  const nameError = submitted && !name.trim() ? "Donnez un nom à la formule." : undefined;
  const priceError =
    submitted && parsedPrice === null ? "Indiquez un prix, par exemple 16,00." : undefined;
  const identityOk = Boolean(name.trim()) && parsedPrice !== null;
  const hoursOk =
    quand !== "choix" || allDay || (startsAt !== "" && endsAt !== "" && startsAt !== endsAt);
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
      affiche: formule?.affiche,
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
      toast.error(describeError(error).message);
      setSaving(false);
    }
  };

  const addEtape = () => {
    const etape = emptyEtape();
    setEtapes((current) => [...current, etape]);
    setSheetFor(etape.id);
  };
  // Un modèle se choisit et se rechoisit au pas 1 ; Suivant mène aux étapes.
  const pickModele = (index: number) => {
    setModele(index);
    setEtapes(modeleEtapes(FORMULE_MODELES[index], categories));
  };
  const pickLibre = () => {
    setModele("libre");
    setEtapes([emptyEtape()]);
  };
  const sheetEtape = etapes.find((etape) => etape.id === sheetFor);
  // Échap ferme le dialogue natif avant que le réglage d'étape ne se referme :
  // la feuille reste montée pour le constructeur, elle se rouvre aussitôt.
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = body.current?.closest("dialog");
    if (dialog && !dialog.open) dialog.showModal();
  }, [sheetFor]);
  const current = STEPS.find((entry) => entry.value === step)!;
  const lunchLabel = `lun.–ven., ${formatHeure(lunch.startsAt)} – ${formatHeure(lunch.endsAt)}`;

  // Le réglage d'une étape vit dans la même feuille (titre, corps et pied
  // changent) : un second dialogue par-dessus, Échap fermerait les deux.
  const etapeFooter = sheetEtape && (
    <>
      <GlassButton
        variant="danger"
        className="mr-auto"
        onClick={() => {
          setEtapes((current) => current.filter((etape) => etape.id !== sheetEtape.id));
          setSheetFor(null);
        }}
      >
        Retirer cette étape
      </GlassButton>
      <GlassButton variant="primary" onClick={() => setSheetFor(null)}>
        Valider cette étape
      </GlassButton>
    </>
  );

  return (
    <Sheet
      size="wide"
      title={
        sheetEtape
          ? etapeTitle(sheetEtape, etapes.indexOf(sheetEtape), categories)
          : formule
            ? `Modifier « ${formule.name} »`
            : "Nouvelle formule"
      }
      onClose={sheetEtape ? () => setSheetFor(null) : onClose}
      footer={
        etapeFooter ?? (
        <>
          {saving ? (
            <p>Un instant…</p>
          ) : (
            quand === "choix" && days.length > 0 && <p>Proposée {formatDays(days)}</p>
          )}
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
              Enregistrer
            </GlassButton>
          )}
        </>
        )
      }
    >
      <div ref={body}>
      {sheetEtape ? (
        <div className="mx-auto w-full max-w-xl">
          <EtapeEditor
            etape={sheetEtape}
            categories={categories}
            onChange={(next) =>
              setEtapes((current) => current.map((etape) => (etape.id === next.id ? next : etape)))
            }
          />
        </div>
      ) : (
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <Segmented<Step> glass={false} label="Pas" options={STEPS} value={step} onChange={goTo} />
            <h3 className="font-display text-g-h2">{current.question}</h3>
          </div>

          {step === "1" && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                <Field label="Nom" required error={nameError}>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Formule midi"
                    data-autofocus=""
                  />
                </Field>
                <Field label="Prix" required error={priceError}>
                  <PrixInput value={price} onChange={setPrice} />
                </Field>
              </div>

              {!formule && categories.length === 0 && (
                <p className="text-g-meta text-muted">
                  Votre carte est vide : créez d&rsquo;abord des catégories et des articles, la formule choisira parmi eux.
                </p>
              )}
              {!formule && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-g-body font-semibold">Le client choisit…</legend>
                  <div role="radiogroup" aria-label="Modèle d'étapes" className="grid gap-2 sm:grid-cols-2">
                    {FORMULE_MODELES.map((entry, index) => (
                      <ModeleCard
                        key={entry.join("+")}
                        modele={entry}
                        categories={categories}
                        selected={modele === index}
                        onPick={() => pickModele(index)}
                      />
                    ))}
                    <ChoiceCard
                      selected={modele === "libre"}
                      onPick={pickLibre}
                      title="Je compose"
                      sub="Une étape à la fois, parmi vos catégories ou des plats précis."
                    />
                  </div>
                </fieldset>
              )}

              <details open={descriptionOpen} className="group">
                <summary className={SUMMARY_CLASS}>
                  <ChevronDownIcon className={CHEVRON_CLASS} />
                  Description
                  <span className="text-g-meta font-normal text-muted group-open:hidden">facultative</span>
                </summary>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  placeholder="Entrée + plat au choix…"
                  aria-label="Description"
                  className="mt-2"
                />
              </details>
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
                    const label = etapeTitle(etape, index, categories);
                    return (
                      <li key={etape.id} className="g-plate flex items-center gap-2 p-2">
                        <button
                          type="button"
                          onClick={() => setSheetFor(etape.id)}
                          aria-label={`Régler ${label}`}
                          className="g-press flex min-h-g-control min-w-0 flex-1 flex-col justify-center rounded-g-card px-2 text-left"
                        >
                          <span className="flex items-center gap-2 text-g-body font-semibold">
                            <span className="truncate">
                              {index + 1} · {label}
                            </span>
                            <span className="text-g-meta font-normal text-muted">Régler ›</span>
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
                {QUAND.map((option) => (
                  <ChoiceCard
                    key={option.value}
                    selected={quand === option.value}
                    onPick={() => setQuand(option.value)}
                    title={option.label}
                    sub={
                      option.value === "toujours"
                        ? "Tous les jours, toute la journée"
                        : option.value === "midi"
                          ? lunchLabel
                          : "Jours et heures à votre main"
                    }
                  />
                ))}
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
                    <p role="alert" className="g-field-error">
                      <span>Cochez au moins un jour.</span>
                    </p>
                  )}
                  <div className="g-field">
                    <span className="g-field-label">Heures</span>
                    <HoursField
                      allDay={allDay}
                      onAllDayChange={setAllDay}
                      startsAt={startsAt}
                      onStartsAtChange={setStartsAt}
                      endsAt={endsAt}
                      onEndsAtChange={setEndsAt}
                    />
                    {submitted && !hoursOk && (
                      <p role="alert" className="g-field-error">
                        <span>Indiquez une heure de début et une heure de fin différentes.</span>
                      </p>
                    )}
                  </div>
                  <p className="text-g-meta text-muted">
                    Jours de service : la soirée compte jusqu&rsquo;à l&rsquo;heure de fin de journée de l&rsquo;établissement.
                  </p>
                </div>
              )}

              <div className="border-t border-hairline pt-4">
                <Switch
                  checked={disponible}
                  onChange={setDisponible}
                  label="Formule disponible sur le menu"
                  hint="Éteinte, elle reste ici et disparaît du menu client."
                />
              </div>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-(--g-dialog-pad) lg:self-start">
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
      )}
      </div>
    </Sheet>
  );
}

const SUMMARY_CLASS =
  "flex min-h-g-control cursor-pointer list-none items-center gap-2 text-g-body font-semibold [&::-webkit-details-marker]:hidden";
const CHEVRON_CLASS =
  "size-4 shrink-0 -rotate-90 text-muted transition-transform group-open:rotate-0 motion-reduce:transition-none";

/** Une carte à cocher parmi d'autres : modèle d'étapes, moment de la journée. */
export function ChoiceCard({
  selected,
  onPick,
  title,
  sub,
}: {
  selected: boolean;
  onPick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onPick}
      className={`g-plate g-press flex min-h-g-control flex-col justify-center gap-1 p-4 text-left ${
        selected ? "border-ember-2/60" : ""
      }`}
    >
      <span className="flex items-center justify-between gap-2 text-g-body font-semibold">
        {title}
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
}

/** Un modèle d'étapes, avec ce qu'il a trouvé sur la carte sous son nom. */
function ModeleCard({
  modele,
  categories,
  selected,
  onPick,
}: {
  modele: readonly string[];
  categories: MenuCategory[];
  selected: boolean;
  onPick: () => void;
}) {
  const found = modele.map((name) => ({ name, category: modeleCategory(name, categories) }));
  return (
    <ChoiceCard
      selected={selected}
      onPick={onPick}
      title={modele.join(" + ")}
      sub={found
        .map(({ name, category }) =>
          category ? `${category.name} (${category.items.length})` : `${name} : aucune catégorie`
        )
        .join(" · ")}
    />
  );
}

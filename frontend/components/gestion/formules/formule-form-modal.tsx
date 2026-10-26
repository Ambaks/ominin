"use client";

import { useState } from "react";
import { HoursField } from "@/components/gestion/hours-field";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PriceInput } from "@/components/ui/price-input";
import { useToast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import * as api from "@/lib/gestion/api";
import { FORMULE_MODELES, WEEK_DAYS } from "@/lib/gestion/constants";
import { formatHeure } from "@/lib/gestion/fermetures";
import { formatDays, parsePriceInput, priceToInput } from "@/lib/gestion/format";
import { useGestionAccess } from "@/lib/gestion/store";
import type { Formule } from "@/lib/gestion/types";
import type { MenuCategory } from "@/lib/menu-data";
import {
  EtapeEditor,
  draftToEtapes,
  emptyEtape,
  etapesToDraft,
  modeleEtapes,
  type EtapeDraft,
} from "./etape-editor";

export function FormuleFormModal({
  formule,
  slot,
  categories,
  onClose,
}: {
  /** undefined ⇒ création. */
  formule?: Formule;
  /** Création depuis un emplacement d'affiche : la formule y est placée. */
  slot?: Formule["affiche"];
  categories: MenuCategory[];
  onClose: () => void;
}) {
  const { hasFeature } = useGestionAccess();
  const toast = useToast();

  const [name, setName] = useState(formule?.name ?? "");
  const [description, setDescription] = useState(formule?.description ?? "");
  const [price, setPrice] = useState(
    formule ? priceToInput(formule.price) : ""
  );
  const [disponible, setDisponible] = useState(formule?.disponible ?? true);
  // Tous les jours cochés = pas de restriction (days absent).
  const [days, setDays] = useState<number[]>(
    formule?.days ?? WEEK_DAYS.map((day) => day.iso)
  );
  const [allDay, setAllDay] = useState(!formule?.hours);
  const [startsAt, setStartsAt] = useState(formule?.hours?.startsAt.slice(0, 5) ?? "");
  const [endsAt, setEndsAt] = useState(formule?.hours?.endsAt.slice(0, 5) ?? "");
  const [etapes, setEtapes] = useState<EtapeDraft[]>(
    formule ? etapesToDraft(formule.etapes) : [emptyEtape()]
  );
  const [submitted, setSubmitted] = useState(false);

  const parsedPrice = parsePriceInput(price);
  const pristine =
    !formule &&
    etapes.every(
      (etape) => !etape.name.trim() && !etape.categoryId && etape.articles.length === 0
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    const hoursValid = allDay || (startsAt !== "" && endsAt !== "" && startsAt !== endsAt);
    if (!name.trim() || parsedPrice === null || days.length === 0 || !hoursValid) return;

    const input: api.FormuleInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: parsedPrice,
      disponible,
      days:
        days.length === WEEK_DAYS.length
          ? undefined
          : [...days].sort((a, b) => a - b),
      hours: allDay ? undefined : { startsAt, endsAt },
      etapes: draftToEtapes(etapes, categories),
      affiche: formule ? formule.affiche : slot,
    };
    try {
      if (formule) {
        await api.updateFormule(formule.id, input);
        toast.success("Formule modifiée.");
      } else {
        await api.createFormule(input);
        toast.success("Formule ajoutée.");
      }
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    }
  };

  return (
    <Modal
      title={formule ? "Modifier la formule" : "Nouvelle formule"}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="submit"
            form="formule-form"
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
          >
            Enregistrer
          </button>
        </>
      }
    >
      <form id="formule-form" onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field label="Nom" required>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Formule midi"
              className={`${inputClass} ${submitted && !name.trim() ? "border-ember-3/60" : ""}`}
            />
          </Field>
          <Field label="Prix" required>
            <PriceInput
              value={price}
              onChange={setPrice}
              invalid={submitted && parsedPrice === null}
            />
          </Field>
        </div>

        {/* Pas de Field : son <label> engloberait les cases et les boutons
            de l'éditeur. */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Étapes
          </span>
          {pristine && (
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <span className="text-sm text-muted">Partir d&rsquo;un modèle :</span>
              {FORMULE_MODELES.map((modele) => (
                <button
                  key={modele.join("+")}
                  type="button"
                  onClick={() => setEtapes(modeleEtapes(modele, categories))}
                  className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-ember-1 transition-colors hover:border-ember-2/40"
                >
                  {modele.join(" + ")}
                </button>
              ))}
            </div>
          )}
          <EtapeEditor
            value={etapes}
            onChange={setEtapes}
            categories={categories}
            showOptions={hasFeature("options")}
          />
        </div>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            placeholder="Entrée + plat au choix…"
            className={`${inputClass} resize-none`}
          />
        </Field>

        <label className="flex items-center gap-2.5 text-sm text-muted">
          <Toggle
            checked={disponible}
            onChange={setDisponible}
            label="Formule disponible"
          />
          Disponible sur le menu client
        </label>

        {/* Replié tant qu'elle est proposée tout le temps : le cas courant. */}
        <details open={Boolean(formule?.days || formule?.hours)}>
          <summary className="cursor-pointer text-sm text-muted transition-colors hover:text-foreground">
            Proposée{" "}
            <span className="font-semibold text-foreground">
              {formatDays(days)}
              {allDay
                ? ", toute la journée"
                : startsAt && endsAt
                  ? `, de ${formatHeure(startsAt)} à ${formatHeure(endsAt)}`
                  : ""}
            </span>
          </summary>
          <div className="flex flex-col gap-4 pt-3">
            {/* Pas de Field : son <label> activerait le premier jour au clic
                sur le libellé. */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                Jours <span className="text-ember-2">*</span>
              </span>
              <div className="flex gap-1.5">
                {WEEK_DAYS.map((day) => {
                  const picked = days.includes(day.iso);
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      onClick={() =>
                        setDays((current) =>
                          picked
                            ? current.filter((iso) => iso !== day.iso)
                            : [...current, day.iso]
                        )
                      }
                      aria-pressed={picked}
                      aria-label={day.long}
                      className={`flex size-9 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                        picked
                          ? "ember-gradient text-background"
                          : `border text-muted hover:border-ember-2/40 hover:text-foreground ${
                              submitted && days.length === 0
                                ? "border-ember-3/60"
                                : "border-hairline"
                            }`
                      }`}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-faint">
                Jours de service : la soirée compte jusqu&rsquo;à l&rsquo;heure
                de fin de journée de l&rsquo;établissement.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
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
              {!allDay && (
                <span className="text-xs text-faint">
                  Proposée seulement à ces heures, avec la happy hour sur le
                  menu client.
                </span>
              )}
            </div>
          </div>
        </details>
      </form>
    </Modal>
  );
}

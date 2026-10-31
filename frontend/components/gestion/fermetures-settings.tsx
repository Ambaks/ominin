"use client";

import { useState } from "react";
import { AlertIcon } from "@/components/gestion/icons";
import { SettingsCard } from "@/app/menu/gestion/etablissement/settings-card";
import { DayPicker } from "@/components/gestion/day-picker";
import { MenuTargetPicker } from "@/components/gestion/menu-target-picker";
import { Chip, ConfirmSheet, EmptyState, Field, GlassButton, Input, Segmented, Sheet, Switch } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { toMinutes } from "@/lib/collect/hours";
import * as api from "@/lib/gestion/api";
import { describeError } from "@/lib/gestion/errors";
import { WAIT_TICK_MS, WEEK_DAYS } from "@/lib/gestion/constants";
import {
  byWindowOrder,
  closureActive,
  dayEndLabel,
  describeSchedule,
  describeTargets,
  emptyWindow,
  formatHeure,
  liftedUntil,
  serviceClock,
  serviceMinutes,
} from "@/lib/gestion/fermetures";
import type { Closure, ClosureWindow, MenuTarget } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import type { MenuCategory } from "@/lib/menu-data";

/*
 * Fermetures (gérant) : ce que le client ne commande plus passé une heure,
 * ou d'un geste depuis Commandes. Le BOHO ferme sa cuisine à 22 h et garde
 * le bar ; le Caffè Panis ne sert ses plats que midi et soir. Chaque
 * fermeture nomme ce qu'elle coupe et, si elle revient chaque jour, ses
 * plages : celles où c'est coupé, ou celles où c'est servi.
 */

/** Une plage en cours de saisie : heure de fin vide ⇒ jusqu'à la bascule. */
type WindowDraft = Omit<ClosureWindow, "endsAt"> & { endsAt: string };

/** Ce que la feuille propose d'avance : l'exemple de l'état vide, prêt à enregistrer. */
interface Preset {
  name: string;
  targets: MenuTarget[];
  windows: WindowDraft[];
}

const ALL_DAYS = WEEK_DAYS.map((day) => day.iso);

const MODES = [
  { value: "closed", label: "Coupé" },
  { value: "open", label: "Servi seulement" },
] as const;

/** L'exemple : « Cuisine » coupe les entrées et les plats chaque soir, dès que la carte les nomme. */
function examplePreset(categories: MenuCategory[]): Preset {
  const targets = categories
    .filter((category) => /entr[ée]e|plat/i.test(category.name))
    .map((category): MenuTarget => ({ kind: "category", id: category.id }));
  return { name: "Cuisine", targets, windows: [{ days: ALL_DAYS, startsAt: "22:00", endsAt: "" }] };
}

/** Ce que la plage saisie donnera, ou ce qui l'empêche d'être enregistrée. */
function windowHint(
  window: WindowDraft,
  openWindows: boolean,
  dayEndHour: number
): { text: string; valid: boolean; error?: boolean } {
  const { startsAt, endsAt } = window;
  if (window.days.length === 0) return { text: "Choisissez au moins un jour.", valid: false };
  if (startsAt === "") return { text: "Indiquez l’heure de début.", valid: false };
  if (endsAt !== "" && emptyWindow(startsAt, endsAt, dayEndHour)) {
    return {
      text:
        startsAt === endsAt
          ? "La fin doit être après le début."
          : `La fin tombe avant le début : votre journée de service bascule à ${dayEndLabel(dayEndHour)}.`,
      valid: false,
      error: true,
    };
  }
  if (endsAt === "" || serviceMinutes(endsAt, dayEndHour) === 0) {
    return {
      text: `${openWindows ? "Servi" : "Coupé"} jusqu’à la fin de la journée de service (${dayEndLabel(dayEndHour)}).`,
      valid: true,
    };
  }
  if (toMinutes(endsAt) < toMinutes(startsAt)) {
    return {
      text: "La plage passe minuit : elle se rattache au jour où elle commence.",
      valid: true,
    };
  }
  return {
    text: openWindows ? `Coupé de nouveau à ${formatHeure(endsAt)}.` : `Rouvre à ${formatHeure(endsAt)}.`,
    valid: true,
  };
}

function ClosureForm({
  closure,
  preset,
  active,
  takenNames,
  categories,
  dayEndHour,
  onClose,
}: {
  closure: Closure | null;
  preset?: Preset;
  /** En cours : la supprimer remet tout de suite ses articles en vente. */
  active: boolean;
  /** Noms des autres fermetures : deux boutons « Cuisine » ne se distinguent pas. */
  takenNames: string[];
  categories: MenuCategory[];
  dayEndHour: number;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(closure?.name ?? preset?.name ?? "");
  const [targets, setTargets] = useState<MenuTarget[]>(closure?.targets ?? preset?.targets ?? []);
  const [scheduled, setScheduled] = useState(closure ? closure.windows.length > 0 : true);
  const [openWindows, setOpenWindows] = useState(closure?.openWindows ?? false);
  const [windows, setWindows] = useState<WindowDraft[]>(
    closure?.windows.length
      ? closure.windows.map((window) => ({ ...window, endsAt: window.endsAt ?? "" }))
      : (preset?.windows ?? [{ days: ALL_DAYS, startsAt: "", endsAt: "" }])
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hints = windows.map((window) => windowHint(window, openWindows, dayEndHour));
  const updateWindow = (index: number, patch: Partial<WindowDraft>) =>
    setWindows((current) =>
      current.map((window, i) => (i === index ? { ...window, ...patch } : window))
    );
  const nameTaken = takenNames.some(
    (taken) => taken.toLocaleLowerCase("fr") === name.trim().toLocaleLowerCase("fr")
  );
  const valid =
    name.trim().length > 0 &&
    !nameTaken &&
    targets.length > 0 &&
    (!scheduled || hints.every((hint) => hint.valid));
  // Le bouton désactivé dit pourquoi, à côté de lui.
  const missing =
    name.trim().length === 0
      ? "Donnez-lui un nom pour enregistrer."
      : nameTaken
        ? "Changez le nom pour enregistrer."
        : targets.length === 0
          ? "Choisissez ce qu'elle coupe pour enregistrer."
          : scheduled && !hints.every((hint) => hint.valid)
            ? "Complétez les plages pour enregistrer."
            : null;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const input: api.ClosureInput = {
        name: name.trim(),
        windows: scheduled
          ? windows
              .map((window) => ({ ...window, endsAt: window.endsAt || null }))
              .sort(byWindowOrder)
          : [],
        openWindows: scheduled && openWindows,
        targets,
      };
      if (closure) await api.updateClosure(closure.id, input);
      else await api.createClosure(input);
      toast.success("Fermeture enregistrée.");
      onClose();
    } catch (error) {
      toast.error(
        describeError(error).message
      );
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={closure ? "Modifier la fermeture" : "Nouvelle fermeture"}
      onClose={onClose}
      footer={
        <>
          {closure && (
            <GlassButton variant="danger" onClick={() => setDeleting(true)} className="mr-auto">
              Supprimer
            </GlassButton>
          )}
          {missing && <p>{missing}</p>}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" disabled={!valid || saving} onClick={() => void submit()}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </GlassButton>
        </>
      }
    >
      {deleting && closure && (
        <ConfirmSheet
          title="Supprimer cette fermeture ?"
          text={
            active
              ? `« ${closure.name} » ne coupera plus rien : vos clients pourront de nouveau commander ${describeTargets(closure, categories)} dès maintenant, et son bouton disparaît de Commandes.`
              : `« ${closure.name} » ne coupera plus rien, et son bouton disparaît de Commandes.`
          }
          confirmLabel="Supprimer"
          destructive
          onConfirm={() => {
            setDeleting(false);
            void api
              .deleteClosure(closure.id)
              .then(() => {
                toast.success("Fermeture supprimée.");
                onClose();
              })
              .catch((error: unknown) =>
                toast.error(
                  describeError(error).message
                )
              );
          }}
          onClose={() => setDeleting(false)}
        />
      )}
      <div className="flex flex-col gap-5">
        <Field
          label="Nom"
          required
          hint="Le nom du bouton dans Commandes."
          error={nameTaken ? "Une fermeture porte déjà ce nom." : undefined}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            data-autofocus={!closure || undefined}
            placeholder="Ex. : Cuisine, Bar, Terrasse"
            aria-invalid={nameTaken || undefined}
          />
        </Field>

        <MenuTargetPicker
          categories={categories}
          value={targets}
          onChange={setTargets}
          label="Ce qui n’est plus servi"
        />

        <div className="flex flex-col gap-3">
          <Switch
            checked={scheduled}
            onChange={setScheduled}
            label="À heure fixe"
            hint={scheduled ? undefined : `Ne se déclenche qu'à la main, depuis Commandes, et rouvre d'elle-même à la fin de la journée de service (${dayEndLabel(dayEndHour)}).`}
          />
          {scheduled ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-g-meta text-muted">Pendant ces plages, c’est</span>
                <Segmented
                  label="Pendant ces plages"
                  glass={false}
                  options={MODES}
                  value={openWindows ? "open" : "closed"}
                  onChange={(value) => setOpenWindows(value === "open")}
                />
              </div>
              {openWindows && (
                <p className="text-g-meta text-muted">
                  En dehors de ces plages, vos clients voient «&nbsp;Plus
                  servi&nbsp;». Un jour sans plage, rien n’est servi.
                </p>
              )}
              <ul className="flex flex-col gap-3">
                {windows.map((window, index) => (
                  <li
                    key={index}
                    className="flex flex-col gap-3 rounded-g-card border border-hairline p-3"
                  >
                    <DayPicker
                      value={window.days}
                      onChange={(days) => updateWindow(index, { days })}
                    />
                    <div className="flex flex-wrap items-end gap-3">
                      <Field label="De" required>
                        <Input
                          type="time"
                          value={window.startsAt}
                          aria-label={`Plage ${index + 1}, début`}
                          onChange={(event) => updateWindow(index, { startsAt: event.target.value })}
                          className="w-32"
                        />
                      </Field>
                      <Field label="Jusqu’à">
                        <Input
                          type="time"
                          value={window.endsAt}
                          aria-label={`Plage ${index + 1}, fin`}
                          onChange={(event) => updateWindow(index, { endsAt: event.target.value })}
                          className="w-32"
                        />
                      </Field>
                      {windows.length > 1 && (
                        <GlassButton
                          onClick={() => setWindows((current) => current.filter((_, i) => i !== index))}
                          className="ml-auto"
                        >
                          Retirer
                        </GlassButton>
                      )}
                    </div>
                    <p className={`flex items-start gap-1.5 text-g-meta ${hints[index].error ? "font-medium" : "text-muted"}`}>
                      {hints[index].error && <AlertIcon className="mt-px size-4 shrink-0 text-ember-3" />}
                      {hints[index].text}
                    </p>
                    {window.startsAt !== "" && toMinutes(window.startsAt) < dayEndHour * 60 && (
                      <p className="text-g-meta text-muted">
                        Avant {dayEndLabel(dayEndHour)}, c’est encore la nuit de la
                        veille&nbsp;: «&nbsp;lundi à {formatHeure(window.startsAt)}&nbsp;»
                        tombe dans la nuit de lundi à mardi.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <GlassButton
                onClick={() =>
                  setWindows((current) => [
                    ...current,
                    { days: current[current.length - 1]?.days ?? ALL_DAYS, startsAt: "", endsAt: "" },
                  ])
                }
                className="self-start"
              >
                + Plage
              </GlassButton>
            </>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}

export function FermeturesSettings({
  closures,
  categories,
  dayEndHour,
}: {
  closures: Closure[];
  categories: MenuCategory[];
  dayEndHour: number;
}) {
  const now = useNow(WAIT_TICK_MS);
  const [editing, setEditing] = useState<Closure | null>(null);
  // null : fermée ; sans préréglage : vierge ; avec : l'exemple pré-rempli.
  const [creating, setCreating] = useState<{ preset?: Preset } | null>(null);
  const clock = serviceClock(now, dayEndHour);
  const example = examplePreset(categories);

  return (
    <SettingsCard
      data-visite="etablissement-fermetures"
      title="Fermeture de la cuisine"
      text="Ce qui n'est plus servi passé une heure, ou d'un geste depuis Commandes ; vos clients voient « Plus servi »."
      right={
        closures.length > 0 ? (
          <GlassButton onClick={() => setCreating({})}>+ Fermeture</GlassButton>
        ) : undefined
      }
    >
      {closures.length === 0 ? (
        example.targets.length > 0 ? (
          <EmptyState
            text="Par exemple : « Cuisine » coupe les entrées et les plats chaque soir à 22 h."
            action={
              <span className="flex flex-wrap gap-2">
                <GlassButton variant="primary" onClick={() => setCreating({ preset: example })}>
                  Créer cette fermeture
                </GlassButton>
                <GlassButton onClick={() => setCreating({})}>Autre</GlassButton>
              </span>
            }
          />
        ) : (
          <EmptyState
            text="Aucune fermeture : tout est servi tant que le service est ouvert."
            action={<GlassButton variant="primary" onClick={() => setCreating({})}>+ Fermeture</GlassButton>}
          />
        )
      ) : (
        <ul className="flex flex-col divide-y divide-hairline">
          {closures.map((closure) => {
            const active = closureActive(closure, clock, dayEndHour);
            const suspended = liftedUntil(closure, clock, dayEndHour);
            return (
              <li key={closure.id}>
                <button
                  type="button"
                  onClick={() => setEditing(closure)}
                  className="g-press flex min-h-g-control w-full items-center justify-between gap-3 py-2.5 text-left"
                >
                  <span className="min-w-0">
                    <span className="block break-words text-g-label font-semibold">{closure.name}</span>
                    <span className="block text-g-meta text-muted">
                      {describeSchedule(closure) ?? "À la main seulement"}
                    </span>
                    <span className="line-clamp-2 block text-g-meta text-faint">
                      {describeTargets(closure, categories) ||
                        "Ne coupe plus rien : ses articles ont été supprimés."}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {active ? (
                      <Chip tone="problem">À l’arrêt</Chip>
                    ) : (
                      suspended && <Chip>Suspendu jusqu’à {suspended}</Chip>
                    )}
                    <span className="text-g-meta font-semibold text-muted">Modifier&nbsp;›</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {(creating || editing) && (
        <ClosureForm
          closure={editing}
          preset={creating?.preset}
          active={editing !== null && closureActive(editing, clock, dayEndHour)}
          takenNames={closures
            .filter((closure) => closure.id !== editing?.id)
            .map((closure) => closure.name)}
          categories={categories}
          dayEndHour={dayEndHour}
          onClose={() => {
            setCreating(null);
            setEditing(null);
          }}
        />
      )}
    </SettingsCard>
  );
}

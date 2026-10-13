"use client";

import { useState } from "react";
import { DayPicker } from "@/components/gestion/day-picker";
import { MenuTargetPicker } from "@/components/gestion/menu-target-picker";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { toMinutes } from "@/lib/collect/hours";
import * as api from "@/lib/gestion/api";
import { WAIT_TICK_MS, WEEK_DAYS } from "@/lib/gestion/constants";
import {
  closureActive,
  dayEndLabel,
  describeSchedule,
  describeTargets,
  emptyWindow,
  formatHeure,
  liftedToday,
  serviceClock,
  serviceMinutes,
} from "@/lib/gestion/fermetures";
import type { Closure, MenuTarget } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import type { MenuCategory } from "@/lib/menu-data";

/*
 * Fermetures (gérant) : ce que le client ne commande plus passé une heure,
 * ou d'un geste depuis Commandes. Le BOHO ferme sa cuisine à 22 h et garde
 * le bar ; un autre coupe tout sauf les desserts. Chaque fermeture nomme ce
 * qu'elle coupe et, si elle revient chaque jour, à quelle heure.
 */

function ClosureForm({
  closure,
  active,
  takenNames,
  categories,
  dayEndHour,
  onClose,
}: {
  closure: Closure | null;
  /** En cours : la supprimer remet tout de suite ses articles en vente. */
  active: boolean;
  /** Noms des autres fermetures : deux boutons « Cuisine » ne se distinguent pas. */
  takenNames: string[];
  categories: MenuCategory[];
  dayEndHour: number;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(closure?.name ?? "");
  const [targets, setTargets] = useState<MenuTarget[]>(closure?.targets ?? []);
  const [scheduled, setScheduled] = useState(closure ? closure.startsAt !== null : true);
  const [days, setDays] = useState<number[]>(
    closure?.days ?? WEEK_DAYS.map((day) => day.iso)
  );
  const [startsAt, setStartsAt] = useState(closure?.startsAt?.slice(0, 5) ?? "");
  const [endsAt, setEndsAt] = useState(closure?.endsAt?.slice(0, 5) ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const windowEmpty =
    scheduled && startsAt !== "" && endsAt !== "" && emptyWindow(startsAt, endsAt, dayEndHour);
  const nameTaken = takenNames.some(
    (taken) => taken.toLocaleLowerCase("fr") === name.trim().toLocaleLowerCase("fr")
  );
  const valid =
    name.trim().length > 0 &&
    !nameTaken &&
    targets.length > 0 &&
    (!scheduled || (days.length > 0 && startsAt !== "" && !windowEmpty));

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const input: api.ClosureInput = {
        name: name.trim(),
        days: scheduled ? days : null,
        startsAt: scheduled ? startsAt : null,
        endsAt: scheduled && endsAt !== "" ? endsAt : null,
        targets,
      };
      if (closure) await api.updateClosure(closure.id, input);
      else await api.createClosure(input);
      toast.success("Fermeture enregistrée.");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
      setSaving(false);
    }
  };

  return (
    <Modal
      title={closure ? "Modifier la fermeture" : "Nouvelle fermeture"}
      onClose={onClose}
      footer={
        <>
          {closure && (
            <button
              type="button"
              onClick={() => setDeleting(true)}
              className="mr-auto rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-ember-3 transition-colors hover:border-ember-3/40"
            >
              Supprimer
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!valid || saving}
            onClick={() => void submit()}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </>
      }
    >
      {deleting && closure && (
        <ConfirmDialog
          title="Supprimer cette fermeture ?"
          message={
            active
              ? `«\u00a0${closure.name}\u00a0» ne coupera plus rien\u00a0: vos clients pourront de nouveau commander ${describeTargets(closure, categories)} dès maintenant, et son bouton disparaît de Commandes.`
              : `«\u00a0${closure.name}\u00a0» ne coupera plus rien, et son bouton disparaît de Commandes.`
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
                  error instanceof Error ? error.message : "Une erreur est survenue."
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
          hint={
            nameTaken
              ? "Une fermeture porte déjà ce nom."
              : "Le nom du bouton dans Commandes."
          }
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            autoFocus={!closure}
            placeholder="Ex. : Cuisine, Bar, Terrasse"
            aria-invalid={nameTaken || undefined}
            className={inputClass}
          />
        </Field>

        <MenuTargetPicker
          categories={categories}
          value={targets}
          onChange={setTargets}
          label="Ce qui n’est plus servi"
        />

        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3">
            <Toggle checked={scheduled} onChange={setScheduled} label="À heure fixe" />
            <span className="text-sm">À heure fixe</span>
          </label>
          {scheduled ? (
            <>
              <DayPicker value={days} onChange={setDays} />
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Dès" required>
                  <input
                    type="time"
                    value={startsAt}
                    onChange={(event) => setStartsAt(event.target.value)}
                    className={`${inputClass} w-32`}
                  />
                </Field>
                <Field label="Jusqu’à">
                  <input
                    type="time"
                    value={endsAt}
                    onChange={(event) => setEndsAt(event.target.value)}
                    className={`${inputClass} w-32`}
                  />
                </Field>
              </div>
              <p className={`text-xs leading-relaxed ${windowEmpty ? "text-ember-3" : "text-faint"}`}>
                {startsAt === ""
                  ? "Indiquez l’heure de début, ou désactivez «\u00a0À heure fixe\u00a0» pour une fermeture à la main."
                  : windowEmpty
                    ? startsAt === endsAt
                      ? "La fin doit être après le début."
                      : `La fin tombe avant le début\u00a0: votre journée de service bascule à ${dayEndLabel(dayEndHour)}.`
                    : endsAt === "" || serviceMinutes(endsAt, dayEndHour) === 0
                      ? `Tout rouvre à la fin de la journée de service (${dayEndLabel(dayEndHour)}).`
                      : toMinutes(endsAt) < toMinutes(startsAt)
                        ? "Le créneau passe minuit\u00a0: il se rattache au jour où il commence."
                        : `Rouvre à ${formatHeure(endsAt)}.`}
              </p>
              {startsAt !== "" && toMinutes(startsAt) < dayEndHour * 60 && (
                <p className="text-xs leading-relaxed text-faint">
                  Avant {dayEndLabel(dayEndHour)}, c’est encore la nuit de la
                  veille&nbsp;: «&nbsp;lundi dès {formatHeure(startsAt)}&nbsp;»
                  ferme dans la nuit de lundi à mardi.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs leading-relaxed text-faint">
              Elle ne se déclenche qu’à la main, depuis Commandes, et rouvre
              d’elle-même à la fin de la journée de service (
              {dayEndLabel(dayEndHour)}).
            </p>
          )}
        </div>
      </div>
    </Modal>
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
  const [creating, setCreating] = useState(false);
  const clock = serviceClock(now, dayEndHour);

  return (
    <section
      data-visite="etablissement-fermetures"
      className="flex max-w-xl flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5 lg:p-6"
    >
      <div>
        <h2 className="font-display text-lg font-medium">Fermeture de la cuisine</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Arrêtez une partie de la carte à heure fixe, ou d’un geste pendant
          le service depuis Commandes. Vos clients voient «&nbsp;Plus
          servi&nbsp;» sur les plats concernés&nbsp;; tout rouvre à la fin de
          la journée de service ({dayEndLabel(dayEndHour)}).
        </p>
      </div>

      {closures.length === 0 && (
        <p className="text-xs leading-relaxed text-faint">
          Ex. : « Cuisine » coupe Entrées et Plats chaque soir à 22 h.
        </p>
      )}
      {closures.length > 0 && (
        <ul className="flex flex-col gap-2">
          {closures.map((closure) => {
            const active = closureActive(closure, clock, dayEndHour);
            return (
              <li key={closure.id}>
                <button
                  type="button"
                  onClick={() => setEditing(closure)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-hairline px-4 py-3 text-left transition-colors hover:border-ember-2/40"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{closure.name}</span>
                    <span className="block text-xs text-muted">
                      {describeSchedule(closure) ?? "À la main seulement"}
                    </span>
                    <span className="line-clamp-2 block text-xs text-faint">
                      {describeTargets(closure, categories) ||
                        "Ne coupe plus rien\u00a0: ses articles ont été supprimés."}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {active ? (
                      <span className="rounded-full border border-ember-3/50 px-2 py-0.5 text-[11px] font-semibold text-foreground">
                        À l’arrêt
                      </span>
                    ) : (
                      liftedToday(closure, clock) && (
                        <span className="rounded-full border border-hairline px-2 py-0.5 text-[11px] font-semibold text-muted">
                          Horaire suspendu aujourd’hui
                        </span>
                      )
                    )}
                    <span className="text-xs font-semibold text-muted">
                      Modifier&nbsp;›
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setCreating(true)}
        className="self-start rounded-full border border-dashed border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
      >
        + Fermeture
      </button>

      {(creating || editing) && (
        <ClosureForm
          closure={editing}
          active={editing !== null && closureActive(editing, clock, dayEndHour)}
          takenNames={closures
            .filter((closure) => closure.id !== editing?.id)
            .map((closure) => closure.name)}
          categories={categories}
          dayEndHour={dayEndHour}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

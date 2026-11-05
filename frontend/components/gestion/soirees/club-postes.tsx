"use client";

import { useState, type KeyboardEvent } from "react";
import { Plate, Shimmer, Switch, useField } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import {
  CLUB_DROITS,
  CLUB_ROLES,
  CLUB_ROLE_LABELS,
  POSTES,
  POSTE_LABELS,
  POSTE_TAGLINES,
  type ClubDroits,
  type Poste,
} from "@/lib/club/droits";
import type { ClubDroit, ClubRole } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import { useClub } from "@/lib/gestion/club-store";
import { describeError } from "@/lib/gestion/errors";

/*
 * L'équipe d'un club : chacun a un poste — accueil, caissier, chef de rang,
 * ou la direction —, et la direction règle ce que chaque poste peut faire.
 * Les mêmes cartes que les rôles d'un restaurant, avec les gestes réglés
 * pour chaque poste.
 */

export function PosteCards({
  value,
  onChange,
  disabled,
  label = "Poste",
}: {
  value: Poste;
  onChange: (poste: Poste) => void;
  disabled?: boolean;
  label?: string;
}) {
  const club = useClub();
  // Dans un Field, le groupe reprend l'étiquette et l'indication du champ.
  const field = useField();
  const gestes = (poste: Poste) =>
    poste === "gerant"
      ? ["Tous les gestes de la soirée", "Les remboursements", "Les droits de chaque poste"]
      : (club?.droits[poste] ?? []).map((droit) => CLUB_DROITS.find((entry) => entry.droit === droit)?.label ?? droit);
  // Un groupe de radios se parcourt aux flèches ; une seule carte dans l'ordre de tabulation.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step || disabled) return;
    event.preventDefault();
    const next = POSTES[(POSTES.indexOf(value) + step + POSTES.length) % POSTES.length];
    onChange(next);
    event.currentTarget.querySelector<HTMLElement>(`[data-role="${next}"]`)?.focus();
  };

  return (
    <div
      role="radiogroup"
      id={field?.id}
      aria-label={label}
      aria-describedby={field?.describedBy}
      onKeyDown={onKeyDown}
      className="grid gap-2 sm:grid-cols-2"
    >
      {POSTES.map((poste) => {
        const selected = value === poste;
        const list = gestes(poste);
        return (
          <button
            key={poste}
            type="button"
            role="radio"
            data-role={poste}
            aria-checked={selected}
            aria-disabled={disabled || undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              if (!disabled) onChange(poste);
            }}
            className={`g-press flex flex-col gap-1.5 rounded-g-card border p-3 text-left aria-disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1 ${
              selected ? "border-(--g-ring-hover) bg-surface-raised" : "border-hairline bg-surface"
            }`}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-g-body font-semibold">{POSTE_LABELS[poste]}</span>
              <span
                aria-hidden
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                  selected ? "border-ember-2" : "border-hairline"
                }`}
              >
                {selected && <span className="ember-gradient size-2.5 rounded-full" />}
              </span>
            </span>
            <span className="text-g-meta text-muted">{POSTE_TAGLINES[poste]}</span>
            {list.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-g-meta">
                {list.map((geste) => (
                  <li key={geste} className="flex items-start gap-1.5">
                    <span aria-hidden className="mt-1.75 size-1.5 shrink-0 rounded-full bg-g-entity g-orders" />
                    {geste}
                  </li>
                ))}
              </ul>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Ce que chaque poste peut faire, réglé par la direction : un interrupteur
 * par geste. Enregistré au toucher ; la base le relit à chaque geste de
 * l'équipe (club_peut).
 */
export function ClubDroitsEditor() {
  const club = useClub();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  if (!club) return <Shimmer className="h-40" />;

  const toggle = async (role: ClubRole, droit: ClubDroit, on: boolean) => {
    const current = club.droits[role];
    const next: ClubDroits = {
      ...club.droits,
      [role]: on ? [...current, droit] : current.filter((entry) => entry !== droit),
    };
    setSaving(true);
    try {
      await clubApi.updateDroits(next);
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-g-h2">Ce que chaque poste peut faire</h2>
        <p className="mt-1 text-g-meta text-muted">La direction peut tout. Un changement vaut tout de suite, sur tous les téléphones.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {CLUB_ROLES.map((role) => (
          <Plate key={role} className="flex flex-col gap-1 p-4">
            <h3 className="g-eyebrow">{CLUB_ROLE_LABELS[role]}</h3>
            {CLUB_DROITS.map(({ droit, label }) => (
              <Switch
                key={droit}
                checked={club.droits[role].includes(droit)}
                disabled={saving}
                onChange={(on) => void toggle(role, droit, on)}
                label={label}
              />
            ))}
          </Plate>
        ))}
      </div>
    </section>
  );
}

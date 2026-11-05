"use client";

import { useState } from "react";
import { AlertIcon } from "@/components/gestion/icons";
import { EmptyState, Field, GlassButton, Input, Plate, SectionHeading, Select, Switch } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/club/format";
import type { ClubOptions, ClubZone } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import type { ClubConditions } from "@/lib/gestion/club-store";
import { CLUB_LIMITS } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";
import { EurosInput, eurosToInput, parseEuros } from "./euros-input";

/*
 * La salle et ses règles : le prix d'une table de chaque zone quand une
 * soirée n'en fixe pas d'autre, ce qu'elle comprend, les conditions
 * d'entrée que le client accepte avant de payer, et ce que le club propose en
 * ligne (acompte, table entière, partage, liste d'invités). Un seul Enregistrer pour
 * tout l'écran (DESIGN § 11) ; un prix manquant se dit au champ.
 * Le dessin de la salle, lui, se fait avec Ominin.
 */

const AGES = Array.from(
  { length: CLUB_LIMITS.minAgeTo - CLUB_LIMITS.minAgeFrom + 1 },
  (_, index) => CLUB_LIMITS.minAgeFrom + index
);

type ZoneDraft = { price: string; inclus: string };

interface Draft {
  zones: Record<string, ZoneDraft>;
  minAge: number;
  dressCode: string;
  refused: string;
  /** L'acompte en %, vide : pas d'acompte. */
  deposit: string;
  options: ClubOptions;
}

function initialDraft(
  zones: ClubZone[],
  conditions: ClubConditions,
  depositPercent: number | null,
  options: ClubOptions
): Draft {
  return {
    zones: Object.fromEntries(
      zones.map((zone) => [zone.id, { price: eurosToInput(zone.priceCents), inclus: zone.inclus ?? "" }])
    ),
    minAge: conditions.minAge,
    dressCode: conditions.dressCode ?? "",
    refused: conditions.refused ?? "",
    deposit: depositPercent === null ? "" : String(depositPercent),
    options,
  };
}

export function ZonesSettings({
  zones,
  tableCounts,
  conditions,
  depositPercent,
  options,
}: {
  zones: ClubZone[];
  tableCounts: Map<string, number>;
  conditions: ClubConditions;
  depositPercent: number | null;
  options: ClubOptions;
}) {
  const toast = useToast();
  const [saved, setSaved] = useState(() => initialDraft(zones, conditions, depositPercent, options));
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const setZone = (id: string, patch: Partial<ZoneDraft>) =>
    setDraft((current) => ({ ...current, zones: { ...current.zones, [id]: { ...current.zones[id], ...patch } } }));

  const prices = Object.fromEntries(zones.map((zone) => [zone.id, parseEuros(draft.zones[zone.id].price)]));
  const priceError = (zone: ClubZone) =>
    prices[zone.id] === null || (prices[zone.id] ?? 0) <= 0 ? "Un prix en euros, au-dessus de zéro." : undefined;
  const changedZones = zones.filter(
    (zone) =>
      prices[zone.id] !== parseEuros(saved.zones[zone.id].price) ||
      draft.zones[zone.id].inclus.trim() !== saved.zones[zone.id].inclus.trim()
  );
  const conditionsChanged =
    draft.minAge !== saved.minAge ||
    draft.dressCode.trim() !== saved.dressCode.trim() ||
    draft.refused.trim() !== saved.refused.trim();
  const deposit = draft.deposit.trim() ? Number(draft.deposit.replace(",", ".")) : null;
  const depositError =
    deposit === null || (Number.isFinite(deposit) && deposit >= 1 && deposit <= 100)
      ? !draft.options.fullTable && deposit === null
        ? "Sans table payée entière, un acompte est nécessaire."
        : undefined
      : "Un pourcentage entre 1 et 100, ou vide.";
  const depositChanged = draft.deposit.trim() !== saved.deposit.trim();
  const optionsChanged = JSON.stringify(draft.options) !== JSON.stringify(saved.options);
  const setOption = (patch: Partial<ClubOptions>) => setDraft({ ...draft, options: { ...draft.options, ...patch } });
  const dirty = changedZones.length > 0 || conditionsChanged || depositChanged || optionsChanged;
  const valid = !zones.some((zone) => priceError(zone)) && !depositError;

  const save = async () => {
    if (!valid) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        ...changedZones.map((zone) =>
          clubApi.updateZone(zone.id, {
            priceCents: prices[zone.id] ?? zone.priceCents,
            inclus: draft.zones[zone.id].inclus.trim() || null,
          })
        ),
        conditionsChanged
          ? clubApi.updateConditions({
              minAge: draft.minAge,
              dressCode: draft.dressCode.trim() || null,
              refused: draft.refused.trim() || null,
            })
          : Promise.resolve(),
        depositChanged ? clubApi.updateDepositPercent(deposit) : Promise.resolve(),
        optionsChanged ? clubApi.updateOptions(draft.options) : Promise.resolve(),
      ]);
      const normalized: Draft = {
        ...draft,
        zones: Object.fromEntries(
          zones.map((zone) => [
            zone.id,
            { price: eurosToInput(prices[zone.id] ?? zone.priceCents), inclus: draft.zones[zone.id].inclus.trim() },
          ])
        ),
      };
      setSaved(normalized);
      setDraft(normalized);
      setShowErrors(false);
      toast.success(
        changedZones.length > 0
          ? `${changedZones.map((zone) => `${zone.name} : ${formatCents(prices[zone.id] ?? 0)} la table`).join(" · ")}.`
          : "Réglages enregistrés."
      );
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="flex flex-col gap-6"
    >
      <section className="flex flex-col gap-3">
        <SectionHeading
          title="Zones et prix"
          sub="Le prix par défaut d'une table, zone par zone. Une soirée peut le changer pour son soir ; elle le reprend sinon."
        />
        {zones.length === 0 ? (
          <EmptyState text="Aucune zone pour l'instant : le plan de votre salle se dessine avec Ominin." />
        ) : (
        <Plate className="divide-y divide-hairline">
          {zones.map((zone) => {
            const count = tableCounts.get(zone.id) ?? 0;
            return (
              <div key={zone.id} className="flex flex-col gap-4 px-5 py-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-g-name">{zone.name}</h3>
                  <p className="text-g-meta text-muted tabular-nums">
                    {count} table{count > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                  <Field label="Prix d'une table" required error={showErrors ? priceError(zone) : undefined}>
                    <EurosInput
                      value={draft.zones[zone.id].price}
                      onChange={(price) => setZone(zone.id, { price })}
                      placeholder="1 500"
                      label={`Prix d'une table ${zone.name}`}
                    />
                  </Field>
                  <Field label="Ce que comprend la table" hint="Affiché sur l'offre côté client.">
                    <Input
                      value={draft.zones[zone.id].inclus}
                      aria-label={`Ce que comprend une table ${zone.name}`}
                      maxLength={CLUB_LIMITS.inclus}
                      onChange={(event) => setZone(zone.id, { inclus: event.target.value })}
                      placeholder="2 bouteilles 70 cl, softs à volonté"
                    />
                  </Field>
                </div>
              </div>
            );
          })}
        </Plate>
        )}
        <p className="text-g-meta text-muted">
          Le plan de la salle se dessine avec Ominin : écrivez-nous pour ajouter une zone ou déplacer une table.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading
          title="Conditions d'entrée"
          sub="Montrées au client avant qu'il paie sa table : il les accepte pour réserver."
        />
        <Plate className="flex flex-col gap-4 p-5">
          <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
            <Field label="Âge minimum">
              <Select value={draft.minAge} onChange={(event) => setDraft({ ...draft, minAge: Number(event.target.value) })}>
                {AGES.map((age) => (
                  <option key={age} value={age}>
                    {age} ans
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tenue" hint="Vide : pas de consigne.">
              <Input
                value={draft.dressCode}
                maxLength={CLUB_LIMITS.dressCode}
                onChange={(event) => setDraft({ ...draft, dressCode: event.target.value })}
                placeholder="Tenue correcte exigée"
              />
            </Field>
          </div>
          <Field label="Refusé à l'entrée" hint="Vide : rien de particulier.">
            <Input
              value={draft.refused}
              maxLength={CLUB_LIMITS.refused}
              onChange={(event) => setDraft({ ...draft, refused: event.target.value })}
              placeholder="Baskets de sport, casquettes"
            />
          </Field>
        </Plate>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading
          title="Réservation en ligne"
          sub="Ce que le client peut choisir en réservant sa table, et la liste d'invités des soirées."
        />
        <Plate className="flex flex-col gap-4 p-5">
          <Field
            label="Acompte"
            hint="En % du prix de la table ; le reste se règle sur place. Vide : pas d'acompte en ligne."
            error={showErrors ? depositError : undefined}
          >
            <Input
              numeric
              type="number"
              inputMode="decimal"
              min={1}
              max={100}
              value={draft.deposit}
              onChange={(event) => setDraft({ ...draft, deposit: event.target.value })}
              placeholder="10"
              className="max-w-40"
            />
          </Field>
          <Switch
            checked={draft.options.fullTable}
            onChange={(fullTable) => setOption({ fullTable })}
            label="Payer la table entière en ligne"
            hint="Coupé, le client ne paie que l'acompte."
          />
          <Switch
            checked={draft.options.sharing}
            onChange={(sharing) => setOption({ sharing })}
            label="Partager la table entre amis"
            hint="L'organisateur envoie un lien ; chacun paie sa part avant la soirée."
          />
          <Switch
            checked={draft.options.guestList}
            onChange={(guestList) => setOption({ guestList })}
            label="Liste d'invités"
            hint="Coupée, les soirées ne la proposent plus."
          />
        </Plate>
      </section>

      <div className="soirees-barre g-glass flex min-h-[calc(var(--g-control)+1rem)] flex-wrap items-center justify-end gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <p className="mr-auto flex min-w-0 items-center gap-2 text-g-label" aria-live="polite">
          {saving ? (
            <span className="text-muted">Enregistrement…</span>
          ) : showErrors && !valid ? (
            <>
              <AlertIcon className="size-4 shrink-0 text-ember-3" />
              <span className="font-medium">Un champ est à corriger</span>
            </>
          ) : dirty ? (
            <>
              <span className="size-2 shrink-0 rounded-full bg-ember-1" aria-hidden />
              <span className="font-medium">À enregistrer</span>
            </>
          ) : (
            <span className="text-muted">Enregistré</span>
          )}
        </p>
        {dirty && (
          <>
            <GlassButton
              onClick={() => {
                setDraft(saved);
                setShowErrors(false);
              }}
            >
              Annuler
            </GlassButton>
            <GlassButton type="submit" variant="primary" disabled={saving}>
              Enregistrer
            </GlassButton>
          </>
        )}
      </div>
    </form>
  );
}

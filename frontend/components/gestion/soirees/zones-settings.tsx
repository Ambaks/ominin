"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/club/format";
import type { ClubZone } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import type { ClubConditions } from "@/lib/gestion/club-store";
import { CLUB_LIMITS } from "@/lib/gestion/constants";
import { EurosInput, eurosToInput, parseEuros } from "./euros-input";

/*
 * La salle et ses règles : le prix d'une table de chaque zone quand une
 * soirée n'en fixe pas d'autre, ce qu'elle comprend, et les conditions
 * d'entrée que le client accepte avant de payer. Le dessin de la salle, lui,
 * se fait avec Ominin.
 */

const AGES = Array.from(
  { length: CLUB_LIMITS.minAgeTo - CLUB_LIMITS.minAgeFrom + 1 },
  (_, index) => CLUB_LIMITS.minAgeFrom + index
);

function SaveBar({ saving, disabled, onReset }: { saving: boolean; disabled: boolean; onReset: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onReset}
        className="min-h-11 rounded-full border border-hairline px-4 text-sm font-semibold text-muted transition-colors hover:text-foreground lg:pointer-fine:min-h-9"
      >
        Annuler
      </button>
      <button
        type="submit"
        disabled={saving || disabled}
        className="ember-gradient min-h-11 rounded-full px-4 text-sm font-semibold text-background disabled:opacity-50 lg:pointer-fine:min-h-9"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}

function ConditionsForm({ conditions, depositPercent }: { conditions: ClubConditions; depositPercent: number | null }) {
  const toast = useToast();
  const [minAge, setMinAge] = useState(conditions.minAge);
  const [dressCode, setDressCode] = useState(conditions.dressCode ?? "");
  const [refused, setRefused] = useState(conditions.refused ?? "");
  const [saving, setSaving] = useState(false);
  const dirty =
    minAge !== conditions.minAge ||
    dressCode.trim() !== (conditions.dressCode ?? "") ||
    refused.trim() !== (conditions.refused ?? "");

  const save = async () => {
    setSaving(true);
    try {
      await clubApi.updateConditions({
        minAge,
        dressCode: dressCode.trim() || null,
        refused: refused.trim() || null,
      });
      toast.success("Conditions d'entrée enregistrées.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-display text-lg font-medium">Conditions d&rsquo;entrée</h2>
        <p className="mt-1 text-sm text-muted">
          Montrées au client avant qu&rsquo;il paie sa table : il les accepte pour réserver.
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5"
      >
        <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
          <Field label="Âge minimum">
            <select value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} className={inputClass}>
              {AGES.map((age) => (
                <option key={age} value={age}>
                  {age} ans
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tenue" hint="Vide : pas de consigne.">
            <input
              value={dressCode}
              maxLength={CLUB_LIMITS.dressCode}
              onChange={(e) => setDressCode(e.target.value)}
              placeholder="Tenue correcte exigée"
              className={inputClass}
            />
          </Field>
        </div>
        <p className="flex items-start gap-2 rounded-xl border border-hairline bg-background/40 px-3 py-2.5 text-sm text-muted">
          <span className="etoile mt-0.5" aria-hidden />
          <span>
            {depositPercent
              ? `Acompte en ligne : ${depositPercent} % de la table, frais compris — le reste se règle à la porte. Réglé par Ominin.`
              : "Les tables se paient en entier en ligne. Réglé par Ominin."}
          </span>
        </p>
        <Field label="Refusé à l'entrée" hint="Vide : rien de particulier.">
          <input
            value={refused}
            maxLength={CLUB_LIMITS.refused}
            onChange={(e) => setRefused(e.target.value)}
            placeholder="Baskets de sport, casquettes"
            className={inputClass}
          />
        </Field>
        {dirty && (
          <SaveBar
            saving={saving}
            disabled={false}
            onReset={() => {
              setMinAge(conditions.minAge);
              setDressCode(conditions.dressCode ?? "");
              setRefused(conditions.refused ?? "");
            }}
          />
        )}
      </form>
    </section>
  );
}

function ZoneRow({ zone, tableCount }: { zone: ClubZone; tableCount: number }) {
  const toast = useToast();
  const [price, setPrice] = useState(eurosToInput(zone.priceCents));
  const [inclus, setInclus] = useState(zone.inclus ?? "");
  const [saving, setSaving] = useState(false);

  const priceCents = parseEuros(price);
  const priceError = priceCents === null || priceCents <= 0 ? "Indiquez un prix." : undefined;
  const dirty = priceCents !== zone.priceCents || inclus.trim() !== (zone.inclus ?? "");

  const save = async () => {
    if (priceCents === null || priceError) return;
    setSaving(true);
    try {
      await clubApi.updateZone(zone.id, { priceCents, inclus: inclus.trim() || null });
      toast.success(`${zone.name} : ${formatCents(priceCents)} la table.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      className="flex flex-col gap-4 px-5 py-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-base font-medium">{zone.name}</h3>
        <p className="text-xs text-muted">
          {tableCount} table{tableCount > 1 ? "s" : ""}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label="Prix d'une table" required error={dirty ? priceError : undefined}>
          <EurosInput value={price} onChange={setPrice} invalid={dirty && Boolean(priceError)} />
        </Field>
        <Field label="Ce que comprend la table" hint="Lu par le client sur le plan.">
          <input
            value={inclus}
            maxLength={CLUB_LIMITS.inclus}
            onChange={(event) => setInclus(event.target.value)}
            placeholder="2 bouteilles 70 cl, softs à volonté"
            className={inputClass}
          />
        </Field>
      </div>
      {dirty && (
        <SaveBar
          saving={saving}
          disabled={Boolean(priceError)}
          onReset={() => {
            setPrice(eurosToInput(zone.priceCents));
            setInclus(zone.inclus ?? "");
          }}
        />
      )}
    </form>
  );
}

export function ZonesSettings({
  zones,
  tableCounts,
  conditions,
  depositPercent,
}: {
  zones: ClubZone[];
  tableCounts: Map<string, number>;
  conditions: ClubConditions;
  depositPercent: number | null;
}) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-lg font-medium">Zones et prix</h2>
          <p className="mt-1 text-sm text-muted">
            Le prix par défaut d&rsquo;une table, zone par zone. Une soirée peut le changer pour son
            soir ; elle le reprend sinon.
          </p>
        </div>
        <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
          {zones.map((zone) => (
            <ZoneRow key={zone.id} zone={zone} tableCount={tableCounts.get(zone.id) ?? 0} />
          ))}
        </div>
        <p className="text-xs text-muted">
          Le plan de la salle se dessine avec Ominin : écrivez-nous pour ajouter une zone ou déplacer
          une table.
        </p>
      </section>
      <ConditionsForm key={JSON.stringify(conditions)} conditions={conditions} depositPercent={depositPercent} />
    </div>
  );
}

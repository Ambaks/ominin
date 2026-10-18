"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { PriceInput } from "@/components/ui/price-input";
import { useToast } from "@/components/ui/toast";
import { formatCents } from "@/lib/club/format";
import type { ClubZone } from "@/lib/club/types";
import * as clubApi from "@/lib/gestion/club-api";
import { CLUB_LIMITS } from "@/lib/gestion/constants";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";

/*
 * Le prix d'une table de chaque zone quand une soirée n'en fixe pas d'autre,
 * et ce qu'elle comprend, lu par le client sur le plan. Le dessin de la
 * salle, lui, se fait avec Ominin.
 */

function ZoneRow({ zone, tableCount }: { zone: ClubZone; tableCount: number }) {
  const toast = useToast();
  const [price, setPrice] = useState(priceToInput(zone.priceCents / 100));
  const [inclus, setInclus] = useState(zone.inclus ?? "");
  const [saving, setSaving] = useState(false);

  const parsed = parsePriceInput(price);
  const priceCents = parsed === null ? null : Math.round(parsed * 100);
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
        <p className="text-xs text-faint">
          {tableCount} table{tableCount > 1 ? "s" : ""}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label="Prix d'une table" required error={dirty ? priceError : undefined}>
          <PriceInput value={price} onChange={setPrice} invalid={dirty && Boolean(priceError)} />
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
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setPrice(priceToInput(zone.priceCents / 100));
              setInclus(zone.inclus ?? "");
            }}
            className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || Boolean(priceError)}
            className="ember-gradient rounded-full px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      )}
    </form>
  );
}

export function ZonesSettings({ zones, tableCounts }: { zones: ClubZone[]; tableCounts: Map<string, number> }) {
  return (
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
      <p className="text-xs text-faint">
        Le plan de la salle se dessine avec Ominin : écrivez-nous pour ajouter une zone ou déplacer
        une table.
      </p>
    </section>
  );
}

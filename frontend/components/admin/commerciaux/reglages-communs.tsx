"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { updateSettings, type CommercialSettings } from "@/lib/admin/commerciaux";

type Key = "commission_percent" | "term_months" | "visit_request_days";

/* Les réglages communs à tous les commerciaux, saisis par l'admin : aucune valeur n'est écrite dans le code. */
const FIELDS: { key: Key; label: string; unit: string; hint: string; required: boolean }[] = [
  {
    key: "commission_percent",
    label: "Commission (taux de base)",
    unit: "%",
    hint: "Part de ce qu’Ominin gagne sur chaque restaurant signé. Un commercial peut en avoir un plus haut, sur sa fiche.",
    required: true,
  },
  {
    key: "term_months",
    label: "Durée de la commission",
    unit: "mois",
    hint: "À partir de l’inscription de chaque restaurant. C’est aussi la durée du contrat, la même pour tous : le contrat signé l’écrit.",
    required: true,
  },
  {
    key: "visit_request_days",
    label: "Délai d’une demande de visite",
    unit: "jours",
    hint: "Sans réponse, ou refusée sans que le restaurant avance, il est libéré pour tous. Vide : jamais libéré.",
    required: false,
  },
];

export function CommonSettings({ settings, onSaved }: { settings: CommercialSettings; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const [draft, setDraft] = useState(
    () => Object.fromEntries(FIELDS.map(({ key }) => [key, settings[key]?.toString() ?? ""])) as Record<Key, string>
  );

  const incomplete = FIELDS.some(({ key, required }) => required && draft[key] === "");

  const save = async () => {
    try {
      await updateSettings(Object.fromEntries(FIELDS.map(({ key }) => [key, draft[key] === "" ? null : Number(draft[key])])));
      toast.success("Réglages enregistrés.");
      await onSaved();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">Réglages communs</h2>
      <ul className="flex flex-col divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
        {FIELDS.map(({ key, label, unit, hint, required }) => (
          <li key={key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <label htmlFor={`setting-${key}`} className="min-w-0 flex-1 text-sm">
              {label}
              {required && <span className="text-ember-2"> *</span>}
              <span className="block text-xs text-faint">{hint}</span>
            </label>
            <span className="flex items-center gap-2 text-sm text-muted">
              <input
                id={`setting-${key}`}
                type="number"
                step={key === "commission_percent" ? "any" : 1}
                min={0}
                value={draft[key]}
                onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                className={`${inputClass} w-28`}
              />
              {unit}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={incomplete}
        onClick={() => void save()}
        className="ember-gradient self-start rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
      >
        Enregistrer
      </button>
    </section>
  );
}

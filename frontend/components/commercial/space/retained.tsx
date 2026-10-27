"use client";

import { Field, inputClass } from "@/components/ui/field";
import {
  BEST_TIME_OPTIONS,
  INTEREST_OPTIONS,
  OBJECTIONS,
  TPE_OPTIONS,
  type Retained,
} from "@/lib/commercial/labels";
import { installSection, otherTills } from "@/lib/landing-data";
import { Chips, Choice, FieldGroup } from "./ui";

/** Caisses : les partenaires affichés sur le site, les autres connues, « aucune », « autre ». */
const TILLS = [
  ...installSection.integrations.partners.filter((partner) => partner.kind === "caisse").map((partner) => partner.name),
  ...otherTills.map((till) => till.name),
  "Aucune",
  "Autre",
];

/*
 * La fiche retenue (4.5) : ce que le commercial a vu sur place. Les champs
 * fermés restent dans l'historique du restaurant, visibles des commerciaux
 * suivants ; la précision libre ne l'est que de lui et d'Ominin.
 */
export function RetainedFields({
  value,
  onChange,
  noteMax,
}: {
  value: Retained;
  onChange: (next: Retained) => void;
  noteMax: number | null;
}) {
  const set = <K extends keyof Retained>(key: K, next: Retained[K] | undefined) => {
    const copy = { ...value };
    if (next === undefined || next === "") delete copy[key];
    else copy[key] = next;
    onChange(copy);
  };
  return (
    <div className="flex flex-col gap-5">
      <Field label="Caisse">
        <select value={value.till ?? ""} onChange={(event) => set("till", event.target.value)} className={inputClass}>
          <option value="">—</option>
          {TILLS.map((till) => (
            <option key={till} value={till}>
              {till}
            </option>
          ))}
        </select>
      </Field>
      <FieldGroup label="Terminal de paiement">
        <Choice options={TPE_OPTIONS} value={value.tpe} onChange={(tpe) => set("tpe", tpe)} />
      </FieldGroup>
      <FieldGroup label="Solution concurrente">
        <Choice
          options={[
            { id: "oui", label: "Oui" },
            { id: "non", label: "Non" },
          ]}
          value={value.competitor === undefined ? undefined : value.competitor ? "oui" : "non"}
          onChange={(answer) => onChange({ ...value, competitor: answer === "oui", ...(answer === "non" && { competitor_name: undefined }) })}
        />
      </FieldGroup>
      {value.competitor && (
        <Field label="Laquelle">
          <input
            value={value.competitor_name ?? ""}
            onChange={(event) => set("competitor_name", event.target.value)}
            className={inputClass}
          />
        </Field>
      )}
      <Field label="Nombre de tables">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={value.tables ?? ""}
          onChange={(event) => set("tables", event.target.value === "" ? undefined : Number(event.target.value))}
          className={inputClass}
        />
      </Field>
      <FieldGroup label="Objections">
        <Chips
          options={OBJECTIONS}
          value={value.objections ?? []}
          onChange={(next) => set("objections", next.length ? next : undefined)}
        />
      </FieldGroup>
      <FieldGroup label="Intérêt">
        <Choice options={INTEREST_OPTIONS} value={value.interest} onChange={(interest) => set("interest", interest)} />
      </FieldGroup>
      <FieldGroup label="Meilleur moment pour passer">
        <Choice options={BEST_TIME_OPTIONS} value={value.best_time} onChange={(time) => set("best_time", time)} />
      </FieldGroup>
      <Field label="Précision" hint="Visible de vous et d’Ominin seulement.">
        <textarea
          value={value.note ?? ""}
          onChange={(event) => set("note", event.target.value)}
          maxLength={noteMax ?? undefined}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </Field>
    </div>
  );
}

/** Lecture des champs fermés, pour l'historique. */
export function retainedSummary(retained: Retained): string[] {
  const label = <T extends { id: string; label: string }>(options: readonly T[], id?: string) =>
    options.find((option) => option.id === id)?.label;
  return [
    retained.till && `Caisse : ${retained.till}`,
    retained.tpe && `TPE : ${label(TPE_OPTIONS, retained.tpe)}`,
    retained.competitor !== undefined &&
      (retained.competitor ? `Concurrent : ${retained.competitor_name || "oui"}` : "Pas de concurrent"),
    retained.tables !== undefined && `${retained.tables} tables`,
    retained.objections?.length &&
      `Objections : ${retained.objections.map((id) => label(OBJECTIONS, id)?.toLowerCase()).join(", ")}`,
    retained.interest && `Intérêt ${label(INTEREST_OPTIONS, retained.interest)?.toLowerCase()}`,
    retained.best_time && `Passer : ${label(BEST_TIME_OPTIONS, retained.best_time)?.toLowerCase()}`,
  ].filter((line): line is string => Boolean(line));
}

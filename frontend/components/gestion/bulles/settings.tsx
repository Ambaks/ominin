"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PriceInput } from "@/components/ui/price-input";
import { Toggle } from "@/components/ui/toggle";
import { useRunMutation } from "@/components/ui/toast";
import { WEEKDAY_NAMES, formatStartMinutes } from "@/lib/bulles/format";
import { BULLE_LIMITS, NEW_BULLE_COLOR } from "@/lib/bulles/limits";
import { DEFAULT_VAT_RATE, VAT_RATES } from "@/lib/gestion/constants";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";
import type { Table } from "@/lib/gestion/types";
import {
  addCreneau,
  removeCreneau,
  saveBulle,
  saveReglages,
  type Bulle,
  type BulleSetup,
} from "@/lib/gestion/bulles-api";

const PRIMARY =
  "ember-gradient min-h-11 rounded-full px-5 text-sm font-semibold text-background disabled:opacity-50";
const SECONDARY =
  "min-h-11 rounded-full border border-hairline px-4 text-sm font-semibold text-foreground transition-colors hover:border-ember-2/40 disabled:opacity-50";
const SECTION = "flex flex-col gap-4 border-b border-hairline pb-6 last:border-b-0 last:pb-0";
const TITLE = "font-display text-base font-medium";

/** Un entier saisi, ou null s'il n'en est pas un. */
const integer = (value: string) => (/^\d+$/.test(value) ? Number(value) : null);

function ReglagesForm({
  etablissementId,
  setup,
  onSaved,
}: {
  etablissementId: string;
  setup: BulleSetup;
  onSaved: () => void;
}) {
  const run = useRunMutation();
  const current = setup.reglages;
  const [price, setPrice] = useState(current ? priceToInput(current.place_cents / 100) : "");
  const [minParty, setMinParty] = useState(String(current?.min_party ?? ""));
  const [maxParty, setMaxParty] = useState(String(current?.max_party ?? ""));
  const [duration, setDuration] = useState(String(current?.duration_minutes ?? ""));
  const [days, setDays] = useState(String(current?.booking_days ?? ""));
  const [vatRate, setVatRate] = useState(String(current?.vat_rate ?? DEFAULT_VAT_RATE));
  const [busy, setBusy] = useState(false);

  const euros = parsePriceInput(price);
  const values = {
    place_cents: euros !== null ? Math.round(euros * 100) : null,
    min_party: integer(minParty),
    max_party: integer(maxParty),
    duration_minutes: integer(duration),
    booking_days: integer(days),
  };
  const within = (value: number | null, range: { min: number; max: number }): value is number =>
    value !== null && value >= range.min && value <= range.max;
  const valid =
    values.place_cents !== null &&
    values.place_cents > 0 &&
    within(values.min_party, BULLE_LIMITS.party) &&
    within(values.max_party, BULLE_LIMITS.party) &&
    values.min_party <= values.max_party &&
    within(values.duration_minutes, BULLE_LIMITS.durationMinutes) &&
    within(values.booking_days, BULLE_LIMITS.bookingDays);

  return (
    <form
      className={SECTION}
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (!valid) return;
        setBusy(true);
        await run(
          () =>
            saveReglages(etablissementId, {
              place_cents: values.place_cents!,
              min_party: values.min_party!,
              max_party: values.max_party!,
              duration_minutes: values.duration_minutes!,
              booking_days: values.booking_days!,
              vat_rate: Number(vatRate),
            }),
          "Réglages enregistrés."
        );
        setBusy(false);
        onSaved();
      }}
    >
      <h3 className={TITLE}>La réservation</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prix par personne" required>
          <PriceInput value={price} onChange={setPrice} />
        </Field>
        <Field label="Durée d'un créneau (min)" required>
          <input inputMode="numeric" className={inputClass} value={duration} onChange={(event) => setDuration(event.target.value)} />
        </Field>
        <Field label="Minimum de personnes" required hint="Places payées pour confirmer la bulle.">
          <input inputMode="numeric" className={inputClass} value={minParty} onChange={(event) => setMinParty(event.target.value)} />
        </Field>
        <Field label="Maximum de personnes" required>
          <input inputMode="numeric" className={inputClass} value={maxParty} onChange={(event) => setMaxParty(event.target.value)} />
        </Field>
        <Field label="Réservable jusqu'à (jours)" required hint="Combien de jours à l'avance.">
          <input inputMode="numeric" className={inputClass} value={days} onChange={(event) => setDays(event.target.value)} />
        </Field>
        <Field label="TVA" hint="Comme un article de la carte : portée sur la vente en caisse.">
          <select value={vatRate} onChange={(event) => setVatRate(event.target.value)} className={inputClass}>
            {VAT_RATES.map((rate) => (
              <option key={rate} value={String(rate)}>
                {String(rate).replace(".", ",")} %
              </option>
            ))}
          </select>
        </Field>
      </div>
      <button type="submit" className={`${PRIMARY} self-end`} disabled={!valid || busy}>
        Enregistrer
      </button>
    </form>
  );
}

/** Les créneaux de chaque jour : une heure de début, la durée vient des réglages. */
function CreneauxEditor({
  etablissementId,
  setup,
  dayEndHour,
  onSaved,
}: {
  etablissementId: string;
  setup: BulleSetup;
  dayEndHour: number;
  onSaved: () => void;
}) {
  const run = useRunMutation();
  const [weekday, setWeekday] = useState(1);
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const ofDay = setup.creneaux.filter((creneau) => creneau.weekday === weekday);

  const add = async () => {
    const match = /^(\d{2}):(\d{2})$/.exec(time);
    if (!match) return;
    const hours = Number(match[1]);
    // Avant l'heure de bascule, c'est encore la nuit du jour choisi.
    const minutes = hours * 60 + Number(match[2]) + (hours < dayEndHour ? 1440 : 0);
    setBusy(true);
    await run(() => addCreneau(etablissementId, weekday, minutes));
    setBusy(false);
    setTime("");
    onSaved();
  };

  return (
    <div className={SECTION}>
      <h3 className={TITLE}>Les créneaux</h3>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Jour">
        {WEEKDAY_NAMES.map((name, index) => {
          const count = setup.creneaux.filter((creneau) => creneau.weekday === index + 1).length;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={weekday === index + 1}
              onClick={() => setWeekday(index + 1)}
              className={`min-h-11 rounded-full px-3.5 text-sm font-semibold transition-colors ${
                weekday === index + 1 ? "ember-gradient text-background" : "border border-hairline text-muted"
              }`}
            >
              {name.slice(0, 3)}
              {count > 0 && <span className="ml-1 tabular-nums opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>
      {ofDay.length === 0 ? (
        <p className="text-sm text-muted">Aucun créneau le {WEEKDAY_NAMES[weekday - 1].toLowerCase()} : les bulles n&rsquo;y sont pas réservables.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {ofDay.map((creneau) => (
            <li key={creneau.id} className="flex items-center gap-1 rounded-full border border-hairline py-1 pl-4 pr-1 text-sm font-medium tabular-nums">
              {formatStartMinutes(creneau.start_minutes)}
              <button
                type="button"
                aria-label={`Retirer le créneau de ${formatStartMinutes(creneau.start_minutes)}`}
                className="flex size-9 items-center justify-center rounded-full text-muted hover:text-foreground"
                onClick={async () => {
                  await run(() => removeCreneau(creneau.id), "Créneau retiré.");
                  onSaved();
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <Field label="Nouveau créneau" hint={`Avant ${dayEndHour} h, il compte pour la nuit du jour choisi.`}>
          <input type="time" className={inputClass} value={time} onChange={(event) => setTime(event.target.value)} />
        </Field>
        <button type="button" className={`${SECONDARY} mb-[1.375rem]`} disabled={!time || busy} onClick={() => void add()}>
          Ajouter
        </button>
      </div>
    </div>
  );
}

function BulleRow({
  etablissementId,
  bulle,
  tables,
  onSaved,
}: {
  etablissementId: string;
  bulle: Bulle;
  tables: Table[];
  onSaved: () => void;
}) {
  const run = useRunMutation();
  const [name, setName] = useState(bulle.name);
  const [color, setColor] = useState(bulle.color);
  const changed = name.trim() !== bulle.name || color !== bulle.color;
  const save = async (patch: Partial<Pick<Bulle, "active" | "table_id">> = {}) => {
    await run(
      () =>
        saveBulle(etablissementId, {
          id: bulle.id,
          name: name.trim(),
          color,
          active: patch.active ?? bulle.active,
          sort: bulle.sort,
          table_id: patch.table_id !== undefined ? patch.table_id : bulle.table_id,
        }),
      "Bulle enregistrée."
    );
    onSaved();
  };
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-hairline p-3">
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          aria-label={`Couleur de ${bulle.name}`}
          className="size-11 shrink-0 cursor-pointer rounded-full border border-hairline bg-transparent"
        />
        <input
          className={inputClass}
          value={name}
          maxLength={BULLE_LIMITS.nameMax}
          aria-label="Nom de la bulle"
          onChange={(event) => setName(event.target.value)}
        />
        {changed && name.trim() && (
          <button type="button" className={SECONDARY} onClick={() => void save()}>
            OK
          </button>
        )}
        <Toggle checked={bulle.active} onChange={(active) => void save({ active })} label={`${bulle.name} en service`} />
      </div>
      <label className="flex items-center justify-between gap-3 text-sm text-muted">
        Table du menu QR
        <select
          className={`${inputClass} max-w-40`}
          value={bulle.table_id ?? ""}
          onChange={(event) => void save({ table_id: event.target.value || null })}
        >
          <option value="">Aucune</option>
          {tables.map((table) => (
            <option key={table.id} value={table.id}>
              Table {table.number}
            </option>
          ))}
        </select>
      </label>
    </li>
  );
}

export function BullesSettings({
  etablissementId,
  setup,
  tables,
  dayEndHour,
  onClose,
  onSaved,
}: {
  etablissementId: string;
  setup: BulleSetup;
  /** Les tables de la salle : celle posée dans une bulle n'y commande qu'une fois les places payées. */
  tables: Table[];
  dayEndHour: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const run = useRunMutation();
  return (
    <Modal title="Réglages des bulles" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <ReglagesForm etablissementId={etablissementId} setup={setup} onSaved={onSaved} />
        <CreneauxEditor etablissementId={etablissementId} setup={setup} dayEndHour={dayEndHour} onSaved={onSaved} />
        <div className={SECTION}>
          <h3 className={TITLE}>Les bulles</h3>
          <ul className="flex flex-col gap-3">
            {setup.bulles.map((bulle) => (
              <BulleRow
                key={`${bulle.id}:${bulle.name}:${bulle.color}`}
                etablissementId={etablissementId}
                bulle={bulle}
                tables={tables}
                onSaved={onSaved}
              />
            ))}
          </ul>
          <p className="text-xs text-faint">
            Une bulle retirée n&rsquo;est plus proposée ; ses réservations restent. Sur la table d&rsquo;une bulle, le
            menu QR ne prend de commande qu&rsquo;une fois toutes les places du groupe payées.
          </p>
          <button
            type="button"
            className={`${SECONDARY} self-start`}
            onClick={async () => {
              await run(
                () =>
                  saveBulle(etablissementId, {
                    name: `Bulle ${setup.bulles.length + 1}`,
                    color: setup.bulles.at(-1)?.color ?? NEW_BULLE_COLOR,
                    active: false,
                    sort: setup.bulles.length + 1,
                    table_id: null,
                  }),
                "Bulle ajoutée, hors service : nommez-la puis mettez-la en service."
              );
              onSaved();
            }}
          >
            Ajouter une bulle
          </button>
        </div>
      </div>
    </Modal>
  );
}

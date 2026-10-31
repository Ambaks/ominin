"use client";

import { useState } from "react";
import { GlassButton } from "@/components/gestion/ui";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PriceInput } from "@/components/ui/price-input";
import { Toggle } from "@/components/ui/toggle";
import { useRunMutation } from "@/components/ui/toast";
import { WEEKDAY_NAMES, formatDuration, formatStartMinutes } from "@/lib/bulles/format";
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

/*
 * Les réglages des réservations : la réservation (prix, durée, groupe,
 * délai), les créneaux de chaque jour, les bulles. Un établissement qui
 * n'a rien réglé part des valeurs proposées par UX-SIMPLICITE § 3.13 — 90
 * minutes, 2 à 6 personnes, 30 jours — et d'un préréglage de créneaux ; une
 * bulle naît en service, nommée. Un seul modèle d'enregistrement : la
 * réservation par Enregistrer (le bouton dit ce qui manque), tout le reste
 * s'enregistre au geste.
 */

/** Les valeurs proposées à un établissement qui n'a rien réglé (UX-SIMPLICITE § 3.13). */
const PROPOSED = { durationMinutes: 90, minParty: 2, maxParty: 6, bookingDays: 30 } as const;
/** Le préréglage de créneaux : du jeudi au samedi, de 20 h à 2 h. */
const PRESET = { weekdays: [4, 5, 6], fromMinutes: 20 * 60, toMinutes: 26 * 60 } as const;

const SECTION = "flex flex-col gap-4 border-b border-hairline pb-6 last:border-b-0 last:pb-0";
const TITLE = "font-display text-g-h2";
const SUB = "-mt-2 text-g-meta text-muted";

/** Un entier saisi, ou null s'il n'en est pas un. */
const integer = (value: string) => (/^\d+$/.test(value) ? Number(value) : null);
const within = (value: number | null, range: { min: number; max: number }): value is number =>
  value !== null && value >= range.min && value <= range.max;

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
  const [minParty, setMinParty] = useState(String(current?.min_party ?? PROPOSED.minParty));
  const [maxParty, setMaxParty] = useState(String(current?.max_party ?? PROPOSED.maxParty));
  const [duration, setDuration] = useState(String(current?.duration_minutes ?? PROPOSED.durationMinutes));
  const [days, setDays] = useState(String(current?.booking_days ?? PROPOSED.bookingDays));
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
  const errors = {
    price: values.place_cents === null || values.place_cents <= 0 ? "Un prix par personne, au-dessus de zéro." : undefined,
    duration: within(values.duration_minutes, BULLE_LIMITS.durationMinutes)
      ? undefined
      : `De ${BULLE_LIMITS.durationMinutes.min} à ${BULLE_LIMITS.durationMinutes.max} minutes.`,
    min: within(values.min_party, BULLE_LIMITS.party)
      ? values.max_party !== null && values.min_party > values.max_party
        ? "Au plus le maximum."
        : undefined
      : `De ${BULLE_LIMITS.party.min} à ${BULLE_LIMITS.party.max} personnes.`,
    max: within(values.max_party, BULLE_LIMITS.party)
      ? undefined
      : `De ${BULLE_LIMITS.party.min} à ${BULLE_LIMITS.party.max} personnes.`,
    days: within(values.booking_days, BULLE_LIMITS.bookingDays)
      ? undefined
      : `De ${BULLE_LIMITS.bookingDays.min} à ${BULLE_LIMITS.bookingDays.max} jours.`,
  };
  const missing = errors.price
    ? "Indiquez un prix pour enregistrer."
    : errors.duration
      ? "Corrigez la durée pour enregistrer."
      : errors.min || errors.max
        ? "Corrigez le minimum et le maximum pour enregistrer."
        : errors.days
          ? "Corrigez le délai pour enregistrer."
          : null;
  const valid = missing === null;
  const unchanged =
    current !== null &&
    values.place_cents === current.place_cents &&
    values.min_party === current.min_party &&
    values.max_party === current.max_party &&
    values.duration_minutes === current.duration_minutes &&
    values.booking_days === current.booking_days &&
    Number(vatRate) === Number(current.vat_rate);

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
          current ? "Réglages enregistrés." : "Réservations ouvertes : ajoutez vos créneaux et vos bulles."
        );
        setBusy(false);
        onSaved();
      }}
    >
      <h3 className={TITLE}>La réservation</h3>
      <p className={SUB}>Une bulle se réserve par créneau, au prix de la place ; elle est tenue dès que le minimum de places est payé.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prix par personne" required error={errors.price}>
          <PriceInput value={price} onChange={setPrice} invalid={Boolean(errors.price)} />
        </Field>
        <Field label="Durée d'un créneau (min)" required error={errors.duration} hint={values.duration_minutes ? formatDuration(values.duration_minutes) : undefined}>
          <input inputMode="numeric" className={`${inputClass} tabular-nums`} value={duration} aria-invalid={errors.duration ? true : undefined} onChange={(event) => setDuration(event.target.value)} />
        </Field>
        <Field label="Minimum de personnes" required hint="Places payées pour tenir la bulle." error={errors.min}>
          <input inputMode="numeric" className={`${inputClass} tabular-nums`} value={minParty} aria-invalid={errors.min ? true : undefined} onChange={(event) => setMinParty(event.target.value)} />
        </Field>
        <Field label="Maximum de personnes" required error={errors.max}>
          <input inputMode="numeric" className={`${inputClass} tabular-nums`} value={maxParty} aria-invalid={errors.max ? true : undefined} onChange={(event) => setMaxParty(event.target.value)} />
        </Field>
        <Field label="Réservable jusqu'à (jours)" required hint="Combien de jours à l'avance." error={errors.days}>
          <input inputMode="numeric" className={`${inputClass} tabular-nums`} value={days} aria-invalid={errors.days ? true : undefined} onChange={(event) => setDays(event.target.value)} />
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
      <div className="flex flex-wrap items-center justify-end gap-3">
        {missing ? (
          <p className="text-g-meta text-muted">{missing}</p>
        ) : unchanged ? (
          <p className="text-g-meta text-muted">Rien à enregistrer.</p>
        ) : null}
        <button type="submit" className="g-btn g-btn-primary g-press" disabled={!valid || unchanged || busy}>
          {current ? "Enregistrer" : "Ouvrir les réservations"}
        </button>
      </div>
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
  const [weekday, setWeekday] = useState<number>(PRESET.weekdays[0]);
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const ofDay = setup.creneaux.filter((creneau) => creneau.weekday === weekday);
  const duration = setup.reglages?.duration_minutes ?? PROPOSED.durationMinutes;

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

  /** Le préréglage : des créneaux de la durée réglée, de 20 h jusqu'à 2 h, du jeudi au samedi. */
  const preset = async () => {
    setBusy(true);
    await run(async () => {
      for (const day of PRESET.weekdays) {
        for (let start = PRESET.fromMinutes; start + duration <= PRESET.toMinutes; start += duration) {
          await addCreneau(etablissementId, day, start);
        }
      }
    }, "Créneaux ajoutés du jeudi au samedi.");
    setBusy(false);
    onSaved();
  };

  return (
    <div className={SECTION}>
      <h3 className={TITLE}>Les créneaux</h3>
      <p className={SUB}>Les heures de début, jour par jour ; chaque créneau dure {formatDuration(duration)}.</p>
      {setup.creneaux.length === 0 && (
        <GlassButton className="self-start" disabled={busy} onClick={() => void preset()}>
          Jeudi à samedi, 20 h – 2 h
        </GlassButton>
      )}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Jour">
        {WEEKDAY_NAMES.map((name, index) => {
          const count = setup.creneaux.filter((creneau) => creneau.weekday === index + 1).length;
          const selected = weekday === index + 1;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={selected}
              onClick={() => setWeekday(index + 1)}
              className={`g-press flex h-(--g-control) items-center rounded-full px-3.5 text-g-label font-semibold ${
                selected ? "ember-gradient text-background" : "border border-hairline text-muted"
              }`}
            >
              {name.slice(0, 3)}
              {count > 0 && <span className="ml-1 tabular-nums opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>
      {ofDay.length === 0 ? (
        <p className="text-g-body text-muted">Aucun créneau le {WEEKDAY_NAMES[weekday - 1].toLowerCase()} : les bulles n&rsquo;y sont pas réservables.</p>
      ) : (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {ofDay.map((creneau) => (
            <li key={creneau.id} className="flex items-center gap-1 rounded-full border border-hairline py-1 pl-4 pr-1 text-g-label font-medium tabular-nums">
              {formatStartMinutes(creneau.start_minutes)}
              <button
                type="button"
                aria-label={`Retirer le créneau de ${formatStartMinutes(creneau.start_minutes)}`}
                className="g-press flex size-9 items-center justify-center rounded-full text-muted hover:text-foreground"
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
          <input type="time" className={`${inputClass} tabular-nums`} value={time} onChange={(event) => setTime(event.target.value)} />
        </Field>
        <GlassButton className="mb-[1.375rem]" disabled={!time || busy} onClick={() => void add()}>
          Ajouter
        </GlassButton>
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
  const save = async (patch: Partial<Pick<Bulle, "name" | "color" | "active" | "table_id">> = {}) => {
    const nextName = (patch.name ?? name).trim() || bulle.name;
    await run(
      () =>
        saveBulle(etablissementId, {
          id: bulle.id,
          name: nextName,
          color: patch.color ?? color,
          active: patch.active ?? bulle.active,
          sort: bulle.sort,
          table_id: patch.table_id !== undefined ? patch.table_id : bulle.table_id,
        }),
      "Bulle enregistrée."
    );
    onSaved();
  };
  return (
    <li className="flex flex-col gap-2 rounded-g-card border border-hairline p-3">
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          onBlur={() => color !== bulle.color && void save({ color })}
          aria-label={`Couleur de ${bulle.name}`}
          className="size-(--g-control) shrink-0 cursor-pointer rounded-full border border-hairline bg-transparent"
        />
        <input
          className={inputClass}
          value={name}
          maxLength={BULLE_LIMITS.nameMax}
          aria-label="Nom de la bulle"
          onChange={(event) => setName(event.target.value)}
          onBlur={() => name.trim() !== bulle.name && void save({ name })}
        />
        <Toggle checked={bulle.active} onChange={(active) => void save({ active })} label={`${bulle.name} en service`} />
      </div>
      <label className="flex items-center justify-between gap-3 text-g-body text-muted">
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
  const addBulle = async () => {
    const number = setup.bulles.length + 1;
    await run(
      () =>
        saveBulle(etablissementId, {
          name: `Bulle ${number}`,
          color: setup.bulles.at(-1)?.color ?? NEW_BULLE_COLOR,
          active: true,
          sort: number,
          table_id: null,
        }),
      `« Bulle ${number} » ajoutée, en service : renommez-la si vous voulez.`
    );
    onSaved();
  };
  return (
    <Modal title="Réglages des réservations" onClose={onClose}>
      <div className="flex flex-col gap-6">
        <ReglagesForm etablissementId={etablissementId} setup={setup} onSaved={onSaved} />
        <CreneauxEditor etablissementId={etablissementId} setup={setup} dayEndHour={dayEndHour} onSaved={onSaved} />
        <div className={SECTION}>
          <h3 className={TITLE}>Les bulles</h3>
          <p className={SUB}>
            Une bulle est un espace qu&rsquo;un groupe réserve pour un créneau. Hors service, elle n&rsquo;est plus proposée ; ses réservations restent.
            Sur la table d&rsquo;une bulle, le menu QR ne prend de commande qu&rsquo;une fois toutes les places du groupe payées.
          </p>
          {setup.bulles.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
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
          )}
          <GlassButton className="self-start" onClick={() => void addBulle()}>
            Ajouter une bulle
          </GlassButton>
        </div>
      </div>
    </Modal>
  );
}

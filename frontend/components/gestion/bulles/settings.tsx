"use client";

import { useEffect, useRef, useState } from "react";
import { Field, GlassButton, Input, Select, Sheet, Switch } from "@/components/gestion/ui";
import { useRunMutation, useToast } from "@/components/ui/toast";
import { WEEKDAY_NAMES, formatDuration, formatStartMinutes } from "@/lib/bulles/format";
import { BULLE_LIMITS, NEW_BULLE_COLOR } from "@/lib/bulles/limits";
import { DEFAULT_VAT_RATE, VAT_RATES } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";
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
      <p className={SUB}>Une bulle est un espace qu&rsquo;un groupe réserve pour un créneau, au prix de la place ; elle lui est tenue dès que le minimum de places est payé.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prix par personne" required hint="Le prix d'une place." error={price.trim() ? errors.price : undefined}>
          <Input
            numeric
            unit="€"
            placeholder="0,00"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            onBlur={() => euros !== null && setPrice(priceToInput(euros))}
          />
        </Field>
        <Field label="Durée d'un créneau" required error={errors.duration} hint={values.duration_minutes ? formatDuration(values.duration_minutes) : undefined}>
          <Input numeric unit="min" inputMode="numeric" value={duration} onChange={(event) => setDuration(event.target.value)} />
        </Field>
        <Field label="Minimum de personnes" required hint="Places payées pour tenir la bulle." error={errors.min}>
          <Input numeric inputMode="numeric" value={minParty} onChange={(event) => setMinParty(event.target.value)} />
        </Field>
        <Field label="Maximum de personnes" required error={errors.max}>
          <Input numeric inputMode="numeric" value={maxParty} onChange={(event) => setMaxParty(event.target.value)} />
        </Field>
        <Field label="Réservable jusqu'à" required hint="Combien de jours à l'avance." error={errors.days}>
          <Input numeric unit="jours" inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value)} />
        </Field>
        <Field label="TVA" hint="Comme un article de la carte : portée sur la vente en caisse.">
          <Select value={vatRate} onChange={(event) => setVatRate(event.target.value)}>
            {VAT_RATES.map((rate) => (
              <option key={rate} value={String(rate)}>
                {String(rate).replace(".", ",")} %
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {missing ? (
          <p className="text-g-meta text-muted">{missing}</p>
        ) : unchanged ? (
          <p className="text-g-meta text-muted">Rien à enregistrer.</p>
        ) : null}
        <GlassButton type="submit" variant="primary" disabled={!valid || unchanged || busy}>
          {current ? "Enregistrer" : "Ouvrir les réservations"}
        </GlassButton>
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

  /** Les jours du préréglage encore vides : un jour déjà réglé n'est jamais touché. */
  const presetDays = PRESET.weekdays.filter((day) => !setup.creneaux.some((creneau) => creneau.weekday === day));

  /** Le préréglage : des créneaux de la durée réglée, de 20 h jusqu'à 2 h ; un au moins par jour. */
  const preset = async () => {
    setBusy(true);
    await run(async () => {
      for (const day of presetDays) {
        let start: number = PRESET.fromMinutes;
        do {
          await addCreneau(etablissementId, day, start);
          start += duration;
        } while (start + duration <= PRESET.toMinutes);
      }
    }, "Créneaux ajoutés du jeudi au samedi.");
    setBusy(false);
    onSaved();
  };

  return (
    <div className={SECTION}>
      <h3 className={TITLE}>Les créneaux</h3>
      <p className={SUB}>Les heures de début, jour par jour ; chaque créneau dure {formatDuration(duration)}.</p>
      {presetDays.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <GlassButton disabled={busy || !setup.reglages} onClick={() => void preset()}>
            Jeudi à samedi, 20 h – 2 h
          </GlassButton>
          {!setup.reglages && <p className="text-g-meta text-muted">Ouvrez d&rsquo;abord les réservations ci-dessus.</p>}
        </div>
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
              aria-label={`${name}, ${count} ${count > 1 ? "créneaux" : "créneau"}`}
              onClick={() => setWeekday(index + 1)}
              className={`g-press flex h-(--g-control) items-center rounded-full px-3.5 text-g-label font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1 ${
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
            <li key={creneau.id} className="flex items-center gap-1 rounded-full border border-hairline pl-4 text-g-label font-medium tabular-nums">
              {formatStartMinutes(creneau.start_minutes)}
              <button
                type="button"
                aria-label={`Retirer le créneau de ${formatStartMinutes(creneau.start_minutes)}`}
                className="g-press flex size-(--g-control) items-center justify-center rounded-full text-muted hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ember-1"
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
      <div>
        <div className="flex items-end gap-2">
          <Field label="Nouveau créneau" className="min-w-0 flex-1">
            <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </Field>
          <GlassButton disabled={!time || busy} onClick={() => void add()}>
            Ajouter
          </GlassButton>
        </div>
        <p className="g-field-hint mt-(--g-field-gap)">
          Choisissez une heure pour l&rsquo;ajouter. Avant {dayEndHour} h, elle compte pour la nuit du jour choisi.
        </p>
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
  const toast = useToast();
  const colorRef = useRef<HTMLInputElement>(null);
  // Ce qui est affiché, tout de suite ; les écritures partent l'une après
  // l'autre et portent chacune la ligne entière : la dernière gagne toujours.
  const [draft, setDraft] = useState({
    name: bulle.name,
    color: bulle.color,
    active: bulle.active,
    table_id: bulle.table_id,
  });
  const writes = useRef(Promise.resolve());
  const latest = useRef(draft);

  const save = (patch: Partial<typeof draft>) => {
    const previous = latest.current;
    latest.current = { ...previous, ...patch };
    setDraft(latest.current);
    const values = latest.current;
    writes.current = writes.current.then(async () => {
      try {
        await saveBulle(etablissementId, { id: bulle.id, sort: bulle.sort, ...values });
        onSaved();
      } catch (error) {
        toast.error(describeError(error).message);
        latest.current = { ...latest.current, ...previous };
        setDraft(latest.current);
      }
    });
  };
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  // La couleur s'écrit à la fermeture du nuancier (l'événement natif change),
  // pas à chaque teinte traversée.
  useEffect(() => {
    const input = colorRef.current;
    if (!input) return;
    const commit = () => saveRef.current({ color: input.value });
    input.addEventListener("change", commit);
    return () => input.removeEventListener("change", commit);
  }, []);

  const commitName = () => {
    const name = draft.name.trim();
    if (!name) setDraft((current) => ({ ...current, name: latest.current.name }));
    else if (name !== latest.current.name) save({ name });
  };

  return (
    <li className="flex flex-col gap-3 rounded-g-card border border-hairline p-3">
      <div className="flex items-center gap-3">
        <input
          ref={colorRef}
          type="color"
          value={draft.color}
          onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}
          aria-label={`Couleur de ${draft.name}`}
          className="size-(--g-control) shrink-0 cursor-pointer rounded-full border border-hairline bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1"
        />
        <Input
          value={draft.name}
          maxLength={BULLE_LIMITS.nameMax}
          aria-label={`Nom de la bulle ${bulle.name}`}
          autoComplete="off"
          enterKeyHint="done"
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </div>
      <Switch checked={draft.active} onChange={(active) => save({ active })} label="En service" />
      <Field label="Table du menu QR" hint="Sur cette table, le menu QR ne prend de commande qu'une fois les places payées.">
        <Select value={draft.table_id ?? ""} onChange={(event) => save({ table_id: event.target.value || null })}>
          <option value="">Aucune</option>
          {tables.map((table) => (
            <option key={table.id} value={table.id}>
              Table {table.number}
            </option>
          ))}
        </Select>
      </Field>
    </li>
  );
}

export function BullesSettings({
  tabName,
  etablissementId,
  setup,
  tables,
  dayEndHour,
  onClose,
  onSaved,
}: {
  tabName: string;
  etablissementId: string;
  setup: BulleSetup;
  /** Les tables de la salle : celle posée dans une bulle n'y commande qu'une fois les places payées. */
  tables: Table[];
  dayEndHour: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const run = useRunMutation();
  const [adding, setAdding] = useState(false);
  const addBulle = async () => {
    const number = setup.bulles.length + 1;
    setAdding(true);
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
    setAdding(false);
    onSaved();
  };
  return (
    <Sheet title={`Réglages des ${tabName.toLowerCase()}`} onClose={onClose}>
      <div className="flex flex-col gap-6">
        <ReglagesForm etablissementId={etablissementId} setup={setup} onSaved={onSaved} />
        <CreneauxEditor etablissementId={etablissementId} setup={setup} dayEndHour={dayEndHour} onSaved={onSaved} />
        <div className={SECTION}>
          <h3 className={TITLE}>Les bulles</h3>
          <p className={SUB}>Hors service, une bulle n&rsquo;est plus proposée ; ses réservations restent.</p>
          {setup.bulles.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {setup.bulles.map((bulle) => (
                <BulleRow
                  key={bulle.id}
                  etablissementId={etablissementId}
                  bulle={bulle}
                  tables={tables}
                  onSaved={onSaved}
                />
              ))}
            </ul>
          )}
          <GlassButton className="self-start" disabled={adding} onClick={() => void addBulle()}>
            Ajouter une bulle
          </GlassButton>
        </div>
      </div>
    </Sheet>
  );
}

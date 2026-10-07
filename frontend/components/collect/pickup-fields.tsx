"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { DAY_NAMES, isOpenAt, parisDate, pickupSlots, type OpeningHours } from "@/lib/collect/hours";
import { formatTime } from "@/lib/gestion/format";
import { createClient } from "@/lib/supabase/client";

/** Ce que le client indique avant de payer : qui passe, et quand. */
export interface CollectDetails {
  name: string;
  phone: string;
  /** ISO du créneau, null = dès que possible, "" = rien de choisi. */
  pickupAt: string | null;
}

const fieldClass =
  "w-full rounded-xl border border-hairline bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ember-2/50";

/** Prochain jour (AAAA-MM-JJ) qui a encore un créneau, dans la semaine. */
function firstOpenDay(hours: OpeningHours | null, slotMinutes: number, now: Date) {
  for (let i = 0; i < DAY_NAMES.length; i++) {
    const day = parisDate(new Date(now.getTime() + i * 86_400_000));
    if (pickupSlots(hours, day, slotMinutes, now).length) return day;
  }
  return parisDate(now);
}

export function PickupFields({
  slug,
  hours,
  slotMinutes,
  value,
  onChange,
}: {
  slug: string;
  hours: OpeningHours | null;
  slotMinutes: number;
  value: CollectDetails;
  onChange: (next: CollectDetails) => void;
}) {
  const id = useId();
  // Lue une fois à l'ouverture de la feuille : les créneaux ne bougent pas
  // sous le doigt ; la base refuse de toute façon un créneau dépassé.
  const [now] = useState(() => new Date());
  const openNow = isOpenAt(hours, now);
  const [day, setDay] = useState(() => firstOpenDay(hours, slotMinutes, now));
  const [full, setFull] = useState<Set<number>>(new Set());

  const slots = useMemo(
    () => pickupSlots(hours, day, slotMinutes, now).filter((slot) => !full.has(slot.getTime())),
    [hours, day, slotMinutes, now, full]
  );

  useEffect(() => {
    const from = new Date(`${day}T00:00:00Z`);
    const to = new Date(from.getTime() + 2 * 86_400_000);
    let stale = false;
    void createClient()
      .rpc("collect_full_slots", {
        p_slug: slug,
        p_from: new Date(from.getTime() - 86_400_000).toISOString(),
        p_to: to.toISOString(),
      })
      .then(({ data }) => {
        if (!stale) setFull(new Set((data ?? []).map((iso) => Date.parse(iso))));
      });
    return () => {
      stale = true;
    };
  }, [slug, day]);

  const set = (patch: Partial<CollectDetails>) => onChange({ ...value, ...patch });
  // Fermé depuis l'ouverture du panier : « dès que possible » ne vaut plus.
  const asap = value.pickupAt === null && openNow;

  return (
    <fieldset className="mt-6 flex flex-col gap-3 border-t border-hairline pt-5">
      <legend className="sr-only">Retrait</legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Votre nom
          <input
            value={value.name}
            onChange={(event) => set({ name: event.target.value })}
            autoComplete="given-name"
            required
            data-collect-name
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          Téléphone
          <input
            type="tel"
            value={value.phone}
            onChange={(event) => set({ phone: event.target.value })}
            autoComplete="tel"
            required
            className={fieldClass}
          />
        </label>
      </div>

      <p id={`${id}-when`} className="text-xs font-medium text-muted">
        Retrait
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-when`} className="flex gap-2">
        {openNow && (
          <button
            type="button"
            role="radio"
            aria-checked={asap}
            onClick={() => set({ pickupAt: null })}
            className={`flex-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors ${
              asap ? "border-ember-2/60 bg-surface-raised text-foreground" : "border-hairline text-muted"
            }`}
          >
            Dès que possible
          </button>
        )}
        <button
          type="button"
          role="radio"
          aria-checked={!asap}
          onClick={() => set({ pickupAt: slots[0]?.toISOString() ?? "" })}
          className={`flex-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors ${
            !asap ? "border-ember-2/60 bg-surface-raised text-foreground" : "border-hairline text-muted"
          }`}
        >
          À une heure précise
        </button>
      </div>

      {!asap && (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Jour
            <input
              type="date"
              value={day}
              min={parisDate(now)}
              onChange={(event) => {
                if (!event.target.value) return;
                setDay(event.target.value);
                set({ pickupAt: "" });
              }}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Heure
            <select
              value={value.pickupAt ?? ""}
              onChange={(event) => set({ pickupAt: event.target.value })}
              disabled={slots.length === 0}
              className={fieldClass}
            >
              <option value="" disabled>
                {slots.length ? "Choisir" : "Fermé"}
              </option>
              {slots.map((slot) => (
                <option key={slot.getTime()} value={slot.toISOString()}>
                  {formatTime(slot.toISOString())}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {!asap && slots.length === 0 && (
        <p className="text-xs text-ember-3">
          Pas de retrait possible ce jour-là : choisissez un autre jour.
        </p>
      )}
    </fieldset>
  );
}

/** Le formulaire est complet : de quoi envoyer la commande. */
export function collectProblem(
  details: CollectDetails,
  hours: OpeningHours | null
): string | null {
  if (!details.name.trim() || !details.phone.trim()) {
    return "Indiquez votre nom et votre téléphone.";
  }
  if (details.pickupAt === "" || (details.pickupAt === null && !isOpenAt(hours, new Date()))) {
    return "Choisissez une heure de retrait.";
  }
  return null;
}

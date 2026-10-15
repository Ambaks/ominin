"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  DAY_NAMES,
  firstPickupDay,
  formatClock,
  formatDayLong,
  isCalendarDay,
  isOpenAt,
  isoDayOf,
  parisDate,
  pickupSlots,
  type OpeningHours,
} from "@/lib/collect/hours";
import { CUSTOMER_NOTE_MAX_LENGTH, normalizePhone } from "@/lib/collect/shared";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import { useNow } from "@/lib/gestion/use-now";
import { createClient } from "@/lib/supabase/client";

/** Ce que le client indique avant de payer : qui passe, et quand. */
export interface CollectDetails {
  name: string;
  phone: string;
  /** ISO du créneau, null = dès que possible, "" = rien de choisi. */
  pickupAt: string | null;
  /** Le mot du client : l'inscription sur le gâteau, une allergie. */
  note: string;
}

/** Le plat du panier qui demande le plus long délai de commande. */
export interface PickupNotice {
  name: string;
  hours: number;
}

/** Le plat au plus long délai parmi les lignes du panier, s'il y en a un. */
export function pickupNotice(
  lines: { name: string; noticeHours?: number }[]
): PickupNotice | null {
  return lines.reduce<PickupNotice | null>(
    (longest, line) =>
      line.noticeHours && line.noticeHours > (longest?.hours ?? 0)
        ? { name: line.name, hours: line.noticeHours }
        : longest,
    null
  );
}

/** Ce retrait tombe avant que le délai du plat ne soit écoulé. */
export function missesNotice(notice: PickupNotice, pickupAt: string, now: Date): boolean {
  return Date.parse(pickupAt) < now.getTime() + notice.hours * 3_600_000;
}

const fieldClass =
  "w-full rounded-xl border border-hairline bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-ember-2/50";

export function PickupFields({
  slug,
  hours,
  slotMinutes,
  notice,
  value,
  onChange,
}: {
  slug: string;
  hours: OpeningHours | null;
  slotMinutes: number;
  notice: PickupNotice | null;
  value: CollectDetails;
  onChange: (next: CollectDetails) => void;
}) {
  const id = useId();
  // L'heure avance à la cadence des écrans de service : un créneau dépassé,
  // ou la boutique qui ferme pendant la commande, se voient sans recharger.
  const now = useNow(WAIT_TICK_MS);
  const noticeMinutes = (notice?.hours ?? 0) * 60;
  // Un plat à commander à l'avance : pas de « dès que possible ».
  const openNow = isOpenAt(hours, now) && !notice;
  const firstDay = useMemo(
    () => firstPickupDay(hours, parisDate(now), slotMinutes, now, noticeMinutes),
    [hours, now, slotMinutes, noticeMinutes]
  );
  // Rouverte, la feuille reprend le jour du créneau déjà retenu.
  const [day, setDay] = useState(() =>
    value.pickupAt ? parisDate(new Date(value.pickupAt)) : firstDay
  );
  const dayValid = isCalendarDay(day);
  // Un jour passé, ou que le délai d'un plat ne laisse pas (tapé au clavier,
  // ou un plat au délai plus long arrivé dans le panier), ne propose aucun
  // créneau : le message dit à partir de quand.
  const today = parisDate(now);
  const tooEarly = day < parisDate(new Date(now.getTime() + noticeMinutes * 60_000));
  const [full, setFull] = useState<Set<number>>(new Set());
  // Le numéro se juge en quittant le champ : pas d'erreur sous le doigt.
  const [phoneLeft, setPhoneLeft] = useState(false);
  const phoneInvalid = phoneLeft && value.phone.trim() !== "" && !normalizePhone(value.phone);

  const slots = useMemo(
    () =>
      !dayValid || tooEarly
        ? []
        : pickupSlots(hours, day, slotMinutes, now, noticeMinutes).filter(
            (slot) => !full.has(slot.getTime())
          ),
    [dayValid, tooEarly, hours, day, slotMinutes, now, noticeMinutes, full]
  );
  // Le créneau retenu, tant qu'il est encore proposé.
  const chosen =
    value.pickupAt && slots.some((slot) => slot.toISOString() === value.pickupAt)
      ? value.pickupAt
      : "";
  // Passé, complet, ou plus assez loin pour le délai d'un plat : le créneau
  // retenu se vide, et collectProblem refuse l'envoi tant que rien n'est
  // choisi — jamais une heure que l'écran ne montre pas.
  useEffect(() => {
    if (value.pickupAt && !chosen) onChange({ ...value, pickupAt: "" });
  }, [value, chosen, onChange]);
  const earliest = useMemo(
    () => (notice ? pickupSlots(hours, firstDay, slotMinutes, now, noticeMinutes)[0] : undefined),
    [notice, hours, firstDay, slotMinutes, now, noticeMinutes]
  );

  useEffect(() => {
    if (!isCalendarDay(day)) return;
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

  // Le message d'un jour sans créneau tombe parfois sous le pli de la
  // feuille, sur téléphone : il remonte dans l'écran au changement de jour.
  const dayMessage = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (dayMessage.current?.textContent) dayMessage.current.scrollIntoView({ block: "nearest" });
  }, [day]);

  const set = (patch: Partial<CollectDetails>) => onChange({ ...value, ...patch });
  // Fermé depuis l'ouverture du panier : « dès que possible » ne vaut plus.
  const asap = value.pickupAt === null && openNow;

  return (
    <fieldset data-collect-fields className="mt-6 flex flex-col gap-3 border-t border-hairline pt-5">
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
            onBlur={() => {
              setPhoneLeft(true);
              const normalized = normalizePhone(value.phone);
              if (normalized) set({ phone: normalized });
            }}
            autoComplete="tel"
            required
            aria-invalid={phoneInvalid || undefined}
            aria-describedby={phoneInvalid ? `${id}-phone` : undefined}
            className={`${fieldClass} ${phoneInvalid ? "border-ember-3/60" : ""}`}
          />
        </label>
      </div>
      {phoneInvalid && (
        <p id={`${id}-phone`} className="-mt-1 text-xs font-medium text-ember-3">
          Ce numéro ne semble pas valide : 10 chiffres, ou +indicatif.
        </p>
      )}

      <p id={`${id}-when`} className="text-xs font-medium text-muted">
        Retrait
      </p>
      {notice && (
        <p className="-mt-1 text-xs leading-relaxed text-muted">
          « {notice.name} » se commande {notice.hours}&nbsp;h à l&apos;avance
          {earliest && (
            <> : premier retrait possible le {formatDayLong(firstDay)} à {formatClock(earliest.toISOString())}</>
          )}.
        </p>
      )}
      {/* Boutique fermée ou plat à commander à l'avance : une seule façon de
          retirer, pas de choix à présenter. */}
      {openNow && (
        <div role="radiogroup" aria-labelledby={`${id}-when`} className="flex gap-2">
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
      )}

      {!asap && (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Jour
            <input
              type="date"
              value={day}
              min={firstDay}
              onChange={(event) => {
                setDay(event.target.value);
                set({ pickupAt: "" });
              }}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Heure
            <select
              value={chosen}
              onChange={(event) => set({ pickupAt: event.target.value })}
              disabled={slots.length === 0}
              aria-describedby={slots.length === 0 ? `${id}-day` : undefined}
              className={fieldClass}
            >
              <option value="" disabled>
                {slots.length ? "Choisir" : "Aucun créneau"}
              </option>
              {slots.map((slot) => (
                <option key={slot.getTime()} value={slot.toISOString()}>
                  {formatClock(slot.toISOString())}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {/* Toujours là, vide tant que le jour a des créneaux : un lecteur d'écran
          annonce un message qui change, rarement un message qui apparaît. */}
      <p ref={dayMessage} id={`${id}-day`} role="status" className="text-xs font-medium text-ember-3 empty:absolute">
        {!asap &&
          slots.length === 0 &&
          (!dayValid
            ? "Choisissez un jour."
            : day < today
              ? `Ce jour est passé : premier retrait possible le ${formatDayLong(firstDay)}.`
              : tooEarly
                ? `Trop tôt pour votre commande : premier retrait possible le ${formatDayLong(firstDay)}.`
                : hours?.[String(isoDayOf(day))]?.length
                  ? "Plus de créneau ce jour-là : choisissez un autre jour."
                  : `Fermé le ${DAY_NAMES[isoDayOf(day) - 1].toLowerCase()} : choisissez un autre jour.`)}
      </p>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        <span>
          Un mot pour l&apos;équipe <span className="font-normal text-faint">(facultatif)</span>
        </span>
        <textarea
          value={value.note}
          onChange={(event) => set({ note: event.target.value })}
          rows={2}
          maxLength={CUSTOMER_NOTE_MAX_LENGTH}
          placeholder="Une précision, une allergie, une inscription…"
          className={`${fieldClass} resize-none`}
        />
      </label>
    </fieldset>
  );
}

/** Le formulaire est complet : de quoi envoyer la commande. */
export function collectProblem(
  details: CollectDetails,
  hours: OpeningHours | null,
  notice: PickupNotice | null
): string | null {
  if (!details.name.trim() || !details.phone.trim()) {
    return "Indiquez votre nom et votre téléphone.";
  }
  if (!normalizePhone(details.phone)) {
    return "Ce numéro de téléphone ne semble pas valide : l'équipe doit pouvoir vous rappeler.";
  }
  if (
    details.pickupAt === "" ||
    (details.pickupAt === null && (notice !== null || !isOpenAt(hours, new Date())))
  ) {
    return "Choisissez une heure de retrait.";
  }
  if (notice && details.pickupAt && missesNotice(notice, details.pickupAt, new Date())) {
    return `« ${notice.name} » se commande ${notice.hours}\u00a0h à l’avance : choisissez un retrait plus tard.`;
  }
  return null;
}

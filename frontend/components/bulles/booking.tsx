"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { BullePayment, refundMessage, type PartResult } from "@/components/bulles/payment";
import { ContactFields, contactErrors, emptyContact, type Contact } from "@/components/bulles/contact-fields";
import { addDays, formatDuration, isoWeekday } from "@/lib/bulles/format";
import { reservationUrl } from "@/lib/bulles/links";
import type { BulleOffer } from "@/lib/bulles/public";
import type { BulleCheckout } from "@/lib/bulles/server";
import { formatCents, formatHours } from "@/lib/club/format";
import { parisDate } from "@/lib/collect/hours";
import { createClient } from "@/lib/supabase/client";

/*
 * Réserver une bulle : le soir, le créneau et une bulle libre d'un même
 * geste, le nombre de personnes et de places payées maintenant, les
 * coordonnées, puis le paiement. Le planning se relit en base à chaque soir
 * choisi (bulles_planning) : une bulle n'y paraît prise que confirmée.
 */

type Slot = {
  startsAt: string;
  endsAt: string;
  bulles: { id: string; free: boolean }[];
};

type Part = {
  partId: string;
  token: string;
  amountCents: number;
  holdExpiresAt: string;
  checkout: BulleCheckout;
  places: number;
};

const DAY_CHIP = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short" });
const DAY_NUMBER = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", day: "numeric" });
const DAY_LONG = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const asUtc = (date: string) => new Date(`${date}T12:00:00Z`);

function Stepper({
  label,
  noun,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  /** « personne », « place » : ce que les boutons ajoutent ou retirent. */
  noun: string;
  value: number;
  min: number;
  max: number;
  unit: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="bo-stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Une ${noun} de moins`}>
        −
      </button>
      <output aria-live="polite">
        <strong>{value}</strong>
        <span>{unit(value)}</span>
      </output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Une ${noun} de plus`}>
        +
      </button>
    </div>
  );
}

const noSubscription = () => () => {};

export function BulleBooking({ offer }: { offer: BulleOffer }) {
  const { etablissement, placeCents, minParty, maxParty } = offer;
  const bullesById = useMemo(() => new Map(offer.bulles.map((bulle) => [bulle.id, bulle])), [offer.bulles]);

  // Les soirs ouverts de la fenêtre de réservation, à l'heure de Paris. Lu
  // dans le navigateur seulement : la page est rendue puis gardée en cache,
  // la date du serveur peut dater de la veille.
  const today = useSyncExternalStore(noSubscription, () => parisDate(new Date()), () => null);
  const dates = useMemo(
    () =>
      today
        ? Array.from({ length: offer.bookingDays + 1 }, (_, index) => addDays(today, index)).filter((day) =>
            offer.weekdays.includes(isoWeekday(day))
          )
        : [],
    [today, offer.bookingDays, offer.weekdays]
  );
  const [picked, setPicked] = useState<string | null>(null);
  const date = picked ?? dates[0] ?? null;
  const [planning, setPlanning] = useState<{ date: string; slots: Slot[] } | null>(null);
  const [planningError, setPlanningError] = useState(false);
  const [reload, setReload] = useState(0);
  const [choice, setChoice] = useState<{ startsAt: string; endsAt: string; bulleId: string } | null>(null);
  const [party, setParty] = useState(minParty);
  const [places, setPlaces] = useState(minParty);
  const [step, setStep] = useState<"choix" | "infos" | "paiement" | "rendue">("choix");
  const [refunded, setRefunded] = useState<NonNullable<PartResult["refunded"]> | null>(null);
  const [contact, setContact] = useState<Contact>(emptyContact);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [part, setPart] = useState<Part | null>(null);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    void createClient()
      .rpc("bulles_planning", { p_etab: etablissement.id, p_date: date })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) {
          setPlanningError(true);
          return;
        }
        const slots = new Map<string, Slot>();
        for (const row of data ?? []) {
          const slot = slots.get(row.starts_at) ?? { startsAt: row.starts_at, endsAt: row.ends_at, bulles: [] };
          slot.bulles.push({ id: row.bulle_id, free: row.libre });
          slots.set(row.starts_at, slot);
        }
        setPlanningError(false);
        setPlanning({ date, slots: [...slots.values()] });
      });
    return () => {
      cancelled = true;
    };
  }, [date, etablissement.id, reload]);

  const slots = planning?.date === date ? planning.slots : null;
  const chosenBulle = choice ? bullesById.get(choice.bulleId) : undefined;
  // Relu après une bulle prise entre-temps : le choix ne vaut que libre.
  const choiceFree = Boolean(
    choice &&
      slots?.some(
        (slot) =>
          slot.startsAt === choice.startsAt &&
          slot.bulles.some((bulle) => bulle.id === choice.bulleId && bulle.free)
      )
  );
  const amountCents = places * placeCents;

  const changeParty = (next: number) => {
    // Qui payait tout le groupe continue de le faire.
    setPlaces((current) => (current === party ? next : Math.min(current, next)));
    setParty(next);
  };

  const pickDate = (next: string) => {
    setPicked(next);
    setChoice(null);
  };

  const reserve = async () => {
    setShowErrors(true);
    if (!choice || Object.keys(contactErrors(contact)).length > 0) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/bulles/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulleId: choice.bulleId,
          startsAt: choice.startsAt,
          partySize: party,
          places,
          ...contact,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<Part> & { error?: string };
      if (!response.ok || !body.partId || !body.token || !body.checkout || !body.holdExpiresAt) {
        setError(body.error ?? "Réservation impossible pour le moment.");
        // La bulle a pu être prise entre-temps : le planning se relit.
        if (response.status === 409) setReload((count) => count + 1);
        return;
      }
      setPart({
        partId: body.partId,
        token: body.token,
        amountCents: body.amountCents ?? amountCents,
        holdExpiresAt: body.holdExpiresAt,
        checkout: body.checkout,
        places,
      });
      setStep("paiement");
    } catch {
      setError("Réservation impossible pour le moment.");
    } finally {
      setSending(false);
    }
  };

  const onPaid = (result: PartResult) => {
    if (result.refunded) {
      setRefunded(result.refunded);
      setStep("rendue");
      return;
    }
    if (part) window.location.assign(reservationUrl(etablissement.slug, part.token));
  };

  const onExpire = () => {
    setPart(null);
    setStep("infos");
    setError("Le délai de paiement est passé : vos places ont été libérées. Recommencez.");
    setReload((count) => count + 1);
  };

  if (step === "rendue" && refunded) {
    return (
      <div className="bo-panel bo-center bo-stack-sm" role="status">
        <p className="bo-script bo-panel-script">Pas de chance</p>
        <h1 className="bo-h3 bo-text-center">{refundMessage(refunded)}</h1>
        <p className="bo-muted">Le remboursement arrive sous 5 à 10 jours, selon votre banque.</p>
        <button
          type="button"
          className="bo-button"
          onClick={() => {
            setStep("choix");
            setChoice(null);
            setPart(null);
            setReload((count) => count + 1);
          }}
        >
          Choisir un autre créneau
        </button>
      </div>
    );
  }

  if (step === "paiement" && part && choice && chosenBulle) {
    return (
      <div className="bo-stack-sm">
        <Recap bulle={chosenBulle} choice={choice} party={party} date={date} />
        <BullePayment
          partId={part.partId}
          amountCents={part.amountCents}
          places={part.places}
          holdExpiresAt={part.holdExpiresAt}
          checkout={part.checkout}
          onResult={onPaid}
          onExpire={onExpire}
        />
      </div>
    );
  }

  if (step === "infos" && choice && chosenBulle) {
    return (
      <form
        className="bo-stack-sm"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void reserve();
        }}
      >
        <Recap bulle={chosenBulle} choice={choice} party={party} date={date} />
        <section className="bo-panel bo-stack-sm" aria-labelledby="bo-infos-title">
          <h2 id="bo-infos-title" className="bo-h3">
            Vos coordonnées
          </h2>
          <ContactFields value={contact} onChange={setContact} showErrors={showErrors} />
          {error && (
            <p className="bo-form-error" role="alert">
              {error}
            </p>
          )}
          <p className="bo-muted bo-small">
            Une place payée ne s&rsquo;annule pas et ne se rembourse pas, sauf si toutes les bulles du créneau
            sont confirmées par d&rsquo;autres groupes avant le vôtre. Dans la bulle, la carte s&rsquo;ouvre une fois
            toutes les places du groupe payées.
          </p>
          <button type="submit" className="bo-button bo-button--block" disabled={sending}>
            {sending ? "Un instant…" : `Payer ${formatCents(amountCents)}`}
          </button>
          <button type="button" className="bo-link-button" onClick={() => setStep("choix")}>
            Modifier
          </button>
        </section>
      </form>
    );
  }

  if (today && dates.length === 0) {
    return (
      <div className="bo-panel bo-center">
        <p className="bo-muted">Aucun créneau n&rsquo;est ouvert à la réservation pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="bo-stack bo-night-text">
      <section className="bo-stack-sm" aria-labelledby="bo-soir">
        <h2 id="bo-soir" className="bo-eyebrow bo-eyebrow--light">
          Le soir
        </h2>
        <div className="bo-days">
          {dates.map((day) => (
            <button
              key={day}
              type="button"
              className="bo-day"
              aria-pressed={day === date}
              aria-label={DAY_LONG.format(asUtc(day))}
              onClick={() => pickDate(day)}
            >
              <span>{DAY_CHIP.format(asUtc(day)).replace(".", "")}</span>
              <strong>{DAY_NUMBER.format(asUtc(day))}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="bo-stack-sm" aria-labelledby="bo-creneau" aria-busy={!slots || undefined}>
        <h2 id="bo-creneau" className="bo-eyebrow bo-eyebrow--light">
          Le créneau et la bulle
        </h2>
        {planningError ? (
          <p className="bo-form-error" role="alert">
            Le planning n&rsquo;a pas pu se charger.{" "}
            <button type="button" className="bo-link-button" onClick={() => setReload((count) => count + 1)}>
              Réessayer
            </button>
          </p>
        ) : !slots ? (
          <div className="bo-slots" aria-hidden>
            <div className="bo-slot bo-slot--skeleton" />
            <div className="bo-slot bo-slot--skeleton" />
          </div>
        ) : slots.length === 0 ? (
          <p className="bo-muted">Plus aucun créneau ce soir-là : choisissez un autre soir.</p>
        ) : (
          <ul className="bo-slots">
            {slots.map((slot) => {
              const free = slot.bulles.filter((bulle) => bulle.free).length;
              return (
                <li key={slot.startsAt} className="bo-slot" data-full={free === 0 || undefined}>
                  <div className="bo-slot-head">
                    <strong>{formatHours(slot.startsAt, slot.endsAt)}</strong>
                    <span>{free === 0 ? "complet" : free === 1 ? "1 bulle libre" : `${free} bulles libres`}</span>
                  </div>
                  <div className="bo-slot-bulles">
                    {slot.bulles.map(({ id, free: isFree }) => {
                      const bulle = bullesById.get(id);
                      if (!bulle) return null;
                      const selected = choice?.startsAt === slot.startsAt && choice.bulleId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          className="bo-pick"
                          disabled={!isFree}
                          aria-pressed={selected}
                          aria-label={`${bulle.name}, ${formatHours(slot.startsAt, slot.endsAt)}${isFree ? "" : ", déjà prise"}`}
                          onClick={() => setChoice({ startsAt: slot.startsAt, endsAt: slot.endsAt, bulleId: id })}
                          style={{ "--orb": bulle.color } as CSSProperties}
                        >
                          <span className="bo-pick-orb" aria-hidden />
                          <span>{bulle.name.replace(/^La /, "")}</span>
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="bo-stack-sm" aria-labelledby="bo-groupe">
        <h2 id="bo-groupe" className="bo-eyebrow bo-eyebrow--light">
          Le groupe
        </h2>
        <div className="bo-steppers">
          <Stepper
            label="Combien êtes-vous"
            noun="personne"
            value={party}
            min={minParty}
            max={maxParty}
            unit={(value) => (value > 1 ? "personnes" : "personne")}
            onChange={changeParty}
          />
          <Stepper
            label="Places payées maintenant"
            noun="place"
            value={places}
            min={1}
            max={party}
            unit={(value) => (value > 1 ? "places payées maintenant" : "place payée maintenant")}
            onChange={setPlaces}
          />
        </div>
        <p className="bo-muted bo-small">
          {places >= party
            ? `Vous payez pour tout le groupe : la bulle est confirmée dès le paiement.`
            : places >= minParty
              ? `La bulle est confirmée dès le paiement ; vos amis paient les ${party - places} autres places par un lien, ou à l'accueil, avant de commander.`
              : `Vos amis paient leur place par un lien. La bulle est confirmée dès ${minParty} places payées.`}
        </p>
      </section>

      <div className="bo-total">
        <div>
          <span className="bo-muted">
            {places} × {formatCents(placeCents)} · {formatDuration(offer.durationMinutes)}
          </span>
          <strong>{formatCents(amountCents)}</strong>
        </div>
        <button
          type="button"
          className="bo-button bo-button--block"
          disabled={!choiceFree}
          onClick={() => {
            setError(null);
            setStep("infos");
          }}
        >
          {choiceFree && chosenBulle ? `Continuer avec ${chosenBulle.name}` : "Choisissez une bulle"}
        </button>
      </div>
    </div>
  );
}

function Recap({
  bulle,
  choice,
  party,
  date,
}: {
  bulle: { name: string; color: string };
  choice: { startsAt: string; endsAt: string };
  party: number;
  date: string | null;
}) {
  return (
    <div className="bo-recap" style={{ "--orb": bulle.color } as CSSProperties}>
      <span className="bo-orb bo-recap-orb" aria-hidden />
      <div>
        <p className="bo-eyebrow">{date ? DAY_LONG.format(asUtc(date)) : ""}</p>
        <p className="bo-recap-title">{bulle.name}</p>
        <p className="bo-recap-detail">
          {formatHours(choice.startsAt, choice.endsAt)} · {party} personnes
        </p>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BullePayment, refundMessage, type PartResult } from "@/components/bulles/payment";
import { ContactFields, contactErrors, emptyContact, type Contact } from "@/components/bulles/contact-fields";
import { CLUB_TIMING } from "@/components/club/timing";
import type { BulleCheckout } from "@/lib/bulles/server";
import { formatCents } from "@/lib/club/format";

/*
 * Les morceaux vivants des pages de réservation : la relecture du statut
 * (un ami paie, la bulle se confirme), le lien à partager, et le paiement
 * d'une place par le lien d'un ami.
 */

/** Relit la page à intervalle et au retour sur l'onglet, tant que la réservation peut bouger. */
export function TicketWatch({ live }: { live: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!live) return;
    const refresh = () => {
      if (!document.hidden) router.refresh();
    };
    const timer = window.setInterval(refresh, CLUB_TIMING.refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, live]);
  return null;
}

export function ShareBox({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), CLUB_TIMING.copied);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    await navigator.clipboard?.writeText(`${text}\n${url}`).then(
      () => setCopied(true),
      () => {}
    );
  };
  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: "Rejoins ma bulle", text, url }).catch(() => {});
      return;
    }
    await copy();
  };
  return (
    <div className="bo-share">
      <button type="button" className="bo-button bo-button--block" onClick={() => void share()}>
        Envoyer le lien à mes amis
      </button>
      <div className="bo-share-url">
        <span>{url.replace(/^https?:\/\//, "")}</span>
        <button type="button" onClick={() => void copy()}>
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <p className="bo-small bo-muted" aria-live="polite">
        {copied ? "Lien copié." : "Chacun paie sa place, jusqu'à la fin du créneau."}
      </p>
    </div>
  );
}

function PlacesStepper({ value, max, onChange }: { value: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="bo-stepper bo-stepper--paper" role="group" aria-label="Places à payer">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Une place de moins">
        −
      </button>
      <output aria-live="polite">
        <strong>{value}</strong>
        <span>{value > 1 ? "places" : "place"}</span>
      </output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Une place de plus">
        +
      </button>
    </div>
  );
}

type Part = { partId: string; amountCents: number; holdExpiresAt: string; checkout: BulleCheckout; places: number };

/** Payer une ou plusieurs places par le lien de partage. */
export function Contribute({
  shareToken,
  placeCents,
  placesLeft,
}: {
  shareToken: string;
  placeCents: number;
  placesLeft: number;
}) {
  const router = useRouter();
  const [wanted, setPlaces] = useState(1);
  // D'autres amis paient pendant qu'on remplit : jamais plus que ce qui reste.
  const places = Math.min(wanted, placesLeft);
  const [contact, setContact] = useState<Contact>(emptyContact);
  const [showErrors, setShowErrors] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [part, setPart] = useState<Part | null>(null);
  const [done, setDone] = useState<PartResult | null>(null);

  const start = async () => {
    setShowErrors(true);
    if (Object.keys(contactErrors(contact)).length > 0) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/bulles/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareToken, places, ...contact }),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<Part> & { error?: string };
      if (!response.ok || !body.partId || !body.checkout || !body.holdExpiresAt) {
        setError(body.error ?? "Paiement impossible pour le moment.");
        if (response.status === 409) router.refresh();
        return;
      }
      setPart({
        partId: body.partId,
        amountCents: body.amountCents ?? places * placeCents,
        holdExpiresAt: body.holdExpiresAt,
        checkout: body.checkout,
        places,
      });
    } catch {
      setError("Paiement impossible pour le moment.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="bo-panel bo-center bo-stack-sm" role="status">
        <p className="bo-script bo-panel-script">{done.refunded ? "Pas de chance" : "Merci"}</p>
        <p className="bo-h3 bo-text-center">
          {done.refunded
            ? refundMessage(done.refunded)
            : done.confirmed
              ? "Votre place est payée, la bulle est confirmée."
              : "Votre place est payée."}
        </p>
        <p className="bo-muted">
          {done.refunded
            ? "Le remboursement arrive sous 5 à 10 jours, selon votre banque."
            : "Le reçu est parti par e-mail."}
        </p>
      </div>
    );
  }

  if (part) {
    return (
      <BullePayment
        partId={part.partId}
        amountCents={part.amountCents}
        places={part.places}
        holdExpiresAt={part.holdExpiresAt}
        checkout={part.checkout}
        onResult={(result) => {
          setDone(result);
          router.refresh();
        }}
        onExpire={() => {
          setPart(null);
          setError("Le délai de paiement est passé : recommencez.");
        }}
      />
    );
  }

  return (
    <form
      className="bo-panel bo-stack-sm"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void start();
      }}
    >
      <h2 className="bo-h3">Payer ma place</h2>
      <PlacesStepper value={places} max={placesLeft} onChange={setPlaces} />
      <ContactFields value={contact} onChange={setContact} showErrors={showErrors} />
      {error && (
        <p className="bo-form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="bo-button bo-button--block" disabled={sending}>
        {sending ? "Un instant…" : `Payer ${formatCents(places * placeCents)}`}
      </button>
    </form>
  );
}

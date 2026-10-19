"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useSkyPause } from "@/components/club/club-sky";
import {
  ConditionsBlock,
  ContactFields,
  contactErrors,
  focusFirstError,
  type Contact,
} from "@/components/club/contact-form";
import { RollingAmount } from "@/components/club/rolling-amount";
import { SeatRing, type SeatShare } from "@/components/club/seat-ring";
import { ShareAmount } from "@/components/club/share-amount";
import { TablePayment } from "@/components/club/table-payment";
import { CLUB_TIMING } from "@/components/club/timing";
import type { Club } from "@/lib/club/types";
import { formatCents } from "@/lib/club/format";
import { TABLE_HOLD_S } from "@/lib/club/hold";
import { MINUTE, untilLabel } from "@/lib/club/time";

/*
 * Une table partagée, côté navigateur : ce que l'organisateur suit et
 * envoie (part réglée, reste, lien à partager, temps avant que le lien ne
 * ferme), et ce qu'un ami remplit pour payer sa part.
 */

/* Ce navigateur a payé une part de cette table : la page s'en souvient au retour. */
const memoryKey = (shareToken: string) => `ominin-club-part:${shareToken}`;

/* Le temps qui reste avant le début de la soirée, relu chaque minute ; null avant l'hydratation. */
function useUntil(startsAt: string) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Date.parse(startsAt) - Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, MINUTE);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [startsAt]);
  return left;
}

/** Payé / reste : la barre et ses deux montants. */
export function ShareMeter({ paidCents, priceCents }: { paidCents: number; priceCents: number }) {
  const remaining = Math.max(0, priceCents - paidCents);
  return (
    <div className="club-share-meter">
      <p>
        <span>
          Payé <RollingAmount cents={paidCents} className="club-mono" />
        </span>
        <span>
          Reste <RollingAmount cents={remaining} className="club-mono" />
        </span>
      </p>
      <span
        className="club-meter-bar"
        style={{ "--fill": Math.min(1, paidCents / priceCents) } as CSSProperties}
        aria-hidden
      />
    </div>
  );
}

/* Le lien, à envoyer : la feuille de partage du téléphone, sinon copié — avec un texte prêt pour WhatsApp ou un SMS. */
export function ShareLink({
  url,
  text,
  startsAt,
  remainingCents,
}: {
  url: string;
  text: string;
  startsAt: string;
  remainingCents: number;
}) {
  const [copied, setCopied] = useState(false);
  const left = useUntil(startsAt);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), CLUB_TIMING.copied);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    await navigator.clipboard?.writeText(`${text}\n${url}`).then(
      () => setCopied(true),
      () => {},
    );
  };
  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: "Rejoins ma table", text, url }).catch(() => {});
      return;
    }
    await copy();
  };
  const closed = left !== null && left <= 0;
  if (closed) {
    return (
      <p className="club-share-closed">
        La soirée a commencé : le lien est fermé.{" "}
        {remainingCents > 0 && (
          <>
            Reste à régler à l&rsquo;entrée : <strong className="club-mono">{formatCents(remainingCents)}</strong>.
          </>
        )}
      </p>
    );
  }
  return (
    <div className="club-share-link">
      <button type="button" className="club-button club-button-primary club-button-block" onClick={() => void share()}>
        Partager le lien avec mes amis
      </button>
      <div className="club-share-url">
        <span className="club-mono">{url.replace(/^https?:\/\//, "")}</span>
        <button type="button" onClick={() => void copy()} data-copied={copied || undefined}>
          <svg viewBox="0 0 16 16" aria-hidden>
            {copied ? <path d="M3 8.5l3.2 3L13 4.5" /> : <path d="M5.5 5.5V3h7.5v7.5h-2.5M3 5.5h7.5V13H3z" />}
          </svg>
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <p className="club-fine" aria-live="polite">
        {left === null
          ? " "
          : `Le lien ferme au début de la soirée, dans ${untilLabel(left)}. Ce qui reste se règle alors à l'entrée.`}
      </p>
    </div>
  );
}

/* L'ami paie sa part : montant, coordonnées, conditions, puis le paiement tenu comme une table. */
export function ShareJoin({
  shareToken,
  provider,
  minimumCents,
  remainingCents,
  conditions,
  recap,
  payerIds,
  seats,
  totalCents,
  shares,
}: {
  shareToken: string;
  provider: Club["paymentProvider"];
  minimumCents: number;
  remainingCents: number;
  /** La tablée, le prix de la table (frais compris) et qui en a payé quoi : l'anneau. */
  seats: number;
  totalCents: number;
  shares: SeatShare[];
  conditions: Club["conditions"];
  /** « Sam. 24 oct. · VIP Salon Rouge ». */
  recap: string;
  /** Les parts déjà payées : si ce navigateur en a payé une, la page le dit. */
  payerIds: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const [amount, setAmount] = useState(minimumCents);
  // Les bornes bougent quand un autre ami paie (page relue) : la part choisie y reste.
  const value = Math.min(remainingCents, Math.max(minimumCents, amount));
  const [contact, setContact] = useState<Contact>({
    name: "",
    phone: "",
    email: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [tried, setTried] = useState(false);
  // Le curseur du montant est tenu : montants et anneau suivent sans animation.
  const [scrubbing, setScrubbing] = useState(false);
  const errors = contactErrors(contact, accepted);
  const valid = Object.keys(errors).length === 0;
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hold, setHold] = useState<{
    paymentId: string;
    totalCents: number;
    remainingMs: number;
    provider: Club["paymentProvider"];
  } | null>(null);
  useSkyPause(hold !== null);

  // Déjà payé depuis ce navigateur : la page de la part réglée, pas un second formulaire.
  useEffect(() => {
    let paid: string | null = null;
    try {
      paid = localStorage.getItem(memoryKey(shareToken));
    } catch {}
    if (paid && payerIds.includes(paid)) router.replace(`${pathname}?part=${paid}`, { scroll: false });
  }, [shareToken, payerIds, router, pathname]);

  const submit = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (sending) return;
    if (!valid) {
      setTried(true);
      focusFirstError(formRef.current, errors);
      return;
    }
    setSending(true);
    setError(null);
    const sentAt = performance.now();
    try {
      const response = await fetch("/api/club/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareToken,
          ...contact,
          amountCents: value,
          accepted,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        paymentId?: string;
        totalCents?: number;
        provider?: Club["paymentProvider"];
        error?: string;
      };
      if (!response.ok || !body.paymentId) {
        setError(body.error ?? "Paiement impossible pour le moment.");
        if (response.status === 409) router.refresh();
        return;
      }
      setHold({
        paymentId: body.paymentId,
        totalCents: body.totalCents ?? value,
        remainingMs: TABLE_HOLD_S * 1000 - (performance.now() - sentAt),
        provider: body.provider ?? provider,
      });
    } catch {
      setError("Connexion perdue. Vérifiez votre réseau et réessayez.");
    } finally {
      setSending(false);
    }
  };

  const onPaid = useCallback(() => {
    if (!hold) return;
    try {
      localStorage.setItem(memoryKey(shareToken), hold.paymentId);
    } catch {}
    // ?part : la part réglée (reste à la relecture) ; ?nouveau : la gerbe, une seule fois.
    router.replace(`${pathname}?part=${hold.paymentId}&nouveau=1`, {
      scroll: false,
    });
  }, [hold, router, pathname, shareToken]);
  const onExpired = useCallback(
    (message?: string) => {
      setHold(null);
      setError(
        message ??
          `Les ${TABLE_HOLD_S / 60} minutes sont passées sans paiement : rien n'a été débité. Vous pouvez recommencer.`,
      );
      router.refresh();
    },
    [router],
  );

  if (hold) {
    return (
      <div className="club-join club-join-pay">
        <TablePayment
          provider={hold.provider}
          paymentId={hold.paymentId}
          totalCents={hold.totalCents}
          remainingMs={hold.remainingMs}
          recap={`${recap} · votre part ${formatCents(hold.totalCents)}`}
          onPaid={onPaid}
          onExpired={onExpired}
        />
      </div>
    );
  }

  const shown = tried ? errors : {};
  return (
    <form ref={formRef} className="club-join club-form" onSubmit={submit} noValidate data-valid={valid || undefined}>
      <ShareAmount
        value={value}
        min={minimumCents}
        max={remainingCents}
        part={minimumCents}
        note={
          <>
            Reste après vous :{" "}
            <RollingAmount cents={Math.max(0, remainingCents - value)} instant={scrubbing} className="club-mono" />
          </>
        }
        visual={
          <SeatRing
            seats={seats}
            priceCents={totalCents}
            shares={[
              ...shares,
              {
                id: "votre-part",
                name: contact.name || "Vous",
                amountCents: value,
                tone: "preview",
              },
            ]}
            label={`${seats} pers.`}
            scrubbing={scrubbing}
            compact
          />
        }
        presets={[
          { label: "Minimum", cents: minimumCents },
          { label: "Tout le reste", cents: remainingCents },
        ].filter((preset, index, all) => all.findIndex((other) => other.cents === preset.cents) === index)}
        onChange={setAmount}
        onScrub={setScrubbing}
      />
      <ContactFields value={contact} onChange={setContact} errors={shown} emailHint="Votre reçu y arrive." />
      <ConditionsBlock
        conditions={conditions}
        refund="Votre part n'est remboursée que si le club l'accepte, ou automatiquement si la soirée est annulée."
        holdNote={`Votre part vous est tenue ${TABLE_HOLD_S / 60} minutes dès que vous passez au paiement.`}
        accepted={accepted}
        onAccept={setAccepted}
        error={shown.accepted}
      />

      {error && (
        <p className="club-error" role="alert">
          {error}
        </p>
      )}
      {/* Une fois tout rempli, le bouton reste en vue en bas de l'écran. */}
      <div className="club-sticky-cta">
        <button
          type="submit"
          className="club-button club-button-primary club-button-block"
          disabled={sending}
          aria-busy={sending || undefined}
          aria-describedby={!valid ? "part-missing" : undefined}
        >
          {sending ? (
            <>
              <span className="club-spinner" aria-hidden />
              Un instant…
            </>
          ) : (
            <>
              Payer <RollingAmount cents={value} />
            </>
          )}
        </button>
        {!valid && (
          <p className="club-fine club-pay-hint" id="part-missing">
            {`Encore : ${[
              errors.name && "votre nom",
              errors.phone && "votre téléphone",
              errors.email && "votre e-mail",
              errors.accepted && "les conditions à accepter",
            ]
              .filter(Boolean)
              .join(", ")}.`}
          </p>
        )}
      </div>
    </form>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useSkyPause } from "@/components/club/club-sky";
import { RollingAmount } from "@/components/club/rolling-amount";
import { ShareAmount } from "@/components/club/share-amount";
import { TablePayment } from "@/components/club/table-payment";
import { CLUB_TIMING } from "@/components/club/timing";
import type { Club } from "@/lib/club/types";
import { formatCents } from "@/lib/club/format";
import { TABLE_HOLD_S } from "@/lib/club/hold";
import { serviceFeeCents } from "@/lib/club/pricing";

/*
 * Une table partagée, côté navigateur : ce que l'organisateur suit et
 * envoie (part réglée, reste, lien à partager, temps avant que le lien ne
 * ferme), et ce qu'un ami remplit pour payer sa part.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** « 2 j 4 h », « 3 h 12 min », « 8 min » : le temps avant le début de la soirée. */
function untilLabel(ms: number): string {
  if (ms >= DAY) return `${Math.floor(ms / DAY)} j ${Math.floor((ms % DAY) / HOUR)} h`;
  if (ms >= HOUR) return `${Math.floor(ms / HOUR)} h ${Math.floor((ms % HOUR) / MINUTE)} min`;
  return `${Math.max(1, Math.ceil(ms / MINUTE))} min`;
}

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
    await navigator.clipboard?.writeText(`${text}\n${url}`).then(() => setCopied(true), () => {});
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
        {left === null ? " " : `Le lien ferme au début de la soirée, dans ${untilLabel(left)}. Ce qui reste se règle alors à l'entrée.`}
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
  feePercent,
  conditions,
  recap,
}: {
  shareToken: string;
  provider: Club["paymentProvider"];
  minimumCents: number;
  remainingCents: number;
  feePercent: number;
  conditions: Club["conditions"];
  /** « Sam. 24 oct. · VIP Salon Rouge · 03 ». */
  recap: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [amount, setAmount] = useState(minimumCents);
  // Les bornes bougent quand un autre ami paie (page relue) : la part choisie y reste.
  const value = Math.min(remainingCents, Math.max(minimumCents, amount));
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [accepted, setAccepted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hold, setHold] = useState<{ paymentId: string; totalCents: number; remainingMs: number; provider: Club["paymentProvider"] } | null>(null);
  useSkyPause(hold !== null);

  const submit = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    const sentAt = performance.now();
    try {
      const response = await fetch("/api/club/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareToken, ...contact, amountCents: value, accepted }),
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
        totalCents: body.totalCents ?? value + serviceFeeCents(value, feePercent),
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
    if (hold) router.replace(`${pathname}?part=${hold.paymentId}`, { scroll: false });
  }, [hold, router, pathname]);
  const onExpired = useCallback(
    (message?: string) => {
      setHold(null);
      setError(message ?? `Les ${TABLE_HOLD_S / 60} minutes sont passées sans paiement : rien n'a été débité. Vous pouvez recommencer.`);
      router.refresh();
    },
    [router]
  );

  if (hold) {
    return (
      <div className="club-join club-join-pay">
        <TablePayment
          provider={hold.provider}
          paymentId={hold.paymentId}
          totalCents={hold.totalCents}
          remainingMs={hold.remainingMs}
          recap={`${recap} · votre part ${formatCents(hold.totalCents)} frais compris`}
          onPaid={onPaid}
          onExpired={onExpired}
        />
      </div>
    );
  }

  return (
    <form className="club-join club-form" onSubmit={submit}>
      <ShareAmount
        value={value}
        min={minimumCents}
        max={remainingCents}
        part={minimumCents}
        feePercent={feePercent}
        othersLabel="reste après vous"
        presets={[
          { label: "Part égale", cents: minimumCents },
          { label: "Tout le reste", cents: remainingCents },
        ].filter((preset, index, all) => all.findIndex((other) => other.cents === preset.cents) === index)}
        onChange={setAmount}
      />
      <label className="club-field">
        <span>Nom et prénom</span>
        <input
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          value={contact.name}
          onChange={(input) => setContact({ ...contact, name: input.target.value })}
        />
      </label>
      <label className="club-field">
        <span>Téléphone</span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={contact.phone}
          onChange={(input) => setContact({ ...contact, phone: input.target.value })}
        />
      </label>
      <label className="club-field">
        <span>E-mail</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={contact.email}
          onChange={(input) => setContact({ ...contact, email: input.target.value })}
        />
        <small>Votre reçu y arrive.</small>
      </label>
      <div className="club-conditions">
        <ul className="club-conditions-list">
          <li>
            <svg viewBox="0 0 24 24" aria-hidden>
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <circle cx="9" cy="11" r="2.2" />
              <path d="M6 16c.8-1.6 1.9-2.4 3-2.4s2.2.8 3 2.4M14 10h4M14 13.5h3" />
            </svg>
            <span>{`${conditions.minAge} ans et plus, pièce d’identité à l’appui`}</span>
          </li>
          {(conditions.dress || conditions.refused) && (
            <li>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M9 3 4 6l2 4 2-1v12h8V9l2 1 2-4-5-3c-.5 1.4-1.7 2.2-3 2.2S9.5 4.4 9 3Z" />
              </svg>
              <span>{[conditions.dress, conditions.refused].filter(Boolean).join(" · ")}</span>
            </li>
          )}
          <li>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" />
              <path d="M12 8v4l3 2" />
            </svg>
            <span>
              Votre part n&rsquo;est remboursée que si le club l&rsquo;accepte, ou automatiquement si la soirée est
              annulée.
            </span>
          </li>
        </ul>
        <label className="club-check">
          <input type="checkbox" required checked={accepted} onChange={(input) => setAccepted(input.target.checked)} />
          <span>J&rsquo;accepte les conditions du club</span>
        </label>
        <p className="club-fine club-hold-note">
          Votre part vous est tenue {TABLE_HOLD_S / 60} minutes dès que vous passez au paiement.
        </p>
      </div>
      {error && (
        <p className="club-error" role="alert">
          {error}
        </p>
      )}
      <div className="club-sticky-cta">
        <button type="submit" className="club-button club-button-primary club-button-block" disabled={sending} aria-busy={sending || undefined}>
          {sending ? (
            <>
              <span className="club-spinner" aria-hidden />
              Un instant…
            </>
          ) : (
            <>
              Payer ma part ·{" "}
              <span className="club-mono">{formatCents(value + serviceFeeCents(value, feePercent))}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

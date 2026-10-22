"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { formatPrice } from "@/lib/menu/format";

/*
 * L'habillage commun des règlements dans la page (Square, Stripe) : le
 * montant, les portefeuilles puis la carte, et les écrans de fin. Chaque
 * prestataire n'apporte que ses formulaires, montés dans ses conteneurs.
 */

export type CardPaymentState = "loading" | "ready" | "paying" | "paid" | "declined" | "error";

/** Le thème se lit au montage : texte clair ⇒ fond sombre. */
export function isDarkTheme(element: Element): boolean {
  const [r, g, b] = getComputedStyle(element).color.match(/\d+/g)!.map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b > 127.5;
}

/*
 * Les formulaires des prestataires vivent dans leurs iframes : nos classes
 * n'y entrent pas, leurs couleurs leur sont passées. Ce sont celles du thème
 * du restaurant, relues sur la page — via la couleur calculée, toujours en
 * rgb()/rgba() : la feuille compilée écrit les transparences en hex à huit
 * chiffres, que les SDK refusent.
 */
export function themeColors<Name extends string>(
  element: Element,
  names: readonly Name[]
): Record<Name, string> {
  const probe = document.createElement("span");
  element.appendChild(probe);
  const colors = Object.fromEntries(
    names.map((name) => {
      probe.style.color = `var(${name})`;
      return [name, getComputedStyle(probe).color];
    })
  ) as Record<Name, string>;
  probe.remove();
  return colors;
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <rect x="3" y="7" width="10" height="7" rx="1.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

export function CardPaymentPaid({
  due,
  onContinue,
}: {
  due: string;
  onContinue: () => void;
}) {
  return (
    <div className="relative flex flex-col items-center gap-6 overflow-hidden px-6 pt-12 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
      <div aria-hidden className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-56" />
      <div className="relative flex size-20 items-center justify-center">
        <span aria-hidden className="pulse-ring absolute inset-0 rounded-full border-2 border-ember-2" />
        <span className="ember-gradient order-pop flex size-16 items-center justify-center rounded-full text-background shadow-xl shadow-black/30">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-8">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <div className="rise relative flex flex-col gap-2">
        <p className="ember-text text-[11px] font-semibold uppercase tracking-[0.28em]">
          Paiement confirmé
        </p>
        <p className="font-display text-4xl font-medium tabular-nums">{due}</p>
        <p className="text-sm leading-relaxed text-muted">
          Merci&nbsp;! Votre commande part en cuisine.
        </p>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="ember-gradient relative h-12 w-full rounded-full text-sm font-semibold text-background transition active:scale-[0.99]"
      >
        Continuer
      </button>
    </div>
  );
}

export function CardPaymentFailed({
  declined,
  onRetry,
  onCounter,
}: {
  /** Refusé par la banque ; sinon, le formulaire n'a pas pu démarrer. */
  declined: boolean;
  onRetry: () => void;
  onCounter: () => void;
}) {
  return (
    <div className="rise flex flex-col items-center gap-6 px-6 pt-10 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
      <span className="flex size-14 items-center justify-center rounded-full border border-ember-3/40 bg-ember-3/10 text-ember-3">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-6">
          <path d="M12 7.5v5.5M12 16.5v.01" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      </span>
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-2xl font-medium">
          {declined ? "Paiement refusé" : "Le paiement n’a pas pu démarrer"}
        </h3>
        <p className="text-sm leading-relaxed text-muted">
          {declined
            ? "Essayez une autre carte, ou réglez au comptoir."
            : "Réessayez dans un instant, ou réglez au comptoir."}{" "}
          Votre commande est enregistrée et partira en cuisine dès
          l&rsquo;encaissement.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2.5">
        <button
          type="button"
          onClick={onRetry}
          className="ember-gradient h-12 w-full rounded-full text-sm font-semibold text-background transition active:scale-[0.99]"
        >
          Réessayer
        </button>
        <button
          type="button"
          onClick={onCounter}
          className="h-12 w-full rounded-full border border-hairline text-sm font-semibold transition hover:bg-surface-raised"
        >
          Payer au comptoir
        </button>
      </div>
    </div>
  );
}

/**
 * Le formulaire, à l'image de l'aperçu à table (preview-payment) : le mot
 * « Paiement », l'établissement et le montant, puis les portefeuilles (Apple
 * Pay en premier), la carte, « Payer », et la sortie vers le comptoir. Les
 * portefeuilles et le formulaire carte sont les conteneurs du prestataire,
 * toujours montés : son SDK les remplit.
 */
export function CardPaymentForm({
  state,
  total,
  tipAmount,
  merchant,
  hasWallet,
  wallets,
  card,
  onPay,
  onCounter,
  operator,
}: {
  state: "loading" | "ready" | "paying";
  total: number;
  tipAmount: number;
  /** L'établissement encaisseur, nommé au-dessus du montant. */
  merchant?: string;
  hasWallet: boolean;
  wallets: ReactNode;
  card: ReactNode;
  onPay: () => void;
  onCounter: () => void;
  /** Le prestataire nommé au pied du formulaire. */
  operator: string;
}) {
  const due = formatPrice(total + tipAmount);
  // Le formulaire remplace le panier : le focus le suit, sinon il retombait sur la page.
  const titleRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => titleRef.current?.focus(), []);
  return (
    <div className="flex flex-col gap-5 p-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      {/* Des paragraphes : un titre y prendrait le filet de titre des thèmes. */}
      <header className="rise flex flex-col items-center gap-1 text-center">
        <p
          ref={titleRef}
          tabIndex={-1}
          className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted outline-none"
        >
          Paiement
        </p>
        {merchant && <p className="max-w-full truncate text-sm font-medium">{merchant}</p>}
        <p className="font-display text-3xl font-semibold lining-nums tabular-nums text-ember-1">
          {due}
        </p>
        {tipAmount > 0 && (
          <p className="text-xs text-muted tabular-nums">
            Commande {formatPrice(total)} · Pourboire {formatPrice(tipAmount)}
          </p>
        )}
      </header>

      <section
        className={`rise flex flex-col gap-2.5 ${hasWallet ? "" : "-mt-5"}`}
        style={{ animationDelay: "80ms" }}
      >
        {wallets}
        {hasWallet && (
          <div className="mt-2 flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
            <span className="h-px flex-1 bg-hairline" />
            ou par carte
            <span className="h-px flex-1 bg-hairline" />
          </div>
        )}
      </section>

      <section className="rise flex flex-col gap-5" style={{ animationDelay: "140ms" }}>
        <div className={`relative ${state === "loading" ? "min-h-28" : ""}`}>
          {card}
          {state === "loading" && (
            <div aria-hidden className="absolute inset-0 flex flex-col gap-px overflow-hidden rounded-2xl border border-hairline">
              <div className="shimmer flex-1" />
              <div className="flex flex-1 gap-px">
                <div className="shimmer flex-1" />
                <div className="shimmer flex-1" />
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onPay}
          disabled={state !== "ready"}
          className="ember-gradient flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-background transition active:scale-[0.99] disabled:opacity-60"
        >
          {state === "paying" ? (
            <>
              <Spinner />
              Paiement en cours…
            </>
          ) : state === "loading" ? (
            "Préparation du paiement…"
          ) : (
            `Payer ${due}`
          )}
        </button>
      </section>

      <footer className="rise -mt-2 flex flex-col items-center gap-2" style={{ animationDelay: "200ms" }}>
        <button
          type="button"
          onClick={onCounter}
          disabled={state === "paying"}
          className="min-h-11 rounded-full px-4 text-sm font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-40"
        >
          Payer au comptoir plutôt
        </button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
          <LockIcon className="size-3.5" />
          Paiement sécurisé par {operator}
        </p>
      </footer>
    </div>
  );
}

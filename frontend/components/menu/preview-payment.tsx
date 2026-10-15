"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/components/gestion/icons";
import { formatPrice } from "@/lib/menu/format";

/** Le traitement simulé de la carte, en ms. */
const PREVIEW_PAYMENT_MS = 1_100;
/** « Paiement accepté » reste à l'écran ce temps, en ms, avant le ticket. */
const PREVIEW_ACCEPTED_MS = 900;

type Phase = "confirm" | "processing" | "accepted";

/*
 * Aperçu à table (demoSuivi) : le paiement en ligne, joué dans la feuille du
 * panier sans rien appeler — ni Stripe, ni Square, ni la base. Une carte
 * générique déjà remplie et « Payer », que le vendeur touche ; le temps du
 * traitement ; « Paiement accepté » : la commande part à ce moment
 * (onAccepted), puis son ticket prend la place de la feuille (onDone).
 * « Annuler » ramène au panier ; la feuille qui se referme (cancelled :
 * Échap, le fond) arrête tout. Avant « accepté », rien n'est parti.
 */
export function PreviewPayment({
  total,
  merchant,
  cancelled,
  onCancel,
  onAccepted,
  onDone,
}: {
  /** Ce que le client règle, pourboire compris. */
  total: number;
  /** L'établissement encaisseur, nommé au-dessus de la carte. */
  merchant: string;
  cancelled: boolean;
  /** Retour au panier, tel quel. */
  onCancel: () => void;
  onAccepted: () => void;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("confirm");
  // Le panier recrée ses rappels à chaque rendu : lus dans une ref, ils ne
  // relancent pas la minuterie.
  const callbacks = useRef({ onAccepted, onDone });
  useEffect(() => {
    callbacks.current = { onAccepted, onDone };
  });
  // Le bouton du panier est parti : le focus passe à « Payer », puis, lui
  // parti, à l'état du paiement.
  const payRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    (phase === "confirm" ? payRef : statusRef).current?.focus({ preventScroll: true });
  }, [phase]);
  useEffect(() => {
    if (cancelled || phase === "confirm") return;
    const timer =
      phase === "processing"
        ? setTimeout(() => {
            setPhase("accepted");
            callbacks.current.onAccepted();
          }, PREVIEW_PAYMENT_MS)
        : setTimeout(() => callbacks.current.onDone(), PREVIEW_ACCEPTED_MS);
    return () => clearTimeout(timer);
  }, [phase, cancelled]);

  return (
    <div data-preview-payment={phase} className="flex flex-col gap-5 p-5 pt-6">
      {/* Des paragraphes : la feuille est nommée « Paiement simulé », et un h3
          y prendrait le filet de titre des thèmes (Café des Arts). */}
      <div className="flex flex-col items-center gap-1 text-center">
        {/* « Paiement à Le Victoria » ne se dit pas : le nom seul, sous le mot. */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted">Paiement</p>
        <p className="max-w-full truncate text-sm font-medium">{merchant}</p>
        <p className="font-display text-3xl font-semibold lining-nums tabular-nums text-ember-1">
          {formatPrice(total)}
        </p>
      </div>
      {/* Une carte générique, déjà remplie : ni marque, ni réseau, ni portefeuille. */}
      <div
        aria-hidden
        className="payment-card mx-auto flex aspect-[1.586] w-full max-w-72 flex-col justify-between rounded-2xl border border-hairline bg-surface-raised p-5 shadow-2xl shadow-black/30"
      >
        <div className="flex items-center justify-between">
          <svg viewBox="0 0 40 30" className="payment-chip h-7 w-9">
            <rect x="0.5" y="0.5" width="39" height="29" rx="5" />
            <path d="M0.5 10h11M0.5 20h11M28.5 10h11M28.5 20h11M11.5 0.5v29M28.5 0.5v29M11.5 15h17" />
          </svg>
          <svg
            viewBox="0 0 24 24"
            className="size-5 text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M8 8.5a5 5 0 010 7M11.5 6a8.5 8.5 0 010 12M15 3.5a12 12 0 010 17" />
          </svg>
        </div>
        <span className="text-base lining-nums tabular-nums tracking-[0.2em]">•••• 4242</span>
        <span className="flex justify-between text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">
          <span>Carte bancaire</span>
          <span className="lining-nums tabular-nums">12/29</span>
        </span>
      </div>
      <div className="flex min-h-11 items-center justify-center gap-2.5">
        {phase === "confirm" ? (
          <button
            ref={payRef}
            type="button"
            data-preview-pay
            onClick={() => setPhase("processing")}
            className="ember-gradient min-h-11 w-full rounded-full px-6 py-3 text-sm font-semibold text-background"
          >
            Payer {formatPrice(total)}
          </button>
        ) : (
          <>
            {phase === "accepted" ? (
              <span
                aria-hidden
                className="pop ember-gradient flex size-7 items-center justify-center rounded-full text-background"
              >
                <CheckIcon className="size-4 stroke-[2.4]" />
              </span>
            ) : (
              <span aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-ember-2/20">
                <span className="loader-bar ember-gradient block h-full w-1/3 rounded-full" />
              </span>
            )}
            <p
              ref={statusRef}
              role="status"
              tabIndex={-1}
              className={`text-sm outline-none ${phase === "accepted" ? "font-semibold" : "text-muted"}`}
            >
              {phase === "accepted" ? "Paiement accepté" : "Paiement en cours…"}
            </p>
          </>
        )}
      </div>
      {/* Le fond ne se touche pas au lecteur d'écran : la sortie est un bouton. */}
      {phase === "confirm" && (
        <button
          type="button"
          onClick={onCancel}
          className="-mt-3 min-h-11 rounded-full text-sm font-semibold text-muted transition-colors hover:text-foreground"
        >
          Annuler
        </button>
      )}
      <p className="-mt-2 flex items-center justify-center gap-1.5 text-xs text-muted">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3" />
        </svg>
        Paiement sécurisé
      </p>
      <p className="rounded-2xl border border-hairline px-4 py-2 text-center text-xs font-medium text-muted">
        Démo — paiement simulé, rien n’est débité.
      </p>
    </div>
  );
}

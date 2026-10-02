"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/menu/sheet";
import { useCart } from "@/lib/menu/cart";
import { fallBackToCounter } from "@/lib/menu/online-payment";
import { useTickets } from "@/lib/menu/tickets";

/*
 * Retour de Stripe Checkout (?paiement=succes|annule&commande=<id>). Le
 * succès n'est affiché qu'après confirmation serveur (/api/stripe/verify
 * relit la session chez Stripe) — l'URL ne fait pas foi. Un paiement annulé
 * ou non confirmé laisse la commande valable : réessayer, ou régler au
 * comptoir. Les paramètres sont retirés de l'URL aussitôt, un rechargement
 * ne rejoue pas la feuille.
 *
 * Le retour au comptoir (abandon_online_payment) n'est déclenché que par un
 * choix explicite du client — le bouton « Payer au comptoir » — jamais par
 * le seul affichage de cet écran : tant que « Réessayer par carte » reste
 * une option, une session Stripe peut encore aboutir, et exposer l'addition
 * plus tôt permettrait à la salle de l'encaisser pendant que le client
 * termine son paiement en ligne. Sans geste du client, la session Stripe
 * expire et le webhook supprime la commande : elle ne surgit jamais, ni en
 * caisse ni dans l'historique. Seule exception : une relance qui échoue avant même de créer une session
 * (retry_failed) ne laisse plus rien en concurrence, le comptoir est donc
 * notifié tout de suite.
 *
 * En fast food, toute issue se conclut sur le ticket : le numéro à
 * présenter, et, tant que rien n'est réglé, « Reprendre le paiement » ou
 * « Payer au comptoir à la place » — les mêmes choix qu'ici, sous le numéro.
 */

type State =
  | "verifying"
  | "paid"
  | "unpaid"
  | "cancelled"
  | "retrying"
  | "retry_failed";

export function PaymentReturn({
  outcome,
  orderId,
  tableNumber,
}: {
  outcome: "succes" | "annule";
  orderId: string;
  tableNumber: number | null;
}) {
  const cart = useCart();
  const tickets = useTickets();
  const [state, setState] = useState<State>(
    outcome === "succes" ? "verifying" : "cancelled"
  );
  const [open, setOpen] = useState(true);
  /*
   * La feuille se monte dans la racine du menu (createPortal) : seulement une
   * fois la page posée à l'écran. Au rendu serveur, pas de document ; et
   * quand le navigateur refait la page de zéro (la carte arrive après le
   * JavaScript), la racine n'existe pas encore au rendu — la feuille partait
   * dans <body>, rendait le reste inerte, puis rejoignait la racine… sous un
   * ancêtre inerte : plus rien ne se touchait.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Un fait du DOM (la page est posée), pas un état dérivé du rendu.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("paiement");
    url.searchParams.delete("commande");
    window.history.replaceState(null, "", url);
  }, []);

  // La commande est passée, payée ou non : son panier ne revient pas. Vidé
  // une fois relu (cart.ready) — plus tôt, la relecture le rétablissait.
  const { ready, clear } = cart;
  useEffect(() => {
    if (ready) clear();
  }, [ready, clear]);

  // Fast food : chaque issue se conclut sur le ticket, qui prend la place de
  // cette feuille — un paiement inabouti s'y dit « Paiement en cours ».
  const toTicket = () => {
    if (!tickets) return false;
    tickets.add(orderId);
    tickets.show(orderId, { notices: [] });
    setOpen(false);
    return true;
  };
  const toTicketRef = useRef(toTicket);
  useEffect(() => {
    toTicketRef.current = toTicket;
  });

  useEffect(() => {
    if (outcome !== "succes") {
      toTicketRef.current();
      return;
    }
    let cancelled = false;
    fetch("/api/stripe/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    })
      .then((response) => response.json())
      .then((body: { paid?: boolean }) => {
        if (cancelled) return;
        if (toTicketRef.current()) return;
        setState(body.paid ? "paid" : "unpaid");
      })
      .catch(() => {
        if (!cancelled && !toTicketRef.current()) setState("unpaid");
      });
    return () => {
      cancelled = true;
    };
  }, [outcome, orderId]);

  const retry = async () => {
    setState("retrying");
    try {
      const response = await fetch("/api/stripe/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const body = (await response.json()) as { url?: string };
      if (response.ok && body.url) {
        window.location.assign(body.url);
        return;
      }
      // Aucune session créée : plus rien ne peut aboutir en ligne, le
      // comptoir est notifié sans attendre un geste de plus.
      setState("retry_failed");
      void fallBackToCounter(orderId);
    } catch {
      setState("retry_failed");
      void fallBackToCounter(orderId);
    }
  };

  const goToCounter = () => {
    void fallBackToCounter(orderId);
    setOpen(false);
  };

  if (!open || !mounted) return null;

  const table = tableNumber === null ? "votre table" : `la table ${tableNumber}`;
  const counter = (
    <>
      Votre commande est enregistrée pour {table}. Réglez-la auprès
      d&rsquo;un serveur ou au comptoir&nbsp;: elle part en cuisine dès
      l&rsquo;encaissement.
    </>
  );
  // Une vraie feuille (dialogue, focus gardé, page derrière inerte) ; elle ne
  // se ferme pas d'un toucher à côté pendant que le paiement se vérifie.
  const settled = state !== "verifying" && state !== "retrying";
  return (
    <Sheet onClosed={() => setOpen(false)} backdropCloses={settled} label="Paiement">
      {(dismiss) => (
        <div className="flex flex-col items-center gap-4 p-10 text-center">
          {state === "verifying" ? (
            <p role="status" aria-busy className="text-sm text-muted">
              Confirmation du paiement…
            </p>
          ) : state === "paid" ? (
            <>
              <span className="ember-text font-display text-5xl">✓</span>
              <h3 className="font-display text-2xl font-medium">
                Paiement reçu — merci&nbsp;!
              </h3>
              <p className="text-sm leading-relaxed text-muted">
                Votre commande part en cuisine pour {table}. Un serveur vous
                l&rsquo;apporte dès qu&rsquo;elle est prête.
              </p>
              <button
                type="button"
                onClick={dismiss}
                className="ember-gradient mt-2 rounded-full px-6 py-2.5 text-sm font-semibold text-background"
              >
                Continuer
              </button>
            </>
          ) : state === "retry_failed" ? (
            <>
              <h3 className="font-display text-xl font-medium">
                Le paiement n&rsquo;a pas pu démarrer.
              </h3>
              <p className="text-sm leading-relaxed text-muted">{counter}</p>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold"
              >
                Continuer
              </button>
            </>
          ) : (
            <>
              <h3 className="font-display text-xl font-medium">
                {state === "cancelled" ? "Paiement annulé." : "Paiement non confirmé."}
              </h3>
              <p className="text-sm leading-relaxed text-muted">{counter}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={goToCounter}
                  className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold"
                >
                  Payer au comptoir
                </button>
                <button
                  type="button"
                  onClick={() => void retry()}
                  disabled={state === "retrying"}
                  className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
                >
                  {state === "retrying" ? "Un instant…" : "Réessayer par carte"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

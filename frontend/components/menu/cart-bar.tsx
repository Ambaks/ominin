"use client";

import { useState } from "react";
import { LoyaltySection } from "@/components/menu/loyalty-section";
import { SquarePayment } from "@/components/menu/square-payment";
import { SumUpPayment } from "@/components/menu/sumup-payment";
import { useCart } from "@/lib/menu/cart";
import { formatPrice } from "@/lib/menu-data";
import { fallBackToCounter } from "@/lib/menu/online-payment";
import { notifyOrderEvent } from "@/lib/push/events";
import { createClient } from "@/lib/supabase/client";

type SubmitState = "idle" | "sending" | "sent" | "error";
type PaymentChoice = "comptoir" | "carte";
type TipChoice = number | "autre" | null;

/** Pourboires proposés au règlement par carte (en % du total, arrondi au centime). */
const TIP_PERCENTS = [5, 10, 15] as const;

export function CartBar() {
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [paymentChoice, setPayment] = useState<PaymentChoice>("comptoir");
  // Mode retenu à l'envoi : l'écran de confirmation le lit une fois le
  // panier vidé, quand le total ne dit plus rien.
  const [sentPayment, setSentPayment] = useState<PaymentChoice>("comptoir");
  const [contact, setContact] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [tipChoice, setTipChoice] = useState<TipChoice>(null);
  const [customTip, setCustomTip] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Paiement carte choisi mais impossible à démarrer : la commande reste
  // valable, il faut le dire au client (il paiera au comptoir).
  const [cardFailed, setCardFailed] = useState(false);
  // Règlement SumUp en cours : le widget s'affiche dans la feuille à la place
  // de l'écran « commande envoyée » (Stripe redirige, SumUp encaisse en page).
  const [sumupPayment, setSumupPayment] = useState<{
    orderId: string;
    checkoutId: string;
  } | null>(null);
  // Règlement Square : même place dans la feuille, mais le formulaire carte
  // se monte avant tout appel serveur (le SDK tokenise dans le navigateur).
  // Le pourboire y est figé : il se calcule sur le total du panier, que
  // l'envoi de la commande vide juste après.
  const [squarePayment, setSquarePayment] = useState<{
    orderId: string;
    locationId: string;
    total: number;
    tipAmount: number;
  } | null>(null);

  // Rien à afficher tant que la commande n'est pas possible ou le panier vide.
  if (!cart.orderingEnabled || cart.tableNumber === null) return null;
  if (cart.count === 0 && state !== "sent") return null;

  // Tout est offert en points : rien à régler par carte, la salle valide
  // l'addition à zéro (place_order la laisse d'ailleurs au comptoir).
  const payment: PaymentChoice = cart.total > 0 ? paymentChoice : "comptoir";
  const loyaltyContact = cart.loyalty ? contact.trim() : "";

  // Pourboire du règlement par carte : pourcentage du total arrondi au
  // centime, ou montant libre. La borne finale (≤ total) est côté serveur.
  const tipAmount =
    payment !== "carte" || tipChoice === null
      ? 0
      : tipChoice === "autre"
        ? Math.max(
            0,
            Math.round(Number(customTip.replace(",", ".")) * 100) / 100 || 0
          )
        : Math.round(cart.total * tipChoice) / 100;

  // Le règlement par carte n'aura pas lieu : l'addition passe au comptoir.
  const giveUpCard = (orderId: string) => {
    setCardFailed(true);
    void fallBackToCounter(orderId);
  };

  const submit = async () => {
    if (cart.tableNumber === null) return;
    setState("sending");
    setError(null);
    setCardFailed(false);
    const supabase = createClient();
    const payload = cart.lines.map((line) => ({
      item_id: line.itemId,
      quantity: line.quantity,
      choices: line.choices,
      ...(line.reward && { reward_id: line.reward.id }),
    }));
    const { data: orderId, error: rpcError } = await supabase.rpc(
      "place_order",
      {
        p_slug: cart.slug,
        p_table_number: cart.tableNumber,
        p_items: payload,
        // Réglée en ligne, la commande attend son paiement hors de la caisse ;
        // c'est le paiement (ou son abandon) qui la fera arriver en salle.
        p_online_payment: payment === "carte",
        // Points débités ici, gagnés à l'encaissement.
        ...(loyaltyContact && { p_loyalty_contact: loyaltyContact }),
      }
    );
    if (rpcError) {
      setState("error");
      setError(rpcError.message);
      return;
    }
    setSentPayment(payment);
    // Le solde affiché ne vaut plus : il se relira à la prochaine commande.
    setBalance(null);
    // Prévient la salle (push) : la commande attend son encaissement au
    // comptoir. Sans bloquer le parcours client.
    if (payment === "comptoir") notifyOrderEvent(orderId, "en_attente");
    // Fin de l'entonnoir : la visite a produit une commande, et le règlement
    // par carte en est la dernière étape (qu'il aboutisse ou non — un échec
    // renvoie au comptoir, mais le client était bien allé jusque-là).
    cart.track(payment === "carte" ? "paiement" : "commande", { orderId });

    if (payment === "carte" && cart.paymentProvider === "stripe") {
      // La commande est enregistrée ; on enchaîne sur le règlement Stripe,
      // qui la fera partir en cuisine.
      try {
        const response = await fetch("/api/stripe/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            tipAmount > 0 ? { orderId, tipAmount } : { orderId }
          ),
        });
        const body = (await response.json()) as { url?: string };
        if (response.ok && body.url) {
          cart.clear();
          window.location.assign(body.url);
          return;
        }
        giveUpCard(orderId);
      } catch {
        // Le règlement en ligne a échoué : la commande reste valable,
        // le client paiera au comptoir.
        giveUpCard(orderId);
      }
    }

    if (payment === "carte" && cart.paymentProvider === "sumup") {
      // La commande est enregistrée ; le règlement se fait dans la page via
      // le widget SumUp (le checkout est créé côté serveur, montant relu en
      // base) et la fait partir en cuisine. En cas d'échec de démarrage :
      // règlement au comptoir.
      try {
        const response = await fetch("/api/sumup/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            tipAmount > 0 ? { orderId, tipAmount } : { orderId }
          ),
        });
        const body = (await response.json()) as { checkoutId?: string };
        if (response.ok && body.checkoutId) {
          setSumupPayment({ orderId, checkoutId: body.checkoutId });
        } else {
          giveUpCard(orderId);
        }
      } catch {
        giveUpCard(orderId);
      }
    }

    if (payment === "carte" && cart.paymentProvider === "square") {
      // Rien à demander au serveur pour l'instant : le formulaire carte se
      // monte avec l'identifiant d'application et le point de vente (tous
      // deux publics), et /api/square/pay n'est appelé qu'une fois la carte
      // tokenisée. Sans point de vente désigné, pas d'encaissement possible.
      if (cart.squareLocationId) {
        setSquarePayment({
          orderId,
          locationId: cart.squareLocationId,
          total: cart.total,
          tipAmount,
        });
      } else {
        giveUpCard(orderId);
      }
    }

    cart.clear();
    setState("sent");
  };

  const close = () => {
    setOpen(false);
    if (state === "sent") {
      setState("idle");
      setSumupPayment(null);
      setSquarePayment(null);
    }
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ember-gradient pointer-events-auto flex w-full max-w-md items-center justify-between gap-4 rounded-full px-6 py-3.5 text-background shadow-2xl shadow-black/40"
        >
          <span className="flex items-center gap-2.5 text-sm font-semibold">
            <span className="flex size-6 items-center justify-center rounded-full bg-background/25 text-xs font-bold">
              {cart.count}
            </span>
            Voir la commande
          </span>
          <span className="text-sm font-bold">{formatPrice(cart.total)}</span>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={close}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-hairline bg-surface sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            {state === "sent" && sumupPayment ? (
              <SumUpPayment
                orderId={sumupPayment.orderId}
                initialCheckoutId={sumupPayment.checkoutId}
                onDone={(paid) => {
                  setSumupPayment(null);
                  if (!paid) giveUpCard(sumupPayment.orderId);
                }}
              />
            ) : state === "sent" && squarePayment ? (
              <SquarePayment
                orderId={squarePayment.orderId}
                locationId={squarePayment.locationId}
                total={squarePayment.total}
                tipAmount={squarePayment.tipAmount}
                onDone={(paid) => {
                  setSquarePayment(null);
                  if (!paid) giveUpCard(squarePayment.orderId);
                }}
              />
            ) : state === "sent" ? (
              <div className="flex flex-col items-center gap-4 p-10 text-center">
                <span className="ember-text font-display text-5xl">✓</span>
                <h3 className="font-display text-2xl font-medium">
                  Commande envoyée !
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  {sentPayment === "carte" && !cardFailed ? (
                    <>
                      Paiement reçu&nbsp;: votre commande part en cuisine pour
                      la table {cart.tableNumber}. Un serveur vous
                      l&rsquo;apporte dès qu&rsquo;elle est prête.
                    </>
                  ) : (
                    <>
                      Votre commande est enregistrée pour la table{" "}
                      {cart.tableNumber}. Réglez-la auprès d&rsquo;un serveur
                      ou au comptoir&nbsp;: elle part en cuisine dès
                      l&rsquo;encaissement.
                    </>
                  )}
                </p>
                {cardFailed && (
                  <p className="text-sm leading-relaxed text-ember-3">
                    Le paiement par carte n&rsquo;a pas pu démarrer&nbsp;: vous
                    réglerez votre addition au comptoir.
                  </p>
                )}
                {loyaltyContact && (
                  <p className="text-xs leading-relaxed text-muted">
                    Vos points de fidélité sont crédités sur {loyaltyContact}{" "}
                    à l&rsquo;encaissement.
                  </p>
                )}
                <button
                  type="button"
                  onClick={close}
                  className="ember-gradient mt-2 rounded-full px-6 py-2.5 text-sm font-semibold text-background"
                >
                  Continuer
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-hairline p-5">
                  <h3 className="font-display text-lg font-medium">
                    Votre commande · Table {cart.tableNumber}
                  </h3>
                  <button
                    type="button"
                    onClick={close}
                    className="text-2xl leading-none text-muted"
                    aria-label="Fermer"
                  >
                    ×
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  <ul className="flex flex-col gap-4">
                    {cart.lines.map((line) => (
                      <li key={line.key} className="flex gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{line.name}</p>
                          {line.optionSummary.length > 0 && (
                            <p className="mt-0.5 text-xs text-muted">
                              {line.optionSummary.join(" · ")}
                            </p>
                          )}
                          <div className="mt-2 inline-flex items-center gap-3 rounded-full border border-hairline px-1">
                            <button
                              type="button"
                              onClick={() =>
                                cart.setQuantity(line.key, line.quantity - 1)
                              }
                              className="flex size-7 items-center justify-center text-lg text-muted"
                              aria-label="Retirer un"
                            >
                              −
                            </button>
                            <span className="min-w-4 text-center text-sm font-semibold">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                cart.setQuantity(line.key, line.quantity + 1)
                              }
                              disabled={
                                (line.stock != null &&
                                  line.quantity >= line.stock) ||
                                (line.reward != null &&
                                  (balance ?? 0) - cart.pointsSpent <
                                    line.reward.points)
                              }
                              className="flex size-7 items-center justify-center text-lg text-muted disabled:opacity-40"
                              aria-label="Ajouter un"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {line.reward ? (
                          <span className="shrink-0 text-right text-sm font-semibold text-ember-1">
                            Offert
                            <span className="block text-xs font-medium text-muted">
                              {line.reward.points * line.quantity}&nbsp;pts
                              {line.unitPrice > 0 &&
                                ` + ${formatPrice(line.unitPrice * line.quantity)}`}
                            </span>
                          </span>
                        ) : (
                          <span className="shrink-0 text-sm font-semibold text-ember-1">
                            {formatPrice(line.unitPrice * line.quantity)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {cart.loyalty && (
                    <LoyaltySection
                      program={cart.loyalty}
                      contact={contact}
                      onContactChange={setContact}
                      balance={balance}
                      onBalance={setBalance}
                    />
                  )}
                </div>

                <div className="border-t border-hairline p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-muted">Total</span>
                    <span className="font-display text-xl font-semibold">
                      {formatPrice(cart.total)}
                    </span>
                  </div>
                  {cart.onlinePayment && cart.total > 0 && (
                    <div className="mb-4 flex gap-2">
                      {(
                        [
                          ["comptoir", "Payer au comptoir"],
                          ["carte", "Payer en ligne"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPayment(value)}
                          className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                            payment === value
                              ? "border-ember-2/60 bg-surface-raised text-foreground"
                              : "border-hairline text-muted"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  {cart.onlinePayment && payment === "carte" && (
                    <div className="mb-4 flex flex-col gap-2.5">
                      <p className="text-xs font-medium text-muted">
                        Un pourboire pour l&rsquo;équipe&nbsp;?
                      </p>
                      <div className="flex gap-2">
                        {TIP_PERCENTS.map((percent) => (
                          <button
                            key={percent}
                            type="button"
                            onClick={() =>
                              setTipChoice(
                                tipChoice === percent ? null : percent
                              )
                            }
                            className={`flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                              tipChoice === percent
                                ? "border-ember-2/60 bg-surface-raised text-foreground"
                                : "border-hairline text-muted"
                            }`}
                          >
                            {percent}&nbsp;%
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setTipChoice(tipChoice === "autre" ? null : "autre")
                          }
                          className={`flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                            tipChoice === "autre"
                              ? "border-ember-2/60 bg-surface-raised text-foreground"
                              : "border-hairline text-muted"
                          }`}
                        >
                          Autre
                        </button>
                      </div>
                      {tipChoice === "autre" && (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={customTip}
                          onChange={(event) => setCustomTip(event.target.value)}
                          placeholder="Montant en €"
                          aria-label="Montant du pourboire en euros"
                          autoFocus
                          className="rounded-xl border border-hairline bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ember-2/50"
                        />
                      )}
                      {tipAmount > 0 && (
                        <p className="text-xs text-muted">
                          Pourboire&nbsp;: {formatPrice(tipAmount)} — réglé avec
                          l&rsquo;addition, reversé au service.
                        </p>
                      )}
                    </div>
                  )}
                  {state === "error" && (
                    <p className="mb-3 text-sm text-ember-3">{error}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={state === "sending" || cart.count === 0}
                    className="ember-gradient w-full rounded-full px-6 py-3 text-sm font-semibold text-background disabled:opacity-60"
                  >
                    {state === "sending" ? "Envoi…" : "Envoyer la commande"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

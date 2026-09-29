"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { LoyaltySection } from "@/components/menu/loyalty-section";
import { Sheet, useSheetHistoryReset } from "@/components/menu/sheet";
import { SquarePayment } from "@/components/menu/square-payment";
import { SumUpPayment } from "@/components/menu/sumup-payment";
import { itemCount, useCart, type CartLine } from "@/lib/menu/cart";
import { customerMessage } from "@/lib/menu/errors";
import { contactError } from "@/lib/menu/loyalty";
import { formatPrice } from "@/lib/menu-data";
import { fallBackToCounter } from "@/lib/menu/online-payment";
import { notifyOrderEvent } from "@/lib/push/events";
import { createClient } from "@/lib/supabase/client";

type SubmitState = "idle" | "sending" | "sent" | "error";
type PaymentChoice = "comptoir" | "carte";
type TipChoice = number | "autre" | null;

/** Pourboires proposés au règlement par carte (en % du total, arrondi au centime). */
const TIP_PERCENTS = [5, 10, 15] as const;

/** Une ligne du panier, nommée avec ses choix : deux Menu Solo se distinguent. */
const lineLabel = (line: { name: string; optionSummary: string[] }) =>
  line.optionSummary.length > 0
    ? `${line.name} (${line.optionSummary.join(", ")})`
    : line.name;

/** Retirer la ligne : à la quantité 1, « − » la supprime — l'icône le dit. */
function BinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

export function CartBar() {
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [paymentChoice, setPayment] = useState<PaymentChoice>("carte");
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
  // Chaque ajout fait sauter la barre (.cart-bump-a/-b, alternées pour
  // rejouer l'animation) et s'annonce aux lecteurs d'écran, qui sinon
  // n'entendaient rien : la barre apparaît hors de leur focus.
  const [bump, setBump] = useState({ count: cart.count, n: 0 });
  const [announcement, setAnnouncement] = useState("");
  // Le panier relu après un rechargement n'est pas un ajout : ni saut, ni
  // annonce, on prend juste son compte comme point de départ.
  const [baselined, setBaselined] = useState(false);
  if (!baselined) {
    if (cart.ready) {
      setBaselined(true);
      if (bump.count !== cart.count) setBump({ count: cart.count, n: 0 });
    }
  } else if (bump.count !== cart.count) {
    const added = cart.count > bump.count;
    setBump({ count: cart.count, n: added ? bump.n + 1 : bump.n });
    // Panier vidé par n'importe quel chemin (dernière ligne retirée, cadeaux
    // repris) : la feuille se referme, et le prochain ajout ne la rouvre pas.
    if (cart.count === 0 && state !== "sent") setOpen(false);
    setAnnouncement(
      cart.count === 0
        ? "Panier vide."
        : `${added ? "Ajouté" : "Retiré"}. ${cart.count} article${
            cart.count > 1 ? "s" : ""
          } au panier, ${formatPrice(cart.total)}.`
    );
  }
  const closeRef = useRef<HTMLButtonElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  // Le pied collé couvre le bas de la feuille : le défilement au clavier
  // garde la ligne qui a le focus au-dessus de lui.
  useEffect(() => {
    const foot = footRef.current;
    const panel = foot?.closest<HTMLElement>('[role="dialog"]');
    if (!foot || !panel) return;
    // Le pied collé garde sa place dans le flux : réserver sa hauteur sous
    // la liste en plus laissait une bande vide au bout du défilement.
    const head = panel.querySelector<HTMLElement>(".cart-head");
    const sync = () => {
      panel.style.scrollPaddingBottom = `${foot.offsetHeight}px`;
      // L'en-tête collé couvre le haut de la même façon.
      if (head) panel.style.scrollPaddingTop = `${head.offsetHeight}px`;
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(foot);
    if (head) observer.observe(head);
    return () => observer.disconnect();
  });
  const titleId = useId();
  const tipErrorId = useId();

  // Toujours dans la page tant qu'on peut commander : une zone annoncée n'est
  // lue que si elle existait avant son changement.
  const status = (
    <p role="status" className="sr-only">
      {announcement}
    </p>
  );

  // Rien à afficher tant que la commande n'est pas possible ou le panier vide.
  if (!cart.canOrder) return null;
  if (cart.count === 0 && state !== "sent") return status;

  // Sans paiement en ligne, ou tout offert en points (rien à régler par
  // carte, la salle valide l'addition à zéro : place_order la laisse
  // d'ailleurs au comptoir), l'addition se règle au comptoir.
  const payment: PaymentChoice =
    cart.onlinePayment && cart.total > 0 ? paymentChoice : "comptoir";
  const loyaltyContact = cart.loyalty ? contact.trim() : "";

  // Pourboire du règlement par carte : pourcentage du total arrondi au
  // centime, ou montant libre en euros (« 5 », « 2,50 »). Borné au total de
  // la commande comme le fait le serveur : le total affiché est celui qui
  // sera débité.
  // « 5 € », « 2,50€ » ou « 3, » se lisent aussi ; ce qui reste illisible
  // est signalé sous le champ plutôt que compté pour 0 sans rien dire.
  const tipInput = customTip.replace(/[€\s]/g, "").replace(/[.,]$/, "");
  const tipReadable = /^\d+([.,]\d{1,2})?$/.test(tipInput);
  const typedTip = tipReadable ? Number(tipInput.replace(",", ".")) : 0;
  const tipUnreadable = tipChoice === "autre" && tipInput !== "" && !tipReadable;
  const tipProblem = tipUnreadable
    ? "Montant non reconnu : saisissez par exemple 2,50."
    : tipChoice === "autre" && tipReadable && typedTip > cart.total
      ? "Montant supérieur à la commande : vérifiez-le."
      : null;
  const askedTip =
    payment !== "carte" || tipChoice === null
      ? 0
      : tipChoice === "autre"
        ? typedTip
        : Math.round(cart.total * tipChoice) / 100;
  // Au-delà de la commande, c'est une faute de frappe (« 999 » pour 9,99) :
  // refusé et signalé, plutôt que plafonné sans le dire.
  const tipAmount = askedTip > cart.total ? 0 : askedTip;

  // Une portion de plus : dans le stock, et dans le solde pour un cadeau.
  const canIncrease = (line: CartLine) =>
    !(line.stock != null && itemCount(cart.lines, line.itemId) >= line.stock) &&
    !(line.reward != null && (balance ?? 0) - cart.pointsSpent < line.reward.points);
  const giveUpCard = (orderId: string) => {
    setCardFailed(true);
    void fallBackToCounter(orderId);
  };

  const loyaltyNotices = loyaltyContact
    ? [`Vos points de fidélité seront crédités sur ${loyaltyContact} à l’encaissement.`]
    : [];

  // Un envoi refusé (contact, pourboire) : son message s'efface dès que le
  // client touche à ce qui le causait, au lieu de rester sous ses yeux.
  const clearRefusal = () => {
    if (state !== "error") return;
    setState("idle");
    setError(null);
  };

  const submit = async () => {
    if (!cart.canOrder) return;
    // Le contact de fidélité est facultatif : mal saisi, il ferait refuser
    // toute la commande par la base. On le signale avant d'envoyer.
    const contactProblem = loyaltyContact ? contactError(loyaltyContact) : null;
    if (contactProblem) {
      setState("error");
      setError(`Fidélité : ${contactProblem} Corrigez-le, ou videz le champ pour commander sans points.`);
      document.querySelector<HTMLInputElement>("[data-loyalty-contact]")?.focus();
      return;
    }
    // Un pourboire illisible ou supérieur à la commande : on ne part pas en
    // le laissant tomber sans rien dire.
    if (payment === "carte" && tipProblem) {
      setState("error");
      setError(`Pourboire : ${tipProblem}`);
      document.querySelector<HTMLInputElement>("[data-tip-input]")?.focus();
      return;
    }
    setState("sending");
    setError(null);
    setCardFailed(false);
    const supabase = createClient();
    const payload = cart.lines.map((line) =>
      line.formule
        ? {
            formule_id: line.itemId,
            quantity: line.quantity,
            selections: line.formule.selections,
          }
        : {
            item_id: line.itemId,
            quantity: line.quantity,
            choices: line.choices,
            ...(line.reward && { reward_id: line.reward.id }),
          }
    );
    const { data: orderId, error: rpcError } = await supabase.rpc(
      "place_order",
      {
        p_slug: cart.slug,
        p_table_number: cart.tableNumber as number,
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
      setError(
        customerMessage(
          rpcError,
          "Votre commande n’est pas partie. Vérifiez votre connexion et réessayez."
        )
      );
      return;
    }
    setSentPayment(payment);
    // Le solde affiché ne vaut plus : il se relira à la prochaine commande.
    // Un échec de démarrage du règlement par carte, pour conclure le parcours.
    let failed = false;
    const fail = () => {
      failed = true;
      giveUpCard(orderId);
    };
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
          window.location.assign(body.url);
          return;
        }
        fail();
      } catch {
        // Le règlement en ligne a échoué : la commande reste valable,
        // le client paiera au comptoir.
        fail();
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
          fail();
        }
      } catch {
        fail();
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
        fail();
      }
    }

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
      {status}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4">
        <button
          type="button"
          onClick={(event) => {
            // Second toucher d'un double-tap sur « Ajouter » : pas le panier.
            if (event.detail > 1) return;
            // Safari ne donne pas le focus au bouton touché (voir Sheet).
            event.currentTarget.focus({ preventScroll: true });
            setOpen(true);
          }}
          aria-label={`Voir la commande\u00a0: ${cart.count} article${cart.count > 1 ? "s" : ""}, ${formatPrice(cart.total)}`}
          className={`cart-bar ${bump.n === 0 ? "" : bump.n % 2 ? "cart-bump-a" : "cart-bump-b"} ember-gradient pointer-events-auto flex w-full max-w-md items-center justify-between gap-4 rounded-full px-6 py-3.5 text-background shadow-2xl shadow-black/40`}
        >
          <span className="flex items-center gap-2.5 text-sm font-semibold">
            <span className="flex size-6 items-center justify-center rounded-full bg-background text-xs font-bold text-foreground">
              {cart.count}
            </span>
            <span className="whitespace-nowrap">Voir la commande</span>
          </span>
          <span className="cart-bar-total text-sm font-bold">
            {formatPrice(cart.total)}
          </span>
        </button>
      </div>

      {open && (
        <Sheet
          onClosed={close}
          // Un paiement par carte dans la feuille ne se ferme pas d'un toucher
          // à côté : le formulaire ne se rouvrirait pas.
          backdropCloses={!(state === "sent" && (sumupPayment || squarePayment))}
          labelledBy={state === "sent" ? undefined : titleId}
          label={state === "sent" ? "Commande envoyée" : undefined}
        >
          {(dismiss) => (
            <>
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
                    onClick={dismiss}
                    className="ember-gradient mt-2 rounded-full px-6 py-2.5 text-sm font-semibold text-background"
                  >
                    Continuer
                  </button>
                </div>
              ) : (
                <>
                  {/* En-tête et pied collés, la liste à sa hauteur : sur un écran
                      bas (paysage, zoom), c'est la feuille entière qui défile —
                      la liste ne s'écrase plus à zéro ligne visible. */}
                  <div className="cart-head sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-surface p-5">
                    <h3 id={titleId} className="cart-title font-display text-lg font-medium">
                      Votre commande
                      <span className="cart-table mt-0.5 block font-sans text-xs font-normal normal-case tracking-normal text-muted">
                        Table {cart.tableNumber}
                      </span>
                    </h3>
                    <button
                      ref={closeRef}
                      type="button"
                      onClick={dismiss}
                      className="-mr-2 flex size-11 shrink-0 items-center justify-center text-2xl leading-none text-muted"
                      aria-label="Fermer"
                    >
                      ×
                    </button>
                  </div>

                  <div className="shrink-0 p-5">
                    <ul className="flex flex-col gap-4">
                      {cart.lines.map((line) => (
                        <li key={line.key} className="flex gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="cart-line-name font-display text-sm font-medium">
                              {line.name}
                            </p>
                            {/* Le prix sous le nom, le détail à côté : le sélecteur de
                                quantité tient seul à droite, sur la même hauteur. */}
                            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs text-muted">
                              {line.reward ? (
                                <>
                                  <span className="cart-line-price font-display text-sm font-semibold text-ember-1">
                                    Offert
                                  </span>
                                  <span>
                                    {line.reward.points * line.quantity}&nbsp;pts
                                    {line.unitPrice > 0 &&
                                      ` + ${formatPrice(line.unitPrice * line.quantity)}`}
                                  </span>
                                </>
                              ) : (
                                <span className="cart-line-price font-display text-sm font-semibold text-ember-1">
                                  {formatPrice(line.unitPrice * line.quantity)}
                                </span>
                              )}
                              {line.quantity > 1 && (
                                <span>
                                  {line.quantity} × {formatPrice(line.unitPrice)}
                                </span>
                              )}
                            </p>
                            {line.formule ? (
                              // Une formule : une ligne par étape, ses options entre parenthèses.
                              <ul className="mt-0.5 text-xs text-muted">
                                {line.optionSummary.map((step, i) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ul>
                            ) : (
                              line.optionSummary.length > 0 && (
                                // Un choix passe à la ligne d'un bloc (« Coca- / Cola »
                                // se lisait mal), et ne se coupe que s'il est plus
                                // large que la colonne à lui seul (320 px).
                                <p className="mt-0.5 text-xs text-muted">
                                  {line.optionSummary.map((option, i) => (
                                    // Clé par position : un tacos « Poulet + Poulet » répète le libellé.
                                    <Fragment key={i}>
                                      {/* Le point part avec le choix qui le
                                          précède : une ligne ne commence
                                          jamais par « · ». */}
                                      <span className="inline-block max-w-full">
                                        {option}
                                        {i < line.optionSummary.length - 1 && "\u00a0·"}
                                      </span>{" "}
                                    </Fragment>
                                  ))}
                                </p>
                              )
                            )}
                          </div>
                          <div className="shrink-0 self-center">
                            <div className="inline-flex items-center gap-1 rounded-full border border-hairline px-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (line.quantity === 1) {
                                    // La ligne et ce bouton vont disparaître :
                                    // le focus ne doit pas tomber hors de la
                                    // feuille. Panier vidé : elle se referme,
                                    // sinon le prochain ajout la rouvrait seul.
                                    if (cart.count === 1) setOpen(false);
                                    else closeRef.current?.focus();
                                  }
                                  cart.setQuantity(line.key, line.quantity - 1);
                                }}
                                className="flex size-11 items-center justify-center text-lg text-muted"
                                aria-label={`${line.quantity === 1 ? "Retirer" : "Diminuer la quantité"}\u00a0: ${lineLabel(line)}`}
                              >
                                {line.quantity === 1 ? <BinIcon /> : "−"}
                              </button>
                              <span className="min-w-5 text-center text-sm font-semibold">
                                <span className="sr-only">Quantité&nbsp;: </span>
                                {line.quantity}
                              </span>
                              {/* Au plafond (stock, points), le bouton reste focalisable
                                  (aria-disabled) : désactivé, il lâchait le focus
                                  clavier sur <body> au moment même de l'appui. */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (!canIncrease(line)) return;
                                  cart.setQuantity(line.key, line.quantity + 1);
                                }}
                                aria-disabled={!canIncrease(line) || undefined}
                                className="flex size-11 items-center justify-center text-lg text-muted aria-disabled:opacity-40"
                                aria-label={`Augmenter la quantité\u00a0: ${lineLabel(line)}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {/* Le règlement défile avec la commande : épinglé, il
                        prenait plus de la moitié d'un petit écran. */}
                    {cart.onlinePayment && cart.total > 0 && (
                      <section className="cart-payment mt-6 flex flex-col gap-3 rounded-2xl border border-hairline p-4">
                        <h4 className="text-sm font-semibold">Règlement</h4>
                        <div className="flex gap-2">
                          {(
                            [
                              ["carte", "Payer en ligne"],
                              ["comptoir", "Payer au comptoir"],
                            ] as const
                          ).map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                setPayment(value);
                                clearRefusal();
                              }}
                              aria-pressed={payment === value}
                              className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                                payment === value
                                  ? "border-ember-2/60 bg-surface-raised text-foreground"
                                  : "border-hairline text-muted"
                              }`}
                            >
                              {/* Le choix se lit aussi à sa pastille, pas qu'au filet. */}
                              <span
                                aria-hidden
                                className={`size-2.5 shrink-0 rounded-full ${
                                  payment === value
                                    ? "ember-gradient"
                                    : "border border-current opacity-50"
                                }`}
                              />
                              {label}
                            </button>
                          ))}
                        </div>
                      {payment === "carte" && (
                        <div className="flex flex-col gap-2.5">
                          <p className="text-xs font-medium text-muted">
                            Un pourboire pour l&rsquo;équipe&nbsp;?
                          </p>
                          <div className="flex gap-2">
                            {TIP_PERCENTS.map((percent) => (
                              <button
                                key={percent}
                                type="button"
                                onClick={() => {
                                  setTipChoice(
                                    tipChoice === percent ? null : percent
                                  );
                                  clearRefusal();
                                }}
                                aria-pressed={tipChoice === percent}
                                className={`min-h-11 flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
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
                              onClick={() => {
                                const opening = tipChoice !== "autre";
                                setTipChoice(opening ? "autre" : null);
                                clearRefusal();
                                // Le champ prend le focus quand on le demande,
                                // pas à chaque retour sur « Payer en ligne ».
                                if (opening) {
                                  requestAnimationFrame(() =>
                                    document
                                      .querySelector<HTMLInputElement>("[data-tip-input]")
                                      ?.focus()
                                  );
                                }
                              }}
                              aria-pressed={tipChoice === "autre"}
                              className={`min-h-11 flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
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
                              onChange={(event) => {
                                setCustomTip(event.target.value);
                                clearRefusal();
                                // La ligne sous le champ (erreur ou montant retenu)
                                // naît au bas de ce qui défile, souvent sous le pied
                                // collé : on l'amène sous les yeux (le pied est
                                // compté dans le scroll-padding de la feuille).
                                requestAnimationFrame(() =>
                                  document
                                    .querySelector("[data-tip-note]")
                                    ?.scrollIntoView({ block: "nearest" })
                                );
                              }}
                              placeholder="Montant en €"
                              aria-label="Montant du pourboire en euros"
                              data-tip-input
                              aria-invalid={tipProblem !== null || undefined}
                              aria-describedby={tipProblem ? tipErrorId : undefined}
                              // L'anneau de focus ne passe pas sous le pied collé.
                              className="scroll-mb-4 rounded-xl border border-hairline bg-background px-3 py-2.5 text-base outline-none transition-colors focus:border-ember-2/50"
                            />
                          )}
                          {tipProblem && (
                            <p id={tipErrorId} data-tip-note className="scroll-mb-4 text-xs text-ember-3">
                              {tipProblem}
                            </p>
                          )}
                          {tipAmount > 0 && (
                            <p data-tip-note className="scroll-mb-4 text-xs text-muted">
                              Pourboire&nbsp;: {formatPrice(tipAmount)}
                              {" — "}payé avec la commande, reversé au service.
                            </p>
                          )}
                        </div>
                      )}
                      </section>
                    )}
                    {/* La fidélité après le règlement : l'un est une décision à
                        prendre, l'autre une option. */}
                    {cart.loyalty && (
                      <LoyaltySection
                        program={cart.loyalty}
                        contact={contact}
                        onContactChange={(value) => {
                          setContact(value);
                          clearRefusal();
                        }}
                        balance={balance}
                        onBalance={setBalance}
                      />
                    )}
                  </div>

                  <div ref={footRef} className="cart-foot sticky bottom-0 border-t border-hairline bg-surface p-5">
                    {/* « Retour » à portée du pouce (la croix est tout en haut),
                        sur la ligne du total : le pied collé tient en deux
                        rangées. Le total est ce que le client réglera,
                        pourboire compris quand il en laisse un en ligne. */}
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={dismiss}
                        className="-ml-3 min-h-11 rounded-full px-3 text-sm font-semibold text-muted transition-colors hover:text-foreground"
                      >
                        <span aria-hidden>← </span>Retour<span className="cart-back-long"> à la carte</span>
                      </button>
                      <span className="flex items-baseline gap-3 text-right">
                        <span className="text-sm text-muted">Total</span>
                        <span>
                          <span className="cart-total font-display text-xl font-semibold">
                            {formatPrice(cart.total + tipAmount)}
                          </span>
                          {tipAmount > 0 && (
                            <span className="block text-xs text-muted">
                              dont pourboire {formatPrice(tipAmount)}
                            </span>
                          )}
                        </span>
                      </span>
                    </div>
                    {state === "error" && (
                      <p className="mb-3 text-sm text-ember-3">{error}</p>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        if (event.detail <= 1) void submit();
                      }}
                      disabled={
                        state === "sending" ||
                        cart.count === 0 ||
                        (cart.preview)
                      }
                      className={`w-full rounded-full px-6 py-3 text-sm font-semibold ${
                        // L'aperçu dit pourquoi rien ne part : un texte à lire,
                        // pas un bouton estompé.
                        cart.preview
                          ? "border border-hairline bg-surface-raised text-foreground"
                          : "ember-gradient text-background disabled:opacity-60"
                      }`}
                    >
                      {cart.preview
                        ? "Aperçu\u00a0: envoi désactivé"
                        : state === "sending"
                          ? "Envoi…"
                          : payment === "carte"
                            ? `Commander et payer · ${formatPrice(cart.total + tipAmount)}`
                            : "Envoyer la commande"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </Sheet>
      )}
    </>
  );
}

"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { LoyaltySection } from "@/components/menu/loyalty-section";
import { PaymentReturn } from "@/components/menu/payment-return";
import { Sheet, useSheetHistoryReset } from "@/components/menu/sheet";
import { SquarePayment } from "@/components/menu/square-payment";
import { SumUpPayment } from "@/components/menu/sumup-payment";
import { useCart } from "@/lib/menu/cart";
import { formatPrice } from "@/lib/menu-data";
import { fallBackToCounter, type CardPhase } from "@/lib/menu/online-payment";
import { CARD_NOTICES, useTickets, type TicketLine } from "@/lib/menu/tickets";
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
  const tickets = useTickets();
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
    // Vidé par l'envoi d'une commande fast food : c'est son ticket qui
    // s'annonce, avec le numéro.
    setAnnouncement(
      cart.count === 0
        ? tickets?.shownId
          ? ""
          : "Panier vide."
        : `${added ? "Ajouté" : "Retiré"}. ${cart.count} article${
            cart.count > 1 ? "s" : ""
          } au panier, ${formatPrice(cart.total)}.`
    );
  }
  const closeRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  // Le pied collé couvre le bas de la feuille : le défilement au clavier
  // garde la ligne qui a le focus au-dessus de lui.
  useEffect(() => {
    const foot = footRef.current;
    const panel = foot?.closest<HTMLElement>('[role="dialog"]');
    if (!foot || !panel) return;
    const content = contentRef.current;
    const sync = () => {
      const h = foot.offsetHeight;
      panel.style.scrollPaddingBottom = `${h}px`;
      if (content) content.style.paddingBottom = `${h}px`;
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(foot);
    return () => observer.disconnect();
  });
  useSheetHistoryReset();
  // Fast food : la commande partie, la feuille du panier cède la place au
  // ticket — même fond, le ticket la remplace. C'est lui qu'on suit désormais.
  const handOff = (orderId: string, notices: string[] = []) => {
    setOpen(false);
    setState("idle");
    setSumupPayment(null);
    setSquarePayment(null);
    tickets?.show(orderId, { notices });
  };
  // Commande partie chez Stripe, pour le retour arrière.
  const leaving = useRef<string | null>(null);
  // Revenue de Stripe par « Retour » sans payer (restaurant) : la même
  // feuille qu'une annulation chez Stripe.
  const [returned, setReturned] = useState<string | null>(null);
  // Page restituée telle quelle par un retour arrière depuis Stripe : la
  // feuille restait figée sur « Envoi… », le panier plein — de quoi
  // commander deux fois. La commande a changé de mains : en fast food, son
  // ticket prend la suite ; au restaurant, l'écran d'un paiement annulé.
  const onPageShow = useRef<(event: PageTransitionEvent) => void>(() => {});
  useEffect(() => {
    onPageShow.current = (event) => {
      if (!event.persisted) return;
      setState((current) => (current === "sending" ? "idle" : current));
      const orderId = leaving.current;
      if (!orderId) return;
      leaving.current = null;
      cart.clear();
      if (cart.fastFood) {
        handOff(orderId, [CARD_NOTICES.unfinished]);
      } else {
        setOpen(false);
        setReturned(orderId);
      }
    };
  });
  // Où en est le règlement par carte dans la feuille (Square, SumUp).
  const cardPhase = useRef<CardPhase>("form");
  // Changée, la feuille du panier se remonte (sur la confirmation).
  const [sheetKey, setSheetKey] = useState(0);
  const onCardPhase = (phase: CardPhase) => {
    cardPhase.current = phase;
  };
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => onPageShow.current(event);
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);
  const titleId = useId();
  const hintId = useId();

  // Toujours dans la page tant qu'on peut commander : une zone annoncée n'est
  // lue que si elle existait avant son changement.
  const status = (
    <>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {returned && (
        <PaymentReturn
          key={returned}
          outcome="annule"
          orderId={returned}
          tableNumber={cart.tableNumber}
        />
      )}
    </>
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
  // centime, ou montant libre. La borne finale (≤ total) est côté serveur.
  // Au comptoir d'un fast food, pas de service à table : pas de pourboire.
  const tipAmount =
    payment !== "carte" || tipChoice === null || cart.fastFood
      ? 0
      : tipChoice === "autre"
        ? Math.max(
            0,
            Math.round(Number(customTip.replace(",", ".")) * 100) / 100 || 0
          )
        : Math.round(cart.total * tipChoice) / 100;

  // Le règlement par carte n'aura pas lieu : l'addition passe au comptoir.
  // Le ticket fast food le sait tout de suite (il ne dit plus « paiement en
  // cours »), sans attendre la relecture.
  const giveUpCard = (orderId: string) => {
    setCardFailed(true);
    void fallBackToCounter(orderId).then(
      (ok) => ok && tickets?.patch(orderId, { paying: false })
    );
  };

  // Les points se gagnent à l'encaissement : déjà fait si la carte est passée.
  const loyaltyNotices = (paid = false) =>
    loyaltyContact
      ? [
          paid
            ? `Vos points de fidélité sont crédités sur ${loyaltyContact}.`
            : `Vos points de fidélité seront crédités sur ${loyaltyContact} à l’encaissement.`,
        ]
      : [];

  const submit = async () => {
    if (!cart.canOrder) return;
    // Aperçu fast food : rien ne part, mais le ticket se montre — c'est ce
    // que le client verra, sur un numéro fictif.
    if (cart.preview) {
      if (!tickets) return;
      // Par nom et par choix, comme order_ticket.
      const lines = new Map<string, TicketLine>();
      for (const line of cart.lines) {
        const key = [line.name, ...line.optionSummary].join("\n");
        const known = lines.get(key);
        lines.set(key, {
          name: line.name,
          quantity: (known?.quantity ?? 0) + line.quantity,
          choices: line.optionSummary,
        });
      }
      const id = crypto.randomUUID();
      tickets.add(id, {
        status: payment === "carte" ? "payee" : "en_attente",
        total: cart.total,
        lines: [...lines.values()],
      });
      cart.clear();
      handOff(id);
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
        // Nul en fast food (la base y refuse une table) : les types générés
        // ne connaissent pas d'argument nul.
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
      setError(rpcError.message);
      return;
    }
    setSentPayment(payment);
    // Le solde affiché ne vaut plus : il se relira à la prochaine commande.
    setBalance(null);
    // Fast food : le numéro est gardé dès maintenant, quel que soit le
    // règlement — un client qui quitte la page de paiement le retrouve.
    tickets?.add(orderId);
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
          // Rien ne change à l'écran avant de partir : une feuille qui se
          // ferme ici lance un history.back(), et Chrome annule alors la
          // navigation vers Stripe. Le panier gardé est seulement oublié :
          // un retour arrière ne ramène pas de quoi commander deux fois.
          cart.forgetSaved();
          leaving.current = orderId;
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

    cart.clear();
    // Fast food : le ticket, sauf si le règlement se poursuit dans la
    // feuille (SumUp, Square) — il viendra à sa fin.
    const inPage = payment === "carte" && !failed && cart.paymentProvider !== "stripe";
    if (cart.fastFood && !inPage) {
      handOff(orderId, [...(failed ? [CARD_NOTICES.failed] : []), ...loyaltyNotices()]);
    } else {
      setState("sent");
    }
  };

  const close = () => {
    // Fast food : un paiement carte dans la feuille qu'on referme (Échap,
    // retour) ne se rouvrirait pas — le ticket prend la suite. Formulaire
    // encore à remplir : l'addition passe au comptoir, où la salle voit la
    // commande. Débit en cours : il aboutira ou non, le ticket le dira — la
    // passer au comptoir maintenant l'y ferait encaisser une seconde fois.
    const pending = sumupPayment?.orderId ?? squarePayment?.orderId;
    if (cart.fastFood && state === "sent" && pending) {
      const abandoned = cardPhase.current === "form";
      if (abandoned) giveUpCard(pending);
      handOff(pending, [
        ...(abandoned ? [CARD_NOTICES.declined] : []),
        ...loyaltyNotices(cardPhase.current === "paid"),
      ]);
      return;
    }
    // Au restaurant, même formulaire refermé sans payer : l'addition passe au
    // comptoir — sinon la commande restait invisible en salle, sans fin — et
    // la feuille revient sur la confirmation, qui le dit.
    if (state === "sent" && pending && cardPhase.current === "form") {
      giveUpCard(pending);
      setSumupPayment(null);
      setSquarePayment(null);
      setSheetKey((key) => key + 1);
      return;
    }
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
            if (event.detail <= 1) setOpen(true);
          }}
          aria-label={`Voir la commande\u00a0: ${cart.count} article${cart.count > 1 ? "s" : ""}, ${formatPrice(cart.total)}`}
          className={`cart-bar ${bump.n === 0 ? "" : bump.n % 2 ? "cart-bump-a" : "cart-bump-b"} ember-gradient pointer-events-auto flex w-full max-w-md items-center justify-between gap-4 rounded-full px-6 py-3.5 text-background shadow-2xl shadow-black/40`}
        >
          <span className="flex items-center gap-2.5 text-sm font-semibold">
            {/* Libellé effacé (à côté des tickets), le sac dit « panier » :
                réduite au compte, la barre passait pour un numéro de plus. */}
            <svg
              viewBox="0 0 24 24"
              className="cart-bar-icon hidden size-5 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 016 0v2" />
            </svg>
            <span className="cart-bar-count flex size-6 items-center justify-center rounded-full bg-background text-xs font-bold text-foreground">
              {cart.count}
            </span>
            <span className="cart-bar-label whitespace-nowrap">Voir la commande</span>
          </span>
          <span className="cart-bar-total text-sm font-bold">
            {formatPrice(cart.total)}
          </span>
        </button>
      </div>

      {open && (
        <Sheet
          key={sheetKey}
          onClosed={close}
          backdropCloses
          labelledBy={state === "sent" ? undefined : titleId}
          label={state === "sent" ? "Commande envoyée" : undefined}
        >
          {(dismiss) => (
            <>
              {state === "sent" && sumupPayment ? (
                <SumUpPayment
                  orderId={sumupPayment.orderId}
                  initialCheckoutId={sumupPayment.checkoutId}
                  onPhase={onCardPhase}
                  onDone={(paid) => {
                    setSumupPayment(null);
                    if (!paid) giveUpCard(sumupPayment.orderId);
                    if (cart.fastFood) {
                      handOff(
                        sumupPayment.orderId,
                        paid ? loyaltyNotices(true) : [CARD_NOTICES.declined, ...loyaltyNotices()]
                      );
                    }
                  }}
                />
              ) : state === "sent" && squarePayment ? (
                <SquarePayment
                  orderId={squarePayment.orderId}
                  locationId={squarePayment.locationId}
                  total={squarePayment.total}
                  tipAmount={squarePayment.tipAmount}
                  onPhase={onCardPhase}
                  onDone={(paid) => {
                    setSquarePayment(null);
                    if (!paid) giveUpCard(squarePayment.orderId);
                    if (cart.fastFood) {
                      handOff(
                        squarePayment.orderId,
                        paid ? loyaltyNotices(true) : [CARD_NOTICES.declined, ...loyaltyNotices()]
                      );
                    }
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
                      Le paiement par carte n&rsquo;a pas abouti&nbsp;: vous
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
                      <span className="mt-0.5 block font-sans text-xs font-normal normal-case tracking-normal text-muted">
                        {cart.fastFood
                          ? "À récupérer au comptoir"
                          : `Table ${cart.tableNumber}`}
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

                  <div ref={contentRef} className="shrink-0 p-5">
                    <ul className="flex flex-col gap-4">
                      {cart.lines.map((line) => (
                        <li key={line.key} className="flex gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="cart-line-name font-display text-sm font-medium">
                              {line.name}
                            </p>
                            {line.quantity > 1 && (
                              <p className="mt-0.5 text-xs text-muted">
                                {line.quantity} × {formatPrice(line.unitPrice)}
                              </p>
                            )}
                            {line.optionSummary.length > 0 && (
                              // Un choix ne se coupe pas en fin de ligne (« Coca- / Cola »).
                              <p className="mt-0.5 text-xs text-muted">
                                {line.optionSummary.map((option, i) => (
                                  // Clé par position : un tacos « Poulet + Poulet » répète le libellé.
                                  <Fragment key={i}>
                                    {i > 0 && " · "}
                                    <span className="whitespace-nowrap">{option}</span>
                                  </Fragment>
                                ))}
                              </p>
                            )}
                          </div>
                          {/* Prix et quantité dans la colonne de droite : sur
                              leur propre rangée, les boutons doublaient la
                              hauteur de chaque ligne. */}
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {line.reward ? (
                              <span className="cart-line-price text-right font-display text-sm font-semibold text-ember-1">
                                Offert
                                <span className="block font-sans text-xs font-medium normal-case text-muted">
                                  {line.reward.points * line.quantity}&nbsp;pts
                                  {line.unitPrice > 0 &&
                                    ` + ${formatPrice(line.unitPrice * line.quantity)}`}
                                </span>
                              </span>
                            ) : (
                              <span className="cart-line-price font-display text-sm font-semibold text-ember-1">
                                {formatPrice(line.unitPrice * line.quantity)}
                              </span>
                            )}
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
                                className="flex size-11 items-center justify-center text-lg text-muted disabled:opacity-40"
                                aria-label={`Augmenter la quantité\u00a0: ${lineLabel(line)}`}
                              >
                                +
                              </button>
                            </div>
                          </div>
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

                  <div ref={footRef} className="cart-foot sticky bottom-0 border-t border-hairline bg-surface p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm text-muted">Total</span>
                      <span className="cart-total font-display text-xl font-semibold">
                        {formatPrice(cart.total)}
                      </span>
                    </div>
                    {cart.onlinePayment && cart.total > 0 && (
                      <div
                        role="radiogroup"
                        aria-label="Règlement"
                        aria-describedby={cart.fastFood ? hintId : undefined}
                        className="mb-4 flex gap-2"
                      >
                        {(
                          [
                            ["carte", "Payer en ligne"],
                            ["comptoir", "Payer au\u00a0comptoir"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={payment === value}
                            onClick={() => setPayment(value)}
                            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors ${
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
                    )}
                    {/* Fast food : ce que le choix change pour la suite. Les
                        deux phrases occupent la même case, l'autre cachée :
                        d'un choix à l'autre, la feuille ne saute pas. */}
                    {cart.fastFood && cart.onlinePayment && cart.total > 0 && (
                      <p id={hintId} className="mb-4 grid text-xs leading-relaxed text-muted">
                        {(
                          [
                            ["carte", "Payée maintenant, elle part tout de suite en cuisine."],
                            ["comptoir", "Elle part en cuisine une fois réglée au\u00a0comptoir."],
                          ] as const
                        ).map(([choice, text]) => (
                          <span
                            key={choice}
                            aria-hidden={choice !== payment || undefined}
                            className={`[grid-area:1/1] ${choice === payment ? "" : "invisible"}`}
                          >
                            {text}
                          </span>
                        ))}
                      </p>
                    )}
                    {payment === "carte" && !cart.fastFood && (
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
                      onClick={(event) => {
                        if (event.detail <= 1) void submit();
                      }}
                      disabled={
                        state === "sending" ||
                        cart.count === 0 ||
                        (cart.preview && !cart.fastFood)
                      }
                      className={`w-full rounded-full px-6 py-3 text-sm font-semibold ${
                        // L'aperçu dit pourquoi rien ne part : un texte à lire,
                        // pas un bouton estompé.
                        cart.preview && !cart.fastFood
                          ? "border border-hairline bg-surface-raised text-foreground"
                          : "ember-gradient text-background disabled:opacity-60"
                      }`}
                    >
                      {cart.preview
                        ? cart.fastFood
                          ? "Aperçu\u00a0: voir le ticket"
                          : "Aperçu\u00a0: envoi désactivé"
                        : state === "sending"
                          ? "Envoi…"
                          : !cart.fastFood
                            ? "Envoyer la commande"
                            : payment === "carte"
                              ? `Commander et payer · ${formatPrice(cart.total)}`
                              : "Commander · payer au comptoir"}
                    </button>
                    {/* Refermer à portée du pouce : la croix est tout en haut.
                        Écran court : « Retour » seul, sur la ligne du total. */}
                    <button
                      type="button"
                      onClick={dismiss}
                      className="cart-back mt-2 min-h-11 w-full rounded-full text-sm font-semibold text-muted transition-colors hover:text-foreground"
                    >
                      Retour<span className="cart-back-long"> à la carte</span>
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

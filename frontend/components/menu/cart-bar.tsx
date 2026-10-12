"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import {
  collectProblem,
  PickupFields,
  type CollectDetails,
} from "@/components/collect/pickup-fields";
import { keepHyphenated } from "@/components/menu/keep-hyphenated";
import { LoyaltySection } from "@/components/menu/loyalty-section";
import { Sheet, useSheetHistoryReset } from "@/components/menu/sheet";
import { SquarePayment } from "@/components/menu/square-payment";
import { preloadStripe, StripePayment } from "@/components/menu/stripe-payment";
import { SumUpPayment } from "@/components/menu/sumup-payment";
import { isOpenAt } from "@/lib/collect/hours";
import { collectHref } from "@/lib/collect/shared";
import { useCart, type CartLine } from "@/lib/menu/cart";
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

/**
 * Un montant saisi à la française, en centimes : « 5 », « 2,50 », « 1 000 »
 * (espaces de milliers), « 3 € » ; le point vaut la virgule (claviers réglés
 * en anglais). Tout le reste — « 1e3 », « -5 », « abc », trois décimales — :
 * null.
 */
function parseCents(text: string): number | null {
  const match = /^(\d{1,3}(?:\s\d{3})+|\d+)(?:[,.](\d{0,2}))?(?:\s?€)?$/.exec(text);
  return match
    ? Number(match[1].replace(/\s/g, "")) * 100 + Number((match[2] ?? "").padEnd(2, "0"))
    : null;
}

/** Une ligne du panier, nommée avec ses choix : deux Menu Solo se distinguent.
    Les étapes d'une formule se séparent d'un point-virgule : leurs choix ont
    déjà leurs virgules. */
const lineLabel = (line: Pick<CartLine, "name" | "optionSummary" | "formule">) =>
  line.optionSummary.length > 0
    ? `${line.name} (${line.optionSummary.join(line.formule ? " ; " : ", ")})`
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
  // Le champ du montant libre prend le focus quand on choisit « Autre », pas
  // à chaque montage : autoFocus le reprenait en revenant sur « Payer en
  // ligne » et, à la réouverture du panier, passait pour son déclencheur.
  const focusCustomTip = useRef(false);
  const [error, setError] = useState<string | null>(null);
  // Click & collect : fermé à l'ouverture de la feuille, pas de « dès que
  // possible » — le client choisit son heure.
  const [details, setDetails] = useState<CollectDetails>(() => ({
    name: "",
    phone: "",
    pickupAt: cart.collect && !isOpenAt(cart.collect.hours, new Date()) ? "" : null,
  }));
  // Paiement carte choisi mais impossible à démarrer : la commande reste
  // valable, il faut le dire au client (il paiera au comptoir).
  const [cardFailed, setCardFailed] = useState(false);
  // Règlement SumUp en cours : le widget s'affiche dans la feuille à la place
  // de l'écran « commande envoyée ».
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
  // Règlement Stripe : même place, le Payment Intent se prépare au montage
  // de la feuille de paiement.
  const [stripePayment, setStripePayment] = useState<{
    orderId: string;
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
    // Vidé par l'envoi d'une commande : à table, c'est l'envoi qui
    // s'annonce ; en fast food, son ticket, avec le numéro ; en click &
    // collect, la page de suivi. Un règlement dans la page encore ouvert : la
    // commande ne part qu'une fois payée, son formulaire parle pour elle.
    setAnnouncement(
      cart.count === 0
        ? state === "sent"
          ? cart.tableNumber === null || stripePayment || squarePayment || sumupPayment
            ? ""
            : `Commande envoyée, table ${cart.tableNumber}.${
                cart.preview ? " Aperçu\u00a0: rien n’a été envoyé ni payé." : ""
              }`
          : tickets?.shownId
            ? ""
            : "Panier vide."
        : `${added ? "Ajouté" : "Retiré"}. ${cart.count} article${
            cart.count > 1 ? "s" : ""
          } au panier, ${formatPrice(cart.total)}.`
    );
  }
  const closeRef = useRef<HTMLButtonElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  // L'en-tête et le pied collés couvrent le haut et le bas de la feuille : le
  // défilement au clavier garde la ligne qui a le focus entre eux
  // (--cart-head, --cart-foot, globals.css). Une marge sur les lignes, pas
  // sur la feuille : les boutons du pied eux-mêmes, au focus, faisaient
  // défiler la commande hors de vue.
  useEffect(() => {
    const foot = footRef.current;
    const panel = foot?.closest<HTMLElement>('[role="dialog"]');
    const head = panel?.querySelector<HTMLElement>(".cart-head");
    if (!foot || !panel) return;
    const sync = () => {
      // Écran bas (paysage, zoom, pourboire libre ouvert) : collés, l'en-tête
      // et le pied ne laissaient plus voir une seule ligne de la commande. Le
      // pied se décolle alors, et la feuille défile en entier.
      const line = panel.querySelector<HTMLElement>(".cart-content li");
      const cramped =
        panel.clientHeight - (head?.offsetHeight ?? 0) - foot.offsetHeight <
        (line?.offsetHeight ?? 0);
      foot.style.position = cramped ? "static" : "";
      panel.style.setProperty("--cart-foot", cramped ? "0px" : `${foot.offsetHeight}px`);
      if (head) panel.style.setProperty("--cart-head", `${head.offsetHeight}px`);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(panel);
    observer.observe(foot);
    if (head) observer.observe(head);
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
    setStripePayment(null);
    tickets?.show(orderId, { notices });
  };
  // Où en est le règlement par carte dans la feuille.
  const cardPhase = useRef<CardPhase>("form");
  // Changée, la feuille du panier se remonte (sur la confirmation).
  const [sheetKey, setSheetKey] = useState(0);
  const onCardPhase = (phase: CardPhase) => {
    cardPhase.current = phase;
  };
  const titleId = useId();
  const hintId = useId();

  // Toujours dans la page tant qu'on peut commander : une zone annoncée n'est
  // lue que si elle existait avant son changement.
  const status = (
    <p role="status" className="sr-only">
      {announcement}
    </p>
  );

  // Sans paiement en ligne, ou tout offert en points (rien à régler par
  // carte, la salle valide l'addition à zéro : place_order la laisse
  // d'ailleurs au comptoir), l'addition se règle au comptoir.
  const payment: PaymentChoice = cart.collect
    ? "carte"
    : cart.onlinePayment && cart.total > 0
      ? paymentChoice
      : "comptoir";
  // Stripe.js ne se charge qu'à l'approche du règlement : panier ouvert sur
  // « Payer en ligne », d'une vraie carte. Un échec ici se rejoue au paiement.
  const stripeAhead =
    open && !cart.preview && payment === "carte" && cart.paymentProvider === "stripe";
  useEffect(() => {
    if (stripeAhead) preloadStripe().catch(() => {});
  }, [stripeAhead]);

  // Rien à afficher tant que la commande n'est pas possible ou le panier vide.
  if (!cart.canOrder) return null;
  if (cart.count === 0 && state !== "sent") return status;

  const loyaltyContact = cart.loyalty ? contact.trim() : "";
  // Un article offert ne part pas seul : place_order le refuserait.
  const rewardsOnly = cart.lines.length > 0 && cart.lines.every((line) => line.reward);

  // Pourboire du règlement par carte, en centimes : pourcentage du total
  // arrondi au centime, ou montant libre — au plus le total, la borne du
  // serveur. Au comptoir d'un fast food, pas de service à table : pas de
  // pourboire.
  const tipOffered = payment === "carte" && !cart.fastFood && !cart.collect;
  const totalCents = Math.round(cart.total * 100);
  const typedTip = tipOffered && tipChoice === "autre" ? customTip.trim() : "";
  const typedCents = typedTip ? parseCents(typedTip) : null;
  const tipError = !typedTip
    ? null
    : typedCents === null
      ? "Montant non reconnu\u00a0: écrivez-le comme 2,50."
      : typedCents > totalCents
        ? `Au plus ${formatPrice(cart.total)}\u00a0: le montant de la commande.`
        : null;
  const tipCents =
    !tipOffered || tipChoice === null || tipError
      ? 0
      : tipChoice === "autre"
        ? (typedCents ?? 0)
        : Math.round((totalCents * tipChoice) / 100);
  const tipAmount = tipCents / 100;

  // Partie, une commande ne lègue ni son règlement ni son pourboire à la
  // suivante.
  const resetChoices = () => {
    setPayment("carte");
    setTipChoice(null);
    setCustomTip("");
  };

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
    // Aperçu : rien ne part, mais la suite se montre — à table, la
    // confirmation ; en fast food, le ticket, sur un numéro fictif.
    if (cart.preview) {
      if (!cart.fastFood) {
        setSentPayment(payment);
        cart.clear();
        resetChoices();
        setState("sent");
        return;
      }
      if (!tickets) return;
      // Par nom et par choix, comme order_ticket.
      const lines = new Map<string, TicketLine>();
      for (const line of cart.lines) {
        const key = [line.name, ...line.optionSummary].join("\n");
        const known = lines.get(key);
        lines.set(key, {
          name: line.name,
          quantity: (known?.quantity ?? 0) + line.quantity,
          // Sans les suppléments, « (+0,50 €) » ou rangés dans les parenthèses du
          // nom (« (épicé, +1,00 €) »), d'un plat comme des choix d'une formule :
          // order_ticket ne rend que les noms.
          choices: line.optionSummary.map((choice) =>
            choice.replace(/ \(\+[^)]*\)/g, "").replace(/,\u00a0\+[^)]*\)/g, ")")
          ),
          // L'aperçu montre une formule étape par étape, comme le panier ; le
          // vrai ticket (order_ticket) en aligne les choix sur une ligne.
          formule: Boolean(line.formule) || undefined,
        });
      }
      const id = crypto.randomUUID();
      tickets.add(id, {
        status: payment === "carte" ? "payee" : "en_attente",
        total: cart.total,
        lines: [...lines.values()],
      });
      cart.clear();
      resetChoices();
      handOff(id);
      return;
    }
    const pickupProblem = cart.collect ? collectProblem(details, cart.collect.hours) : null;
    if (pickupProblem) {
      setState("error");
      setError(pickupProblem);
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
        ...(cart.collect && {
          p_collect: {
            name: details.name.trim(),
            phone: details.phone.trim(),
            pickup_at: details.pickupAt ?? "",
          },
        }),
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
      // Click & collect : pas de comptoir où se rabattre. La commande non
      // payée expire seule ; le panier reste pour réessayer.
      if (cart.collect) {
        setState("error");
        setError("Le paiement n’a pas pu démarrer. Réessayez dans un instant.");
        return;
      }
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
      // Le Payment Intent se prépare au montage de la feuille de paiement,
      // qui fera partir la commande en cuisine.
      setStripePayment({ orderId, total: cart.total, tipAmount });
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

    if (cart.collect) {
      // Le règlement se fait dans la feuille (ou n'a pas pu démarrer, erreur
      // affichée) : le panier ne se vide qu'au paiement.
      if (!failed) setState("sent");
      return;
    }
    cart.clear();
    resetChoices();
    // Fast food : le ticket, sauf si le règlement se poursuit dans la
    // feuille — il viendra à sa fin.
    const inPage = payment === "carte" && !failed;
    if (cart.fastFood && !inPage) {
      handOff(orderId, [...(failed ? [CARD_NOTICES.failed] : []), ...loyaltyNotices()]);
    } else {
      setState("sent");
    }
  };

  // Fin d'un règlement dans la feuille (Square, Stripe). Click & collect :
  // payé, la page de suivi ; sinon la commande n'est pas passée, le panier
  // reste. À table : non payé, l'addition passe au comptoir ; en fast food,
  // le ticket prend la suite.
  const finishInPage = (orderId: string, paid: boolean) => {
    setSquarePayment(null);
    setStripePayment(null);
    if (cart.collect) {
      if (paid) {
        cart.clear();
        window.location.assign(
          `${collectHref(cart.slug)}/confirmation?commande=${orderId}`
        );
      } else {
        setState("error");
        setError("Le paiement n’a pas abouti : votre commande n’est pas passée.");
      }
      return;
    }
    if (!paid) giveUpCard(orderId);
    if (cart.fastFood) {
      handOff(
        orderId,
        paid ? loyaltyNotices(true) : [CARD_NOTICES.declined, ...loyaltyNotices()]
      );
    }
  };

  const close = () => {
    // Fast food : un paiement carte dans la feuille qu'on referme (Échap,
    // retour) ne se rouvrirait pas — le ticket prend la suite. Formulaire
    // encore à remplir : l'addition passe au comptoir, où la salle voit la
    // commande. Débit en cours : il aboutira ou non, le ticket le dira — la
    // passer au comptoir maintenant l'y ferait encaisser une seconde fois.
    const pending =
      sumupPayment?.orderId ?? squarePayment?.orderId ?? stripePayment?.orderId;
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
      setStripePayment(null);
      setSheetKey((key) => key + 1);
      return;
    }
    setOpen(false);
    if (state === "sent") {
      setState("idle");
      setSumupPayment(null);
      setSquarePayment(null);
      setStripePayment(null);
    }
  };

  return (
    <>
      {status}
      {/* Après l'envoi, le panier est vide : pas de barre « 0 » sous la confirmation. */}
      {cart.count > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4">
          <button
            type="button"
            onClick={(event) => {
              // Second toucher d'un double-tap sur « Ajouter » : pas le panier.
              if (event.detail > 1) return;
              // Safari ne donne pas le focus au bouton touché (voir AddToOrder).
              event.currentTarget.focus({ preventScroll: true });
              setOpen(true);
            }}
            aria-haspopup="dialog"
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
      )}

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
                  onDone={(paid) => finishInPage(squarePayment.orderId, paid)}
                />
              ) : state === "sent" && stripePayment ? (
                <StripePayment
                  orderId={stripePayment.orderId}
                  total={stripePayment.total}
                  tipAmount={stripePayment.tipAmount}
                  onPhase={onCardPhase}
                  onDone={(paid) => finishInPage(stripePayment.orderId, paid)}
                />
              ) : state === "sent" ? (
                <div className="flex flex-col items-center gap-4 p-10 text-center">
                  <span className="ember-text font-display text-5xl">✓</span>
                  <h3 className="cart-sent-title font-display text-2xl font-medium">
                    Commande envoyée&nbsp;!
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
                  {/* La route d'aperçu est publique et saute le paiement : la
                      mention dit que rien n'est parti et où le paiement s'ouvre,
                      sans quoi « Paiement reçu » se lisait au-dessus de « rien payé ». */}
                  {cart.preview && (
                    <p className="rounded-2xl border border-hairline px-4 py-1.5 text-xs font-medium text-muted">
                      Aperçu&nbsp;:{" "}
                      {sentPayment === "carte"
                        ? "à table, le paiement par carte s’ouvre avant cet écran. Ici, rien n’a été envoyé ni payé."
                        : "rien n’a été envoyé ni payé."}
                    </p>
                  )}
                  {/* Le bouton d'envoi, qui portait le focus, a disparu : il
                      passe ici, l'envoi s'annonce dans la zone d'état. */}
                  <button
                    type="button"
                    onClick={dismiss}
                    autoFocus
                    className="ember-gradient mt-2 min-h-11 rounded-full px-6 py-2.5 text-sm font-semibold text-background"
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
                        {cart.collect
                          ? "À emporter"
                          : cart.fastFood
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

                  <div className="cart-content shrink-0 p-5">
                    <ul className="flex flex-col gap-4">
                      {cart.lines.map((line) => (
                        <li key={line.key} className="flex gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="cart-line-name font-display text-sm font-medium">
                              {/* Le format en petit, comme sur la fiche : « x4 », « pour 2 ». */}
                              {line.detail ? (
                                <>
                                  {keepHyphenated(`${line.name.slice(0, -line.detail.length - 1)} `)}
                                  <span className="whitespace-nowrap text-xs font-normal text-muted">
                                    {line.detail}
                                  </span>
                                </>
                              ) : (
                                keepHyphenated(line.name)
                              )}
                            </p>
                            {line.quantity > 1 && (
                              <p className="mt-0.5 text-xs text-muted">
                                {line.quantity} × {formatPrice(line.unitPrice)}
                              </p>
                            )}
                            {line.optionSummary.length > 0 && (
                              // Chaque choix d'un bloc, comme sur le ticket : il passe entier à
                              // la ligne, et ne se coupe entre ses mots que plus long qu'elle
                              // (jamais sur un trait d'union, « Coca- / Cola », ni avant son
                              // supplément) ; « · » est dans le bloc du précédent, il ne commence
                              // jamais une ligne. Insécable en entier, un long choix passait sous
                              // les boutons de quantité.
                              <p className="mt-0.5 text-xs text-muted">
                                {line.optionSummary.map((option, i) => (
                                  // Clé par position : un tacos « Poulet + Poulet » répète le libellé.
                                  // Une formule, une étape par ligne : à la suite, ses étapes et
                                  // leurs choix faisaient un bloc de sept lignes.
                                  <Fragment key={i}>
                                    <span className={line.formule ? "block" : "inline-block max-w-full"}>
                                      {keepHyphenated(option.replaceAll(" (+", "\u00a0(+"))}
                                      {!line.formule && i < line.optionSummary.length - 1 && "\u00a0·"}
                                    </span>{" "}
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
                    {cart.collect && (
                      <PickupFields
                        slug={cart.slug}
                        hours={cart.collect.hours}
                        slotMinutes={cart.collect.slotMinutes}
                        value={details}
                        onChange={(next) => {
                          setDetails(next);
                          // Le message d'un envoi refusé s'efface dès qu'on
                          // corrige ce qui le causait.
                          if (state === "error") {
                            setState("idle");
                            setError(null);
                          }
                        }}
                      />
                    )}
                  </div>

                  <div ref={footRef} className="cart-foot sticky bottom-0 border-t border-hairline bg-surface p-5">
                    {/* Avec le pourboire : ce que le règlement débitera (les
                        routes de paiement l'ajoutent aux lignes). */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted">
                          {tipCents > 0 ? "Total à régler" : "Total"}
                        </span>
                        <span className="cart-total font-display text-xl font-semibold">
                          {formatPrice((totalCents + tipCents) / 100)}
                        </span>
                      </div>
                      {tipCents > 0 && (
                        <p className="mt-0.5 text-right text-xs text-muted">
                          Dont pourboire {formatPrice(tipAmount)}, reversé au service.
                        </p>
                      )}
                    </div>
                    {cart.onlinePayment && cart.total > 0 && !cart.collect && (
                      <div
                        role="radiogroup"
                        aria-label="Règlement"
                        // La phrase du choix fait seulement : masquées, les deux se
                        // lisaient ensemble.
                        aria-describedby={cart.fastFood ? `${hintId}-${payment}` : undefined}
                        className="mb-4 flex gap-2"
                      >
                        {(
                          [
                            ["carte", "Payer en\u00a0ligne"],
                            ["comptoir", "Payer au\u00a0comptoir"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={payment === value}
                            data-choice={value}
                            // Un groupe de radios : un seul arrêt de tabulation,
                            // les flèches passent d'un choix à l'autre.
                            tabIndex={payment === value ? 0 : -1}
                            onClick={() => setPayment(value)}
                            onKeyDown={(event) => {
                              if (!event.key.startsWith("Arrow")) return;
                              if (event.altKey || event.metaKey || event.ctrlKey) return;
                              event.preventDefault();
                              const other = value === "carte" ? "comptoir" : "carte";
                              setPayment(other);
                              event.currentTarget.parentElement
                                ?.querySelector<HTMLElement>(`[data-choice="${other}"]`)
                                ?.focus();
                            }}
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
                            <span className="text-balance">{label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Fast food : ce que le choix change pour la suite. Les
                        deux phrases occupent la même case, l'autre cachée :
                        d'un choix à l'autre, la feuille ne saute pas. */}
                    {cart.fastFood && cart.onlinePayment && cart.total > 0 && (
                      <p className="cart-hint mb-4 grid text-pretty text-xs leading-relaxed text-muted">
                        {(
                          [
                            ["carte", "Payée maintenant, elle part tout\u00a0de\u00a0suite en\u00a0cuisine."],
                            ["comptoir", "Elle part en\u00a0cuisine une fois réglée au\u00a0comptoir."],
                          ] as const
                        ).map(([choice, text]) => (
                          <span
                            key={choice}
                            id={`${hintId}-${choice}`}
                            aria-hidden={choice !== payment || undefined}
                            className={`[grid-area:1/1] ${choice === payment ? "" : "invisible"}`}
                          >
                            {text}
                          </span>
                        ))}
                      </p>
                    )}
                    {tipOffered && (
                      <div className="mb-4 flex flex-col gap-2.5">
                        <p id={`${hintId}-tip`} className="text-xs font-medium text-muted">
                          Un pourboire pour l&rsquo;équipe&nbsp;?
                        </p>
                        <div
                          role="group"
                          aria-labelledby={`${hintId}-tip`}
                          className="flex gap-2"
                        >
                          {[...TIP_PERCENTS, "autre" as const].map((choice) => (
                            <button
                              key={choice}
                              type="button"
                              aria-pressed={tipChoice === choice}
                              onClick={() => {
                                focusCustomTip.current = choice === "autre" && tipChoice !== "autre";
                                setTipChoice(tipChoice === choice ? null : choice);
                              }}
                              className={`min-h-11 flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                                tipChoice === choice
                                  ? "border-ember-2/60 bg-surface-raised text-foreground"
                                  : "border-hairline text-muted"
                              }`}
                            >
                              {choice === "autre" ? "Autre" : `${choice}\u00a0%`}
                            </button>
                          ))}
                        </div>
                        {tipChoice === "autre" && (
                          <input
                            ref={(node) => {
                              if (node && focusCustomTip.current) {
                                focusCustomTip.current = false;
                                // Au milieu de la feuille : sous le pied collé, il restait à moitié caché à 320 px.
                                node.focus({ preventScroll: true });
                                node.scrollIntoView({ block: "center" });
                              }
                            }}
                            type="text"
                            inputMode="decimal"
                            value={customTip}
                            onChange={(event) => setCustomTip(event.target.value)}
                            placeholder="Montant en €"
                            aria-label="Montant du pourboire en euros"
                            aria-invalid={tipError !== null}
                            aria-describedby={tipError ? `${hintId}-tip-error` : undefined}
                            // 16 px : en dessous, Safari sur iPhone zoome la page au focus.
                            className={`rounded-xl border bg-background px-3 py-2.5 text-base outline-none transition-colors ${
                              tipError
                                ? "border-ember-3/70"
                                : "border-hairline focus:border-ember-2/50"
                            }`}
                          />
                        )}
                        {tipError && (
                          <p id={`${hintId}-tip-error`} role="alert" className="text-xs text-ember-3">
                            {tipError}
                          </p>
                        )}
                      </div>
                    )}
                    {state === "error" && (
                      <p className="mb-3 text-sm text-ember-3">{error}</p>
                    )}
                    {rewardsOnly && (
                      <p className="mb-3 text-pretty text-xs leading-relaxed text-muted">
                        Un article offert accompagne une commande&nbsp;: ajoutez
                        au moins un article à régler.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        if (event.detail <= 1) void submit();
                      }}
                      disabled={
                        state === "sending" ||
                        cart.count === 0 ||
                        rewardsOnly ||
                        tipError !== null
                      }
                      className="ember-gradient w-full rounded-full px-6 py-3 text-sm font-semibold text-background disabled:opacity-60"
                    >
                      {cart.preview
                        ? cart.fastFood
                          ? "Aperçu\u00a0: voir le ticket"
                          : "Aperçu\u00a0: voir la confirmation"
                        : state === "sending"
                          ? "Envoi…"
                          : cart.collect
                            ? `Commander et payer · ${formatPrice(cart.total)}`
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

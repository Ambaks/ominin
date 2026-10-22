"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  collectProblem,
  PickupFields,
  pickupNotice,
  type CollectDetails,
} from "@/components/collect/pickup-fields";
import { CartPairings } from "@/components/menu/cart-pairings";
import { keepHyphenated } from "@/components/menu/keep-hyphenated";
import { ClaimPoints } from "@/components/menu/claim-points";
import { LoyaltySection } from "@/components/menu/loyalty-section";
import { PreviewPayment } from "@/components/menu/preview-payment";
import { leaveAfterSheet, Sheet, useSheetHistoryReset } from "@/components/menu/sheet";
import { DemoPayment } from "@/components/menu/demo-payment";
import { SquarePayment } from "@/components/menu/square-payment";
import { preloadStripe, StripePayment } from "@/components/menu/stripe-payment";
import { SumUpPayment } from "@/components/menu/sumup-payment";
import { isOpenAt } from "@/lib/collect/hours";
import { collectHref, normalizePhone, previewOrderKey, type PreviewCollectOrder } from "@/lib/collect/shared";
import { useCart, type CartLine } from "@/lib/menu/cart";
import { formatPrice } from "@/lib/menu/format";
import { fallBackToCounter, type CardPhase } from "@/lib/menu/online-payment";
import { CARD_NOTICES, useTickets, type TicketLine } from "@/lib/menu/tickets";
import { pointsEarned } from "@/lib/menu/loyalty";
import { useLoyaltyMember } from "@/lib/menu/loyalty-member";
import { CART_LINES_SHOWN } from "@/lib/gestion/constants";
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

/**
 * Le contenu d'un ticket d'aperçu, regroupé par nom et par choix comme
 * order_ticket. Sans les suppléments, « (+0,50 €) » ou rangés dans les
 * parenthèses du nom (« (épicé, +1,00 €) »), d'un plat comme des choix d'une
 * formule : order_ticket ne rend que les noms. L'aperçu montre une formule
 * étape par étape, comme le panier ; le vrai ticket en aligne les choix sur
 * une ligne.
 */
function previewTicketLines(cartLines: CartLine[]): TicketLine[] {
  const lines = new Map<string, TicketLine>();
  for (const line of cartLines) {
    const key = [line.name, ...line.optionSummary].join("\n");
    const known = lines.get(key);
    lines.set(key, {
      name: line.name,
      quantity: (known?.quantity ?? 0) + line.quantity,
      choices: line.optionSummary.map((choice) =>
        choice.replace(/ \(\+[^)]*\)/g, "").replace(/,\u00a0\+[^)]*\)/g, ")")
      ),
      formule: Boolean(line.formule) || undefined,
    });
  }
  return [...lines.values()];
}

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
  const loyaltyMember = useLoyaltyMember();
  const [rememberPhone, setRememberPhone] = useState(true);
  const [firstName, setFirstName] = useState("");
  // Commande partie sans carte : la confirmation propose d'en garder les points.
  const [unclaimed, setUnclaimed] = useState<{ orderId: string; points: number } | null>(null);
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
    note: "",
  }));
  // Deux temps quand il y a un règlement à choisir : la commande (lignes,
  // accords, fidélité), puis le règlement. Le pied de la commande n'a plus que
  // le total et un bouton : le reste de la feuille se voit.
  const [step, setStep] = useState<"commande" | "reglement">("commande");
  // Passée d'une étape à l'autre, la feuille remonte et le focus va au titre.
  // Un compteur et non l'étape : l'ouverture remet l'étape sans rien focaliser.
  const [stepMoves, setStepMoves] = useState(0);
  const [allLines, setAllLines] = useState(false);
  const stepTitleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (stepMoves === 0) return;
    const title = stepTitleRef.current;
    title?.closest<HTMLElement>('[role="dialog"]')?.scrollTo({ top: 0 });
    title?.focus({ preventScroll: true });
  }, [stepMoves]);
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
  // de la feuille de paiement. La démonstration (fournisseur « demo ») prend
  // la même place, avec les mêmes données et la même fin.
  const [stripePayment, setStripePayment] = useState<{
    orderId: string;
    total: number;
    tipAmount: number;
  } | null>(null);
  // Aperçu à table (demoSuivi) : le paiement simulé, à la même place. Rien
  // n'est appelé ; la commande ne part qu'une fois « acceptée ».
  const [previewPayment, setPreviewPayment] = useState<{
    orderId: string;
    total: number;
    tip: number;
  } | null>(null);
  // Chaque ajout fait sauter la barre (.cart-bump-a/-b, alternées pour
  // rejouer l'animation) et s'annonce aux lecteurs d'écran, qui sinon
  // n'entendaient rien : la barre apparaît hors de leur focus.
  const [bump, setBump] = useState({ count: cart.count, n: 0 });
  const [announcement, setAnnouncement] = useState("");
  // Le panier relu après un rechargement n'est pas un ajout : ni saut, ni
  // annonce, on prend juste son compte comme point de départ.
  const [baselined, setBaselined] = useState(false);
  // Une ligne nouvelle, la feuille ouverte (accord, palier, formule) : elle
  // arrive en bas de la liste, qui se déplie pour la montrer. Les clés et non
  // le compte : une formule qui reprend un plat le laisse inchangé, et un « + »
  // sur une ligne déjà là ne déplie rien.
  const lineKeys = cart.lines.map((line) => line.key).join("\n");
  const [knownKeys, setKnownKeys] = useState(lineKeys);
  if (knownKeys !== lineKeys) {
    const known = new Set(knownKeys.split("\n"));
    if (open && cart.lines.some((line) => !known.has(line.key))) setAllLines(true);
    setKnownKeys(lineKeys);
  }
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
          ? cart.tableNumber === null ||
            stripePayment ||
            squarePayment ||
            sumupPayment ||
            previewPayment
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
      // Le premier bloc de l'étape : une ligne de la commande, ou le choix du
      // règlement.
      const line = panel.querySelector<HTMLElement>('.cart-content li, .cart-reglement > [role="radiogroup"]');
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
  // Fast food, et aperçu à table (demoSuivi) : la commande partie, la feuille
  // du panier cède la place au ticket — même fond, le ticket la remplace.
  // C'est lui qu'on suit désormais.
  const handOff = (orderId: string, notices: string[] = []) => {
    setOpen(false);
    setState("idle");
    setSumupPayment(null);
    setSquarePayment(null);
    setStripePayment(null);
    setPreviewPayment(null);
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

  // Sous la commande minimum du restaurant, la carte coûte plus qu'elle ne
  // rapporte : à table ou au comptoir, on règle en caisse ; le click &
  // collect, qui ne se paie qu'en ligne, attend un panier plus garni.
  // En centimes : 1,40 € × 3 + 0,80 € fait 4,999… en flottants.
  const totalCents = Math.round(cart.total * 100);
  const minimumCents =
    cart.onlineMinOrder == null ? 0 : Math.round(cart.onlineMinOrder * 100);
  const missingCents = minimumCents - totalCents;
  const belowMinimum = cart.total > 0 && missingCents > 0;
  // Sans paiement en ligne, sous le minimum, ou tout offert en points (rien
  // à régler par carte, la salle valide l'addition à zéro : place_order la
  // laisse d'ailleurs au comptoir), l'addition se règle au comptoir.
  const payment: PaymentChoice = cart.collect
    ? "carte"
    : cart.onlinePayment && cart.total > 0 && !belowMinimum
      ? paymentChoice
      : "comptoir";
  // Stripe.js ne se charge qu'à l'approche du règlement : panier ouvert sur
  // « Payer en ligne », d'une vraie carte. Un échec ici se rejoue au paiement.
  const stripeAhead =
    open && !cart.preview && payment === "carte" && cart.paymentProvider === "stripe";
  useEffect(() => {
    if (stripeAhead) preloadStripe().catch(() => {});
  }, [stripeAhead]);

  // Click & collect : les fermetures se jugent à l'heure de retrait choisie.
  // Pas encore choisie (restaurant fermé), rien ne se juge.
  const { collect, refreshClosed } = cart;
  const pickupAt = details.pickupAt;
  const judgeClosed = !collect || pickupAt !== "";
  useEffect(() => {
    if (collect && open && pickupAt !== "") refreshClosed(pickupAt);
  }, [collect, open, pickupAt, refreshClosed]);

  // Rien à afficher tant que la commande n'est pas possible ou le panier vide.
  if (!cart.canOrder) return null;
  if (cart.count === 0 && state !== "sent") return status;

  // Téléphone reconnu, champ laissé vide : c'est son contact qui part.
  const member = contact.trim() ? null : loyaltyMember.member;
  const loyaltyContact = cart.loyalty ? (member?.contact ?? contact.trim()) : "";
  const loyaltyPoints =
    cart.loyalty && loyaltyContact ? pointsEarned(cart.earningTotal, cart.loyalty.pointsPerEuro) : 0;
  // Un article offert ne part pas seul : place_order le refuserait.
  const rewardsOnly = cart.lines.length > 0 && cart.lines.every((line) => line.reward);
  // La cuisine a fermé depuis l'ajout : place_order refuserait ces lignes.
  const lineClosed = (line: CartLine) =>
    judgeClosed ? cart.closedDish(line) : undefined;
  const closedLines = cart.lines.filter(lineClosed);
  // Un plat coupé pendant le règlement : la feuille revient à la commande,
  // focus compris, et y reste une fois le plat retiré.
  if (closedLines.length > 0 && step === "reglement") {
    setStep("commande");
    setStepMoves((moves) => moves + 1);
  }
  if (closedLines.length > 0 && !allLines) setAllLines(true);
  // Une longue commande se replie sur ses premières lignes : l'accord du chef
  // et la fidélité restent à l'écran.
  const foldable = cart.lines.length > CART_LINES_SHOWN;
  const shownLines = foldable && !allLines ? cart.lines.slice(0, CART_LINES_SHOWN) : cart.lines;
  const hiddenCount = cart.lines
    .slice(CART_LINES_SHOWN)
    .reduce((sum, line) => sum + line.quantity, 0);
  // Une ligne coupée : ce qui l'est, et comment repartir. Une formule ne perd
  // pas un choix en silence, elle se recompose.
  const closedNotice = () => {
    if (closedLines.length > 1) {
      return cart.collect
        ? "Certains articles ne sont plus servis à l’heure du retrait\u00a0: choisissez un autre créneau ou un autre jour, ou retirez-les."
        : "Certains articles ne sont plus servis\u00a0: retirez-les pour envoyer la commande.";
    }
    const [line] = closedLines;
    const name = `«\u00a0${line.name}\u00a0»`;
    if (line.formule) {
      const dish = lineClosed(line);
      return cart.collect
        ? `Plus servi à l’heure du retrait\u00a0: ${dish}. Choisissez un autre créneau ou un autre jour, ou retirez ${name} et recomposez-la.`
        : `Plus servi en ce moment\u00a0: ${dish}. Retirez ${name}, puis recomposez-la si elle est encore proposée.`;
    }
    return cart.collect
      ? `Plus servi à l’heure du retrait\u00a0: choisissez un autre créneau ou un autre jour, ou retirez ${name}.`
      : `Plus servi en ce moment\u00a0: retirez ${name} pour envoyer la commande.`;
  };
  // Le message d'un envoi refusé s'efface dès qu'on corrige ce qui le
  // causait : l'heure de retrait, ou la ligne retirée.
  const clearError = () => {
    if (state === "error") {
      setState("idle");
      setError(null);
    }
  };
  const collectShort = cart.collect && belowMinimum;
  // La barre dit ce qui retient l'envoi avant même que le panier s'ouvre.
  const barLabel =
    closedLines.length > 0
      ? "Commande à revoir"
      : collectShort
        ? `Encore ${formatPrice(missingCents / 100)} pour commander`
        : "Voir la commande";

  // Pourboire du règlement par carte, en centimes : pourcentage du total
  // arrondi au centime, ou montant libre — au plus le total, la borne du
  // serveur. Au comptoir d'un fast food, pas de service à table : pas de
  // pourboire.
  const tipOffered = payment === "carte" && !cart.fastFood && !cart.collect;
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
  // Aperçu à table : paiement simulé et suivi (demoSuivi).
  const previewSuivi = cart.preview && cart.demoSuivi !== undefined;
  // Le règlement a son étape quand il y a un choix à faire (en ligne ou au
  // comptoir, puis le pourboire).
  const paymentStep = cart.onlinePayment && cart.total > 0 && !belowMinimum && !cart.collect;
  const onPayment = paymentStep && step === "reglement";
  const goTo = (next: "commande" | "reglement") => {
    setStep(next);
    setStepMoves((moves) => moves + 1);
  };

  // Partie, une commande ne lègue ni son règlement ni son pourboire à la
  // suivante.
  const resetChoices = () => {
    setStep("commande");
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
    const pickupProblem = cart.collect
      ? collectProblem(details, cart.collect.hours, pickupNotice(cart.lines))
      : null;
    if (pickupProblem) {
      setState("error");
      setError(pickupProblem);
      // Sur téléphone, le formulaire de retrait est souvent sous le pli : le
      // premier champ vide prend le focus, sinon le formulaire remonte.
      const empty = [
        ...document.querySelectorAll<HTMLInputElement>("[data-collect-fields] input[required]"),
      ].find((input) => !input.value.trim());
      if (empty) empty.focus();
      else document.querySelector("[data-collect-fields]")?.scrollIntoView({ block: "start" });
      return;
    }
    // Aperçu : rien ne part, mais la suite se montre — à table, le paiement
    // simulé puis le ticket (demoSuivi), ou la confirmation ; en fast food,
    // le ticket, sur un numéro fictif ; en click & collect, la page de suivi,
    // rejouée sur la commande gardée dans l'onglet.
    if (cart.preview) {
      if (cart.demoSuivi && tickets) {
        const orderId = crypto.randomUUID();
        if (payment === "comptoir") {
          placePreviewOrder(orderId, "en_attente", cart.total, 0);
          handOff(orderId);
          return;
        }
        setPreviewPayment({ orderId, total: (totalCents + tipCents) / 100, tip: tipAmount });
        setState("sent");
        return;
      }
      if (cart.collect) {
        const order: PreviewCollectOrder = {
          customerName: details.name.trim(),
          createdAt: new Date().toISOString(),
          pickupAt: details.pickupAt,
          note: details.note.trim() || null,
          lines: cart.lines.map((line) => ({
            name: line.name,
            quantity: line.quantity,
            amount: line.quantity * line.unitPrice,
            details: line.optionSummary,
          })),
          total: cart.total,
        };
        try {
          sessionStorage.setItem(previewOrderKey(cart.slug), JSON.stringify(order));
        } catch {
          // Stockage indisponible : le suivi d'aperçu le dira.
        }
        cart.clear();
        leaveAfterSheet(`${collectHref(`demo/${cart.slug}`)}/suivi`);
        return;
      }
      if (!cart.fastFood) {
        setSentPayment(payment);
        cart.clear();
        resetChoices();
        setState("sent");
        return;
      }
      if (!tickets) return;
      const id = crypto.randomUUID();
      tickets.add(id, {
        status: payment === "carte" ? "payee" : "en_attente",
        total: cart.total,
        lines: previewTicketLines(cart.lines),
      });
      cart.clear();
      resetChoices();
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
            ...(line.accord && { accord: line.accord }),
          }
        : {
            item_id: line.itemId,
            quantity: line.quantity,
            choices: line.choices,
            ...(line.reward && { reward_id: line.reward.id }),
            ...(line.accord && { accord: line.accord }),
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
            // Validé par collectProblem juste avant : le numéro est lisible.
            phone: normalizePhone(details.phone)!,
            pickup_at: details.pickupAt ?? "",
            note: details.note.trim(),
          },
        }),
      }
    );
    if (rpcError) {
      setState("error");
      setError(rpcError.message);
      // Refusée pour un plat qui ne se sert plus : le panier le montre.
      cart.refreshClosed();
      return;
    }
    setSentPayment(payment);
    // Le solde affiché ne vaut plus : il se relira à la prochaine commande.
    setBalance(null);
    // Un téléphone reconnu relit son solde (des points ont pu partir) ; sinon,
    // place_order vient de créer la carte : le téléphone peut la retenir.
    if (member) {
      loyaltyMember.refresh().catch(() => {});
    } else if (loyaltyContact && rememberPhone && loyaltyMember.enabled) {
      loyaltyMember
        .remember(loyaltyContact, firstName.trim() || undefined)
        .then(() => setContact(""), () => {});
    }
    setUnclaimed(
      cart.loyalty && !loyaltyContact && !cart.collect && !cart.fastFood
        ? { orderId, points: pointsEarned(cart.earningTotal, cart.loyalty.pointsPerEuro) }
        : null
    );
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

    if (
      payment === "carte" &&
      (cart.paymentProvider === "stripe" || cart.paymentProvider === "demo")
    ) {
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

  // Aperçu à table : la commande part — payée en ligne (« accepté »), total
  // pourboire compris, ou à régler. Que des boissons, chaque article d'une
  // catégorie de boissons (une formule n'y est jamais) : le service la
  // saluera « Bonne dégustation ! », d'une tasse si toutes sont chaudes.
  const placePreviewOrder = (
    orderId: string,
    status: "payee" | "en_attente",
    total: number,
    tip: number
  ) => {
    if (!tickets || !cart.demoSuivi) return;
    const drinks = new Set(cart.demoSuivi.drinks);
    const hot = new Set(cart.demoSuivi.hotDrinks);
    tickets.add(orderId, {
      status,
      total,
      tip,
      lines: previewTicketLines(cart.lines),
      drinksOnly: cart.lines.every((line) => drinks.has(line.itemId)),
      hotDrinksOnly: cart.lines.every((line) => hot.has(line.itemId)),
    });
    cart.clear();
    resetChoices();
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
          `${cart.collect.confirmationPath ?? `${collectHref(cart.slug)}/confirmation`}?commande=${orderId}`
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
      setUnclaimed(null);
      setSumupPayment(null);
      setSquarePayment(null);
      setStripePayment(null);
      setPreviewPayment(null);
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
              // En click & collect, l'effet de l'heure de retrait s'en charge.
              if (!cart.collect) cart.refreshClosed();
              setStep("commande");
              setAllLines(false);
              setOpen(true);
            }}
            aria-haspopup="dialog"
            aria-label={`${barLabel}\u00a0: ${cart.count} article${cart.count > 1 ? "s" : ""}, ${formatPrice(cart.total)}`}
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
              {/* Un plat fermé depuis l'ajout : la barre le dit avant l'envoi. */}
              <span className="cart-bar-label whitespace-nowrap">{barLabel}</span>
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
          label={
            state !== "sent"
              ? undefined
              : previewPayment
                ? "Paiement simulé"
                : "Commande envoyée"
          }
        >
          {(dismiss, closing) => (
            <>
              {state === "sent" && previewPayment ? (
                <PreviewPayment
                  total={previewPayment.total}
                  onCancel={() => {
                    // Retour au panier, tel quel : le paiement n'a pas commencé.
                    setPreviewPayment(null);
                    setState("idle");
                    requestAnimationFrame(() =>
                      document.querySelector<HTMLElement>("[data-cart-submit]")?.focus()
                    );
                  }}
                  merchant={cart.restaurantName ?? ""}
                  cancelled={closing}
                  onAccepted={() =>
                    placePreviewOrder(
                      previewPayment.orderId,
                      "payee",
                      previewPayment.total,
                      previewPayment.tip
                    )
                  }
                  onDone={() => handOff(previewPayment.orderId)}
                />
              ) : state === "sent" && sumupPayment ? (
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
                  merchant={cart.restaurantName}
                  onPhase={onCardPhase}
                  onDone={(paid) => finishInPage(squarePayment.orderId, paid)}
                />
              ) : state === "sent" && stripePayment && cart.paymentProvider === "demo" ? (
                <DemoPayment
                  orderId={stripePayment.orderId}
                  total={stripePayment.total}
                  tipAmount={stripePayment.tipAmount}
                  merchant={cart.restaurantName}
                  onPhase={onCardPhase}
                  onDone={(paid) => finishInPage(stripePayment.orderId, paid)}
                />
              ) : state === "sent" && stripePayment ? (
                <StripePayment
                  orderId={stripePayment.orderId}
                  total={stripePayment.total}
                  tipAmount={stripePayment.tipAmount}
                  merchant={cart.restaurantName}
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
                  {unclaimed && unclaimed.points > 0 ? (
                    <ClaimPoints
                      orderId={unclaimed.orderId}
                      points={unclaimed.points}
                      paid={sentPayment === "carte" && !cardFailed}
                    />
                  ) : (
                    loyaltyContact && (
                      <p className="text-xs leading-relaxed text-muted">
                        Vos points de fidélité sont crédités sur {loyaltyContact}{" "}
                        à l&rsquo;encaissement.
                      </p>
                    )
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
                  <div className="cart-head sticky top-0 z-10 flex items-center gap-2 border-b border-hairline bg-surface p-5">
                    <h3
                      id={titleId}
                      ref={stepTitleRef}
                      tabIndex={-1}
                      className="cart-title min-w-0 flex-1 font-display text-lg font-medium outline-none"
                    >
                      {onPayment ? "Règlement" : "Votre commande"}
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 font-sans text-xs font-normal normal-case tracking-normal text-muted">
                        {cart.collect
                          ? "À emporter"
                          : cart.fastFood
                            ? "À récupérer au comptoir"
                            : cart.preview && cart.demoSuivi?.barPickup
                              ? "À récupérer au bar"
                              : `Table ${cart.tableNumber}`}
                        {paymentStep && (
                          <>
                            <span aria-hidden className="flex w-10 gap-1">
                              <span className="ember-gradient h-1 flex-1 rounded-full" />
                              <span
                                className={`h-1 flex-1 rounded-full ${onPayment ? "ember-gradient" : "bg-hairline"}`}
                              />
                            </span>
                            <span>Étape {onPayment ? 2 : 1} sur 2</span>
                          </>
                        )}
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

                  {onPayment ? (
                    <div className="cart-content cart-reglement flex shrink-0 flex-col p-5">
                      <button
                        type="button"
                        onClick={() => goTo("commande")}
                        className="mb-4 self-start text-left text-sm text-muted underline-offset-4 hover:underline"
                      >
                        {cart.count} article{cart.count > 1 ? "s" : ""} · {formatPrice(cart.total)}
                        {loyaltyPoints > 0 && (
                          <span className="text-ember-1">
                            {" · "}+{loyaltyPoints}&nbsp;{loyaltyPoints > 1 ? "points" : "point"}
                          </span>
                        )}
                        <span className="sr-only">, revenir à la commande</span>
                      </button>
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
                            data-payment-choice={value === "carte" ? "en-ligne" : "comptoir"}
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
                            // Aperçu à table (demoSuivi) : le choix fait se remplit
                            // de la couleur de la maison, comme le bouton d'envoi.
                            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors ${
                              payment !== value
                                ? "border-hairline text-muted"
                                : previewSuivi
                                  ? "ember-gradient border-transparent bg-origin-border text-background"
                                  : "border-ember-2/60 bg-surface-raised text-foreground"
                            }`}
                          >
                            {/* Le choix se lit aussi à sa pastille, pas qu'au filet. */}
                            <span
                              aria-hidden
                              className={`size-2.5 shrink-0 rounded-full ${
                                payment !== value
                                  ? "border border-current opacity-50"
                                  : previewSuivi
                                    ? "bg-current"
                                    : "ember-gradient"
                              }`}
                            />
                            <span className="text-balance">{label}</span>
                          </button>
                        ))}
                      </div>
                      {/* Fast food : ce que le choix change pour la suite. Les
                          deux phrases occupent la même case, l'autre cachée :
                          d'un choix à l'autre, la feuille ne saute pas. */}
                      {cart.fastFood && (
                        <p className="mb-4 grid text-pretty text-xs leading-relaxed text-muted">
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
                    </div>
                  ) : (
                    <div className="cart-content shrink-0 p-5">
                      <ul className="flex flex-col gap-4">
                        {shownLines.map((line) => {
                          const dish = lineClosed(line);
                          return (
                            <li key={line.key} className="flex items-center gap-3">
                              <div className="min-w-0 flex-1">
                                {/* Estompée, la ligne coupée ; pas l'avis qui le dit. */}
                                <div className={dish ? "opacity-60" : undefined}>
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
                                  {line.formule && line.optionSummary.length > 0 && (
                                    // Une formule, une étape par ligne : à la suite, ses étapes et
                                    // leurs choix faisaient un bloc de sept lignes.
                                    <p className="mt-0.5 text-xs text-muted">
                                      {line.optionSummary.map((option, i) => (
                                        // Clé par position : deux étapes peuvent répéter le libellé.
                                        <span key={i} className="block">
                                          {keepHyphenated(option.replaceAll(" (+", "\u00a0(+"))}
                                        </span>
                                      ))}
                                    </p>
                                  )}
                                  {/* Le prix, le détail d'une quantité, puis les choix d'un
                                      article seul ; ceux d'une formule restent au-dessus, une
                                      étape par ligne. */}
                                  <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs text-muted">
                                    {line.reward ? (
                                      <span className="cart-line-price font-display text-sm font-semibold text-ember-1">
                                        Offert{" "}
                                        <span className="font-sans text-xs font-medium normal-case text-muted">
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
                                    {line.quantity > 1 && !line.reward && (
                                      <span>
                                        {line.quantity} × {formatPrice(line.unitPrice)}
                                      </span>
                                    )}
                                    {/* Les choix d'un article seul suivent son prix : une
                                        rangée de moins par ligne. Chaque choix d'un bloc,
                                        précédé de son « · » : il passe entier à la ligne,
                                        jamais coupé avant son supplément. */}
                                    {!line.formule &&
                                      line.optionSummary.map((option, i) => (
                                        <span key={i} className="inline-block max-w-full">
                                          <span aria-hidden>·&nbsp;</span>
                                          {keepHyphenated(option.replaceAll(" (+", "\u00a0(+"))}
                                        </span>
                                      ))}
                                  </p>
                                </div>
                                {dish && (
                                  <p className="mt-1 text-xs font-semibold text-ember-3">
                                    {line.formule
                                      ? `Plus servi\u00a0: ${dish}`
                                      : cart.collect
                                        ? "Plus servi à l’heure du retrait"
                                        : "Plus servi en ce moment"}
                                  </p>
                                )}
                              </div>
                              {/* La quantité seule à droite, le prix sous le nom : la
                                  ligne tient sur la hauteur de ses boutons, et
                                  l'accord du chef reste à l'écran. */}
                              <div className="flex shrink-0 items-center">
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
                                      clearError();
                                    }}
                                    className="flex size-10 items-center justify-center text-lg text-muted"
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
                                      dish !== undefined ||
                                      (line.stock != null &&
                                        line.quantity >= line.stock) ||
                                      (line.reward != null &&
                                        ((member ? member.points : balance) ?? 0) - cart.pointsSpent <
                                          line.reward.points)
                                    }
                                    className="flex size-10 items-center justify-center text-lg text-muted disabled:opacity-40"
                                    aria-label={`Augmenter la quantité\u00a0: ${lineLabel(line)}`}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      {/* Un bouton qui reste : le focus ne tombe pas hors de la feuille. */}
                      {foldable && closedLines.length === 0 && (
                        <button
                          type="button"
                          aria-expanded={allLines}
                          onClick={() => setAllLines(!allLines)}
                          className="mt-3 text-xs font-semibold text-muted underline underline-offset-4"
                        >
                          {allLines
                            ? "Replier la liste"
                            : hiddenCount === 1
                              ? "Voir l’autre article"
                              : `Voir les ${hiddenCount} autres articles`}
                        </button>
                      )}
                      <CartPairings />
                      {cart.loyalty && (
                        <LoyaltySection
                          program={cart.loyalty}
                          contact={contact}
                          onContactChange={setContact}
                          balance={member ? (member.points ?? 0) : balance}
                          onBalance={setBalance}
                          member={member}
                          onForget={() => {
                            cart.clearRewards();
                            void loyaltyMember.forget();
                          }}
                          remember={
                            loyaltyMember.enabled
                              ? {
                                  checked: rememberPhone,
                                  onChange: setRememberPhone,
                                  firstName,
                                  onFirstNameChange: setFirstName,
                                }
                              : undefined
                          }
                        />
                      )}
                      {cart.collect && (
                        <PickupFields
                          slug={cart.slug}
                          hours={cart.collect.hours}
                          slotMinutes={cart.collect.slotMinutes}
                          notice={pickupNotice(cart.lines)}
                          value={details}
                          onChange={(next) => {
                            setDetails(next);
                            clearError();
                          }}
                        />
                      )}
                    </div>
                  )}

                  <div ref={footRef} className="cart-foot sticky bottom-0 border-t border-hairline bg-surface p-5">
                    {/* Le total se lit sur le bouton tant qu'il reste une étape ;
                        au règlement, avec le pourboire : ce que la carte débitera
                        (les routes de paiement l'ajoutent aux lignes). */}
                    {(!paymentStep || onPayment) && (
                      <div className="mb-3">
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
                    )}
                    {cart.onlinePayment && belowMinimum && !cart.collect && (
                      <p className="mb-3 text-pretty text-xs leading-relaxed text-muted">
                        Paiement en ligne dès {formatPrice(minimumCents / 100)}&nbsp;:
                        ajoutez {formatPrice(missingCents / 100)} pour
                        payer par carte, ou réglez au comptoir.
                        {cart.fastFood &&
                          " Elle part en\u00a0cuisine une fois réglée au\u00a0comptoir."}
                      </p>
                    )}
                    {/* Refusée pour un plat fermé : l'avis des lignes coupées le dit mieux. */}
                    {state === "error" && closedLines.length === 0 && (
                      <p role="alert" className="mb-3 text-sm text-ember-3">
                        {error}
                      </p>
                    )}
                    {rewardsOnly && (
                      <p className="mb-3 text-pretty text-xs leading-relaxed text-muted">
                        Un article offert accompagne une commande&nbsp;: ajoutez
                        au moins un article à régler.
                      </p>
                    )}
                    {closedLines.length > 0 && (
                      <p
                        id={`${hintId}-closed`}
                        role="status"
                        className="mb-3 text-pretty text-xs leading-relaxed text-ember-3"
                      >
                        {closedNotice()}
                      </p>
                    )}
                    {collectShort && (
                      <p
                        id={`${hintId}-minimum`}
                        role="status"
                        className="mb-3 text-pretty text-xs leading-relaxed text-muted"
                      >
                        Ajoutez encore {formatPrice(missingCents / 100)} pour
                        commander (minimum {formatPrice(minimumCents / 100)}).
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      {/* Refermer à portée du pouce : la croix est tout en haut.
                          Au règlement, le même bouton ramène à la commande. */}
                      <button
                        type="button"
                        onClick={onPayment ? () => goTo("commande") : dismiss}
                        className="cart-back min-h-12 shrink-0 rounded-full border border-hairline px-4 text-sm font-semibold text-muted transition-colors hover:text-foreground"
                      >
                        {onPayment ? (
                          "Modifier"
                        ) : (
                          <>
                            <span aria-hidden>←</span> La carte
                          </>
                        )}
                      </button>
                      {paymentStep && !onPayment ? (
                        <button
                          type="button"
                          data-cart-continue
                          onClick={() => goTo("reglement")}
                          disabled={rewardsOnly || closedLines.length > 0}
                          aria-describedby={closedLines.length > 0 ? `${hintId}-closed` : undefined}
                          className="ember-gradient min-h-12 min-w-0 flex-1 rounded-full px-5 py-3 text-sm font-semibold text-background disabled:opacity-60"
                        >
                          Continuer · {formatPrice(cart.total)}
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-cart-submit
                          onClick={(event) => {
                            if (event.detail <= 1) void submit();
                          }}
                          aria-describedby={
                            closedLines.length > 0
                              ? `${hintId}-closed`
                              : collectShort
                                ? `${hintId}-minimum`
                                : undefined
                          }
                          disabled={
                            state === "sending" ||
                            rewardsOnly ||
                            closedLines.length > 0 ||
                            collectShort ||
                            tipError !== null
                          }
                          className="ember-gradient min-h-12 min-w-0 flex-1 rounded-full px-5 py-3 text-sm font-semibold text-background disabled:opacity-60"
                        >
                          {cart.preview
                            ? previewSuivi
                              ? payment === "carte"
                                ? `Payer en\u00a0ligne · ${formatPrice((totalCents + tipCents) / 100)}`
                                : "Envoyer la commande"
                              : cart.fastFood
                                ? "Aperçu\u00a0: voir le ticket"
                                : cart.collect
                                  ? "Aperçu\u00a0: voir le suivi"
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
                      )}
                    </div>
                    {previewSuivi && (
                      <p className="mt-2 text-center text-[11px] text-muted">
                        Démo — commande et paiement simulés.
                      </p>
                    )}
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

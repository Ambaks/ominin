"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { OpeningHours } from "@/lib/collect/hours";
import type { ServiceMode } from "@/lib/gestion/types";
import { fetchClosedItems } from "@/lib/menu/fermetures";
import { lineName } from "@/lib/menu/format";
import type { MenuItem } from "@/lib/menu-data";
import { createClient } from "@/lib/supabase/client";
import type { MenuStage } from "./analytics/constants";
import type { LoyaltyProgram } from "./loyalty";
import type { Pairing } from "./pairings";
import { TicketsProvider } from "./tickets";
import {
  createTracker,
  type MenuTracker,
  type TrackOptions,
} from "./analytics/tracker";

/** Choix d'option envoyé à la base (le supplément y est revalidé) — alias, pas interface : assignable au Json de place_order. */
export type CartChoice = {
  group_id: string;
  choice_id: string;
};

/** Choix d'une étape de formule, revalidé en base (formule_line). */
export type FormuleSelection = {
  etape_id: string;
  article_id: string;
  choices: CartChoice[];
};

export interface CartLine {
  /** itemId + choix triés : deux lignes identiques fusionnent. */
  key: string;
  itemId: string;
  name: string;
  /** Format du plat (« x4 », « pour 2 »), en fin de name : le panier l'écrit en petit. */
  detail?: string;
  /** Prix de base + suppléments, pour l'affichage ; la base refige le montant. */
  unitPrice: number;
  quantity: number;
  /** Libellés lisibles des options choisies. */
  optionSummary: string[];
  choices: CartChoice[];
  /** Stock affiché à l'ouverture du menu : borne la quantité (la base refait le test). */
  stock?: number | null;
  /** Délai de commande du plat (heures) : repousse le premier retrait possible. */
  noticeHours?: number;
  /**
   * Ligne offerte par un palier de fidélité : l'article se paie en points
   * (par unité), ses suppléments restent en euros dans unitPrice.
   */
  reward?: { id: string; points: number };
  /**
   * Ligne formule : itemId porte alors l'identifiant de la formule. `items`,
   * les plats de la carte derrière les choix : une fermeture les vise.
   */
  formule?: {
    selections: FormuleSelection[];
    items?: { id: string; name: string }[];
  };
}

const noSubscription = () => () => {};

/** Une ligne gardée d'un ancien format (déploiement pendant la visite) ou
    abîmée ferait planter la carte au rechargement, et à chaque suivant. */
function isCartLine(value: unknown): value is CartLine {
  const line = value as CartLine | null;
  return (
    typeof line?.key === "string" &&
    typeof line.itemId === "string" &&
    typeof line.name === "string" &&
    Number.isFinite(line.unitPrice) &&
    Number.isInteger(line.quantity) &&
    line.quantity >= 1 &&
    Array.isArray(line.optionSummary) &&
    Array.isArray(line.choices) &&
    (line.detail === undefined || typeof line.detail === "string")
  );
}

/** Panier gardé dans la session de l'onglet ; illisible ou absent ⇒ vide.
    Sans les lignes offertes : le contact et le solde qui les couvraient ne
    survivent pas au rechargement. */
function readSavedCart(key: string): CartLine[] {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(key) ?? "[]");
    return Array.isArray(saved)
      ? saved.filter(isCartLine).filter((line) => !line.reward)
      : [];
  } catch {
    return [];
  }
}

function capped(line: { stock?: number | null }, quantity: number): number {
  return line.stock == null ? quantity : Math.min(quantity, line.stock);
}

export interface CartConfig {
  slug: string;
  /** Table scannée (via ?table=), ou null si le menu est ouvert sans QR. */
  tableNumber: number | null;
  /** L'offre de l'établissement autorise la commande à table (Smart/Connect). */
  orderingEnabled: boolean;
  /**
   * Fast food : le client commande sans table et reçoit un numéro du jour.
   * Absent ⇒ restaurant, la commande part d'une table scannée.
   */
  serviceMode?: ServiceMode;
  /** Nom de l'établissement, en tête du ticket fast food. */
  restaurantName?: string;
  /** L'heure prévue du ticket se présente comme celle de l'estimateur IA (aperçu d'un pitch qui le dit livré). */
  estimatorLive?: boolean;
  /** Le restaurant propose le règlement par carte à la commande. */
  onlinePayment: boolean;
  /** Fournisseur qui encaisse le règlement par carte. */
  paymentProvider: "stripe" | "sumup" | "square" | "demo";
  /** Point de vente Square encaisseur, requis par le SDK carte en page. */
  squareLocationId: string | null;
  /** Programme de fidélité du restaurant ; absent ⇒ pas de points. */
  loyalty?: LoyaltyProgram | null;
  /** Sous ce total, le règlement par carte n'est pas proposé ; absent ⇒ aucun minimum. */
  onlineMinOrder?: number | null;
  /**
   * Établissement dont les fermetures se relisent (articles_fermes) ; absent
   * (aperçu), rien n'est jamais fermé.
   */
  etablissementId?: string;
  /** Articles coupés au rendu de la page. */
  closedItems?: string[];
  /** L'accord du chef, par id de plat ; absent ⇒ rien n'est proposé. */
  pairings?: Record<string, Pairing[]>;
  /**
   * Aperçu commercial (/menu/demo/<slug>) : le parcours se montre en entier,
   * mais rien ne part — ni la visite dans l'analytique, ni la commande. La
   * route d'aperçu est publique et la plupart des cartes existent en base :
   * sans ce garde-fou, « Envoyer la commande » partait en cuisine chez un
   * vrai client, sur la table fictive de l'aperçu. undefined ⇒ menu réel.
   */
  preview?: boolean;
  /**
   * Aperçu à table (Restaurant.demoSuivi) : « Payer en ligne » se simule, sans
   * rien appeler, puis la commande se suit au bas de l'écran jusqu'au service.
   * drinks : les articles des catégories de boissons ; une commande faite de
   * ces seuls articles, sans formule, se salue « Bonne dégustation ! ».
   * hotDrinks : celles qui sont chaudes ; rien que d'elles, la salutation
   * porte une tasse. Ignoré hors aperçu.
   */
  demoSuivi?: { drinks: string[]; hotDrinks: string[] };
  /**
   * Click & collect (collect.ominin.com/<slug>) : sans table, payé en ligne à
   * la commande, retiré à l'heure choisie dans les horaires d'ouverture.
   */
  collect?: {
    hours: OpeningHours | null;
    slotMinutes: number;
    /**
     * Page de suivi où mène le paiement abouti (le site de l'établissement) ;
     * absent ⇒ celle de collect.ominin.com.
     */
    confirmationPath?: string;
  };
}

interface CartContextValue extends CartConfig {
  /** Le client peut commander d'ici : à sa table, ou au comptoir en fast food. */
  canOrder: boolean;
  fastFood: boolean;
  lines: CartLine[];
  count: number;
  total: number;
  /** Points que coûtent les lignes offertes du panier. */
  pointsSpent: number;
  /** Ce qui se paie en euros hors lignes offertes : la base des points gagnés. */
  earningTotal: number;
  addLine: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  /** Retire les lignes offertes (le client change de contact, donc de solde). */
  clearRewards: () => void;
  /** Avancement de la visite, pour l'analytique (voir menu/analytics). */
  track: (stage: MenuStage, options?: TrackOptions) => void;
  /** Le panier gardé a été relu : les changements suivants sont du client. */
  ready: boolean;
  /**
   * Articles coupés : maintenant, ou à l'heure de retrait choisie en click &
   * collect (une cuisine fermée ce soir sert demain midi).
   */
  closed: ReadonlySet<string>;
  /**
   * Relit les fermetures en base. `at` : l'heure de retrait à juger, null
   * pour maintenant ; absent, l'instant retenu au dernier appel.
   */
  refreshClosed: (at?: string | null) => void;
  /** L'instant que `closed` juge : l'heure de retrait choisie, null pour maintenant. */
  closedAt: string | null;
  /** Le plat d'une ligne du panier qu'une fermeture coupe, s'il y en a un. */
  closedDish: (line: CartLine) => string | undefined;
}

const CartContext = createContext<CartContextValue | null>(null);

export function cartLineKey(
  itemId: string,
  choices: CartChoice[],
  rewardId?: string
): string {
  // Le groupe fait partie de la clé : deux groupes d'un même article peuvent
  // proposer les mêmes identifiants de choix (les trois viandes d'un tacos),
  // et sans lui deux plats différents fusionneraient sur une seule ligne.
  // Offert ou payé, un même plat reste sur deux lignes.
  const ids = choices.map((c) => `${c.group_id}:${c.choice_id}`).sort();
  const key = ids.length ? `${itemId}#${ids.join("+")}` : itemId;
  return rewardId ? `${rewardId}/${key}` : key;
}

/** La ligne de panier d'un plat sans options. */
export const plainLine = (item: MenuItem): Omit<CartLine, "quantity"> => ({
  key: cartLineKey(item.id, []),
  itemId: item.id,
  name: lineName(item),
  detail: item.detail,
  unitPrice: item.price,
  optionSummary: [],
  choices: [],
  stock: item.stock,
  noticeHours: item.noticeHours,
});

/** Clé du panier gardé dans l'onglet : par carte, par table, aperçu à part. */
export function savedCartKey(slug: string, table: number | null, preview?: boolean) {
  return `ominin-panier:${preview ? "apercu:" : ""}${slug}:${table ?? "-"}`;
}

export function CartProvider({
  config,
  children,
}: {
  config: CartConfig;
  children: React.ReactNode;
}) {
  const [lines, setLines] = useState<CartLine[]>([]);

  /*
   * Le panier survit à un rechargement, un « tirer pour rafraîchir » ou un
   * onglet que le téléphone a déchargé : gardé dans la session de l'onglet,
   * par carte et par table. Relu après le premier rendu (le serveur n'en sait
   * rien), réécrit à chaque changement ; stockage refusé ⇒ panier en mémoire.
   */
  // L'aperçu a sa propre clé : ses lignes (ids du registre) ne doivent pas
  // réapparaître dans le vrai menu du même restaurant, ni l'inverse.
  const storageKey = savedCartKey(config.slug, config.tableNumber, config.preview);
  // Faux pendant l'hydratation (le rendu doit égaler celui du serveur), vrai
  // juste après : le panier gardé est relu à ce moment-là, une fois par clé.
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false
  );
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  if (hydrated && restoredKey !== storageKey) {
    setRestoredKey(storageKey);
    setLines(readSavedCart(storageKey));
  }
  useEffect(() => {
    if (restoredKey !== storageKey) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(lines));
    } catch {
      // Stockage indisponible (navigation privée stricte) : le panier
      // reste en mémoire.
    }
  }, [lines, storageKey, restoredKey]);

  const addLine = useCallback(
    (line: Omit<CartLine, "quantity">, quantity = 1) => {
      setLines((current) => {
        const index = current.findIndex((l) => l.key === line.key);
        if (index === -1) {
          return [...current, { ...line, quantity: capped(line, quantity) }];
        }
        const next = [...current];
        next[index] = {
          ...next[index],
          quantity: capped(line, next[index].quantity + quantity),
        };
        return next;
      });
    },
    []
  );

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((l) => l.key !== key)
        : current.map((l) =>
            l.key === key ? { ...l, quantity: capped(l, quantity) } : l
          )
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const clearRewards = useCallback(
    () => setLines((current) => current.filter((l) => !l.reward)),
    []
  );

  /*
   * Fermetures en cours : la page en cache peut dater d'avant la fermeture de
   * la cuisine, et un client garde la carte ouverte tout le repas. Relues à
   * l'arrivée, au retour sur l'onglet et à l'ouverture du panier.
   */
  const [closed, setClosed] = useState<ReadonlySet<string>>(
    () => new Set(config.closedItems)
  );
  const etablissementId = config.etablissementId;
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const closedAtRef = useRef<string | null>(null);
  // Seule la dernière lecture compte : une heure de retrait changée deux fois
  // de suite ne doit pas voir la première réponse arriver après la seconde.
  const closedRequest = useRef(0);
  const refreshClosed = useCallback(
    (at?: string | null) => {
      if (at !== undefined) closedAtRef.current = at;
      if (!etablissementId) return;
      const request = ++closedRequest.current;
      const judged = closedAtRef.current;
      fetchClosedItems(createClient(), etablissementId, judged ?? undefined).then(
        (items) => {
          if (request !== closedRequest.current) return;
          setClosed(new Set(items));
          setClosedAt(judged);
        },
        // Réseau perdu : l'état connu reste, place_order a le dernier mot.
        () => {}
      );
    },
    [etablissementId]
  );
  useEffect(() => {
    if (!etablissementId) return;
    refreshClosed();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshClosed();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [etablissementId, refreshClosed]);

  const tracker = useRef<MenuTracker | null>(null);
  const tracking = !config.preview;
  useEffect(() => {
    if (!tracking) return;
    const instance = createTracker(config.slug, config.tableNumber);
    tracker.current = instance;
    instance.start();
    return () => {
      instance.stop();
      tracker.current = null;
    };
  }, [tracking, config.slug, config.tableNumber]);

  const track = useCallback((stage: MenuStage, options?: TrackOptions) => {
    tracker.current?.track(stage, options);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0);
    const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    let pointsSpent = 0;
    let earningTotal = 0;
    for (const l of lines) {
      if (l.reward) pointsSpent += l.reward.points * l.quantity;
      else earningTotal += l.unitPrice * l.quantity;
    }
    const fastFood = config.serviceMode === "fast_food";
    return {
      ...config,
      fastFood,
      canOrder:
        config.orderingEnabled &&
        (fastFood || config.collect !== undefined || config.tableNumber !== null),
      lines,
      count,
      total,
      pointsSpent,
      earningTotal,
      addLine,
      setQuantity,
      clear,
      clearRewards,
      track,
      ready: restoredKey === storageKey,
      closed,
      refreshClosed,
      closedAt,
      closedDish: (line) =>
        line.formule
          ? line.formule.items?.find((item) => closed.has(item.id))?.name
          : closed.has(line.itemId)
            ? line.name
            : undefined,
    };
  }, [
    config,
    lines,
    addLine,
    setQuantity,
    clear,
    clearRewards,
    track,
    restoredKey,
    storageKey,
    closed,
    refreshClosed,
    closedAt,
  ]);

  return (
    <CartContext.Provider value={value}>
      {config.serviceMode === "fast_food" ? (
        <TicketsProvider slug={config.slug} preview={config.preview}>
          {children}
        </TicketsProvider>
      ) : config.preview && config.demoSuivi ? (
        <TicketsProvider slug={config.slug} preview table={config.tableNumber}>
          {children}
        </TicketsProvider>
      ) : (
        children
      )}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart doit être utilisé dans un CartProvider.");
  return value;
}

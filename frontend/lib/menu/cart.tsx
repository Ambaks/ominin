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
import type { MenuStage } from "./analytics/constants";
import type { LoyaltyProgram } from "./loyalty";
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
  /** Prix de base + suppléments, pour l'affichage ; la base refige le montant. */
  unitPrice: number;
  quantity: number;
  /** Libellés lisibles des options choisies. */
  optionSummary: string[];
  choices: CartChoice[];
  /** Stock affiché à l'ouverture du menu : borne la quantité (la base refait le test). */
  stock?: number | null;
  /**
   * Ligne offerte par un palier de fidélité : l'article se paie en points
   * (par unité), ses suppléments restent en euros dans unitPrice.
   */
  reward?: { id: string; points: number };
  /** Ligne formule : itemId porte alors l'identifiant de la formule. */
  formule?: { selections: FormuleSelection[] };
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
    Array.isArray(line.choices)
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
  /** Le restaurant propose le règlement par carte à la commande. */
  onlinePayment: boolean;
  /** Fournisseur qui encaisse le règlement par carte. */
  paymentProvider: "stripe" | "sumup" | "square";
  /** Point de vente Square encaisseur, requis par le SDK carte en page. */
  squareLocationId: string | null;
  /** Programme de fidélité du restaurant ; absent ⇒ pas de points. */
  loyalty?: LoyaltyProgram | null;
  /**
   * Aperçu commercial (/menu/demo/<slug>) : le parcours se montre en entier,
   * mais rien ne part — ni la visite dans l'analytique, ni la commande. La
   * route d'aperçu est publique et la plupart des cartes existent en base :
   * sans ce garde-fou, « Envoyer la commande » partait en cuisine chez un
   * vrai client, sur la table fictive de l'aperçu. undefined ⇒ menu réel.
   */
  preview?: boolean;
}

interface CartContextValue extends CartConfig {
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
  const storageKey = `ominin-panier:${config.preview ? "apercu:" : ""}${config.slug}:${config.tableNumber ?? "-"}`;
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
    return {
      ...config,
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
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart doit être utilisé dans un CartProvider.");
  return value;
}

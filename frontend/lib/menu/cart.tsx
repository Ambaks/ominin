"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MenuStage } from "./analytics/constants";
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
  /**
   * Compter la visite dans l'analytique de l'établissement. Faux pour un
   * aperçu commercial : ouvrir la démo devant un prospect ne doit pas gonfler
   * les vues d'un vrai client. undefined ⇒ on compte (le menu public).
   */
  tracking?: boolean;
}

interface CartContextValue extends CartConfig {
  lines: CartLine[];
  count: number;
  total: number;
  addLine: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  /** Avancement de la visite, pour l'analytique (voir menu/analytics). */
  track: (stage: MenuStage, options?: TrackOptions) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function cartLineKey(itemId: string, choices: CartChoice[]): string {
  // Le groupe fait partie de la clé : deux groupes d'un même article peuvent
  // proposer les mêmes identifiants de choix (les trois viandes d'un tacos),
  // et sans lui deux plats différents fusionneraient sur une seule ligne.
  const ids = choices.map((c) => `${c.group_id}:${c.choice_id}`).sort();
  return ids.length ? `${itemId}#${ids.join("+")}` : itemId;
}

export function CartProvider({
  config,
  children,
}: {
  config: CartConfig;
  children: React.ReactNode;
}) {
  const [lines, setLines] = useState<CartLine[]>([]);

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

  const tracker = useRef<MenuTracker | null>(null);
  const tracking = config.tracking !== false;
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
    return {
      ...config,
      lines,
      count,
      total,
      addLine,
      setQuantity,
      clear,
      track,
    };
  }, [config, lines, addLine, setQuantity, clear, track]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart doit être utilisé dans un CartProvider.");
  return value;
}

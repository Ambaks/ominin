"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

/** Choix d'option envoyé à la base (le supplément y est revalidé). */
export interface CartChoice {
  group_id: string;
  choice_id: string;
}

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
}

export interface CartConfig {
  slug: string;
  /** Table scannée (via ?table=), ou null si le menu est ouvert sans QR. */
  tableNumber: number | null;
  /** L'offre de l'établissement autorise la commande à table (Smart/Connect). */
  orderingEnabled: boolean;
}

interface CartContextValue extends CartConfig {
  lines: CartLine[];
  count: number;
  total: number;
  addLine: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function cartLineKey(itemId: string, choices: CartChoice[]): string {
  const ids = choices.map((c) => c.choice_id).sort();
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
        if (index === -1) return [...current, { ...line, quantity }];
        const next = [...current];
        next[index] = {
          ...next[index],
          quantity: next[index].quantity + quantity,
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
        : current.map((l) => (l.key === key ? { ...l, quantity } : l))
    );
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((current) => current.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

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
      removeLine,
      clear,
    };
  }, [config, lines, addLine, setQuantity, removeLine, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart doit être utilisé dans un CartProvider.");
  return value;
}

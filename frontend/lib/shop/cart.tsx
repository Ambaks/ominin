"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CART_MAX_QUANTITY, CART_STORAGE_PREFIX } from "./constants";
import type { CartItem, CartOption } from "./types";

/*
 * Panier d'une boutique, conservé dans localStorage sous une clé propre au
 * slug : les boutiques partagent l'origine shop.ominin.com, chacune garde
 * son panier. Le mot doux saisi sur une fiche est repris au passage en
 * caisse. `hydrated` évite tout décalage entre rendu serveur et navigateur.
 */

interface CartState {
  items: CartItem[];
  giftMessage: string;
}

interface CartContextValue extends CartState {
  slug: string;
  hydrated: boolean;
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "key">) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  setGiftMessage: (message: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const EMPTY: CartState = { items: [], giftMessage: "" };

export function cartKey(productId: string, options: CartOption[], personalization: string | null): string {
  const opts = options.map((o) => `${o.linkId}:${o.valueId}`).sort().join(",");
  return `${productId}|${opts}|${personalization ?? ""}`;
}

export function itemUnitPrice(item: Pick<CartItem, "unitPriceCents" | "options">): number {
  return item.unitPriceCents + item.options.reduce((sum, o) => sum + o.priceDeltaCents, 0);
}

function read(key: string): CartState {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<CartState>;
    // Paniers enregistrés avant la personnalisation : le champ manque.
    const items = Array.isArray(parsed.items) ? parsed.items.map((i) => ({ ...i, personalization: i.personalization ?? null })) : [];
    return { items, giftMessage: typeof parsed.giftMessage === "string" ? parsed.giftMessage : "" };
  } catch {
    return EMPTY;
  }
}

export function CartProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const storageKey = `${CART_STORAGE_PREFIX}:${slug}`;
  const [state, setState] = useState<CartState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture différée du stockage navigateur
    setState(read(storageKey));
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Stockage indisponible (navigation privée) : le panier vit le temps de la page.
    }
  }, [state, hydrated, storageKey]);

  const addItem = useCallback((item: Omit<CartItem, "key">) => {
    setState((s) => {
      const key = cartKey(item.productId, item.options, item.personalization);
      const existing = s.items.find((i) => i.key === key);
      const items = existing
        ? s.items.map((i) => (i.key === key ? { ...i, quantity: Math.min(CART_MAX_QUANTITY, i.quantity + item.quantity) } : i))
        : [...s.items, { ...item, key, quantity: Math.min(CART_MAX_QUANTITY, item.quantity) }];
      return { ...s, items };
    });
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setState((s) => ({
      ...s,
      items:
        quantity <= 0
          ? s.items.filter((i) => i.key !== key)
          : s.items.map((i) => (i.key === key ? { ...i, quantity: Math.min(CART_MAX_QUANTITY, quantity) } : i)),
    }));
  }, []);

  const removeItem = useCallback((key: string) => {
    setState((s) => ({ ...s, items: s.items.filter((i) => i.key !== key) }));
  }, []);

  const setGiftMessage = useCallback((giftMessage: string) => setState((s) => ({ ...s, giftMessage })), []);
  const clear = useCallback(() => setState(EMPTY), []);

  const value = useMemo<CartContextValue>(
    () => ({
      ...state,
      slug,
      hydrated,
      count: state.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: state.items.reduce((sum, i) => sum + itemUnitPrice(i) * i.quantity, 0),
      addItem,
      updateQuantity,
      removeItem,
      setGiftMessage,
      clear,
    }),
    [state, slug, hydrated, addItem, updateQuantity, removeItem, setGiftMessage, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart doit être utilisé sous <CartProvider>.");
  return value;
}

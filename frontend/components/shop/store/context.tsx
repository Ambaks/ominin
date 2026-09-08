"use client";

import { createContext, useContext } from "react";

/*
 * Identité de la boutique côté navigateur : slug (préfixe de tous les liens,
 * la boutique vit sous shop.ominin.com/<slug>) et libellés utilisés par les
 * composants interactifs (en-tête, panier, formulaires).
 */
export interface ShopIdentity {
  slug: string;
  name: string;
  catalogLabel: string;
}

const ShopContext = createContext<ShopIdentity | null>(null);

export function ShopProvider({ value, children }: { value: ShopIdentity; children: React.ReactNode }) {
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopIdentity {
  const value = useContext(ShopContext);
  if (!value) throw new Error("useShop doit être utilisé sous <ShopProvider>.");
  return value;
}

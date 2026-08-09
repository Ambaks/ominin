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
import type { MenuItem } from "@/lib/menu-data";
import {
  buildDemoMenu,
  COLLECT_DEMO,
  type DemoMenuSection,
  type DemoStep,
} from "./data";

/*
 * Machine à états de la démo interactive Collect : tout vit en mémoire, les
 * différés (paiement, « webhook ») sont joués par des minuteries — aucun
 * appel réseau. Les deux volets (téléphone client, dashboard restaurant)
 * consomment le même contexte : une action d'un côté se voit de l'autre.
 */

export interface DemoOrder {
  lines: { item: MenuItem; quantity: number }[];
  total: number;
  customerName: string;
  createdAt: string;
  etaMinutes: number | null;
  /** « Prête vers » (ISO), posée par accept(). */
  readyAt: string | null;
}

/** Événement traversant le connecteur entre les deux volets. */
export interface DemoRelayEvent {
  id: number;
  direction: "toRestaurant" | "toCustomer";
}

interface CollectDemoState {
  step: DemoStep;
  cart: Record<string, number>;
  order: DemoOrder | null;
  /** La commande est visible côté restaurant (après le différé « webhook »). */
  orderVisible: boolean;
  lastEvent: DemoRelayEvent | null;
  /** La puce guide fait respirer le prochain bouton (inactivité). */
  hintActive: boolean;
}

interface CollectDemoValue extends CollectDemoState {
  /** Menu de la démo groupé par catégorie (navigation du volet client). */
  sections: DemoMenuSection[];
  /** Le même menu à plat, pour les calculs de panier. */
  menu: MenuItem[];
  addItem(id: string): void;
  removeItem(id: string): void;
  openCheckout(): void;
  backToMenu(): void;
  pay(): void;
  accept(etaMinutes: number): void;
  refuse(): void;
  markReady(): void;
  markPickedUp(): void;
  replay(): void;
}

const initialState: CollectDemoState = {
  step: "menu",
  cart: {},
  order: null,
  orderVisible: false,
  lastEvent: null,
  hintActive: false,
};

const CollectDemoContext = createContext<CollectDemoValue | null>(null);

export function useCollectDemo(): CollectDemoValue {
  const value = useContext(CollectDemoContext);
  if (!value) {
    throw new Error("useCollectDemo hors de CollectDemoProvider.");
  }
  return value;
}

export function CollectDemoProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const sections = useMemo(() => buildDemoMenu(), []);
  const menu = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections]
  );
  const [state, setState] = useState<CollectDemoState>(initialState);
  // Annulations des minuteries en vol — purgées au démontage et au replay.
  const cleanupsRef = useRef(new Set<() => void>());
  const eventIdRef = useRef(0);

  const after = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      cleanupsRef.current.delete(cancel);
      fn();
    }, ms);
    const cancel = () => clearTimeout(id);
    cleanupsRef.current.add(cancel);
  }, []);

  const cancelPending = useCallback(() => {
    cleanupsRef.current.forEach((cancel) => cancel());
    cleanupsRef.current.clear();
  }, []);

  useEffect(() => cancelPending, [cancelPending]);

  const relayEvent = useCallback(
    (direction: DemoRelayEvent["direction"]): DemoRelayEvent => ({
      id: ++eventIdRef.current,
      direction,
    }),
    []
  );

  // La puce guide s'active après un temps d'inactivité : le panier fait
  // partie des dépendances pour que chaque interaction relance le décompte.
  useEffect(() => {
    if (state.hintActive) return;
    const id = setTimeout(
      () => setState((current) => ({ ...current, hintActive: true })),
      COLLECT_DEMO.timings.hintDelayMs
    );
    return () => clearTimeout(id);
  }, [state.step, state.orderVisible, state.hintActive, state.cart]);

  const addItem = useCallback((id: string) => {
    setState((current) => {
      if (current.step !== "menu") return current;
      return {
        ...current,
        hintActive: false,
        cart: { ...current.cart, [id]: (current.cart[id] ?? 0) + 1 },
      };
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setState((current) => {
      if (current.step !== "menu") return current;
      const quantity = current.cart[id] ?? 0;
      if (quantity === 0) return current;
      const cart = { ...current.cart };
      if (quantity === 1) delete cart[id];
      else cart[id] = quantity - 1;
      return { ...current, hintActive: false, cart };
    });
  }, []);

  const openCheckout = useCallback(() => {
    setState((current) =>
      current.step === "menu" && Object.keys(current.cart).length > 0
        ? { ...current, step: "checkout", hintActive: false }
        : current
    );
  }, []);

  const backToMenu = useCallback(() => {
    setState((current) =>
      current.step === "checkout"
        ? { ...current, step: "menu", hintActive: false }
        : current
    );
  }, []);

  const pay = useCallback(() => {
    setState((current) => {
      if (current.step !== "checkout") return current;
      return { ...current, step: "paiement", hintActive: false };
    });
    after(COLLECT_DEMO.timings.paymentMs, () => {
      setState((current) => {
        if (current.step !== "paiement") return current;
        const lines = menu
          .filter((item) => (current.cart[item.id] ?? 0) > 0)
          .map((item) => ({ item, quantity: current.cart[item.id] }));
        const order: DemoOrder = {
          lines,
          total: lines.reduce(
            (sum, line) => sum + line.quantity * line.item.price,
            0
          ),
          customerName: COLLECT_DEMO.customer.name,
          createdAt: new Date().toISOString(),
          etaMinutes: null,
          readyAt: null,
        };
        return {
          ...current,
          step: "en_attente",
          order,
          hintActive: false,
          lastEvent: relayEvent("toRestaurant"),
        };
      });
      after(COLLECT_DEMO.timings.orderArrivalMs, () => {
        setState((current) =>
          current.step === "en_attente"
            ? { ...current, orderVisible: true }
            : current
        );
      });
    });
  }, [after, menu, relayEvent]);

  const accept = useCallback(
    (etaMinutes: number) => {
      setState((current) => {
        if (current.step !== "en_attente" || !current.order) return current;
        return {
          ...current,
          step: "en_preparation",
          hintActive: false,
          lastEvent: relayEvent("toCustomer"),
          order: {
            ...current.order,
            etaMinutes,
            readyAt: new Date(Date.now() + etaMinutes * 60_000).toISOString(),
          },
        };
      });
    },
    [relayEvent]
  );

  const refuse = useCallback(() => {
    setState((current) =>
      current.step === "en_attente" && current.order
        ? {
            ...current,
            step: "annulee",
            hintActive: false,
            lastEvent: relayEvent("toCustomer"),
          }
        : current
    );
  }, [relayEvent]);

  const markReady = useCallback(() => {
    setState((current) =>
      current.step === "en_preparation"
        ? {
            ...current,
            step: "prete",
            hintActive: false,
            lastEvent: relayEvent("toCustomer"),
          }
        : current
    );
  }, [relayEvent]);

  const markPickedUp = useCallback(() => {
    setState((current) =>
      current.step === "prete"
        ? {
            ...current,
            step: "retiree",
            hintActive: false,
            lastEvent: relayEvent("toCustomer"),
          }
        : current
    );
  }, [relayEvent]);

  const replay = useCallback(() => {
    cancelPending();
    setState(initialState);
  }, [cancelPending]);

  const value = useMemo<CollectDemoValue>(
    () => ({
      ...state,
      sections,
      menu,
      addItem,
      removeItem,
      openCheckout,
      backToMenu,
      pay,
      accept,
      refuse,
      markReady,
      markPickedUp,
      replay,
    }),
    [
      state,
      sections,
      menu,
      addItem,
      removeItem,
      openCheckout,
      backToMenu,
      pay,
      accept,
      refuse,
      markReady,
      markPickedUp,
      replay,
    ]
  );

  return (
    <CollectDemoContext.Provider value={value}>
      {children}
    </CollectDemoContext.Provider>
  );
}

/** Volet qui détient la prochaine action (guidage et bascule mobile). */
export function nextActionSide(
  step: DemoStep
): "client" | "restaurant" | null {
  switch (step) {
    case "menu":
    case "checkout":
      return "client";
    case "paiement":
      return null;
    case "en_attente":
    case "en_preparation":
    case "prete":
      return "restaurant";
    case "retiree":
    case "annulee":
      return "client";
  }
}

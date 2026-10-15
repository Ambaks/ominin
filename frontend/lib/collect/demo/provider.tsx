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
import { formatTime } from "@/lib/gestion/format";
import type { OrderItemOption } from "@/lib/gestion/types";
import { DEMO_SLUG, lineName } from "@/lib/menu/format";
import { type Allergen, type MenuItem, type OptionChoice, type OptionGroup } from "@/lib/menu-data";
import {
  buildDemoMenu,
  choiceAllergens,
  COLLECT_DEMO,
  type DemoMenuSection,
  demoRestaurantInfo,
  type DemoRestaurantInfo,
  demoSettings,
  type DemoSettings,
  type DemoStep,
} from "./data";

/*
 * Machine à états de la démo interactive Collect : tout vit en mémoire, les
 * différés (paiement, « webhook ») sont joués par des minuteries — aucun
 * appel réseau. Les deux volets (téléphone client, dashboard restaurant)
 * consomment le même contexte : une action d'un côté se voit de l'autre.
 */

/** Ligne du panier : un article et ses choix ; deux lignes identiques fusionnent. */
export interface DemoLine {
  /** L'article et ses choix (groupe:choix). */
  key: string;
  item: MenuItem;
  /** lineName(item) : le nom avec son format. */
  name: string;
  quantity: number;
  /** Les choix tels que l'écran Commandes les liste sous la ligne. */
  options: OrderItemOption[];
  /** Prix de l'article, suppléments compris. */
  unitPrice: number;
}

/** La ligne d'un article et des choix faits dans sa feuille d'options. */
export function demoLine(
  item: MenuItem,
  choices: { group: OptionGroup; choice: OptionChoice }[] = []
): Omit<DemoLine, "quantity"> {
  return {
    key: [item.id, ...choices.map(({ group, choice }) => `${group.id}:${choice.id}`)].join("+"),
    item,
    name: lineName(item),
    options: choices.map(({ group, choice }) => ({
      groupName: group.name,
      choiceName: choice.name,
      // Un format est déjà dans le prix de la ligne : ni le téléphone ni
      // l'écran du restaurant ne l'affichent en supplément.
      supplement: group.formats ? 0 : choice.supplement,
    })),
    unitPrice: choices.reduce((sum, { choice }) => sum + choice.supplement, item.price),
  };
}

export const cartTotal = (lines: DemoLine[]) =>
  lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

/** Le jour où en est la commande : celui où le restaurant l'a lancée, sinon celui où elle a été passée. */
const orderDay = (order: DemoOrder) => new Date(order.startedAt ?? order.createdAt).toDateString();

/** « demain » devant une heure qui ne tombe pas le jour où en est la commande (comme formatPickup). */
export const dayPrefix = (iso: string, order: DemoOrder) =>
  new Date(iso).toDateString() === orderDay(order) ? "" : "demain ";

/** Le retrait tel que le disent les deux volets : l'heure du créneau, ou dès que possible. */
export const pickupText = (order: DemoOrder) =>
  order.pickupAt ? `${dayPrefix(order.pickupAt, order)}${formatTime(order.pickupAt)}` : "dès que possible";

/** Prête puis retirée, l'heure où c'est arrivé ; avant, l'heure de retrait (les deux volets). */
export function pickupStatus(order: DemoOrder, step: DemoStep): string {
  const at = (iso: string) => `${dayPrefix(iso, order)}à ${formatTime(iso)}`;
  // Une commande à créneau garde son heure de retrait une fois prête, sauf
  // prête à cette heure-là (le premier créneau du lendemain).
  if (step === "prete" && order.preparedAt) {
    const slot = order.pickupAt && Date.parse(order.pickupAt) > Date.parse(order.preparedAt);
    return `Prête ${at(order.preparedAt)}${slot ? ` · retrait ${pickupText(order)}` : ""}`;
  }
  if (step === "retiree" && order.collectedAt) return `Retirée ${at(order.collectedAt)}`;
  return `Retrait : ${pickupText(order)}`;
}

/** La commande a passé la nuit : la démo est au lendemain du jour où elle a été passée. */
export const isNextDay = (order: DemoOrder) =>
  orderDay(order) !== new Date(order.createdAt).toDateString();

export interface DemoOrder {
  lines: DemoLine[];
  total: number;
  customerName: string;
  /** Le créneau (ISO) : l'heure est dite, aucun délai à estimer ; null, dès que possible. */
  pickupAt: string | null;
  createdAt: string;
  etaMinutes: number | null;
  /** « Prête vers » (ISO), posée par accept() pour un retrait dès que possible. */
  readyAt: string | null;
  /** Lancée, marquée prête, puis retirée (ISO). */
  startedAt: string | null;
  preparedAt: string | null;
  collectedAt: string | null;
}

/** Événement traversant le connecteur entre les deux volets. */
export interface DemoRelayEvent {
  id: number;
  direction: "toRestaurant" | "toCustomer";
}

interface CollectDemoState {
  step: DemoStep;
  cart: DemoLine[];
  customerName: string;
  /** Heure de la démo à l'ouverture du paiement : ses créneaux ne bougent plus. */
  checkoutAt: number;
  /**
   * Écart entre l'horloge de la démo et l'heure réelle : posé au premier plat
   * ajouté, à l'ouverture du paiement et au « Rejouer » (DemoSettings.startsAt),
   * ramené à l'ouverture du paiement quand le client paie, puis à l'heure de
   * chaque geste du restaurant.
   */
  clockOffset: number;
  /** Index du créneau choisi : null = « Dès que possible ». */
  pickupSlot: number | null;
  /** Retrait demain plutôt qu'aujourd'hui (créneaux seulement). */
  pickupTomorrow: boolean;
  /** Le dernier choix fait pour chaque jour, retrouvé en y revenant. */
  pickupMemory: Partial<Record<"today" | "tomorrow", number | null>>;
  order: DemoOrder | null;
  /** La commande est visible côté restaurant (après le différé « webhook »). */
  orderVisible: boolean;
  lastEvent: DemoRelayEvent | null;
  /** La puce guide fait respirer le prochain bouton (inactivité). */
  hintActive: boolean;
}

interface CollectDemoValue extends CollectDemoState {
  /** Restaurant joué par la démo (identité, couverture, itinéraire). */
  restaurant: DemoRestaurantInfo;
  /** Menu de la démo groupé par catégorie (navigation du volet client). */
  sections: DemoMenuSection[];
  settings: DemoSettings;
  /** Allergènes du plat de la carte derrière un choix de formule (DemoSettings.choiceDishes). */
  dishAllergens: Map<string, Allergen[]>;
  /** L'heure de la démo (ms), voir DemoSettings.startsAt. */
  now(): number;
  addLine(line: Omit<DemoLine, "quantity">): void;
  /** Retire une unité de l'article, sur la plus récente de ses lignes. */
  removeItem(itemId: string): void;
  setCustomerName(name: string): void;
  setPickupSlot(slot: number | null): void;
  setPickupTomorrow(tomorrow: boolean): void;
  openCheckout(): void;
  backToMenu(): void;
  pay(): void;
  /** Lance la préparation ; null : retrait à un créneau, sans estimation. */
  accept(etaMinutes: number | null): void;
  markReady(): void;
  markPickedUp(): void;
  replay(): void;
}

const initialState: CollectDemoState = {
  step: "menu",
  cart: [],
  customerName: COLLECT_DEMO.customer.name,
  checkoutAt: 0,
  clockOffset: 0,
  pickupSlot: null,
  pickupTomorrow: false,
  pickupMemory: {},
  order: null,
  orderVisible: false,
  lastEvent: null,
  hintActive: false,
};

/** Places restantes sur un créneau ; demain, tout est encore libre. */
export function slotSeats(slot: number, tomorrow: boolean, settings: DemoSettings): number {
  const { capacity, takenBySlot } = COLLECT_DEMO.slots;
  return capacity - (tomorrow ? 0 : ((settings.takenBySlot ?? takenBySlot)[slot] ?? 0));
}

/** Le même jour, à l'heure « HH:MM ». */
function atTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Le créneau n° slot. Comme pickupSlots (lib/collect/hours.ts) : le premier
 * suit le temps de préparation, sur la grille — compté depuis maintenant
 * aujourd'hui, depuis l'ouverture demain.
 */
function slotAt(slot: number, tomorrow: boolean, now: number): Date {
  const { prepMinutes, intervalMinutes, opensAt } = COLLECT_DEMO.slots;
  const time = tomorrow ? atTime(new Date(now), opensAt) : new Date(now);
  if (tomorrow) time.setDate(time.getDate() + 1);
  time.setMinutes(time.getMinutes() + prepMinutes, 0, 0);
  // Arrondi au prochain multiple de intervalMinutes
  const remainder = time.getMinutes() % intervalMinutes;
  if (remainder > 0) time.setMinutes(time.getMinutes() + intervalMinutes - remainder);
  time.setMinutes(time.getMinutes() + slot * intervalMinutes);
  return time;
}

export const formatSlotTime = (slot: number, tomorrow: boolean, now: number) =>
  formatTime(slotAt(slot, tomorrow, now).toISOString());

const CollectDemoContext = createContext<CollectDemoValue | null>(null);

export function useCollectDemo(): CollectDemoValue {
  const value = useContext(CollectDemoContext);
  if (!value) {
    throw new Error("useCollectDemo hors de CollectDemoProvider.");
  }
  return value;
}

export function CollectDemoProvider({
  slug = DEMO_SLUG,
  children,
}: {
  /** Slug du restaurant joué (défaut : la Trattoria de la landing). */
  slug?: string;
  children: React.ReactNode;
}) {
  const restaurant = useMemo(() => demoRestaurantInfo(slug), [slug]);
  const sections = useMemo(() => buildDemoMenu(slug), [slug]);
  const settings = useMemo(() => demoSettings(slug), [slug]);
  const dishAllergens = useMemo(() => choiceAllergens(slug), [slug]);
  // Rang de chaque plat sur la carte : le panier suit son ordre.
  const menuRank = useMemo(
    () =>
      new Map(sections.flatMap((section) => section.items).map((item, rank) => [item.id, rank])),
    [sections]
  );
  // L'horloge de la démo repart de DemoSettings.startsAt ; sans elle, l'heure de l'appareil.
  const startOffset = useCallback(
    () => (settings.startsAt ? atTime(new Date(), settings.startsAt).getTime() - Date.now() : 0),
    [settings.startsAt]
  );
  const [state, setState] = useState<CollectDemoState>(() => ({
    ...initialState,
    clockOffset: startOffset(),
  }));
  const now = useCallback(() => Date.now() + state.clockOffset, [state.clockOffset]);
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

  const addLine = useCallback(
    (line: Omit<DemoLine, "quantity">) => {
      const restart = startOffset();
      setState((current) => {
        if (current.step !== "menu") return current;
        if (current.cart.some((entry) => entry.key === line.key)) {
          return {
            ...current,
            hintActive: false,
            cart: current.cart.map((entry) =>
              entry.key === line.key ? { ...entry, quantity: entry.quantity + 1 } : entry
            ),
          };
        }
        // Une nouvelle ligne prend sa place dans l'ordre de la carte, après
        // celles du même plat.
        const rank = (entry: { item: MenuItem }) => menuRank.get(entry.item.id) ?? 0;
        const at = current.cart.findIndex((entry) => rank(entry) > rank(line));
        const added = { ...line, quantity: 1 };
        return {
          ...current,
          // Le premier plat ajouté remet l'horloge à l'heure de la démo.
          clockOffset: current.cart.length === 0 ? restart : current.clockOffset,
          hintActive: false,
          cart:
            at === -1
              ? [...current.cart, added]
              : [...current.cart.slice(0, at), added, ...current.cart.slice(at)],
        };
      });
    },
    [menuRank, startOffset]
  );

  const removeItem = useCallback((itemId: string) => {
    setState((current) => {
      if (current.step !== "menu") return current;
      const index = current.cart.map((line) => line.item.id).lastIndexOf(itemId);
      if (index === -1) return current;
      return {
        ...current,
        hintActive: false,
        cart: current.cart.flatMap((line, i) =>
          i !== index ? [line] : line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : []
        ),
      };
    });
  }, []);

  // L'horloge repart aussi à l'ouverture du paiement : un panier resté
  // ouvert ne pousse pas les créneaux après le service.
  const openCheckout = useCallback(() => {
    const clockOffset = startOffset();
    const checkoutAt = Date.now() + clockOffset;
    setState((current) =>
      current.step === "menu" && current.cart.length > 0
        ? { ...current, step: "checkout", hintActive: false, clockOffset, checkoutAt }
        : current
    );
  }, [startOffset]);

  const setCustomerName = useCallback((name: string) => {
    setState((current) => ({ ...current, customerName: name }));
  }, []);

  const setPickupSlot = useCallback((slot: number | null) => {
    setState((current) => ({ ...current, pickupSlot: slot }));
  }, []);

  // Changer de jour retrouve le dernier choix fait pour ce jour ; sinon, il
  // garde l'horaire s'il existe ce jour-là (et qu'il y reste de la place),
  // sinon dès que possible aujourd'hui, le premier créneau demain.
  const setPickupTomorrow = useCallback((tomorrow: boolean) => {
    setState((current) => {
      const { pickupSlot, pickupTomorrow, checkoutAt } = current;
      const pickupMemory = {
        ...current.pickupMemory,
        [pickupTomorrow ? "tomorrow" : "today"]: pickupSlot,
      };
      const remembered = pickupMemory[tomorrow ? "tomorrow" : "today"];
      const time =
        pickupSlot === null ? null : formatSlotTime(pickupSlot, pickupTomorrow, checkoutAt);
      const same = Array.from({ length: COLLECT_DEMO.slots.count }, (_, slot) => slot).find(
        (slot) =>
          formatSlotTime(slot, tomorrow, checkoutAt) === time &&
          slotSeats(slot, tomorrow, settings) > 0
      );
      return {
        ...current,
        pickupTomorrow: tomorrow,
        pickupSlot: remembered !== undefined ? remembered : (same ?? (tomorrow ? 0 : null)),
        pickupMemory,
      };
    });
  }, [settings]);

  const backToMenu = useCallback(() => {
    setState((current) =>
      current.step === "checkout"
        ? { ...current, step: "menu", hintActive: false }
        : current
    );
  }, []);

  const pay = useCallback(() => {
    setState((current) => {
      // Comme le vrai formulaire : pas de commande sans nom.
      if (current.step !== "checkout" || !current.customerName.trim()) return current;
      return { ...current, step: "paiement", hintActive: false };
    });
    after(COLLECT_DEMO.timings.paymentMs, () => {
      const real = Date.now();
      setState((current) => {
        if (current.step !== "paiement") return current;
        const pickupAt =
          current.pickupSlot === null
            ? null
            : slotAt(current.pickupSlot, current.pickupTomorrow, current.checkoutAt).toISOString();
        const order: DemoOrder = {
          lines: current.cart,
          total: cartTotal(current.cart),
          customerName: current.customerName.trim(),
          pickupAt,
          // L'heure où le client a ouvert le paiement, celle de ses créneaux :
          // y rester ne pousse pas la commande après son propre créneau.
          createdAt: new Date(current.checkoutAt).toISOString(),
          etaMinutes: null,
          readyAt: null,
          startedAt: null,
          preparedAt: null,
          collectedAt: null,
        };
        return {
          ...current,
          step: current.pickupTomorrow ? "programmee" : "en_attente",
          clockOffset: current.checkoutAt - real,
          order,
          hintActive: false,
          lastEvent: relayEvent("toRestaurant"),
        };
      });
      after(COLLECT_DEMO.timings.orderArrivalMs, () => {
        setState((current) =>
          current.step === "en_attente" || current.step === "programmee"
            ? { ...current, orderVisible: true }
            : current
        );
      });
    });
  }, [after, relayEvent]);

  /*
   * L'horloge de la démo ne compte pas l'attente du présentateur : chaque
   * geste du restaurant la pose à l'heure plausible de l'événement. Lancée à
   * l'heure de la commande — pour demain, au lendemain, assez tôt pour être
   * prête un peu avant le créneau, jamais avant l'ouverture ; prête au plus
   * tôt après la préparation, à l'estimation donnée ou un peu avant le
   * créneau (readyLeadMinutes) ; retirée au créneau, sinon dès qu'elle est prête.
   */
  const accept = useCallback(
    (etaMinutes: number | null) => {
      const real = Date.now();
      setState((current) => {
        if ((current.step !== "en_attente" && current.step !== "programmee") || !current.order) {
          return current;
        }
        const { pickupAt, createdAt } = current.order;
        const { prepMinutes, readyLeadMinutes, opensAt } = COLLECT_DEMO.slots;
        const startedAt =
          current.step === "programmee" && pickupAt
            ? Math.max(
                Date.parse(pickupAt) - (prepMinutes + readyLeadMinutes) * 60_000,
                atTime(new Date(pickupAt), opensAt).getTime()
              )
            : Date.parse(createdAt);
        return {
          ...current,
          step: "en_preparation",
          clockOffset: startedAt - real,
          hintActive: false,
          lastEvent: relayEvent("toCustomer"),
          order: {
            ...current.order,
            etaMinutes,
            readyAt:
              etaMinutes === null
                ? null
                : new Date(startedAt + etaMinutes * 60_000).toISOString(),
            startedAt: new Date(startedAt).toISOString(),
          },
        };
      });
    },
    [relayEvent]
  );

  const markReady = useCallback(() => {
    const real = Date.now();
    setState((current) => {
      if (current.step !== "en_preparation" || !current.order) return current;
      const { pickupAt, readyAt, startedAt } = current.order;
      const { prepMinutes, readyLeadMinutes } = COLLECT_DEMO.slots;
      const prepared = Date.parse(startedAt!) + prepMinutes * 60_000;
      const preparedAt = pickupAt
        ? Math.max(Date.parse(pickupAt) - readyLeadMinutes * 60_000, prepared)
        : readyAt
          ? Date.parse(readyAt)
          : prepared;
      return {
        ...current,
        step: "prete",
        clockOffset: preparedAt - real,
        hintActive: false,
        lastEvent: relayEvent("toCustomer"),
        order: { ...current.order, preparedAt: new Date(preparedAt).toISOString() },
      };
    });
  }, [relayEvent]);

  const markPickedUp = useCallback(() => {
    const real = Date.now();
    setState((current) => {
      if (current.step !== "prete" || !current.order) return current;
      const { pickupAt, preparedAt } = current.order;
      const ready = Date.parse(preparedAt!);
      const collectedAt = pickupAt ? Math.max(Date.parse(pickupAt), ready) : ready;
      return {
        ...current,
        step: "retiree",
        clockOffset: collectedAt - real,
        hintActive: false,
        lastEvent: relayEvent("toCustomer"),
        order: { ...current.order, collectedAt: new Date(collectedAt).toISOString() },
      };
    });
  }, [relayEvent]);

  const replay = useCallback(() => {
    cancelPending();
    setState({ ...initialState, clockOffset: startOffset() });
  }, [cancelPending, startOffset]);

  const value = useMemo<CollectDemoValue>(
    () => ({
      ...state,
      restaurant,
      sections,
      settings,
      dishAllergens,
      now,
      addLine,
      removeItem,
      setCustomerName,
      setPickupSlot,
      setPickupTomorrow,
      openCheckout,
      backToMenu,
      pay,
      accept,
      markReady,
      markPickedUp,
      replay,
    }),
    [
      state,
      restaurant,
      sections,
      settings,
      dishAllergens,
      now,
      addLine,
      removeItem,
      setCustomerName,
      setPickupSlot,
      setPickupTomorrow,
      openCheckout,
      backToMenu,
      pay,
      accept,
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
    case "programmee":
    case "en_preparation":
    case "prete":
      return "restaurant";
    case "retiree":
      return "client";
  }
}

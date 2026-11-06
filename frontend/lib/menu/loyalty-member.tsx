"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchLoyaltyBalance,
  type LoyaltyHistoryEntry,
  type LoyaltyMember,
  type LoyaltyVoucher,
  type LoyaltyWheelConfig,
  type WheelDay,
} from "./loyalty";
import { useTickets } from "./tickets";

/*
 * Le client que ce téléphone a fait retenir (/api/fidelite). La page du menu
 * est en cache et sans cookies : c'est le navigateur qui demande, une fois la
 * carte affichée, au retour sur l'onglet, et quand une commande suivie se
 * règle — les points gagnés à l'encaissement, et le tour de roue qu'elle
 * ouvre, arrivent pendant la visite.
 */

/** Ce qu'un tour a donné : la part, ses points, ou le bon d'une part en nature. */
export interface WheelWin {
  index: number;
  points: number;
  voucher: { label: string; expiresAt: string } | null;
}

/** La roue du jour d'un téléphone reconnu. */
export interface LoyaltyWheelState extends LoyaltyWheelConfig, WheelDay {
  /**
   * Tire la part et crédite ses points (multipliés au tour de la roue dorée)
   * ou son bon sur-le-champ. La roue s'y arrête ensuite : fermer la feuille
   * en route ne perd rien.
   */
  spin: () => Promise<WheelWin>;
  /**
   * Aperçu seulement : le tour du jour s'annule, pour le rejouer devant le
   * gérant ; goldenTurn : les tours d'avant mènent au tour de la roue dorée.
   */
  replay?: (goldenTurn?: boolean) => void;
}

/** Une commande d'aperçu, portée sur la carte de son contact. */
export interface PreviewLoyaltyOrder {
  contact: string;
  firstName?: string;
  /** Retenir le téléphone pour ce contact, comme après une vraie commande. */
  remember: boolean;
  earned: number;
  spent: number;
  /** Articles offerts, « Il Tiramisù, Café Illy ». */
  rewards: string | null;
  /** Les bons de la roue que la commande utilise. */
  vouchers: string[];
  table: number | null;
}

export interface LoyaltyMemberValue {
  /** Le menu peut retenir un téléphone (programme ouvert, vrai menu). */
  enabled: boolean;
  member: LoyaltyMember | null;
  refresh: () => Promise<void>;
  /** Retient ce téléphone pour un contact que la maison connaît déjà. */
  remember: (contact: string, firstName?: string) => Promise<void>;
  /** « Ce n'est pas moi ». */
  forget: () => Promise<void>;
  /** Les lignes de la carte, à l'ouverture de « Ma carte ». */
  loadHistory: () => Promise<LoyaltyHistoryEntry[]>;
  /** Solde d'un contact saisi au panier ; null : programme éteint. */
  balance: (slug: string, contact: string) => Promise<number | null>;
  /** null : pas de roue dans cette maison. */
  wheel: LoyaltyWheelState | null;
  /** Les bons gagnés à la roue, à utiliser, le plus proche de son échéance d'abord. */
  vouchers: LoyaltyVoucher[];
  /** Aperçu seulement : la commande passe sur la carte, rien ne part. */
  recordPreviewOrder?: (order: PreviewLoyaltyOrder) => void;
}

const noop = async () => {};
const DISABLED: LoyaltyMemberValue = {
  enabled: false,
  member: null,
  refresh: noop,
  remember: noop,
  forget: noop,
  loadHistory: async () => [],
  balance: fetchLoyaltyBalance,
  wheel: null,
  vouchers: [],
};

const LoyaltyMemberContext = createContext<LoyaltyMemberValue>(DISABLED);

/** La fidélité d'une carte d'aperçu (loyalty-demo) se branche ici. */
export const LoyaltyMemberValueProvider = LoyaltyMemberContext.Provider;

/**
 * Clé sessionStorage : l'accueil a déjà eu lieu dans cet onglet. Posée aussi
 * quand le client vient de faire retenir son téléphone — un « Bon retour »
 * juste après sa première commande sonnerait faux.
 */
export const greetedKey = (slug: string) => `fidelite-accueil:${slug}`;

async function readJson(response: Response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Fidélité indisponible.");
  // wheel null : pas de roue pour ce téléphone ici.
  return body as LoyaltyBody;
}

type LoyaltyBody = { member: LoyaltyMember | null; wheel?: WheelDay | null; vouchers?: LoyaltyVoucher[] };

export function LoyaltyMemberProvider({
  slug,
  enabled,
  wheel: wheelConfig,
  children,
}: {
  slug: string;
  enabled: boolean;
  /** La roue de la maison (registre) ; absente, pas de roue. */
  wheel?: LoyaltyWheelConfig;
  children: ReactNode;
}) {
  const [member, setMember] = useState<LoyaltyMember | null>(null);
  const [wheelDay, setWheelDay] = useState<WheelDay | null>(null);
  const [vouchers, setVouchers] = useState<LoyaltyVoucher[]>([]);
  const tickets = useTickets()?.tickets;

  const load = useCallback(
    () =>
      fetch(`/api/fidelite?slug=${encodeURIComponent(slug)}`, {
        cache: "no-store",
      }).then(readJson),
    [slug]
  );

  const apply = useCallback((body: LoyaltyBody) => {
    setMember(body.member);
    setWheelDay(body.wheel ?? null);
    setVouchers(body.vouchers ?? []);
  }, []);

  const refresh = useCallback(() => load().then(apply), [load, apply]);

  useEffect(() => {
    if (!enabled) return;
    // Réseau perdu : le client tapera son numéro, comme avant.
    const sync = () => load().then(apply, () => {});
    sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, load, apply]);

  // Une commande suivie vue à régler, puis réglée : ses points sont sur la
  // carte (loyalty_earn), et elle a pu ouvrir le tour du jour.
  const unpaid = useRef(new Set<string>());
  useEffect(() => {
    if (!enabled || !tickets) return;
    let settled = false;
    for (const ticket of tickets) {
      if (ticket.paid === false) unpaid.current.add(ticket.id);
      else if (ticket.paid && unpaid.current.delete(ticket.id)) settled = true;
    }
    if (settled) load().then(apply, () => {});
  }, [enabled, tickets, load, apply]);

  const remember = useCallback(
    async (contact: string, firstName?: string) => {
      const response = await fetch("/api/fidelite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, contact, firstName }),
      });
      const { member: remembered } = await readJson(response);
      try {
        sessionStorage.setItem(greetedKey(slug), "1");
      } catch {}
      setMember(remembered);
      // Un autre contact, un autre tour du jour, d'autres bons : relus avec la carte.
      setWheelDay(null);
      setVouchers([]);
      load().then(apply, () => {});
    },
    [slug, load, apply]
  );

  const loadHistory = useCallback(async () => {
    const response = await fetch(
      `/api/fidelite?slug=${encodeURIComponent(slug)}&historique`,
      { cache: "no-store" }
    );
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Historique indisponible.");
    return body.history as LoyaltyHistoryEntry[];
  }, [slug]);

  const forget = useCallback(async () => {
    setMember(null);
    setWheelDay(null);
    setVouchers([]);
    await fetch("/api/fidelite", { method: "DELETE" });
  }, []);

  // Le tirage se fait au serveur, qui crédite la carte : le solde et le tour
  // du jour se mettent à jour ici ; un bon gagné se relit avec la carte.
  const spin = useCallback(async (): Promise<WheelWin> => {
    const response = await fetch("/api/fidelite/roue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Tour refusé.");
    const { slice, points, spins, voucher } = body as {
      slice: number;
      points: number;
      spins: number;
      voucher: WheelWin["voucher"];
    };
    setWheelDay({ ready: false, played: true, spins });
    setMember((current) =>
      current && current.points !== null ? { ...current, points: current.points + points } : current
    );
    if (voucher) load().then(apply, () => {});
    return { index: slice, points, voucher };
  }, [slug, load, apply]);

  const wheel = useMemo(
    () =>
      wheelConfig && wheelDay && member ? { ...wheelConfig, ...wheelDay, spin } : null,
    [wheelConfig, wheelDay, member, spin]
  );

  const value = useMemo<LoyaltyMemberValue>(
    () =>
      enabled
        ? {
            enabled,
            member,
            refresh,
            remember,
            forget,
            loadHistory,
            balance: fetchLoyaltyBalance,
            wheel,
            vouchers,
          }
        : DISABLED,
    [enabled, member, refresh, remember, forget, loadHistory, wheel, vouchers]
  );

  return (
    <LoyaltyMemberContext.Provider value={value}>
      {children}
    </LoyaltyMemberContext.Provider>
  );
}

export function useLoyaltyMember(): LoyaltyMemberValue {
  return useContext(LoyaltyMemberContext);
}

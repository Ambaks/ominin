"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchLoyaltyBalance,
  type LoyaltyHistoryEntry,
  type LoyaltyMember,
  type LoyaltyWheelConfig,
} from "./loyalty";

/*
 * Le client que ce téléphone a fait retenir (/api/fidelite). La page du menu
 * est en cache et sans cookies : c'est le navigateur qui demande, une fois la
 * carte affichée, puis au retour sur l'onglet — les points gagnés à
 * l'encaissement arrivent pendant le repas.
 */

/** La roue du jour d'un téléphone reconnu. */
export interface LoyaltyWheelState extends LoyaltyWheelConfig {
  /** Le tour d'aujourd'hui reste à jouer. */
  ready: boolean;
  /** Jours d'affilée avec un tour, aujourd'hui compris s'il est joué. */
  streak: number;
  /**
   * Tire la part et crédite ses points sur-le-champ (multipliés un jour de
   * roue dorée). La roue s'y arrête ensuite : fermer la feuille en route ne
   * perd rien.
   */
  spin: () => Promise<{ index: number; points: number }>;
  /**
   * Aperçu seulement : le tour du jour s'annule, pour le rejouer devant le
   * gérant ; goldenDay : la série d'avant passe au jour qui précède la roue dorée.
   */
  replay?: (goldenDay?: boolean) => void;
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

async function readJson(response: Response): Promise<LoyaltyMember | null> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Fidélité indisponible.");
  return body.member;
}

export function LoyaltyMemberProvider({
  slug,
  enabled,
  children,
}: {
  slug: string;
  enabled: boolean;
  children: ReactNode;
}) {
  const [member, setMember] = useState<LoyaltyMember | null>(null);

  const load = useCallback(
    () =>
      fetch(`/api/fidelite?slug=${encodeURIComponent(slug)}`, {
        cache: "no-store",
      }).then(readJson),
    [slug]
  );

  const refresh = useCallback(() => load().then(setMember), [load]);

  useEffect(() => {
    if (!enabled) return;
    // Réseau perdu : le client tapera son numéro, comme avant.
    const sync = () => load().then(setMember, () => {});
    sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, load]);

  const remember = useCallback(
    async (contact: string, firstName?: string) => {
      const response = await fetch("/api/fidelite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, contact, firstName }),
      });
      const remembered = await readJson(response);
      try {
        sessionStorage.setItem(greetedKey(slug), "1");
      } catch {}
      setMember(remembered);
    },
    [slug]
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
    await fetch("/api/fidelite", { method: "DELETE" });
  }, []);

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
            wheel: null,
          }
        : DISABLED,
    [enabled, member, refresh, remember, forget, loadHistory]
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

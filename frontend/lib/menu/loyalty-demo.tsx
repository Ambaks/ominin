"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DemoLoyalty } from "@/lib/menu-data";
import {
  drawSlice,
  type LoyaltyHistoryEntry,
  type LoyaltyMember,
  type LoyaltyWheelConfig,
} from "./loyalty";
import {
  greetedKey,
  LoyaltyMemberValueProvider,
  type LoyaltyMemberValue,
  type PreviewLoyaltyOrder,
} from "./loyalty-member";

/*
 * La fidélité d'une carte d'aperçu (/menu/demo), sans base : les cartes et le
 * téléphone retenu vivent dans le navigateur (localStorage, comme le cookie
 * d'un an du vrai menu). Les tours de roue sont des lignes de la carte : un
 * par jour, la série se lit dans l'historique. Chaque jour, l'aperçu repart
 * de l'habitué du registre : sa série d'hier tient toujours. Le gérant voit tout le
 * parcours — l'habitué accueilli, la roue, « Ma carte », les points d'une
 * commande, puis « Ce n'est pas moi » et un nouveau client retenu — et peut
 * rejouer le tour du jour. Rien ne part chez le vrai établissement.
 */

/** Une ligne de la carte ; filler : un tour ajouté pour montrer la roue dorée. */
type DemoEntry = LoyaltyHistoryEntry & { filler?: true };

interface DemoCard {
  firstName: string | null;
  since: string;
  /** Du plus récent au plus ancien ; le solde en est la somme. */
  history: DemoEntry[];
}

interface DemoState {
  /** Jour de l'ensemencement (localDay) : un autre jour, l'aperçu repart du registre. */
  seededOn: number;
  /** Le contact que ce téléphone a fait retenir ; null après « Ce n'est pas moi ». */
  device: string | null;
  cards: Record<string, DemoCard>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const total = (card: DemoCard) => card.history.reduce((sum, entry) => sum + entry.points, 0);

/** Numéro du jour calendaire local : deux tours le même jour ont le même. */
function localDay(at: string | number): number {
  const date = new Date(at);
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / DAY_MS);
}

/** Les tours de la carte : joué aujourd'hui, et jours d'affilée jusqu'à hier ou aujourd'hui. */
function spins(card: DemoCard | undefined): { today: boolean; streak: number } {
  const days = new Set(
    (card?.history ?? []).filter((entry) => entry.kind === "roue").map((entry) => localDay(entry.at))
  );
  const today = localDay(Date.now());
  const played = days.has(today);
  let streak = 0;
  while (days.has((played ? today : today - 1) - streak)) streak++;
  return { today: played, streak };
}

/** loyalty_contact, dans le navigateur : l'email en minuscules, le numéro en chiffres. */
function normalizeContact(raw: string): string {
  const value = raw.trim();
  if (value.includes("@")) {
    const email = value.toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Adresse email invalide.");
    return email;
  }
  let digits = value.replace(/\D/g, "");
  if (value.startsWith("+")) digits = `00${digits}`;
  if (digits.startsWith("0033")) digits = `0${digits.slice(4)}`;
  if (!/^0\d{8,16}$/.test(digits)) throw new Error("Numéro de téléphone invalide.");
  return digits;
}

/** L'habitué du registre, son historique daté à partir d'aujourd'hui (jours du calendrier). */
function seed({ member }: DemoLoyalty): DemoState {
  const now = Date.now();
  const history = member.history.map(({ daysAgo, ...entry }) => {
    const at = new Date(now);
    at.setDate(at.getDate() - daysAgo);
    return { ...entry, at: at.toISOString() };
  });
  return {
    seededOn: localDay(now),
    device: member.contact,
    cards: {
      [member.contact]: {
        firstName: member.firstName,
        since: history.at(-1)?.at ?? new Date(now).toISOString(),
        history,
      },
    },
  };
}

const newCard = (firstName?: string): DemoCard => ({
  firstName: firstName ?? null,
  since: new Date().toISOString(),
  history: [],
});

/** Les cartes gardées aujourd'hui, si elles ont encore la forme attendue. */
function readState(key: string): DemoState | null {
  try {
    const state = JSON.parse(localStorage.getItem(key) ?? "null");
    const cards = state?.cards;
    const valid =
      state?.seededOn === localDay(Date.now()) &&
      cards &&
      typeof cards === "object" &&
      (state.device === null || state.device in cards) &&
      Object.values(cards).every(
        (card) =>
          Array.isArray((card as DemoCard).history) &&
          (card as DemoCard).history.every((entry) => typeof entry.points === "number")
      );
    return valid ? (state as DemoState) : null;
  } catch {
    return null;
  }
}

function markGreeted(slug: string) {
  try {
    sessionStorage.setItem(greetedKey(slug), "1");
  } catch {}
}

export function DemoLoyaltyProvider({
  slug,
  demo,
  wheel,
  children,
}: {
  slug: string;
  demo: DemoLoyalty;
  wheel?: LoyaltyWheelConfig;
  children: ReactNode;
}) {
  const cardsKey = `fidelite-apercu:${slug}`;
  // Lu après l'hydratation, comme le vrai menu attend /api/fidelite.
  const [state, setState] = useState<DemoState | null>(null);
  // Minuit passé, page ouverte : le tour du nouveau jour s'offre depuis la pastille.
  const [day, setDay] = useState(0);
  useEffect(() => {
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const timer = setTimeout(() => setDay(localDay(Date.now())), midnight.getTime() - Date.now());
    return () => clearTimeout(timer);
  }, [day]);

  useEffect(() => {
    // Une fois : relu, le registre réensemencerait les points en mémoire.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- stockage du navigateur, absent au rendu serveur
    setState((current) => current ?? readState(cardsKey) ?? seed(demo));
  }, [cardsKey, demo]);

  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(cardsKey, JSON.stringify(state));
    } catch {
      // Stockage indisponible (navigation privée) : l'aperçu vaut pour la page.
    }
  }, [cardsKey, state]);

  const update = useCallback(
    (change: (current: DemoState) => DemoState) =>
      setState((current) => (current ? change(current) : current)),
    []
  );

  const addEntries = useCallback(
    (contact: string, entries: LoyaltyHistoryEntry[], options: { remember: boolean; firstName?: string }) =>
      update((current) => {
        const card = current.cards[contact] ?? newCard(options.firstName);
        return {
          ...current,
          device: options.remember ? contact : current.device,
          cards: {
            ...current.cards,
            [contact]: { ...card, history: [...entries, ...card.history] },
          },
        };
      }),
    [update]
  );

  const device = state?.device ?? null;
  const card = device ? state?.cards[device] : undefined;

  const member = useMemo<LoyaltyMember | null>(
    () =>
      device && card
        ? { contact: device, firstName: card.firstName, points: total(card), since: card.since }
        : null,
    [device, card]
  );

  const remember = useCallback(
    async (raw: string, firstName?: string) => {
      const contact = normalizeContact(raw);
      update((current) => {
        const known = current.cards[contact];
        return {
          ...current,
          device: contact,
          cards: {
            ...current.cards,
            [contact]: known
              ? { ...known, firstName: known.firstName ?? firstName ?? null }
              : newCard(firstName),
          },
        };
      });
      markGreeted(slug);
    },
    [update, slug]
  );

  const forget = useCallback(async () => {
    update((current) => ({ ...current, device: null }));
  }, [update]);

  const loadHistory = useCallback(async () => card?.history ?? [], [card]);

  const balance = useCallback(
    async (_slug: string, raw: string) => {
      const known = state?.cards[normalizeContact(raw)];
      return known ? total(known) : 0;
    },
    [state]
  );

  const played = spins(card);

  const spin = useCallback(async () => {
    if (!wheel || !device || played.today) throw new Error("Le tour du jour est joué.");
    const index = drawSlice(wheel.slices);
    const { golden } = wheel;
    const multiplier = golden && (played.streak + 1) % golden.every === 0 ? golden.multiplier : 1;
    const points = wheel.slices[index].points * multiplier;
    addEntries(
      device,
      [{ kind: "roue", points, at: new Date().toISOString(), table: null, rewards: null }],
      { remember: true }
    );
    return { index, points };
  }, [wheel, device, played.today, played.streak, addEntries]);

  const replay = useCallback(
    (goldenDay?: boolean) => {
      const today = localDay(Date.now());
      update((current) => {
        const known = current.device ? current.cards[current.device] : undefined;
        if (!current.device || !known) return current;
        // Rejouer simplement rend aussi la série d'origine : les tours ajoutés partent.
        let history = known.history.filter(
          (entry) => entry.kind !== "roue" || (localDay(entry.at) !== today && (goldenDay || !entry.filler))
        );
        // Les jours manquants de la série reçoivent un petit tour : demain
        // n'existe pas encore, la roue dorée tombe aujourd'hui.
        if (goldenDay && wheel?.golden) {
          const spun = new Set(history.filter((entry) => entry.kind === "roue").map((entry) => localDay(entry.at)));
          const missing = Array.from({ length: wheel.golden.every - 1 }, (_, i) => i + 1)
            .filter((daysAgo) => !spun.has(today - daysAgo))
            .map((daysAgo) => {
              const at = new Date();
              at.setDate(at.getDate() - daysAgo);
              const points = Math.min(...wheel.slices.map((slice) => slice.points));
              return { kind: "roue" as const, points, at: at.toISOString(), table: null, rewards: null, filler: true as const };
            });
          history = [...history, ...missing].sort((a, b) => b.at.localeCompare(a.at));
        }
        return { ...current, cards: { ...current.cards, [current.device]: { ...known, history } } };
      });
    },
    [update, wheel]
  );

  const recordPreviewOrder = useCallback(
    (order: PreviewLoyaltyOrder) => {
      let contact: string;
      try {
        contact = normalizeContact(order.contact);
      } catch {
        return;
      }
      const at = new Date().toISOString();
      addEntries(
        contact,
        [
          ...(order.spent > 0
            ? [{ kind: "depense" as const, points: -order.spent, at, table: order.table, rewards: order.rewards }]
            : []),
          ...(order.earned > 0
            ? [{ kind: "gain" as const, points: order.earned, at, table: order.table, rewards: null }]
            : []),
        ],
        { remember: order.remember, firstName: order.firstName }
      );
      if (order.remember) markGreeted(slug);
    },
    [addEntries, slug]
  );

  const value = useMemo<LoyaltyMemberValue>(
    () => ({
      enabled: true,
      member,
      refresh: async () => {},
      remember,
      forget,
      loadHistory,
      balance,
      wheel:
        wheel && member
          ? { ...wheel, ready: !played.today, streak: played.streak, spin, replay }
          : null,
      recordPreviewOrder,
    }),
    [member, remember, forget, loadHistory, balance, wheel, played.today, played.streak, spin, replay, recordPreviewOrder]
  );

  return <LoyaltyMemberValueProvider value={value}>{children}</LoyaltyMemberValueProvider>;
}

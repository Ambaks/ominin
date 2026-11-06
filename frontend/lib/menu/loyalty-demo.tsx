"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DemoLoyalty } from "@/lib/menu-data";
import {
  drawSlice,
  type LoyaltyHistoryEntry,
  type LoyaltyMember,
  type LoyaltyVoucher,
  type LoyaltyWheelConfig,
  type WheelDay,
} from "./loyalty";
import {
  greetedKey,
  LoyaltyMemberValueProvider,
  type LoyaltyMemberValue,
  type PreviewLoyaltyOrder,
  type WheelWin,
} from "./loyalty-member";

/*
 * La fidélité d'une carte d'aperçu (/menu/demo), sans base : les cartes et le
 * téléphone retenu vivent dans le navigateur (localStorage, comme le cookie
 * d'un an du vrai menu). Les tours de roue sont des lignes de la carte : un
 * par jour, leur compte mène à la roue dorée. Sur le vrai menu, une commande
 * réglée ouvre le tour ; l'aperçu fait comme si l'habitué venait de régler la
 * sienne, et le tour l'attend dès l'ouverture. Chaque jour, l'aperçu repart
 * de l'habitué du registre. Le gérant voit tout le parcours — l'habitué
 * accueilli, la roue, « Ma carte », les points d'une commande, puis « Ce
 * n'est pas moi » et un nouveau client retenu — et peut rejouer le tour du
 * jour. Rien ne part chez le vrai établissement.
 */

/** Une ligne de la carte ; filler : un tour ajouté pour montrer la roue dorée. */
type DemoEntry = LoyaltyHistoryEntry & { filler?: true };

/** Un bon de la roue ; wonAt : le tour qui l'a gagné, que « rejouer » reprend. */
type DemoVoucher = LoyaltyVoucher & { wonAt: string; used?: true };

interface DemoCard {
  firstName: string | null;
  since: string;
  /** Du plus récent au plus ancien ; le solde en est la somme. */
  history: DemoEntry[];
  vouchers?: DemoVoucher[];
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

const isSpin = (entry: DemoEntry) => entry.kind === "roue";

/** Le tour du jour de la carte : à jouer tant qu'il ne l'est pas, et les tours joués. */
function wheelDayOf(card: DemoCard | undefined): WheelDay {
  const turns = (card?.history ?? []).filter(isSpin);
  const today = localDay(Date.now());
  const played = turns.some((entry) => localDay(entry.at) === today);
  return { ready: !played, played, spins: turns.length };
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
          (card as DemoCard).history.every((entry) => typeof entry.points === "number") &&
          ((card as DemoCard).vouchers === undefined || Array.isArray((card as DemoCard).vouchers))
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

  const { ready, played, spins } = wheelDayOf(card);

  // Une part en nature donne un bon pour le palier de l'aperçu à ce prix,
  // comme loyalty_wheel_spin ; sans palier à ce prix, ses points.
  const spin = useCallback(async (): Promise<WheelWin> => {
    if (!wheel || !device || played) throw new Error("Le tour du jour est joué.");
    const index = drawSlice(wheel.slices);
    const slice = wheel.slices[index];
    const at = new Date().toISOString();
    const reward = slice.voucher && demo.rewards.find((candidate) => candidate.points === slice.points);
    if (slice.voucher && reward) {
      const expiresAt = new Date(Date.now() + slice.voucher.days * DAY_MS).toISOString();
      addEntries(device, [{ kind: "roue", points: 0, at, table: null, rewards: reward.label }], { remember: true });
      update((current) => {
        const known = current.cards[device];
        const voucher: DemoVoucher = { id: `bon-${at}`, rewardId: reward.id, label: reward.label, expiresAt, wonAt: at };
        return {
          ...current,
          cards: { ...current.cards, [device]: { ...known, vouchers: [...(known.vouchers ?? []), voucher] } },
        };
      });
      return { index, points: 0, voucher: { label: reward.label, expiresAt } };
    }
    const { golden } = wheel;
    const multiplier = golden && (spins + 1) % golden.every === 0 ? golden.multiplier : 1;
    const points = slice.points * multiplier;
    addEntries(device, [{ kind: "roue", points, at, table: null, rewards: null }], { remember: true });
    return { index, points, voucher: null };
  }, [wheel, device, played, spins, addEntries, update, demo]);

  const vouchers = useMemo(() => card?.vouchers?.filter((voucher) => !voucher.used) ?? [], [card]);

  const replay = useCallback(
    (goldenTurn?: boolean) => {
      const today = localDay(Date.now());
      update((current) => {
        const known = current.device ? current.cards[current.device] : undefined;
        if (!current.device || !known) return current;
        // Rejouer simplement rend aussi les tours d'origine : les tours ajoutés partent,
        // le bon du tour repris avec lui.
        let history = known.history.filter(
          (entry) => !isSpin(entry) || (localDay(entry.at) !== today && (goldenTurn || !entry.filler))
        );
        const vouchers = known.vouchers?.filter((voucher) => localDay(voucher.wonAt) !== today);
        // Des petits tours, un par jour passé sans tour, jusqu'à celui qui
        // précède la roue dorée : le tour d'aujourd'hui la joue.
        if (goldenTurn && wheel?.golden) {
          const { every } = wheel.golden;
          const spun = new Set(history.filter(isSpin).map((entry) => localDay(entry.at)));
          const missing = (every - 1 - (history.filter(isSpin).length % every)) % every;
          const points = Math.min(...wheel.slices.map((slice) => slice.points));
          const fillers: DemoEntry[] = [];
          for (let daysAgo = 1; fillers.length < missing; daysAgo++) {
            if (spun.has(today - daysAgo)) continue;
            const at = new Date();
            at.setDate(at.getDate() - daysAgo);
            fillers.push({ kind: "roue", points, at: at.toISOString(), table: null, rewards: null, filler: true });
          }
          history = [...history, ...fillers].sort((a, b) => b.at.localeCompare(a.at));
        }
        return { ...current, cards: { ...current.cards, [current.device]: { ...known, history, vouchers } } };
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
      if (order.vouchers.length > 0) {
        update((current) => {
          const known = current.cards[contact];
          if (!known?.vouchers) return current;
          const vouchers = known.vouchers.map((voucher) =>
            order.vouchers.includes(voucher.id) ? { ...voucher, used: true as const } : voucher
          );
          return { ...current, cards: { ...current.cards, [contact]: { ...known, vouchers } } };
        });
      }
      if (order.remember) markGreeted(slug);
    },
    [addEntries, update, slug]
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
      wheel: wheel && member ? { ...wheel, ready, played, spins, spin, replay } : null,
      vouchers,
      recordPreviewOrder,
    }),
    [member, remember, forget, loadHistory, balance, wheel, ready, played, spins, spin, replay, vouchers, recordPreviewOrder]
  );

  return <LoyaltyMemberValueProvider value={value}>{children}</LoyaltyMemberValueProvider>;
}

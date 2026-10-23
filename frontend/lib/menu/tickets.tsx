"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { frenchTime } from "@/lib/gestion/format";
import type { OrderStatus } from "@/lib/gestion/types";
import { counterWords } from "@/lib/menu/format";
import { createClient } from "@/lib/supabase/client";
import { useOrderSignal } from "@/lib/supabase/use-order-signal";

/*
 * Les commandes fast food du client, et leur suivi en direct. Chaque commande
 * a son numéro du jour ; order_ticket le rend avec l'état et le contenu du
 * ticket, et le canal Realtime « commande:<id> » signale chaque changement
 * d'état (trigger orders_broadcast_status) — pas d'interrogation périodique.
 * Le signal ne fait que déclencher une relecture : le canal est public, c'est
 * order_ticket qui fait foi.
 *
 * Les identifiants des commandes en cours sont gardés dans le navigateur
 * (localStorage, et non la session de l'onglet : un client qui rescanne le QR
 * ouvre souvent un nouvel onglet, et doit y retrouver son numéro). Une
 * commande remise, annulée, ou d'un autre jour (order_ticket ne rend que
 * celles du jour de numérotation) quitte la liste.
 *
 * À table (`table`, Restaurant.suivi) : les commandes de la table se suivent
 * de même — reçue, en préparation, servie —, et une commande servie reste au
 * bas de l'écran jusqu'à la fermeture de la page, saluée d'un « Bon appétit ! ».
 * Elles n'ont pas de numéro du jour : le client numérote les siennes. En
 * aperçu, sans base ni stockage, une salle simulée les fait avancer seule.
 * Retrait au bar (barPickup) : prête, la commande attend le client au bar,
 * où il montre le code de son ticket ; le scan de l'équipe la dit retirée, et
 * la page la salue comme à table. En fast food (etablissements.bar_pickup),
 * sur son numéro du jour ; à table, dans l'aperçu seulement.
 */

export interface TicketLine {
  name: string;
  quantity: number;
  /** Les choix de la ligne (options, étapes d'une formule), dans l'ordre. */
  choices: string[];
  /** Une formule de l'aperçu : une étape par ligne, comme au panier. */
  formule?: boolean;
}

/** L'heure où la commande devrait être prête, comptée depuis `from` (le règlement). */
export type ReadyEstimate = { from: string; readyAt: string };

export interface Ticket {
  id: string;
  /** Inconnus tant que la première lecture n'est pas revenue. */
  number: number | null;
  status: OrderStatus | null;
  createdAt: string | null;
  total: number | null;
  /** Ce qui reste à régler (une addition peut l'être en partie au comptoir). */
  due: number | null;
  /** Réglée (comptoir ou en ligne) : rien à payer en venant la chercher. */
  paid: boolean | null;
  /** Règlement en ligne commencé, pas encore abouti. */
  paying: boolean;
  lines: TicketLine[];
  /** En cuisine : quand elle sera prête. Rien ne la calcule encore hors aperçu. */
  estimate: ReadyEstimate | null;
  /** Aperçu à table : rien que des boissons, la salutation du service change. */
  drinksOnly?: boolean;
  /** Aperçu à table : rien que des boissons chaudes (une tasse au salut). */
  hotDrinksOnly?: boolean;
  /** Aperçu à table : le pourboire compris dans total, réglé en ligne. */
  tip?: number;
  /** Aperçu à table : à régler, puis réglée, au comptoir (un serveur passe). */
  atCounter?: boolean;
}

/** Ce qu'un ticket d'aperçu montre de la commande : le panier envoyé. */
export type PreviewOrder = {
  status: OrderStatus;
  total: number;
  lines: TicketLine[];
} & Pick<Ticket, "drinksOnly" | "hotDrinksOnly" | "tip">;

type TicketUpdate = Partial<Omit<Ticket, "id">>;

/** La commande attend encore le client : à régler, en préparation ou prête. */
export const isActiveTicket = (ticket: Ticket) =>
  ticket.status !== "servie" && ticket.status !== "annulee";

/** Le mot du service : une commande sans rien à manger se déguste. */
export const servedGreeting = (ticket: Ticket) =>
  ticket.drinksOnly ? "Bonne dégustation\u00a0!" : "Bon appétit\u00a0!";

/**
 * Le client attend : l'écran doit rester allumé pour recevoir « prête » — au
 * bar, jusqu'au scan du code qu'il y montre.
 */
const isWaiting = (ticket: Ticket, bar: boolean) =>
  ticket.status === "en_attente" ||
  ticket.status === "payee" ||
  (bar && ticket.status === "prete");

interface TicketsValue {
  /** Commandes de la visite, de la plus ancienne à la plus récente. */
  tickets: Ticket[];
  /** preview : le contenu d'un ticket d'aperçu, que la base ne connaît pas. */
  add: (orderId: string, preview?: PreviewOrder) => void;
  /** Mise à jour locale, après un geste du client (payer au comptoir). */
  patch: (orderId: string, update: TicketUpdate) => void;
  /** Commande affichée en grand (feuille du ticket), ou null. */
  shownId: string | null;
  /**
   * handOff : le ticket prend la place de la feuille du panier qui se ferme,
   * avec ce qui vient de s'y passer (paiement qui n'a pas pu partir…).
   */
  show: (orderId: string, handOff?: { notices: string[] }) => void;
  hide: () => void;
  notices: string[];
  /** Ouvert en relais d'une autre feuille : il la remplace, sans fondu. */
  handedOff: boolean;
  /** Dernier changement, pour la zone annoncée aux lecteurs d'écran. */
  announcement: string;
  /** Aperçu : la salle est simulée, rien ne vient de la base. */
  simulated: boolean;
  /** Aperçu commercial : l'étape suivante se joue à la main. */
  advance: ((orderId: string) => void) | null;
  /** À table : le numéro de la table ; null en fast food. */
  table: number | null;
  /** La commande se retire au bar, sur présentation de son code. */
  barPickup: boolean;
  /**
   * À table et au bar : la commande servie que la page salue, une à la fois.
   * Le salut attend qu'aucune feuille ne soit ouverte (TicketTracker).
   */
  served: Ticket | null;
  dismissServed: () => void;
}

const TicketsContext = createContext<TicketsValue | null>(null);

/** Null hors fast food et hors suivi à table : aucun ticket à suivre. */
export function useTickets(): TicketsValue | null {
  return useContext(TicketsContext);
}

/** Motif de vibration quand une commande devient prête (ms : vibre, pause, vibre). */
const READY_VIBRATION = [200, 100, 200];

const noSubscription = () => () => {};

function readSaved(key: string): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(saved)
      ? saved.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

/** Le déroulé d'un aperçu : payée, prête, remise. */
const PREVIEW_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  en_attente: "payee",
  payee: "prete",
  prete: "servie",
};

/**
 * Aperçu à table : reçue (payée en ligne, ou à régler — la salle simulée
 * l'encaisse en passant), en préparation, servie.
 */
const PREVIEW_TABLE_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  en_attente: "en_preparation",
  payee: "en_preparation",
  en_preparation: "servie",
};

/** Aperçu à table, retrait au bar : prête, elle attend que le bar scanne son code. */
const PREVIEW_BAR_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  ...PREVIEW_TABLE_NEXT,
  en_preparation: "prete",
  prete: "servie",
};

/**
 * Aperçu à table : le temps que la salle simulée laisse à chaque état, en ms.
 * prete : au bar, le temps d'y venir montrer son code.
 */
const PREVIEW_TABLE_STEP_MS: Partial<Record<OrderStatus, number>> = {
  en_attente: 5_000,
  payee: 5_000,
  en_preparation: 8_000,
  prete: 12_000,
};

/** Aperçu : la préparation simulée d'une commande réglée, en minutes. */
const PREVIEW_PREPARATION_MINUTES = 6;

const previewEstimate = (): ReadyEstimate => {
  const now = Date.now();
  return {
    from: new Date(now).toISOString(),
    readyAt: new Date(now + PREVIEW_PREPARATION_MINUTES * 60_000).toISOString(),
  };
};

/** Ce que disent les tickets quand le paiement par carte n'aboutit pas ; au bar, le bar. */
export const cardNotices = (bar: boolean) => {
  const { place } = counterWords(bar);
  return {
    failed: `Le paiement par carte n’a pas pu démarrer\u00a0: réglez votre commande au\u00a0${place}.`,
    // Refusé, ou le client a choisi le comptoir : le même mot pour les deux.
    declined: `Le paiement par carte n’a pas été fait\u00a0: réglez votre commande au\u00a0${place}.`,
  };
};

/** Ce que dit la zone annoncée quand une commande change d'état. */
const SPOKEN: Partial<Record<OrderStatus, string>> = {
  en_attente: "à régler au comptoir.",
  payee: "en cuisine.",
  prete: "prête\u00a0! Venez la chercher au comptoir.",
  servie: "remise. Bon appétit\u00a0!",
  annulee: "annulée. Adressez-vous au comptoir.",
};

/**
 * À table. Payée en ligne, la commande reçue ne se dit pas : la
 * feuille du paiement vient de dire « Paiement accepté », et le ticket qui
 * s'ouvre, la table et le numéro. La salutation se dit par sa feuille.
 */
const SPOKEN_TABLE: Partial<Record<OrderStatus, string>> = {
  en_attente: "reçue, à régler auprès d’un serveur ou au comptoir.",
  en_preparation: "en préparation.",
  servie: "servie.",
  annulee: "annulée. Adressez-vous à un serveur.",
};

/** Aperçu à table, retrait au bar. */
const SPOKEN_TABLE_BAR: Partial<Record<OrderStatus, string>> = {
  ...SPOKEN_TABLE,
  en_attente: "reçue, à régler au bar.",
  prete: "prête\u00a0! Venez la chercher au bar et montrez votre code.",
  servie: "retirée.",
  annulee: "annulée. Adressez-vous au bar.",
};

/** Fast food, retrait au bar : payée, la commande est en préparation jusqu'à « prête ». */
const SPOKEN_FAST_FOOD_BAR: Partial<Record<OrderStatus, string>> = {
  ...SPOKEN_TABLE_BAR,
  en_attente: "à régler au bar.",
  payee: "en préparation.",
};

const unknownTicket = (id: string): Ticket => ({
  id,
  number: null,
  status: null,
  createdAt: null,
  total: null,
  due: null,
  paid: null,
  paying: false,
  lines: [],
  estimate: null,
});

/** L'heure prévue telle que le ticket l'affiche, tant que la commande est en cuisine. */
const readyTime = (ticket: Ticket) =>
  ticket.status === "payee" && ticket.estimate
    ? frenchTime(new Date(ticket.estimate.readyAt))
    : null;

/**
 * L'écran reste allumé tant que le client attend, carte ouverte ou ticket
 * fermé : un téléphone qui se met en veille coupe la connexion, et le « prête »
 * n'arrive qu'au réveil. Le verrou tombe quand la page passe en arrière-plan ;
 * on le reprend au retour.
 */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let live = true;
    const request = async () => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (live) lock = next;
        else void next.release();
      } catch {
        // Refusé (batterie faible, navigateur) : l'écran suit ses réglages.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void request();
    };
    void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [active]);
}

/** Suit une commande : order_ticket relu à chaque signal (useOrderSignal). */
function TicketWatcher({
  id,
  atTable,
  onUpdate,
}: {
  id: string;
  atTable: boolean;
  onUpdate: (id: string, update: TicketUpdate | null) => void;
}) {
  const load = useCallback(
    async (current: () => boolean) => {
      const { data, error } = await createClient().rpc("order_ticket", { p_order: id });
      // Une lecture en échec (réseau) ne dit rien de la commande : on garde
      // ce qu'on sait, la suivante corrigera.
      if (error || !current()) return;
      const row = data[0];
      onUpdate(
        id,
        row
          ? {
              // À table, pas de numéro du jour : on garde celui du client.
              ...(!atTable && { number: row.order_number }),
              // À table, encaissée veut dire partie en cuisine, à servir.
              status: atTable && row.status === "payee" ? "en_preparation" : row.status,
              createdAt: row.created_at,
              total: Number(row.total),
              due: Number(row.due),
              paid: row.paid,
              paying: row.paying,
              lines: row.items as unknown as TicketLine[],
            }
          : null
      );
    },
    [id, atTable, onUpdate]
  );
  useOrderSignal(id, load);
  return null;
}

/**
 * Aperçu à table : la salle simulée fait passer la commande à l'état suivant
 * au bout de son temps. Une minuterie par commande : « Suivant → » sur l'une
 * ne relance pas celle des autres.
 */
function PreviewService({
  id,
  status,
  onStep,
}: {
  id: string;
  status: OrderStatus;
  onStep: (id: string, from: OrderStatus) => void;
}) {
  useEffect(() => {
    const delay = PREVIEW_TABLE_STEP_MS[status];
    if (delay === undefined) return;
    const timer = setTimeout(() => onStep(id, status), delay);
    return () => clearTimeout(timer);
  }, [id, status, onStep]);
  return null;
}

export function TicketsProvider({
  slug,
  preview = false,
  table = null,
  barPickup = false,
  children,
}: {
  slug: string;
  /** Aperçu : rien n'est lu ni gardé, le ticket se montre sur un numéro fictif. */
  preview?: boolean;
  /** À table (Restaurant.suivi) : la table suivie ; absent, fast food. */
  table?: number | null;
  /** Retrait au bar : en fast food, ou à table dans l'aperçu. */
  barPickup?: boolean;
  children: React.ReactNode;
}) {
  // À table, à part : un QR sans table ne reprend pas les commandes d'une table.
  const storageKey = `ominin-commandes:${slug}${table === null ? "" : ":table"}`;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [shownId, setShownId] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [handedOff, setHandedOff] = useState(false);
  // À table et au bar : les commandes servies à saluer, dans l'ordre.
  const [toGreet, setToGreet] = useState<string[]>([]);

  // Relu une fois après l'hydratation (le serveur n'en sait rien), comme le panier.
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  const [restored, setRestored] = useState(false);
  if (hydrated && !restored) {
    setRestored(true);
    if (!preview) {
      const saved = readSaved(storageKey);
      if (saved.length > 0) {
        setTickets(
          saved.map((id, index) => ({
            ...unknownTicket(id),
            number: table === null ? null : index + 1,
          }))
        );
      }
    }
  }

  /*
   * Ce qui change se dit : aux lecteurs d'écran, par la zone annoncée ; à
   * tous, en rouvrant le ticket quand la commande devient prête ou est
   * annulée — ce que le client attend, ou ce qu'il doit savoir.
   */
  const [seen, setSeen] = useState<Record<string, string>>({});
  const [announcement, setAnnouncement] = useState("");
  // L'état tel que le client le lit : « paiement en cours » compte à part, et
  // l'heure prévue — revue, elle se redit ; les minutes qui passent, non.
  const stateOf = (ticket: Ticket) =>
    `${ticket.status}${ticket.paying ? ":paiement" : ""}${readyTime(ticket) ?? ""}`;
  const changed = tickets.filter(
    (ticket) =>
      ticket.status !== null && ticket.number !== null && seen[ticket.id] !== stateOf(ticket)
  );
  if (changed.length > 0) {
    const next = { ...seen };
    for (const ticket of changed) next[ticket.id] = stateOf(ticket);
    setSeen(next);
    setAnnouncement(
      changed
        .map((ticket) => {
          if (table !== null) {
            const spoken = (barPickup ? SPOKEN_TABLE_BAR : SPOKEN_TABLE)[ticket.status!];
            const where = barPickup ? "retrait au bar" : `table ${table}`;
            return spoken ? `Commande ${ticket.number}, ${where}\u00a0: ${spoken}` : "";
          }
          const spoken = ticket.paying
            ? "paiement en cours."
            : (barPickup ? SPOKEN_FAST_FOOD_BAR : SPOKEN)[ticket.status!];
          const time = readyTime(ticket);
          return spoken
            ? `Commande n° ${ticket.number}\u00a0: ${spoken}${time ? ` Prête vers ${time}.` : ""}`
            : "";
        })
        .filter(Boolean)
        .join(" ")
    );
    // Prête ou annulée : le ticket vient au premier plan, qu'on le voie en
    // direct ou en revenant sur la page (un onglet déchargé pendant l'attente).
    const urgent = changed.find(
      (ticket) => ticket.status === "prete" || ticket.status === "annulee"
    );
    if (urgent) {
      setNotices([]);
      setHandedOff(false);
      setShownId(urgent.id);
    }
    // À table et au bar, la commande servie se salue : la feuille du service
    // prend la place du ticket ouvert, qui disait la même chose en plus petit.
    // Servie sous les yeux du client seulement : retrouvée servie en rouvrant
    // la page, des heures après, elle ne se salue plus.
    const served =
      table === null && !barPickup
        ? []
        : changed.filter((ticket) => ticket.status === "servie" && seen[ticket.id] !== undefined);
    if (served.length > 0) {
      setShownId(null);
      setToGreet([...toGreet, ...served.map((ticket) => ticket.id)]);
    }
  }

  // Commandes que ce tableau ne suit plus : d'un autre jour, ou disparues.
  const [dropped, setDropped] = useState<string[]>([]);
  const activeIds = tickets.filter(isActiveTicket).map((ticket) => ticket.id);
  const activeKey = activeIds.join(",");
  const knownKey = [...tickets.map((ticket) => ticket.id), ...dropped].join(",");
  useEffect(() => {
    if (!restored || preview) return;
    // Un autre onglet a pu enregistrer ses commandes entre-temps : on garde
    // celles que cet onglet ne connaît pas.
    const known = new Set(knownKey.split(","));
    const others = readSaved(storageKey).filter((id) => !known.has(id));
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify([...others, ...(activeKey ? activeKey.split(",") : [])])
      );
    } catch {
      // Stockage refusé : le suivi tient le temps de l'onglet.
    }
  }, [activeKey, knownKey, storageKey, restored, preview]);

  useWakeLock(tickets.some((ticket) => isWaiting(ticket, barPickup)));

  const onUpdate = useCallback((id: string, update: TicketUpdate | null) => {
    if (update === null) setDropped((current) => [...current, id]);
    setTickets((current) =>
      update === null
        ? // Une commande disparue pendant son paiement en ligne (tentative
          // abandonnée, commande supprimée) : le client doit le savoir, elle
          // passe « annulée ». D'un autre jour, elle quitte simplement la liste.
          current.flatMap((ticket) =>
            ticket.id !== id
              ? [ticket]
              : ticket.paying
                ? [{ ...ticket, status: "annulee" as const, paying: false }]
                : []
          )
        : current.map((ticket) => (ticket.id === id ? { ...ticket, ...update } : ticket))
    );
  }, []);

  const add = useCallback(
    (orderId: string, order?: PreviewOrder) => {
      // Gardé tout de suite, sans attendre le rendu : la page peut partir
      // chez Stripe dans l'instant.
      if (!preview) {
        const saved = readSaved(storageKey);
        try {
          if (!saved.includes(orderId)) {
            localStorage.setItem(storageKey, JSON.stringify([...saved, orderId]));
          }
        } catch {
          // Stockage refusé : le suivi tient le temps de l'onglet.
        }
      }
      // À table, la salle simulée sert en quelques secondes : pas d'heure prévue.
      const estimate = order?.status === "payee" && table === null ? previewEstimate() : null;
      setTickets((current) =>
        current.some((ticket) => ticket.id === orderId)
          ? current
          : [
              ...current,
              preview && order
                ? {
                    id: orderId,
                    number: current.length + 1,
                    status: order.status,
                    createdAt: new Date().toISOString(),
                    total: order.total,
                    due: order.status === "en_attente" ? order.total : 0,
                    paid: order.status !== "en_attente",
                    paying: false,
                    lines: order.lines,
                    estimate,
                    drinksOnly: order.drinksOnly,
                    hotDrinksOnly: order.hotDrinksOnly,
                    tip: order.tip,
                    atCounter: table !== null && order.status === "en_attente",
                  }
                : { ...unknownTicket(orderId), number: table === null ? null : current.length + 1 },
            ]
      );
    },
    [preview, storageKey, table]
  );

  // from : l'état que la minuterie a vu ; passé à la main entre-temps, la
  // commande ne saute pas une étape.
  const step = useCallback((orderId: string, from?: OrderStatus) => {
    const flow =
      table === null ? PREVIEW_NEXT : barPickup ? PREVIEW_BAR_NEXT : PREVIEW_TABLE_NEXT;
    setTickets((current) =>
      current.map((ticket) => {
        const next = ticket.status && flow[ticket.status];
        return ticket.id === orderId && next && (from === undefined || ticket.status === from)
          ? {
              ...ticket,
              status: next,
              paid: true,
              due: 0,
              // Réglée au comptoir : l'estimation part de maintenant.
              estimate: next === "payee" ? previewEstimate() : ticket.estimate,
            }
          : ticket;
      })
    );
  }, [table, barPickup]);

  // Une commande qui devient prête se signale même onglet en arrière-plan :
  // le titre de la page le dit, et le téléphone vibre là où il sait le faire.
  const readyNumbers = tickets
    .filter((ticket) => ticket.status === "prete" && ticket.number !== null)
    .map((ticket) => ticket.number)
    .join(", ");
  useEffect(() => {
    if (!readyNumbers) return;
    const title = document.title;
    document.title = `Prête · N° ${readyNumbers}`;
    navigator.vibrate?.(READY_VIBRATION);
    return () => {
      document.title = title;
    };
  }, [readyNumbers]);

  const value = useMemo<TicketsValue>(
    () => ({
      tickets,
      add,
      patch: onUpdate,
      shownId,
      show: (orderId, handOff) => {
        setNotices(handOff?.notices ?? []);
        setHandedOff(handOff !== undefined);
        setShownId(orderId);
      },
      hide: () => setShownId(null),
      notices,
      handedOff,
      announcement,
      advance: preview ? step : null,
      simulated: preview,
      table,
      barPickup,
      served: tickets.find((ticket) => ticket.id === toGreet[0]) ?? null,
      dismissServed: () => {
        setToGreet((current) => current.slice(1));
        // Un ticket qui attendait derrière le salut n'en prend pas le relais :
        // il monte, comme ouvert à la main.
        setHandedOff(false);
        // Au bar, une autre commande prête attend d'être scannée : le dernier
        // salut refermé, son code revient à l'écran.
        const ready = tickets.find((ticket) => ticket.status === "prete");
        if (barPickup && toGreet.length === 1 && ready) setShownId(ready.id);
      },
    }),
    [
      tickets,
      add,
      onUpdate,
      shownId,
      notices,
      handedOff,
      announcement,
      preview,
      step,
      table,
      barPickup,
      toGreet,
    ]
  );

  return (
    <TicketsContext.Provider value={value}>
      {!preview &&
        activeIds.map((id) => (
          <TicketWatcher key={id} id={id} atTable={table !== null} onUpdate={onUpdate} />
        ))}
      {preview && table !== null &&
        tickets.map(
          (ticket) =>
            ticket.status && (
              <PreviewService key={ticket.id} id={ticket.id} status={ticket.status} onStep={step} />
            )
        )}
      {children}
    </TicketsContext.Provider>
  );
}

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
import type { RealtimeChannel } from "@supabase/supabase-js";
import { frenchTime } from "@/lib/gestion/format";
import type { OrderStatus } from "@/lib/gestion/types";
import { createClient } from "@/lib/supabase/client";

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
 */

export interface TicketLine {
  name: string;
  quantity: number;
  /** Les choix de la ligne (options, étapes d'une formule), dans l'ordre. */
  choices: string[];
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
}

/** Ce qu'un ticket d'aperçu montre de la commande : le panier envoyé. */
export type PreviewOrder = {
  status: OrderStatus;
  total: number;
  lines: TicketLine[];
};

type TicketUpdate = Partial<Omit<Ticket, "id">>;

/** La commande attend encore le client : à régler, en préparation ou prête. */
export const isActiveTicket = (ticket: Ticket) =>
  ticket.status !== "servie" && ticket.status !== "annulee";

/** Le client attend : l'écran doit rester allumé pour recevoir « prête ». */
const isWaiting = (ticket: Ticket) =>
  ticket.status === "en_attente" || ticket.status === "payee";

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
   * handOff : le ticket prend la place d'une feuille qui se ferme (le panier,
   * le retour de paiement), avec ce qui vient de s'y passer (paiement qui n'a
   * pas pu partir…).
   */
  show: (orderId: string, handOff?: { notices: string[] }) => void;
  hide: () => void;
  notices: string[];
  /** Ouvert en relais d'une autre feuille : il la remplace, sans fondu. */
  handedOff: boolean;
  /** Dernier changement, pour la zone annoncée aux lecteurs d'écran. */
  announcement: string;
  /** Aperçu commercial : l'étape suivante se joue à la main. */
  advance: ((orderId: string) => void) | null;
}

const TicketsContext = createContext<TicketsValue | null>(null);

/** Null hors fast food : aucun ticket à suivre. */
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

/** Aperçu : la préparation simulée d'une commande réglée, en minutes. */
const PREVIEW_PREPARATION_MINUTES = 6;

const previewEstimate = (): ReadyEstimate => {
  const now = Date.now();
  return {
    from: new Date(now).toISOString(),
    readyAt: new Date(now + PREVIEW_PREPARATION_MINUTES * 60_000).toISOString(),
  };
};

/** Ce que disent les tickets quand le paiement par carte n'aboutit pas. */
export const CARD_NOTICES = {
  failed: "Le paiement par carte n’a pas pu démarrer\u00a0: réglez votre commande au\u00a0comptoir.",
  // Refusé, ou le client a choisi le comptoir : le même mot pour les deux.
  declined: "Le paiement par carte n’a pas été fait\u00a0: réglez votre commande au\u00a0comptoir.",
};

/** Ce que dit la zone annoncée quand une commande change d'état. */
const SPOKEN: Partial<Record<OrderStatus, string>> = {
  en_attente: "à régler au comptoir.",
  payee: "en cuisine.",
  prete: "prête\u00a0! Venez la chercher au comptoir.",
  servie: "remise. Bon appétit\u00a0!",
  annulee: "annulée. Adressez-vous au comptoir.",
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

/**
 * Suit une commande : une lecture tout de suite, puis à chaque signal du
 * canal, à chaque (re)connexion et à chaque retour au premier plan — un
 * téléphone en veille perd sa connexion, et ce qui a changé pendant ce temps
 * n'a pas été signalé. Seule la dernière lecture lancée compte : une réponse
 * partie avant un changement ne l'efface pas en arrivant après.
 */
function TicketWatcher({
  id,
  onUpdate,
}: {
  id: string;
  onUpdate: (id: string, update: TicketUpdate | null) => void;
}) {
  useEffect(() => {
    const supabase = createClient();
    const topic = `commande:${id}`;
    let live = true;
    let latest = 0;
    let channel: RealtimeChannel | null = null;
    const load = async () => {
      const request = ++latest;
      const { data, error } = await supabase.rpc("order_ticket", { p_order: id });
      // Une lecture en échec (réseau) ne dit rien de la commande : on garde
      // ce qu'on sait, la suivante corrigera.
      if (!live || error || request !== latest) return;
      const row = data[0];
      onUpdate(
        id,
        row
          ? {
              number: row.order_number,
              status: row.status,
              createdAt: row.created_at,
              total: Number(row.total),
              due: Number(row.due),
              paid: row.paid,
              paying: row.paying,
              lines: row.items as unknown as TicketLine[],
            }
          : null
      );
    };
    const subscribe = async () => {
      // channel() rend le canal existant du même sujet, même en train de
      // fermer (démontage puis remontage) : l'abonnement ne partirait jamais.
      // On attend qu'il soit parti.
      const closing = supabase
        .getChannels()
        .find((candidate) => candidate.topic === `realtime:${topic}`);
      if (closing) await supabase.removeChannel(closing);
      if (!live) return;
      channel = supabase
        .channel(topic)
        .on("broadcast", { event: "statut" }, () => void load())
        .subscribe((state) => {
          if (state === "SUBSCRIBED") void load();
        });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    void load();
    void subscribe();
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [id, onUpdate]);
  return null;
}

export function TicketsProvider({
  slug,
  preview = false,
  children,
}: {
  slug: string;
  /** Aperçu : rien n'est lu ni gardé, le ticket se montre sur un numéro fictif. */
  preview?: boolean;
  children: React.ReactNode;
}) {
  const storageKey = `ominin-commandes:${slug}`;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [shownId, setShownId] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [handedOff, setHandedOff] = useState(false);

  // Relu une fois après l'hydratation (le serveur n'en sait rien), comme le panier.
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  const [restored, setRestored] = useState(false);
  if (hydrated && !restored) {
    setRestored(true);
    if (!preview) {
      const saved = readSaved(storageKey);
      if (saved.length > 0) setTickets(saved.map(unknownTicket));
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
          const spoken = ticket.paying ? "paiement en cours." : SPOKEN[ticket.status!];
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

  useWakeLock(tickets.some(isWaiting));

  const onUpdate = useCallback((id: string, update: TicketUpdate | null) => {
    if (update === null) setDropped((current) => [...current, id]);
    setTickets((current) =>
      update === null
        ? // Une commande disparue pendant son paiement en ligne (session
          // expirée, commande supprimée) : le client doit le savoir, elle
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
      const estimate = order?.status === "payee" ? previewEstimate() : null;
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
                  }
                : unknownTicket(orderId),
            ]
      );
    },
    [preview, storageKey]
  );

  const advance = useCallback((orderId: string) => {
    // Réglée au comptoir : l'estimation part de maintenant.
    const estimate = previewEstimate();
    setTickets((current) =>
      current.map((ticket) => {
        const next = ticket.status && PREVIEW_NEXT[ticket.status];
        return ticket.id === orderId && next
          ? {
              ...ticket,
              status: next,
              paid: true,
              due: 0,
              estimate: next === "payee" ? estimate : ticket.estimate,
            }
          : ticket;
      })
    );
  }, []);

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
      advance: preview ? advance : null,
    }),
    [tickets, add, onUpdate, shownId, notices, handedOff, announcement, preview, advance]
  );

  return (
    <TicketsContext.Provider value={value}>
      {!preview &&
        activeIds.map((id) => <TicketWatcher key={id} id={id} onUpdate={onUpdate} />)}
      {children}
    </TicketsContext.Provider>
  );
}

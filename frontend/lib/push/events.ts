import type { OrderStatus, Role } from "@/lib/gestion/types";

/*
 * Domaine des notifications push du back-office. Quatre événements couvrent
 * le service : l'arrivée d'une commande (cuisine et serveur de la table), la
 * commande prête (salle), l'annulation (cuisine, pour arrêter la
 * préparation) et l'appel serveur depuis le menu QR. Les identifiants sont
 * ceux stockés dans push_notified et notification_prefs.
 */

export type PushEvent =
  | "nouvelle_commande"
  | "commande_prete"
  | "commande_annulee"
  | "appel_serveur";

export const PUSH_EVENTS: PushEvent[] = [
  "nouvelle_commande",
  "commande_prete",
  "commande_annulee",
  "appel_serveur",
];

export const PUSH_EVENT_LABELS: Record<PushEvent, string> = {
  nouvelle_commande: "Nouvelles commandes",
  commande_prete: "Commandes prêtes",
  commande_annulee: "Annulations",
  appel_serveur: "Appels serveur",
};

export const PUSH_EVENT_HINTS: Record<PushEvent, string> = {
  nouvelle_commande:
    "Une commande arrive en cuisine, sur place ou à emporter.",
  commande_prete: "Un plat est prêt à servir ou une commande prête à retirer.",
  commande_annulee: "Une commande en cours est annulée.",
  appel_serveur: "Un client appelle depuis le menu de sa table.",
};

/**
 * Défauts par rôle, appliqués tant que le membre n'a pas enregistré ses
 * préférences : la cuisine reçoit les arrivées et les annulations, la salle
 * les arrivées, les commandes prêtes et les appels, le gérant tout.
 */
export const ROLE_DEFAULT_PREFS: Record<Role, Record<PushEvent, boolean>> = {
  gerant: { nouvelle_commande: true, commande_prete: true, commande_annulee: true, appel_serveur: true },
  cuisinier: { nouvelle_commande: true, commande_prete: false, commande_annulee: true, appel_serveur: false },
  serveur: { nouvelle_commande: true, commande_prete: true, commande_annulee: false, appel_serveur: true },
};

/**
 * Fenêtre minimale entre deux appels serveur d'une même table. Partagée entre
 * l'envoi (verrou call_throttle) et le bouton client (période de repos).
 */
export const CALL_THROTTLE_MS = 60 * 1000;

/** Statut de commande dont l'atteinte déclenche un événement push. */
export const STATUS_PUSH_EVENT: Partial<Record<OrderStatus, PushEvent>> = {
  en_attente: "nouvelle_commande",
  prete: "commande_prete",
  annulee: "commande_annulee",
};

/** Corps de la requête POST /api/push/dispatch. */
export interface DispatchBody {
  orderId: string;
  event: PushEvent;
}

/**
 * Charge utile chiffrée envoyée à l'appareil, lue par le service worker
 * (public/sw.js — dupliquer tout changement de forme là-bas).
 */
export interface PushPayload {
  title: string;
  body: string;
  /** Regroupe les notifications d'une même commande sur l'écran verrouillé. */
  tag: string;
  /** Ouverte au clic, relative au host de l'appareil (gestion partagée). */
  url: string;
  /** « essai » : notification de test depuis la page Notifications. */
  event: PushEvent | "essai";
}

/**
 * Signale un événement de commande au serveur d'envoi, sans attendre ni
 * échouer : la notification est un à-côté, la mutation reste maîtresse.
 * `keepalive` laisse la requête survivre à une navigation (redirection
 * Stripe juste après l'envoi d'une commande).
 */
export function notifyOrderEvent(orderId: string, status: OrderStatus): void {
  const event = STATUS_PUSH_EVENT[status];
  if (!event) return;
  const body: DispatchBody = { orderId, event };
  void fetch("/api/push/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

/*
 * Réglages du connecteur HubRise : tout ce qui se règle vit ici, rien en
 * ligne dans le code. Valeurs choisies par le propriétaire le 2026-10-19 ;
 * seuls les secrets et les URL passent par l'environnement
 * (HUBRISE_CLIENT_ID, HUBRISE_CLIENT_SECRET, HUBRISE_API_URL,
 * HUBRISE_MANAGER_URL).
 */

export const HUBRISE = {
  /** Toutes les sommes Ominin sont en euros. */
  currency: "EUR",

  /** Délai d'attente d'une réponse de HubRise avant de la tenir pour perdue. */
  httpTimeoutMs: 15_000,

  outbox: {
    /** Premier délai avant de renvoyer ; il double ensuite, jusqu'au plafond. */
    retryInitialDelayS: 30,
    retryMultiplier: 2,
    retryMaxDelayS: 15 * 60,
    /** Après ce nombre d'envois, la commande est abandonnée et l'admin alerté. */
    maxAttempts: 8,
    /** Les envois réussis sont purgés après ce délai. */
    retentionDays: 30,
  },

  /** Relecture complète du catalogue, des stocks et des horaires (callbacks perdus). */
  reconcileIntervalMin: 60,
  /**
   * Un catalogue modifié est relu une fois ce calme revenu : GET /catalogs/:id
   * est plafonné à 10 requêtes par minute.
   */
  catalogDebounceS: 30,
  /** Une commande restée « new » au-delà alerte l'admin. */
  stuckNewMinutes: 5,
  /** Durée de vie du state anti-CSRF posé en cookie pendant l'autorisation. */
  oauthStateTtlS: 600,

  /**
   * Portées demandées, et rien de plus : orders.write pour les commandes,
   * customer_list.write pour les clients, catalog.read pour les références,
   * inventory.write pour lire et pousser les stocks.
   */
  scope: "location[orders.write,customer_list.write,catalog.read,inventory.write]",
  /** Événements reçus : ceux de nos commandes, du catalogue, des stocks, du lieu. */
  callbackEvents: {
    own_order: ["update"],
    catalog: ["update"],
    inventory: ["update", "patch"],
    location: ["update"],
  },

  /**
   * Marque des règlements qu'Ominin porte chez HubRise (private_ref
   * « ominin:<jambe> ») : ceux de la caisse ne l'ont pas.
   */
  paymentPrivateRefPrefix: "ominin:",

  /** Libellés envoyés à la caisse quand le restaurant n'en a pas réglé d'autre. */
  labels: {
    payment: "Carte (Ominin)",
    /** Encaissé au comptoir dans Ominin : espèces, ou carte au terminal. */
    cash: "Espèces",
    card: "Carte",
    tip: "Pourboire",
  },
} as const;

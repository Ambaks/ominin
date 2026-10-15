import type { Hours } from "@/lib/demo/reseau/data";

/*
 * Vue groupe de démonstration : les établissements d'un même propriétaire et
 * les réglages de la journée simulée qui les anime (./simulation). Les
 * adresses, horaires, cartes et logos sont réels — les cartes se lisent dans
 * le registre (lib/menu-data), par slug ; tout le reste (tables, CA moyen,
 * part du QR, rythmes) est une hypothèse, dite comme telle sur la page.
 */

/** Ce qu'un client commande, lu dans les catégories de la carte de chaque adresse. */
export type Kind =
  | "cafe"
  | "petitDej"
  | "soft"
  | "biere"
  | "vin"
  | "cocktail"
  | "alcool"
  | "partage"
  | "plat"
  | "dessert";

export type DrinkKind = Extract<Kind, "cafe" | "soft" | "biere" | "vin" | "cocktail" | "alcool">;

/** Les moments d'une journée de bar-brasserie, du matin à la fermeture. */
export type Moment = "matin" | "midi" | "apresMidi" | "apero" | "diner" | "nuit";

export interface MomentRules {
  /** Début du moment (« HH:MM ») ; il dure jusqu'au début du suivant. */
  from: string;
  /** La boisson de chaque convive, tirée selon ces poids. */
  drinks: Partial<Record<DrinkKind, number>>;
  /** Le plat de chaque convive, avec cette probabilité (cuisine ouverte seulement). */
  food?: { kind: Extract<Kind, "plat" | "petitDej" | "dessert">; chance: number };
  /** Une assiette à partager pour la table, avec cette probabilité. */
  share?: number;
  /** Tournées de la table : la première, puis jusqu'à `rounds[1]` en tout. */
  rounds: readonly [min: number, max: number];
  /** À chaque nouvelle tournée, chaque convive reprend à boire avec cette probabilité. */
  again: number;
  /** Après un repas, la tournée suivante : dessert et café par convive. */
  afterMeal?: { dessert: number; cafe: number };
  /** Minutes entre le service d'une tournée et la commande de la suivante. */
  gapMinutes: readonly [min: number, max: number];
}

export interface Venue {
  /** Le slug de la carte dans le registre (lib/menu-data) : nom, carte, adresse. */
  slug: string;
  /** Le nom court des lignes serrées (le détail d'une tranche du graphique). */
  short: string;
  /**
   * La couleur de l'adresse dans la vue : celle de l'enseigne quand elle se
   * distingue des autres, sinon une teinte voisine. Les quatre passent le
   * contrôle daltonien sur le fond de la vue, toutes paires confondues ; le
   * rouge reste aux retards (le Victoria, rouge à son enseigne, est en bleu).
   */
  color: string;
  /** L'emblème rond de l'enseigne ; ring : un liseré, quand le disque est noir sur noir. */
  avatar: { src: string; ring?: boolean };
  hours: Hours;
  /** Service de la cuisine ; hors de ces heures, on ne commande qu'à boire. */
  kitchen: Hours;
  happyHour?: Hours;
  /** Hypothèse : tables en salle et en terrasse. */
  tables: number;
  /** CA annuel hors taxes qui dimensionne la journée, et d'où vient le chiffre (dit sur la page). */
  revenue: { annualHT: number; basis: string };
  /** Part des commandes passées par les clients au QR ; les autres, saisies par l'équipe. */
  qrShare: number;
  /** Part des commandes QR réglées en ligne ; les autres, au comptoir. */
  onlineShare: number;
  /** Les catégories de la carte (ids du registre) derrière chaque genre de commande. */
  kinds: Partial<Record<Kind, string[]>>;
  /** Un article rangé ailleurs que sa catégorie (une carte « Happy hour » mêle pintes, vins et cocktails), par id. */
  itemKinds?: Record<string, Kind>;
  /** Ce que la journée de cette adresse suppose de particulier, dit sur sa carte et dans les hypothèses. */
  note?: string;
  /** Catégories servies le midi seulement (le menu du midi). */
  lunchOnly?: string[];
  /**
   * Le nom d'un article sur le fil et au classement, par id, quand celui de la
   * carte ne se comprend pas seul (« Duo ») ou en double un autre (le cocktail
   * et la pizza Margarita) : deux articles d'une adresse ne partagent jamais un nom.
   */
  names?: Record<string, string>;
  /** Arrivées de tables : un fond d'ouverture et les pointes du jour (heure, écart-type en minutes, poids). */
  traffic: { base: number; peaks: readonly { at: string; sigma: number; weight: number }[] };
  /** Équipe pointée : au calme, puis en plus au plus fort du jour. */
  staff: readonly [calm: number, extraAtPeak: number];
}

export interface GroupFixture {
  slug: string;
  /** Le nom que le groupe se donne. */
  name: string;
  venues: Venue[];
  moments: Record<Moment, MomentRules>;
  /** Convives par table : poids de 1, 2, 3… personnes. */
  partySizes: readonly number[];
  /** Affluence selon le jour (0 = dimanche). */
  weekday: readonly number[];
  /** TVA moyenne d'une addition de bar-brasserie (boissons alcoolisées à 20 %, le reste à 10 %) : du CA hors taxes aux prix de la carte. */
  vatAverage: number;
  /** Écart-type de l'aléa quotidien d'une adresse (log-normal). */
  dailyNoise: number;
  timing: {
    /** Minutes entre l'arrivée à table et la première commande. */
    firstOrderMinutes: readonly [min: number, max: number];
    /** Secondes du règlement en ligne, puis de l'envoi du ticket au bar ou en cuisine. */
    onlinePaySeconds: readonly [min: number, max: number];
    ticketSeconds: readonly [min: number, max: number];
    /**
     * Minutes avant qu'un serveur vienne encaisser à la table, terminal en
     * main : une commande QR « à régler au comptoir », et une commande prise
     * par l'équipe (le client règle quand elle est saisie). Le ticket part
     * une fois la commande réglée, comme dans l'espace de gestion.
     */
    counterPayMinutes: readonly [min: number, max: number];
    staffPayMinutes: readonly [min: number, max: number];
    /** Préparation, en minutes, selon ce qu'il y a de plus long dans la commande. */
    prepMinutes: Record<"bar" | "partage" | "plat" | "petitDej" | "dessert", readonly [min: number, max: number]>;
    /** Minutes entre « prête » et « servie ». */
    serveMinutes: readonly [min: number, max: number];
    /** Au plus fort du jour, préparation et service s'allongent de cette part. */
    rushSlowdown: number;
    /** Écart-type (log) de l'aléa de préparation : quelques commandes traînent. */
    prepNoise: number;
    /** Minutes passées à table après la dernière tournée servie. */
    lingerMinutes: readonly [min: number, max: number];
    /** Plus de tournée dans les tant de minutes avant la fermeture, plus d'arrivée dans les tant de minutes. */
    lastCallMinutes: number;
    lastArrivalMinutes: number;
  };
  /** Sans plats (un bar à tapas), le convive qui aurait pris un plat partage une assiette avec cette probabilité. */
  shareInsteadOfPlat: number;
  /** Tables de la journée étalon qui mesure la recette d'une table (./catalog, côté serveur). */
  calibrationTables: number;
  /** Au-delà, une commande pas encore servie est en retard (minutes depuis l'envoi du ticket). */
  lateMinutes: { bar: number; cuisine: number };
  /** Une commande qui attend d'être encaissée depuis plus de tant de minutes est signalée : son ticket n'est pas parti. */
  paymentWaitMinutes: number;
  /** Une adresse en retard de plus de cette part sur la semaine dernière, à la même heure, est signalée. */
  behindShare: number;
  /** Prix au-delà duquel un article se commande rarement (une bouteille, une planche géante), en € par genre. */
  priceCaps: Record<Kind, number>;
  /**
   * Ce qui se commande dans une catégorie (./catalog) : le poids du n-ième
   * article, 1 / (1 + rankDecay · n) ; d'une catégorie, son nombre
   * d'articles à la puissance categoryExponent ; d'un article au-delà du
   * plafond, ce facteur ; du menu du midi, à midi, ce multiple.
   */
  catalog: { rankDecay: number; categoryExponent: number; overCapWeight: number; lunchBoost: number };
  /** Un vin de plus de tant d'€ est une bouteille : une pour `perGuests` convives. */
  bottle: { above: number; perGuests: number };
  /** Heure (h) où le jour de service bascule : avant, c'est la nuit de la veille. */
  dayStartHour: number;
  /** Jour simulé quand ?heure= impose l'horloge sans ?jour= : une capture refaite reste identique. */
  referenceDay: string;
  display: {
    /** Tranches des courbes et de l'équipe, en minutes ; graduation de l'axe des heures, en heures. */
    bucketMinutes: number;
    tickHours: number;
    /** Lignes de l'échelle des ventes, au plus. */
    gridLines: number;
    /** L'estimation de fin de journée s'arrondit à tant d'euros : c'est un ordre de grandeur. */
    projectionRoundEuros: number;
    /** Fenêtre du délai de service affiché (commandes servies dans les tant de minutes). */
    serviceWindowMinutes: number;
    /** Commandes du fil en direct, et celles montrées au téléphone avant « Voir les N dernières ». */
    feedSize: number;
    feedPreview: number;
    /**
     * L'estimation de fin de journée (au rythme de la semaine dernière), et la
     * comparaison en pourcentage, ne s'affichent qu'une fois passée cette part
     * de la recette de la semaine dernière : plus tôt, sur trois cafés, elles
     * ne diraient rien (« +481 % »).
     */
    projectionFrom: number;
    /** La table depuis laquelle s'ouvrent les cartes côté client. */
    clientTable: number;
    /**
     * Hors service, la page propose l'instant de démonstration (`at`, le jour
     * de référence) et de rejouer la soirée depuis `replayFrom`, `replaySpeed`
     * fois plus vite.
     */
    showcase: { at: string; replayFrom: string; replaySpeed: number };
    /** Articles du classement de chaque adresse. */
    topItems: number;
    /** Jours du bilan. */
    periodDays: number;
    tweenMs: number;
    tickMs: number;
    fastTickMs: number;
    /** Une commande arrivée depuis moins de tant de secondes simulées s'annonce (fil, carte). */
    freshSeconds: number;
  };
}

/*
 * Le Groupe CKL (Med Belkhir, JSK Holding), tel qu'il se nomme sur son site
 * cafedesarts34.fr : Le Victoria, Le Novelty et le Café des Arts autour de la
 * place Castellane, la Brasserie Laissac place Alexandre-Laissac
 * (demos/groupe-ecusson/research/01-groupe.md). Horaires et cuisine : site du
 * groupe et fiches (demos/<slug>/profile.json). CA : comptes 2024 publiés des
 * sociétés d'exploitation (C.K.L, TGT, NEWVELTY). Tables : déduites des
 * capacités annoncées (150 au Victoria, 150 places en terrasse au Café des
 * Arts plus trois salles, 50 au Novelty), aucune source n'en donne le nombre.
 */
export const ckl: GroupFixture = {
  slug: "ckl",
  name: "Groupe CKL",
  venues: [
    {
      slug: "cafe-des-arts",
      short: "Café des Arts",
      color: "#f0379a",
      avatar: { src: "/cafe-des-arts/icon.png" },
      hours: ["10:00", "01:00"],
      kitchen: ["11:30", "23:00"],
      // « Généralement de 16h à 23h » (site du groupe) ; Privateaser dit 17h–21h.
      happyHour: ["16:00", "23:00"],
      tables: 70,
      revenue: { annualHT: 2_601_633, basis: "CA 2024 publié" },
      qrShare: 0.6,
      onlineShare: 0.5,
      kinds: {
        cafe: ["boissons-chaudes"],
        petitDej: ["petit-dejeuners"],
        soft: ["boissons-fraiches", "milkshake", "cocktails-sans-alcool"],
        biere: ["bieres-pression", "bieres-bouteille"],
        vin: ["aperitifs", "vins-blanc", "vins-rose", "vins-rouge", "vins-petillant", "champagnes"],
        cocktail: ["cocktails", "special"],
        alcool: ["rhums", "vodka", "gin", "whisky", "tequila", "digestifs-liqueurs"],
        partage: ["entrees", "bruschettas"],
        plat: ["menu-brasserie", "menu-25", "salades-xxl", "pizzas-tomate", "pizzas-creme", "poissons", "pates", "viandes-burgers"],
        dessert: ["coupes-glacees", "desserts-maison"],
      },
      lunchOnly: ["menu-brasserie"],
      names: {
        uno: "Menu Brasserie Uno",
        duo: "Menu Brasserie Duo",
        trio: "Menu Brasserie Trio",
        "pizza-margarita": "Pizza Margarita",
        "blanc-hortus": "Bergerie de l’Hortus blanc",
        "rose-hortus": "Bergerie de l’Hortus rosé",
        "rouge-hortus": "Bergerie de l’Hortus rouge",
        "rose-grezan-faugeres": "Château Grezan rosé",
        "rouge-grezan-faugeres": "Château Grezan rouge",
      },
      traffic: {
        base: 0.5,
        peaks: [
          { at: "12:50", sigma: 45, weight: 3 },
          { at: "16:30", sigma: 80, weight: 0.9 },
          { at: "18:45", sigma: 80, weight: 1.3 },
          { at: "20:45", sigma: 50, weight: 1.4 },
          { at: "22:45", sigma: 60, weight: 0.7 },
        ],
      },
      staff: [4, 8],
    },
    {
      slug: "le-victoria",
      short: "Victoria",
      color: "#5aa9ff",
      avatar: { src: "/le-victoria/badge.webp", ring: true },
      hours: ["10:00", "01:00"],
      kitchen: ["10:00", "01:00"],
      happyHour: ["16:00", "01:00"],
      tables: 45,
      revenue: { annualHT: 1_687_153, basis: "CA 2024 publié" },
      qrShare: 0.6,
      onlineShare: 0.5,
      names: { "coca-cola-1l": "Coca-Cola 1 L", "faugeres-rouge": "Faugères rouge", "faugeres-rose": "Faugères rosé" },
      kinds: {
        soft: ["softs"],
        biere: ["bieres"],
        vin: ["vins-rouges", "vins-blancs", "vins-roses"],
        cocktail: ["cocktails"],
        partage: ["tapas"],
        plat: ["burgers", "pizzas", "salades", "plats"],
        dessert: ["desserts", "crepes", "gaufres"],
      },
      traffic: {
        base: 0.5,
        peaks: [
          { at: "12:45", sigma: 45, weight: 1.4 },
          { at: "16:30", sigma: 70, weight: 1 },
          { at: "18:15", sigma: 80, weight: 2.6 },
          { at: "22:30", sigma: 70, weight: 1 },
        ],
      },
      staff: [3, 6],
    },
    {
      slug: "le-novelty",
      short: "Novelty",
      color: "#e8c96a",
      avatar: { src: "/le-novelty/logo.webp" },
      hours: ["08:30", "01:00"],
      kitchen: ["09:00", "23:00"],
      happyHour: ["17:00", "23:00"],
      tables: 25,
      revenue: { annualHT: 829_260, basis: "CA 2024 publié" },
      qrShare: 0.65,
      onlineShare: 0.6,
      kinds: {
        cafe: ["boissons-chaudes"],
        soft: ["boissons-fraiches", "sans-alcool"],
        biere: ["pression", "bouteilles"],
        cocktail: ["cocktails", "signatures"],
        partage: ["planches", "tapas", "incontournables"],
      },
      traffic: {
        base: 0.4,
        peaks: [
          { at: "10:00", sigma: 60, weight: 0.6 },
          { at: "17:30", sigma: 60, weight: 0.8 },
          { at: "19:00", sigma: 80, weight: 1.5 },
          { at: "22:15", sigma: 70, weight: 2.4 },
        ],
      },
      staff: [2, 3],
    },
    {
      slug: "brasserie-laissac",
      short: "Laissac",
      // Or et noir à son enseigne, comme le Novelty : la vue lui donne le vert, la teinte qui reste distincte des trois autres.
      color: "#3fc79b",
      avatar: { src: "/brasserie-laissac/icon.png", ring: true },
      hours: ["09:00", "01:00"],
      // « Service NON STOP 11h30-00h00 » (ardoise du comptoir).
      kitchen: ["11:30", "00:00"],
      happyHour: ["17:00", "23:00"],
      tables: 30,
      revenue: { annualHT: 900_000, basis: "estimé d’après ses ≈ 100 places : la société, créée en 2026, n’a pas encore publié de comptes" },
      qrShare: 0.6,
      onlineShare: 0.5,
      note: "Boissons au prix happy hour toute la journée : ce sont les seuls publiés.",
      kinds: {
        petitDej: ["petit-dejeuner-gouter"],
        cocktail: ["happy-hour"],
        partage: ["tapas"],
        plat: ["formule-midi", "burgers", "salades", "pizzas-tomate", "pizzas-creme"],
        dessert: ["desserts", "glaces"],
      },
      itemKinds: {
        "pinte-blonde": "biere",
        "pinte-monaco": "biere",
        chardonnay: "vin",
        "vin-moelleux": "vin",
        "formule-gouter": "dessert",
      },
      lunchOnly: ["formule-midi"],
      names: { "plat-1-dessert": "Formule midi ①", "plat-2-dessert": "Formule midi ②" },
      traffic: {
        base: 0.5,
        peaks: [
          { at: "10:00", sigma: 60, weight: 0.7 },
          { at: "12:45", sigma: 45, weight: 2.2 },
          { at: "17:30", sigma: 60, weight: 0.7 },
          { at: "18:30", sigma: 75, weight: 1.4 },
          { at: "20:30", sigma: 50, weight: 1 },
        ],
      },
      staff: [2, 4],
    },
  ],
  moments: {
    matin: { from: "05:00", drinks: { cafe: 0.85, soft: 0.15 }, food: { kind: "petitDej", chance: 0.25 }, rounds: [1, 1], again: 0, gapMinutes: [10, 20] },
    midi: {
      from: "11:30",
      drinks: { soft: 0.32, biere: 0.3, vin: 0.2, cafe: 0.18 },
      food: { kind: "plat", chance: 0.9 },
      share: 0.1,
      rounds: [1, 2],
      again: 0,
      afterMeal: { dessert: 0.3, cafe: 0.5 },
      gapMinutes: [20, 35],
    },
    apresMidi: {
      from: "14:30",
      drinks: { cafe: 0.3, soft: 0.25, biere: 0.33, cocktail: 0.12 },
      food: { kind: "dessert", chance: 0.2 },
      rounds: [1, 2],
      again: 0.3,
      gapMinutes: [20, 40],
    },
    apero: {
      from: "17:30",
      drinks: { biere: 0.45, cocktail: 0.4, soft: 0.1, vin: 0.05 },
      share: 0.45,
      rounds: [1, 3],
      again: 0.6,
      gapMinutes: [15, 35],
    },
    diner: {
      from: "20:30",
      drinks: { biere: 0.3, cocktail: 0.3, vin: 0.2, soft: 0.2 },
      food: { kind: "plat", chance: 0.75 },
      share: 0.2,
      rounds: [1, 2],
      again: 0.2,
      afterMeal: { dessert: 0.3, cafe: 0.25 },
      gapMinutes: [25, 40],
    },
    nuit: {
      from: "22:30",
      drinks: { cocktail: 0.45, biere: 0.4, alcool: 0.1, soft: 0.05 },
      share: 0.1,
      rounds: [1, 3],
      again: 0.6,
      gapMinutes: [15, 35],
    },
  },
  partySizes: [0.2, 0.4, 0.15, 0.15, 0.05, 0.05],
  weekday: [0.95, 0.75, 0.8, 0.9, 1.05, 1.3, 1.4],
  vatAverage: 0.14,
  dailyNoise: 0.05,
  timing: {
    firstOrderMinutes: [2, 6],
    onlinePaySeconds: [35, 110],
    ticketSeconds: [4, 15],
    counterPayMinutes: [2, 8],
    staffPayMinutes: [0.5, 3],
    prepMinutes: { bar: [1.5, 4], partage: [7, 12], plat: [11, 18], petitDej: [4, 8], dessert: [3, 6] },
    serveMinutes: [0.5, 2.5],
    rushSlowdown: 0.4,
    prepNoise: 0.25,
    lingerMinutes: [10, 30],
    lastCallMinutes: 15,
    lastArrivalMinutes: 30,
  },
  shareInsteadOfPlat: 0.4,
  calibrationTables: 4000,
  lateMinutes: { bar: 10, cuisine: 25 },
  paymentWaitMinutes: 7,
  behindShare: 0.1,
  priceCaps: { cafe: 6, petitDej: 12, soft: 7, biere: 9, vin: 30, cocktail: 14, alcool: 14, partage: 30, plat: 26, dessert: 10 },
  catalog: { rankDecay: 0.35, categoryExponent: 0.8, overCapWeight: 0.03, lunchBoost: 3 },
  bottle: { above: 12, perGuests: 3 },
  dayStartHour: 5,
  referenceDay: "2026-10-10",
  display: {
    bucketMinutes: 30,
    tickHours: 2,
    gridLines: 5,
    projectionRoundEuros: 100,
    serviceWindowMinutes: 60,
    feedSize: 14,
    feedPreview: 5,
    projectionFrom: 0.1,
    clientTable: 12,
    showcase: { at: "19:40", replayFrom: "18:00", replaySpeed: 30 },
    topItems: 3,
    periodDays: 7,
    tweenMs: 700,
    tickMs: 1000,
    fastTickMs: 250,
    freshSeconds: 90,
  },
};

const groups = [ckl];

export function getGroup(slug: string): GroupFixture | undefined {
  return groups.find((group) => group.slug === slug);
}

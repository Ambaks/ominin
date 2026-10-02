/*
 * Vue réseau de démonstration : le parc d'une enseigne et les réglages de la
 * simulation qui l'anime. Tout ce que la page affiche en découle — aucune
 * donnée réelle de commande. Les restaurants, eux, sont réels : noms tels que
 * le réseau les écrit, adresses, horaires et coordonnées relevés sur
 * ocroustipouletoriginal.com/nos-restaurants (2026-09-29), plus Vichy (BAN) et
 * Paris 10e (Château-d'Eau), annoncés sur LinkedIn mais absents du site.
 */

/** « HH:MM » ; une fermeture avant l'ouverture tombe la nuit suivante. */
export type Hours = readonly [open: string, close: string];

export interface NetworkRestaurant {
  id: string;
  name: string;
  address: string;
  country: "FR" | "CH";
  lat: number;
  lng: number;
  hours: Hours;
  /** Horaires d'un jour particulier (0 = dimanche). */
  hoursByDay?: Partial<Record<number, Hours>>;
  /**
   * Ouverture : sources publiques quand elles existent, sinon estimée. Seules
   * la montée en charge simulée et la pastille « Nouveau » s'en servent.
   */
  openedOn: string;
  /** Zone de chalandise : 1 = ville moyenne. */
  volume: number;
}

export interface Product {
  name: string;
  /** Centimes. */
  price: number;
}

interface Weighted {
  product: Product;
  weight: number;
}

export interface NetworkFixture {
  slug: string;
  name: string;
  /** Le nom complet de l'enseigne, en tête de page. */
  fullName: string;
  /** Le CA moyen annoncé par l'enseigne, tel qu'on le cite (la simulation s'y cale). */
  announcedRevenue: string;
  /** Pays du réseau, dans l'ordre d'affichage. */
  countries: string;
  restaurants: NetworkRestaurant[];
  basket: {
    /** Le plat principal : un menu, en un ou plusieurs exemplaires… */
    menus: (Weighted & { quantities: number[] })[];
    /** … ou, avec ce poids, un à `alaCarteMax` articles à la carte. */
    alaCarteWeight: number;
    alaCarte: Weighted[];
    alaCarteMax: number;
    /** Suppléments (accompagnements, desserts, snacks) et leurs probabilités d'ajout. */
    extras: Weighted[];
    extraChances: number[];
  };
  simulation: Simulation;
  display: Display;
}

export interface Simulation {
  /** CA moyen annoncé par l'enseigne : 800 000 €/an, soit ≈ 2 200 €/jour. */
  dailyRevenue: number;
  /**
   * Part des commandes passées par QR : l'hypothèse de la démonstration, que
   * le lecteur choisit sur la page (`choices`, `initial` par défaut). Chaque
   * restaurant s'en écarte d'au plus `spread`.
   */
  adoption: { choices: readonly number[]; initial: number; spread: number };
  /** Temps de caisse d'un client (commande et encaissement), en minutes, et caisses par restaurant. */
  tillMinutes: number;
  tills: number;
  /** Part de ces commandes réglées en ligne plutôt qu'au comptoir. */
  onlineShare: readonly [min: number, max: number];
  /** Affluence selon le jour (0 = dimanche). */
  weekday: readonly number[];
  /** Écart-type de l'aléa quotidien d'un restaurant (log-normal). */
  dailyNoise: number;
  /** Pointes du déjeuner et du dîner, sur un fond continu d'ouverture. */
  /** Pointes du jour ; `name` les désigne dans le texte (« le rush de midi »). */
  peaks: readonly { at: string; sigmaMinutes: number; weight: number; name: string }[];
  baseWeight: number;
  /** Montée en charge d'un restaurant récent : l'engouement des premiers jours, l'adoption du QR ensuite. */
  opening: { buzz: number; buzzDays: number; adoptionStart: number; adoptionDays: number };
  /**
   * Comptoir : une file unique, clients du comptoir compris. Le passe est
   * dimensionné pour la pointe prévue du restaurant — il y tourne à
   * `peakLoad` de sa capacité —, à `passMaxMinutes` au plus par commande
   * dans les petites boutiques. Chaque commande se prépare ensuite en
   * `prepMinutes` (+ par article au-delà du premier), multipliés par la
   * cadence propre au restaurant (`prepSpeed`), à un aléa log-normal près.
   */
  kitchen: {
    peakLoad: readonly [min: number, max: number];
    prepSpeed: readonly [min: number, max: number];
    passMaxMinutes: number;
    prepMinutes: number;
    prepPerItem: number;
    prepNoise: number;
  };
  /** Minutes entre une commande par QR non réglée en ligne et l'arrivée du client en caisse. */
  counterPayMinutes: readonly [min: number, max: number];
  /** Minutes entre « prête » et le retrait. */
  pickupMinutes: readonly [min: number, max: number];
  /** Écart toléré entre l'heure annoncée et l'heure réelle, en minutes. */
  estimateToleranceMinutes: number;
  /** En rush : attente annoncée (arrondie, celle affichée) d'au moins `waitMinutes`. */
  rush: { waitMinutes: number };
  /** Fenêtre de l'activité récente (taille des points de la carte), en minutes. */
  recentMinutes: number;
  /** Pastille « Nouveau » : restaurant ouvert depuis moins de `newDays` jours. */
  newDays: number;
  /** Rayon du maillage visé par l'enseigne, en km. */
  coverageKm: number;
  /** Heure (h) où le jour de service bascule : avant, c'est la nuit de la veille. */
  dayStartHour: number;
  /** Jour simulé quand ?heure= impose l'horloge sans ?jour= : une capture refaite un autre jour reste identique. */
  referenceDay: string;
}

export interface Display {
  /**
   * Fenêtre des courbes (commandes par tranche de tant de minutes) ; pas
   * d'échantillonnage de cette fenêtre glissante, plus fin : la courbe revue
   * plus tard repasse par le rythme lu en direct ; graduation de l'axe des
   * heures ; marge au-dessus du maximum ; demi-fenêtre, en minutes, de la
   * moyenne glissante qui lisse la courbe de la semaine dernière.
   */
  bucketMinutes: number;
  sampleMinutes: number;
  tickHours: number;
  headroom: number;
  /** Graduations de l'axe des commandes, au plus ; dans la fiche d'un restaurant. */
  chartTicks: number;
  panelChartTicks: number;
  smoothingMinutes: number;
  /** Demi-fenêtre, en minutes, qui lisse la courbe du jour sans la décaler. */
  todaySmoothingMinutes: number;
  /** Attente en caisse sans QR sous laquelle la tuile montre plutôt le pic du jour, en minutes. */
  tillQuietMinutes: number;
  /** Fermeture qui borne les courbes : celle de cette part des restaurants, les plus tardifs exclus. */
  closingQuantile: number;
  /** Commandes listées dans le fil en direct ; au téléphone, les premières seulement. */
  feedLength: number;
  feedPreview: number;
  /** Restaurants en rush listés au téléphone avant « Voir les N ». */
  rushPreview: number;
  /** Restaurants du classement montrés avant « Voir les 40 », hors plein écran. */
  rankingPreview: number;
  /** Durée de la transition d'un chiffre qui change, en ms. */
  tweenMs: number;
  /** Pas de l'horloge, en ms ; plus court quand ?vitesse= l'accélère. */
  tickMs: number;
  fastTickMs: number;
  /** Onde d'une nouvelle commande sur la carte : si elle date de moins de tant de secondes simulées. */
  rippleSeconds: number;
  /**
   * Carte, en unités du fond (la France tient dans 1 000 de large) : rayon
   * des points proportionnel à l'activité récente — plein à `fullAt`
   * commandes sur la fenêtre, pour qu'une après-midi calme se voie calme —, et restaurants à
   * moins de `clusterUnder` l'un de l'autre (Dijon, Chalon, Montpellier,
   * Paris) écartés en couronne de `clusterRadius` pour rester lisibles.
   * Les pastilles des restaurants en rush font `markerRem` de haut, et se
   * fondent en une seule à moins de `markerGapRem` l'une de l'autre ;
   * l'étiquette du restaurant ouvert, d'environ `labelRem` de long, se pose
   * du côté où elle n'en couvre aucune. La France garde `marginRem` aux
   * bords du cadre.
   */
  map: {
    dotMin: number;
    dotMax: number;
    fullAt: number;
    closedDot: number;
    clusterUnder: number;
    clusterRadius: number;
    markerRem: number;
    markerGapRem: number;
    labelRem: number;
    marginRem: number;
  };
}

const solo = { name: "Menu Solo", price: 690 };
const costaud = { name: "Menu Costaud", price: 1250 };
const duo = { name: "Menu Duo", price: 1700 };
const gourmand = { name: "Menu Gourmand", price: 1950 };
const family = { name: "Menu Family", price: 3150 };

export const oCroustiPoulet: NetworkFixture = {
  slug: "o-crousti-poulet",
  name: "O’Crousti Poulet",
  fullName: "O’Crousti Poulet Original",
  announcedRevenue: "≈\u00a0800\u00a0k€ par restaurant et par an",
  countries: "France, Suisse",
  restaurants: [
    { id: "dijon-jeannin", name: "Dijon, Jeannin", address: "85 rue Jeannin, 21000 Dijon", country: "FR", lat: 47.3215, lng: 5.048, hours: ["11:00", "23:00"], openedOn: "2022-05-06", volume: 1.15 },
    { id: "dijon-dumont", name: "Dijon, Dumont", address: "28 rue Charles Dumont, 21000 Dijon", country: "FR", lat: 47.3105, lng: 5.0387, hours: ["11:00", "23:00"], openedOn: "2024-11-15", volume: 0.95 },
    { id: "dijon-reggio", name: "Dijon, Reggio", address: "6 impasse de Reggio, 21000 Dijon", country: "FR", lat: 47.323, lng: 5.057, hours: ["11:00", "23:00"], openedOn: "2026-04-01", volume: 0.8 },
    { id: "chalon-st-cosme", name: "Chalon, Saint-Cosme", address: "19 Grande Rue Saint-Cosme, 71100 Chalon-sur-Saône", country: "FR", lat: 46.7787, lng: 4.849, hours: ["11:30", "23:00"], openedOn: "2024-06-01", volume: 0.95 },
    { id: "chalon-rue-de-dijon", name: "Chalon, Rue de Dijon", address: "4 rue de Dijon, 71100 Chalon-sur-Saône", country: "FR", lat: 46.7861, lng: 4.8566, hours: ["11:30", "23:00"], openedOn: "2024-12-15", volume: 0.85 },
    { id: "chalon-jean-jaures", name: "Chalon, Jean Jaurès", address: "20 avenue Jean Jaurès, 71100 Chalon-sur-Saône", country: "FR", lat: 46.78252, lng: 4.845172, hours: ["11:30", "23:00"], openedOn: "2025-03-01", volume: 0.9 },
    { id: "macon", name: "Mâcon", address: "27 rue Joseph Dufour, 71000 Mâcon", country: "FR", lat: 46.3036, lng: 4.8311, hours: ["11:30", "23:00"], openedOn: "2025-11-15", volume: 0.9 },
    { id: "dole", name: "Dole", address: "18 avenue de la Paix, 39100 Dole", country: "FR", lat: 47.0966, lng: 5.495, hours: ["11:30", "23:00"], openedOn: "2025-06-01", volume: 0.75 },
    { id: "besancon", name: "Besançon", address: "33 rue d’Arènes, 25000 Besançon", country: "FR", lat: 47.2393, lng: 6.0186, hours: ["11:30", "23:00"], openedOn: "2025-10-01", volume: 1.05 },
    { id: "belfort", name: "Belfort", address: "87 avenue Jean Jaurès, 90000 Belfort", country: "FR", lat: 47.6492, lng: 6.8531, hours: ["11:30", "22:45"], openedOn: "2024-10-01", volume: 0.9 },
    { id: "montbeliard", name: "Montbéliard", address: "37 avenue des Alliés, 25200 Montbéliard", country: "FR", lat: 47.5115, lng: 6.8001, hours: ["11:30", "23:00"], openedOn: "2025-07-01", volume: 0.9 },
    { id: "vesoul", name: "Vesoul", address: "6 rue des Bains, 70000 Vesoul", country: "FR", lat: 47.6197, lng: 6.1563, hours: ["11:30", "23:00"], openedOn: "2026-05-30", volume: 0.75 },
    { id: "mulhouse", name: "Mulhouse", address: "42 avenue de Colmar, 68100 Mulhouse", country: "FR", lat: 47.7527, lng: 7.3375, hours: ["11:30", "23:00"], openedOn: "2025-10-15", volume: 1.1 },
    { id: "colmar", name: "Colmar", address: "1a rue du Nord, 68000 Colmar", country: "FR", lat: 48.0798, lng: 7.362, hours: ["11:00", "01:00"], openedOn: "2026-07-18", volume: 0.95 },
    { id: "nancy", name: "Nancy", address: "39 rue Saint-Dizier, 54000 Nancy", country: "FR", lat: 48.6906, lng: 6.1827, hours: ["11:30", "23:00"], openedOn: "2025-12-04", volume: 1.15 },
    { id: "metz", name: "Metz", address: "17 rue du Change, 57000 Metz", country: "FR", lat: 49.1175, lng: 6.1789, hours: ["11:30", "23:00"], openedOn: "2026-02-14", volume: 1.1 },
    { id: "pont-a-mousson", name: "Pont-à-Mousson", address: "8 rue Victor Hugo, 54700 Pont-à-Mousson", country: "FR", lat: 48.9026, lng: 6.0534, hours: ["11:30", "23:00"], openedOn: "2026-04-18", volume: 0.7 },
    { id: "epinal", name: "Épinal", address: "15 place Jeanne d’Arc, 88000 Épinal", country: "FR", lat: 48.1775, lng: 6.4468, hours: ["11:30", "23:00"], openedOn: "2025-12-06", volume: 0.85 },
    { id: "troyes", name: "Troyes", address: "56 rue du Général de Gaulle, 10000 Troyes", country: "FR", lat: 48.2993, lng: 4.0745, hours: ["11:30", "23:00"], openedOn: "2026-05-30", volume: 0.95 },
    { id: "meyzieu", name: "Meyzieu", address: "41 rue de la République, 69330 Meyzieu", country: "FR", lat: 45.7669, lng: 4.9997, hours: ["11:00", "23:30"], openedOn: "2026-04-04", volume: 0.85 },
    { id: "montelimar", name: "Montélimar", address: "13 rue Pierre Julien, 26200 Montélimar", country: "FR", lat: 44.556, lng: 4.7497, hours: ["11:30", "23:00"], openedOn: "2026-03-07", volume: 0.8 },
    { id: "saint-etienne", name: "Saint-Étienne", address: "56 rue du Onze Novembre, 42100 Saint-Étienne", country: "FR", lat: 45.4258, lng: 4.3907, hours: ["11:30", "23:00"], openedOn: "2026-04-25", volume: 1.05 },
    { id: "bourg-en-bresse", name: "Bourg-en-Bresse", address: "31 rue Charles Robin, 01000 Bourg-en-Bresse", country: "FR", lat: 46.2058, lng: 5.2311, hours: ["11:30", "23:00"], openedOn: "2026-05-23", volume: 0.85 },
    { id: "ferney-voltaire", name: "Ferney-Voltaire", address: "27 avenue du Jura, 01210 Ferney-Voltaire", country: "FR", lat: 46.258127, lng: 6.112872, hours: ["11:00", "23:00"], openedOn: "2026-06-27", volume: 0.75 },
    { id: "lyon-vaise", name: "Lyon Vaise", address: "46 quai Jaÿr, 69009 Lyon", country: "FR", lat: 45.774, lng: 4.8088, hours: ["11:30", "23:00"], openedOn: "2026-07-25", volume: 1.2 },
    { id: "villefranche", name: "Villefranche-sur-Saône", address: "205 rue d’Anse, 69400 Villefranche-sur-Saône", country: "FR", lat: 45.983759, lng: 4.718045, hours: ["11:00", "23:30"], openedOn: "2026-09-26", volume: 0.9 },
    { id: "lausanne", name: "Lausanne", address: "Rue de l’Ale 42, 1003 Lausanne", country: "CH", lat: 46.5237001, lng: 6.6279283, hours: ["11:30", "22:00"], hoursByDay: { 0: ["12:00", "22:00"] }, openedOn: "2026-09-12", volume: 1.05 },
    { id: "antibes", name: "Antibes", address: "2 bis avenue de l’Estérel, 06160 Antibes", country: "FR", lat: 43.5701, lng: 7.1093, hours: ["11:00", "23:00"], openedOn: "2025-08-15", volume: 0.95 },
    { id: "salon-de-provence", name: "Salon-de-Provence", address: "44 allée de Craponne, 13300 Salon-de-Provence", country: "FR", lat: 43.637275, lng: 5.099177, hours: ["11:00", "23:00"], openedOn: "2026-03-14", volume: 0.85 },
    { id: "gap", name: "Gap", address: "6 rue Jean Eymar, 05000 Gap", country: "FR", lat: 44.5609146, lng: 6.0798697, hours: ["11:00", "23:00"], openedOn: "2026-09-12", volume: 0.8 },
    { id: "montpellier", name: "Montpellier", address: "230 rue Vendémiaire, 34000 Montpellier", country: "FR", lat: 43.6033, lng: 3.8987, hours: ["11:00", "23:00"], openedOn: "2026-01-24", volume: 1.1 },
    { id: "montpellier-verdun", name: "Montpellier Verdun", address: "1 bis rue de Verdun, 34000 Montpellier", country: "FR", lat: 43.6081, lng: 3.8801, hours: ["11:30", "23:00"], openedOn: "2026-07-04", volume: 1.15 },
    { id: "perpignan", name: "Perpignan", address: "6 avenue Julien Panchot, 66000 Perpignan", country: "FR", lat: 42.694, lng: 2.8875, hours: ["12:00", "01:00"], hoursByDay: { 6: ["12:00", "02:00"] }, openedOn: "2026-07-11", volume: 1 },
    { id: "nimes", name: "Nîmes", address: "18 rue de la République, 30000 Nîmes", country: "FR", lat: 43.8367, lng: 4.3601, hours: ["11:00", "00:00"], openedOn: "2026-05-02", volume: 1 },
    { id: "palavas-les-flots", name: "Palavas-les-Flots", address: "1 quai Paul Cunq, 34250 Palavas-les-Flots", country: "FR", lat: 43.5272, lng: 3.9322, hours: ["11:30", "23:00"], openedOn: "2026-05-23", volume: 0.7 },
    { id: "toulouse", name: "Toulouse", address: "218 route de Saint-Simon, 31100 Toulouse", country: "FR", lat: 43.5798, lng: 1.3949, hours: ["11:00", "23:00"], openedOn: "2026-08-01", volume: 1.05 },
    { id: "sainte-genevieve-des-bois", name: "Sainte-Geneviève-des-Bois", address: "1 avenue du Régiment Normandie-Niémen, 91700 Sainte-Geneviève-des-Bois", country: "FR", lat: 48.637078, lng: 2.332264, hours: ["11:00", "23:30"], openedOn: "2026-09-05", volume: 0.9 },
    { id: "paris-12", name: "Paris 12e", address: "114 boulevard Diderot, 75012 Paris", country: "FR", lat: 48.847151, lng: 2.386432, hours: ["11:00", "01:00"], openedOn: "2026-09-19", volume: 1.3 },
    // Horaires non publiés : ceux de la plupart du réseau.
    { id: "vichy", name: "Vichy", address: "53 rue de Paris, 03200 Vichy", country: "FR", lat: 46.126717, lng: 3.427472, hours: ["11:30", "23:00"], openedOn: "2026-09-15", volume: 0.8 },
    { id: "paris-10", name: "Paris 10e", address: "Château-d’Eau, 75010 Paris", country: "FR", lat: 48.8724, lng: 2.3561, hours: ["11:00", "23:00"], openedOn: "2026-08-01", volume: 1.25 },
  ],
  // Carte nationale et prix du site du réseau (/notre-carte).
  basket: {
    menus: [
      { product: solo, weight: 34, quantities: [0.8, 0.15, 0.05] },
      { product: costaud, weight: 13, quantities: [0.92, 0.08] },
      { product: duo, weight: 17, quantities: [1] },
      { product: gourmand, weight: 8, quantities: [1] },
      { product: family, weight: 7, quantities: [1] },
    ],
    alaCarteWeight: 21,
    alaCarte: [
      { product: { name: "Poulet entier", price: 850 }, weight: 4 },
      { product: { name: "Demi poulet", price: 450 }, weight: 4 },
      { product: { name: "Tenders (x2)", price: 250 }, weight: 3 },
      { product: { name: "Cuisse", price: 280 }, weight: 2 },
      { product: { name: "Pilons (x3)", price: 280 }, weight: 2 },
      { product: { name: "Ailes (x4)", price: 280 }, weight: 2 },
      { product: { name: "Donut poulet & cheese", price: 250 }, weight: 2 },
      { product: { name: "Blanc de Poulet", price: 550 }, weight: 1 },
      { product: { name: "Saucisses (x2)", price: 350 }, weight: 1 },
      { product: { name: "Bricks au poulet", price: 200 }, weight: 1 },
      { product: { name: "Nems au poulet", price: 100 }, weight: 1 },
    ],
    alaCarteMax: 3,
    extras: [
      { product: { name: "Alloco", price: 400 }, weight: 4 },
      { product: { name: "Riz Crousti", price: 490 }, weight: 3 },
      { product: { name: "Potatoes", price: 350 }, weight: 3 },
      { product: { name: "Riz oriental", price: 380 }, weight: 2 },
      { product: { name: "Patates sautées", price: 350 }, weight: 2 },
      { product: { name: "Pâtes Crémo", price: 380 }, weight: 2 },
      { product: { name: "Tiramisu", price: 300 }, weight: 2 },
      { product: { name: "Tarte Daim", price: 300 }, weight: 2 },
      { product: { name: "Tenders (x2)", price: 250 }, weight: 2 },
      { product: { name: "Nems au poulet", price: 100 }, weight: 1 },
    ],
    extraChances: [0.35, 0.12],
  },
  simulation: {
    dailyRevenue: 2200,
    adoption: { choices: [0.3, 0.5, 0.7], initial: 0.5, spread: 0.1 },
    tillMinutes: 1.8,
    tills: 1,
    onlineShare: [0.62, 0.8],
    weekday: [1.05, 0.86, 0.9, 1, 0.95, 1.12, 1.22],
    dailyNoise: 0.08,
    peaks: [
      { at: "12:35", sigmaMinutes: 42, weight: 0.46, name: "de midi" },
      { at: "20:15", sigmaMinutes: 58, weight: 0.4, name: "du soir" },
    ],
    baseWeight: 0.14,
    opening: { buzz: 0.6, buzzDays: 10, adoptionStart: 0.8, adoptionDays: 60 },
    kitchen: { peakLoad: [0.8, 0.97], prepSpeed: [0.85, 1.2], passMaxMinutes: 1.6, prepMinutes: 3.2, prepPerItem: 0.6, prepNoise: 0.22 },
    counterPayMinutes: [1, 4],
    pickupMinutes: [0.5, 6],
    estimateToleranceMinutes: 2,
    rush: { waitMinutes: 10 },
    recentMinutes: 30,
    newDays: 30,
    coverageKm: 30,
    dayStartHour: 4,
    referenceDay: "2026-09-29",
  },
  display: {
    bucketMinutes: 15,
    sampleMinutes: 5,
    tickHours: 2,
    headroom: 1.1,
    chartTicks: 5,
    panelChartTicks: 4,
    smoothingMinutes: 15,
    todaySmoothingMinutes: 5,
    tillQuietMinutes: 1,
    closingQuantile: 1,
    feedLength: 20,
    feedPreview: 6,
    rushPreview: 3,
    rankingPreview: 10,
    tweenMs: 700,
    tickMs: 1000,
    fastTickMs: 250,
    rippleSeconds: 10,
    map: { dotMin: 7, dotMax: 20, fullAt: 20, closedDot: 3.5, clusterUnder: 9, clusterRadius: 18, markerRem: 1.375, markerGapRem: 0.5, labelRem: 10, marginRem: 2.5 },
  },
};

const NETWORKS: Record<string, NetworkFixture> = {
  [oCroustiPoulet.slug]: oCroustiPoulet,
};

export function getNetwork(slug: string): NetworkFixture | null {
  return NETWORKS[slug] ?? null;
}

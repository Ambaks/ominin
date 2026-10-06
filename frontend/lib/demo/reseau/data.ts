/*
 * Vue réseau de démonstration : le parc d'une enseigne et les réglages de la
 * simulation qui l'anime. Tout ce que la page affiche en découle — aucune
 * donnée réelle de commande. Les restaurants, eux, sont réels : noms tels que
 * le réseau les écrit, adresses, horaires et coordonnées relevés sur le site
 * de l'enseigne (la source de chaque réseau est notée au-dessus de sa fiche).
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
  /** L'emblème de l'enseigne, en tête de page, sur fond noir (public/<slug>/). */
  logo: { src: string; width: number; height: number };
  /**
   * Les trois braises de la vue (activité, rush, classement), du plus clair au
   * plus profond : la couleur de l'enseigne, lisible en texte sur le fond sombre.
   */
  ember: readonly [string, string, string];
  /** Le CA moyen annoncé par l'enseigne, tel qu'on le cite (la simulation s'y cale). */
  announcedRevenue: string;
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
  /** CA moyen annoncé par l'enseigne, par jour (O'Crousti : 800 000 €/an, soit ≈ 2 200 €/jour). */
  dailyRevenue: number;
  /**
   * Part des commandes passées par QR : l'hypothèse de la démonstration, que
   * le lecteur choisit sur la page (`choices`, `initial` par défaut). Chaque
   * restaurant s'en écarte d'au plus `spread`.
   */
  adoption: { choices: readonly number[]; initial: number; spread: number };
  /**
   * Où commandent les clients venus sans téléphone : en caisse, dans la même
   * file que ceux qui y règlent leur commande QR ; ou aux bornes, d'où leur
   * commande part en cuisine sans file — la caisse ne sert plus qu'à ceux
   * qui règlent au comptoir.
   */
  withoutQr: "caisse" | "bornes";
  /** Temps de caisse d'un client (commande et encaissement), en minutes, et caisses par restaurant. */
  tillMinutes: number;
  tills: number;
  /** Part de ces commandes réglées en ligne plutôt qu'au comptoir. */
  onlineShare: readonly [min: number, max: number];
  /** Affluence selon le jour (0 = dimanche). */
  weekday: readonly number[];
  /** Écart-type de l'aléa quotidien d'un restaurant (log-normal). */
  dailyNoise: number;
  /** Pointes du jour (déjeuner, dîner) sur un fond continu d'ouverture ; `name` les désigne dans le texte (« le rush de midi »). */
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
    /**
     * Si présent : chaque passe est dimensionné pour le jour le plus chargé
     * de la semaine, engouement des premiers jours exclu, et sa charge à la
     * pointe va du haut de `peakLoad` (restaurant qui ouvre) au bas (équipe
     * rodée) en `maturityDays` (constante de temps). Sinon : charge tirée au
     * hasard dans `peakLoad`, sur le volume prévu du jour.
     */
    maturityDays?: number;
    prepSpeed: readonly [min: number, max: number];
    passMaxMinutes: number;
    prepMinutes: number;
    prepPerItem: number;
    prepNoise: number;
  };
  /** Minutes entre une commande par QR non réglée en ligne et l'arrivée du client en caisse. */
  counterPayMinutes: readonly [min: number, max: number];
  /** Minutes entre « prête » (l'alerte sur le téléphone) et le retrait. */
  pickupMinutes: readonly [min: number, max: number];
  /** Ce que la simulation suppose propre au réseau, ajouté aux hypothèses affichées. */
  notes?: readonly string[];
  /** Écart toléré entre l'heure annoncée et l'heure réelle, en minutes. */
  estimateToleranceMinutes: number;
  /** L'heure annoncée se présente comme celle de l'estimateur IA, livré ; absent, la vue la dit en développement. */
  estimatorLive?: boolean;
  /** En rush : attente annoncée (arrondie, celle affichée) d'au moins `waitMinutes`. */
  rush: { waitMinutes: number };
  /** Fenêtre de l'activité récente (taille des points de la carte), en minutes. */
  recentMinutes: number;
  /** Pastille « Nouveau » : restaurant ouvert depuis moins de `newDays` jours. */
  newDays: number;
  /** Ce que date `openedOn`, dans la légende : « Ouvert » par défaut, « Inauguré » quand ce sont les inaugurations publiées. */
  newVerb?: string;
  /** Rayon du maillage annoncé par l'enseigne, en km ; sans objectif publié, la carte n'a pas de cercles. */
  coverageKm?: number;
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
  /** Commandes du fil en direct quand il suit son contenu (au téléphone) : les premières seulement. */
  feedPreview: number;
  /** Restaurants en rush listés au téléphone avant « Voir les N ». */
  rushPreview: number;
  /** Restaurants du classement montrés avant « Voir les N », hors plein écran. */
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
    /**
     * Agglomération trop dense pour l'échelle de la France : sa couronne,
     * d'au moins `minRestaurants`, devient un repère « `name` · N », et ses
     * restaurants passent dans un bloc à côté de la carte, à leurs vraies
     * positions et nommés.
     */
    inset?: { minRestaurants: number; name: string };
    /** Chaque restaurant de la carte nommé à côté de son point (un petit réseau : quatre noms hors de l'agglomération). */
    labels?: boolean;
  };
}

/*
 * O'Crousti Poulet : noms tels que le réseau les écrit, adresses, horaires et
 * coordonnées relevés sur ocroustipouletoriginal.com/nos-restaurants
 * (2026-09-29), plus Vichy (BAN) et Paris 10e (Château-d'Eau), annoncés sur
 * LinkedIn mais absents du site.
 */
const solo = { name: "Menu Solo", price: 690 };
const costaud = { name: "Menu Costaud", price: 1250 };
const duo = { name: "Menu Duo", price: 1700 };
const gourmand = { name: "Menu Gourmand", price: 1950 };
const family = { name: "Menu Family", price: 3150 };

export const oCroustiPoulet: NetworkFixture = {
  slug: "o-crousti-poulet",
  name: "O’Crousti Poulet",
  fullName: "O’Crousti Poulet Original",
  logo: { src: "/o-crousti-poulet/coq.webp", width: 480, height: 346 },
  ember: ["#fff35c", "#f7ee21", "#f2cc12"],
  announcedRevenue: "≈\u00a0800\u00a0k€ par restaurant et par an",
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
    withoutQr: "caisse",
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

/*
 * Chicken Street : les 107 restaurants en France du localisateur
 * restaurants.chickenstreet.fr (relevé du 06/10/2026, adresses géocodées par la
 * Base Adresse Nationale ; Corbeil-Essonnes, qui ouvre le 10 octobre, n'y est
 * pas encore). Horaires et ouvertures : ni l'un ni l'autre n'est publié
 * restaurant par restaurant, d'où les valeurs communes ci-dessous.
 */

/** Horaires supposés de tout le réseau ; Gare de l'Est, relevé, ouvre de 11 h à 2 h. */
const CS_HOURS: Hours = ["11:00", "00:00"];

const csMenuNaanTenders = { name: "Menu Naan Tenders", price: 1050 };
const csMenuNaanMix = { name: "Menu Naan Mix", price: 1150 };
const csMenuStreetB = { name: "Menu Street B", price: 950 };
const csMenuMonster = { name: "Menu Monster", price: 950 };
const csMenuTenders = { name: "Menu Tenders 5 pièces", price: 1050 };
const csMenuDynamite = { name: "Menu Burger Naan Dynamite", price: 1150 };
const csFamilyMix = { name: "Family Mix", price: 2990 };
const csMenuEnfant = { name: "Menu Enfant Nuggets", price: 550 };

export const chickenStreet: NetworkFixture = {
  slug: "chicken-street",
  name: "Chicken Street",
  fullName: "Chicken Street",
  logo: { src: "/chicken-street/icon.png", width: 180, height: 180 },
  ember: ["#ffe45c", "#fcd403", "#e0b800"],
  announcedRevenue: "≈\u00a01,1\u00a0M€ par restaurant et par an",
  restaurants: [
    { id: "amiens-centre-cathedrale", name: "Amiens Centre Cathédrale", address: "Rue du Maréchal de Lattre de Tassigny, 80000 Amiens", country: "FR", lat: 49.89142, lng: 2.29170, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "angers-bressigny", name: "Angers Bressigny", address: "14 rue Bressigny, 49100 Angers", country: "FR", lat: 47.46758, lng: -0.55050, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "annecy-centre", name: "Annecy Centre", address: "5 avenue du Rhône, 74000 Annecy", country: "FR", lat: 45.89891, lng: 6.11778, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "annemasse", name: "Annemasse", address: "8 allée Annie Girardot, 74100 Annemasse", country: "FR", lat: 46.19664, lng: 6.23567, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "argenteuil-sartrouville", name: "Argenteuil Sartrouville", address: "140 route de Pontoise, 95100 Argenteuil", country: "FR", lat: 48.94779, lng: 2.20618, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "arras-boulevard-de-strasbourg", name: "Arras Boulevard de Strasbourg", address: "6 boulevard de Strasbourg, 62000 Arras", country: "FR", lat: 50.28851, lng: 2.78029, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "athis-mons", name: "Athis-Mons", address: "29 avenue Francois Mitterrand, 91200 Athis-Mons", country: "FR", lat: 48.70011, lng: 2.37169, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "aubervilliers-jean-jaures", name: "Aubervilliers Jean Jaurès", address: "89 avenue Jean Jaurès, 93300 Aubervilliers", country: "FR", lat: 48.90556, lng: 2.39384, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "avignon-cap-sud", name: "Avignon Cap Sud", address: "162 avenue Pierre Sémard, 84000 Avignon", country: "FR", lat: 43.92882, lng: 4.83601, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "avignon-le-pontet", name: "Avignon le Pontet", address: "160 rue Jean et René Reinaudo, 84130 Le Pontet", country: "FR", lat: 43.95135, lng: 4.85822, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "belfort", name: "Belfort", address: "1 avenue Thomas Woodrow Wilson, 90000 Belfort", country: "FR", lat: 47.63463, lng: 6.85389, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "besancon", name: "Besançon", address: "28 grande-rue, 25000 Besançon", country: "FR", lat: 47.23856, lng: 6.02269, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "bonneuil-sur-marne", name: "Bonneuil-sur-Marne", address: "11 avenue de Boissy, 94380 Bonneuil-sur-Marne", country: "FR", lat: 48.77347, lng: 2.48284, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "bordeaux-merignac", name: "Bordeaux Merignac", address: "5 rue Albert Einstein, 33700 Mérignac", country: "FR", lat: 44.82989, lng: -0.66888, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "bordeaux-sainte-catherine", name: "Bordeaux Sainte Catherine", address: "160 rue Sainte-Catherine, 33000 Bordeaux", country: "FR", lat: 44.83597, lng: -0.57347, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "boulogne-bilancourt", name: "Boulogne Bilancourt", address: "54ter Avenue Edouard Vaillant, 92100 Boulogne-Billancourt", country: "FR", lat: 48.83579, lng: 2.24992, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "bourg-en-bresse", name: "Bourg-en-Bresse", address: "21 avenue Alsace-Lorraine, 01000 Bourg-en-Bresse", country: "FR", lat: 46.20060, lng: 5.21780, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "bussy-saint-georges", name: "Bussy-Saint-Georges", address: "7 rue Jean Monnet, 77600 Bussy-Saint-Georges", country: "FR", lat: 48.83925, lng: 2.70989, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "caen-saint-pierre", name: "Caen Saint-Pierre", address: "8 boulevard des Alliés, 14000 Caen", country: "FR", lat: 49.18345, lng: -0.36040, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "cergy-prefecture", name: "Cergy Préfecture", address: "16 place des Cerclades, 95000 Cergy", country: "FR", lat: 49.03743, lng: 2.08206, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "chalon-sur-saone", name: "Chalon-sur-Saône", address: "2 avenue Jean Jaures, 71100 Chalon-sur-Saône", country: "FR", lat: 46.78305, lng: 4.84646, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "champigny-sur-marne", name: "Champigny-sur-Marne", address: "29 rue Jean Jaurès, 94500 Champigny-sur-Marne", country: "FR", lat: 48.81537, lng: 2.50570, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "champs-sur-marne", name: "Champs sur Marne", address: "7 allée Newton, 77420 Champs-sur-Marne", country: "FR", lat: 48.83596, lng: 2.59278, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "choisy-le-roi", name: "Choisy-le-Roi", address: "31 avenue Anatole France, 94600 Choisy-le-Roi", country: "FR", lat: 48.76294, lng: 2.41082, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "clichy-la-garenne", name: "Clichy la Garenne", address: "136 boulevard Jean Jaurès, 92110 Clichy", country: "FR", lat: 48.90694, lng: 2.30077, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "colombes", name: "Colombes", address: "165 boulevard Charles de Gaulle, 92700 Colombes", country: "FR", lat: 48.91524, lng: 2.22778, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "courbevoie", name: "Courbevoie", address: "41 boulevard De Verdun, 92400 Courbevoie", country: "FR", lat: 48.89927, lng: 2.26179, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "creil-saint-maximin", name: "Creil Saint Maximin", address: "Rue Louis Saint Just, 60740 Saint-Maximin", country: "FR", lat: 49.24278, lng: 2.47158, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "creteil", name: "Créteil", address: "126 avenue du Maréchal Foch, 94000 Créteil", country: "FR", lat: 48.78549, lng: 2.43682, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "dijon-foch", name: "Dijon Foch", address: "13 avenue maréchal Foch, 21000 Dijon", country: "FR", lat: 47.32337, lng: 5.02997, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "dijon-garibaldi", name: "Dijon Garibaldi", address: "13 avenue Garibaldi, 21000 Dijon", country: "FR", lat: 47.32830, lng: 5.04368, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "douai", name: "Douai", address: "39 place d’Armes, 59500 Douai", country: "FR", lat: 50.36804, lng: 3.08230, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "drancy", name: "Drancy", address: "233 avenue Henri Barbusse, 93700 Drancy", country: "FR", lat: 48.92298, lng: 2.45779, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "evry-courcouronnes", name: "Evry-Courcouronnes", address: "505 place des Champs Elysées, 91080 Évry-Courcouronnes", country: "FR", lat: 48.62330, lng: 2.42321, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "gare-de-lest-paris", name: "Gare de l’Est Paris", address: "121 rue du Faubourg Saint-Martin, 75010 Paris", country: "FR", lat: 48.87505, lng: 2.35887, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1.3 },
    { id: "garges-les-gonesse", name: "Garges-Lès-Gonesse", address: "15 avenue de Stalingrad, 95140 Garges-lès-Gonesse", country: "FR", lat: 48.96046, lng: 2.39987, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "goussainville", name: "Goussainville", address: "24 avenue du 6 Juin 1944, 95190 Goussainville", country: "FR", lat: 49.02617, lng: 2.46572, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "grenoble-echirolles", name: "Grenoble Échirolles", address: "2 rue du Cotentin, 38130 Échirolles", country: "FR", lat: 45.14350, lng: 5.71750, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "ivry-sur-seine", name: "Ivry-sur-Seine", address: "67 boulevard Paul Vaillant Couturier, 94200 Ivry-sur-Seine", country: "FR", lat: 48.81741, lng: 2.39894, hours: CS_HOURS, openedOn: "2011-01-01", volume: 1.15 },
    { id: "juvisy-sur-orge", name: "Juvisy-sur-Orge", address: "13 rue de Draveil, 91260 Juvisy-sur-Orge", country: "FR", lat: 48.68896, lng: 2.38484, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "kremlin-bicetre", name: "Kremlin Bicêtre", address: "4 rue du Général Leclerc, 94270 Le Kremlin-Bicêtre", country: "FR", lat: 48.81506, lng: 2.36021, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "la-roche-sur-yon", name: "La Roche sur Yon", address: "4 rue salvador allende, 85000 La Roche-sur-Yon", country: "FR", lat: 46.67080, lng: -1.42860, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "le-havre", name: "Le Havre", address: "53 avenue René Coty, 76600 Le Havre", country: "FR", lat: 49.49739, lng: 0.11257, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "le-mans-centre-gare", name: "Le Mans Centre Gare", address: "17 boulevard Robert Jarry, 72100 Le Mans", country: "FR", lat: 47.99550, lng: 0.19250, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "lens", name: "Lens", address: "12 place Jean Jaurès, 62300 Lens", country: "FR", lat: 50.42946, lng: 2.83274, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "les-lilas", name: "Les Lilas", address: "138 rue de Paris, 93260 Les Lilas", country: "FR", lat: 48.88040, lng: 2.41839, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "lille-flandres", name: "Lille Flandres", address: "11 rue de Tournai, 59777 Lille", country: "FR", lat: 50.63575, lng: 3.07057, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "lille-postes", name: "Lille Postes", address: "239 rue des Postes, 59000 Lille", country: "FR", lat: 50.62004, lng: 3.05156, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "lyon-1er", name: "Lyon 1er", address: "5 rue Sainte Catherine, 69001 Lyon", country: "FR", lat: 45.76818, lng: 4.83256, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "marseille-belsunce", name: "Marseille Belsunce", address: "54 cours belsunce, 13001 Marseille", country: "FR", lat: 43.29886, lng: 5.37672, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1.25 },
    { id: "marseille-plombieres", name: "Marseille Plombières", address: "1 boulevard simon bolivar, 13015 Marseille", country: "FR", lat: 43.34147, lng: 5.37743, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "marseille-saint-antoine", name: "Marseille Saint-Antoine", address: "185 avenue de saint antoine, 13015 Marseille", country: "FR", lat: 43.37307, lng: 5.35580, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "massy-antony", name: "Massy Antony", address: "Rue de la Division Leclerc, 91300 Massy", country: "FR", lat: 48.72999, lng: 2.27435, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "meaux-aristide-briand", name: "Meaux Aristide Briand", address: "53 rue Aristide Briand, 77100 Meaux", country: "FR", lat: 48.95670, lng: 2.89008, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "melun-place-saint-jean", name: "Melun Place Saint Jean", address: "13 place Saint Jean, 77000 Melun", country: "FR", lat: 48.53964, lng: 2.66274, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "metz-muse", name: "Metz Muse", address: "2 rue des Messageries, 57000 Metz", country: "FR", lat: 49.10732, lng: 6.18116, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "montargis-general-de-gaulle", name: "Montargis Général de Gaulle", address: "57 avenue du Général de Gaulle, 45200 Montargis", country: "FR", lat: 48.00474, lng: 2.73731, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "montfermeil", name: "Montfermeil", address: "1 rue Utrillo, 93370 Montfermeil", country: "FR", lat: 48.90106, lng: 2.55509, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "montigny-le-bretonneux", name: "Montigny-le-Bretonneux", address: "13 quai Fernand Pouillon, 78180 Montigny-le-Bretonneux", country: "FR", lat: 48.78196, lng: 2.04243, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "montpellier", name: "Montpellier", address: "7 rue de Maguelone, 34000 Montpellier", country: "FR", lat: 43.60738, lng: 3.87971, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "montreuil-rosny", name: "Montreuil Rosny", address: "162 boulevard de la Boissière, 93100 Montreuil", country: "FR", lat: 48.87736, lng: 2.46153, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "montrouge-malakoff", name: "Montrouge Malakoff", address: "121 avenue Pierre Brossolette, 92120 Montrouge", country: "FR", lat: 48.81715, lng: 2.30732, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "montelimar", name: "Montélimar", address: "138 avenue Jean Jaurès, 26200 Montélimar", country: "FR", lat: 44.54247, lng: 4.74649, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "mulhouse-centre-ville", name: "Mulhouse Centre Ville", address: "11 avenue de Colmar, 68200 Mulhouse", country: "FR", lat: 47.75071, lng: 7.33828, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "macon", name: "Mâcon", address: "Quai Lamartine, 71000 Mâcon", country: "FR", lat: 46.30409, lng: 4.83408, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "nancy-place-des-vosges", name: "Nancy Place des Vosges", address: "Avenue Général Leclerc, 54000 Nancy", country: "FR", lat: 48.67554, lng: 6.17642, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "nantes-feydeau", name: "Nantes Feydeau", address: "4 cours Olivier De Clisson, 44000 Nantes", country: "FR", lat: 47.21328, lng: -1.55488, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "nantes-nord", name: "Nantes Nord", address: "147 boulevard Robert Schuman, 44300 Nantes", country: "FR", lat: 47.24087, lng: -1.57296, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "nice-massena", name: "Nice Masséna", address: "56 boulevard Jean Jaurès, 06300 Nice", country: "FR", lat: 43.69750, lng: 7.27370, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "nice-promenade", name: "Nice Promenade", address: "223 avenue de la Californie, 06200 Nice", country: "FR", lat: 43.68027, lng: 7.23043, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "noisy-le-sec", name: "Noisy le Sec", address: "39 rue Jean Jaurès, 93130 Noisy-le-Sec", country: "FR", lat: 48.89259, lng: 2.45585, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "nimes-amiral-courbet", name: "Nîmes Amiral Courbet", address: "8 boulevard Amiral Courbet, 30000 Nîmes", country: "FR", lat: 43.83722, lng: 4.36303, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "orleans-gare", name: "Orléans Gare", address: "Allée Anne du Bourg, 45000 Orléans", country: "FR", lat: 47.91170, lng: 1.90617, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "oparinor", name: "O’Parinor", address: "Centre commercial O’Parinor, 93600 Aulnay-sous-Bois", country: "FR", lat: 48.93100, lng: 2.49650, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "paris-11", name: "Paris 11", address: "160 rue Oberkampf, 75011 Paris", country: "FR", lat: 48.86680, lng: 2.38244, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "paris-18-la-chapelle", name: "Paris 18 la Chapelle", address: "52 rue de la Chapelle, 75018 Paris", country: "FR", lat: 48.89406, lng: 2.35969, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "paris-19", name: "Paris 19", address: "147 rue de Crimée, 75019 Paris", country: "FR", lat: 48.88732, lng: 2.38049, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "paris-avenue-de-clichy", name: "Paris Avenue de Clichy", address: "42 avenue de Clichy, 75018 Paris", country: "FR", lat: 48.88615, lng: 2.32638, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "paris-chatelet", name: "Paris Châtelet", address: "17 rue Saint-Denis, 75001 Paris", country: "FR", lat: 48.85941, lng: 2.34774, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "perpignan-bas-vernet", name: "Perpignan Bas-Vernet", address: "235 avenue d’Espagne, 66000 Perpignan", country: "FR", lat: 42.68652, lng: 2.89622, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "persan", name: "Persan", address: "Rue Maria Deraisme, 95340 Persan", country: "FR", lat: 49.15532, lng: 2.25861, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "plaisir", name: "Plaisir", address: "10 rue Paul Langevin, 78370 Plaisir", country: "FR", lat: 48.83086, lng: 1.95328, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "poitiers", name: "Poitiers", address: "2 avenue de lafayette, 86000 Poitiers", country: "FR", lat: 46.57498, lng: 0.37334, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "pontault-combault", name: "Pontault-Combault", address: "29 avenue de la République, 77340 Pontault-Combault", country: "FR", lat: 48.80489, lng: 2.61430, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "porte-de-montreuil", name: "Porte de Montreuil", address: "261 rue de Paris, 93100 Montreuil", country: "FR", lat: 48.85458, lng: 2.41707, hours: CS_HOURS, openedOn: "2026-10-03", volume: 1 },
    { id: "qwartz-92", name: "Qwartz 92", address: "4 boulevard Galliéni, 92390 Villeneuve-la-Garenne", country: "FR", lat: 48.92613, lng: 2.32812, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "reims-centre-ville", name: "Reims Centre Ville", address: "Rue de Vesle, 51100 Reims", country: "FR", lat: 49.25263, lng: 4.02654, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "roubaix-boulevard-gambetta", name: "Roubaix Boulevard Gambetta", address: "127 boulevard Gambetta, 59100 Roubaix", country: "FR", lat: 50.69255, lng: 3.18406, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "rouen-rue-lafayette", name: "Rouen Rue Lafayette", address: "40 rue Pavee, 76100 Rouen", country: "FR", lat: 49.43159, lng: 1.08728, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "saint-denis-universite", name: "Saint-Denis Université", address: "14 avenue Roger Sémat, 93200 Saint-Denis", country: "FR", lat: 48.94740, lng: 2.35762, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "saint-etienne-fourneyron", name: "Saint-Etienne Fourneyron", address: "42 rue Etienne Mimard, 42000 Saint-Étienne", country: "FR", lat: 45.43930, lng: 4.39777, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "saint-ouen-avenue-michelet", name: "Saint-Ouen Avenue Michelet", address: "54 avenue Michelet, 93400 Saint-Ouen-sur-Seine", country: "FR", lat: 48.90889, lng: 2.34397, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "saint-priest-place-daniel-balavoine", name: "Saint-Priest Place Daniel Balavoine", address: "Rue Mozart, 69800 Saint-Priest", country: "FR", lat: 45.69315, lng: 4.93816, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "sens", name: "Sens", address: "Chemin des Cannetieres, 89100 Sens", country: "FR", lat: 48.17692, lng: 3.28803, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "sevran", name: "Sevran", address: "Route des Petits Ponts, 93270 Sevran", country: "FR", lat: 48.95031, lng: 2.52515, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "strasbourg", name: "Strasbourg", address: "7 rue de Boston, 67000 Strasbourg", country: "FR", lat: 48.57668, lng: 7.77062, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "toulouse-jean-darc", name: "Toulouse Jean d’Arc", address: "59 boulevard de Strasbourg, 31000 Toulouse", country: "FR", lat: 43.60962, lng: 1.44431, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "tours-place-liberte", name: "Tours Place Liberté", address: "9 place de la Liberté, 37000 Tours", country: "FR", lat: 47.37986, lng: 0.69227, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "troyes-centre", name: "Troyes Centre", address: "13 rue des Bas Trevois, 10000 Troyes", country: "FR", lat: 48.29240, lng: 4.07986, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "valence-2", name: "Valence 2", address: "2 avenue de Romans, 26000 Valence", country: "FR", lat: 44.93233, lng: 4.89801, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "vannes", name: "Vannes", address: "81 avenue de la Marne, 56000 Vannes", country: "FR", lat: 47.65980, lng: -2.78563, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "vaulx-en-velin-7-chemins", name: "Vaulx-en-Velin 7 Chemins", address: "236 avenue Franklin Roosevelt, 69120 Vaulx-en-Velin", country: "FR", lat: 45.74669, lng: 4.93068, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "vienne", name: "Vienne", address: "4 quai Anatole France, 38200 Vienne", country: "FR", lat: 45.52938, lng: 4.87753, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "villefranche-sur-saone", name: "Villefranche-sur-Saone", address: "Rue de la Quarantaine, 69400 Villefranche-sur-Saône", country: "FR", lat: 45.98921, lng: 4.72452, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "villemomble-gagny", name: "Villemomble Gagny", address: "182 Grande Rue, 93250 Villemomble", country: "FR", lat: 48.88252, lng: 2.52538, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "villeurbanne-la-perraliere", name: "Villeurbanne la Perralière", address: "150 rue du 4 Août 1789, 69100 Villeurbanne", country: "FR", lat: 45.76414, lng: 4.89030, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
    { id: "venissieux-paul-bert", name: "Vénissieux Paul Bert", address: "22 rue Paul Bert, 69200 Vénissieux", country: "FR", lat: 45.70025, lng: 4.88670, hours: CS_HOURS, openedOn: "2024-01-01", volume: 1 },
  ],
  basket: {
    menus: [
      { product: csMenuNaanTenders, weight: 18, quantities: [0.7, 0.22, 0.08] },
      { product: csMenuNaanMix, weight: 14, quantities: [0.75, 0.2, 0.05] },
      { product: csMenuStreetB, weight: 10, quantities: [0.8, 0.2] },
      { product: csMenuMonster, weight: 9, quantities: [0.8, 0.2] },
      { product: csMenuTenders, weight: 12, quantities: [0.75, 0.25] },
      { product: csMenuDynamite, weight: 8, quantities: [0.8, 0.2] },
      { product: csFamilyMix, weight: 7, quantities: [1] },
      { product: csMenuEnfant, weight: 6, quantities: [0.6, 0.4] },
    ],
    alaCarteWeight: 16,
    alaCarte: [
      { product: { name: "Naan Tenders", price: 750 }, weight: 4 },
      { product: { name: "Naan Mix", price: 850 }, weight: 3 },
      { product: { name: "Burger Naan Dynamite", price: 850 }, weight: 2 },
      { product: { name: "Wings 10 pièces", price: 950 }, weight: 2 },
      { product: { name: "Box Mix 16 pièces", price: 1190 }, weight: 2 },
      { product: { name: "Double Cheese", price: 495 }, weight: 1 },
    ],
    alaCarteMax: 3,
    extras: [
      { product: { name: "Box Onion Rings", price: 295 }, weight: 4 },
      { product: { name: "Ice Street", price: 350 }, weight: 4 },
      { product: { name: "Tenders 3 pièces", price: 450 }, weight: 3 },
      { product: { name: "Tiramisu", price: 350 }, weight: 2 },
      { product: { name: "Soda 33 cl", price: 220 }, weight: 3 },
    ],
    extraChances: [0.45, 0.2],
  },
  simulation: {
    // 1,1 M€ par restaurant et par an (plaquette franchise 2026), soit ≈ 3 000 € par jour.
    dailyRevenue: 3000,
    adoption: { choices: [0.1, 0.3, 0.5], initial: 0.3, spread: 0 },
    // Des bornes dans une partie des restaurants seulement : la caisse, l'hypothèse prudente.
    withoutQr: "caisse",
    tillMinutes: 1.6,
    tills: 2,
    onlineShare: [0.62, 0.8],
    weekday: [1.1, 0.86, 0.9, 0.98, 0.95, 1.12, 1.2],
    dailyNoise: 0.08,
    // Servi jusqu'à minuit et plus : le soir pèse plus que le midi. Répartition supposée.
    peaks: [
      { at: "12:45", sigmaMinutes: 42, weight: 0.36, name: "de midi" },
      { at: "20:30", sigmaMinutes: 60, weight: 0.5, name: "du soir" },
    ],
    baseWeight: 0.14,
    opening: { buzz: 0.6, buzzDays: 10, adoptionStart: 1, adoptionDays: 60 },
    kitchen: { peakLoad: [0.8, 1.1], maturityDays: 150, prepSpeed: [0.85, 1.25], passMaxMinutes: 1.4, prepMinutes: 3.6, prepPerItem: 0.6, prepNoise: 0.22 },
    counterPayMinutes: [1, 4],
    pickupMinutes: [0.5, 4],
    notes: [
      "Panier moyen : celui de paniers types sur votre carte (prix relevés par un agrégateur, variables selon le restaurant).",
      "Horaires : 11 h – minuit pour tous, supposés (Gare de l’Est, relevé : 11 h – 2 h) ; ouvertures non publiées, sauf Porte de Montreuil (3 octobre).",
      "Répartition des ventes entre le midi et le soir : supposée, à caler sur vos ventes par heure ; hors des pointes, un fond léger.",
      "Volume de chaque restaurant : le même pour tous, un peu plus fort dans quatre grandes adresses, en attendant vos chiffres ; le classement est donc illustratif.",
    ],
    estimateToleranceMinutes: 2,
    estimatorLive: true,
    rush: { waitMinutes: 10 },
    recentMinutes: 30,
    newDays: 30,
    newVerb: "Inauguré",
    dayStartHour: 4,
    referenceDay: "2026-10-03",
  },
  // Plus d'un tiers du réseau en Île-de-France, trop pour un médaillon nommé : la couronne seule.
  display: {
    ...oCroustiPoulet.display,
    map: {
      ...oCroustiPoulet.display.map,
      clusterUnder: 18,
      clusterRadius: 26,
    },
  },
};

const NETWORKS: Record<string, NetworkFixture> = {
  [oCroustiPoulet.slug]: oCroustiPoulet,
  [chickenStreet.slug]: chickenStreet,
};

export function getNetwork(slug: string): NetworkFixture | null {
  return NETWORKS[slug] ?? null;
}

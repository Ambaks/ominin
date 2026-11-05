import planLight from "@/lib/hotels-demo-camera.json";
import type { HotelPhoto } from "@/lib/hotels-landing-data";

/*
 * La démo client d'Ominin Hôtels : Le Grand Large, l'hôtel fictif des
 * maquettes de la landing, ses QR codes, ses cartes, son séjour. Données
 * statiques, comme les démos de restaurants : rien n'est envoyé ni payé, ce
 * que fait le visiteur reste dans son navigateur. Aucun texte dans les
 * composants — tout vit ici.
 */

export const demoSeo = {
  title: "Le Grand Large — démo Ominin Hôtels",
  description: "Le parcours client d’un hôtel fictif : scannez un QR de chambre, de transat ou de table, et commandez, demandez, réservez.",
};

export const hotel = {
  name: "Le Grand Large",
  kind: "Hôtel · Plage · Spa",
};

/** Le client de la démo, reconnu dès qu'il a ouvert le QR de sa chambre. */
export const guest = {
  name: "Madame Laurent",
  lastName: "Laurent",
  room: "214",
  stay: "Deuxième séjour · départ dans 2 jours, 11\u00a0h",
};

export const roomLabel = (room: string) => `Chambre ${room}`;

export type SpaceId = "piscine" | "plage" | "rooftop" | "lobby" | "spa";
export type Diet = "vegetarien" | "sans-gluten" | "sans-lactose";

export const dietLabels: Record<Diet, string> = {
  vegetarien: "Végétarien",
  "sans-gluten": "Sans gluten",
  "sans-lactose": "Sans lactose",
};

export interface Item {
  id: string;
  name: string;
  detail: string;
  price: number;
  allergens?: readonly string[];
  diets?: readonly Diet[];
}

export interface Category {
  name: string;
  items: readonly Item[];
}

/* ── Les QR codes posés dans l'hôtel ─────────────────────────────────── */

export type QrPoint =
  | { id: string; kind: "room"; label: string; where: string; photo: HotelPhoto }
  | { id: string; kind: "space"; space: SpaceId; label: string; where: string };

export const qrPoints = [
  { id: "chambre-214", kind: "room", label: "Chambre 214", where: "Sur la table de nuit", photo: "room" },
  { id: "transat-12", kind: "space", space: "piscine", label: "Transat 12", where: "Au bord de la piscine" },
  { id: "cabane-4", kind: "space", space: "plage", label: "Cabane 4", where: "Sur la plage" },
  { id: "table-7", kind: "space", space: "rooftop", label: "Table 7", where: "Au rooftop" },
  { id: "salon-3", kind: "space", space: "lobby", label: "Salon 3", where: "Dans le lobby" },
  { id: "bassin", kind: "space", space: "spa", label: "Le bassin", where: "Au spa" },
] as const satisfies readonly QrPoint[];

export type QrId = (typeof qrPoints)[number]["id"];

export const chooser = {
  eyebrow: "Démo · Ominin Hôtels",
  title: "Scannez, *vous êtes client.*",
  subtitle:
    "Un hôtel fictif et les QR codes posés dans ses chambres et ses espaces. Scannez-en un avec votre téléphone, ou touchez-le : rien n’est envoyé, rien n’est payé.",
  hint: "Commencez par la chambre : l’hôtel vous reconnaît ensuite à la piscine.",
  open: "Ouvrir",
  qrLabel: (label: string) => `QR code de la démo : ${label}`,
  back: "La présentation d’Ominin Hôtels",
  staff: {
    eyebrow: "Côté hôtel",
    title: "Et de l’autre côté, *la gestion.*",
    text: "Les chiffres du jour, les chambres, les espaces et le service en direct, comme les voit la direction. Ouvrez-la dans un autre onglet : chaque commande passée depuis un QR y arrive.",
    cta: "Ouvrir la gestion",
    photo: "deck" as const satisfies HotelPhoto,
  },
};

/* ── Les espaces et leurs cartes ─────────────────────────────────────── */

export interface Space {
  name: string;
  /** Sur la note de chambre. */
  short: string;
  photo: HotelPhoto;
  hours: string;
  /** Où le serveur apporte la commande, avec le libellé du QR. */
  served: (label: string) => string;
  /** Les étapes du suivi d'une commande ; la dernière est « servi ». */
  steps: (label: string) => string[];
  /** Le geste de l'équipe qui fait passer à chaque étape suivante. */
  actions: readonly string[];
  categories: readonly Category[];
}

const barSteps = (bar: string) => (label: string) => [`Reçue ${bar}`, "En préparation", `En route · ${label.toLowerCase()}`, "Servi"];
const barActions = ["Préparer", "Partir servir", "Servi"];

export const spaces: Record<SpaceId, Space> = {
  piscine: {
    short: "Piscine",
    name: "La piscine",
    photo: "pool",
    hours: "Bar ouvert 11 h – 18 h",
    served: (label) => `Servi au ${label.toLowerCase()}`,
    steps: barSteps("au bar de la piscine"),
    actions: barActions,
    categories: [
      {
        name: "Cocktails",
        items: [
          { id: "spritz-hugo", name: "Spritz Hugo", detail: "Sureau, menthe, prosecco", price: 24, allergens: ["Sulfites"] },
          { id: "aperol", name: "Spritz Apérol", detail: "Apérol, prosecco, orange", price: 24, allergens: ["Sulfites"] },
          { id: "paloma", name: "Paloma", detail: "Tequila, pamplemousse rose, citron vert", price: 26 },
          { id: "pina", name: "Piña colada", detail: "Rhum ambré, ananas, coco", price: 26 },
        ],
      },
      {
        name: "Sans alcool",
        items: [
          { id: "virgin-mojito", name: "Mojito sans alcool", detail: "Menthe fraîche, citron vert, sucre de canne", price: 16 },
          { id: "citronnade", name: "Citronnade maison", detail: "Citron, romarin, eau pétillante", price: 12 },
          { id: "perrier", name: "Perrier", detail: "33 cl", price: 9 },
          { id: "glace-coco", name: "Eau de coco", detail: "Fraîche, 33 cl", price: 12 },
        ],
      },
      {
        name: "À grignoter",
        items: [
          { id: "club", name: "Club sandwich", detail: "Poulet, bacon, tomate, frites", price: 38, allergens: ["Gluten", "Œufs", "Moutarde"] },
          { id: "salade-pasteque", name: "Salade pastèque et feta", detail: "Menthe, olives, huile d’olive", price: 24, allergens: ["Lait"], diets: ["vegetarien", "sans-gluten"] },
          { id: "bowl-fruits", name: "Bol de fruits frais", detail: "Fruits du jour", price: 16, diets: ["vegetarien", "sans-gluten", "sans-lactose"] },
        ],
      },
    ],
  },
  plage: {
    short: "Plage",
    name: "La plage",
    photo: "beach",
    hours: "Paillote ouverte 10 h – 19 h",
    served: (label) => `Servi à la ${label.toLowerCase()}`,
    steps: barSteps("à la paillote"),
    actions: barActions,
    categories: [
      {
        name: "Rosés et bulles",
        items: [
          { id: "rose-verre", name: "Rosé de Provence", detail: "Le verre, 15 cl", price: 18, allergens: ["Sulfites"] },
          { id: "rose-bouteille", name: "Bouteille de rosé", detail: "Côtes de Provence, 75 cl", price: 95, allergens: ["Sulfites"] },
          { id: "champagne", name: "Champagne brut", detail: "La coupe, 12 cl", price: 30, allergens: ["Sulfites"] },
        ],
      },
      {
        name: "La paillote",
        items: [
          { id: "tacos-poisson", name: "Tacos de poisson", detail: "Dorade snackée, chou rouge, citron vert", price: 28, allergens: ["Poisson", "Gluten"] },
          { id: "frites", name: "Frites maison", detail: "Sel de Camargue", price: 10, diets: ["vegetarien", "sans-lactose"] },
          { id: "burrata", name: "Burrata et tomates anciennes", detail: "Basilic, huile d’olive", price: 26, allergens: ["Lait"], diets: ["vegetarien", "sans-gluten"] },
        ],
      },
      {
        name: "Glaces",
        items: [
          { id: "sorbet", name: "Sorbet citron", detail: "Deux boules", price: 9, diets: ["vegetarien", "sans-gluten", "sans-lactose"] },
          { id: "glace-vanille", name: "Glace vanille", detail: "Deux boules", price: 9, allergens: ["Lait", "Œufs"], diets: ["vegetarien", "sans-gluten"] },
        ],
      },
    ],
  },
  rooftop: {
    short: "Rooftop",
    name: "Le rooftop",
    photo: "rooftop",
    hours: "Ouvert 19 h – 1 h",
    served: (label) => `Servi à la ${label.toLowerCase()}`,
    steps: barSteps("au bar du rooftop"),
    actions: barActions,
    categories: [
      {
        name: "Signatures",
        items: [
          { id: "grand-large", name: "Le Grand Large", detail: "Gin, fleur d’oranger, tonic, écume de citron", price: 30, allergens: ["Œufs"] },
          { id: "sunset", name: "Coucher de soleil", detail: "Rhum, fruit de la passion, vanille", price: 26 },
          { id: "terre-mer", name: "Terre et mer", detail: "Mezcal, concombre, sel de mer", price: 28 },
        ],
      },
      {
        name: "Classiques",
        items: [
          { id: "negroni", name: "Negroni", detail: "Gin, vermouth rouge, Campari", price: 24, allergens: ["Sulfites"] },
          { id: "dry-martini", name: "Dry Martini", detail: "Gin, vermouth sec, olive", price: 26, allergens: ["Sulfites"] },
          { id: "old-fashioned", name: "Old fashioned", detail: "Bourbon, sucre, bitter", price: 26 },
        ],
      },
      {
        name: "À partager",
        items: [
          { id: "planche", name: "Planche mixte", detail: "Charcuteries, fromages affinés, pain de campagne", price: 36, allergens: ["Gluten", "Lait"] },
          { id: "houmous", name: "Houmous et pita grillée", detail: "Paprika fumé, huile d’olive", price: 18, allergens: ["Gluten", "Sésame"], diets: ["vegetarien", "sans-lactose"] },
          { id: "olives", name: "Olives de Nyons", detail: "Zeste d’orange, thym", price: 9, diets: ["vegetarien", "sans-gluten", "sans-lactose"] },
        ],
      },
    ],
  },
  lobby: {
    short: "Lobby",
    name: "Le lobby",
    photo: "lobby",
    hours: "Ouvert 7 h – 23 h",
    served: (label) => `Servi au ${label.toLowerCase()}`,
    steps: barSteps("au bar du lobby"),
    actions: barActions,
    categories: [
      {
        name: "Cafés et thés",
        items: [
          { id: "cafe-creme", name: "Café crème", detail: "Lait entier ou d’avoine", price: 9, allergens: ["Lait"] },
          { id: "espresso", name: "Espresso", detail: "Torréfaction du Sud", price: 7 },
          { id: "the-vert", name: "Thé vert jasmin", detail: "En théière", price: 12 },
        ],
      },
      {
        name: "Verres",
        items: [
          { id: "blanc", name: "Picpoul de Pinet", detail: "Le verre, 15 cl", price: 18, allergens: ["Sulfites"] },
          { id: "biere", name: "Bière blonde artisanale", detail: "33 cl", price: 14, allergens: ["Gluten"] },
        ],
      },
      {
        name: "Douceurs",
        items: [
          { id: "madeleines", name: "Madeleines au miel", detail: "Trois, tièdes", price: 9, allergens: ["Gluten", "Œufs", "Lait"], diets: ["vegetarien"] },
          { id: "financier", name: "Financier amande", detail: "Beurre noisette", price: 7, allergens: ["Fruits à coque", "Œufs", "Lait"], diets: ["vegetarien", "sans-gluten"] },
        ],
      },
    ],
  },
  spa: {
    short: "Spa",
    name: "Le spa",
    photo: "spa",
    hours: "Ouvert 10 h – 20 h",
    served: () => "Servi au bord du bassin",
    steps: () => ["Reçue au spa", "En préparation", "En route · le bassin", "Servi"],
    actions: barActions,
    categories: [
      {
        name: "Thés et infusions",
        items: [
          { id: "the-blanc", name: "Thé blanc", detail: "Pai Mu Tan, en théière", price: 14 },
          { id: "infusion", name: "Infusion verveine", detail: "Verveine fraîche du jardin", price: 9 },
        ],
      },
      {
        name: "Jus pressés",
        items: [
          { id: "jus-vert", name: "Jus vert", detail: "Pomme, concombre, épinard, gingembre", price: 16, diets: ["vegetarien", "sans-gluten", "sans-lactose"] },
          { id: "jus-orange", name: "Orange pressée", detail: "25 cl", price: 9, diets: ["vegetarien", "sans-gluten", "sans-lactose"] },
        ],
      },
      {
        name: "Assiettes légères",
        items: [
          { id: "assiette-saumon", name: "Saumon gravlax", detail: "Aneth, crème citronnée, pain de seigle", price: 26, allergens: ["Poisson", "Lait", "Gluten"] },
          { id: "bol-quinoa", name: "Bol quinoa et légumes rôtis", detail: "Tahini, grenade", price: 24, allergens: ["Sésame"], diets: ["vegetarien", "sans-gluten", "sans-lactose"] },
        ],
      },
    ],
  },
};

/* ── La chambre ──────────────────────────────────────────────────────── */

export const room = {
  hero: { photo: "room" as const satisfies HotelPhoto, greeting: "Bon retour,", name: `*${guest.name}.*` },
  folioPill: "Ma note",
  roomService: {
    eyebrow: "Room service",
    title: "La carte, *jusqu’à votre porte.*",
    text: "Petit-déjeuner jusqu’à 11 h, la carte du jour jusqu’à 23 h, le minibar à toute heure.",
    photo: "breakfast" as const satisfies HotelPhoto,
    cta: "Voir la carte",
    sheetTitle: "Room service",
    served: `Livré en chambre ${guest.room}`,
    steps: (to: string) => ["Reçue en cuisine", "En préparation", `En route vers la ${to}`, "À votre porte"],
    actions: ["Préparer", "Monter", "Livrée"],
    asap: { label: "Dès que possible", hint: "Environ 25 min" },
    slotsLabel: "Petit-déjeuner, à l’heure de votre choix",
    slots: ["7 h – 7 h 30", "7 h 30 – 8 h", "8 h – 8 h 30", "8 h 30 – 9 h", "9 h – 9 h 30", "9 h 30 – 10 h"],
    scheduled: (slot: string) => `Programmée · ${slot}`,
    categories: [
      {
        name: "Petit-déjeuner",
        items: [
          { id: "continental", name: "Petit-déjeuner continental", detail: "Viennoiseries, pain, confitures, jus, boisson chaude", price: 48, allergens: ["Gluten", "Lait", "Œufs"], diets: ["vegetarien"] },
          { id: "oeufs", name: "Œufs brouillés", detail: "Ciboulette, pain grillé à part", price: 16, allergens: ["Œufs", "Lait"], diets: ["vegetarien", "sans-gluten"] },
          { id: "avocado", name: "Tartine avocat", detail: "Pain au levain, citron, graines", price: 21, allergens: ["Gluten", "Sésame"], diets: ["vegetarien", "sans-lactose"] },
          { id: "granola", name: "Granola maison", detail: "Yaourt grec, miel, fruits rouges", price: 16, allergens: ["Fruits à coque", "Lait"], diets: ["vegetarien"] },
          { id: "jus-presse", name: "Jus d’orange pressé", detail: "25 cl", price: 12, diets: ["vegetarien", "sans-gluten", "sans-lactose"] },
          { id: "cappuccino", name: "Cappuccino", detail: "Lait entier ou d’avoine", price: 10, allergens: ["Lait"], diets: ["vegetarien", "sans-gluten"] },
        ],
      },
      {
        name: "Toute la journée",
        items: [
          { id: "club-room", name: "Club sandwich", detail: "Poulet, bacon, tomate, frites", price: 38, allergens: ["Gluten", "Œufs", "Moutarde"] },
          { id: "loup", name: "Filet de loup", detail: "Fenouil braisé, sauce vierge", price: 46, allergens: ["Poisson"], diets: ["sans-gluten", "sans-lactose"] },
          { id: "risotto", name: "Risotto aux légumes du marché", detail: "Parmesan, herbes fraîches", price: 34, allergens: ["Lait"], diets: ["vegetarien", "sans-gluten"] },
          { id: "salade-cesar", name: "Salade César", detail: "Poulet rôti, parmesan, croûtons", price: 30, allergens: ["Gluten", "Lait", "Œufs", "Poisson"] },
          { id: "tarte-citron", name: "Tarte au citron meringuée", detail: "Citron de Menton", price: 16, allergens: ["Gluten", "Œufs", "Lait"], diets: ["vegetarien"] },
        ],
      },
      {
        name: "Minibar",
        items: [
          { id: "eau", name: "Eau minérale", detail: "75 cl", price: 10, diets: ["vegetarien", "sans-gluten", "sans-lactose"] },
          { id: "champagne-demi", name: "Champagne brut", detail: "Demi-bouteille, 37,5 cl", price: 85, allergens: ["Sulfites"] },
          { id: "chips", name: "Chips artisanales", detail: "Sel de Camargue", price: 8, diets: ["vegetarien", "sans-gluten", "sans-lactose"] },
          { id: "chocolat", name: "Tablette de chocolat noir", detail: "70 %, éclats de fleur de sel", price: 10, diets: ["vegetarien", "sans-gluten"] },
        ],
      },
    ] satisfies Category[],
  },
  live: {
    eyebrow: "En direct",
    title: "L’hôtel *en ce moment.*",
    hint: "Touchez un espace pour sa journée.",
    calmest: (hour: string) => `Le plus calme : ${hour}`,
    now: "Maintenant",
    conditions: "En ce moment",
    day: "Sa journée",
  },
  requests: {
    eyebrow: "Une demande",
    title: "Sans décrocher *le téléphone.*",
    send: "Envoyer",
    sent: "Demande envoyée",
  },
  bookings: {
    eyebrow: "Réserver",
    title: "Un créneau, *c’est réservé.*",
    days: ["Aujourd’hui", "Demain"] as const,
    taken: "Pris",
    cta: (slot: string) => `Réserver · ${slot}`,
    pick: "Choisissez un créneau",
    onRoom: "Réglé sur votre note de chambre.",
    free: "Offert aux clients de l’hôtel",
    done: "Réservé",
  },
  spacesSection: {
    eyebrow: "Les espaces",
    title: "Chacun *sa carte.*",
    cta: "Voir la carte",
    orderHint: "Pour commander, scannez le QR de votre transat ou de votre table : le serveur sait où vous trouver.",
    demoScan: (label: string) => `Démo : scanner ${label.toLowerCase()}`,
  },
  info: {
    eyebrow: "Bon à savoir",
    title: "Tout l’hôtel, *dans votre poche.*",
    wifi: { label: "Wi-Fi", network: "GrandLarge-Clients", password: "transat-214", copy: "Copier le mot de passe du Wi-Fi", copyShort: "Copier", copied: "Copié" },
    items: [
      { title: "Petit-déjeuner", text: "De 7 h à 10 h 30 en salle Horizon, au rez-de-jardin. En chambre jusqu’à 11 h, à commander ici la veille ou le matin." },
      { title: "Départ", text: "Avant 11 h. Un départ tardif se demande ici, dans « Une demande », selon les disponibilités du jour." },
      { title: "Piscine et plage", text: "Piscine de 9 h à 19 h, chauffée à 27 °C. Serviettes au pool-house, transats sans réservation. La plage privée est à 3 minutes par le jardin." },
      { title: "Spa", text: "De 10 h à 20 h, au niveau −1. Hammam, sauna et bassin en accès libre ; les soins se réservent ici." },
      { title: "Parking", text: "Voiturier à l’entrée de 7 h à minuit, 45 € la nuit sur votre note. Bornes de recharge au parking." },
    ],
    addresses: {
      title: "Les adresses de la conciergerie",
      items: [
        { name: "Le marché couvert", hint: "8 min à pied", text: "Fruits, fromages et poisson du matin. Fermé le lundi." },
        { name: "Le sentier des douaniers", hint: "Départ face à l’hôtel", text: "Une heure de marche au-dessus des criques, idéale au coucher du soleil." },
        { name: "La vieille ville", hint: "12 min en taxi", text: "Ruelles, galeries et terrasses. La conciergerie réserve votre table." },
      ],
    },
    reception: { label: "La réception", text: "Composez le 9 depuis le téléphone de la chambre, jour et nuit." },
  },
};

/* ── La fréquentation en direct ──────────────────────────────────────── */

export interface LivePlace {
  id: string;
  label: string;
  /** Présents / capacité, ou un mot quand l'espace est fermé ou complet. */
  value: string;
  unit?: string;
  share: number;
  hint: string;
  /** Les places : l'équipe compte les entrées et les sorties, la jauge suit. */
  capacity?: number;
  /** Le repère recalculé quand l'équipe compte, à partir des places libres. */
  free?: (free: number) => string;
  /** Le chiffre qui décide d'y aller, sur la carte : l'eau, la mer, le coucher du soleil. */
  glance: string;
  hours: string;
  /** Les conditions du moment, dans la fiche. */
  facts: readonly { label: string; value: string }[];
  curve: { hours: readonly string[]; shares: readonly number[]; now: number; calm: number };
}

const day = ["9 h", "10 h", "11 h", "12 h", "13 h", "14 h", "15 h", "16 h", "17 h", "18 h", "19 h", "20 h"];

export const live: readonly LivePlace[] = [
  {
    id: "piscine",
    label: "Piscine",
    value: "21",
    unit: "/ 30",
    share: 0.7,
    hint: "9 transats libres",
    capacity: 30,
    free: (n) => (n === 0 ? "Complet" : `${n} transat${n > 1 ? "s" : ""} libre${n > 1 ? "s" : ""}`),
    glance: "Eau 27\u00a0°C",
    hours: "9 h – 19 h",
    facts: [
      { label: "Eau", value: "27\u00a0°C" },
      { label: "Air", value: "29\u00a0°C" },
      { label: "Indice UV", value: "7 · fort" },
      { label: "Soleil sur les transats", value: "Jusqu’à 18 h 30" },
      { label: "Bar de la piscine", value: "Ouvert jusqu’à 18 h" },
      { label: "Serviettes", value: "Au pool-house" },
    ],
    curve: { hours: day, shares: [0.1, 0.2, 0.35, 0.6, 0.85, 0.95, 0.9, 0.7, 0.5, 0.3, 0, 0], now: 7, calm: 9 },
  },
  {
    id: "plage",
    label: "Plage",
    value: "7",
    unit: "/ 10",
    share: 0.7,
    hint: "3 cabanes libres",
    capacity: 10,
    free: (n) => (n === 0 ? "Complet" : `${n} cabane${n > 1 ? "s" : ""} libre${n > 1 ? "s" : ""}`),
    glance: "Mer 25\u00a0°C",
    hours: "9 h – 19 h",
    facts: [
      { label: "Mer", value: "25\u00a0°C" },
      { label: "Drapeau", value: "Vert · mer calme" },
      { label: "Vent", value: "12 km/h, nord-ouest" },
      { label: "Baignade surveillée", value: "Jusqu’à 19 h" },
      { label: "Paillote", value: "Ouverte jusqu’à 19 h" },
      { label: "Accès", value: "3 min par le jardin" },
    ],
    curve: { hours: day, shares: [0.15, 0.3, 0.5, 0.7, 0.8, 0.9, 0.85, 0.7, 0.55, 0.4, 0.2, 0], now: 7, calm: 9 },
  },
  {
    id: "spa",
    label: "Spa",
    value: "Complet",
    share: 1,
    hint: "Libre à 16 h 30",
    glance: "Bassin 32\u00a0°C",
    hours: "10 h – 20 h",
    facts: [
      { label: "Prochain soin libre", value: "16 h 30" },
      { label: "Bassin", value: "32\u00a0°C" },
      { label: "Hammam", value: "45\u00a0°C" },
      { label: "Peignoir", value: "Dans votre penderie" },
    ],
    curve: { hours: day, shares: [0, 0.3, 0.45, 0.4, 0.35, 0.6, 0.85, 1, 0.9, 0.7, 0.4, 0], now: 7, calm: 10 },
  },
  {
    id: "sauna",
    label: "Sauna",
    value: "1",
    unit: "/ 6",
    share: 0.17,
    hint: "Libre",
    capacity: 6,
    free: (n) => (n === 0 ? "Complet" : "Libre"),
    glance: "Cabine 85\u00a0°C",
    hours: "10 h – 20 h",
    facts: [
      { label: "Cabine", value: "85\u00a0°C" },
      { label: "Bain froid", value: "14\u00a0°C" },
      { label: "Séance conseillée", value: "10 à 15 min" },
      { label: "Serviettes", value: "À l’entrée du spa" },
    ],
    curve: { hours: day, shares: [0, 0.2, 0.3, 0.2, 0.15, 0.3, 0.4, 0.17, 0.25, 0.8, 0.7, 0], now: 7, calm: 8 },
  },
  {
    id: "sport",
    label: "Salle de sport",
    value: "3",
    unit: "/ 12",
    share: 0.25,
    hint: "Calme",
    capacity: 12,
    free: (n) => (n === 0 ? "Complet" : n < 4 ? "Presque pleine" : "Calme"),
    glance: "Yoga à 18 h",
    hours: "6 h – 22 h",
    facts: [
      { label: "Prochain cours", value: "Yoga, 18 h · 4 places" },
      { label: "Tapis de course", value: "2 libres sur 4" },
      { label: "Climatisation", value: "19\u00a0°C" },
      { label: "Eau et serviettes", value: "Sur place" },
    ],
    curve: { hours: day, shares: [0.7, 0.5, 0.3, 0.2, 0.15, 0.1, 0.15, 0.25, 0.45, 0.8, 0.6, 0.3], now: 7, calm: 11 },
  },
  {
    id: "rooftop",
    label: "Rooftop",
    value: "Fermé",
    share: 0,
    hint: "Ouvre à 19 h",
    glance: "Coucher 20 h 41",
    hours: "19 h – 1 h",
    facts: [
      { label: "Coucher du soleil", value: "20 h 41" },
      { label: "Ce soir", value: "DJ set à 21 h" },
      { label: "Terrasse", value: "22 tables libres" },
      { label: "Température à 21 h", value: "24\u00a0°C" },
    ],
    curve: { hours: day, shares: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.35, 0.75], now: 7, calm: 10 },
  },
];

/* ── Les demandes ────────────────────────────────────────────────────── */

export type RequestIcon = "towel" | "pillow" | "broom" | "iron" | "kit" | "clock" | "car" | "alarm";

export interface RequestKind {
  id: string;
  label: string;
  hint: string;
  icon: RequestIcon;
  /** L'équipe qui la reçoit. */
  team: "etages" | "reception";
  /** La question posée avant l'envoi, et ses réponses. */
  ask?: { label: string; options: readonly string[] };
  steps: readonly string[];
  actions: readonly string[];
}

const toFloor = ["Reçue par les étages", "En route", "À votre porte"];
const toFloorActions = ["J’y vais", "Apporter"];

export const requestKinds: readonly RequestKind[] = [
  { id: "serviettes", label: "Serviettes", hint: "Bain ou piscine", icon: "towel", team: "etages", ask: { label: "Combien ?", options: ["1", "2", "3", "4"] }, steps: toFloor, actions: toFloorActions },
  { id: "oreiller", label: "Oreiller", hint: "Plume, mi-ferme, sans plume", icon: "pillow", team: "etages", ask: { label: "Lequel ?", options: ["Plume", "Mi-ferme", "Sans plume"] }, steps: toFloor, actions: toFloorActions },
  { id: "menage", label: "Ménage", hint: "À l’heure qui vous arrange", icon: "broom", team: "etages", ask: { label: "Quand ?", options: ["Maintenant", "Dans 1 h", "Dans 2 h", "Demain matin"] }, steps: ["Programmé avec les étages", "En cours", "Chambre faite"], actions: ["Commencer", "Chambre faite"] },
  { id: "fer", label: "Fer à repasser", hint: "Avec sa planche", icon: "iron", team: "etages", steps: toFloor, actions: toFloorActions },
  { id: "trousse", label: "Trousse de toilette", hint: "Brosse à dents, rasoir", icon: "kit", team: "etages", steps: toFloor, actions: toFloorActions },
  { id: "depart", label: "Départ tardif", hint: "Selon disponibilité", icon: "clock", team: "reception", ask: { label: "Jusqu’à quelle heure ?", options: ["12 h", "14 h", "16 h"] }, steps: ["Demandé à la réception", "Accordé"], actions: ["Accorder"] },
  { id: "taxi", label: "Taxi", hint: "La conciergerie réserve", icon: "car", team: "reception", ask: { label: "Pour quand ?", options: ["Dans 15 min", "Dans 30 min", "Dans 1 h", "Demain 9 h"] }, steps: ["Demandé à la conciergerie", "Confirmé", "Devant l’hôtel"], actions: ["Confirmer", "Taxi arrivé"] },
  { id: "reveil", label: "Réveil", hint: "Un appel en chambre", icon: "alarm", team: "reception", ask: { label: "À quelle heure ?", options: ["6 h 30", "7 h", "7 h 30", "8 h"] }, steps: ["Réveil programmé", "Appel passé"], actions: ["Appel passé"] },
];

/* ── Les réservations ────────────────────────────────────────────────── */

export interface Bookable {
  id: string;
  label: string;
  detail: string;
  /** Sur la note de chambre. */
  place: string;
  team: "spa" | "reception";
  photo: HotelPhoto;
  /** Prix posé sur la note ; 0 : offert. */
  price: number;
  /** Les créneaux par jour (rang de room.bookings.days) ; false : déjà pris. */
  slots: readonly (readonly (readonly [time: string, free: boolean])[])[];
}

export const bookables: readonly Bookable[] = [
  {
    id: "massage",
    place: "Spa",
    team: "spa",
    label: "Massage · 50 min",
    detail: "Aux huiles chaudes, en cabine",
    photo: "spa",
    price: 185,
    slots: [
      [["14 h", false], ["15 h", false], ["16 h 30", true], ["17 h 30", true], ["18 h 30", false]],
      [["10 h", true], ["11 h", true], ["14 h", false], ["15 h", true], ["16 h 30", true], ["17 h 30", true]],
    ],
  },
  {
    id: "sauna",
    place: "Spa",
    team: "spa",
    label: "Sauna privatif · 45 min",
    detail: "Pour deux, serviettes et tisane",
    photo: "suite",
    price: 0,
    slots: [
      [["15 h", false], ["17 h", false], ["18 h", true], ["19 h", true]],
      [["10 h", true], ["11 h", true], ["15 h", true], ["17 h", false], ["18 h", true]],
    ],
  },
  {
    id: "tennis",
    place: "Tennis",
    team: "reception",
    label: "Court de tennis · 1 h",
    detail: "Raquettes et balles prêtées",
    photo: "terrace",
    price: 0,
    slots: [
      [["8 h", false], ["9 h", false], ["17 h", true], ["18 h", false], ["19 h", true]],
      [["8 h", true], ["9 h", true], ["10 h", false], ["18 h", true], ["19 h", true]],
    ],
  },
  {
    id: "velos",
    place: "Conciergerie",
    team: "reception",
    label: "Vélos électriques · demi-journée",
    detail: "Casque, antivol, carte des balades",
    photo: "horizon",
    price: 40,
    slots: [
      [["9 h", false], ["14 h", false]],
      [["9 h", true], ["14 h", true]],
    ],
  },
];

/* ── La note de chambre ──────────────────────────────────────────────── */

export interface FolioLine {
  space: string;
  when: string;
  item: string;
  amount: number;
}

export const folio = {
  title: `Note de chambre · ${guest.room}`,
  subtitle: "Réglée au départ, sur votre facture.",
  total: "Total du séjour",
  empty: "Rien sur la note pour l’instant.",
  today: (time: string) => `Aujourd’hui · ${time}`,
  stay: {
    title: "Votre séjour",
    items: [
      { label: "Chambre", value: `${guest.room} · vue mer` },
      { label: "Au nom de", value: guest.name },
      { label: "Arrivée", value: "Hier · 3 nuits" },
      { label: "Départ", value: "Dans 2 jours, avant 11\u00a0h" },
      { label: "Petit-déjeuner inclus", value: "7 h – 10\u00a0h\u00a030" },
      { label: "Réception", value: "Le 9, jour et nuit" },
      { label: `Wi-Fi ${room.info.wifi.network} · mot de passe`, value: room.info.wifi.password },
    ],
  },
  seed: [
    { space: "Piscine", when: "Hier · 16 h 12", item: "2 × Spritz Hugo · transat 12", amount: 48 },
    { space: "Rooftop", when: "Hier · 21 h 40", item: "Negroni, Dry Martini · table 7", amount: 50 },
  ] satisfies FolioLine[],
};

/* ── Commander, suivre ───────────────────────────────────────────────── */

export const order = {
  add: (name: string) => `Ajouter ${name}`,
  remove: (name: string) => `Retirer ${name}`,
  contains: "Contient",
  filters: "Régimes",
  noMatch: "Rien dans cette rubrique pour ces régimes.",
  cartBar: (count: number) => `Voir la commande · ${count} article${count > 1 ? "s" : ""}`,
  cartTitle: "Votre commande",
  back: "Retour à la carte",
  delivery: "Livraison",
  note: { label: "Un mot pour l’équipe", placeholder: "Allergie, cuisson, sans glaçons…" },
  tip: { label: "Pourboire pour l’équipe", options: [0, 2, 5, 10] as const, none: "Non merci" },
  pay: {
    label: "Régler",
    room: (room: string) => `Sur ma chambre ${room}`,
    roomUnknown: "Sur ma chambre",
    card: "Par carte",
    sign: (total: string) => `Signer · ${total}`,
    payCard: (total: string) => `Payer · ${total}`,
    cardNote: "Apple Pay, Google Pay ou carte. Démo : aucun paiement.",
  },
  verify: {
    title: "Votre chambre",
    text: "Pour poser la commande sur votre note, le numéro de chambre et le nom de la réservation.",
    room: "Chambre",
    name: "Nom",
    error: "Ce nom ne correspond pas à cette chambre.",
    hint: `Démo : chambre ${guest.room}, nom ${guest.lastName}.`,
  },
  recognised: (name: string) => `Bon retour, ${name}.`,
  usual: { kicker: "Comme hier ?", cta: "Ajouter", itemId: "spritz-hugo", space: "piscine" as SpaceId },
};

export const waiter = {
  call: "Appeler un serveur",
  title: "Appel au serveur",
  steps: (label: string) => [`Serveur prévenu · ${label.toLowerCase()}`, "Un serveur arrive", "Votre serveur est là"],
  actions: ["J’y vais", "Arrivé"],
};

export const tracking = {
  eyebrow: "En cours",
  advance: "Démo · étape suivante",
  done: "Terminé",
  dismiss: "Masquer",
};

export const demoFooter = {
  note: "Démo Ominin Hôtels · rien n’est envoyé ni payé.",
  reset: "Recommencer la démo",
  others: "Les autres QR codes",
  gestion: "Voir le côté gestion",
};

/** Une adresse inconnue sous la démo : le 404 de l'hôtel et le chemin du retour. */
export const demoNotFound = {
  code: "404",
  title: "Page introuvable",
  client: {
    title: "Cette porte *ne mène nulle part.*",
    text: "Aucun QR du Grand Large ne pointe ici. Choisissez-en un, ou passez de l’autre côté, dans la gestion de l’hôtel.",
  },
  gestion: {
    title: "Cette page *n’existe pas.*",
    text: "Elle ne fait pas partie de la gestion du Grand Large. Revenez à la journée de l’hôtel, ou scannez un QR côté client.",
  },
  chooser: "Les QR codes de la démo",
  home: "La gestion de l’hôtel",
  today: "Revenir à Aujourd’hui",
};

/** Sur « Ma note », une fois que la réception l'a envoyée sur la facture. */
export const folioSent = "Envoyée sur votre facture par la réception.";

/* Les libellés composés de la démo client : séparateurs et espaces insécables ici, jamais dans les composants. */
const joined = (parts: readonly (string | false | undefined)[]) => parts.filter(Boolean).join(" · ");
const listed = (parts: readonly string[]) => parts.join(", ");

export const guestText = {
  joined,
  listed,
  stay: (room: string, stay: string) => joined([roomLabel(room), stay]),
  reading: (place: LivePlace) => joined([place.unit ? `${place.value} ${place.unit}` : place.value, place.hint]),
  slot: (day: string, slot: string) => joined([day, slot]),
  booked: (label: string, day: string, slot: string) => joined([label, `${day.toLowerCase()} ${slot}`]),
  bookingPrice: (price: string) => joined([price, room.bookings.onRoom]),
  /** « La piscine » → « La *piscine.* » : le nom de l'espace en italique de laiton. */
  spaceTitle: (name: string) => name.replace(/ (.+)$/, " *$1.*"),
  spot: (place: string, spot: string) => joined([place, spot]),
  usual: (detail: string, price: string) => joined([detail, price]),
  allergens: (allergens: readonly string[]) => `${order.contains} : ${listed(allergens).toLowerCase()}`,
  line: (qty: number, name: string) => (qty > 1 ? `${qty}\u00a0×\u00a0${name}` : name),
  onSpot: (what: string, spot: string) => joined([what, spot.toLowerCase()]),
  quote: (text: string) => `« ${text} »`,
  status: (title: string, step: string) => `${title} : ${step}`,
};

/* ── Ce qui est en cours ─────────────────────────────────────────────── */

export type TeamId = "room-service" | SpaceId | "etages" | "reception" | "restaurant" | "cuisine";
export type ActivityKind = "commande" | "appel" | "demande" | "reservation";

export interface Ticket {
  lines: readonly { qty: number; name: string }[];
  /** Pourboire compris. */
  total: number;
  tip: number;
  /** La chambre où la commande est posée ; absente, réglée par carte. */
  room?: string;
  note?: string;
  slot?: string;
}

/** Une commande, un appel, une demande, une réservation : le client la suit, l'équipe la fait avancer. */
export interface Activity {
  id: string;
  /** Le QR d'où vient la demande : un espace ne montre que les siennes. */
  origin: string;
  kind: ActivityKind;
  team: TeamId;
  /** Où aller : « Transat 12 », « Chambre 214 ». */
  where: string;
  /** Le client, quand l'hôtel l'a reconnu. */
  guest?: string;
  title: string;
  detail: string;
  steps: readonly string[];
  /** Le geste de l'équipe vers chaque étape suivante. */
  actions: readonly string[];
  step: number;
  at: string;
  icon?: RequestIcon;
  ticket?: Ticket;
  booking?: { id: string; day: number; time: string };
  /** Masquée du suivi du client ; l'équipe la voit toujours. */
  hidden?: boolean;
  /** Un autre client de l'hôtel, posé par la démo pour l'équipe : jamais dans le suivi du visiteur. */
  seed?: boolean;
}

/** Ce qu'une demande de chambre devient dans le suivi. */
export function requestActivity(kind: RequestKind, choice?: string) {
  return {
    kind: "demande" as const,
    team: kind.team,
    icon: kind.icon,
    title: choice ? `${kind.label} · ${choice}` : kind.label,
    steps: kind.steps,
    actions: kind.actions,
  };
}

function requestKind(id: string): RequestKind {
  const kind = requestKinds.find((k) => k.id === id);
  if (!kind) throw new Error(`Demande inconnue : ${id}`);
  return kind;
}

/* ── L'espace équipe ─────────────────────────────────────────────────── */

export const staff = {
  title: "Le service, *en direct.*",
  subtitle: "Ce que les clients commandent, appellent et demandent, avec l’endroit où les trouver. Chaque geste de l’équipe s’affiche sur leur téléphone.",
  hint: `Commandez comme un client, depuis la ${roomLabel(guest.room).toLowerCase()} : la commande arrive ici en direct.`,
  zones: "Zones",
  allZones: "Toutes",
  teams: {
    "room-service": "Room service",
    piscine: "Piscine",
    plage: "Plage",
    rooftop: "Rooftop",
    lobby: "Lobby",
    spa: "Spa",
    etages: "Étages",
    reception: "Réception",
    restaurant: "Restaurant",
    cuisine: "Cuisine",
  } satisfies Record<TeamId, string>,
  kinds: { commande: "Commande", appel: "Appel", demande: "Demande", reservation: "Réservation" } satisfies Record<ActivityKind, string>,
  columns: {
    new: { title: "À prendre", empty: "Rien à prendre." },
    doing: { title: "En cours", empty: "Rien en cours." },
    done: { title: "Terminé", empty: "Rien de terminé pour l’instant." },
  },
  /** Au-delà, en minutes, ce qui attend se teinte sur le tableau du service. */
  lateAfter: 10,
  since: (minutes: number) => (minutes < 1 ? "à l’instant" : `depuis ${minutes} min`),
  openCount: (n: number) => `${n} ouverte${n > 1 ? "s" : ""}`,
  guestLink: `Ouvrir la ${roomLabel(guest.room).toLowerCase()}`,
  roomsView: {
    /** Le paramètre d'adresse de l'affichage choisi : « ?vue=liste ». */
    param: "vue",
    action: (action: string, next: string) => `${action} → ${next}`,
    changed: (next: string) => `Chambre passée en « ${next} ».`,
    empty: "Aucune chambre dans cet état.",
    yours: "Votre chambre",
    /** Le nom de famille sous le numéro : « M. et Mme Weber » → « Weber ». */
    surname: (name: string) => name.split(/\s+/).at(-1) ?? name,
    departures: (gone: number) => `Départs · ${gone} parti${gone > 1 ? "s" : ""}`,
    /** Sous « Arrivée » : faite, accordée à l'arrivée, quel que soit le client. */
    arrivedAt: (time: string, who: string) => `Faite à ${time} · ${who}`,
  },
  /** Ce que le visiteur de la démo vient d'envoyer, en tête de sa colonne. */
  fresh: "Nouveau",
  /** L'heure de la démo, « 16 h 05 », depuis ses minutes depuis minuit. */
  time: (minutes: number) => `${Math.floor(minutes / 60) % 24} h ${String(minutes % 60).padStart(2, "0")}`,
  slots: {
    past: "Passé",
    unsold: "Resté libre",
    over: "Fini pour aujourd’hui",
    full: "Complet",
    left: (n: number) => `${n} créneau${n > 1 ? "x" : ""} libre${n > 1 ? "s" : ""}`,
  },
  notesView: {
    demo: `Dans la démo, seule la note de la ${roomLabel(guest.room).toLowerCase()} suit vos commandes ; les autres sont des exemples.`,
  },
  tips: "Pourboires",
  pay: { room: (room: string) => `Sur la chambre ${room}`, card: "Réglé par carte" },
  tip: (amount: string) => `dont ${amount} de pourboire`,
  note: "Mot du client",
  slot: (slot: string) => `Pour ${slot}`,
  done: "Fait",
  planning: {
    title: "Les créneaux, *réservés.*",
    hint: "Les réservations des clients, depuis leur chambre. Celles de Madame Laurent arrivent ici en direct.",
    free: "Libre",
    /** Un client par créneau déjà pris : réservations dans l'ordre, aujourd'hui puis demain, créneaux dans l'ordre. */
    occupants: [
      "Chambre 118 · M. et Mme Brun",
      "Chambre 312 · Mme Rossi",
      "Chambre 319 · Mme Tran",
      "Chambre 305 · Mme Okafor",
      "Chambre 107 · M. Haddad",
      "Chambre 401 · M. et Mme Vidal",
      "Chambre 424 · Mme Svensson",
      "Chambre 109 · M. Lefèvre",
      "Chambre 236 · Famille Bertrand",
      "Chambre 128 · M. Benhamou",
      "Chambre 412 · M. et Mme Keller",
      "Chambre 401 · M. et Mme Vidal",
      "Chambre 109 · M. Lefèvre",
    ],
  },
  notes: {
    title: "La note *de chaque chambre.*",
    hint: "Ce que chaque chambre a signé, où et quand. Rien à ressaisir au départ.",
    lines: (n: number) => `${n} ligne${n > 1 ? "s" : ""}`,
    send: "Envoyer sur la facture",
    sent: "Envoyée sur la facture",
    total: "Total du séjour",
    empty: "Rien sur la note pour l’instant.",
    live: "Se remplit en direct",
    slate: "Note de chambre",
    mine: { room: guest.room, guest: guest.name, stay: "Départ dans 2 jours, avant 11\u00a0h" },
    slates: [
      {
        room: "305",
        guest: "Mme Okafor",
        stay: "Départ dans 4 jours",
        lines: [
          { space: "Room service", when: "Aujourd’hui · 8 h 10", item: "Petit-déjeuner continental", amount: 48 },
          { space: "Piscine", when: "Aujourd’hui", item: "2 × Spritz Apérol, Eau de coco · transat 4", amount: 62 },
          { space: "Room service", when: "Aujourd’hui", item: "Club sandwich, Eau minérale", amount: 48 },
        ],
      },
      {
        room: "118",
        guest: "M. et Mme Brun",
        stay: "Départ demain",
        lines: [
          { space: "Rooftop", when: "Hier · 21 h 50", item: "2 × Negroni · table 3", amount: 48 },
          { space: "Spa", when: "Aujourd’hui · 14 h", item: "Massage · 50 min", amount: 185 },
          { space: "Plage", when: "Aujourd’hui", item: "Bouteille de rosé · cabane 2", amount: 95 },
        ],
      },
      {
        room: "107",
        guest: "M. Haddad",
        stay: "Départ dans 5 jours",
        lines: [
          { space: "Lobby", when: "Hier · 18 h 20", item: "Picpoul de Pinet", amount: 18 },
          { space: "Spa", when: "Aujourd’hui", item: "Thé blanc, Jus vert · lit de repos 3", amount: 30 },
        ],
      },
      {
        room: "221",
        guest: "M. et Mme Weber",
        stay: "Départ tardif · 16 h",
        lines: [
          { space: "Room service", when: "Hier · 22 h 15", item: "Champagne brut, demi-bouteille", amount: 85 },
          { space: "Voiturier", when: "3 nuits", item: "Parking", amount: 135 },
        ],
      },
    ] satisfies { room: string; guest: string; stay: string; lines: FolioLine[] }[],
  },
  direct: {
    hint: "Une entrée, une sortie : la jauge des clients suit, sur leur téléphone.",
    enter: (place: string) => `Une entrée · ${place}`,
    leave: (place: string) => `Une sortie · ${place}`,
  },
};

/**
 * Les autres clients de l'hôtel, pour que l'espace équipe ne s'ouvre pas
 * vide ; `ago` : posés il y a tant de minutes.
 */
export const staffSeed: readonly (Omit<Activity, "id" | "at" | "detail" | "seed"> & { ago: number })[] = [
  {
    origin: "transat-4",
    kind: "commande",
    team: "piscine",
    where: "Transat 4",
    guest: "Mme Okafor",
    title: "2 × Spritz Apérol, Eau de coco",
    steps: spaces.piscine.steps("Transat 4"),
    actions: spaces.piscine.actions,
    step: 0,
    ago: 1,
    ticket: { lines: [{ qty: 2, name: "Spritz Apérol" }, { qty: 1, name: "Eau de coco" }], total: 62, tip: 2, room: "305" },
  },
  { origin: "cabane-2", kind: "appel", team: "plage", where: "Cabane 2", title: waiter.title, steps: waiter.steps("Cabane 2"), actions: waiter.actions, step: 0, ago: 2 },
  { origin: "chambre-221", where: roomLabel("221"), guest: "M. et Mme Weber", ...requestActivity(requestKind("taxi"), "Dans 15 min"), step: 0, ago: 4 },
  { origin: "chambre-118", where: roomLabel("118"), guest: "M. et Mme Brun", ...requestActivity(requestKind("oreiller"), "Mi-ferme"), step: 1, ago: 6 },
  {
    origin: "salon-1",
    kind: "commande",
    team: "lobby",
    where: "Salon 1",
    title: "2 × Café crème",
    steps: spaces.lobby.steps("Salon 1"),
    actions: spaces.lobby.actions,
    step: 2,
    ago: 7,
    ticket: { lines: [{ qty: 2, name: "Café crème" }], total: 19, tip: 1 },
  },
  {
    origin: "chambre-305",
    kind: "commande",
    team: "room-service",
    where: roomLabel("305"),
    guest: "Mme Okafor",
    title: "Club sandwich, Eau minérale",
    steps: room.roomService.steps("305"),
    actions: room.roomService.actions,
    step: 1,
    ago: 9,
    ticket: { lines: [{ qty: 1, name: "Club sandwich" }, { qty: 1, name: "Eau minérale" }], total: 48, tip: 0, room: "305", note: "Sans moutarde, merci" },
  },
  { origin: "chambre-107", where: roomLabel("107"), guest: "M. Haddad", ...requestActivity(requestKind("menage"), "Dans 1 h"), step: 0, ago: 12 },
  {
    origin: "lit-3",
    kind: "commande",
    team: "spa",
    where: "Lit de repos 3",
    guest: "M. Haddad",
    title: "Thé blanc, Jus vert",
    steps: spaces.spa.steps("Lit de repos 3"),
    actions: spaces.spa.actions,
    step: 3,
    ago: 25,
    ticket: { lines: [{ qty: 1, name: "Thé blanc" }, { qty: 1, name: "Jus vert" }], total: 30, tip: 0, room: "107" },
  },
];

/* ── La gestion de l'hôtel ───────────────────────────────────────────── */

export type RoomStatus = "occupee" | "depart" | "a-faire" | "prete" | "libre";

export type GestionIcon = "home" | "bell" | "bed" | "wave" | "calendar" | "receipt" | "users" | "chart";

export interface GestionNavItem {
  /** Après /demo/gestion ; vide : la page du jour. */
  path: string;
  label: string;
  icon: GestionIcon;
}

export interface Reading {
  place: string;
  label: string;
  value: number;
  unit: string;
  /** La consigne de l'hôtel ; absente, un simple repère. */
  target?: readonly [min: number, max: number];
  at: string;
}

/** Les chiffres d'un espace aujourd'hui, avant les commandes de la démo ; `wait` : de la commande au service, en minutes. */
const todayBySpace: Record<Exclude<TeamId, "etages" | "reception" | "cuisine">, { revenue: number; orders: number; wait?: number }> = {
  restaurant: { revenue: 6200, orders: 46, wait: 12 },
  piscine: { revenue: 5300, orders: 121, wait: 7 },
  plage: { revenue: 4300, orders: 84, wait: 8 },
  "room-service": { revenue: 3200, orders: 58, wait: 22 },
  spa: { revenue: 2600, orders: 22, wait: 5 },
  lobby: { revenue: 1250, orders: 47, wait: 4 },
  rooftop: { revenue: 0, orders: 0 },
};

export const gestion = {
  seo: {
    title: `Gestion · ${demoSeo.title}`,
    /** « Service · Le Grand Large — démo Ominin Hôtels » : le titre d'onglet d'une page. */
    page: (label: string) => `${label} · ${demoSeo.title}`,
    description: "La gestion d’un hôtel fictif : les chiffres du jour, les chambres, les espaces, le service en direct.",
  },
  product: "Hôtels",
  initials: "GL",
  role: "Direction",
  client: "Côté client",
  skip: "Aller au contenu",
  reset: "Recommencer la démo",
  more: "Plus",
  close: "Fermer",
  sections: "Sections",
  nav: {
    primary: [
      { path: "", label: "Aujourd’hui", icon: "home" },
      { path: "/service", label: "Service", icon: "bell" },
      { path: "/chambres", label: "Chambres", icon: "bed" },
      { path: "/espaces", label: "Espaces", icon: "wave" },
    ],
    more: [
      { path: "/planning", label: "Planning", icon: "calendar" },
      { path: "/notes", label: "Notes", icon: "receipt" },
      { path: "/equipe", label: "Équipe", icon: "users" },
      { path: "/analyses", label: "Analyses", icon: "chart" },
    ],
  } satisfies Record<string, GestionNavItem[]>,
  /** Ce que lit un lecteur d'écran à la place des pastilles du menu. */
  waiting: (n: number) => `${n} en attente`,
  toPrepare: (n: number) => `${n} chambre${n > 1 ? "s" : ""} à préparer`,

  today: {
    title: "Aujourd’hui, *au Grand Large.*",
    /** L'heure de la démo : le CA du jour s'arrête à cette heure entamée, l'équipe en poste se compte à cette heure. */
    hour: 16,
    /** Le jour de la démo, figé (ISO) : la page du jour l'affiche, les Analyses comptent leurs sept jours avant lui. */
    date: "2026-08-13",
    /** Une heure de la démo en clair, « 18 h », « 18 h 30 ». */
    hourOf: (minutes: number) => `${Math.floor(minutes / 60) % 24} h${minutes % 60 ? ` ${String(minutes % 60).padStart(2, "0")}` : ""}`,
    bySpace: todayBySpace,
    alerts: {
      label: "À surveiller",
      calm: "Rien à signaler",
      /** Un espace plus lent que ce temps de service (minutes) remonte ici. */
      slowAfter: 15,
      readings: (n: number) => `${n} relevé${n > 1 ? "s" : ""} hors consigne`,
      slow: (team: string, minutes: number) => `${team} : ${minutes} min d’attente`,
      calls: (n: number) => `${n} appel${n > 1 ? "s" : ""} en attente`,
      notReady: (n: number) => `${n} arrivée${n > 1 ? "s" : ""} sans chambre prête`,
    },
    revenue: {
      label: "Restauration et bars",
      delta: "+14 %",
      baseline: "par rapport à la semaine dernière, à cette heure",
      title: "Le CA hors hébergement : restaurant, bars, room service et spa, TTC",
      chart: "CA par heure, aujourd’hui",
      partial: (hour: string) => `${hour} : heure en cours`,
      hours: ["7 h", "8 h", "9 h", "10 h", "11 h", "12 h", "13 h", "14 h", "15 h", "16 h"],
      values: [480, 1030, 1210, 1060, 1590, 3940, 5120, 4210, 2640, 1570],
    },
    occupancy: {
      label: "Occupation ce soir",
      baseline: (occupied: number, total: number) => `${occupied} chambres sur ${total}`,
      chart: "Les chambres ce soir",
      /** Ce que chaque chambre sera cette nuit : occupée, arrivée attendue (prête ou non), libre. */
      night: { occupee: "Occupées", prete: "Arrivées, prêtes", "a-faire": "Arrivées à préparer", libre: "Libres" },
      /** Prix moyen d'une chambre vendue cette nuit, en euros. */
      adr: 640,
      money: "Ce que rapportent les chambres ce soir",
      revenue: "Hébergement",
      adrLabel: "Prix moyen",
      revpar: "RevPAR",
      arrivalsChart: (n: number) => `${n} arrivée${n > 1 ? "s" : ""} à venir, heure par heure`,
      arrivalsHour: (hour: string, n: number) => `${hour} : ${n}`,
    },
    basket: { label: "Panier moyen", baseline: "par commande, pourboire compris" },
    tips: { label: "Pourboires", baseline: "pour l’équipe, versés avec la paie" },
    spaces: { title: "CA par espace", sub: "aujourd’hui, TTC", ordersHead: "Commandes", closed:"Ouvre à 19 h" },
    now: {
      title: "En ce moment",
      open: "À prendre",
      doing: "En cours",
      calls: "Appels en attente",
      wait: "Temps de service",
      minutes: (n: number) => `${n} min`,
      cta: "Ouvrir le service",
    },
    arrivals: {
      title: "Arrivées · Départs",
      arrivals: "Arrivées",
      departures: "Départs",
      pending: (n: number, total: number) => `${n} à venir sur ${total}`,
      done: (n: number, total: number) => `${n} sur ${total} effectués`,
      list: "Les prochaines arrivées",
      room: (n: string) => `Ch. ${n}`,
      vip: "VIP",
      none: "Tous les clients du jour sont arrivés.",
      cta: "Voir les chambres",
    },
    /** `shown` : combien d'espaces, de relevés, d'arrivées la page du jour montre. */
    places: { title: "Affluence", cta: "Voir les espaces", shown: 4 },
    readings: { title: "Relevés", sub: "hors consigne d’abord", cta: "Tous les relevés", shown: 4 },
    arrivalsShown: 5,
    tomorrow: { title: "Demain", cta: "Les prévisions" },
  },

  rooms: {
    title: "Les chambres, *ce soir.*",
    sub: "Qui part, qui arrive, ce qui reste à préparer. Les étages le voient en même temps que la réception.",
    floors: [1, 2, 3, 4],
    perFloor: 36,
    floor: (n: number) => (n === 1 ? "1er étage" : `${n}e étage`),
    all: "Toutes",
    statuses: {
      occupee: "Occupée",
      depart: "Départ aujourd’hui",
      "a-faire": "À préparer",
      prete: "Prête",
      libre: "Libre",
    } satisfies Record<RoomStatus, string>,
    short: { occupee: "Occupée", depart: "Départ", "a-faire": "À préparer", prete: "Prête", libre: "Libre" } satisfies Record<RoomStatus, string>,
    /**
     * Les chambres qui ne sont pas simplement occupées, à 16 h : un seul départ reste à faire (221, départ
     * tardif) ; les chambres quittées le matin sont à préparer ou déjà prêtes.
     */
    set: {
      "112": "libre",
      "129": "libre",
      "208": "libre",
      "233": "libre",
      "315": "libre",
      "316": "libre",
      "334": "libre",
      "411": "libre",
      "427": "libre",
      "436": "libre",
      "103": "a-faire",
      "115": "a-faire",
      "120": "a-faire",
      "132": "a-faire",
      "204": "a-faire",
      "205": "a-faire",
      "222": "a-faire",
      "302": "a-faire",
      "310": "a-faire",
      "325": "a-faire",
      "403": "a-faire",
      "407": "a-faire",
      "126": "prete",
      "131": "prete",
      "217": "prete",
      "229": "prete",
      "303": "prete",
      "311": "prete",
      "330": "prete",
      "409": "prete",
      "418": "prete",
      "221": "depart",
    } satisfies Record<string, RoomStatus>,
    /** Qui occupe la chambre en ce moment. */
    guests: {
      "214": guest.name,
      "305": "Mme Okafor",
      "118": "M. et Mme Brun",
      "107": "M. Haddad",
      "221": "M. et Mme Weber",
      "312": "Mme Rossi",
      "109": "M. Lefèvre",
      "236": "Famille Bertrand",
      "401": "M. et Mme Vidal",
      "424": "Mme Svensson",
      "128": "M. Benhamou",
      "319": "Mme Tran",
      "412": "M. et Mme Keller",
      "102": "M. Horvat",
      "106": "Mme Garcia",
      "110": "M. et Mme Caron",
      "123": "Mme Ahmadi",
      "134": "M. et Mme Duarte",
      "201": "Mme Kim",
      "211": "M. et Mme Lacroix",
      "219": "M. Dimitriou",
      "227": "Famille Barbier",
      "306": "M. et Mme O’Brien",
      "318": "Mme Navarro",
      "323": "M. Öztürk",
      "331": "M. et Mme Murphy",
      "404": "Mme Rousseau",
      "415": "M. et Mme Haas",
      "422": "M. Faure",
      "433": "Famille Oliveira",
    } satisfies Record<string, string>,
    /**
     * Les arrivées du jour : avant 16 h, le client est là et la chambre occupée ; après, elle l'attend.
     * L'hôtel était plein hier soir sauf les chambres libres : chaque chambre d'une arrivée a vu un départ le matin.
     */
    arrivals: {
      "102": { time: "12 h 30", guest: "M. Horvat" },
      "201": { time: "13 h", guest: "Mme Kim" },
      "331": { time: "13 h 30", guest: "M. et Mme Murphy" },
      "106": { time: "14 h", guest: "Mme Garcia" },
      "422": { time: "14 h", guest: "M. Faure" },
      "227": { time: "14 h 30", guest: "Famille Barbier" },
      "110": { time: "15 h", guest: "M. et Mme Caron" },
      "123": { time: "15 h", guest: "Mme Ahmadi" },
      "211": { time: "15 h", guest: "M. et Mme Lacroix" },
      "323": { time: "15 h", guest: "M. Öztürk" },
      "404": { time: "15 h", guest: "Mme Rousseau" },
      "306": { time: "15 h 10", guest: "M. et Mme O’Brien" },
      "134": { time: "15 h 20", guest: "M. et Mme Duarte" },
      "219": { time: "15 h 30", guest: "M. Dimitriou" },
      "415": { time: "15 h 30", guest: "M. et Mme Haas" },
      "318": { time: "15 h 40", guest: "Mme Navarro" },
      "433": { time: "15 h 50", guest: "Famille Oliveira" },
      "131": { time: "17 h", guest: "Famille Nakamura" },
      "303": { time: "17 h", guest: "Mme Bianchi", vip: true },
      "103": { time: "17 h 30", guest: "M. et Mme Martin" },
      "126": { time: "17 h 30", guest: "M. et Mme Chevalier" },
      "115": { time: "18 h", guest: "M. Schmidt" },
      "217": { time: "18 h", guest: "M. Ferreira" },
      "311": { time: "18 h", guest: "M. Kowalski" },
      "418": { time: "18 h", guest: "M. et Mme Fischer", vip: true },
      "222": { time: "18 h 30", guest: "M. et Mme Moreau" },
      "330": { time: "18 h 30", guest: "Famille Janssens" },
      "204": { time: "19 h", guest: "M. et Mme Girard" },
      "409": { time: "19 h", guest: "Mme Rahman" },
      "132": { time: "19 h 30", guest: "M. Kaplan" },
      "325": { time: "20 h", guest: "Mme Andersson" },
      "120": { time: "20 h", guest: "Mme Mercier" },
      "229": { time: "20 h 30", guest: "M. et Mme Gauthier" },
      "221": { time: "21 h", guest: "M. et Mme Petit" },
      "403": { time: "21 h 30", guest: "M. Costa" },
      "302": { time: "22 h", guest: "Mme Diallo" },
    } satisfies Record<string, { time: string; guest: string; vip?: boolean }>,
    stats: { occupied: "Occupées ce soir", arrivals: "Arrivées", departures: "Départs", toPrepare: "À préparer" },
    arrival: "Arrivée",
    guest: "Client",
    note: "Note de chambre",
    requests: "En cours",
    noRequest: "Rien en cours pour cette chambre.",
    actions: { depart: "Départ effectué", "a-faire": "Chambre prête" } satisfies Partial<Record<RoomStatus, string>>,
    after: { depart: "a-faire", "a-faire": "prete" } satisfies Partial<Record<RoomStatus, RoomStatus>>,
  },

  spaces: {
    title: "Les espaces, *en direct.*",
    sub: "L’affluence comptée à l’entrée, les relevés de l’équipe, la journée de chaque espace.",
    readingsTitle: "Relevés",
    readingsSub: "Températures et qualité de l’eau, saisies par l’équipe au fil de la journée.",
    inRange: "Dans la consigne",
    above: (max: string) => `Au-dessus de ${max}`,
    below: (min: string) => `En dessous de ${min}`,
    marker: "Repère",
    markerHint: "Sans consigne, relevé pour information",
    /** La barre d'une consigne montre, de chaque côté, cette part de sa largeur. */
    rangePad: 0.5,
    target: (min: string, max: string, unit: string) => `Consigne ${min} – ${max}${unit && `\u00a0${unit}`}`,
    at: (time: string) => `Relevé à ${time}`,
    placesTitle: "Affluence",
    hours: "Horaires",
    calm: (hour: string) => `Le plus calme : ${hour}`,
    readings: [
      { place: "Piscine", label: "Eau", value: 27, unit: "°C", target: [26, 28], at: "15 h 30" },
      { place: "Piscine", label: "Chlore libre", value: 1.6, unit: "mg/L", target: [0.4, 1.4], at: "15 h 30" },
      { place: "Piscine", label: "pH", value: 7.3, unit: "", target: [6.9, 7.7], at: "15 h 30" },
      { place: "Plage", label: "Mer", value: 25, unit:"°C", at: "14 h" },
      { place: "Spa", label: "Bassin", value: 32, unit: "°C", target: [31, 33], at: "15 h" },
      { place: "Spa", label: "Hammam", value: 45, unit: "°C", target: [42, 48], at: "15 h" },
      { place: "Sauna", label: "Cabine", value: 85, unit: "°C", target: [80, 90], at: "15 h" },
      { place: "Sauna", label: "Bain froid", value: 14, unit: "°C", target: [10, 15], at: "15 h" },
      { place: "Salle de sport", label: "Air", value: 19, unit: "°C", target: [18, 21], at: "14 h 30" },
      { place: "Extérieur", label: "Air", value: 29, unit: "°C", at: "16 h" },
    ] satisfies Reading[],
  },

  team: {
    title: "L’équipe *du jour.*",
    sub: "Qui est en poste, ce que chacun a traité aujourd’hui, et les pourboires de ses tables, de ses transats, de ses chambres.",
    stats: { onDuty: (hour: string) => `En poste à ${hour}`, served: "Commandes servies", rooms: "Chambres faites", tips: "Pourboires du jour" },
    /** Ce que compte `handled` : des commandes pour le service, des chambres pour les étages, des plats en cuisine. */
    handled: {
      orders: (n: number) => `${n} commande${n > 1 ? "s" : ""}`,
      etages: (n: number) => `${n} chambre${n > 1 ? "s" : ""}`,
      cuisine: (n: number) => `${n} plat${n > 1 ? "s" : ""}`,
      reception: (n: number) => `${n} demande${n > 1 ? "s" : ""}`,
    },
    noTips: "—",
    onDuty: "En poste",
    later: (hour: string) => `Arrive à ${hour}`,
    resumes: (hour: string) => `Reprend à ${hour}`,
    ended: (hour: string) => `Fin de service à ${hour}`,
    members: [
      { name: "Léo", role: "Serveur", team: "piscine", shift: "10 h – 18 h", handled: 66, tips: 72 },
      { name: "Inès", role: "Serveuse", team: "piscine", shift: "11 h – 19 h", handled: 55, tips: 58 },
      { name: "Malik", role: "Barman", team: "plage", shift: "10 h – 19 h", handled: 48, tips: 41 },
      { name: "Chloé", role: "Serveuse", team: "plage", shift: "12 h – 19 h", handled: 36, tips: 37 },
      { name: "Hugo", role: "Serveur d’étage", team: "room-service", shift: "7 h – 15 h", handled: 33, tips: 22 },
      { name: "Mei", role: "Commis d’étage", team: "room-service", shift: "13 h – 23 h", handled: 25, tips: 0 },
      { name: "Yanis", role: "Barman", team: "lobby", shift: "9 h – 17 h", handled: 38, tips: 18 },
      { name: "Zoé", role: "Serveuse", team: "lobby", shift: "15 h – 23 h", handled: 9, tips: 6 },
      { name: "Lina", role: "Praticienne", team: "spa", shift: "10 h – 18 h", handled: 13, tips: 14 },
      { name: "Jade", role: "Praticienne", team: "spa", shift: "12 h – 20 h", handled: 9, tips: 8 },
      { name: "Awa", role: "Gouvernante générale", team: "etages", shift: "8 h – 17 h", handled: 14, tips: 0 },
      { name: "Nadia", role: "Gouvernante d’étage", team: "etages", shift: "9 h – 17 h", handled: 12, tips: 0 },
      { name: "Tomás", role: "Valet de chambre", team: "etages", shift: "8 h – 16 h", handled: 13, tips: 0 },
      { name: "Rosa", role: "Femme de chambre", team: "etages", shift: "9 h – 17 h", handled: 12, tips: 0 },
      { name: "Kofi", role: "Valet de chambre", team: "etages", shift: "9 h – 17 h", handled: 11, tips: 0 },
      { name: "Fatou", role: "Femme de chambre", team: "etages", shift: "8 h – 16 h", handled: 13, tips: 0 },
      { name: "Lucie", role: "Femme de chambre", team: "etages", shift: "9 h – 17 h", handled: 12, tips: 0 },
      { name: "Dragan", role: "Valet de chambre", team: "etages", shift: "10 h – 18 h", handled: 11, tips: 0 },
      { name: "Priya", role: "Femme de chambre", team: "etages", shift: "10 h – 18 h", handled: 10, tips: 0 },
      { name: "Élodie", role: "Femme de chambre", team: "etages", shift: "13 h – 21 h", handled: 8, tips: 0 },
      { name: "Karim", role: "Équipier", team: "etages", shift: "10 h – 18 h", handled: 10, tips: 0 },
      { name: "Hoa", role: "Femme de chambre", team: "etages", shift: "13 h – 21 h", handled: 8, tips: 0 },
      { name: "Bilal", role: "Équipier", team: "etages", shift: "12 h – 20 h", handled: 9, tips: 0 },
      { name: "Sofia", role: "Cheffe de réception", team: "reception", shift: "8 h – 17 h", handled: 27, tips: 0 },
      { name: "Nathan", role: "Concierge", team: "reception", shift: "12 h – 20 h", handled: 19, tips: 24 },
      { name: "Hélène", role: "Réceptionniste", team: "reception", shift: "15 h – 23 h", handled: 6, tips: 0 },
      { name: "Bastien", role: "Réceptionniste de nuit", team: "reception", shift: "22 h – 7 h", handled: 0, tips: 0, away: true },
      { name: "Jules", role: "Serveur", team: "restaurant", shift: "11 h – 15 h · 18 h – 23 h", handled: 26, tips: 31 },
      { name: "Anaïs", role: "Serveuse", team: "restaurant", shift: "13 h – 23 h", handled: 20, tips: 26 },
      { name: "Antoine", role: "Chef de cuisine", team: "cuisine", shift: "11 h – 15 h · 18 h – 23 h", handled: 96, tips: 0 },
      { name: "Sami", role: "Cuisinier", team: "cuisine", shift: "7 h – 15 h", handled: 120, tips: 0 },
      { name: "Rania", role: "Cheffe de partie", team: "cuisine", shift: "14 h – 23 h", handled: 38, tips: 0 },
      { name: "Clara", role: "Barmaid", team: "rooftop", shift: "18 h – 1 h", handled: 0, tips: 0, away: true },
    ] satisfies { name: string; role: string; team: TeamId; shift: string; handled: number; tips: number; away?: boolean }[],
  },

  analyses: {
    title: "Les chiffres, *semaine après semaine.*",
    sub: "Les sept derniers jours complets, espace par espace.",
    /** CA hors hébergement de chaque jour, du plus ancien à hier. */
    revenue: [39600, 46500, 44400, 34800, 32500, 35700, 38700],
    orders: 4480,
    bySpace: { restaurant: 85200, rooftop: 52000, piscine: 42400, plage: 36400, "room-service": 28100, spa: 18800, lobby: 9300 } satisfies Partial<Record<TeamId, number>>,
    /** Les chambres sur les 7 nuits : nuitées vendues, prix moyen d'une chambre vendue (euros). */
    rooms: { sold: 900, adr: 620 },
    /** De la commande au service, en minutes, tous espaces confondus. */
    wait: 8,
    kpis: {
      revenue: "Restauration et bars",
      rooms: "Hébergement",
      occupancy: "Occupation",
      revpar: "RevPAR",
      orders: "Commandes",
      basket: "Panier moyen",
      adr: "Prix moyen",
      wait: "Temps de service",
    },
    baselines: {
      revenue: "sur les 7 jours d’avant",
      rooms: (sold: string) => `${sold} nuitées vendues cette semaine`,
      occupancy: (rooms: number) => `${rooms} chambres, 7 nuits`,
      revpar: "par chambre disponible et par nuit",
      orders: (perDay: number) => `${perDay} par jour en moyenne`,
      basket: "par commande, pourboire compris",
      adr: "par chambre vendue, cette semaine",
      wait: "de la commande au service, en moyenne",
    },
    delta: "+9 %",
    days: { title: "CA par jour", sub: "hors hébergement · 7 derniers jours", average: (amount: string) => `Moyenne ${amount}` },
    spaces: { title: "CA par espace", sub: "7 jours · part du total" },
    waits: {
      title: "Temps de service",
      sub: "de la commande au service, par espace",
      items: [
        { team: "room-service", minutes: 22 },
        { team: "restaurant", minutes: 13 },
        { team: "rooftop", minutes: 9 },
        { team: "plage", minutes: 8 },
        { team: "piscine", minutes: 7 },
        { team: "spa", minutes: 5 },
        { team: "lobby", minutes: 4 },
      ] satisfies { team: TeamId; minutes: number }[],
      unit: (n: number) => `${n} min`,
    },
    requests: {
      title: "Les demandes des chambres",
      sub: "7 jours · traitées en 9 min en moyenne",
      items: [
        { label: "Serviettes", count: 86 },
        { label: "Ménage à l’heure", count: 54 },
        { label: "Taxi", count: 33 },
        { label: "Oreiller", count: 21 },
        { label: "Départ tardif", count: 18 },
        { label: "Réveil", count: 12 },
        { label: "Fer à repasser", count: 9 },
      ],
    },
    forecast: {
      title: "Les prochains jours",
      sub: "Selon la météo et les réservations",
      days: [
        { day: "Demain", weather: "31 °C · soleil", occupancy: "96 % occupé", note: "Piscine pleine dès 13 h : prévoir 3 serveurs au bar." },
        { day: "Après-demain", weather: "28 °C · voilé", occupancy: "90 % occupé", note: "Plage calme le matin : 1 serveur jusqu’à midi." },
        { day: "Dans 3 jours", weather: "24 °C · averses", occupancy: "84 % occupé", note: "Spa et lobby chargés : renfort au bar du lobby de 15 h à 18 h." },
      ],
    },
  },
};

/** Le titre d'onglet d'une section de la gestion, d'après son entrée de menu. */
export const gestionPageTitle = (path: string) => {
  const item = [...gestion.nav.primary, ...gestion.nav.more].find((i) => i.path === path);
  return item ? gestion.seo.page(item.label) : gestion.seo.title;
};

/* ── Le plan 3D des chambres ─────────────────────────────────────────── */

export const plan = {
  model: "/hotels/demo/grand-large.glb",
  still: "/hotels/demo/grand-large.webp",
  stillAlt: "Maquette en blocs du Grand Large : l’hôtel ivoire, sa piscine, ses cabanes sur la plage et son rooftop",
  canvasLabel: "Maquette animée du Grand Large : les clients, l’équipe et les demandes en cours, en direct",
  views: [
    { value: "plan", label: "Plan 3D" },
    { value: "liste", label: "Liste" },
  ] as const,
  viewsLabel: "Affichage",
  levelsLabel: "Niveau",
  /** Du plus haut au plus bas : un niveau choisi masque ceux du dessus. */
  levels: [
    { value: "level-roof", label: "Tout" },
    { value: "level-4", label: "4e" },
    { value: "level-3", label: "3e" },
    { value: "level-2", label: "2e" },
    { value: "level-1", label: "1er" },
    { value: "level-0", label: "RDC" },
  ] as const,
  hint: "Glissez pour tourner, pincez pour zoomer, touchez une chambre pour sa fiche.",
  loading: "La maquette se charge…",
  reduced: "Animations réduites : la maquette reste immobile. La liste des chambres garde tout en direct.",
  toList: "Voir la liste des chambres",
  /** Les endroits où la caméra se pose, dans l'ordre des boutons ; les points sont dans la maquette (`poi-…`). */
  goTo: "Aller à",
  overview: "Vue d’ensemble",
  pois: {
    hall: "Hall",
    restaurant: "Restaurant",
    cuisine: "Cuisine",
    spa: "Spa",
    sport: "Sport",
    piscine: "Piscine",
    plage: "Plage",
    rooftop: "Rooftop",
    chambres: "Chambres",
    cour: "Cour",
  },
  feed: "En direct",
  feedEmpty: "L’hôtel est calme.",
  legendLabel: "Légende",
  /** Sur téléphone, la légende se replie derrière un « ? ». */
  legendToggle: { mark: "?", label: "Afficher la légende" },
  legend: { pending: "Demande en attente", doing: "Prise en charge", real: "Demande d’un client de la démo" },
  stats: { open: "Demandes en cours", busy: "Équipe occupée" },
  roomService: "Room service",
  waiterCall: "Appel au serveur",
  order: (item: string) => `Commande · ${item}`,
  events: {
    asked: (where: string, what: string) => `${where} · ${what}`,
    onTheWay: (who: string, where: string) => `${who} part vers ${where.toLowerCase()}`,
    atDesk: (who: string, what: string) => `${who} s’en occupe depuis la réception · ${what.toLowerCase()}`,
    done: (who: string, where: string) => `${who} a terminé · ${where.toLowerCase()}`,
    waiting: (where: string) => `${where} · personne de libre, en attente`,
  },
  places: {
    transat: (n: string) => `Transat ${n}`,
    cabane: (n: string) => `Cabane ${n}`,
    table: (n: string) => `Rooftop · table ${n}`,
    salon: (n: string) => `Lobby · salon ${n}`,
    lit: (n: string) => `Spa · lit de repos ${n}`,
    resto: (n: string) => `Horizon · table ${n}`,
    terrasse: (n: string) => `Terrasse · table ${n}`,
    tennis: (n: string) => `Tennis · court ${n}`,
    gym: (n: string) => `Salle de sport · poste ${n}`,
    bassin: () => "Spa · le bassin",
    door: (n: string) => roomLabel(n),
  } satisfies Record<string, (n: string) => string>,
};

/**
 * Les réglages de la vie simulée du plan : un jouet, pas une horloge. Durées
 * en secondes réelles, distances en mètres de maquette.
 */
export type FigurePose = "stand" | "sit" | "lie" | "swim" | "run" | "swing" | "cook" | "hidden";
export type FigureProp = "tray" | "cart" | "bag" | "racket" | "towel" | "pan";

export const simulation = {
  model: { hotel: plan.model, figures: "/hotels/demo/figures.glb", draco: "/hotels/demo/draco/" },
  guests: 36,
  /**
   * À l'ouverture de la page, l'hôtel vit déjà : la part des clients déjà installés quelque part, et ceux
   * que l'on place d'abord (par sorte d'endroit : leur tenue, combien) ; les autres arrivent ensuite.
   */
  start: {
    settled: 0.7,
    places: {
      nage: { outfit: "swim", count: 3 },
      transat: { outfit: "swim", count: 4 },
      resto: { outfit: "casual", count: 5 },
      table: { outfit: "casual", count: 4 },
      lit: { outfit: "robe", count: 3 },
      bassin: { outfit: "robe", count: 1 },
      gym: { outfit: "sport", count: 2 },
      tennis: { outfit: "sport", count: 2 },
    },
  },
  guestSpeed: 1.5,
  staffSpeed: 2.6,
  /** Chaque client marche à son pas : la vitesse × un facteur tiré dans l'intervalle. */
  speedJitter: [0.85, 1.15],
  /** Délai entre deux arrivées de clients, tiré dans l'intervalle. */
  spawnEvery: [2, 6],
  /** Le temps passé à un endroit avant d'en changer ou de partir. */
  stayFor: [35, 80],
  /** Part des clients qui repartent plutôt que d'aller ailleurs. */
  leaveShare: 0.2,
  requestEvery: [5, 11],
  /** Avant qu'un membre de l'équipe prenne la demande ; faute de libre, on réessaie toutes les `retryEvery` s. */
  pickupAfter: [2, 5],
  retryEvery: 1,
  /** Sur place, le temps de servir. */
  serveFor: [4, 8],
  /** Au comptoir ou au passe, le temps de prendre la commande avant de partir la servir. */
  pickupPause: [1.5, 3],
  /** Une demande simulée que personne ne prend est abandonnée : le client cesse de faire signe et passe à autre chose. */
  giveUpAfter: [35, 60],
  /** Les demandes simulées : chambres, room service, clients installés. */
  mix: { room: 0.45, roomService: 0.2, seated: 0.35 },
  /** Un client installé qui appelle : la part des appels qui sont une commande (sinon, un appel au serveur). */
  orderShare: 0.6,
  /** Où les clients vont, en poids. */
  destinations: { transat: 6, cabane: 4, nage: 3, table: 3, salon: 3, lit: 3, bassin: 1, door: 2, resto: 3, terrasse: 2, tennis: 1, gym: 2, fontaine: 2, ponton: 1 },
  /**
   * Part des arrivées qui se font à deux ; le second part `pairDelay` s après le premier et le suit à la
   * réception, `partnerLag` s derrière lui.
   */
  pairShare: 0.35,
  pairDelay: 1,
  partnerLag: 0.4,
  /** L'équipe qui sert chaque endroit. */
  spotTeams: { transat: "piscine", cabane: "plage", table: "rooftop", salon: "lobby", lit: "spa", bassin: "spa", resto: "restaurant", terrasse: "restaurant" } satisfies Record<string, TeamId>,
  /** Quand une équipe est toute prise (ou absente), les suivantes, dans l'ordre. */
  fallbacks: {
    rooftop: ["lobby", "restaurant"],
    lobby: ["restaurant", "rooftop"],
    piscine: ["plage", "lobby"],
    plage: ["piscine", "lobby"],
    spa: ["lobby"],
    restaurant: ["lobby", "room-service"],
    "room-service": ["restaurant"],
    reception: ["lobby"],
    etages: [],
    cuisine: [],
  } satisfies Record<TeamId, TeamId[]>,
  feedLength: 7,
  pixelRatioMax: 2,
  /** Le plus long pas de temps d'une image (s) : après un onglet en veille, la vie reprend sans sauter. */
  maxStep: 0.05,
  /** Ombres : la carte la plus fine seulement sur un grand écran peu dense. */
  shadows: { size: 2048, large: 4096, largeFrom: 1280, largeMaxDpr: 1.5 },
  /**
   * Le cadrage. Le regard (`fov`, `direction`) et la part de l'écran que la maquette remplit (`fill`)
   * viennent de hotels-demo-camera.json, partagé avec l'image fixe rendue dans Blender. Ici : un écran
   * étroit (rapport largeur / hauteur sous `narrow` : téléphone, tablette) se cadre plus serré
   * (`fillNarrow`) ; les bornes du zoom (× la taille de la maquette) et de l'inclinaison, la hauteur
   * minimale au-dessus du sol (m) ; « Aller à » : l'inclinaison d'arrivée (radians depuis la verticale) et
   * la durée du trajet (s) ; `tapSlop` : en deçà de ce glissé (px), un geste est un toucher.
   */
  camera: {
    fov: planLight.fov,
    direction: planLight.direction,
    fill: planLight.fill,
    fillNarrow: 1,
    narrow: 1.5,
    zoom: [0.04, 2.2],
    tilt: [0.15, 1.3],
    minHeight: 3,
    poiTilt: 0.8,
    flyFor: 0.8,
    tapSlop: 6,
  },
  /** La lumière, du même fichier que l'image fixe : exposition, reflets d'ambiance, ciel, soleil (position × la taille de la maquette). */
  light: { exposure: planLight.exposure, environment: planLight.environment, hemisphere: planLight.hemisphere, sun: planLight.sun },
  /**
   * Les étiquettes : en pixels par mètre à leur distance, en dessous de `full` une demande se réduit à un point,
   * en dessous de `staff` l'équipe n'a plus de nom ; au plus `staffMax` noms à la fois. Sous un étage affiché
   * (le salon sous le rooftop), une étiquette disparaît au-delà de `covered`. `lift` : sa hauteur au-dessus
   * du sol (× la taille de la figurine) ; `rank` : la priorité quand elles se gênent, la plus petite d'abord.
   */
  labels: {
    full: 4,
    staff: 9,
    staffMax: 6,
    covered: 12,
    lift: { request: 2.4, staff: 1.75 },
    rank: { mine: 0, pending: 1, doing: 2, staff: 3 },
  },
  /** Les figurines un peu plus grandes que nature : on les voit de loin sans qu'elles écrasent les tables. */
  figureScale: 1.6,
  /**
   * Plusieurs au même point (la réception, un poste, un passage) : chacun sa place, réservée dès qu'il s'y
   * dirige, en rangs de `columns` espacés de `spacing` (m) derrière le premier. En chemin, deux figurines
   * s'écartent l'une de l'autre sous `separation.radius` (m), d'au plus `max` (m), à `rate` (1/s).
   */
  slots: { spacing: 1.3, columns: 3 },
  separation: { radius: 0.9, max: 0.6, rate: 6 },
  /** La pose à chaque sorte d'endroit ; ailleurs, debout. */
  poses: {
    transat: "lie",
    lit: "lie",
    cabane: "lie",
    nage: "swim",
    resto: "sit",
    terrasse: "sit",
    table: "sit",
    salon: "sit",
    gym: "run",
    tennis: "swing",
    station: "cook",
    bassin: "stand",
    door: "hidden",
  } satisfies Record<string, FigurePose>,
  /**
   * Démarche : demi-amplitude des cuisses et des bras, flexion du genou en l'air (radians) ; la course
   * (tapis) : amplitude et flexion × celles de la marche, cadence (rad/s). `turn` : vitesse de rotation,
   * `accel` : mise en route et freinage (1/s), `brakeFloor` : la part de la vitesse gardée jusqu'au point,
   * `blend` : fondu d'une pose à l'autre (1/s), `rise` : le temps de se lever (s), `lieAfter` : assis
   * avant de s'allonger (s), `handOver` : le geste de service (s), `yawTolerance` : l'écart d'orientation
   * (radians) sous lequel une figurine arrivée est tournée comme il faut et se pose.
   */
  motion: {
    stride: 0.5,
    armSwing: 0.45,
    knee: 0.95,
    run: { stride: 1.4, knee: 1.5, cadence: 11 },
    turn: 9,
    accel: 4,
    brakeFloor: 0.25,
    blend: 8,
    rise: 0.5,
    lieAfter: 0.9,
    handOver: 1.4,
    yawTolerance: 0.12,
  },
  /**
   * Les rondes de l'équipe sans demande : temps passé à chaque point ; en cuisine, à chaque poste, où l'on
   * se tient `cookReach` (m) plus avant que le point, contre le plan de travail.
   */
  patrolPause: [3, 9],
  cookFor: [14, 30],
  cookReach: 0.35,
  /** Les étages : part des arrêts de ronde où l'on entre dans une chambre, et le temps passé à la porte. */
  doorVisit: 0.5,
  doorPause: [6, 14],
  /** Les équipes qui gardent un poste (comptoir, bureau) : leur premier membre y reste. */
  holdPost: ["reception", "lobby", "spa", "rooftop"] satisfies TeamId[],
  /** Le temps qu'un client arrivé passe à la réception avant de monter. */
  checkIn: [3, 6],
  /** Partage des clients qui rentrent à leur chambre plutôt que d'aller ailleurs. */
  roomShare: 0.15,
  skin: ["#f1d9bf", "#e2b48c", "#c48a5e", "#8d5a3b", "#5e3a24"],
  hair: ["#2b1d14", "#5a3a22", "#a8774c", "#d9b77a", "#e8e1d3", "#7a2e1f"],
  hairStyles: ["short", "long", "bun"],
  outfits: {
    swim: {
      share: 0.32,
      prefers: { transat: 4, cabane: 4, nage: 5, ponton: 2, door: 1 },
      tops: ["skin", "#2f93ad", "#c8734f", "#f2c14e", "#d98aa0"],
      bottoms: ["#2f93ad", "#c8734f", "#1c2340", "#d98aa0", "#f2c14e"],
      shoes: ["skin"],
      skirt: 0,
      hat: 0.45,
      props: ["towel"],
    },
    robe: {
      share: 0.14,
      prefers: { lit: 5, bassin: 4, salon: 1, door: 2 },
      tops: ["#fbf8f2"],
      bottoms: ["#fbf8f2"],
      shoes: ["#fbf8f2"],
      skirt: 1,
      hat: 0,
      props: [],
    },
    casual: {
      share: 0.44,
      prefers: { resto: 4, terrasse: 4, table: 3, salon: 3, fontaine: 3, ponton: 1, door: 2, transat: 1 },
      tops: ["#e9c98a", "#c8734f", "#4cc3cf", "#86a96f", "#f2c14e", "#d98aa0", "#8fa8e0", "#f4efe6", "#2c3560"],
      bottoms: ["#f4efe6", "#1c2340", "#ead6ab", "#3f6b55", "#a8774c"],
      shoes: ["#3b3f4a", "#a8774c", "#fbf8f2"],
      skirt: 0.35,
      hat: 0.25,
      props: [],
    },
    sport: {
      share: 0.1,
      prefers: { tennis: 6, gym: 6, nage: 1 },
      tops: ["#fbf8f2", "#8fa8e0"],
      bottoms: ["#1c2340", "#fbf8f2"],
      shoes: ["#fbf8f2"],
      skirt: 0.2,
      hat: 0,
      props: ["racket"],
    },
  },
  /** Les tenues de l'équipe : haut, bas, tablier ou chapeau (trim), ceinture et casquette (accent). */
  uniforms: {
    piscine: { top: "#fbf8f2", bottom: "#1c2340", trim: "#fbf8f2", accent: "#c9a05a", hat: "cap", apron: false, prop: "tray" },
    plage: { top: "#fbf8f2", bottom: "#ead6ab", trim: "#d9b77a", accent: "#1c2340", hat: "sun", apron: false, prop: "tray" },
    rooftop: { top: "#1c2340", bottom: "#1c2340", trim: "#fbf8f2", accent: "#c9a05a", hat: null, apron: false, prop: "tray" },
    lobby: { top: "#1c2340", bottom: "#1c2340", trim: "#fbf8f2", accent: "#c9a05a", hat: null, apron: false, prop: "tray" },
    spa: { top: "#e6dccb", bottom: "#e6dccb", trim: "#fbf8f2", accent: "#86a96f", hat: null, apron: false, prop: null },
    restaurant: { top: "#fbf8f2", bottom: "#1c2340", trim: "#1c2340", accent: "#c9a05a", hat: null, apron: true, prop: "tray" },
    "room-service": { top: "#fbf8f2", bottom: "#1c2340", trim: "#fbf8f2", accent: "#c9a05a", hat: "cap", apron: false, prop: "tray" },
    cuisine: { top: "#fbf8f2", bottom: "#3b3f4a", trim: "#fbf8f2", accent: "#3b3f4a", hat: "toque", apron: true, prop: "pan" },
    etages: { top: "#8fa8e0", bottom: "#8fa8e0", trim: "#fbf8f2", accent: "#1c2340", hat: null, apron: true, prop: "cart" },
    reception: { top: "#1c2340", bottom: "#1c2340", trim: "#fbf8f2", accent: "#c9a05a", hat: "cap", apron: false, prop: null },
  } satisfies Record<TeamId, { top: string; bottom: string; trim: string; accent: string; hat: "cap" | "sun" | "toque" | null; apron: boolean; prop: FigureProp | null }>,
  /** Les couleurs fixes du kit : les yeux (et la poêle), leur reflet. */
  eye: "#15151c",
  shine: "#ffffff",
  shoe: "#3b3f4a",
  /**
   * La chambre d'une demande s'allume : couleur et intensité (celle d'un client de la démo, plus vive) ;
   * en attente, elle bat entre `pulse.low` et 1 de son intensité, à `pulse.speed` (rad/s).
   */
  glow: "#e9c98a",
  glowReal: "#ffe3a3",
  glowStrength: { sim: 0.55, real: 0.9 },
  pulse: { low: 0.1, speed: 4 },
};

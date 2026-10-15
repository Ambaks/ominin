/*
 * Site public de la Boulangerie Cyprien (Toulouse). Chaque fait vient de leur
 * site actuel ou de la recherche du 13/10/2026
 * (demos/boulangerie-cyprien/docs) : rien n'est ajouté ici qui n'y figure pas.
 *
 * Servi sous /sites/boulangerie-cyprien en attendant que leur domaine pointe
 * ici. Le jour où il passera à la racine de ce domaine, seul BASE_PATH change :
 * tous les liens internes passent par cyprienHref.
 */
const BASE_PATH = "/sites/boulangerie-cyprien";

/** Dossier public des photos : il ne bouge pas quand le site change d'adresse. */
const PHOTO_DIR = "/sites/boulangerie-cyprien";

export function cyprienHref(path: string): string {
  return path === "/" ? BASE_PATH || "/" : `${BASE_PATH}${path}`;
}

export type Photo = { src: string; width: number; height: number; alt: string };

function photo(file: string, width: number, height: number, alt: string): Photo {
  return { src: `${PHOTO_DIR}/${file}`, width, height, alt };
}

/** Leurs photos professionnelles, publiées sur leur site. */
export const photos = {
  croissantsFour: photo("croissants-four.jpg", 1780, 850, "Une plaque de croissants dorés qui sort du four"),
  viennoiseriesCrues: photo("viennoiseries-crues.jpg", 1780, 850, "Une main tient une plaque de viennoiseries roulées, encore crues"),
  faconnage: photo("faconnage.jpg", 1780, 850, "Des mains façonnent la pâte sur un plan de travail en bois fariné"),
  laboratoire: photo("laboratoire.jpg", 1780, 850, "Un boulanger au travail dans le laboratoire vitré"),
  equipeFournil: photo("equipe-fournil.jpg", 1780, 850, "Trois membres de l’équipe rient au fournil, dans un nuage de farine"),
  boutique: photo("boutique.jpg", 1780, 850, "La boutique : longues vitrines, parquet de bois et suspensions"),
  farineMains: photo("farine-mains.jpg", 960, 1159, "Des mains couvertes de farine"),
  painLevain: photo("pain-levain-tranche.jpg", 960, 1162, "Un grand pain au levain tranché sur une planche"),
  pateDetaillage: photo("pate-detaillage.jpg", 960, 990, "Des disques de pâte détaillés sur un plan de marbre"),
  fondateurs: photo("fondateurs.jpg", 960, 990, "Les trois associés, souriants derrière la vitrine des pâtisseries"),
  midiAssiette: photo("midi-assiette.jpg", 960, 990, "Tranches de pain complet, salades et beurre pour le déjeuner"),
  patisseries: photo("patisseries.jpg", 960, 990, "Pâtisseries individuelles : tartelette aux framboises, chou et éclair au chocolat"),
  legumesLocaux: photo("legumes-locaux.jpg", 960, 990, "Des légumes du marché"),
  viennoiseries: photo("viennoiseries.jpg", 960, 890, "Des coupes de croissants, de chocolatines et une viennoiserie aux amandes"),
} satisfies Record<string, Photo>;

/** Image Open Graph d’une page. */
export function ogImage({ src, width, height, alt }: Photo) {
  return { url: src, width, height, alt };
}

/**
 * Leurs photos sont petites (1 780 px de large au plus, moins de 350 Ko) et
 * recadrées en cover, souvent dans un cadre plus haut qu’elles : la partie
 * montrée est plus large que le cadre. Un sizes calculé sur le cadre faisait
 * charger une version deux à trois fois trop petite ; on demande l’original.
 */
export const PHOTO_SIZES = "1780px";

export const stampSrc = `${PHOTO_DIR}/logo-cachet.png`;

export const nav = [
  { path: "/histoire", label: "L’histoire" },
  { path: "/savoir-faire", label: "Savoir-faire" },
  { path: "/le-midi", label: "Le midi" },
  { path: "/boutiques", label: "Boutiques" },
  { path: "/presse", label: "Presse" },
] as const;

export const orderPath = "/commander";

export const contact = {
  email: "contact@boulangerie-cyprien.fr",
  phone: "05 34 51 06 60",
};

export const socials = {
  instagram: { href: "https://www.instagram.com/cyprienboulangerie_toulouse/", handle: "@cyprienboulangerie_toulouse" },
  facebook: { href: "https://www.facebook.com/boulangeriecyprientoulouse/", handle: "boulangeriecyprientoulouse" },
  midiInstagram: { href: "https://www.instagram.com/cyprienlemidi/", handle: "@cyprienlemidi" },
};

/** « 05 34 51 06 60 » → « tel:+33534510660 ». */
export function telHref(phone: string): string {
  return `tel:+33${phone.replace(/\s/g, "").slice(1)}`;
}

export function mapsHref(name: string, street: string, city: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${street}, ${city}`)}`;
}

export type Slot = readonly [open: string, close: string];
/** days au sens de Date.getDay() : 0 = dimanche. */
export type Hours = { label: string; days: readonly number[]; slots: readonly Slot[] }[];

/* Espace insécable et gluon (U+2060) : le tiret permet une coupure juste
   après lui, le gluon l’interdit. */
const NBSP = String.fromCharCode(0x00a0);
const WORD_JOINER = String.fromCharCode(0x2060);

/** « 07:30 » → « 7 h 30 », « 14:00 » → « 14 h ». */
export function formatTime(time: string): string {
  const [h, m] = time.split(":");
  return m === "00" ? `${Number(h)}${NBSP}h` : `${Number(h)}${NBSP}h${NBSP}${m}`;
}

export function formatSlot([open, close]: Slot): string {
  return `${formatTime(open)}${NBSP}–${WORD_JOINER}${NBSP}${formatTime(close)}`;
}

export function formatSlots(slots: readonly Slot[]): string {
  return slots.map(formatSlot).join(" et ");
}

export type Shop = {
  id: string;
  name: string;
  street: string;
  city: string;
  phone: string;
  email?: string;
  /** Absent : horaires non confirmés, on renvoie au téléphone. */
  hours?: Hours;
  /** Jour de fermeture, tel qu’il s’affiche : « Le lundi ». */
  closed?: string;
  transport: string;
  /** Les commandes en ligne se retirent ici. */
  pickup: boolean;
  since: string;
};

export const shops: readonly Shop[] = [
  {
    id: "saint-cyprien",
    name: "Saint-Cyprien",
    street: "55 rue de la République",
    city: "31300 Toulouse",
    phone: "05 34 51 06 60",
    email: contact.email,
    // Horaires de leur propre site ; Google affiche autre chose (lundi ouvert).
    hours: [
      { label: "Du mardi au samedi", days: [2, 3, 4, 5, 6], slots: [["07:30", "14:00"], ["16:00", "20:00"]] },
      { label: "Le dimanche", days: [0], slots: [["07:45", "14:00"]] },
    ],
    closed: "Le lundi",
    transport: "Métro A, station Saint-Cyprien – République, à 80 m environ",
    pickup: true,
    since: "Depuis octobre 2017",
  },
  {
    id: "fer-a-cheval",
    name: "Place du Fer à Cheval",
    street: "7 place du Fer à Cheval",
    city: "31300 Toulouse",
    phone: "05 34 57 20 09",
    transport: "Arrêt de tram à 130 m environ",
    pickup: false,
    since: "Ouverte en 2025",
  },
];

export const pickupShop = shops[0];

export type MidiPlace = {
  id: string;
  name: string;
  street: string;
  city: string;
  phone: string;
  email: string;
  hours: Hours;
};

export const midiPlaces: readonly MidiPlace[] = [
  {
    id: "dupuy",
    name: "Cyprien le midi Dupuy",
    street: "28 place Dupuy",
    city: "31000 Toulouse",
    phone: "05 34 65 01 78",
    email: "lemididupuy@boulangerie-cyprien.fr",
    hours: [{ label: "Du lundi au vendredi", days: [1, 2, 3, 4, 5], slots: [["09:30", "14:30"]] }],
  },
  {
    id: "peri",
    name: "Cyprien le midi Péri",
    street: "20 bis rue Gabriel Péri",
    city: "31000 Toulouse",
    phone: "05 34 43 57 96",
    email: "lemidiperi@boulangerie-cyprien.fr",
    hours: [{ label: "Du lundi au vendredi", days: [1, 2, 3, 4, 5], slots: [["11:00", "15:00"]] }],
  },
];

/** Produits nommés par leur site, la presse ou les avis : jamais plus. */
export const signatureNames = [
  "Pain des Copains",
  "Croissant au beurre AOP",
  "Chocolatine à trois barres",
  "Paris-Brest",
  "Tourte aux blés anciens",
  "Baba au rhum revisité",
  "Baguette de tradition",
  "Millefeuille caramel",
  "Chausson aux pommes",
  "Tarte framboise-basilic",
  "Baguette au charbon végétal",
  "Éclair tout chocolat",
  "Chou praliné-pécan",
];

export type PressItem = {
  outlet: string;
  /** Titre de l’article, cité tel quel. */
  title?: string;
  /** À défaut de titre connu : ce que dit la parution. */
  summary?: string;
  /** AAAA-MM-JJ, ou AAAA quand le jour n’est pas connu. */
  date: string;
  url?: string;
  /** La parution citée sur l’accueil. */
  highlight?: true;
};

/** Du plus récent au plus ancien ; seuls les liens encore vivants sont donnés. */
export const press: readonly PressItem[] = [
  {
    outlet: "Petit Futé",
    summary: "Boulangerie Cyprien, « Recommandé 2026 ».",
    date: "2026",
    url: "https://www.petitfute.com/v24565-toulouse-31000/c650-produits-gourmands-vins/c1107-pains-gateaux-chocolats-glaces/c667-boulangerie/1741383-boulangerie-cyprien.html",
  },
  { outlet: "L’Essentiel Toulouse", title: "Une nouvelle boutique pour Cyprien", date: "2025-11-17" },
  {
    outlet: "Toulouse Secret",
    summary: "Cyprien, 5ᵉ d’un classement des meilleures chocolatines de Toulouse.",
    date: "2025-01-15",
  },
  {
    outlet: "M6",
    summary: "« La Meilleure Boulangerie de France », édition 2018 : le Pain des Copains reçoit 9/10 du jury.",
    date: "2018",
  },
  {
    outlet: "LCI",
    title: "Alimentation, cosmétiques : le charbon débarque et fait des miracles",
    date: "2018-06-08",
    url: "https://www.lci.fr/nutrition/alimentation-cosmetiques-le-charbon-debarque-dans-nos-assiettes-et-dans-nos-salles-de-bain-pain-detox-2089749.html",
  },
  {
    outlet: "Le Journal Toulousain",
    title: "Cyprien : une histoire de copains et de bon pain",
    date: "2018-03-29",
    url: "https://www.lejournaltoulousain.fr/culture/cyprien-histoire-de-copains-de-pain-55720",
  },
  {
    outlet: "Le24heures",
    title: "Du pain pour le moins très spécial : la baguette au charbon végétal de chez Cyprien",
    date: "2018-01-24",
    url: "https://www.le24heures.fr/2018/01/24/pain-tres-special-baguette-charbon-vegetal-de-chez-cyprien/",
  },
  {
    outlet: "France Bleu",
    title: "Boulangerie Cyprien à Toulouse",
    date: "2018-01-20",
    url: "https://www.francebleu.fr/emissions/dans-la-cuisine-du-chef/toulouse/boulangerie-cyprien-a-toulouse",
  },
  {
    outlet: "La Dépêche",
    title: "Gilles Guiraud, l’avocat devenu boulanger",
    date: "2018-01-05",
    url: "https://www.ladepeche.fr/article/2018/01/05/2716269-gilles-guiraud-l-avocat-devenu-boulanger.html",
  },
  {
    outlet: "Actu.fr",
    title: "Toulouse : un ancien avocat s’associe à un champion du croissant pour ouvrir une boulangerie",
    date: "2017-10-24",
    url: "https://actu.fr/occitanie/toulouse_31555/toulouse-ancien-avocat-sassocie-champion-croissant-ouvrir-une-boulangerie_12995851.html",
  },
  {
    outlet: "La Dépêche",
    title: "Un avocat troque le barreau contre la baguette",
    date: "2017-10-16",
    url: "https://www.ladepeche.fr/article/2017/10/16/2666212-un-avocat-troque-le-barreau-contre-la-baguette.html",
    highlight: true,
  },
];

const pressDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function formatPressDate(date: string): string {
  return date.length === 4 ? date : pressDate.format(new Date(`${date}T00:00:00Z`));
}

export const timeline = [
  {
    when: "Mai 2017",
    title: "Trois associés",
    text: "Gilles Guiraud, Lionel Fauré et Pierre-Jean Souviron créent CO’PAINS, la société qui porte Cyprien.",
  },
  {
    when: "Octobre 2017",
    title: "Ouverture rue de la République",
    text: "Cyprien ouvre au 55 rue de la République, avec pour seuls salariés un boulanger, un apprenti boulanger et une apprentie en pâtisserie.",
  },
  {
    when: "La première année",
    title: "Onze salariés et apprentis",
    text: "Dès la première année, l’équipe compte 11 salariés et apprentis.",
  },
  {
    when: "2018",
    title: "La Meilleure Boulangerie de France",
    text: "Cyprien participe à l’émission de M6 : le Pain des Copains reçoit 9/10 du jury, Norbert Tarayre et Bruno Cormerais.",
  },
  {
    when: "2019",
    title: "Cyprien le midi",
    text: "Deux adresses dédiées à la pause déjeuner, place Dupuy et rue Gabriel Péri.",
  },
  {
    when: "Janvier 2025",
    title: "La chocolatine à l’honneur",
    text: "Toulouse Secret classe la chocolatine de Cyprien 5ᵉ de sa sélection des meilleures de Toulouse.",
  },
  {
    when: "2025",
    title: "Une deuxième boutique",
    text: "Cyprien ouvre place du Fer à Cheval.",
  },
  {
    when: "2026",
    title: "Recommandé par le Petit Futé",
    text: "Le guide distingue Cyprien « Recommandé 2026 ».",
  },
] as const;

export const legal = {
  company: "CO’PAINS",
  form: "SARL au capital de 10 000 €",
  brand: "CYPRIEN",
  seat: "55 rue de la République, 31300 Toulouse",
  rcs: "RCS Toulouse 830 312 161",
  vat: "FR66830312161",
  publisher: "Lionel Fauré",
  host: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
};

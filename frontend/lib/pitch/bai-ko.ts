import { collectOffer, connectCommission, contactEmail, starterKit } from "@/lib/landing-data";
import { editor } from "@/lib/legal/constants";
import {
  commonSources,
  decimal,
  euros,
  fieldReport as field,
  minutesSeconds,
  offer,
  percent,
  screenSizes,
  thousands,
} from "@/lib/pitch/kit";
import captures from "@/lib/pitch/bai-ko-captures.json";
import { report } from "@/lib/report/data";
import type { Pitch, Source } from "@/lib/pitch/types";
import { getRestaurant } from "@/lib/menu-data";
import { collectSiteUrl, menuPrintUrl } from "@/lib/site";

/*
 * Le pitch à Baï-Kō (BMZ GROUP, Montpellier Arceaux), un restaurant à table
 * et non une enseigne : la présentation (/bai-ko/presentation, exportée en
 * PDF) et la page privée (/bai-ko) lisent toutes deux ce module. Chaque
 * chiffre vient de demos/bai-ko/pitch/research/, avec sa source. L'offre est
 * l'offre publique d'Ominin (lib/landing-data) : Connect à table, le click &
 * collect pour la vente à emporter. Le récit part de ce que disent ses avis
 * et ses propres vidéos : une salle pleine, une équipe courte au coup de feu.
 */

// ——— Choix du propriétaire ————————————————————————————————————

/** Signataire du pitch : la phrase d'ouverture et le contact sont les siens. */
const founder = { name: "Ambaka\u00a0Le\u00a0Grégam", role: "cofondateur d’Ominin" };

// ——— Les faits ——————————————————————————————————————————————————

/** La fiche Google relevée le 12/10/2026 : note, nombre d'avis, mois depuis l'ouverture (12/05/2026, annoncée sur leur TikTok). */
const google = { rating: 4.8, reviews: 556, months: 5 };

/** Montpellier : étudiants de l'unité urbaine (rentrée 2023) et pour 100 habitants de la commune (2021, INSEE). */
const students = { count: 84_266, per100: 28, per100Year: 2021 };

/** Son site, écrit avec un trait d'union insécable : « bai-/ko.com » se coupait en fin de ligne. */
const siteName = "bai\u2011ko.com";

/** Le tram le plus proche, à vol d'oiseau (GTFS TaM). */
const tram = { stop: "Plan Cabanes", line: 3, meters: 160 };

/** Les facultés les plus proches, à vol d'oiseau (OpenStreetMap, via Nominatim). */
const faculties = { medecine: 720, droit: 840 };

/** Partager l'addition : la part des Français que cela gêne, en %, et celle des 25–34 ans (OpinionWay pour Adyen). */
const splitBill = { all: 40, youngAdults: 51 };

/** La carte papier : la part des Français qui disent la préférer, au moins (Medallia pour Lightspeed, 2024). */
const paperMenuPercent = 85;

/**
 * Hypothèse affichée : le nombre de tables équipées d'un Cachet, à compter
 * avec le gérant (aucune source ne dit combien la salle en compte).
 */
const tables = 16;

/** La commande que suivent les captures et le film : sa table. */
const order = { table: 7 };

/** La carte de la démo, pour lire ses prix plutôt que les retaper. */
const carte = getRestaurant("bai-ko")?.categories.flatMap((category) => category.items) ?? [];
const dish = (id: string) => {
  const item = carte.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Article absent de la carte Baï-Kō : ${id}`);
  return item;
};
const price = (id: string) => dish(id).price;
/** Le supplément d'un choix, lu sur la carte : « Dolsot », + 1 €. */
const supplement = (id: string, choiceName: string) => {
  const choice = dish(id).options?.flatMap((group) => group.choices).find((candidate) => candidate.name === choiceName);
  if (!choice) throw new Error(`Choix absent de la carte Baï-Kō : ${id}, ${choiceName}`);
  return choice.supplement;
};

/** La commande de la table 7, celle des captures : un Dak Bap Spicy en dolsot et un kimchi. */
const tableSevenTotal = price("dak-bap-spicy") + supplement("dak-bap-spicy", "Dolsot") + price("kimchi");

/**
 * La Box étudiante, d'après le bandeau de bai-ko.com et l'affiche du TikTok
 * du 11/09/2026 : son prix, son créneau. Pas encore sur la carte en ligne :
 * sa composition n'est pas publiée.
 */
const studentBox = { price: 10.9, hours: "12\u00a0h–14\u00a0h\u00a030" };

// Le taux public de Connect (celui des CGV), pas le plafond du réseau.
const tableRate = connectCommission.percent;
const collectRate = collectOffer.commission.percent;

/** Le dernier week-end du relevé terrain (ses deux derniers soirs) et les jours écoulés depuis la mise en service du paiement à table. */
const [fieldFriday, fieldSaturday] = report.nights.slice(-2).map((night) => new Date(night.day));
const dayMonth = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
const fieldWeekend = `${fieldFriday.getUTCDate()}–${dayMonth.format(fieldSaturday)}`;
const daysAfterLaunch = Math.round((fieldSaturday.getTime() - new Date(report.milestones.launch).getTime()) / 86_400_000);

const cachets = tables * starterKit.cachet.price;
/** L'installation : les Cachets et leur livraison, le prix de l'essai. */
const setupCost = cachets + starterKit.shipping.price;

// ——— Démos en ligne ——————————————————————————————————————————————

// L'adresse imprimée, celle du film : le sous-domaine du menu.
const demoBase = `${menuPrintUrl}/demo/bai-ko`;

const demos = [
  {
    id: "carte",
    label: "Côté client",
    title: `La carte, à la table ${order.table}`,
    description: "Composer son plat, payer à table, l’envoyer en cuisine.",
    href: `${demoBase}?table=${order.table}`,
  },
  {
    id: "salle",
    label: "Côté salle",
    title: "Les tables, au coup\u00a0de\u00a0feu",
    description: "Chaque table, depuis quand elle attend et ce qui reste à apporter\u00a0; «\u00a0Servi\u00a0» d’un appui.",
    href: `${demoBase}/salle?scenario=fige`,
  },
  {
    id: "emporter",
    label: "À emporter",
    title: "La commande à emporter, en direct",
    description: "Commandée et payée sur le téléphone, reçue en direct par l’équipe.",
    href: `${collectSiteUrl}/demo/bai-ko`,
  },
] as const;

// ——— Captures des démos (public/pitch/bai-ko) ——————————————————————

/**
 * Les captures portent l'empreinte de leur contenu (bai-ko-captures.json,
 * qu'écrit demos/bai-ko/pitch/captures.cjs) : une nouvelle prise change d'adresse, l'optimiseur
 * d'images ne sert jamais l'ancienne.
 */
const shot = (name: keyof typeof captures) => `/pitch/bai-ko/${captures[name]}`;

/**
 * Ce que la présentation montre de chaque capture de « La solution », en px
 * CSS de la capture : la feuille ouverte sans la carte floutée derrière, sur
 * la carte le Dak Bap Spicy de sa photo à ses allergènes. Une même hauteur,
 * des écrans de même taille ; le haut de chacun, mesuré sur les captures
 * (captures.cjs l'écrit) : à revoir quand on les reprend.
 */
const sheetHeight = 420;
const sheet = (top: number) => ({ x: 0, y: top, width: screenSizes.phone.width, height: sheetHeight });
/** Une carte de plat à sa largeur (x, width), au format des feuilles, arrêtée à bottom : elle remplit son cadre comme elles. */
const card = (x: number, width: number, bottom: number) => {
  const height = Math.round((width * sheetHeight) / screenSizes.phone.width);
  return { x, y: bottom - height, width, height };
};

/**
 * L'écran de la salle, ses deux rangées de tables entières ; dans la
 * présentation, les tables 5 et 7 seules, en grand : les cinq tables se
 * lisaient à 9 px sur un portable.
 */
const salleTables = { x: 28, y: 90, width: 1124, height: 702 };
const salleTableSeven = { x: 400, y: 90, width: 752, height: 365 };

const screens = {
  menu: { src: shot("phone-menu"), alt: "La carte Baï-Kō à la table 7 : le Dak Bap Spicy, sa photo, son piment et ses allergènes" },
  partage: { src: shot("phone-partage"), alt: "La carte Baï-Kō sur le Corn Cheese, son fromage filé en photo, à ajouter d’un appui" },
  composer: { src: shot("phone-composer"), alt: "Le Dak Bap Spicy composé par le client : version dolsot, bol de pierre chauffé" },
  commande: { src: shot("phone-commande"), alt: "La commande de la table 7, réglée en ligne ou au comptoir" },
  suivi: { src: shot("phone-envoyee"), alt: "Commande envoyée : payée, elle part en cuisine pour la table 7" },
  comptoir: { src: shot("salle-service"), alt: "L’écran de la salle : les tables, depuis quand elles attendent et ce qui reste à leur apporter, bouton Servi" },
  poster: { src: "/pitch/bai-ko/film-poster.webp", alt: "Baï-Kō × Ominin, le film" },
  posterVertical: { src: "/pitch/bai-ko/film-poster-vertical.webp", alt: "Baï-Kō × Ominin, le film" },
};

// ——— Sources ——————————————————————————————————————————————————————

const sources = {
  site: {
    short: siteName,
    full: `${siteName}\u00a0— carte, prix, allergènes, bandeau («\u00a0Menu étudiant Bento Box 10,90\u00a0€\u00a0») et signature «\u00a0From Seoul to Montpellier\u00a0», consulté le 12/10/2026`,
    url: "https://bai-ko.com/",
  },
  reviews: {
    short: "Avis Google, relevé du 12/10/2026",
    full: `Relevé Ominin de la fiche Google «\u00a0BAÏ-KŌ restaurant coréen à Montpellier\u00a0», 12/10/2026\u00a0— ${decimal(google.rating)}\u00a0★ sur ${google.reviews} avis\u00a0; les 434 avis rédigés passés au crible, tous les avis d’une à quatre étoiles lus en entier (52)`,
  },
  tiktok: {
    short: "TikTok @baiko.montpellier",
    full: `TikTok @baiko.montpellier\u00a0— vidéos du 09/05/2026 («\u00a0ouvre ce mardi 12 mai\u00a0»), du 09/08/2026 («\u00a0le service c’est aussi un test de mémoire\u00a0»), du 11/09/2026 (la Box\u00a0: ${euros(studentBox.price)}, ${studentBox.hours})`,
    url: "https://www.tiktok.com/@baiko.montpellier",
  },
  insee: {
    short: "INSEE, 2025",
    full: `INSEE\u00a0— Insee Flash Occitanie nº\u00a0148, 09/09/2025\u00a0: ${thousands(students.count)} étudiants dans l’unité urbaine de Montpellier à la rentrée 2023, ${students.per100} pour 100 habitants dans la commune (${students.per100Year})`,
    url: "https://www.insee.fr/fr/statistiques/8632297",
  },
  osm: {
    short: "OpenStreetMap",
    full: `OpenStreetMap, lieux relevés par Nominatim le 12/10/2026\u00a0— à vol d’oiseau du 2 avenue de Lodève\u00a0: Faculté de Médecine ≈\u00a0${faculties.medecine}\u00a0m, Faculté de Droit et Science politique ≈\u00a0${faculties.droit}\u00a0m`,
    url: "https://nominatim.openstreetmap.org/",
  },
  tram: {
    short: "TaM (GTFS)",
    full: `TaM, arrêts du tram (GTFS)\u00a0— ${tram.stop}, ligne ${tram.line}, à ≈\u00a0${tram.meters}\u00a0m à vol d’oiseau du 2 avenue de Lodève`,
    url: "https://gtfsproxy.e-tam.fr/COMMON/GTFS.zip",
  },
  lightspeed: {
    short: "Perspectus Global pour Lightspeed, 2025",
    full: "Perspectus Global pour Lightspeed\u00a0— 1\u00a0057 Français en ligne, octobre 2025\u00a0: 44\u00a0% disent qu’un service lent pourrait les dissuader de revenir",
    url: "https://www.tendancehotellerie.fr/articles-breves/communique-de-presse/25243-article/les-consommateurs-francais-plebiscitent-la-digitalisation-de-l-experience-au-restaurant-selon-une-etude-lightspeed",
  },
  yougov: {
    short: "YouGov pour sunday, 2021",
    full: "YouGov pour sunday\u00a0— 1\u00a0036 Français interrogés en ligne les 15–16/12/2021\u00a0: près de 7 sur 10 disent qu’une addition qui tarde peut leur faire sauter le dessert\u00a0; déclaratif",
    url: "https://www.tendancehotellerie.fr/articles-breves/communique-de-presse/16860-article/sondage-sunday-yougov-7-francais-sur-10-sautent-le-dessert-car-l-addition-est-trop-longue-a-venir",
  },
  fsv: {
    short: "Food Service Vision, 2023",
    full: "Food Service Vision pour Food Hotel Tech\u00a0— 500 clients de restaurants interrogés en février 2023\u00a0: chez les moins de 35 ans, 64\u00a0% aiment consulter la carte sur leur téléphone, 63\u00a0% payer avec",
    url: "https://www.tendancehotellerie.fr/articles-breves/communique-de-presse/19166-article/etude-food-hotel-tech-56-des-francais-prets-a-payer-plus-cher-pour-aller-dans-un-restaurant-eco-responsable",
  },
  adyen: {
    short: "OpinionWay pour Adyen, 2024",
    full: `OpinionWay pour Adyen\u00a0— 1\u00a0001 Français interrogés les 14–15/02/2024\u00a0: ${percent(splitBill.all)} trouvent gênant de partager l’addition, ${percent(splitBill.youngAdults)} des 25–34 ans`,
    url: "https://www.lhotellerie-restauration.fr/actualite/embargo-20-mars-9-h-les-habitudes-des-francais-au-moment-du-paiement-au-restaurant",
  },
  medallia: {
    short: "Medallia pour Lightspeed, 2024",
    full: `Medallia pour Lightspeed\u00a0— 1\u00a0000 Français, mai 2024\u00a0: plus de ${percent(paperMenuPercent)} préfèrent la carte papier, 32\u00a0% n’aiment pas les menus en QR code`,
    url: "https://www.tendancehotellerie.fr/articles-breves/communique-de-presse/21905-article/etude-lightspeed-sur-les-habitudes-de-consommation-24-des-francais-se-rendent-au-restaurant-au-moins-une-fois-par-semaine",
  },
  tan: {
    short: "Tan & Netessine, 2020",
    full: "Tan & Netessine\u00a0— Management Science 66(10), 2020\u00a0: 66 restaurants d’une chaîne américaine équipés de tablettes de table, 2,6 millions de tickets",
    url: "https://pubsonline.informs.org/doi/10.1287/mnsc.2019.3430",
  },
  // Le relevé, ses commandes comptées jusqu'au bout : en ligne, au comptoir, et celles passées en ligne puis réglées au comptoir.
  report: {
    ...commonSources.report,
    display: "ominin.com/r7k2",
    full: `Ominin\u00a0— relevé terrain d’un bar-restaurant toulousain, ${field.nights} soirs du 18/09 au 03/10/2026\u00a0: ${thousands(field.orders)} commandes payées (${report.speed.n_online} en ligne, ${thousands(report.speed.n_counter)} au comptoir, ${report.speed.n_fallback} passées en ligne puis réglées au comptoir)\u00a0; temps médians de la commande au ticket cuisine`,
  },
} satisfies Record<string, Source>;

type SourceId = keyof typeof sources;

type Section<K extends keyof Pitch<SourceId>> = Pitch<SourceId>[K];

// ——— Le récit ——————————————————————————————————————————————————————

/**
 * Où se règlent espèces et titres-restaurant, dit en une seule phrase
 * partout : celle du produit (sa confirmation de commande : « Réglez-la
 * auprès d'un serveur ou au comptoir : elle part en cuisine dès
 * l'encaissement »).
 */
const cashPayment = "Espèces ou titres\u2011restaurant\u00a0: le serveur encaisse à table ou au comptoir, et la commande part en cuisine à ce moment\u2011là.";

const cover: Section<"cover"> = {
  eyebrow: "Proposition pour Baï-Kō, Montpellier Arceaux",
  title: { first: "La carte sur la table,", second: { text: "la commande", accent: "en\u00a0cuisine." } },
  lead: "Vos clients scannent leur table, choisissent leur Dak Bap en dolsot ou leur Volcano Cheese, et paient sur leur téléphone\u00a0; le ticket sort en cuisine, l’équipe sert. Et demain, votre Box étudiante se commande d’avance, en direct.",
};

const promise: Section<"promise"> = {
  eyebrow: "Ce que vous avez construit",
  slogan: ["From Seoul", "to Montpellier"],
  sloganSource: siteName,
  rating: { value: decimal(google.rating), label: `sur ${google.reviews}\u00a0avis Google, en\u00a0${google.months}\u00a0mois d’ouverture` },
  speed: {
    eyebrow: "Autour de vous",
    value: thousands(students.count),
    label: `étudiants dans l’agglomération (rentrée 2023)\u00a0; ${students.per100}\u00a0pour\u00a0100 habitants dans la commune (${students.per100Year}).`,
    detail: `Le tram ${tram.stop} à ${tram.meters}\u00a0m, les facultés de Médecine et de Droit à moins d’un kilomètre.`,
  },
  closing: "Ouvert le 12 mai 2026, Baï-Kō remplit déjà sa salle. Reste à tenir ce niveau service après service, même les soirs où l’équipe est courte.",
  photos: [
    { src: "/pitch/bai-ko/volcano-cheese.jpg", alt: "Le Volcano Cheese de Baï-Kō, le fromage étiré entre les baguettes (galerie de bai-ko.com)" },
    { src: "/pitch/bai-ko/dak-bap-dolsot.jpg", alt: "Le Dak Bap Spicy de Baï-Kō dans son dolsot, le bol de pierre chauffé (galerie de bai-ko.com)" },
  ],
  sources: ["site", "reviews", "tiktok", "tram", "osm", "insee"],
};

const walkAway: Section<"walkAway"> = {
  eyebrow: "Au coup de feu",
  quote: ["Le service, c’est aussi", "un test de mémoire."],
  attribution: "votre TikTok du 9 août 2026",
  followUp: "Aux heures pleines, une équipe courte tient la salle de mémoire\u00a0: qui attend la carte, qui a commandé quoi.",
  followUpSources: ["tiktok", "reviews"],
  voices: [
    { text: "le service est lent, très lent, 20 minutes à avoir le menu", stars: 1 },
    { text: "le service est un peu lent et les serveurs ne se comprennent pas entre eux", stars: 1 },
    { text: "plus d’une heure d’attente pour servir un volcano […] l’entièreté de la salle servis avant nous", stars: 2 },
  ],
  facts: [
    {
      value: "44\u00a0%",
      text: "des Français disent qu’un service lent pourrait les dissuader de revenir.",
      source: "lightspeed",
    },
    // Deux avis 5 étoiles, datés « il y a 4 mois » et « il y a une semaine » le 12/10/2026 : juin, début octobre.
    {
      value: "1",
      text: "personne pour toute la salle, dans deux de vos avis 5 étoiles\u00a0: «\u00a0le service était top malgré qu’il était seul\u00a0» en juin, «\u00a0elle était toute seule\u00a0» début octobre.",
      source: "reviews",
    },
  ],
};

const solution: Section<"solution"> = {
  eyebrow: "La solution",
  title: { text: "Commander depuis", accent: "sa\u00a0table." },
  steps: [
    {
      title: "Scanner",
      text: `Le Cachet, le QR code à votre logo posé sur la table ${order.table}, ouvre votre carte, photos, piment et allergènes compris. Aucune application.`,
      screen: "menu",
      crop: card(22, 346, 598),
    },
    { title: "Composer", text: "Dolsot ou bol, Spicy ou Sweet, le parfum du mochi\u00a0: le client choisit lui-même, rien ne se perd en route.", screen: "composer", crop: sheet(424) },
    { title: "Payer", text: `Dak Bap Spicy en dolsot et un kimchi\u00a0: ${euros(tableSevenTotal)}, réglés en ligne. ${cashPayment}`, screen: "commande", crop: sheet(411) },
    { title: "En cuisine", text: "Payée, la commande sort en cuisine avec sa table et chaque option\u00a0; l’équipe apporte les plats.", screen: "suivi", crop: sheet(371) },
  ],
  note: "Chaque table prend sa commande\u00a0; vos serveurs gardent l’accueil et le service.",
};

const fieldProof: Section<"fieldProof"> = {
  eyebrow: "Sur le terrain",
  // « en cuisine en » insécable : en bureau, le titre se coupe après « table, ».
  title: { text: "Payée depuis la table, en\u00a0cuisine\u00a0en", accent: `${field.onlineSeconds}\u00a0secondes.` },
  context: `Mesuré chez un client Ominin, un bar-restaurant toulousain\u00a0: ${thousands(field.orders)} commandes payées en ${field.nights}\u00a0soirs de service, du 18\u00a0septembre au 3\u00a0octobre 2026. Ce chiffre mesure le temps entre le choix du client et le départ en cuisine\u00a0: réglée au comptoir, la commande attend la file et l’encaissement\u00a0; payée sur le téléphone, elle part tout de suite.`,
  raceLabel: "De la commande au ticket cuisine, temps médian",
  race: [
    { label: "Payée en ligne, depuis la table", value: `${field.onlineSeconds}\u00a0s`, seconds: field.onlineSeconds },
    { label: "Payée au comptoir", value: minutesSeconds(field.counterSeconds), seconds: field.counterSeconds },
  ],
  unitsInText: true,
  facts: [
    {
      value: percent(Math.round(report.totals.lw_online_share)),
      label: `des commandes payées depuis la table le week-end des ${fieldWeekend}, ${daysAfterLaunch}\u00a0jours après la mise en service du paiement à table`,
    },
    { value: "×2", label: "la part payée en ligne, le soir où «\u00a0Payer en ligne\u00a0» est devenu le choix par défaut\u00a0: de 15 à 32\u00a0%" },
    {
      value: percent(report.speed.over15),
      label: `des commandes réglées au comptoir ont attendu plus de 15\u00a0min avant le ticket cuisine\u00a0; payées en ligne, 9\u00a0sur\u00a010 en moins de ${report.speed.online.p90}\u00a0s`,
    },
  ],
  // Chez Baï-Kō, la salle envoie aujourd'hui en cuisine sans encaisser : le relevé n'y vaut que pour ce qui se paie en ligne.
  takeaway: `Chez vous, payée en ligne, la commande part en cuisine en ${field.onlineSeconds}\u00a0s\u00a0; réglée en espèces ou en titres\u2011restaurant, dès que le serveur l’encaisse. Le premier mois mesurera ce délai, midi et soir.`,
  sources: ["report"],
};

const forCustomers: Section<"forCustomers"> = {
  eyebrow: "Pour vos clients",
  title: ["La carte tout de suite,", "l’addition aussi."],
  points: [
    {
      title: "La carte dès qu’ils s’assoient.",
      text: "Vos photos, votre piment, les allergènes que votre site publie plat par plat\u00a0: le client choisit sans attendre qu’on lui apporte le menu.",
      fact: "Dans vos avis\u00a0: «\u00a020 minutes à avoir le menu\u00a0».",
    },
    {
      title: "Un mochi, un Milkis, sans faire signe.",
      text: "Un dessert, une boisson coréenne, un second Corn Cheese\u00a0: le client recommande depuis sa table, quand il veut.",
      fact: "Le Volcano Cheese pour deux se choisit sur la carte, ses suppléments à 5\u00a0€ aussi.",
    },
    {
      title: "L’addition réglée en commandant, chacun sa part.",
      text: "Carte, Apple Pay ou Google Pay, le pourboire en un appui\u00a0; à plusieurs, chacun commande et paie sa part depuis son téléphone. À la fin du repas, on se lève et on part.",
      fact: `${percent(splitBill.all)} des Français trouvent gênant de partager l’addition, ${percent(splitBill.youngAdults)} des 25–34 ans\u00a0; près de 7\u00a0sur\u00a010, qu’une addition qui tarde peut faire sauter le dessert.`,
    },
  ],
  scan: {
    question: "Et vos clients scanneront-ils\u00a0?",
    answer: "Votre clientèle a l’âge du QR\u00a0: chez les moins de 35 ans, 64\u00a0% aiment consulter la carte sur leur téléphone et 63\u00a0% payer avec.",
    pilot: "Le premier mois le mesurera chez vous\u00a0: la part des commandes passées depuis la table.",
    sources: ["fsv"],
  },
  scanOnSlide: true,
  // La carte du Corn Cheese entière, dans la capture (captures.cjs l'écrit) : sa largeur, avec 8 px de marge.
  mobileCrop: { x: 12, y: 99, width: 366, height: 411 },
  screen: "partage",
  sources: ["reviews", "site", "adyen", "yougov"],
};

const forTeams: Section<"forTeams"> = {
  eyebrow: "Pour votre équipe",
  // La mémoire de la diapositive « Au coup de feu », confiée à l'écran.
  title: { text: "La mémoire de la salle,", accent: "sur un écran." },
  points: [
    {
      title: "Options comprises, rien à recopier.",
      text: `Table ${order.table}\u00a0: Dak Bap Spicy en dolsot, un kimchi. Le cuisinier lit ce que le client a choisi, option par option\u00a0; rien ne repose sur la mémoire de la salle.`,
    },
    {
      title: "La salle voit ce qui reste à servir.",
      text: "Tablette ou téléphone\u00a0: chaque table, depuis quand elle attend, ses plats à apporter\u00a0; «\u00a0Servi\u00a0» d’un appui.",
    },
    {
      title: "Pas de téléphone, ou envie de parler au serveur\u00a0?",
      text: "Le serveur prend la commande sur son téléphone et l’encaisse à table, espèces ou carte au terminal.",
    },
  ],
  simple: "Sur 66\u00a0restaurants d’une chaîne américaine équipés de tablettes de table\u00a0: ventes par minute de table ≈\u00a0+11\u00a0%, à effectif égal\u00a0; les tables se libèrent plus tôt.",
  caption: "L’espace de gestion Ominin, en salle. Dans la démo\u00a0: les tables qui attendent, un plat servi d’un appui",
  // La capture montre les tables 10, 5 et 7, puis 14 et 12 : toutes en bureau, 5 et 7 dans la présentation, la table 7 seule au téléphone.
  crops: {
    desktop: salleTables,
    mobile: { x: 774, y: 92, width: 376, height: 361 },
    deck: salleTableSeven,
  },
  sources: ["reviews", "tan"],
};

const deployment: Section<"deployment"> = {
  eyebrow: "Chez vous",
  title: { text: "Ce qui change,", accent: "concrètement." },
  lead: "Rien à installer pour vos clients, rien à changer à votre caisse\u00a0: vos Cachets sur les tables, votre carte en ligne, déjà prête (son lien est à la fin), le ticket en cuisine.",
  sources: ["medallia"],
  points: [
    {
      label: "Tables",
      title: "Un Cachet par table.",
      text: `Imprimés à votre logo, ${euros(starterKit.cachet.price)} l’unité, livrés prêts à poser, un par table ou alcôve. La carte papier et le serveur restent pour qui le souhaite\u00a0: plus de ${percent(paperMenuPercent)} des Français, tous âges confondus, la préfèrent.`,
    },
    {
      label: "Cuisine",
      title: "Le ticket sort en cuisine.",
      text: `Votre caisse n’imprime pas en cuisine\u00a0? Omilink, notre boîtier à ${euros(starterKit.omilink.price)}, se branche sur votre box internet et sort les commandes sur votre imprimante\u00a0: une prise, un câble réseau. Sans imprimante, une tablette suffit.`,
    },
    {
      label: "À emporter",
      title: "Demain, la Box d’avance.",
      text: "Une page de commande à votre nom, au prix de votre carte, retrait tout de suite ou à l’heure choisie. La Box y entre avec sa composition\u00a0; un QR sur votre affiche de la Box y mène.",
    },
    {
      label: "Carte",
      title: "Votre carte, à jour.",
      text: "Un plat épuisé, un prix qui change\u00a0: vous le modifiez depuis votre téléphone, la carte suit. Les paiements en ligne arrivent sur votre compte Stripe, détaillés dans votre espace.",
    },
  ],
};

const proposal: Section<"proposal"> = {
  eyebrow: "Notre proposition",
  title: "On commence",
  titleAccent: "par la salle.",
  pilot: {
    title: "Le démarrage",
    lead: "Votre carte en ligne, prête pour le service suivant.",
    points: [
      "Cette carte, déjà construite à partir de votre site\u00a0: photos, piment, allergènes, bandeau des offres.",
      "Vos Cachets imprimés à votre logo, livrés prêts à poser.",
      "Une prise en main avec l’équipe, avant le premier service.",
      "Côté restaurant\u00a0: ouvrir votre compte Stripe, avec notre aide.",
    ],
  },
  network: {
    title: "Après le premier mois",
    lead: "La vente à emporter, en direct.",
    points: [
      "Votre page de click & collect, au prix de votre carte.",
      "La Box étudiante ajoutée à votre page à emporter, commandée d’avance, retirée à l’heure choisie.",
      `${percent(collectRate)} sur chaque commande à emporter payée en ligne\u00a0; rien sur ce qui se règle au comptoir.`,
    ],
  },
  measures: {
    title: "Ce qu’on mesurera ensemble",
    lead: "Au bout d’un mois, quatre chiffres.",
    sources: [],
    points: [
      "La part des commandes passées depuis la table.",
      "Le délai entre la commande et le ticket cuisine.",
      "Le panier moyen, en ligne et au comptoir\u00a0; les pourboires laissés en ligne.",
      "Les ventes à emporter passées en direct.",
    ],
  },
  trial: `Pour essayer\u00a0: ${euros(setupCost)}, vos ${tables}\u00a0Cachets livrés (Omilink en plus, seulement si votre caisse n’imprime pas en cuisine). Sans commande en ligne, rien d’autre. Sans engagement\u00a0: vous arrêtez quand vous voulez, les Cachets restent à vous.`,
};

const closing: Section<"closing"> = {
  eyebrow: "Et maintenant",
  title: ["Votre carte, à table\u00a0:", "on vous la montre\u00a0?"],
  steps: ["Votre carte sur votre téléphone, autour d’un café", "Vos tables, votre imprimante, vos titres\u2011restaurant\u00a0: on fait le point", "Vos Cachets livrés, premier service en ligne"],
  mail: "Écrire au cofondateur",
  interlocutor: `Votre interlocuteur direct\u00a0: ${founder.name}, ${founder.role}.`,
  company: "Nos outils pour la restauration\u00a0: commande et paiement à table, click & collect, impression en cuisine.",
  reference: "Ominin tourne déjà chez plusieurs restaurants indépendants, dont un à Montpellier.",
  scanTitle: "Votre carte, prête à tester.",
  scanPage: "Testez votre carte comme un client.",
  flourish: "바이코",
  signature: `${founder.name}, ${founder.role}`,
};

// ——— Le pitch ——————————————————————————————————————————————————————

export const baiKo: Pitch<SourceId> = {
  path: "/bai-ko",
  titleMarks: true,
  ticketNumber: order.table,
  ticket: { label: "Commande envoyée", prefix: "Table", foot: "Payée à table, en cuisine" },
  brandName: "Baï-Kō",
  filmSeenKey: "baiko-pitch-film-vu",
  filmSrc: "/pitch/bai-ko/film.mp4",
  filmVerticalSrc: "/pitch/bai-ko/film-vertical.mp4",
  deckPdfHref: "/pitch/bai-ko/bai-ko-ominin.pdf",
  deckPdfName: "Baï-Kō × Ominin.pdf",
  deckLargeText: true,
  deckFooter: "Ominin · proposition pour Baï-Kō",
  pitchDate: "octobre 2026",
  demos,
  demoDisplayUrl: `${demoBase}?table=${order.table}`.replace(/^https?:\/\//, ""),
  contact: {
    email: contactEmail,
    mailto: `mailto:${contactEmail}?subject=${encodeURIComponent("Baï-Kō × Ominin")}`,
  },
  screens,
  sources,
  // Les prix d'Ominin (Cachets, Omilink, commissions) restent sur « Chez vous », la proposition et la couverture : leur mention de TVA, ici.
  sourcesNote: `Carte, prix et allergènes de la démo\u00a0: ceux de ${siteName} au 12/10/2026, photos de sa galerie. Relevés et captures du 12/10/2026. Frais Stripe à votre charge. Prix Ominin nets de taxe\u00a0: ${editor.vatMention.replace("art. 293 B", "art.\u00a0293\u00a0B")}.`,
  cover,
  promise,
  walkAway,
  solution,
  fieldProof,
  forCustomers,
  forTeams,
  deployment,
  proposal,
  closing,
  page: {
    heroEyebrow: "Pour Baï-Kō, Montpellier Arceaux",
    heroLead: cover.lead,
    heroFacts: [
      { value: "0\u00a0€", label: "d’abonnement" },
      { value: percent(tableRate), label: `des commandes payées en ligne à table, dégressif jusqu’à ${percent(offer.commissionPercent.min)}\u00a0; frais de carte en sus` },
      { value: percent(collectRate), label: "sur la vente à emporter payée en ligne, au prix de votre carte" },
    ],
    demoTitle: "Votre carte, prête à tester.",
    demoLead: `Vos plats, vos photos, vos allergènes\u00a0: ouvrez-la comme un client de la table ${order.table}, puis passez côté salle et côté vente à emporter.`,
    openerLabel: "Le film Baï-Kō × Ominin",
    footer: "Page privée, préparée pour Baï-Kō.",
    compactHero: true,
    closingDemoButton: true,
    linkButtons: true,
    measuresFilled: true,
  },
};

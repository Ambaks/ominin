import type { Cta, FaqItem, Feature, NavLink } from "@/lib/landing-data";
import { contactEmail } from "@/lib/landing-data";
import type { StoryStep } from "@/components/landing-kit/scroll-story";

/*
 * Copy de la landing Ominin Hôtels (hotels.ominin.com). Pas de prix : une
 * offre par établissement, selon ses espaces. Aucun texte dans les
 * composants — tout vit ici, y compris l'hôtel fictif des maquettes.
 */

export const hotelsBrand = "Ominin Hôtels";

export const demoCta: Cta = {
  label: "Demander une démo",
  href: `mailto:${contactEmail}?subject=${encodeURIComponent("Ominin Hôtels — démo")}`,
};

export const seo = {
  title: "Ominin Hôtels — Le service vient au client, du transat à la chambre",
  description:
    "Un QR code par transat, par table et par chambre : vos clients commandent, appellent, réservent et règlent sur leur note de chambre depuis leur téléphone. Sans appel, sans attente, sans application.",
};

export const nav = {
  links: [
    { label: "Espaces", href: "#espaces" },
    { label: "Chambre", href: "#chambre" },
    { label: "Séjour", href: "#sejour" },
    { label: "Équipe", href: "#equipe" },
    { label: "Direction", href: "#direction" },
    { label: "FAQ", href: "#faq" },
  ] satisfies NavLink[],
  login: { label: "Connexion", href: "/connexion" } satisfies Cta,
};

/** Les photos de la page (components/hotels/photos.ts) et leur texte alternatif. */
export type HotelPhoto =
  | "hero"
  | "pool"
  | "beach"
  | "rooftop"
  | "lobby"
  | "spa"
  | "room"
  | "breakfast"
  | "deck"
  | "suite"
  | "terrace"
  | "cachetPlaque"
  | "cachetCarte"
  | "cachetChevalet"
  | "horizon";

export const photoAlt: Record<HotelPhoto, string> = {
  hero: "Piscine à débordement à l’heure bleue, palmiers et cabanes éclairées au bord de l’eau",
  pool: "Piscine miroir au crépuscule devant une maison blanche, transats crème de part et d’autre",
  beach: "Cabanes à rideaux blancs sur pontons, au-dessus d’une crique turquoise bordée de pins",
  rooftop: "Salon sur un toit-terrasse la nuit, lanternes allumées, banquettes à coussins et tours de la ville éclairées",
  lobby: "Fauteuil de cuir clair dans un salon d’hôtel, soleil filtré par la verrière",
  spa: "Bassin du spa à la nuit tombée, cascade sur un mur de pierre éclairé, palmiers au bord de l’eau",
  room: "Lampe en laiton sur un bureau, porte-fenêtre ouverte sur la mer au coucher du soleil",
  breakfast: "Plateau de petit-déjeuner sur un lit : viennoiseries, jus d’orange, cappuccinos",
  deck: "Bord de piscine à débordement face à la mer, au crépuscule",
  suite: "Baignoire sous une arche ouverte sur une mer turquoise, rideaux blancs",
  terrace: "Terrasse aux fauteuils tressés et lanternes, au coucher du soleil",
  cachetPlaque: "QR code gravé sur une plaque de laiton encastrée dans une table en bois, la plage derrière",
  cachetCarte: "QR code imprimé discrètement au bas d’une carte papier, sur une nappe blanche",
  cachetChevalet: "Chevalet en travertin et laiton portant un QR code, sur une table face aux transats",
  horizon: "Soleil couchant posé sur l’horizon de la mer",
};

/** L'hôtel fictif des maquettes. */
export const mock = {
  hotel: "Le Grand Large",
  room: "Chambre 214",
};

export const hero = {
  eyebrow: "Piscine · Plage · Rooftop · Chambre · Spa",
  lines: ["Le service vient", "au client,"],
  last: { start: "du transat à la ", mark: "chambre." },
  subtitle:
    "Un QR code sur chaque transat, chaque table et chaque table de nuit. Le client commande, appelle, réserve et règle sur sa note de chambre depuis son téléphone. Votre équipe est là quand on a besoin d’elle, jamais à tourner en rond.",
  secondaryCta: { label: "Voir le parcours en chambre", href: "#chambre" } satisfies Cta,
  trustline: ["Rien à installer", "Vos espaces, votre carte", "Se branche sur votre infrastructure"],
  phone: {
    title: "Bonjour, chambre 214",
    tiles: [
      { label: "Room service", value: "25 min", hint: "Carte du jour" },
      { label: "Piscine", value: "14 / 20", hint: "6 transats libres", share: 0.7 },
      { label: "Salle de sport", value: "3 / 12", hint: "Calme", share: 0.25 },
      { label: "Spa", value: "16 h 30", hint: "Prochain créneau" },
      { label: "Serviettes", value: "Demander", hint: "Étage 2" },
      { label: "Taxi", value: "Appeler", hint: "Réception" },
    ],
  },
  folio: { label: "Note de chambre", value: "24,00 €", detail: "2 Spritz · piscine · 16 h 12" },
  waiter: "Serveur prévenu · transat 12",
};

export type SpaceIcon = "pool" | "sun" | "moon" | "cup" | "leaf";

export const spaces = {
  id: "espaces",
  eyebrow: "Les espaces",
  title: "Partout où un serveur ne passe pas *chaque minute.*",
  subtitle:
    "Un QR par transat, par cabane, par table. Chaque espace a sa carte, son bar ou sa cuisine, ses horaires. Le bar de piscine ferme à 18 h, le rooftop ouvre à 19 h, sans que personne n’y touche.",
  items: [
    {
      name: "La piscine",
      photo: "pool",
      ticket: { where: "Transat 12", what: "2 Spritz · 1 Perrier" },
      icon: "pool",
      text: "Commander sans quitter son transat. Les transats sont numérotés, le bar de piscine reçoit le ticket avec le numéro.",
      hours: "11 h – 18 h",
    },
    {
      name: "La plage",
      photo: "beach",
      ticket: { where: "Cabane 4", what: "Rosé de Provence, 75 cl" },
      icon: "sun",
      text: "Une plaque sur la cabane ou le chevalet de table. La commande part à la paillote, le serveur sait où aller.",
      hours: "10 h – 19 h",
    },
    {
      name: "Le rooftop",
      photo: "rooftop",
      ticket: { where: "Table 7", what: "2 Negroni" },
      icon: "moon",
      text: "Sa carte du soir, ses cocktails, son bar. Le client règle par carte ou signe sur sa chambre, servi à table ou à récupérer au bar.",
      hours: "19 h – 1 h",
    },
    {
      name: "Le lobby",
      photo: "lobby",
      ticket: { where: "Salon 3", what: "2 cafés crème" },
      icon: "cup",
      text: "Un café en attendant un taxi, un verre avant de monter. Pas besoin d’un comptoir tenu en permanence.",
      hours: "7 h – 23 h",
    },
    {
      name: "Le spa",
      photo: "spa",
      ticket: { where: "Bassin", what: "Thé blanc, jus vert" },
      icon: "leaf",
      text: "Une carte courte, servie en silence. Thés, jus, assiettes légères, sans qu’on ait à parler.",
      hours: "10 h – 20 h",
    },
  ] satisfies {
    name: string;
    photo: HotelPhoto;
    ticket: { where: string; what: string };
    icon: SpaceIcon;
    text: string;
    hours: string;
  }[],
  gestures: ["Commander", "Appeler un serveur", "Régler par carte ou sur la chambre", "Laisser un pourboire"],
};

export const cachet = {
  id: "cachet",
  eyebrow: "Le cachet",
  title: "Un scan, *et tout l’hôtel répond.*",
  subtitle: "Un QR qui se fond dans le décor : laiton, travertin, papier. Derrière, tout l’hôtel en temps réel sur le téléphone du client : commander, appeler, réserver le spa, voir s’il reste un transat à la piscine, savoir à quelle heure ferme le rooftop.",
  items: [
    { photo: "cachetPlaque", title: "Plaque en laiton", text: "Gravée, encastrée dans le bois de la table." },
    { photo: "cachetCarte", title: "Sur la carte", text: "Imprimé discrètement sur le menu papier." },
    { photo: "cachetChevalet", title: "Chevalet de table", text: "Travertin et laiton, sur la table ou le transat." },
  ] satisfies { photo: HotelPhoto; title: string; text: string }[],
};

export const roomService = {
  id: "chambre",
  eyebrow: "En chambre",
  title: "Depuis la chambre, *sans décrocher le téléphone.*",
  steps: [
    {
      kicker: "Sur la table de nuit",
      title: "Le client scanne.",
      description:
        "Une carte ou une plaque sur la table de nuit ouvre tout l’hôtel : room service, demandes, spa, horaires. Aucune application, aucun appel à la réception, aucun classeur à feuilleter.",
    },
    {
      kicker: "Le petit-déjeuner",
      title: "Il commande la veille, pour l’heure qu’il veut.",
      description:
        "Un créneau de livraison, les allergènes et les régimes déjà filtrés, un mot pour la cuisine. La commande attend son heure en cuisine.",
    },
    {
      kicker: "À toute heure",
      title: "Il demande, sans appeler.",
      description:
        "Des serviettes, un oreiller, le ménage à 15 h, un départ tardif. La demande part droit à l’étage ou à la réception, et le client voit quand elle arrive.",
    },
    {
      kicker: "Au moment de régler",
      title: "Il signe sur sa chambre.",
      description:
        "Pas de carte à sortir au réveil : la commande se pose sur la note de chambre et se retrouve sur la facture au départ. Minibar compris.",
    },
  ] satisfies StoryStep[],
  screens: {
    scan: { caption: "Tout l’hôtel, depuis la chambre" },
    order: {
      categories: ["Petit-déjeuner", "Toute la journée", "Minibar"],
      lines: [
        { name: "Petit-déjeuner continental", detail: "Viennoiseries, jus, café", price: "18,00 €" },
        { name: "Œufs brouillés", detail: "Sans gluten", price: "9,00 €" },
        { name: "Jus d’orange pressé", detail: "25 cl", price: "6,00 €" },
      ],
      slot: { label: "Livraison", value: "8 h 00 – 8 h 30" },
    },
    requests: {
      options: ["Serviettes", "Oreiller", "Ménage à 15 h", "Départ tardif"],
      status: { label: "Serviettes de bain × 2", value: "dans 4 min", detail: "En route depuis l’étage 2" },
    },
    folio: {
      lines: [
        { name: "Petit-déjeuner continental", price: "18,00 €" },
        { name: "Œufs brouillés", price: "9,00 €" },
        { name: "Jus d’orange pressé", price: "6,00 €" },
      ],
      total: "33,00 €",
      choices: ["Sur ma chambre", "Par carte"],
      done: "Signé · chambre 214",
    },
  },
};

export const folio = {
  id: "note",
  eyebrow: "La note de chambre",
  title: "Ce qui change tout à l’hôtel : *signer sur sa chambre.*",
  subtitle:
    "Au bord de la piscine, personne n’a sa carte bancaire. Le client choisit « Sur ma chambre », la réception voit l’ardoise se remplir, et tout se retrouve sur la facture au départ.",
  points: [
    {
      title: "Le client signe",
      text: "Un geste sur le téléphone, le numéro de chambre déjà connu par le QR. Par carte, Apple Pay ou Google Pay s’il préfère.",
    },
    {
      title: "La réception voit",
      text: "L’ardoise de chaque chambre, en direct : ce qui a été commandé, où, à quelle heure. Rien à ressaisir, rien à retrouver sur un carnet.",
    },
    {
      title: "La facture suit",
      text: "Connecté à votre logiciel hôtelier, la note arrive sur le folio. Sans connexion, la réception valide d’un geste au départ.",
    },
  ],
  slate: {
    title: "Ardoise · chambre 214",
    guest: "M. et Mme Laurent · départ demain",
    lines: [
      { space: "Room service", time: "8 h 05", item: "Petit-déjeuner pour deux", price: "46,00 €" },
      { space: "Piscine", time: "16 h 12", item: "2 Spritz · transat 12", price: "24,00 €" },
      { space: "Spa", time: "17 h 30", item: "Thé blanc, jus vert", price: "14,00 €" },
      { space: "Rooftop", time: "21 h 40", item: "Negroni, Dry Martini", price: "32,00 €" },
    ],
    total: { label: "Total du séjour", value: "116,00 €" },
    status: "Envoyée sur le folio",
  },
};

export const guest = {
  id: "client",
  eyebrow: "Le client reconnu",
  title: "Reconnu d’un espace à l’autre, *et d’un séjour à l’autre.*",
  points: [
    {
      title: "Son prénom à la piscine, son habitude au bar",
      text: "Le client est le même du transat à la chambre. Ce qu’il a aimé hier lui est proposé aujourd’hui.",
    },
    {
      title: "Le client qui revient est accueilli",
      text: "Un mot de bienvenue, sa commande habituelle à un geste, une attention à la deuxième visite.",
    },
    {
      title: "La bonne suggestion au bon moment",
      text: "Un digestif après le dîner, un cocktail quand le soleil tombe sur la piscine : la carte propose, le client dispose.",
    },
  ],
  cards: {
    welcome: { kicker: "Deuxième séjour", title: "Bon retour, Madame Laurent.", text: "Votre transat de l’an dernier, le 12, est libre." },
    usual: { kicker: "Comme hier ?", item: "Spritz Hugo", detail: "Sureau, menthe, prosecco", price: "12,00 €", cta: "Commander" },
    moment: { kicker: "21 h 30 · après le dîner", text: "Un digestif au rooftop ? La terrasse est calme ce soir." },
  },
};

export const stay = {
  id: "sejour",
  eyebrow: "Le séjour",
  title: "Depuis le même QR, *tout l’hôtel.*",
  features: [
    {
      stat: "En direct",
      title: "La fréquentation",
      description:
        "Combien de personnes à la salle de sport, à la piscine, au spa, au petit-déjeuner. Le client regarde avant de descendre, et descend au bon moment.",
    },
    {
      stat: "Un geste",
      title: "Réserver",
      description:
        "Le sauna, un massage, le court de tennis, les vélos, un départ tardif. Un créneau, une confirmation, rien à demander à personne.",
    },
    {
      stat: "0 appel",
      title: "Demander",
      description:
        "Des serviettes, un oreiller, un fer, un taxi, le ménage à l’heure qui arrange. Chaque demande arrive sur le téléphone de la bonne équipe.",
    },
    {
      stat: "Sa langue",
      title: "Tout savoir",
      description:
        "Le Wi-Fi, les horaires du petit-déjeuner, les règles de la piscine, les bonnes adresses. Dans la langue du téléphone du client.",
    },
  ] satisfies Feature[],
  live: {
    title: "L’hôtel en ce moment",
    time: "16 h 05",
    spaces: [
      { label: "Piscine", value: "14", unit: "/ 20", hint: "6 transats libres", share: 0.7 },
      { label: "Salle de sport", value: "3", unit: "/ 12", hint: "Calme", share: 0.25 },
      { label: "Spa", value: "Complet", unit: "", hint: "Libre à 16 h 30", share: 1 },
      { label: "Sauna", value: "1", unit: "/ 6", hint: "Libre", share: 0.17 },
    ],
    curve: {
      title: "Piscine, aujourd’hui",
      best: "Le plus calme : 18 h",
      hours: ["10 h", "11 h", "12 h", "13 h", "14 h", "15 h", "16 h", "17 h", "18 h", "19 h"],
      shares: [0.2, 0.35, 0.6, 0.85, 0.95, 0.9, 0.7, 0.5, 0.3, 0.15],
      now: 6,
      calm: 8,
    },
    booking: { title: "Massage · 50 min", slots: ["16 h 30", "17 h 15", "18 h 00"], done: "Réservé" },
    requests: {
      title: "Vos demandes",
      items: [
        { label: "Serviettes de bain × 2", state: "En route · 4 min" },
        { label: "Taxi pour la gare, 19 h", state: "Confirmé" },
      ],
    },
  },
};

export const team = {
  id: "equipe",
  eyebrow: "L’équipe",
  title: "Un service plus fluide, *pour la salle, les étages et la cuisine.*",
  subtitle:
    "Chaque commande, chaque appel, chaque demande arrive à la bonne personne, avec le numéro du transat ou de la chambre.",
  items: [
    {
      title: "Par zone",
      text: "Les commandes et les appels arrivent sur le téléphone de l’équipe du bon espace : piscine, étages, bar, spa.",
    },
    {
      title: "Aucune ressaisie",
      text: "Chaque bon s’imprime directement en cuisine ou au bar, avec le numéro de transat ou de chambre.",
    },
    {
      title: "Rangs et pourboires",
      text: "Chacun son rang, et les pourboires de ses tables, de ses transats, de ses chambres.",
    },
    {
      title: "Étages et conciergerie",
      text: "Les serviettes, le ménage, le taxi : la même boîte de réception que les serveurs, filtrée par type de demande.",
    },
  ],
  inbox: {
    title: "Équipe piscine",
    count: "3 en cours",
    tickets: [
      { kind: "Commande", where: "Transat 12", what: "2 Spritz · 1 Perrier", age: "À l’instant", fresh: true },
      { kind: "Appel", where: "Transat 4", what: "Souhaite voir un serveur", age: "1 min" },
      { kind: "Addition", where: "Cabane 2", what: "Sur la chambre 118", age: "3 min" },
    ],
    floor: { kind: "Étages", where: "Étage 2 · chambre 214", what: "Serviettes de bain × 2", age: "2 min" },
  },
};

export const direction = {
  id: "direction",
  eyebrow: "La direction",
  title: "Les chiffres de chaque espace, *heure par heure.*",
  features: [
    {
      stat: "Par espace",
      title: "Le chiffre d’affaires",
      description:
        "Piscine, rooftop, room service, lobby : ce que chaque espace rapporte, par jour et par heure, et le panier moyen de chacun.",
    },
    {
      stat: "Minutes",
      title: "Les temps d’attente",
      description:
        "De la commande au service, par espace et par créneau. Là où ça traîne, et depuis quand.",
    },
    {
      stat: "Par étage",
      title: "Les demandes",
      description:
        "Serviettes, ménage, oreillers : combien, à quelle heure, et combien de temps avant d’être traitées.",
    },
    {
      stat: "Demain",
      title: "Les prévisions",
      description:
        "La fréquentation attendue à la piscine et au bar selon la météo et le taux d’occupation, pour planifier l’équipe.",
    },
  ] satisfies Feature[],
  board: {
    title: "Aujourd’hui, par espace",
    total: { value: "10 700 €", delta: "+18 % sur samedi dernier" },
    spaces: [
      { label: "Rooftop", value: "4 820 €", share: 1 },
      { label: "Piscine", value: "3 140 €", share: 0.65 },
      { label: "Room service", value: "1 960 €", share: 0.41 },
      { label: "Lobby", value: "780 €", share: 0.16 },
    ],
    wait: { label: "De la commande au service", value: "6 min", hint: "Piscine, 13 h – 15 h : 11 min" },
    forecast: { label: "Demain", value: "31 °C · 92 % occupé", hint: "Piscine pleine dès 13 h : prévoir 3 serveurs" },
  },
};

export const infrastructure = {
  id: "infrastructure",
  eyebrow: "Votre infrastructure",
  title: "On se branche sur *ce que vous avez déjà.*",
  text: "Votre caisse, vos terminaux de paiement, vos imprimantes et votre logiciel hôtelier restent en place. Ominin s’y connecte ; rien n’est à remplacer.",
  items: ["Caisse", "Paiement", "Logiciel hôtelier", "Imprimantes"],
};

export const objective = {
  eyebrow: "Notre objectif",
  quote: "Rendre chaque interaction plus simple, plus rapide et plus élégante, *sans dénaturer le service humain.*",
  signature: "Ominin ne remplace pas le service : il lui permet d’être présent quand le client en a besoin.",
};

export const faqSection = {
  id: "faq",
  eyebrow: "FAQ",
  title: "Les questions qu’un hôtel nous pose.",
  items: [
    {
      question: "Le client doit-il installer une application ?",
      answer:
        "Non. Il scanne le QR code avec l’appareil photo de son téléphone et la page s’ouvre dans son navigateur, dans sa langue. Rien à télécharger, rien à créer.",
    },
    {
      question: "D’où viennent les chiffres de fréquentation ?",
      answer:
        "De trois sources, selon l’espace : un compteur que l’équipe touche en entrant et en sortant, un capteur de passage à la porte, ou les réservations de créneaux. On commence par ce que vous avez, on ajoute un capteur seulement là où il est utile.",
    },
    {
      question: "Comment la note de chambre arrive-t-elle sur la facture ?",
      answer:
        "Si votre logiciel hôtelier s’y prête, Ominin y pose chaque commande directement. Sinon, la réception voit l’ardoise de chaque chambre et la valide au départ. Dans les deux cas, rien n’est ressaisi.",
    },
    {
      question: "Et notre caisse, nos terminaux ?",
      answer:
        "Ils restent. Ominin se connecte à votre infrastructure existante : les commandes passent dans votre caisse, les paiements sur vos terminaux ou en ligne, les bons sur vos imprimantes.",
    },
    {
      question: "Le service humain disparaît-il ?",
      answer:
        "Non, il se déplace là où il compte. Le client n’a plus à chercher un serveur du regard ni à appeler la réception ; l’équipe n’a plus à faire des tours de piscine pour rien. Elle est là quand on a besoin d’elle.",
    },
    {
      question: "Combien ça coûte ?",
      answer:
        "Une offre par établissement, selon le nombre d’espaces et de chambres. Demandez une démo : on regarde vos espaces ensemble et on vous répond avec un chiffre.",
    },
    {
      question: "Combien de temps pour démarrer ?",
      answer:
        "Vos cartes et vos espaces sont saisis par nos soins, les QR codes livrés prêts à poser. Un hôtel démarre en général espace par espace, la piscine d’abord.",
    },
  ] satisfies FaqItem[],
};

export const finalCta = {
  id: "demo",
  title: "Votre piscine peut commander *cet été.*",
  subtitle:
    "Une démo sur vos espaces, avec votre carte. On vous montre le parcours du transat à la chambre et on vous répond avec un chiffre.",
  contactLabel: "Nous écrire",
  microcopy: ["Rien à installer", "Espace par espace", "Votre infrastructure reste"],
};

export const footer = {
  tagline: "Ominin Hôtels — le service vient au client, du transat à la chambre.",
};

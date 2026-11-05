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
    "Un QR code par transat, par table et par chambre : vos clients commandent, appellent, réservent et règlent sur leur note de chambre depuis leur téléphone. Sans appel, sans attente, sans application.",
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
    "Un QR code sur chaque transat, chaque table et chaque table de nuit. Le client commande, appelle, réserve et règle sur sa note de chambre depuis son téléphone. Votre équipe est là quand on a besoin d'elle, jamais à tourner en rond.",
  secondaryCta: { label: "Voir le parcours en chambre", href: "#chambre" } satisfies Cta,
  trustline: ["Rien à installer", "Vos espaces, votre carte", "Se branche sur votre infrastructure"],
  phone: {
    title: "Bonjour, chambre 214",
    tiles: [
      { label: "Room service", value: "25 min", hint: "Carte du jour" },
      { label: "Piscine", value: "6 places", hint: "En direct", live: true },
      { label: "Salle de sport", value: "3 / 12", hint: "En direct", live: true },
      { label: "Spa", value: "16 h 30", hint: "Prochain créneau" },
      { label: "Serviettes", value: "Demander", hint: "Étage 2" },
      { label: "Taxi", value: "Appeler", hint: "Réception" },
    ],
  },
  folio: { label: "Note de chambre", value: "34,00 €", detail: "2 cocktails · piscine · 16 h 12" },
  waiter: "Serveur prévenu · transat 12",
};

export const marquee = [
  "Transat",
  "Chambre",
  "Piscine",
  "Rooftop",
  "Petit-déjeuner",
  "Note de chambre",
  "Spa",
  "Salle de sport",
  "Serviettes",
  "Taxi",
];

export type SpaceIcon = "pool" | "sun" | "moon" | "cup" | "leaf";

export const spaces = {
  id: "espaces",
  eyebrow: "Les espaces",
  title: "Partout où un serveur ne passe pas toutes les cinq minutes.",
  subtitle:
    "Un QR par transat, par cabane, par table. Chaque espace a sa carte, son bar ou sa cuisine, ses horaires. Le bar de piscine ferme à 18 h, le rooftop ouvre à 19 h, sans que personne n'y touche.",
  items: [
    {
      name: "La piscine",
      icon: "pool",
      text: "Commander sans quitter son transat. Les transats sont numérotés, le bar de piscine reçoit le ticket avec le numéro.",
      hours: "11 h – 18 h",
    },
    {
      name: "La plage",
      icon: "sun",
      text: "Une plaque sur la cabane ou le chevalet de table. La commande part à la paillote, le serveur sait où aller.",
      hours: "10 h – 19 h",
    },
    {
      name: "Le rooftop",
      icon: "moon",
      text: "Sa carte du soir, ses cocktails, son bar. Le client règle par carte ou signe sur sa chambre.",
      hours: "19 h – 1 h",
    },
    {
      name: "Le lobby",
      icon: "cup",
      text: "Un café en attendant un taxi, un verre avant de monter. Pas besoin d'un comptoir tenu en permanence.",
      hours: "7 h – 23 h",
    },
    {
      name: "Le spa",
      icon: "leaf",
      text: "Une carte courte, servie en silence. Thés, jus, assiettes légères, sans qu'on ait à parler.",
      hours: "10 h – 20 h",
    },
  ] satisfies { name: string; icon: SpaceIcon; text: string; hours: string }[],
  gestures: ["Commander", "Appeler un serveur", "Régler par carte ou sur la chambre", "Laisser un pourboire"],
};

export const roomService = {
  id: "chambre",
  eyebrow: "Room service",
  title: "La chambre commande comme une table.",
  steps: [
    {
      kicker: "Sur la table de nuit",
      title: "Le client scanne.",
      description:
        "Une carte ou une plaque dans la chambre. Aucune application, aucun appel à la réception, aucune carte plastifiée à chercher dans un tiroir.",
    },
    {
      kicker: "Le petit-déjeuner",
      title: "Il commande la veille, pour l'heure qu'il veut.",
      description:
        "Un créneau de livraison, les allergènes et les régimes déjà filtrés, un mot pour la cuisine. La commande attend son heure en cuisine.",
    },
    {
      kicker: "Pendant la préparation",
      title: "Il sait quand ça arrive.",
      description:
        "« Votre plateau quitte la cuisine dans 12 min. » Et s'il ne veut pas être dérangé, le plateau est déposé devant la porte.",
    },
    {
      kicker: "Au moment de régler",
      title: "Il signe sur sa chambre.",
      description:
        "Pas de carte à sortir au réveil : la commande se pose sur la note de chambre et se retrouve sur la facture au départ. Minibar compris.",
    },
  ] satisfies StoryStep[],
  screens: {
    scan: { caption: "Scannez pour commander" },
    order: {
      categories: ["Petit-déjeuner", "Toute la journée", "Minibar"],
      lines: [
        { name: "Petit-déjeuner continental", detail: "Viennoiseries, jus, café", price: "18,00 €" },
        { name: "Œufs brouillés", detail: "Sans gluten", price: "9,00 €" },
        { name: "Jus d'orange pressé", detail: "25 cl", price: "6,00 €" },
      ],
      slot: { label: "Livraison", value: "8 h 00 – 8 h 30" },
    },
    eta: {
      title: "Votre plateau quitte la cuisine",
      value: "dans 12 min",
      options: ["Déposer devant la porte", "Frapper"],
    },
    folio: {
      lines: [
        { name: "Petit-déjeuner continental", price: "18,00 €" },
        { name: "Œufs brouillés", price: "9,00 €" },
        { name: "Jus d'orange pressé", price: "6,00 €" },
      ],
      total: "33,00 €",
      choices: ["Sur ma chambre", "Par carte"],
      done: "Signé · chambre 214",
    },
  },
};

export const folio = {
  id: "note",
  eyebrow: "La note de chambre",
  title: "Ce qui change tout à l'hôtel : signer sur sa chambre.",
  subtitle:
    "Au bord de la piscine, personne n'a sa carte bancaire. Le client choisit « Sur ma chambre », la réception voit l'ardoise se remplir, et tout se retrouve sur la facture au départ.",
  points: [
    {
      title: "Le client signe",
      text: "Un geste sur le téléphone, le numéro de chambre déjà connu par le QR. Par carte, Apple Pay ou Google Pay s'il préfère.",
    },
    {
      title: "La réception voit",
      text: "L'ardoise de chaque chambre, en direct : ce qui a été commandé, où, à quelle heure. Rien à ressaisir, rien à retrouver sur un carnet.",
    },
    {
      title: "La facture suit",
      text: "Connecté à votre logiciel hôtelier, la note arrive sur le folio. Sans connexion, la réception valide d'un geste au départ.",
    },
  ],
};

export const guest = {
  id: "client",
  eyebrow: "Le client reconnu",
  title: "Reconnu d'un espace à l'autre, et d'un séjour à l'autre.",
  points: [
    {
      title: "Son prénom à la piscine, son habitude au bar",
      text: "Le client est le même du transat à la chambre. Ce qu'il a aimé hier lui est proposé aujourd'hui.",
    },
    {
      title: "Le client qui revient est accueilli",
      text: "Un mot de bienvenue, sa commande habituelle à un geste, une attention à la deuxième visite.",
    },
    {
      title: "La bonne suggestion au bon moment",
      text: "Un digestif après le dîner, un cocktail quand le soleil tombe sur la piscine : la carte propose, le client dispose.",
    },
  ],
};

export const stay = {
  id: "sejour",
  eyebrow: "Le séjour",
  title: "Depuis le même QR, tout l'hôtel.",
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
        "Des serviettes, un oreiller, un fer, un taxi, le ménage à l'heure qui arrange. Chaque demande arrive sur le téléphone de la bonne équipe.",
    },
    {
      stat: "Sa langue",
      title: "Tout savoir",
      description:
        "Le Wi-Fi, les horaires du petit-déjeuner, les règles de la piscine, les bonnes adresses. Dans la langue du téléphone du client.",
    },
  ] satisfies Feature[],
  occupancy: [
    { label: "Piscine", value: "14 / 20", share: 0.7, ember: true },
    { label: "Salle de sport", value: "3 / 12", share: 0.25 },
    { label: "Spa", value: "complet jusqu'à 16 h 30", share: 1 },
    { label: "Petit-déjeuner", value: "calme", share: 0.15 },
  ],
};

export const team = {
  id: "equipe",
  eyebrow: "L'équipe",
  title: "Un service plus fluide, pour la salle, les étages et la cuisine.",
  subtitle:
    "Ominin ne remplace pas le service : il lui permet d'être présent quand le client en a besoin.",
  items: [
    {
      title: "Par zone",
      text: "Les commandes et les appels arrivent sur le téléphone de l'équipe du bon espace : piscine, étages, bar, spa.",
    },
    {
      title: "Aucune ressaisie",
      text: "Chaque bon s'imprime directement en cuisine ou au bar, avec le numéro de transat ou de chambre.",
    },
    {
      title: "Rangs et pourboires",
      text: "Chacun son rang, et les pourboires de ses tables, de ses transats, de ses chambres.",
    },
    {
      title: "Étages et conciergerie",
      text: "Les serviettes, le ménage, le taxi : la même boîte de réception que les serveurs, filtrée par type de demande.",
    },
  ],
};

export const direction = {
  id: "direction",
  eyebrow: "La direction",
  title: "Les chiffres de chaque espace, heure par heure.",
  features: [
    {
      stat: "Par espace",
      title: "Le chiffre d'affaires",
      description:
        "Piscine, rooftop, room service, lobby : ce que chaque espace rapporte, par jour et par heure, et le panier moyen de chacun.",
    },
    {
      stat: "Minutes",
      title: "Les temps d'attente",
      description:
        "De la commande au service, par espace et par créneau. Là où ça traîne, et depuis quand.",
    },
    {
      stat: "Par étage",
      title: "Les demandes",
      description:
        "Serviettes, ménage, oreillers : combien, à quelle heure, et combien de temps avant d'être traitées.",
    },
    {
      stat: "Demain",
      title: "Les prévisions",
      description:
        "La fréquentation attendue à la piscine et au bar selon la météo et le taux d'occupation, pour planifier l'équipe.",
    },
  ] satisfies Feature[],
  peaks: [
    { label: "Rooftop · 19 h – 23 h", value: "pic", share: 1, ember: true },
    { label: "Piscine · 12 h – 16 h", value: "fort", share: 0.72 },
    { label: "Room service · 7 h – 10 h", value: "régulier", share: 0.58 },
  ],
};

export const infrastructure = {
  id: "infrastructure",
  eyebrow: "Votre infrastructure",
  title: "On se branche sur ce que vous avez déjà.",
  text: "Votre caisse, vos terminaux de paiement, vos imprimantes et votre logiciel hôtelier restent en place. Ominin s'y connecte ; rien n'est à remplacer.",
  items: ["Caisse", "Paiement", "Logiciel hôtelier", "Imprimantes"],
};

export const faqSection = {
  id: "faq",
  eyebrow: "FAQ",
  title: "Les questions qu'un hôtel nous pose.",
  items: [
    {
      question: "Le client doit-il installer une application ?",
      answer:
        "Non. Il scanne le QR code avec l'appareil photo de son téléphone et la page s'ouvre dans son navigateur, dans sa langue. Rien à télécharger, rien à créer.",
    },
    {
      question: "D'où viennent les chiffres de fréquentation ?",
      answer:
        "De trois sources, selon l'espace : un compteur que l'équipe touche en entrant et en sortant, un capteur de passage à la porte, ou les réservations de créneaux. On commence par ce que vous avez, on ajoute un capteur seulement là où il est utile.",
    },
    {
      question: "Comment la note de chambre arrive-t-elle sur la facture ?",
      answer:
        "Si votre logiciel hôtelier s'y prête, Ominin y pose chaque commande directement. Sinon, la réception voit l'ardoise de chaque chambre et la valide au départ. Dans les deux cas, rien n'est ressaisi.",
    },
    {
      question: "Et notre caisse, nos terminaux ?",
      answer:
        "Ils restent. Ominin se connecte à votre infrastructure existante : les commandes passent dans votre caisse, les paiements sur vos terminaux ou en ligne, les bons sur vos imprimantes.",
    },
    {
      question: "Le service humain disparaît-il ?",
      answer:
        "Non, il se déplace là où il compte. Le client n'a plus à chercher un serveur du regard ni à appeler la réception ; l'équipe n'a plus à faire des tours de piscine pour rien. Elle est là quand on a besoin d'elle.",
    },
    {
      question: "Combien ça coûte ?",
      answer:
        "Une offre par établissement, selon le nombre d'espaces et de chambres. Demandez une démo : on regarde vos espaces ensemble et on vous répond avec un chiffre.",
    },
    {
      question: "Combien de temps pour démarrer ?",
      answer:
        "Vos cartes et vos espaces sont saisis par nos soins, les QR codes livrés prêts à poser. Un hôtel démarre en général espace par espace, la piscine d'abord.",
    },
  ] satisfies FaqItem[],
};

export const finalCta = {
  id: "demo",
  title: "Votre piscine peut commander cet été.",
  subtitle:
    "Une démo sur vos espaces, avec votre carte. On vous montre le parcours du transat à la chambre et on vous répond avec un chiffre.",
  contactLabel: "Nous écrire",
  microcopy: ["Rien à installer", "Espace par espace", "Votre infrastructure reste"],
};

export const footer = {
  tagline: "Ominin Hôtels — le service vient au client, du transat à la chambre.",
};

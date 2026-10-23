import type { StaticImageData } from "next/image";

import plafondAvant from "@/assets/chantiers/plafond-avant.jpg";
import plafondApres from "@/assets/chantiers/plafond-apres.jpg";
import charpenteAvant from "@/assets/chantiers/charpente-avant.jpg";
import charpenteApres from "@/assets/chantiers/charpente-apres.jpg";
import escalierAvant from "@/assets/chantiers/escalier-avant.jpg";
import escalierApres from "@/assets/chantiers/escalier-apres.jpg";
import portailAvant from "@/assets/chantiers/portail-avant.jpg";
import portailApres from "@/assets/chantiers/portail-apres.jpg";
import plafondBlancAvant from "@/assets/chantiers/plafond-blanc-avant.jpg";
import plafondBlancApres from "@/assets/chantiers/plafond-blanc-apres.jpg";

export const navLinks = [
  { href: "#chantiers", label: "Chantiers" },
  { href: "#savoir-faire", label: "Savoir-faire" },
  { href: "#applications", label: "Applications" },
  { href: "#devis", label: "Contact" },
] as const;

export const navCta = { href: "#devis", label: "Demander un devis" } as const;

export const zone = ["Toulouse", "Montauban", "Albi", "Carcassonne", "Auch"] as const;

export const contact = {
  phone: "07 46 28 95 90",
  phoneHref: "tel:+33746289590",
  email: "flgaerogommage@gmail.com",
} as const;

export const legal = {
  company: "SAS FLG Aérogommage",
  registration: "RCS Toulouse 989 590 245",
  vat: "TVA intracommunautaire : FR 96989590245",
  address: { street: "8 rue Henri Matisse", postalCode: "31320", city: "Castanet-Tolosan" },
  representative: "M. Frédéric Le Grégam",
} as const;

export const surfaces = [
  "Charpentes",
  "Plafonds",
  "Poutres",
  "Escaliers",
  "Façades",
  "Sols",
  "Tomettes",
  "Pierre",
  "Portails",
  "Métal",
] as const;

export const procede = {
  lede: "C’est un procédé de traitement de surface dérivé de la technique du sablage.",
  body: "Cela consiste en la projection d’un abrasif à l’aide d’air comprimé à basse pression (entre 1,5 et 6 bars) en vue du décapage ou du nettoyage de surface. Cette technique est mieux adaptée que le sablage aux travaux de précision et à l’emploi dans des endroits difficilement accessibles. Grâce à l’emploi de basse pression et à un choix d’une large gamme d’abrasifs, elle est efficace sur tout support. L’utilisation d’abrasifs de très faible granulométrie permet le respect total de nombreux supports. Par exemple il est possible de décaper un vernis ou une peinture le long d’une vitrerie sans qu’il y ait le moindre impact sur le verre lorsque l’abrasif est adapté. C’est une technique efficace pour nettoyer tous les types de surface (bois, pierre, métal). Il s’agit d’une technique de nettoyage sec sans apport d’eau, qui permet une remise en état d’un support qui a subi le temps ou qui a été recouvert par une matière (peinture, vernis, enduit…). C’est aussi un bon moyen de préparer une surface métallique avant peinture car ça donne une bonne accroche indispensable à la peinture.",
} as const;

export type Case = {
  title: string;
  body?: string;
  before: StaticImageData;
  after: StaticImageData;
};

export const featured = {
  title: "Chantiers extérieurs et intérieurs",
  note: "Poutres salies par la graisse du toit.",
  film: {
    src: "/films/auvent-travelling.mp4",
    poster: "/films/auvent-travelling.jpg",
    label: "Travelling le long de l'auvent : les poutres décapées sur toute la galerie",
  },
  filmBefore: {
    src: "/films/auvent-avant.mp4",
    poster: "/films/auvent-avant.jpg",
    label: "Travelling le long de l'auvent avant le décapage : les poutres noircies sur toute la galerie",
  },
  compare: { title: "Plafond intérieur", before: plafondAvant, after: plafondApres },
};

export const cases: readonly Case[] = [
  { title: "Charpente extérieure", before: charpenteAvant, after: charpenteApres },
  { title: "Escalier intérieur", before: escalierAvant, after: escalierApres },
  { title: "Portail métallique", body: "Décapé, application anti-rouille.", before: portailAvant, after: portailApres },
  { title: "Plafond et poutres", before: plafondBlancAvant, after: plafondBlancApres },
];

export const steps = [
  { title: "Visite et devis", body: "Vérification du type de support et de la matière à décaper." },
  { title: "Protection", body: "Sols, menuiseries, vitrages et murs sont bâchés avant toute projection, un extracteur de particules est mis en place." },
  { title: "Aérogommage", body: "La pression et l'abrasif sont choisis selon le type de matériau." },
  { title: "Finition", body: "Si vous le souhaitez, lasure, vernis ou anti-rouille peuvent être appliqués." },
  { title: "Réception", body: "Désinstallation et nettoyage du chantier. Le chantier est réceptionné par le client." },
] as const;

export const applications = [
  { title: "Bois", items: ["Charpentes et façades", "Plafonds à la française", "Poutres, solives, auvents", "Bardages, volets, pergolas"] },
  { title: "Pierre et tomette", items: ["Façades", "Murs intérieurs", "Sols en tomettes", "Encadrements", "Cheminées"] },
  { title: "Métal", items: ["Portails et garde-corps", "Structures et ossatures", "Préparation avant peinture"] },
] as const;


export const audiences = [
  "Architectes et maîtres d'œuvre",
  "Entreprises de rénovation",
  "Entreprises de construction",
  "Particuliers",
] as const;

export const comparison = {
  methods: ["Aérogommage", "Sablage", "Décapant chimique"],
  rows: [
    ["Pression", "Basse, 1,5 à 6 bar", "Haute", "—"],
    ["Eau", "Aucune", "Selon procédé", "Rinçage nécessaire"],
    ["Produits chimiques", "Aucun", "Aucun", "Solvants à neutraliser"],
    ["Support", "Préservé", "Peut être creusé", "Peut être taché"],
    ["Bois anciens, détails", "Adapté", "Risqué", "Long, inégal"],
  ],
} as const;

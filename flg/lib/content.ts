import type { StaticImageData } from "next/image";

import plafondAvant from "@/assets/chantiers/plafond-avant.jpg";
import plafondApres from "@/assets/chantiers/plafond-apres.jpg";
import charpenteAvant from "@/assets/chantiers/charpente-avant.jpg";
import charpenteApres from "@/assets/chantiers/charpente-apres.jpg";
import escalierAvant from "@/assets/chantiers/escalier-avant.jpg";
import escalierApres from "@/assets/chantiers/escalier-apres.jpg";
import portailAvant from "@/assets/chantiers/portail-avant.jpg";
import portailApres from "@/assets/chantiers/portail-apres.jpg";
import auventGalerie from "@/assets/chantiers/auvent-galerie.jpg";

export const navLinks = [
  { href: "#chantiers", label: "Chantiers" },
  { href: "#savoir-faire", label: "Savoir-faire" },
  { href: "#applications", label: "Applications" },
  { href: "#devis", label: "Contact" },
] as const;

export const navCta = { href: "#devis", label: "Demander un devis" } as const;

export const zone = ["Toulouse", "Montauban", "Albi", "Carcassonne", "Auch"] as const;

export const contact = { phone: "07 46 28 95 90", phoneHref: "tel:+33746289590" } as const;

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

export const proofs = [
  { value: "1,5 – 6", unit: "bar", label: "Basse pression", body: "Le support n'est ni creusé ni marqué : on retire la couche, pas la matière." },
  { value: "0", unit: "eau · solvant", label: "À sec, sans chimie", body: "Un abrasif fin et de l'air comprimé. Ni rinçage, ni séchage, ni décapant à neutraliser." },
] as const;

export type Case = {
  title: string;
  kind?: string;
  body?: string;
  before: StaticImageData;
  after: StaticImageData;
};

export const featured = {
  kind: "Bâtiment neuf · Extérieur",
  title: "Chantier extérieur",
  wide: auventGalerie,
  film: {
    src: "/films/auvent-travelling.mp4",
    poster: "/films/auvent-travelling.jpg",
    label: "Travelling le long de l'auvent : les poutres décapées sur toute la galerie",
  },
  compare: { title: "Plafond intérieur", before: plafondAvant, after: plafondApres },
};

export const cases: readonly Case[] = [
  { title: "Charpente extérieure", before: charpenteAvant, after: charpenteApres },
  {
    title: "Escalier en chêne",
    kind: "Escalier · Intérieur",
    body: "Marches peintes, chêne retrouvé.",
    before: escalierAvant,
    after: escalierApres,
  },
];

export const smallCases: readonly Case[] = [
  {
    title: "Portail métallique",
    kind: "Métal · Extérieur",
    body: "Décapé jusqu'au métal sain, puis repeint.",
    before: portailAvant,
    after: portailApres,
  },
];

export const steps = [
  { title: "Visite et devis", body: "On regarde le support, la couche à retirer, l'accès et la surface. Le devis est gratuit." },
  { title: "Protection", body: "Sols, menuiseries, vitrages et murs sont bâchés avant toute projection." },
  { title: "Aérogommage", body: "Abrasif et pression choisis pour le matériau : on retire la couche sans attaquer le support." },
  { title: "Finition", body: "Si vous le souhaitez, lasure, vernis ou huile de fabricants reconnus pour protéger le support." },
  { title: "Réception", body: "Chantier nettoyé, bâches retirées, le résultat vu ensemble." },
] as const;

export const applications = [
  { title: "Bois", items: ["Charpentes et fermes", "Plafonds à la française", "Poutres, solives, auvents", "Bardages, volets, pergolas"] },
  { title: "Pierre et tomette", items: ["Façades", "Murs intérieurs", "Sols en tomette", "Encadrements", "Cheminées"] },
  { title: "Métal", items: ["Portails et garde-corps", "Structures et ossatures", "Préparation avant peinture"] },
] as const;

export const alsoOffered = "Aussi : microbillage de pièces inox et aluminium, dépolissage du verre au pochoir.";

export const audiences = [
  { title: "Architectes et maîtres d'œuvre", body: "Restituer un bâti ancien sans le dénaturer, préparer un support avant finition." },
  { title: "Entreprises de rénovation", body: "Un sous-traitant pour le décapage, qui protège et rend un chantier propre." },
  { title: "Collectivités et copropriétés", body: "Auvents, préaux, charpentes, façades : de grandes surfaces, traitées sur place." },
  { title: "Particuliers", body: "Plafonds, charpentes, escaliers, façades, sols." },
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

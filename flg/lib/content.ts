import type { StaticImageData } from "next/image";
import { responseTime } from "@/lib/devis";

import auventAvant from "@/assets/chantiers/auvent-avant.jpg";
import auventApres from "@/assets/chantiers/auvent-apres.jpg";
import plafondAvant from "@/assets/chantiers/plafond-avant.jpg";
import plafondApres from "@/assets/chantiers/plafond-apres.jpg";
import charpenteAvant from "@/assets/chantiers/charpente-avant.jpg";
import charpenteApres from "@/assets/chantiers/charpente-apres.jpg";
import escalierAvant from "@/assets/chantiers/escalier-avant.jpg";
import escalierApres from "@/assets/chantiers/escalier-apres.jpg";
import portailAvant from "@/assets/chantiers/portail-avant.jpg";
import portailApres from "@/assets/chantiers/portail-apres.jpg";
import plafondClairAvant from "@/assets/chantiers/plafond-clair-avant.jpg";
import plafondClairApres from "@/assets/chantiers/plafond-clair-apres.jpg";
import auventGalerie from "@/assets/chantiers/auvent-galerie.jpg";

export const navLinks = [
  { href: "#chantiers", label: "Chantiers" },
  { href: "#savoir-faire", label: "Savoir-faire" },
  { href: "#applications", label: "Applications" },
  { href: "#questions", label: "Questions" },
] as const;

export const navCta = { href: "#devis", label: "Demander un devis" } as const;

export const zone = ["Toulouse", "Montauban", "Albi"] as const;

export const surfaces = [
  "Charpentes",
  "Plafonds",
  "Poutres",
  "Escaliers",
  "Façades",
  "Pierre",
  "Brique",
  "Portails",
  "Métal",
] as const;

export const proofs = [
  { value: "1,5 – 6", unit: "bar", label: "Basse pression", body: "Le support n'est ni creusé ni marqué : on retire la couche, pas la matière." },
  { value: "0", unit: "eau · solvant", label: "À sec, sans chimie", body: "Un abrasif fin et de l'air comprimé. Ni rinçage, ni séchage, ni décapant à neutraliser." },
  { value: responseTime, unit: "", label: "Réponse au devis", body: "Devis gratuit et sans engagement, établi après visite du chantier." },
] as const;

export type Case = {
  title: string;
  kind: string;
  body: string;
  facts: readonly (readonly [string, string])[];
  before: StaticImageData;
  after: StaticImageData;
};

export const featured: Case & { film: { src: string; poster: string; label: string }; wide: StaticImageData } = {
  title: "Auvent en lamellé-collé",
  kind: "Bâtiment neuf · Extérieur",
  body: "Sur un bâtiment neuf, les poutres de l'auvent avaient grisé et taché pendant le chantier. Décapage poutre par poutre depuis l'échafaudage, sol bâché, pour rendre au bois sa teinte d'origine sur toute la longueur de la galerie.",
  facts: [
    ["Support", "Lamellé-collé"],
    ["Couche retirée", "Grisaillement, taches de chantier"],
    ["Accès", "Échafaudage roulant"],
    ["Protection", "Sol bâché"],
  ],
  before: auventAvant,
  after: auventApres,
  wide: auventGalerie,
  film: {
    src: "/films/auvent-travelling.mp4",
    poster: "/films/auvent-travelling.jpg",
    label: "Travelling le long de l'auvent : les poutres décapées sur toute la galerie",
  },
};

export const cases: readonly Case[] = [
  {
    title: "Plafond à solives",
    kind: "Plafond · Intérieur",
    body: "Solives et entrevous sous une peinture blanche écaillée. Décapage complet jusqu'au bois, fenêtres et murs protégés.",
    facts: [
      ["Support", "Solives et entrevous bois"],
      ["Couche retirée", "Peinture blanche écaillée"],
    ],
    before: plafondAvant,
    after: plafondApres,
  },
  {
    title: "Charpente de terrasse",
    kind: "Charpente · Extérieur",
    body: "Bois grisé par les intempéries. Décapé, puis protégé par une lasure qui lui rend sa chaleur.",
    facts: [
      ["Support", "Charpente bois"],
      ["Finition", "Lasure"],
    ],
    before: charpenteAvant,
    after: charpenteApres,
  },
  {
    title: "Plafond bois",
    kind: "Plafond · Intérieur",
    body: "Lames et poutres sous une peinture blanche. Le bois remis à nu sur toute la pièce.",
    facts: [
      ["Support", "Lames et poutres bois"],
      ["Couche retirée", "Peinture blanche"],
    ],
    before: plafondClairAvant,
    after: plafondClairApres,
  },
];

export const smallCases: readonly Omit<Case, "facts">[] = [
  {
    title: "Escalier en chêne",
    kind: "Escalier · Intérieur",
    body: "Marches peintes, chêne retrouvé.",
    before: escalierAvant,
    after: escalierApres,
  },
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
  { title: "Pierre et brique", items: ["Façades", "Murs intérieurs", "Encadrements", "Cheminées"] },
  { title: "Métal", items: ["Portails et garde-corps", "Structures et ossatures", "Pièces et moules industriels", "Préparation avant peinture"] },
] as const;

export const alsoOffered = "Aussi : microbillage de pièces inox et aluminium, dépolissage du verre au pochoir.";

export const audiences = [
  { title: "Architectes et maîtres d'œuvre", body: "Restituer un bâti ancien sans le dénaturer, préparer un support avant finition." },
  { title: "Entreprises du bâtiment", body: "Un sous-traitant pour le décapage, qui protège et rend un chantier propre." },
  { title: "Collectivités et copropriétés", body: "Auvents, préaux, charpentes, façades : de grandes surfaces, traitées sur place." },
  { title: "Industrie", body: "Moules, pièces mécaniques, structures : nettoyage et préparation de surface." },
  { title: "Particuliers", body: "Plafonds, charpentes, escaliers, façades : les grands volumes d'une maison." },
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

export const faq = [
  {
    q: "Qu'est-ce que l'aérogommage ?",
    a: "Un décapage par projection d'un abrasif fin, porté par de l'air comprimé à basse pression — entre 1,5 et 6 bars. Il retire peintures, lasures, vernis et salissures à sec, sans eau ni produit chimique, en respectant le support d'origine.",
  },
  {
    q: "Quelles surfaces traitez-vous ?",
    a: "Le bois — charpentes, poutres, plafonds, escaliers —, la pierre, la brique, le béton et le métal : portails, garde-corps, structures, pièces industrielles. En intérieur comme en extérieur.",
  },
  {
    q: "Intervenez-vous sur de grands chantiers ?",
    a: "Oui, c'est le cœur du métier : plafonds entiers, charpentes, auvents, façades. Pour les grandes surfaces, la visite permet de prévoir l'accès, la protection et le planning.",
  },
  {
    q: "Et la poussière ?",
    a: "Avant toute projection, sols, menuiseries et ouvertures sont bâchés. Le chantier est nettoyé à la fin de l'intervention.",
  },
  {
    q: "Décapez-vous les peintures au plomb ?",
    a: "Non. Les peintures au plomb ne se traitent pas par aérogommage. Dans le bâti ancien, un diagnostic plomb est à faire réaliser avant toute intervention.",
  },
  {
    q: "Posez-vous une finition après le décapage ?",
    a: "Oui, si vous le souhaitez : lasures, vernis et huiles de fabricants reconnus, pour protéger le support et garder son aspect naturel.",
  },
  {
    q: "Où intervenez-vous ?",
    a: "Dans toute l'Occitanie, notamment autour de Toulouse, Montauban et Albi.",
  },
  {
    q: "Le devis est-il gratuit ?",
    a: `Oui, gratuit et sans engagement, établi après évaluation du chantier. Réponse sous ${responseTime}.`,
  },
] as const;

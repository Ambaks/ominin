import { connectCommission, contactEmail, starterKit } from "@/lib/landing-data";
import { commonSources, euros, offer, percent } from "@/lib/pitch/kit";
import { menuPrintUrl } from "@/lib/site";

/*
 * Le pitch aux clubs et discothèques (www.ominin.com/club) : générique, sans
 * enseigne prospecte — la démo est L'Étoile, notre club fictif. Une page et
 * un film (marketing/linkedin-film, compositions Club et Club-9x16), les
 * mêmes mots. Typographie : celle de kit.ts.
 *
 * Présentés comme disponibles à la demande du propriétaire, pas encore dans
 * le produit : le choix du bar (un point de retrait par établissement
 * aujourd'hui), l'attente de chaque bar estimée par l'IA et l'envoi des
 * commandes vers le bar le plus rapide, et la notification « C'est prêt »
 * sur l'écran verrouillé.
 * barChoice "soon" remettrait « Bientôt » sur l'étape, comme BAR_CHOICE dans
 * le film (marketing/linkedin-film/src/club/copy.ts).
 */

const barChoice = "live" as "soon" | "live";

const demoHref = `${menuPrintUrl}/demo/club`;
const mailSubject = "Ominin pour mon club";
/** Le corps du mail prérempli : ce qu'il nous faut pour répondre utilement. */
const mailBody = "Bonjour,\n\nJe suis intéressé(e) par Ominin pour mon club.\n\nNom du club :\nVille :\nNombre de bars :\n";

const shot = (name: string) => `/pitch/club/${name}.webp`;

/** La commande du film, deux cocktails de la carte de démonstration (14 € + 13 €, DRINKS dans marketing/linkedin-film/src/club/copy.ts). */
const exampleTicket = 27;

export const clubSources = {
  report: commonSources.report,
  lu: commonSources.lu,
};

export type ClubSourceId = keyof typeof clubSources;

type Step = { title: string; text: string; soon?: boolean; screen: { src: string; alt: string } };

const stepItems: Step[] = [
  { title: "Scannez", text: "Un QR code sur les tables, les murs, les piliers\u00a0: on commande d’où l’on est.", screen: { src: shot("phone-scan"), alt: "L’appareil photo du téléphone sur le QR code de L’Étoile, le lien de la carte en dessous" } },
  { title: "Choisissez vos verres", text: "La carte du club, avec ses cocktails, ses bouteilles et leurs options, à jour en direct.", screen: { src: shot("phone-menu"), alt: "La carte de L’Étoile\u00a0: deux cocktails ajoutés, le bouton Commander en bas" } },
  { title: "Choisissez votre bar", text: "Central, Rooftop ou VIP, avec l’attente de chacun, estimée par notre IA. Un bar débordé\u00a0? Les commandes partent vers celui qui sert le plus vite.", soon: barChoice === "soon", screen: { src: shot("phone-bar"), alt: "Où récupérer votre commande\u00a0? Bar Central, très demandé, environ 12 minutes\u00a0; Bar Rooftop, le plus rapide, environ 3 minutes (choisi)\u00a0; Bar VIP, environ 6 minutes" } },
  { title: "Payez", text: "Carte, Apple\u00a0Pay ou Google\u00a0Pay, dans la page, en un geste.", screen: { src: shot("phone-pay"), alt: `Le paiement dans la page\u00a0: deux cocktails, ${euros(exampleTicket)}, paiement accepté` } },
  { title: "Retournez danser", text: "Le ticket sort au bar. Téléphone en poche, le client reçoit une notification dès que c’est prêt.", screen: { src: shot("phone-ticket"), alt: "Le ticket du client\u00a0: numéro 42, en préparation au bar" } },
  { title: "Récupérez", text: "Au point de retrait, le client montre son numéro et repart, sans repasser par la file.", screen: { src: shot("phone-ready"), alt: "C’est prêt\u00a0! Numéro 42, à récupérer au Bar Rooftop" } },
];

/** « Boîtier Omilink » au fil d'une phrase. */
const omilink = `${starterKit.omilink.name[0].toLowerCase()}${starterKit.omilink.name.slice(1)}`;

export const club = {
  filmSeenKey: "ominin-club-film-vu",
  film: {
    wide: "/pitch/club/film.mp4",
    vertical: "/pitch/club/film-vertical.mp4",
    poster: { src: shot("film-poster"), alt: "Commander sans quitter la piste\u00a0: le film" },
    posterVertical: shot("film-poster-vertical"),
    label: "Ominin pour les clubs\u00a0: le film",
  },
  demo: {
    href: demoHref,
    display: demoHref.replace(/^https?:\/\//, ""),
  },
  contact: {
    email: contactEmail,
    mailto: `mailto:${contactEmail}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`,
    label: "Nous écrire",
  },
  soonTag: "Bientôt",

  hero: {
    eyebrow: "Ominin pour les clubs et discothèques",
    title: { first: "Commander", second: "sans quitter la", accent: "piste." },
    lead: "Vos clients scannent un QR code où qu’ils soient dans le club, commandent et paient sur leur téléphone, puis retournent danser. Quand c’est prêt, une notification les prévient\u00a0: ils passent au bar, montrent leur numéro et repartent, sans attendre leur tour.",
    facts: [
      { value: euros(0), label: "d’abonnement, sans engagement" },
      { value: percent(connectCommission.percent), label: "des commandes payées en ligne, rien sur le reste" },
      { value: "+100\u00a0h", label: "rendues chaque mois à votre équipe, pour servir plus de verres" },
    ],
    screen: { src: shot("phone-notif"), alt: "L’écran verrouillé du client\u00a0: la notification « C’est prêt\u00a0! N°\u00a042 », commande à récupérer au Bar Rooftop" },
  },

  problem: {
    eyebrow: "Samedi, 1\u00a0h du matin",
    title: { text: "La file au bar vous coûte", accent: "des verres." },
    lead: "Trois rangs devant le comptoir, des barmen qu’on hèle, des clients qui attendent au lieu de danser. Et le verre qu’on ne commande pas, on ne le rattrape jamais.",
    points: [
      { title: "Le deuxième verre n’arrive jamais", text: "Quand le bar est pris d’assaut, recommander devient une corvée\u00a0: on finit par y renoncer." },
      { title: "Une soirée passée à attendre", text: "Chaque minute au comptoir est une minute hors de la piste. Le client s’en souvient, et pas forcément de la musique." },
      { title: "Une équipe débordée", text: "Prendre la commande, encaisser, rendre la monnaie, se faire héler… Chaque minute à la caisse est une minute sans servir." },
    ],
    study: "Ailleurs, le même mécanisme est documenté\u00a0: dans une étude sur le rayon traiteur d’un hypermarché, plus la file s’allonge, plus les clients renoncent.",
    sources: ["lu"] satisfies ClubSourceId[],
  },

  steps: {
    eyebrow: "Comment ça marche",
    title: { text: "Six gestes, et", accent: "pas de file." },
    lead: "Pas d’application à installer\u00a0: la carte du club s’ouvre dans le navigateur du téléphone.",
    items: stepItems,
    soonNote: "Étape 3, pas encore disponible\u00a0: aujourd’hui, un club a un seul point de retrait, et la démo ne propose pas ce choix. Les écrans 4 à 6 affichent «\u00a0Bar Rooftop\u00a0»\u00a0: chez vous, ce sera votre point de retrait.",
  },

  benefits: {
    eyebrow: "Pour votre club",
    title: { text: "Plus de verres,", accent: "moins de file." },
    items: [
      { title: "Plus de verres par soirée", text: "La commande ne dépend plus de la longueur de la file\u00a0: on recommande depuis la piste, autant de fois qu’on veut." },
      { title: "Un bar qui respire", text: "Les commandes payées en ligne ne passent plus par la caisse. Au comptoir, la file se réduit à ceux qui préfèrent commander à l’ancienne." },
      { title: "Une équipe qui sert", text: "Chaque ticket sort à la bonne imprimante, avec le numéro du client\u00a0: les barmen préparent et remettent, sans encaisser." },
      { title: "Vos soirées en chiffres", text: "Ventes par heure, meilleures ventes, pourboires\u00a0: tout est dans votre espace de gestion, en direct." },
      { title: "Des clients qui reviennent", text: "Une fidélité intégrée\u00a0: des points à chaque commande, une consommation offerte au palier que vous fixez." },
    ],
  },

  proof: {
    eyebrow: "Le temps de votre équipe",
    title: { text: "Des centaines d’heures", accent: "rendues à vos barmen." },
    context: "Chaque commande passée au QR, c’est un passage en caisse de moins. Chaque mois, ce sont des centaines d’heures que votre équipe passe à servir, et plus à encaisser.",
    points: [
      { title: "Plus de prise de commande", text: "Le client choisit seul, sur la carte du club\u00a0: personne à héler, rien à répéter dans le bruit." },
      { title: "Plus d’encaissement", text: "Payé en ligne avant d’arriver au bar\u00a0: ni terminal à tendre, ni monnaie à rendre." },
      { title: "Le ticket sort tout seul", text: "Il s’imprime au bon bar, avec le numéro du client\u00a0: il n’y a plus qu’à préparer." },
    ],
    takeaway: "Ce temps-là, vos barmen le passent à faire des verres.",
    sources: ["report"] satisfies ClubSourceId[],
  },

  demoSection: {
    title: "Commandez comme un client.",
    lead: "La carte de L’Étoile, notre club de démonstration\u00a0: ouvrez-la sur votre téléphone, ajoutez un cocktail, allez jusqu’au paiement. Rien n’est encaissé.",
  },

  faq: {
    eyebrow: "Vos questions",
    title: { text: "Ce qu’on nous", accent: "demande." },
    items: [
      { question: "Et si le client range son téléphone\u00a0?", answer: "Une notification le prévient dès que c’est prêt, même téléphone verrouillé. Au bar, son numéro suffit." },
      { question: "Et si le réseau passe mal dans la salle\u00a0?", answer: "Affichez le Wi-Fi invité à côté des QR codes\u00a0: la carte est une simple page web, sans application à télécharger." },
      { question: "Et l’alcool, et les mineurs\u00a0?", answer: "Rien ne change\u00a0: le barman contrôle l’âge au retrait, comme au comptoir." },
      { question: "Faut-il changer de caisse\u00a0?", answer: `Non. Votre caisse reste en place\u00a0: les tickets sortent sur les imprimantes de vos bars, reliées par le ${omilink} s’il le faut.` },
      { question: "Où va l’argent\u00a0?", answer: "Les paiements arrivent sur le compte Stripe ou Square du club, à son nom." },
      { question: "Et ceux qui préfèrent le comptoir\u00a0?", answer: `Ils commandent comme avant. Espèces et paiements au comptoir\u00a0: ${percent(0)} de commission.` },
    ],
  },

  pricing: {
    eyebrow: "Le prix",
    title: { first: `${euros(0)} par mois.`, accent: `${percent(connectCommission.percent)} des commandes`, rest: "payées en ligne." },
    lead: "Pas d’abonnement, pas d’engagement\u00a0: Ominin se rémunère sur les commandes payées en ligne par carte, et seulement sur elles.",
    items: [
      `Commission dégressive jusqu’à ${percent(offer.commissionPercent.min)} selon votre volume, fixée au devis`,
      `Espèces et paiements au comptoir\u00a0: ${percent(0)} de commission`,
      `QR codes imprimés à votre logo\u00a0: ${euros(starterKit.cachet.price)} l’unité + ${euros(starterKit.shipping.price)} de livraison, une fois`,
      `${starterKit.omilink.name}\u00a0: ${euros(starterKit.omilink.price)}, une fois, s’il faut relier vos imprimantes de bar`,
      "Mise en ligne de votre carte par notre équipe\u00a0: incluse",
    ],
  },

  closing: {
    eyebrow: "Et maintenant",
    title: { text: "Parlons de", accent: "votre club." },
    steps: ["Vous essayez la démo sur votre téléphone.", "Nous mettons votre carte en ligne, à vos couleurs.", "Vos QR codes arrivent\u00a0: vos clients commandent dès le premier soir."],
    scan: "La démo, de votre téléphone",
  },

  sourcesNote: "Le relevé terrain vient d’un client Ominin, anonymisé\u00a0; les prix sont ceux de nos tarifs publics.",
  footer: "Ominin · La commande QR pour les clubs et discothèques",
};

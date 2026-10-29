import { compatibleTills, pricingSection } from "@/lib/landing-data";
import { DEMO_SLUG, formatPrice } from "@/lib/menu/format";
import baiKoCaptures from "@/lib/pitch/bai-ko-captures.json";
import type { screenSizes } from "@/lib/pitch/kit";
import { ETOILE_LIVE_SLUG, getRestaurant } from "@/lib/menu-data";
import { clubSiteUrl, menuSiteUrl } from "@/lib/site";
import { SIGNUP_KINDS, type SignupKind } from "./signup-form";

/*
 * Les decks montrés au gérant pendant la visite, un par type d'établissement
 * (ceux de l'inscription). Le commercial parle, l'écran montre : une idée par
 * diapositive, un titre court, une capture des démos et deux ou trois mots
 * au plus. Le fond est celui du fondateur : « 3 %, oui mais » — moins de
 * charge salariale, des clients qui reviennent, une carte qui ressemble à la
 * maison.
 *
 * La fidélité, la roue du jour et, pour un club, les soirées et leurs tables
 * font partie de l'offre. Les captures viennent des pitchs et de
 * public/pitch/decks, chacune nommée avec la démo d'où elle vient.
 *
 * Typographie : celle de lib/pitch/kit.ts (  avant « : ; ! ? % »).
 */

export interface Shot {
  src: string;
  alt: string;
  /** D'où vient la capture : la démo qu'on voit. */
  caption: string;
  /** L'écran capturé, téléphone par défaut. */
  screen?: keyof typeof screenSizes;
}

export type Slide =
  | { type: "cover"; eyebrow: string; title: string; accent: string; shot: Shot }
  | { type: "shot"; title: string; keywords: string[]; shots: Shot[] }
  | {
      type: "words";
      eyebrow: string;
      /** Le chiffre en tête de la diapositive (la commission). */
      figure?: string;
      title: string;
      keywords: string[];
      /** Les mots se lisent comme des étapes, numérotées. */
      numbered?: boolean;
      note?: string;
    }
  | { type: "demo"; demos: { label: string; hint: string; url: string }[] };

export interface Deck {
  kind: SignupKind;
  label: string;
  slides: Slide[];
}

const [connect] = pricingSection.plans;
const commission = `${connect.commission.percent} %`;

const demoUrl = (slug: string) => `${menuSiteUrl}/demo/${slug}`;
const demoName = (slug: string) => getRestaurant(slug)?.name ?? slug;

const ckl = (name: string) => `/pitch/groupe-ckl/${name}.jpg`;
const deckShot = (name: string) => `/pitch/decks/${name}.webp`;
const shots = {
  laissac: { src: ckl("carte-brasserie-laissac"), alt: "La carte de la Brasserie Laissac sur un téléphone, à ses couleurs", caption: "Brasserie Laissac · démo" },
  cafeDesArts: { src: ckl("carte-cafe-des-arts"), alt: "La carte du Café des Arts : son logo, ses couleurs, ses annonces qui défilent", caption: "Café des Arts · démo" },
  novelty: { src: ckl("carte-le-novelty"), alt: "La carte du Novelty, bar à cocktails : noir et or, son logo, ses horaires", caption: "Le Novelty · démo" },
  victoria: { src: ckl("carte-le-victoria"), alt: "La carte du Victoria sur un téléphone, à son identité", caption: "Le Victoria · démo" },
  mojito: { src: ckl("happy-novelty"), alt: "Un mojito au Novelty : le parfum au choix, le format XXL en option, le prix qui suit", caption: "Le Novelty · démo" },
  choose: { src: ckl("parcours-choisir"), alt: "Un burger choisi sur la carte du Café des Arts : la cuisson au choix", caption: "Café des Arts · démo" },
  payment: { src: ckl("parcours-paiement"), alt: "Le paiement dans la page : 24,50 €, payer par carte en un geste", caption: "Café des Arts · démo" },
  tableTicket: { src: ckl("parcours-suivi"), alt: "Le ticket de la table 12 : commande reçue, réglée, suivie jusqu’au service", caption: "Café des Arts · démo" },
  served: { src: ckl("parcours-servi"), alt: "« Bon appétit ! » : la commande de la table 12 est servie", caption: "Café des Arts · démo" },
  room: { src: ckl("salle-victoria"), alt: "L’espace de gestion du Victoria : chaque table, ce qu’elle a commandé, ce qui reste à servir", caption: "Le Victoria · gestion", screen: "tablet" },
  baiKo: { src: `/pitch/bai-ko/${baiKoCaptures["phone-menu"]}`, alt: "La carte de Baï-Ko : les bibimbaps en photo, les allergènes, le bouton Choisir", caption: "Baï-Ko · démo" },
  bigSmashMenu: { src: "/pitch/big-smash/phone-menu.webp", alt: "La carte de Big Smash sur un téléphone, rouge et blanc, à ses couleurs", caption: "Big Smash · démo" },
  bigSmashComposer: { src: "/pitch/big-smash/phone-composer.webp", alt: "Le menu composé par le client : accompagnement, boisson, sauces", caption: "Big Smash · démo" },
  bigSmashOrder: { src: "/pitch/big-smash/phone-commande.webp", alt: "La commande : payer en ligne ou au comptoir", caption: "Big Smash · démo" },
  bigSmashEta: { src: "/pitch/big-smash/phone-suivi.webp", alt: "Le numéro 39 en cuisine : prête dans environ 6 minutes, l’heure estimée par l’IA", caption: "Big Smash · démo" },
  bigSmashReady: { src: "/pitch/big-smash/phone-prete.webp", alt: "Le numéro 39, réglé : « C’est prêt ! Venez chercher votre commande au comptoir. »", caption: "Big Smash · démo" },
  counter: { src: "/pitch/big-smash/comptoir-service.webp", alt: "L’écran du comptoir : les commandes du coup de feu, les boutons Marquer prête et Remettre", caption: "Big Smash · comptoir", screen: "tablet" },
  crousti: { src: "/pitch/o-crousti-poulet/phone-menu.webp", alt: "La carte d’O’Crousti Poulet, à son identité", caption: "O’Crousti Poulet · démo" },
  croustiReady: { src: "/pitch/o-crousti-poulet/phone-prete.webp", alt: "Le ticket du client, prêt : il vient le chercher au comptoir", caption: "O’Crousti Poulet · démo" },
  clubScan: { src: "/pitch/club/phone-scan.webp", alt: "Le QR code de L’Étoile, scanné par un téléphone dans le club", caption: "L’Étoile · démo" },
  clubMenu: { src: "/pitch/club/phone-menu.webp", alt: "La carte de L’Étoile : deux cocktails ajoutés, le bouton Commander en bas", caption: "L’Étoile · démo" },
  clubPay: { src: "/pitch/club/phone-pay.webp", alt: "Deux cocktails, 27 €, paiement accepté dans la page", caption: "L’Étoile · démo" },
  clubTicket: { src: "/pitch/club/phone-ticket.webp", alt: "Le numéro 42, au bar : « On s’en occupe. »", caption: "L’Étoile · démo" },
  clubReady: { src: "/pitch/club/phone-ready.webp", alt: "« C’est prêt ! » : le numéro 42 à récupérer au bar", caption: "L’Étoile · démo" },
  clubNight: { src: deckShot("phone-soiree"), alt: "La page de la soirée Orbite à L’Étoile : la date, l’ambiance, le bouton Choisir ma table", caption: "L’Étoile · soirées" },
  clubTables: { src: deckShot("phone-tables"), alt: "Choisissez votre table : le bar, le rooftop, le salon VIP, chacun avec son prix et ses bouteilles", caption: "L’Étoile · soirées" },
  loyaltyCard: { src: deckShot("phone-fidelite"), alt: "Ma carte, à la Brasserie Laissac : 87 points, le prochain palier, les récompenses", caption: "Brasserie Laissac · démo" },
  wheel: { src: deckShot("phone-roue"), alt: "La roue du jour de la Brasserie Laissac : deux jours d’affilée, lancer la roue", caption: "Brasserie Laissac · démo" },
  happyHour: { src: deckShot("phone-happy-hour"), alt: "La carte du Caffè Panis, la pastille « Happy hour jusqu’à 22 h » en bas de l’écran", caption: "Caffè Panis · démo" },
  bakery: { src: deckShot("phone-boulangerie"), alt: "La carte de la Boulangerie Cyprien : son nom, ses gâteaux à partager", caption: "Boulangerie Cyprien · démo" },
} satisfies Record<string, Shot>;

// ——— Ce que tous les decks partagent ————————————————————————————————

const yesBut: Slide = {
  type: "words",
  eyebrow: "Pourquoi ça vaut le coup",
  figure: commission,
  title: "Oui, mais :",
  keywords: ["Moins de charge salariale", "Des clients qui reviennent", "Une expérience qui vous ressemble"],
};

const offer: Slide = {
  type: "words",
  eyebrow: "L’offre",
  figure: commission,
  title: connect.commission.basis,
  keywords: [
    connect.price ? `${formatPrice(connect.price)}${pricingSection.perMonth}` : "Pas d’abonnement",
    "Rien à payer à l’inscription",
    "Le matériel offert",
  ],
  note: pricingSection.cardFeesNote,
};

const till: Slide = {
  type: "words",
  eyebrow: "En cuisine et en caisse",
  title: "La commande arrive toute seule.",
  keywords: [`Plus de ${compatibleTills} caisses, par HubRise`, "Vos imprimantes tickets", "L’argent sur votre compte, par Stripe"],
};

const loyalty: Slide = {
  type: "shot",
  title: "Une raison de revenir.",
  keywords: ["Des points", "La roue du jour"],
  shots: [shots.loyaltyCard, shots.wheel],
};

const pickupTime = (title: string, ready: Shot): Slide => ({
  type: "shot",
  title,
  keywords: ["L’heure estimée par l’IA", "« C’est prêt ! »"],
  shots: [shots.bigSmashEta, ready],
});

const closing: Slide = {
  type: "words",
  eyebrow: "Et maintenant",
  title: "On s’en occupe ensemble.",
  numbered: true,
  keywords: ["Votre inscription, ici", "Votre carte, par notre équipe", "Vos QR codes arrivent"],
};

// ——— Un deck par type ————————————————————————————————————————————

const decks: Record<SignupKind, Omit<Deck, "kind" | "label">> = {
  restaurant: {
    slides: [
      { type: "cover", eyebrow: "Ominin Menu · Restaurants", title: "Vos tables", accent: "prennent les commandes.", shot: shots.laissac },
      { type: "shot", title: "Scanner, choisir, payer.", keywords: ["Sans application", "Pourboire en option"], shots: [shots.choose, shots.payment] },
      yesBut,
      offer,
      { type: "shot", title: "La salle sert, c’est tout.", keywords: ["Plus de prise de commande", "Appel serveur", "Badgeuse"], shots: [shots.served] },
      loyalty,
      { type: "shot", title: "Votre carte, pas une autre.", keywords: ["Vos couleurs", "Vos photos", "Vos formules"], shots: [shots.baiKo] },
      pickupTime("À emporter, l’heure annoncée.", shots.bigSmashReady),
      { type: "shot", title: "Votre service, en direct.", keywords: ["Les tables", "Les additions", "Vos chiffres"], shots: [shots.room] },
      till,
      {
        type: "demo",
        demos: [
          { label: demoName("brasserie-laissac"), hint: "Une brasserie, avec sa fidélité et sa roue du jour", url: demoUrl("brasserie-laissac") },
          { label: demoName(DEMO_SLUG), hint: "Le parcours à table, de la carte au paiement", url: `${menuSiteUrl}/m/${DEMO_SLUG}` },
        ],
      },
      closing,
    ],
  },

  bar: {
    slides: [
      { type: "cover", eyebrow: "Ominin Menu · Bars", title: "Vos clients commandent", accent: "sans attendre au comptoir.", shot: shots.novelty },
      { type: "shot", title: "La tournée, depuis la table.", keywords: ["Sans application", "Payée en ligne"], shots: [shots.mojito, shots.payment] },
      yesBut,
      offer,
      pickupTime("Au bar, l’heure annoncée.", shots.clubReady),
      { type: "shot", title: "La happy hour, toute seule.", keywords: ["Aux heures choisies", "Au bon prix"], shots: [shots.happyHour] },
      loyalty,
      { type: "shot", title: "Votre carte, votre ambiance.", keywords: ["Vos couleurs", "Vos cocktails", "Vos formats"], shots: [shots.victoria] },
      till,
      {
        type: "demo",
        demos: [
          { label: demoName("le-novelty"), hint: "Un bar à cocktails, avec sa fidélité et sa roue du jour", url: demoUrl("le-novelty") },
          { label: demoName("caffe-panis"), hint: "La happy hour annoncée sur la carte", url: demoUrl("caffe-panis") },
        ],
      },
      closing,
    ],
  },

  club: {
    slides: [
      { type: "cover", eyebrow: "Ominin Menu · Clubs", title: "Commander", accent: "sans quitter la piste.", shot: shots.clubMenu },
      { type: "shot", title: "Scanner, payer, récupérer.", keywords: ["Sans application", "Payé d’avance"], shots: [shots.clubScan, shots.clubPay] },
      yesBut,
      offer,
      { type: "shot", title: "Le bar sert, il n’encaisse plus.", keywords: ["Un numéro", "Retrait au bar"], shots: [shots.clubTicket, shots.clubReady] },
      { type: "shot", title: "Vos tables, vendues avant la soirée.", keywords: ["Soirées et zones", "Acompte ou partage", "Liste d’invités"], shots: [shots.clubNight, shots.clubTables] },
      loyalty,
      till,
      {
        type: "demo",
        demos: [
          { label: demoName("l-etoile"), hint: "Notre club de démonstration : commandez un cocktail jusqu’au paiement", url: `${menuSiteUrl}/demo/club` },
          { label: `${demoName("l-etoile")} · soirées`, hint: "Choisir sa soirée et sa table", url: `${clubSiteUrl}/${ETOILE_LIVE_SLUG}` },
        ],
      },
      closing,
    ],
  },

  fast_food: {
    slides: [
      { type: "cover", eyebrow: "Ominin Menu · Fast-food", title: "Au comptoir,", accent: "la file disparaît.", shot: shots.bigSmashMenu },
      { type: "shot", title: "Commander depuis la file.", keywords: ["Sans application", "En ligne ou au comptoir"], shots: [shots.bigSmashComposer, shots.bigSmashOrder] },
      yesBut,
      offer,
      pickupTime("L’heure de retrait, annoncée.", shots.bigSmashReady),
      { type: "shot", title: "Prête ? Un appui.", keywords: ["Marquer prête", "Remettre"], shots: [shots.counter] },
      loyalty,
      { type: "shot", title: "Votre marque, pas une borne.", keywords: ["Vos couleurs", "Menus et options", "Rupture en un geste"], shots: [shots.crousti] },
      till,
      {
        type: "demo",
        demos: [
          { label: demoName("big-smash"), hint: "Commandez comme un client, jusqu’à « C’est prêt ! »", url: demoUrl("big-smash") },
          { label: demoName("o-crousti-poulet"), hint: "Une autre maison, une autre identité", url: demoUrl("o-crousti-poulet") },
        ],
      },
      closing,
    ],
  },

  cafe: {
    slides: [
      { type: "cover", eyebrow: "Ominin Menu · Cafés", title: "Vos habitués", accent: "reviennent tous les jours.", shot: shots.cafeDesArts },
      { type: "shot", title: "Commandé et payé depuis la table.", keywords: ["Sans application", "Pourboire en option"], shots: [shots.choose, shots.payment] },
      yesBut,
      offer,
      loyalty,
      { type: "shot", title: "Petit déjeuner, aperitivo.", keywords: ["Aux heures choisies", "Au bon prix"], shots: [shots.happyHour] },
      { type: "shot", title: "La terrasse se commande seule.", keywords: ["Appel serveur", "Badgeuse"], shots: [shots.served] },
      pickupTime("Un café à emporter ? L’heure annoncée.", shots.bigSmashReady),
      { type: "shot", title: "Votre café, pas un autre.", keywords: ["Vos couleurs", "Une carte à jour"], shots: [shots.victoria] },
      till,
      {
        type: "demo",
        demos: [
          { label: demoName("caffe-panis"), hint: "Un café avec sa fidélité, sa roue du jour et sa happy hour", url: demoUrl("caffe-panis") },
          { label: demoName("cafe-des-arts"), hint: "Un café-brasserie, de la carte au paiement", url: demoUrl("cafe-des-arts") },
        ],
      },
      closing,
    ],
  },

  boulangerie: {
    slides: [
      { type: "cover", eyebrow: "Ominin Menu · Boulangeries", title: "La file du matin,", accent: "plus fluide.", shot: shots.bakery },
      { type: "shot", title: "Commandé avant le comptoir.", keywords: ["Sans application", "En ligne ou au comptoir"], shots: [shots.bigSmashOrder] },
      yesBut,
      offer,
      pickupTime("L’heure de retrait, annoncée.", shots.croustiReady),
      loyalty,
      { type: "shot", title: "Vos formules, à leur heure.", keywords: ["Petit déjeuner", "Midi"], shots: [shots.happyHour] },
      till,
      {
        type: "demo",
        demos: [
          { label: demoName("boulangerie-cyprien"), hint: "La carte d’une boulangerie, à son identité", url: demoUrl("boulangerie-cyprien") },
          { label: demoName("big-smash"), hint: "La commande au comptoir, jusqu’à « C’est prêt ! »", url: demoUrl("big-smash") },
        ],
      },
      closing,
    ],
  },
};

export const DECKS: Deck[] = SIGNUP_KINDS.map(({ id, label }) => ({ kind: id, label, ...decks[id] }));

export const deckFor = (kind: string) => DECKS.find((deck) => deck.kind === kind);

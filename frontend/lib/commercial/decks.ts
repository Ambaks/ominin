import { compatibleTills, pricingSection } from "@/lib/landing-data";
import { DEMO_SLUG, formatPrice } from "@/lib/menu/format";
import baiKoCaptures from "@/lib/pitch/bai-ko-captures.json";
import { getRestaurant } from "@/lib/menu-data";
import { menuSiteUrl } from "@/lib/site";
import { SIGNUP_KINDS, type SignupKind } from "./signup-form";

/*
 * Les decks montrés au gérant pendant la visite, un par type d'établissement
 * (ceux de l'inscription). Le fond est celui du fondateur : « 3 %, oui
 * mais » — moins de charge salariale, des clients qui reviennent, une carte
 * qui ressemble à la maison —, chaque fois avec ce qui sert vraiment à ce
 * type de maison.
 *
 * Rien n'est promis qui ne soit dans le produit : la fidélité et la roue du
 * jour s'ouvrent à la demande (constants.ts, capacité « fidelite » hors
 * offre), Ominin Club aussi ; l'heure annoncée par l'IA n'existe encore qu'en
 * aperçu (lib/menu/tickets.tsx) et n'est pas citée. Les captures sont celles
 * des pitchs, chacune nommée avec la démo d'où elle vient.
 *
 * Typographie : celle de lib/pitch/kit.ts (  avant « : ; ! ? % »).
 */

export interface Shot {
  src: string;
  alt: string;
  /** D'où vient la capture : la démo qu'on voit. */
  caption: string;
}

export interface Point {
  title: string;
  text: string;
}

export type Slide =
  | { type: "cover"; eyebrow: string; title: string; accent: string; lead: string; shot?: Shot }
  | {
      type: "points";
      eyebrow: string;
      title: string;
      /** Le chiffre en tête de la diapositive (la commission). */
      figure?: string;
      points: Point[];
      /** Les points se lisent comme des étapes, numérotées. */
      numbered?: boolean;
      shot?: Shot;
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
const shots = {
  laissac: { src: ckl("carte-brasserie-laissac"), alt: "La carte de la Brasserie Laissac sur un téléphone, à ses couleurs", caption: "Brasserie Laissac · démo" },
  cafeDesArts: { src: ckl("carte-cafe-des-arts"), alt: "La carte du Café des Arts : son logo, ses couleurs, ses annonces qui défilent", caption: "Café des Arts · démo" },
  novelty: { src: ckl("carte-le-novelty"), alt: "La carte du Novelty, bar à cocktails : noir et or, son logo, ses horaires", caption: "Le Novelty · démo" },
  victoria: { src: ckl("carte-le-victoria"), alt: "La carte du Victoria sur un téléphone, à son identité", caption: "Le Victoria · démo" },
  mojito: { src: ckl("happy-novelty"), alt: "Un mojito au Novelty : le parfum au choix, le format XXL en option, le prix qui suit", caption: "Le Novelty · démo" },
  payment: { src: ckl("parcours-paiement"), alt: "Le paiement dans la page : 24,50 €, payer par carte en un geste", caption: "Café des Arts · démo" },
  tableTicket: { src: ckl("parcours-suivi"), alt: "Le ticket de la table 12 : commande reçue, réglée, suivie jusqu’au service", caption: "Café des Arts · démo" },
  baiKo: { src: `/pitch/bai-ko/${baiKoCaptures["phone-menu"]}`, alt: "La carte de Baï-Ko : les bibimbaps en photo, les allergènes, le bouton Choisir", caption: "Baï-Ko · démo" },
  bigSmashMenu: { src: "/pitch/big-smash/phone-menu.webp", alt: "La carte de Big Smash sur un téléphone, rouge et blanc, à ses couleurs", caption: "Big Smash · démo" },
  bigSmashReady: { src: "/pitch/big-smash/phone-prete.webp", alt: "Le numéro 39, réglé : « C’est prêt ! Venez chercher votre commande au comptoir. »", caption: "Big Smash · démo" },
  crousti: { src: "/pitch/o-crousti-poulet/phone-menu.webp", alt: "La carte d’O’Crousti Poulet, à son identité", caption: "O’Crousti Poulet · démo" },
  croustiReady: { src: "/pitch/o-crousti-poulet/phone-prete.webp", alt: "Le ticket du client, prêt : il vient le chercher au comptoir", caption: "O’Crousti Poulet · démo" },
  clubMenu: { src: "/pitch/club/phone-menu.webp", alt: "La carte de L’Étoile : deux cocktails ajoutés, le bouton Commander en bas", caption: "L’Étoile, club de démonstration" },
  clubPay: { src: "/pitch/club/phone-pay.webp", alt: "Deux cocktails, 27 €, paiement accepté dans la page", caption: "L’Étoile, club de démonstration" },
} satisfies Record<string, Shot>;

// ——— Ce que tous les decks partagent ————————————————————————————————

const howItWorks = (place: string, counter: boolean): Slide => ({
  type: "points",
  eyebrow: "Comment ça marche",
  title: "Du QR code à votre compte en banque.",
  numbered: true,
  points: [
    counter
      ? { title: `Le client scanne le QR ${place}`, text: "Rien à installer : la carte s’ouvre dans le navigateur de son téléphone." }
      : { title: `Le client scanne le QR ${place}`, text: "Un QR code à votre logo sur chaque table. Rien à installer : la carte s’ouvre dans son navigateur." },
    { title: "Il commande et paie en ligne", text: "Par carte, avec un pourboire s’il le veut. Celui qui préfère payer au comptoir le peut toujours." },
    {
      title: "La commande arrive en cuisine et en caisse",
      text: `Directement dans votre caisse par HubRise (plus de ${compatibleTills} caisses compatibles), et sur vos imprimantes tickets avec le boîtier Omilink s’il le faut.`,
    },
    { title: "L’argent arrive sur votre compte", text: "Les paiements passent par Stripe, sur un compte à votre nom, puis sur votre compte bancaire." },
  ],
});

const offer: Slide = {
  type: "points",
  eyebrow: "L’offre",
  figure: commission,
  title: connect.commission.basis,
  points: [
    {
      title: connect.price ? `${formatPrice(connect.price)}${pricingSection.perMonth}` : "Pas d’abonnement",
      text: "Ni frais fixes ni engagement : Ominin ne gagne que sur ce que vous encaissez en ligne.",
    },
    { title: "Rien à payer à l’inscription", text: "On crée votre espace ensemble, maintenant, sans rien régler." },
    { title: "Le matériel offert", text: "Inscrit avec moi, votre commande de démarrage (vos QR codes à votre logo, la livraison) est offerte par Ominin." },
    { title: "Le comptoir ne change pas", text: "Ce qui se paie au comptoir, en espèces ou par carte, ne vous coûte rien de plus." },
  ],
  note: pricingSection.cardFeesNote,
};

const yesBut = (staff: string, loyalty: string, experience: string): Slide => ({
  type: "points",
  eyebrow: "Pourquoi ça vaut le coup",
  figure: commission,
  title: "Oui, mais :",
  points: [
    { title: "Moins de charge salariale", text: staff },
    { title: "Des clients qui reviennent", text: loyalty },
    { title: "Une expérience qui vous ressemble", text: experience },
  ],
});

const badgeuse: Point = {
  title: "La badgeuse dans votre espace",
  text: "Chacun badge à l’arrivée et au départ, avec sa signature. Vous posez le planning ; chaque employé reçoit le lien de ses horaires.",
};

const loyaltyPoints: Point = {
  title: "Des points à chaque commande",
  text: "Vous fixez combien rapporte chaque euro et ce qu’offre chaque palier. Le client retrouve sa carte sur son téléphone, sans application.",
};

const wheel: Point = {
  title: "La roue du jour",
  text: "Après une commande réglée, le client tourne la roue une fois par jour pour gagner des points. Plus il revient de jours d’affilée, plus sa série monte.",
};

const happyHour: Point = {
  title: "La happy hour automatique",
  text: "Des prix qui changent aux jours et aux heures que vous choisissez : la carte l’annonce, et la commande est facturée au bon prix.",
};

const ownMenu: Point = {
  title: "Pas un menu générique",
  text: "Notre équipe crée votre carte à partir de la vôtre : vos couleurs, votre logo, vos photos. Vos clients savent qu’ils sont chez vous.",
};

const liveMenu: Point = {
  title: "Une carte toujours à jour",
  text: "Un prix, un produit épuisé, une nouveauté : vous le changez depuis votre téléphone, et c’est fait sur toutes les tables.",
};

const onRequest = "La fidélité et la roue du jour s’ouvrent sur demande à Ominin.";

const closing: Slide = {
  type: "points",
  eyebrow: "Et maintenant",
  title: "On s’en occupe ensemble, maintenant.",
  numbered: true,
  points: [
    { title: "Votre inscription, ici, avec moi", text: "Votre espace, vos coordonnées, quelques photos de votre carte." },
    { title: "Vos paiements et votre caisse", text: "Vous reliez Stripe pour recevoir l’argent, et votre caisse par HubRise si vous en avez une, maintenant ou plus tard." },
    { title: "Votre carte, par notre équipe", text: "Nous la mettons en ligne à vos couleurs, vous la relisez." },
    { title: "Vos QR codes arrivent", text: "Vos clients commandent dès le premier service." },
  ],
};

// ——— Un deck par type ————————————————————————————————————————————

const decks: Record<SignupKind, Omit<Deck, "kind" | "label">> = {
  restaurant: {
    slides: [
      {
        type: "cover",
        eyebrow: "Ominin Menu · Restaurants",
        title: "Vos tables",
        accent: "prennent les commandes.",
        lead: "Vos clients scannent, commandent et paient à table. Votre équipe sert, votre cuisine cuisine.",
        shot: shots.laissac,
      },
      howItWorks("de sa table", false),
      offer,
      yesBut(
        "Le client commande et paie seul : en salle, des runners qui apportent les plats ; en cuisine, vos cuisiniers.",
        "Points de fidélité, roue du jour, happy hour : vos clients ont une raison de revenir.",
        "Une carte à vos couleurs, pas un menu générique qui ressemble à tous les autres."
      ),
      {
        type: "points",
        eyebrow: "Moins de charge salariale",
        title: "La salle sert, le téléphone du client fait le reste.",
        points: [
          { title: "Plus de prise de commande", text: "Le client choisit seul, avec les options et les commentaires : rien à noter, rien à répéter." },
          { title: "Plus d’encaissement à table", text: "Payé en ligne, pourboire compris : ni terminal à apporter, ni addition à attendre." },
          { title: "Appeler un serveur", text: "Un bouton de la carte sonne sur les téléphones de l’équipe quand une table a besoin de quelqu’un." },
          badgeuse,
        ],
        shot: shots.payment,
      },
      {
        type: "points",
        eyebrow: "Des clients qui reviennent",
        title: "Une raison de revenir, à chaque commande.",
        points: [loyaltyPoints, wheel, happyHour],
        note: onRequest,
      },
      {
        type: "points",
        eyebrow: "Une expérience qui vous ressemble",
        title: "Vos clients sentent qu’ils sont chez vous.",
        points: [
          ownMenu,
          { title: "Vos formules et vos suggestions", text: "Menus à étapes, formules du midi aux jours et aux heures que vous voulez ; au panier, les accompagnements qui vont avec." },
          { title: "Le client suit sa commande", text: "Reçue, en préparation, servie : il la voit avancer depuis sa table." },
        ],
        shot: shots.baiKo,
      },
      {
        type: "points",
        eyebrow: "Votre espace de gestion",
        title: "Votre service, en direct.",
        points: [
          { title: "Les tables et leurs additions", text: "Chaque table, ce qu’elle a commandé, ce qui reste à encaisser." },
          { title: "Vos chiffres", text: "Chiffre d’affaires, panier moyen, meilleures ventes, heures de pointe, pourboires." },
          liveMenu,
        ],
        shot: shots.tableTicket,
      },
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
      {
        type: "cover",
        eyebrow: "Ominin Menu · Bars",
        title: "Vos clients commandent",
        accent: "sans attendre au comptoir.",
        lead: "Un QR code sur les tables ou au bar : ils commandent, paient, et votre équipe n’a plus qu’à servir.",
        shot: shots.novelty,
      },
      howItWorks("de sa table ou du bar", false),
      offer,
      yesBut(
        "Plus personne ne court prendre les commandes ni encaisser : vos barmen préparent, vos runners servent.",
        "Happy hour, points de fidélité, roue du jour : vos clients ont envie de revenir.",
        "Votre carte à votre image, pas un menu générique qui ressemble à tout le monde."
      ),
      {
        type: "points",
        eyebrow: "Moins de charge salariale",
        title: "Vos barmen font des verres, pas de la caisse.",
        points: [
          { title: "Commande et paiement en ligne", text: "Le client commande sa tournée et paie depuis sa place : plus de terminal à tendre, plus de monnaie à rendre." },
          { title: "Ou à retirer au bar", text: "Commande prête, le client vient au bar montrer le code de son ticket ; l’équipe le scanne et lui remet." },
          badgeuse,
        ],
        shot: shots.payment,
      },
      {
        type: "points",
        eyebrow: "Des clients qui reviennent",
        title: "La happy hour, sans rien changer à la main.",
        points: [
          { ...happyHour, text: `${happyHour.text} Elle peut ne viser qu’un format : la pinte, pas le pichet.` },
          loyaltyPoints,
          wheel,
        ],
        note: onRequest,
      },
      {
        type: "points",
        eyebrow: "Une expérience qui vous ressemble",
        title: "Votre carte, vos cocktails, votre ambiance.",
        points: [
          ownMenu,
          { title: "Options et formats", text: "Le parfum, le format XXL, le verre ou la bouteille : chaque supplément au bon prix, sans erreur de commande." },
          liveMenu,
        ],
        shot: shots.mojito,
      },
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
      {
        type: "cover",
        eyebrow: "Ominin Menu · Clubs",
        title: "Commander",
        accent: "sans quitter la piste.",
        lead: "Vos clients scannent un QR code dans le club, commandent et paient sur leur téléphone, puis passent au bar récupérer leur verre.",
        shot: shots.clubMenu,
      },
      howItWorks("du club, sur une table ou un mur", true),
      offer,
      yesBut(
        "Payé en ligne avant d’arriver au bar : vos barmen préparent et remettent, sans encaisser.",
        "Points de fidélité et roue du jour : vos clients reviennent le week-end suivant.",
        "La carte de votre club, à son image, pas un menu générique."
      ),
      {
        type: "points",
        eyebrow: "Moins de charge salariale",
        title: "Le bar sert, il n’encaisse plus.",
        points: [
          { title: "Payé avant d’arriver au bar", text: "Ni terminal à tendre ni monnaie à rendre dans le bruit : la commande est réglée." },
          { title: "Retrait au bar, avec un code", text: "Commande prête, le client montre le code de son ticket ; l’équipe le scanne et lui remet son verre." },
          { title: "Le ticket sort tout seul", text: "Sur l’imprimante du bar, avec le numéro du client : il n’y a plus qu’à préparer." },
          badgeuse,
        ],
        shot: shots.clubPay,
      },
      {
        type: "points",
        eyebrow: "Tables et bouteilles",
        title: "Vendez vos tables en ligne, avant la soirée.",
        points: [
          { title: "Vos soirées en ligne", text: "Chaque soirée a sa page : vos zones, leur prix et ce qu’elles comprennent, réservées et payées d’avance." },
          { title: "Payer la table, un acompte, ou chacun sa part", text: "Le client règle tout, un acompte, ou partage la table avec ses amis par un lien." },
          { title: "La porte, en direct", text: "Le plan du soir et la liste d’invités, à jour pendant la soirée." },
        ],
        note: "Ominin Club s’ouvre sur demande pour un club ; ses conditions se voient avec l’équipe Ominin.",
      },
      {
        type: "points",
        eyebrow: "Des clients qui reviennent",
        title: "Une raison de revenir le week-end suivant.",
        points: [loyaltyPoints, wheel, happyHour],
        note: onRequest,
      },
      {
        type: "demo",
        demos: [{ label: demoName("l-etoile"), hint: "Notre club de démonstration : commandez un cocktail jusqu’au paiement", url: `${menuSiteUrl}/demo/club` }],
      },
      closing,
    ],
  },

  fast_food: {
    slides: [
      {
        type: "cover",
        eyebrow: "Ominin Menu · Fast-food",
        title: "Au comptoir,",
        accent: "la file disparaît.",
        lead: "Un QR code au comptoir ou sur les tables : le client commande, paie, et suit sa commande jusqu’à « C’est prêt ! ».",
        shot: shots.bigSmashMenu,
      },
      howItWorks("du comptoir ou de la table", true),
      offer,
      yesBut(
        "Plus de file à la caisse : le client commande et paie seul, vos équipiers cuisinent et remettent.",
        "Points de fidélité, roue du jour, happy hour : vos habitués reviennent plus souvent.",
        "Votre carte à votre marque, pas une borne qui ressemble à toutes les autres."
      ),
      {
        type: "points",
        eyebrow: "Moins de charge salariale",
        title: "Personne bloqué en caisse au coup de feu.",
        points: [
          { title: "Le client commande seul", text: "Depuis la file, la table ou le trottoir : il ne passe plus par la caisse." },
          { title: "Un numéro du jour", text: "Le même sur son téléphone et sur le ticket cuisine, remis à zéro chaque jour." },
          { title: "« C’est prêt ! » sur son téléphone", text: "Il suit sa commande en direct ; prête, sa page le lui dit : il vient la chercher, sans qu’on l’appelle." },
          badgeuse,
        ],
        shot: shots.bigSmashReady,
      },
      {
        type: "points",
        eyebrow: "Des clients qui reviennent",
        title: "Vos habitués, plus souvent.",
        points: [loyaltyPoints, wheel, { ...happyHour, title: "Vos offres aux heures creuses", text: `${happyHour.text} Une formule du midi, un prix de l’après-midi : elles n’existent que pendant leur créneau.` }],
        note: onRequest,
      },
      {
        type: "points",
        eyebrow: "Une expérience qui vous ressemble",
        title: "Votre marque, jusque dans le téléphone.",
        points: [
          ownMenu,
          { title: "Menus et options", text: "Le menu, la boisson, la sauce, sans tomate : tout se choisit, tout arrive juste en cuisine." },
          { ...liveMenu, title: "Une rupture ? Un geste", text: "Le produit épuisé disparaît de la carte, et revient quand vous le remettez." },
        ],
        shot: shots.crousti,
      },
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
      {
        type: "cover",
        eyebrow: "Ominin Menu · Cafés",
        title: "Vos habitués",
        accent: "reviennent tous les jours.",
        lead: "Ils commandent et paient depuis leur table, cumulent des points à chaque café, et tournent la roue du jour.",
        shot: shots.cafeDesArts,
      },
      howItWorks("de sa table", false),
      offer,
      yesBut(
        "Le client commande et paie seul : votre équipe prépare et sert, en terrasse comme en salle.",
        "Points de fidélité, roue du jour, happy hour : le café de tous les jours, c’est le vôtre.",
        "Une carte à l’image de votre café, pas un menu générique."
      ),
      {
        type: "points",
        eyebrow: "Des clients qui reviennent",
        title: "La fidélité, au quotidien.",
        points: [
          loyaltyPoints,
          wheel,
          { ...happyHour, title: "Petit déjeuner, aperitivo", text: "Une formule de 9 h à 10 h 30, une happy hour en fin de journée : elles s’affichent pendant leur créneau, au bon prix." },
        ],
        note: onRequest,
      },
      {
        type: "points",
        eyebrow: "Moins de charge salariale",
        title: "La terrasse se commande toute seule.",
        points: [
          { title: "Plus d’allers-retours en terrasse", text: "Commande et paiement depuis la table : votre équipe ne se déplace que pour servir." },
          { title: "Appeler un serveur", text: "Un bouton de la carte sonne sur les téléphones de l’équipe quand une table a besoin de quelqu’un." },
          badgeuse,
        ],
        shot: shots.payment,
      },
      {
        type: "points",
        eyebrow: "Une expérience qui vous ressemble",
        title: "Vos clients sentent qu’ils sont chez vous.",
        points: [ownMenu, liveMenu],
        shot: shots.victoria,
      },
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
      {
        type: "cover",
        eyebrow: "Ominin Menu · Boulangeries",
        title: "La file du matin,",
        accent: "plus fluide.",
        lead: "Un QR code au comptoir : le client commande et paie sur son téléphone, puis vient chercher sa commande quand elle est prête.",
      },
      howItWorks("du comptoir", true),
      offer,
      yesBut(
        "Le client commande et paie seul : au comptoir, on prépare et on remet, la caisse respire.",
        "Points de fidélité, roue du jour, formules du matin : votre baguette de tous les jours, c’est chez vous.",
        "Une carte à l’image de votre boutique, pas un menu générique."
      ),
      {
        type: "points",
        eyebrow: "Des clients qui reviennent",
        title: "La fidélité, tous les jours.",
        points: [
          loyaltyPoints,
          wheel,
          { ...happyHour, title: "Vos formules à heures", text: "La formule petit déjeuner le matin, celle du midi à midi : chacune s’affiche pendant son créneau, au bon prix." },
        ],
        note: onRequest,
      },
      {
        type: "points",
        eyebrow: "Moins de charge salariale",
        title: "Moins de monde bloqué en caisse.",
        points: [
          { title: "Un numéro du jour", text: "Le même sur son téléphone et sur le ticket, remis à zéro chaque jour." },
          { title: "« C’est prêt ! » sur son téléphone", text: "Il suit sa commande en direct ; prête, sa page le lui dit : il vient la chercher." },
          badgeuse,
        ],
        shot: shots.croustiReady,
      },
      {
        type: "points",
        eyebrow: "Une expérience qui vous ressemble",
        title: "Votre boutique, jusque dans le téléphone.",
        points: [ownMenu, { ...liveMenu, title: "Plus de baguettes ? Un geste", text: "Le produit épuisé disparaît de la carte, et revient quand vous le remettez." }],
        shot: shots.baiKo,
      },
      {
        type: "demo",
        demos: [
          { label: demoName("caffe-panis"), hint: "La fidélité, la roue du jour et les offres à heures", url: demoUrl("caffe-panis") },
          { label: demoName("big-smash"), hint: "La commande au comptoir, jusqu’à « C’est prêt ! »", url: demoUrl("big-smash") },
        ],
      },
      closing,
    ],
  },
};

export const DECKS: Deck[] = SIGNUP_KINDS.map(({ id, label }) => ({ kind: id, label, ...decks[id] }));

export const deckFor = (kind: string) => DECKS.find((deck) => deck.kind === kind);

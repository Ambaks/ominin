import type { Cta, FaqItem, NavLink, Step } from "@/lib/landing-data";
import type { LeadFormCopy } from "@/components/landing/lead-form";
import type { StoryStep } from "@/components/landing-kit/scroll-story";
import { shopSiteUrl } from "@/lib/site";

/*
 * Copy de la landing Ominin Shop (shop.ominin.com). Comme les autres
 * landings, aucun texte dans les composants : tout vit ici.
 *
 * Positionnement : la boutique en ligne clé en main de celles et ceux qui
 * vendent déjà — en story, en messages privés, en main propre — du fait main,
 * des box, ou le catalogue d'un fournisseur (dropshipping). La page est
 * promue par la gérante de MyBox auprès de sa communauté : elle doit
 * convertir un trafic venu des réseaux, sur téléphone, et recevoir les
 * questions sur place (formulaire en bas de page, vers /api/contact).
 * MyBox (box beauté) est la première boutique en production et sert
 * d'étude de cas : les box, prix et livraisons citées sont les siennes
 * (scripts/seed-shop.ts).
 *
 * Tarif : la boutique est gratuite (ni mise en place ni abonnement), Ominin
 * prend une commission sur chaque commande payée — `platform_fee_percent`
 * de la boutique, prélevé par Stripe. `published: false` garde l'offre hors
 * de scripts/setup-stripe.ts et des CGV, qui ne connaissent que l'abonnement.
 */

export const shopBrand = "Ominin Shop";

export const shopOffer = {
  id: "shop",
  name: "Boutique en ligne",
  /** Frais de mise en place, facturés une fois (lookup_key shop_setup). */
  setupPrice: 0,
  /** Abonnement mensuel (lookup_key shop_monthly). */
  monthlyPrice: 0,
  /** Commission annoncée sur chaque commande payée, en pourcentage du total. */
  commissionPercent: 5,
  published: false,
  tagline: "Votre boutique, à votre nom, prête à vendre.",
  features: [
    "Site de vente à votre nom et à vos couleurs",
    "Paiement par carte, Apple Pay et Google Pay",
    "Livraison à domicile, point relais ou remise en main propre",
    "Espace de gestion : produits, commandes, messages, codes promo",
    "Photos, textes et pages légales modifiables sans nous",
  ],
};

export const signupCta: Cta = {
  label: "Créer ma boutique",
  href: `${shopSiteUrl}/inscription`,
};

export const signinHref = `${shopSiteUrl}/connexion`;

/** Appel principal de la page : le formulaire, en bas. */
const contactCta = { label: "Décrire mon projet", href: "#contact" } satisfies Cta;

/** Adresse publique de la boutique MyBox, citée dans le parcours et l'étude de cas. */
const myboxHost = "shop.ominin.com/mybox";

export const seo = {
  title: "Ominin Shop — Votre boutique en ligne, quand vous vendez sur Snapchat, Instagram ou TikTok",
  description:
    `Vous vendez du fait main, des box ou en dropshipping, en messages privés ? Ominin Shop construit votre boutique à votre nom en quelques jours : paiement par carte, livraison, commandes gérées depuis votre téléphone. Gratuite : ${shopOffer.commissionPercent} % seulement sur les commandes.`,
};

export const nav = {
  links: [
    { label: "Le parcours", href: "#parcours" },
    { label: "Pour qui", href: "#pour-qui" },
    { label: "Essayer", href: "#exemple" },
    { label: "Tarif", href: "#tarif" },
    { label: "FAQ", href: "#faq" },
  ] satisfies NavLink[],
  cta: contactCta,
  login: { label: "Connexion", href: signinHref } satisfies Cta,
};

export const hero = {
  eyebrow: "Boutique en ligne · Snapchat · Instagram · TikTok",
  /** Trois lignes ; la marquée reçoit le pavé braise. */
  lines: [
    { text: "Un lien en bio," },
    { text: "des commandes" },
    { text: "payées.", mark: true },
  ],
  subtitle:
    "Vous vendez déjà, en messages privés ? Ominin Shop construit votre boutique à votre nom, en quelques jours. Vos clientes choisissent, payent par carte ou Apple Pay, et la commande vous arrive prête à expédier.",
  stats: [
    { value: "0 €", label: "pour créer votre boutique" },
    { value: "0 DM", label: "pour encaisser une commande" },
    { value: "24 h/24", label: "la boutique vend pendant que vous dormez" },
  ],
  primaryCta: contactCta,
  secondaryCta: { label: "Essayer la boutique MyBox", href: "#exemple" } satisfies Cta,
  trustline: ["En ligne en quelques jours", "Paiement sécurisé par Stripe", "Réponse sous 24 h"],
};

/** Relais animé du hero : une commande MyBox, du panier au colis. */
export const heroRelay = {
  phoneLabel: "Le téléphone de votre cliente",
  shop: "MyBox",
  lines: [
    { image: "/shop/mybox/signature.webp", name: "Signature", detail: "Deux flacons · initiale « L »", price: "110,00 €" },
    { image: "/shop/mybox/chic-car-scent.webp", name: "Chic Car Scent", detail: "Diffuseurs voiture", price: "25,00 €" },
  ],
  totalLabel: "Total",
  total: "135,00 €",
  stamp: "Payé",
  deskLabel: "Votre espace",
  slip: {
    title: "Bon de préparation",
    customer: "Léa M.",
    shipping: "Colissimo · livraison offerte",
    lines: ["1 × Signature — initiale L", "1 × Chic Car Scent"],
    gift: "Message cadeau : « Joyeux anniversaire ma sœur ! »",
  },
  shipped: "Expédiée. Léa a reçu son suivi.",
};

export const marquee = [
  "Box cadeaux",
  "Fait main",
  "Bijoux",
  "Cosmétiques",
  "Bougies",
  "Vêtements",
  "Parfums",
  "Dropshipping",
];

/** Trois façons de vendre qu'on connaît, et ce que la boutique change pour chacune. */
export const audiencesSection = {
  id: "pour-qui",
  eyebrow: "Pour qui",
  title: "Vous vendez déjà. Il vous manque la boutique.",
  subtitle: "Trois façons de vendre qu'on connaît bien — et ce que la boutique change pour chacune.",
  todayLabel: "Aujourd'hui",
  tomorrowLabel: "Avec votre boutique",
  items: [
    {
      icon: "chat",
      kicker: "Snapchat · Instagram · TikTok",
      title: "Vous vendez en messages privés",
      today:
        "Chaque vente, c'est dix messages : dispo, prix, paiement Lydia ou PayPal, adresse à recopier, colis à suivre.",
      tomorrow:
        "Un lien en bio et en story. Vos clientes commandent et payent seules ; la commande arrive prête à préparer, l'adresse déjà saisie.",
    },
    {
      icon: "gift",
      kicker: "Fait main · Box · Cosmétiques",
      title: "Vous créez de vos mains",
      today:
        "Un petit catalogue, des options (taille, parfum, couleur), des commandes personnalisées notées un peu partout.",
      tomorrow:
        "Chaque produit avec ses options et sa personnalisation — une initiale, un prénom — un message cadeau glissé dans le colis, un stock qui se met à jour tout seul.",
    },
    {
      icon: "parcel",
      kicker: "Dropshipping",
      title: "Vous vendez le catalogue d'un fournisseur",
      today: "Shopify, un thème, douze applications, des frais qui s'empilent avant la première vente.",
      tomorrow:
        "On construit la boutique avec vos produits et vos marges. Vous recevez les commandes payées, vous passez commande chez votre fournisseur. Rien à configurer.",
    },
  ],
} as const;

/** Avant / après, ligne à ligne : ce que la boutique retire de la journée. */
export const shiftSection = {
  id: "ce-qui-change",
  eyebrow: "Ce qui change",
  title: "Les messages en moins, les ventes en plus.",
  beforeLabel: "En messages privés",
  afterLabel: "Sur votre boutique",
  rows: [
    {
      before: "« C'est encore dispo ? », quarante fois par jour",
      after: "Le stock est affiché, un produit épuisé se retire tout seul",
    },
    {
      before: "Lydia, PayPal, virement : des paiements à vérifier un par un",
      after: "Carte, Apple Pay, Google Pay — encaissé avant la préparation",
    },
    {
      before: "Des adresses recopiées depuis les conversations",
      after: "L'adresse saisie par la cliente, le bon de préparation prêt à imprimer",
    },
    {
      before: "Des ventes perdues quand vous ne répondez pas assez vite",
      after: "La boutique vend à 23 h, pendant que vous préparez les colis",
    },
  ],
};

/** Le parcours d'une commande au défilement (landing-kit/scroll-story), sur la boutique MyBox. */
export const journey = {
  id: "parcours",
  eyebrow: "Le parcours",
  title: "D'une story au colis, sans un message.",
  steps: [
    {
      kicker: "01 · La story",
      title: "Elle voit votre story, elle touche le lien.",
      description:
        "Vous postez comme d'habitude. Le lien de votre boutique est en bio et sur la story : pas d'application à installer, pas de compte à créer.",
    },
    {
      kicker: "02 · Sa box",
      title: "Elle choisit, à sa façon.",
      description:
        "Les options que vous proposez — un parfum, une taille, une couleur — et la personnalisation : une initiale, un prénom. Plus besoin de la noter dans une conversation.",
    },
    {
      kicker: "03 · Le paiement",
      title: "Elle paye en deux touches.",
      description:
        "Carte, Apple Pay ou Google Pay. Elle choisit sa livraison, la livraison offerte s'applique toute seule au-dessus de votre seuil. L'argent part sur votre compte Stripe.",
    },
    {
      kicker: "04 · Votre espace",
      title: "La commande vous arrive, prête à préparer.",
      description:
        "Payée, adresse saisie, options et message cadeau compris. Vous imprimez le bon de préparation depuis votre téléphone.",
    },
    {
      kicker: "05 · L'envoi",
      title: "Vous expédiez, elle est prévenue.",
      description:
        "Vous saisissez le numéro de suivi : l'e-mail d'expédition part tout seul. Et si elle a une question, elle vous écrit depuis la boutique.",
    },
  ] satisfies StoryStep[],
  screens: {
    handle: "@mybox",
    storyCaption: "La box Signature est de retour",
    link: myboxHost,
    product: { image: "/shop/mybox/signature.webp", name: "Signature", price: "110,00 €" },
    options: [
      { label: "Parfum du flacon 30 ml", value: "Choisi ✓" },
      { label: "Parfum du flacon 10 ml", value: "Choisi ✓" },
      { label: "Initiale sur la box", value: "L" },
    ],
    addLabel: "Ajouter au panier",
    deliveries: [
      { label: "Colissimo à domicile", price: "Offerte", selected: true },
      { label: "Point relais Mondial Relay", price: "Offerte" },
    ],
    payMethods: ["Carte", "Apple Pay", "Google Pay"],
    paid: "Payé 110,00 € ✓",
    order: {
      label: "Nouvelle commande",
      customer: "Léa M.",
      total: "110,00 €",
      shipping: "Colissimo",
      gift: "Message cadeau",
      print: "Imprimer le bon de préparation",
    },
    shipped: {
      title: "Expédiée",
      tracking: "Suivi Colissimo envoyé à Léa",
      mail: "« Ta box est en route ! »",
    },
  },
};

/*
 * Exemple : la vraie boutique MyBox, dans un téléphone, à essayer sur place.
 * L'iframe vise un chemin relatif — même origine que la landing (servie sur
 * le host shop), seule origine que la politique d'encadrement autorise.
 */
export const showcase = {
  id: "exemple",
  eyebrow: "Exemple",
  title: "MyBox, des box beauté livrées avec un mot doux.",
  subtitle:
    "Treize box, un parfum choisi à la commande, une initiale sur la box, un message cadeau glissé dedans. C'est la vraie boutique : parcourez-la dans le téléphone.",
  href: "/mybox",
  iframeTitle: "La boutique MyBox, à essayer",
  ctaLabel: "Ouvrir la boutique en plein écran",
  hint: "Faites défiler et touchez une box, comme une cliente.",
  points: [
    { value: "13", label: "box, de 25 € à 125 €" },
    { value: "100 €", label: "et la livraison est offerte" },
    { value: "1", label: "téléphone pour tout gérer : commandes, messages, codes promo" },
  ],
};

/*
 * Les vrais écrans, captés sur la boutique MyBox en production (vitrine,
 * catalogue, page produit) et sur l'espace de gestion rempli de commandes
 * de démonstration : la gérante ne nous a pas confié ses chiffres.
 */
export const screensSection = {
  id: "ecrans",
  eyebrow: "Les écrans",
  title: "Sur ordinateur comme sur téléphone.",
  subtitle: "Ce que voient vos clientes, et ce que vous voyez de votre côté. Captures de la boutique MyBox.",
  tabs: [
    {
      id: "accueil",
      label: "L'accueil",
      caption: "Votre univers dès la première seconde : vos couleurs, vos polices, votre photo.",
      url: myboxHost,
      desktop: { src: "/shop/landing/vitrine-d.webp", alt: "Page d'accueil de la boutique MyBox sur ordinateur" },
      mobile: { src: "/shop/landing/vitrine-m.webp", alt: "Page d'accueil de la boutique MyBox sur téléphone" },
    },
    {
      id: "catalogue",
      label: "Le catalogue",
      caption: "Vos collections en filtres, vos best-sellers mis en avant, le prix en un coup d'œil.",
      url: `${myboxHost}/boutique`,
      desktop: { src: "/shop/landing/catalogue-d.webp", alt: "Catalogue des box MyBox avec filtres par collection" },
    },
    {
      id: "produit",
      label: "La page produit",
      caption: "Photos, composition, options et personnalisation : tout ce qu'on vous demandait en message.",
      url: `${myboxHost}/produit/signature`,
      desktop: { src: "/shop/landing/produit-d.webp", alt: "Page produit de la box Signature sur ordinateur" },
      mobile: { src: "/shop/landing/produit-m.webp", alt: "Page produit de la box Signature sur téléphone" },
    },
    {
      id: "gestion",
      label: "Votre espace",
      caption: "Ventes, commandes à préparer, messages : votre boutique tient dans votre poche.",
      url: "shop.ominin.com/gestion",
      note: "Montré avec des commandes de démonstration.",
      desktop: { src: "/shop/landing/gestion-d.webp", alt: "Aperçu de l'espace de gestion : ventes, commandes et messages" },
      mobile: { src: "/shop/landing/gestion-m.webp", alt: "Aperçu de l'espace de gestion sur téléphone" },
    },
  ],
};

export const setupSection = {
  id: "comment",
  eyebrow: "Mise en route",
  title: "En ligne en quelques jours.",
  subtitle: "On construit, vous validez. Vous n'avez rien à configurer.",
  steps: [
    {
      title: "Vous nous envoyez vos produits",
      description:
        "Photos, noms, prix, en messages ou dans un fichier. Vous vendez déjà sur Snap ou Insta ? Envoyez vos stories, on part de là.",
    },
    {
      title: "On met la boutique à vos couleurs",
      description:
        "Logo, palette, typographies : votre site vous ressemble. Pas de thème générique, pas de bannière Shopify.",
    },
    {
      title: "Vous branchez votre compte Stripe",
      description:
        "Cinq minutes guidées. L'argent des ventes arrive directement sur votre compte bancaire, jamais sur le nôtre.",
    },
    {
      title: "Vous mettez le lien en bio",
      description:
        "Vous continuez de poster comme avant. Les commandes arrivent dans votre espace, vous préparez, vous expédiez. On reste joignables.",
    },
  ] satisfies Step[],
};

export const pricingSection = {
  id: "tarif",
  eyebrow: "Tarif",
  title: "Gratuite. Vous payez quand vous vendez.",
  subtitle:
    "Pas de mise en place, pas d'abonnement : on construit et on héberge votre boutique sans rien vous facturer. On prend une commission sur chaque commande payée — rien quand vous ne vendez pas.",
  freeLabel: "Création et abonnement",
  freeValue: "Gratuit",
  commissionLabel: "Par commande payée",
  featuresLabel: "Inclus",
  cta: { label: "Créer ma boutique", href: "#contact" } satisfies Cta,
  guarantees: ["Sans engagement", "Votre argent sur votre compte", "Réponse sous 24 h"],
  offer: shopOffer,
};

export const faqSection = {
  id: "faq",
  eyebrow: "FAQ",
  title: "Questions fréquentes.",
  items: [
    {
      question: "Je vends déjà sur Snapchat ou Instagram, qu'est-ce que ça change ?",
      answer:
        "Vous continuez de poster exactement comme avant. La différence : au lieu de gérer chaque commande en messages privés (dispo, prix, paiement, adresse), vous mettez un lien en bio. Vos clientes commandent et payent seules, vous recevez la commande prête à préparer.",
    },
    {
      question: "Je fais du dropshipping, c'est compatible ?",
      answer:
        "Oui. Vous nous transmettez le catalogue de votre fournisseur (photos, descriptions, prix) et vos marges ; on construit la boutique. Vous recevez les commandes payées et vous passez commande chez votre fournisseur. Pas de Shopify ni d'applications à empiler.",
    },
    {
      question: "Combien ça coûte ?",
      answer:
        `Rien pour créer la boutique, rien chaque mois. On prend ${shopOffer.commissionPercent} % sur chaque commande payée, prélevés automatiquement par Stripe : si vous ne vendez pas, vous ne payez pas.`,
    },
    {
      question: "Faut-il un statut pour vendre ?",
      answer:
        "Oui : pour encaisser par carte, Stripe demande une entreprise déclarée. Une micro-entreprise suffit. Si vous n'en avez pas encore, dites-le-nous dans votre message, on vous indique la marche à suivre.",
    },
    {
      question: "Quelle différence avec Shopify ou Wix ?",
      answer:
        "Vous ne configurez rien. On construit la boutique avec vos produits et vos couleurs, on branche le paiement et la livraison, et vous arrivez dans un espace de gestion pensé pour une personne seule : pas de plugins, pas de thème à bricoler, pas d'abonnements empilés.",
    },
    {
      question: "Où va l'argent des ventes ?",
      answer: "Sur votre compte Stripe, relié à votre compte bancaire. Ominin ne touche jamais l'argent de vos clientes.",
    },
    {
      question: "Comment fonctionne la livraison ?",
      answer:
        "Vous choisissez les modes proposés (Colissimo, Mondial Relay, remise en main propre, Europe…), leurs tarifs et un seuil de livraison offerte. Vous expédiez avec le transporteur de votre choix et renseignez le numéro de suivi : la cliente est prévenue par e-mail.",
    },
    {
      question: "Y a-t-il un engagement ?",
      answer: "Non. Il n'y a pas d'abonnement : vous arrêtez quand vous voulez. Vos données vous appartiennent.",
    },
  ] satisfies FaqItem[],
};

/*
 * Section de contact : la page se termine sur le formulaire, pas sur un lien
 * vers ominin.com — les visiteuses arrivent d'une story, sur téléphone, et
 * doivent pouvoir poser leur question sans changer de site.
 */
export const contactSection = {
  id: "contact",
  eyebrow: "Parlons-en",
  title: "Une question, un projet ? Écrivez-nous.",
  subtitle:
    "Dites-nous ce que vous vendez, où, et à peu près combien de références. On vous répond sous 24 h, franchement — y compris quand une boutique n'est pas la bonne réponse.",
  emailLabel: "Ou directement par e-mail :",
  form: {
    name: { label: "Votre prénom ou votre nom", placeholder: "Léa Martin" },
    email: { label: "E-mail", placeholder: "lea@gmail.com" },
    company: {
      label: "Votre marque ou votre compte",
      hint: "facultatif",
      placeholder: "@lea.creations · bijoux faits main",
    },
    message: {
      label: "Votre projet ou votre question",
      placeholder:
        "Je vends des bougies sur Instagram, une trentaine de commandes par mois en DM, une dizaine de références…",
    },
    submit: "Envoyer",
    sending: "Envoi…",
    success: {
      title: "C'est envoyé.",
      body: "On revient vers vous par e-mail sous 24 h.",
    },
    error: "L'envoi a échoué. Réessayez, ou écrivez-nous directement par e-mail.",
    note: "Réponse sous 24 h.",
  } satisfies LeadFormCopy,
};

export const footer = {
  tagline:
    "Des boutiques en ligne à votre nom, construites et hébergées par Ominin, gérées par vous depuis votre téléphone.",
  customerNotice: "Vous cherchez une boutique ? Utilisez le lien communiqué par la marque.",
};

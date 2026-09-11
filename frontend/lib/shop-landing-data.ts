import type { Cta, FaqItem, NavLink, Step } from "@/lib/landing-data";
import type { LeadFormCopy } from "@/components/landing/lead-form";
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
 * d'étude de cas.
 *
 * Tarifs : une mise en place puis un abonnement mensuel. Les montants ne
 * sont pas encore arrêtés — `published: false` fait afficher « sur devis »
 * et scripts/setup-stripe.ts ignore l'offre tant que les prix valent 0.
 * La commission sur les ventes n'est pas annoncée (grille en réflexion).
 */

export const shopBrand = "Ominin Shop";

export const shopOffer = {
  id: "shop",
  name: "Boutique en ligne",
  /** Frais de mise en place, facturés une fois (lookup_key shop_setup). */
  setupPrice: 0,
  /** Abonnement mensuel (lookup_key shop_monthly). */
  monthlyPrice: 0,
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

export const seo = {
  title: "Ominin Shop — Votre boutique en ligne, quand vous vendez sur Snapchat, Instagram ou TikTok",
  description:
    "Vous vendez du fait main, des box ou en dropshipping, en messages privés ? Ominin Shop construit votre boutique à votre nom en quelques jours : paiement par carte, livraison, commandes gérées depuis votre téléphone. Un lien en bio, et vos clientes commandent seules.",
};

export const nav = {
  links: [
    { label: "Pour qui", href: "#pour-qui" },
    { label: "Comment ça marche", href: "#comment" },
    { label: "Tarif", href: "#tarif" },
    { label: "FAQ", href: "#faq" },
    { label: "Contact", href: "#contact" },
  ] satisfies NavLink[],
  cta: { label: "Décrire mon projet", href: "#contact" } satisfies Cta,
  login: { label: "Connexion", href: signinHref } satisfies Cta,
};

export const hero = {
  eyebrow: "Boutique en ligne · Créateurs · Réseaux sociaux · Dropshipping",
  titleStart: "Vous vendez déjà.",
  titleAccent: "Ayez votre boutique.",
  subtitle:
    "Snapchat, Instagram, TikTok, fait main ou dropshipping : si vos commandes arrivent en messages privés, vous perdez du temps et des ventes. Ominin Shop met votre boutique en ligne en quelques jours, à votre nom. Un lien en bio, vos clientes commandent et payent, vous expédiez — tout se gère depuis votre téléphone.",
  primaryCta: { label: "Décrire mon projet", href: "#contact" } satisfies Cta,
  secondaryCta: { label: "Voir une boutique", href: "#exemple" } satisfies Cta,
  trustline: [
    "En ligne en quelques jours",
    "Paiement sécurisé par Stripe",
    "Réponse sous 24 h",
  ],
  /** Vignette de la première boutique, à droite du titre. */
  showcase: {
    alt: "La boutique MyBox, première boutique Ominin Shop",
    name: "MyBox",
    host: "shop.ominin.com/mybox",
    openLabel: "Ouvrir",
  },
};

/** Trois façons de vendre qu'on connaît, et ce que la boutique change pour chacune. */
export const audiencesSection = {
  id: "pour-qui",
  eyebrow: "Pour qui",
  title: "Vous vendez déjà. Il vous manque la boutique.",
  subtitle:
    "Trois façons de vendre qu'on connaît bien — et ce que la boutique change pour chacune.",
  todayLabel: "Aujourd'hui",
  tomorrowLabel: "Avec votre boutique",
  items: [
    {
      kicker: "Snapchat · Instagram · TikTok",
      title: "Vous vendez en messages privés",
      today:
        "Chaque vente, c'est dix messages : dispo, prix, paiement Lydia ou PayPal, adresse à recopier, colis à suivre.",
      tomorrow:
        "Un lien en bio et en story. Vos clientes commandent et payent seules ; la commande arrive prête à préparer, l'adresse déjà saisie.",
    },
    {
      kicker: "Fait main · Box · Cosmétiques",
      title: "Vous créez de vos mains",
      today:
        "Un petit catalogue, des options (taille, parfum, couleur), des commandes personnalisées notées un peu partout.",
      tomorrow:
        "Chaque produit avec ses options et sa personnalisation — une initiale, un prénom — un message cadeau glissé dans le colis, un stock qui se met à jour tout seul.",
    },
    {
      kicker: "Dropshipping",
      title: "Vous vendez le catalogue d'un fournisseur",
      today:
        "Shopify, un thème, douze applications, des frais qui s'empilent avant la première vente.",
      tomorrow:
        "On construit la boutique avec vos produits et vos marges. Vous recevez les commandes payées, vous passez commande chez votre fournisseur. Rien à configurer.",
    },
  ],
};

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
      before: "Le numéro de suivi envoyé à la main, quand on y pense",
      after: "L'e-mail d'expédition part tout seul, avec le suivi",
    },
    {
      before: "Des ventes perdues quand vous ne répondez pas assez vite",
      after: "La boutique vend à 23 h, pendant que vous préparez les colis",
    },
  ],
};

/** Étude de cas : la première boutique en production. */
export const showcase = {
  id: "exemple",
  eyebrow: "En production",
  title: "MyBox, des box beauté livrées avec un mot doux.",
  subtitle:
    "Treize box, un parfum choisi à la commande, une initiale sur la box, un message cadeau glissé dedans — et une gérante qui pilote tout depuis son téléphone.",
  /** Chemin relatif au host shop : la landing est aussi servie sur ominin.com/shop. */
  href: "/mybox",
  ctaLabel: "Ouvrir la boutique MyBox",
  points: [
    { label: "Catalogue", value: "13 box de 25 € à 125 €" },
    { label: "Options", value: "Parfum et initiale choisis par la cliente" },
    { label: "Livraison", value: "Colissimo, Mondial Relay, main propre" },
    { label: "Gestion", value: "Commandes, messages, codes promo" },
  ],
};

export const howItWorks = {
  id: "comment",
  eyebrow: "Comment ça marche",
  title: "De vos stories à la première commande.",
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

export const featuresSection = {
  id: "fonctionnalites",
  eyebrow: "Fonctionnalités",
  title: "Tout ce qu'une boutique doit faire. Rien de plus.",
  subtitle:
    "Ce que nous avons construit pour MyBox, chaque boutique l'a : le même socle, éprouvé en production.",
  groups: [
    {
      title: "Pour vos clientes",
      items: [
        "Catalogue avec collections et options (taille, parfum, couleur)",
        "Personnalisation sur les produits qui le permettent : une initiale, un prénom",
        "Panier, code promo, livraison offerte à partir d'un montant",
        "Paiement Stripe : carte, Apple Pay, Google Pay",
        "Commande cadeau avec message glissé dans le colis",
        "Suivi de commande, compte cliente par lien magique",
        "Contact, FAQ, pages légales prêtes à compléter",
      ],
    },
    {
      title: "Pour vous",
      items: [
        "Commandes : préparation, expédition avec suivi, e-mails automatiques",
        "Produits, photos, stock, mise en avant, référencement",
        "Modes de livraison et tarifs modifiables à tout moment",
        "Messagerie avec les clientes, réponses envoyées par e-mail",
        "Codes promo, bandeau d'annonce, FAQ, textes du site",
        "Remboursements et bon de préparation imprimable",
      ],
    },
  ],
};

export const pricingSection = {
  id: "tarif",
  eyebrow: "Tarif",
  title: "Une mise en place, puis un abonnement.",
  subtitle:
    "Pas de pourcentage caché dans le prix de vos produits : une mise en place pour construire la boutique, un abonnement pour l'héberger et la faire évoluer. Le tarif dépend de la taille de votre catalogue.",
  setupLabel: "Mise en place",
  monthlyLabel: "Abonnement",
  perMonth: "/mois",
  onceLabel: "une fois",
  quoteLabel: "Sur devis",
  quoteHint:
    "Dites-nous ce que vous vendez et combien de références : vous avez un prix sous 24 h.",
  featuresLabel: "Inclus :",
  cta: { label: "Demander un prix", href: "#contact" } satisfies Cta,
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
      question: "Je n'ai que quelques produits, ça vaut le coup ?",
      answer:
        "Une boutique de cinq références se construit vite et coûte moins cher qu'un grand catalogue. Si vous vendez régulièrement, même peu, le temps gagné sur les messages se voit dès la première semaine.",
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
      answer:
        "Sur votre compte Stripe, relié à votre compte bancaire. Ominin ne touche jamais l'argent de vos clientes.",
    },
    {
      question: "Puis-je utiliser mon propre nom de domaine ?",
      answer:
        "Oui. Votre boutique est d'abord accessible sur shop.ominin.com/votre-nom ; votre domaine (maboutique.fr) peut y être rattaché ensuite.",
    },
    {
      question: "Comment fonctionne la livraison ?",
      answer:
        "Vous choisissez les modes proposés (Colissimo, Mondial Relay, remise en main propre, Europe…), leurs tarifs et un seuil de livraison offerte. Vous expédiez avec le transporteur de votre choix et renseignez le numéro de suivi : la cliente est prévenue par e-mail.",
    },
    {
      question: "Mes clientes doivent-elles créer un compte ?",
      answer:
        "Non. Elles commandent en tant qu'invitées. Un compte par lien magique, sans mot de passe, leur permet de retrouver leurs commandes et leurs échanges avec vous.",
    },
    {
      question: "Puis-je modifier le site moi-même ?",
      answer:
        "Produits, photos, prix, stock, livraison, textes, FAQ, bandeau, pages légales : tout se modifie depuis votre espace, sans nous demander.",
    },
    {
      question: "Y a-t-il un engagement ?",
      answer:
        "Non. L'abonnement est mensuel et résiliable à tout moment. Vos données vous appartiennent.",
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
  microcopy: ["Réponse sous 24 h", "Sans engagement"],
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
  customerNotice:
    "Vous cherchez une boutique ? Utilisez le lien communiqué par la marque.",
};

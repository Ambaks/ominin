import type { Cta, FaqItem, NavLink, Step } from "@/lib/landing-data";
import { shopSiteUrl } from "@/lib/site";

/*
 * Copy de la landing Ominin Shop (shop.ominin.com). Comme les autres
 * landings, aucun texte dans les composants : tout vit ici.
 *
 * Positionnement : la boutique en ligne clé en main d'un commerce, à son
 * nom, sans Shopify à configurer ni agence à payer. MyBox (box beauté) est
 * la première boutique en production et sert d'étude de cas.
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
  title: "Ominin Shop — Votre boutique en ligne, à votre nom",
  description:
    "Une boutique en ligne clé en main pour les créatrices et petits commerces : paiement sécurisé, livraison, espace de gestion simple. Mise en place par Ominin, vous vendez dès la première semaine.",
};

export const nav = {
  links: [
    { label: "Exemple", href: "#exemple" },
    { label: "Comment ça marche", href: "#comment" },
    { label: "Fonctionnalités", href: "#fonctionnalites" },
    { label: "Tarif", href: "#tarif" },
    { label: "FAQ", href: "#faq" },
  ] satisfies NavLink[],
  cta: { label: "Voir l'exemple", href: "#exemple" } satisfies Cta,
  login: { label: "Connexion", href: signinHref } satisfies Cta,
};

export const hero = {
  eyebrow: "Boutique en ligne clé en main",
  titleStart: "Vendez sous votre nom,",
  titleAccent: "pas sur une marketplace.",
  subtitle:
    "Ominin Shop met votre boutique en ligne en quelques jours : vos produits, vos couleurs, votre adresse. Vos clientes commandent et payent chez vous, vous préparez, vous expédiez. Tout se gère depuis un espace simple, sans jargon ni plugin.",
  primaryCta: { label: "Voir une boutique en ligne", href: "#exemple" } satisfies Cta,
  secondaryCta: { label: "Décrire mon projet", href: "#contact" } satisfies Cta,
  trustline: [
    "En ligne en quelques jours",
    "Paiement sécurisé par Stripe",
    "Un interlocuteur unique",
  ],
};

/** Étude de cas : la première boutique en production. */
export const showcase = {
  id: "exemple",
  eyebrow: "En production",
  title: "MyBox, des box beauté livrées avec un mot doux.",
  subtitle:
    "Treize box, un choix de parfum à la commande, un message cadeau glissé dans la boîte, et une gérante qui pilote tout depuis son téléphone.",
  /** Chemin relatif au host shop : la landing est aussi servie sur ominin.com/shop. */
  href: "/mybox",
  ctaLabel: "Ouvrir la boutique MyBox",
  points: [
    { label: "Catalogue", value: "13 box de 25 € à 125 €" },
    { label: "Options", value: "Parfum choisi par la cliente" },
    { label: "Livraison", value: "Colissimo, Mondial Relay, main propre" },
    { label: "Gestion", value: "Commandes, messages, codes promo" },
  ],
};

export const howItWorks = {
  id: "comment",
  eyebrow: "Comment ça marche",
  title: "De votre idée à la première vente.",
  steps: [
    {
      title: "Vous nous envoyez vos produits",
      description:
        "Photos, noms, prix, descriptions. Un fichier, des messages, peu importe la forme : on structure le catalogue avec vous.",
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
      title: "Vous vendez, on reste là",
      description:
        "Produits, commandes, expéditions, messages : vous gérez tout vous-même. Un interlocuteur unique répond quand vous avez besoin.",
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
      title: "Côté clientes",
      items: [
        "Catalogue avec collections et options (taille, parfum, couleur)",
        "Panier, code promo, livraison offerte à partir d'un montant",
        "Paiement Stripe : carte, Apple Pay, Google Pay",
        "Commande cadeau avec message glissé dans le colis",
        "Suivi de commande, compte cliente par lien magique",
        "Contact, FAQ, pages légales prêtes à compléter",
      ],
    },
    {
      title: "Côté gérante",
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
    "Pas de pourcentage caché dans le prix de vos produits : une mise en place pour construire la boutique, un abonnement pour l'héberger et la faire évoluer.",
  setupLabel: "Mise en place",
  monthlyLabel: "Abonnement",
  perMonth: "/mois",
  onceLabel: "une fois",
  quoteLabel: "Sur devis",
  quoteHint: "Le tarif dépend de la taille du catalogue. Décrivez votre projet, vous avez une réponse sous 24 h.",
  featuresLabel: "Inclus :",
  ctaLabel: "Décrire mon projet",
  guarantees: ["Sans engagement", "Votre argent sur votre compte", "Réponse sous 24 h"],
  offer: shopOffer,
};

export const faqSection = {
  id: "faq",
  eyebrow: "FAQ",
  title: "Questions fréquentes.",
  items: [
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

export const finalCta = {
  id: "contact",
  title: "Une boutique à votre nom, cette semaine ?",
  subtitle:
    "Décrivez votre projet en quelques lignes : vos produits, votre univers, ce que vous vendez déjà sur Instagram ou en direct. On vous répond franchement, y compris quand une boutique n'est pas la bonne réponse.",
  contactLabel: "Décrire mon projet",
  contactHref: "https://ominin.com/sur-mesure",
  microcopy: ["Réponse sous 24 h", "Sans engagement"],
};

export const footer = {
  tagline:
    "Des boutiques en ligne à votre nom, construites et hébergées par Ominin, gérées par vous.",
  customerNotice:
    "Vous cherchez une boutique ? Utilisez le lien communiqué par la marque.",
};

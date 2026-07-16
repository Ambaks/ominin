import type { Cta, FaqItem, Feature, NavLink, Step } from "@/lib/landing-data";

/*
 * Copy et tarifs de la landing Ominin Clip (clip.ominin.com). Comme
 * lib/landing-data.ts pour le produit restaurant, ce fichier est la source
 * de vérité des prix affichés — et servira de référence aux prix Stripe
 * quand la facturation clipper sera branchée.
 */

export const clipBrand = "Ominin Clip";

/** 1500 → « 1 500 € » : séparateur de milliers français, contrairement aux
 * prix de carte (formatPrice de menu-data) qui restent sous 1 000 €. */
export const formatEuros = (amount: number) =>
  `${amount.toLocaleString("fr-FR")} €`;

/** Les CTA de conversion ouvrent le formulaire directement en mode inscription. */
export const signupCta: Cta = {
  label: "Commencer l'essai gratuit",
  href: "/login?inscription=1",
};

export const seo = {
  title:
    "Ominin Clip — Publiez vos clips sur tous vos comptes, automatiquement",
  description:
    "Déposez vos clips : des agents rédigent titres et descriptions et publient sur TikTok, YouTube Shorts, Instagram Reels et X — sur tous vos comptes à la fois. 1 mois d'essai gratuit.",
};

export const nav = {
  links: [
    { label: "Démo", href: "#demo" },
    { label: "Fonctionnalités", href: "#fonctionnalites" },
    { label: "Scaling", href: "#scaling" },
    { label: "Tarifs", href: "#tarifs" },
    { label: "FAQ", href: "#faq" },
    { label: "Connexion", href: "/login" },
  ] satisfies NavLink[],
  cta: { label: "Essai gratuit 1 mois", href: signupCta.href } satisfies Cta,
};

export const hero = {
  eyebrow: "Publication automatique · Multi-comptes · Agents IA",
  titleStart: "Vous clippez.",
  titleAccent: "On publie.",
  subtitle:
    "Déposez un clip : nos agents rédigent le titre et la description, puis le publient sur tous vos comptes — TikTok, YouTube Shorts, Instagram Reels, X. Vous gardez le montage, on s'occupe de tout le reste.",
  secondaryCta: { label: "Découvrir les tarifs", href: "#tarifs" } satisfies Cta,
  trustline: [
    "1 mois d'essai gratuit",
    "Taillé pour votre setup",
    "Résiliable à tout moment",
  ],
};

/** Maquette produit du hero : un dépôt, quatre publications. */
export const heroShowcase = {
  clip: {
    file: "meilleur-moment-du-live.mp4",
    duration: "0:42",
    label: "Votre clip",
  },
  agentLine: "L'agent rédige : titre, description, hashtags",
  posts: [
    {
      platform: "TikTok",
      caption: "Il ne s'attendait PAS à ça 😳 #live #clip",
      status: "Publié · 14:02",
      live: true,
    },
    {
      platform: "YouTube Shorts",
      caption: "La réaction la plus folle du stream d'hier",
      status: "Publié · 14:02",
      live: true,
    },
    {
      platform: "Instagram Reels",
      caption: "Ce moment restera dans l'histoire du live 🔥",
      status: "Publié · 14:03",
      live: true,
    },
    {
      platform: "X",
      caption: "Le clip que tout le monde attendait…",
      status: "En file · 14:20",
      live: false,
    },
  ],
};

/** Vitrine de la démo interactive : /demo en iframe dans les cadres appareil. */
export const demoSection = {
  id: "demo",
  eyebrow: "Démo interactive",
  title: "L'espace clipper, en conditions réelles.",
  subtitle:
    "Un espace de démonstration avec des données fictives : déposez le clip d'exemple, générez les titres, publiez — tout est jouable, rien n'est réel.",
  urlLabel: "clip.ominin.com/espace",
  href: "/demo",
  overlayLabel: "Cliquer pour essayer la démo",
  fullscreenLabel: "Ouvrir la démo en plein écran",
  mobileTitle: "Essayez l'espace clipper",
  mobileHint:
    "Démo interactive, données fictives — directement dans votre navigateur.",
  desktopIframeTitle: "Démo de l'espace clipper — vue ordinateur",
  phoneIframeTitle: "Démo de l'espace clipper — vue mobile",
};

export const howItWorks = {
  eyebrow: "Comment ça marche",
  title: "Du montage à la publication, en moins de deux minutes.",
  steps: [
    {
      title: "Connectez vos comptes",
      description:
        "TikTok, YouTube, Instagram, X : vous les branchez une fois, depuis votre espace. Dix comptes ou cinquante, même geste.",
    },
    {
      title: "Déposez vos clips",
      description:
        "Un glisser-déposer et le clip entre dans la file de publication. Pas de formulaire, pas d'upload compte par compte.",
    },
    {
      title: "Les agents publient",
      description:
        "Titre, description, hashtags : l'agent rédige dans le ton de chaque compte et publie au bon format, sur chaque plateforme.",
    },
    {
      title: "Vous scalez",
      description:
        "Le même dépôt alimente tout votre réseau. Plus de comptes, plus de vues — pas une minute de travail en plus.",
    },
  ] satisfies Step[],
};

export const featuresSection = {
  id: "fonctionnalites",
  eyebrow: "Fonctionnalités",
  title: "Votre temps repart au montage.",
  subtitle:
    "Publier un clip à la main, c'est dix minutes par compte : upload, titre, description, hashtags. Multipliez par vos comptes et vos clips du jour — Ominin Clip vous rend ces heures.",
  features: [
    {
      stat: "1 dépôt",
      title: "Tous vos comptes servis",
      description:
        "Un clip déposé part sur chaque compte connecté, au bon format. L'upload en série, compte par compte, disparaît.",
    },
    {
      stat: "0 saisie",
      title: "Titres et descriptions rédigés",
      description:
        "L'agent écrit titre, description et hashtags adaptés à chaque plateforme, dans le ton de vos comptes. Relisez avant publication, ou laissez partir.",
    },
    {
      stat: "24/7",
      title: "Publication aux bonnes heures",
      description:
        "Les clips partent aux créneaux qui performent — pendant que vous montez le suivant, ou pendant que vous dormez.",
    },
  ] satisfies Feature[],
};

export const scaleSection = {
  id: "scaling",
  eyebrow: "Passer à l'échelle",
  title: "Plus de comptes. Pas plus de travail.",
  subtitle:
    "À la main, chaque compte supplémentaire vous coûte des heures par semaine. Avec Ominin Clip, il coûte 5 € par mois — et pas une minute. C'est toute la différence entre tenir 3 comptes et en faire tourner 50.",
  tiers: [
    { accounts: 10, price: 50 },
    { accounts: 20, price: 100 },
    { accounts: 50, price: 250 },
  ],
  tierAccountsLabel: "comptes",
  tierPerMonth: "/mois",
  footline:
    "Le travail, lui, reste le même : vous déposez vos clips, les agents font le reste.",
};

export const pricingSection = {
  id: "tarifs",
  eyebrow: "Tarifs",
  title: "Un setup sur mesure. Un prix simple.",
  subtitle:
    "Pas de paliers cachés : un produit de base construit pour votre workflow, puis un abonnement qui suit votre nombre de comptes.",
  base: {
    name: "Produit de base",
    price: 1500,
    priceNote: "paiement unique",
    tagline: "Taillé pour votre setup.",
    featuresLabel: "Inclus :",
    features: [
      "Installation adaptée à vos plateformes et votre workflow",
      "Connexion de vos comptes sociaux",
      "Agents configurés à votre style — ton, hashtags, formats",
      "Accompagnement au démarrage",
    ],
  },
  subscription: {
    name: "Abonnement",
    price: 50,
    priceNote: "/mois par 10 comptes",
    badge: "1er mois offert",
    tagline: "Grandit avec votre réseau.",
    featuresLabel: "Inclus :",
    features: [
      "Publication automatique illimitée sur les comptes connectés",
      "Titres et descriptions générés à chaque clip",
      "Ajoutez des tranches de 10 comptes à tout moment",
      "Résiliable à tout moment",
    ],
  },
  ctaLabel: "Commencer l'essai gratuit",
  guarantees: [
    "1 mois d'essai gratuit",
    "Sans engagement",
    "Réponse sous 24 h",
  ],
};

export const faqSection = {
  id: "faq",
  eyebrow: "FAQ",
  title: "Questions fréquentes.",
  items: [
    {
      question: "Quelles plateformes sont supportées ?",
      answer:
        "TikTok, YouTube Shorts, Instagram Reels et X. Votre setup est construit sur mesure : dites-nous où vous publiez, on s'y branche.",
    },
    {
      question: "Comment l'agent rédige-t-il mes titres et descriptions ?",
      answer:
        "Il apprend le ton de vos comptes — vos formulations, vos hashtags, vos codes — et adapte chaque publication à sa plateforme. Vous pouvez relire avant publication, ou laisser partir automatiquement.",
    },
    {
      question: "Que couvre le produit de base à 1 500 € ?",
      answer:
        "La construction de votre setup : connexion de vos comptes, configuration des agents à votre style, adaptation à votre workflow de montage. C'est un paiement unique — l'abonnement couvre ensuite la publication.",
    },
    {
      question: "Mes comptes restent-ils sous mon contrôle ?",
      answer:
        "Oui. Vous connectez chaque compte vous-même, vous voyez tout ce qui part, et vous pouvez déconnecter un compte ou suspendre la publication à tout moment.",
    },
    {
      question: "Comment fonctionne le mois d'essai gratuit ?",
      answer:
        "Le premier mois d'abonnement est offert : vous testez la publication automatique en conditions réelles. Si vous arrêtez avant la fin du mois, l'abonnement ne vous est jamais facturé.",
    },
    {
      question: "Puis-je ajouter des comptes plus tard ?",
      answer:
        "Oui, par tranches de 10 comptes — 50 € par mois la tranche, activable à tout moment depuis votre espace.",
    },
    {
      question: "Y a-t-il un engagement ?",
      answer:
        "Aucun. L'abonnement est mensuel et résiliable à tout moment, sans frais ni justification.",
    },
  ] satisfies FaqItem[],
};

export const finalCta = {
  id: "contact",
  title: "Prêt à publier sans y penser ?",
  subtitle:
    "Créez votre compte, ou écrivez-nous : on vous répond sous 24 heures avec un setup pensé pour vous.",
  contactLabel: "Nous écrire",
  microcopy: ["1 mois d'essai gratuit", "Réponse sous 24 h"],
};

export const footer = {
  tagline:
    "Publication automatique de clips pour les clippers — tous vos comptes, toutes vos plateformes, un seul dépôt.",
};

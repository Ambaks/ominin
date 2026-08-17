import { unsplash } from "@/lib/menu-data";
import { clipSiteUrl, collectSiteUrl, menuSiteUrl, siteUrl } from "@/lib/site";

/*
 * Copy du portail ominin.com. Comme les landings produits, aucun texte dans
 * les composants : tout vit ici. Seule différence, le portail est bilingue —
 * chaque chaîne visible est un objet { fr, en }.
 *
 * Le portail ne vend rien : il oriente. Il dit ce qu'est Ominin (une boîte qui
 * enlève du travail répétitif via l'IA) puis envoie vers le produit concerné.
 * Pas de prix, pas de témoignages, pas de FAQ — chaque produit porte déjà les
 * siens sur son propre sous-domaine.
 */

export type Language = "fr" | "en";

/** Chaîne traduite. `Localized` partout où un texte est rendu à l'écran. */
export type Localized = Record<Language, string>;

/** Nom propre ou terme identique dans les deux langues (marques, produits). */
const untranslated = (value: string): Localized => ({ fr: value, en: value });

export const LANGUAGES: Language[] = ["fr", "en"];

/** Français par défaut : le marché réel est francophone. */
export const DEFAULT_LANGUAGE: Language = "fr";

export const brand = "Ominin";

/** Host du portail, affiché sur le cube « sur mesure ». */
const portalHost = siteUrl.replace(/^https?:\/\//, "");

export const seo = {
  title: "Ominin — Facilitez vos opérations, propulsées par l'IA",
  description:
    "Ominin construit des outils qui retirent le travail répétitif du quotidien des commerces : menu et commande à table, click & collect, publication automatique de clips, et développements sur mesure.",
};

export const nav = {
  cta: {
    label: { fr: "Parlons-en", en: "Get in touch" },
    href: "/sur-mesure",
  },
};

export const hero = {
  eyebrow: {
    fr: "Solutions informatiques et IA",
    en: "Software and AI solutions",
  },
  /* Le titre est coupé en deux : la seconde moitié porte le dégradé braise. */
  titleLead: { fr: "Facilitez vos opérations,", en: "Facilitate your operations," },
  titleAccent: { fr: "propulsées par l'IA.", en: "powered by AI." },
  body: {
    fr: "Nous construisons des outils qui enlèvent le travail répétitif du quotidien des commerces — la prise de commande, la paperasse, la publication. Chaque produit règle un problème précis et s'utilise seul.",
    en: "We build tools that take the repetitive work out of running a business — taking orders, paperwork, publishing. Each product solves one problem, and works on its own.",
  },
  primaryCta: {
    label: { fr: "Découvrir nos produits", en: "See our products" },
    href: "#produits",
  },
  secondaryCta: {
    label: { fr: "Parler de votre besoin", en: "Tell us what you need" },
    href: "/sur-mesure",
  },
  meta: {
    fr: "Trois produits en production, un quatrième sur mesure.",
    en: "Three products in production, a fourth built to order.",
  },
  scrollHint: { fr: "Nos produits", en: "Our products" },
};

export type Product = {
  id: string;
  name: Localized;
  href: string;
  /** Host affiché sur le cube : la destination est explicite avant le clic. */
  destination: string;
  tagline: Localized;
  body: Localized;
  /** Utilitaire CSS de la trame de signature du produit (globals.css). */
  motif: string;
  /** Photo du cube, traitée en duotone braise par le composant. */
  photo: { src: string; alt: Localized };
  /** Trois traits saillants, en puces sous le descriptif. */
  chips: Localized[];
  /** Ancre du lien pour les lecteurs d'écran : « Ouvrir <name> ». */
  action: Localized;
};

const openLabel: Localized = { fr: "Ouvrir", en: "Open" };
const buildLabel: Localized = { fr: "Nous écrire", en: "Talk to us" };

export const products: Product[] = [
  {
    id: "menu",
    name: untranslated("Ominin Menu"),
    href: menuSiteUrl,
    destination: menuSiteUrl.replace(/^https?:\/\//, ""),
    tagline: {
      fr: "La salle prend les commandes toute seule",
      en: "The dining room takes its own orders",
    },
    body: {
      fr: "Menu digital derrière un QR code, commande et paiement à table. Sans application à installer pour le client.",
      en: "A digital menu behind a QR code, with ordering and payment at the table. No app for the guest to install.",
    },
    photo: {
      src: unsplash("photo-1552566626-52f8b828add9", 1600),
      alt: {
        fr: "Salle de restaurant chaleureuse, tables dressées",
        en: "Warm dining room with set tables",
      },
    },
    chips: [
      { fr: "QR à table", en: "QR at the table" },
      { fr: "Paiement à table", en: "Pay at the table" },
      { fr: "Commandes en direct", en: "Live orders" },
    ],
    motif: "qr-motif",
    action: openLabel,
  },
  {
    id: "collect",
    name: untranslated("Ominin Collect"),
    href: collectSiteUrl,
    destination: collectSiteUrl.replace(/^https?:\/\//, ""),
    tagline: {
      fr: "La vente à emporter, à votre nom",
      en: "Takeaway that stays yours",
    },
    body: {
      fr: "Votre page de commande à emporter, vos clients, vos données. À 10 % la commande là où les plateformes prennent jusqu'à 30 %.",
      en: "Your own takeaway ordering page, your customers, your data. 10% per order where the platforms take up to 30%.",
    },
    photo: {
      src: unsplash("photo-1778792331936-4a408b81c8ef", 1200),
      alt: {
        fr: "Remise d'un sac à emporter au comptoir",
        en: "Handing a takeaway bag over the counter",
      },
    },
    chips: [
      { fr: "Commande en ligne", en: "Online ordering" },
      { fr: "10 % par commande", en: "10% per order" },
      { fr: "Vos clients, vos données", en: "Your customers, your data" },
    ],
    motif: "collect-dash-motif",
    action: openLabel,
  },
  {
    id: "clip",
    name: untranslated("Ominin Clip"),
    href: clipSiteUrl,
    destination: clipSiteUrl.replace(/^https?:\/\//, ""),
    tagline: {
      fr: "Vos lives publiés pendant que vous dormez",
      en: "Your streams posted while you sleep",
    },
    body: {
      fr: "Les clips partent sur TikTok, Reels, Shorts et X. Titres et descriptions écrits par l'IA, adaptés à chaque plateforme.",
      en: "Clips go out to TikTok, Reels, Shorts and X. Titles and descriptions written by AI, tuned per platform.",
    },
    photo: {
      src: unsplash("photo-1574717024653-61fd2cf4d44d", 1200),
      alt: {
        fr: "Timeline de montage vidéo à l'écran",
        en: "Video editing timeline on screen",
      },
    },
    chips: [
      { fr: "4 plateformes", en: "4 platforms" },
      { fr: "Légendes par l'IA", en: "AI-written captions" },
      { fr: "Publication automatique", en: "Automatic publishing" },
    ],
    motif: "clip-timeline-motif",
    action: openLabel,
  },
  {
    id: "sur-mesure",
    name: { fr: "Sur mesure", en: "Custom build" },
    href: "/sur-mesure",
    destination: `${portalHost}/sur-mesure`,
    tagline: {
      fr: "Votre problème n'entre dans aucune case",
      en: "Your problem fits none of the boxes",
    },
    body: {
      fr: "Un traitement de factures, une prévision, un outil interne. Décrivez le travail répétitif qui vous coûte le plus — on regarde s'il s'automatise.",
      en: "Invoice processing, forecasting, an internal tool. Tell us which repetitive work costs you most — we'll see if it can be automated.",
    },
    photo: {
      src: unsplash("photo-1581291518857-4e27b48ff24e", 1600),
      alt: {
        fr: "Main dessinant une maquette d'interface au stylo",
        en: "Hand sketching an interface wireframe in pen",
      },
    },
    chips: [
      { fr: "Factures", en: "Invoices" },
      { fr: "Prévisions", en: "Forecasting" },
      { fr: "Outils internes", en: "Internal tools" },
    ],
    motif: "grid-motif",
    action: buildLabel,
  },
];

/*
 * Section « approche » : trois engagements numérotés, la seule partie du
 * portail qui parle de la maison plutôt que des produits. Volontairement
 * courte — la crédibilité passe par la précision, pas par le volume.
 */
export const approach = {
  eyebrow: { fr: "Notre approche", en: "How we work" },
  title: {
    fr: "Des outils qu'on utilise dès le premier jour.",
    en: "Tools you use from day one.",
  },
  points: [
    {
      title: { fr: "Simples par principe", en: "Simple on principle" },
      body: {
        fr: "Pas de formation, pas de manuel. Si votre équipe ne s'en sert pas le premier soir, c'est raté — on conçoit à partir de là.",
        en: "No training, no manual. If your team isn't using it by the first evening, we've failed — we design from that constraint.",
      },
    },
    {
      title: { fr: "L'IA là où elle sert", en: "AI where it earns its keep" },
      body: {
        fr: "Elle rédige, trie, prévoit, relit — jamais pour faire joli. Quand une règle simple suffit, on écrit une règle simple.",
        en: "It writes, sorts, forecasts, reviews — never for show. When a simple rule is enough, we write a simple rule.",
      },
    },
    {
      title: { fr: "Un seul interlocuteur", en: "One person to call" },
      body: {
        fr: "Conçu, développé et maintenu par Ominin. Vous parlez à ceux qui construisent, pas à un support qui transmet.",
        en: "Designed, built and maintained by Ominin. You talk to the people who build it, not a help desk relaying tickets.",
      },
    },
  ],
};

/*
 * Bande finale : le portail se referme sur l'appel au sur-mesure — les trois
 * produits ont leurs propres funnels, c'est la demande libre qu'on capte ici.
 */
export const finalCta = {
  titleLead: {
    fr: "Le travail répétitif n'est pas une fatalité.",
    en: "Repetitive work is not a given.",
  },
  body: {
    fr: "Décrivez le vôtre en quelques lignes — on vous répond sous deux jours ouvrés, franchement, y compris quand la réponse est non.",
    en: "Describe yours in a few lines — we reply within two business days, honestly, including when the answer is no.",
  },
  cta: {
    label: { fr: "Décrire mon besoin", en: "Describe my need" },
    href: "/sur-mesure",
  },
};

/*
 * Page /sur-mesure : la destination du quatrième cube. Elle explique ce qu'on
 * sait construire hors catalogue, puis ouvre un formulaire. Pas de prix — un
 * développement sur mesure se chiffre après discussion.
 */
export const surMesure = {
  seo: {
    title: "Ominin — Développements sur mesure propulsés par l'IA",
    description:
      "Traitement de factures, prévisions, outils internes : décrivez le travail répétitif qui vous coûte le plus, on regarde s'il s'automatise.",
  },
  eyebrow: { fr: "Sur mesure", en: "Custom build" },
  title: {
    fr: "Décrivez le travail qui vous coûte le plus.",
    en: "Tell us which work costs you the most.",
  },
  body: {
    fr: "Nos trois produits couvrent des besoins fréquents. Le reste se construit. Si une tâche vous prend des heures chaque semaine et suit toujours les mêmes règles, elle est probablement automatisable — dites-nous laquelle, on vous répond franchement, y compris quand la réponse est non.",
    en: "Our three products cover common needs. The rest gets built. If a task eats hours every week and always follows the same rules, it can probably be automated — tell us which one, and we'll answer honestly, including when the answer is no.",
  },
  examples: {
    heading: { fr: "Ce que ça peut être", en: "What that can look like" },
    items: [
      {
        title: { fr: "Factures fournisseurs", en: "Supplier invoices" },
        body: {
          fr: "Les factures arrivent en PDF ou en photo, les lignes se rangent toutes seules dans votre suivi de coûts.",
          en: "Invoices arrive as PDFs or photos; the line items file themselves into your cost tracking.",
        },
      },
      {
        title: { fr: "Prévisions", en: "Forecasting" },
        body: {
          fr: "Ce que vous allez vendre la semaine prochaine, à partir de votre historique — pour commander juste.",
          en: "What you'll sell next week, from your own history — so you order the right amount.",
        },
      },
      {
        title: { fr: "Outils internes", en: "Internal tools" },
        body: {
          fr: "Le tableur partagé qui tient votre activité, transformé en vrai outil que votre équipe peut utiliser.",
          en: "The shared spreadsheet holding your business together, turned into a real tool your team can use.",
        },
      },
    ],
  },
  form: {
    heading: { fr: "Parlons-en", en: "Get in touch" },
    note: {
      fr: "On répond sous deux jours ouvrés.",
      en: "We reply within two business days.",
    },
    name: {
      label: { fr: "Votre nom", en: "Your name" },
      placeholder: { fr: "Camille Rossi", en: "Camille Rossi" },
    },
    email: {
      label: { fr: "E-mail", en: "Email" },
      placeholder: { fr: "camille@monrestaurant.fr", en: "camille@mybusiness.com" },
    },
    company: {
      label: { fr: "Votre commerce", en: "Your business" },
      optional: { fr: "facultatif", en: "optional" },
      placeholder: { fr: "Trattoria Lucia", en: "Trattoria Lucia" },
    },
    message: {
      label: { fr: "Ce que vous aimeriez automatiser", en: "What you'd like to automate" },
      placeholder: {
        fr: "Chaque lundi je ressaisis les factures de la semaine dans un tableur, ça me prend deux heures…",
        en: "Every Monday I retype the week's invoices into a spreadsheet, it takes me two hours…",
      },
    },
    submit: { fr: "Envoyer", en: "Send" },
    sending: { fr: "Envoi…", en: "Sending…" },
    success: {
      title: { fr: "C'est envoyé.", en: "Sent." },
      body: {
        fr: "On revient vers vous par e-mail sous deux jours ouvrés.",
        en: "We'll get back to you by email within two business days.",
      },
    },
    error: {
      fr: "L'envoi a échoué. Réessayez, ou écrivez-nous directement.",
      en: "Sending failed. Try again, or email us directly.",
    },
    back: { fr: "Retour aux produits", en: "Back to products" },
  },
};

export const footer = {
  tagline: {
    fr: "Solutions informatiques et IA pour les commerces.",
    en: "Software and AI solutions for local businesses.",
  },
  productsHeading: { fr: "Produits", en: "Products" },
  contactHeading: { fr: "Contact", en: "Contact" },
  /* Année du copyright : figée ici plutôt que calculée, la page étant
     prérendue au build — un new Date() côté client désynchroniserait
     l'hydratation au passage à l'année suivante. À mettre à jour à la main. */
  copyrightYear: "2026",
  contact: { fr: "Nous écrire", en: "Contact" },
};

export const languageToggle = {
  /** Libellé de l'action : on annonce la langue vers laquelle on bascule. */
  label: {
    fr: "Switch to English",
    en: "Passer en français",
  } satisfies Localized,
};

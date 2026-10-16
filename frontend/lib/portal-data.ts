import { pexels, unsplash } from "@/lib/menu/images";
import {
  agentsSiteUrl,
  clipSiteUrl,
  collectSiteUrl,
  menuSiteUrl,
  shopSiteUrl,
  siteUrl,
} from "@/lib/site";

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
    "Ominin construit des outils qui retirent le travail répétitif du quotidien des commerces : menu et commande à table, click & collect, boutique en ligne, publication automatique de clips, et développements sur mesure.",
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
  /** Une ligne par entrée ; la marquée reçoit le pavé braise. */
  lines: [
    { text: { fr: "Facilitez", en: "Facilitate" } },
    { text: { fr: "vos opérations,", en: "your operations," } },
    { text: { fr: "propulsées", en: "powered" } },
    { text: { fr: "par l'IA.", en: "by AI." }, mark: true },
  ],
  body: {
    fr: "Nous construisons des outils qui enlèvent le travail répétitif du quotidien des commerces — la prise de commande, la vente en ligne, la paperasse, la publication. Chaque produit règle un problème précis et s'utilise seul.",
    en: "We build tools that take the repetitive work out of running a business — taking orders, selling online, paperwork, publishing. Each product solves one problem, and works on its own.",
  },
  primaryCta: {
    label: { fr: "Découvrir nos produits", en: "See our products" },
    href: "#produits",
  },
  secondaryCta: {
    label: { fr: "Parler de votre besoin", en: "Tell us what you need" },
    href: "/sur-mesure",
  },
  stats: [
    { value: "5", label: { fr: "produits en production", en: "products in production" } },
    { value: "1", label: { fr: "seul interlocuteur, qui construit", en: "person to call, who builds it" } },
    { value: "48 h", label: { fr: "pour vous répondre, jours ouvrés", en: "to reply, business days" } },
  ],
};

/*
 * Fil du hero : ce qui se passe chez nos clients pendant qu'on lit la page,
 * un événement par produit. Les cartes tombent une à une (relais du kit).
 */
export const heroFeed = {
  label: { fr: "Chez nos clients, en ce moment", en: "At our clients', right now" },
  items: [
    {
      product: "Menu",
      text: { fr: "Table 12 a payé 40,00 € depuis son téléphone", en: "Table 12 paid €40.00 from their phone" },
      time: { fr: "à l'instant", en: "just now" },
    },
    {
      product: "Collect",
      text: { fr: "Camille passe prendre sa commande à 12:30", en: "Camille picks up her order at 12:30" },
      time: { fr: "1 min", en: "1 min" },
    },
    {
      product: "Shop",
      text: { fr: "Nouvelle commande MyBox : 135,00 €", en: "New MyBox order: €135.00" },
      time: { fr: "3 min", en: "3 min" },
    },
    {
      product: "Clip",
      text: { fr: "Clip publié sur TikTok, Reels et Shorts", en: "Clip posted to TikTok, Reels and Shorts" },
      time: { fr: "8 min", en: "8 min" },
    },
    {
      product: "Agents",
      text: { fr: "Un prospect a répondu : « Rappelez-moi demain »", en: "A prospect replied: “Call me tomorrow”" },
      time: { fr: "12 min", en: "12 min" },
    },
  ],
};

export const marquee: Localized[] = [
  { fr: "Restaurants", en: "Restaurants" },
  { fr: "Boulangeries", en: "Bakeries" },
  { fr: "Pizzerias", en: "Pizzerias" },
  { fr: "Créatrices", en: "Makers" },
  { fr: "Boutiques en ligne", en: "Online stores" },
  { fr: "Streamers", en: "Streamers" },
  { fr: "Artisans", en: "Tradespeople" },
  { fr: "Traiteurs", en: "Caterers" },
];

export const productsSection = {
  eyebrow: { fr: "Nos produits", en: "Our products" },
  title: { fr: "Un produit par problème.", en: "One product per problem." },
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
      fr: "Vos commandes à emporter, sans décrocher",
      en: "Takeaway orders, without picking up the phone",
    },
    body: {
      fr: "Pizzeria, pâtisserie, traiteur : vos clients commandent et payent sur votre site, pour tout de suite ou pour un autre jour. 10 % par commande là où les plateformes prennent jusqu'à 30 %.",
      en: "Pizzeria, pastry shop, caterer: your customers order and pay on your own site, for right now or for another day. 10% per order where the platforms take up to 30%.",
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
      { fr: "Site web inclus", en: "Website included" },
      { fr: "10 % par commande", en: "10% per order" },
    ],
    motif: "collect-dash-motif",
    action: openLabel,
  },
  {
    id: "shop",
    name: untranslated("Ominin Shop"),
    href: shopSiteUrl,
    destination: shopSiteUrl.replace(/^https?:\/\//, ""),
    tagline: {
      fr: "Vendez sous votre nom, pas en messages privés",
      en: "Sell under your name, not in your DMs",
    },
    body: {
      fr: "La boutique en ligne clé en main de celles et ceux qui vendent déjà sur Snapchat, Instagram ou TikTok : fait main, box, dropshipping. Paiement, livraison et commandes gérés depuis le téléphone.",
      en: "A turnkey online store for people already selling on Snapchat, Instagram or TikTok: handmade goods, boxes, dropshipping. Payments, shipping and orders run from a phone.",
    },
    photo: {
      src: pexels("7679680/pexels-photo-7679680.jpeg", 1200),
      alt: {
        fr: "Une créatrice prépare un coffret cadeau dans son atelier",
        en: "A maker packing a gift box in her studio",
      },
    },
    chips: [
      { fr: "Boutique à votre nom", en: "Store under your name" },
      { fr: "Paiement et livraison", en: "Payments and shipping" },
      { fr: "Un lien pour vos réseaux", en: "One link for your socials" },
    ],
    motif: "shop-ribbon-motif",
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
    id: "agents",
    name: untranslated("Ominin Agents"),
    href: agentsSiteUrl,
    destination: agentsSiteUrl.replace(/^https?:\/\//, ""),
    tagline: {
      fr: "Vos prochains clients, contactés pendant que vous travaillez",
      en: "Your next clients, contacted while you work",
    },
    body: {
      fr: "Un agent trouve les entreprises de votre zone, leur écrit en votre nom depuis votre Gmail et vous signale chaque réponse.",
      en: "An agent finds the businesses in your area, writes to them in your name from your Gmail and flags every reply.",
    },
    photo: {
      src: pexels("4491870/pexels-photo-4491870.jpeg", 1200),
      alt: {
        fr: "Un menuisier répond à ses e-mails dans son atelier",
        en: "A carpenter answering emails in his workshop",
      },
    },
    chips: [
      { fr: "Prospection B2B", en: "B2B prospecting" },
      { fr: "Envoyé depuis votre Gmail", en: "Sent from your Gmail" },
      { fr: "Vous validez", en: "You approve" },
    ],
    motif: "agents-radar-motif",
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
 * Le manifeste : notre histoire, telle qu'elle sera dite dans la vidéo. Il
 * remplace la section « approche » — le portail dit d'abord pourquoi Ominin
 * existe. Une ligne par entrée, avec sa photo, allumée quand elle passe la ligne de
 * lecture ; « turn » marque le basculement, la signature referme le texte.
 */
export const manifesto = {
  eyebrow: { fr: "Notre histoire", en: "Our story" },
  lines: [
    {
      text: {
        fr: "Une machine peut calculer, répondre, prévoir, produire.",
        en: "A machine can calculate, answer, forecast, produce.",
      },
      photo: {
        src: unsplash("photo-1712238107639-46803a6c3886", 1200),
        alt: { fr: "Bras robotisé industriel dans une salle d'essai sombre", en: "Industrial robot arm in a dark test chamber" },
      },
    },
    {
      text: {
        fr: "Elle ne peut pas s'asseoir en face de quelqu'un et le comprendre sans un mot.",
        en: "It cannot sit across from someone and understand them without a word.",
      },
      photo: {
        src: unsplash("photo-1693913177577-6ea5604551f7", 1200),
        alt: { fr: "Deux personnes face à face à une terrasse de café, le soir", en: "Two people face to face at a café table at night" },
      },
    },
    {
      text: {
        fr: "Elle ne peut pas avoir peur, espérer, aimer.",
        en: "It cannot fear, hope, love.",
      },
      photo: {
        src: pexels("10638718/pexels-photo-10638718.jpeg", 1200),
        alt: { fr: "Deux mains qui se tendent l'une vers l'autre", en: "Two hands reaching for each other" },
      },
    },
    {
      text: {
        fr: "Elle ne peut pas laisser sa main sur une paroi pour dire j'ai existé.",
        en: "It cannot leave its hand on a cave wall to say: I existed.",
      },
      photo: {
        src: unsplash("photo-1791461787539-8faa9ba7fdfa", 1200),
        alt: { fr: "Mains préhistoriques peintes sur la roche, Cueva de las Manos", en: "Prehistoric hand stencils on rock, Cueva de las Manos" },
      },
    },
    {
      text: { fr: "Ça, c'est à nous.", en: "That is ours." },
      turn: true,
      photo: {
        src: "/portal/silex-etincelles.webp",
        alt: { fr: "Deux mains frappent une pierre et font jaillir des étincelles", en: "Two hands striking a stone, sending out sparks" },
      },
    },
    {
      text: {
        fr: "Nous sommes Ominin. Le nom de notre lignée, avec une lettre en moins.",
        en: "We are Ominin. The name of our lineage, minus one letter.",
      },
      photo: {
        src: unsplash("photo-1733768296211-17e2233b3630", 1200),
        alt: { fr: "Crâne fossile d'un ancêtre de l'homme", en: "Fossil skull of a human ancestor" },
      },
    },
    {
      text: {
        fr: "Pour ne jamais oublier d'où l'on vient, ni ce qui nous rend humains.",
        en: "So we never forget where we come from, or what makes us human.",
      },
      photo: {
        src: unsplash("photo-1534768654272-e97681c3a2c7", 1200),
        alt: { fr: "Main d'un bébé posée sur une main âgée", en: "A baby's hand resting on an old hand" },
      },
    },
    {
      text: {
        fr: "Que l'intelligence artificielle prenne le poids. Que l'humain garde le sens.",
        en: "Let artificial intelligence carry the weight. Let humans keep the meaning.",
      },
      photo: {
        src: "/portal/grotte-ominin.webp",
        alt: { fr: "Le logo d'Ominin peint à l'ocre sur une paroi", en: "The Ominin logo painted in ochre on a rock wall" },
      },
    },
  ],
  signature: {
    name: "Ominin.",
    motto: { fr: "Garder la main.", en: "Keep the upper hand." },
  },
};

/*
 * Bande finale : le portail se referme sur l'appel au sur-mesure — les quatre
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
  secondary: {
    label: { fr: "Revoir nos produits", en: "Back to our products" },
    href: "#produits",
  },
  microcopy: [
    { fr: "Réponse sous deux jours ouvrés", en: "Reply within two business days" },
    { fr: "Sans engagement", en: "No commitment" },
    { fr: "Un seul interlocuteur", en: "One person to call" },
  ],
};

/*
 * Page /sur-mesure : la destination du cinquième cube. Elle explique ce qu'on
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
    fr: "Nos cinq produits couvrent des besoins fréquents. Le reste se construit. Si une tâche vous prend des heures chaque semaine et suit toujours les mêmes règles, elle est probablement automatisable — dites-nous laquelle, on vous répond franchement, y compris quand la réponse est non.",
    en: "Our five products cover common needs. The rest gets built. If a task eats hours every week and always follows the same rules, it can probably be automated — tell us which one, and we'll answer honestly, including when the answer is no.",
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

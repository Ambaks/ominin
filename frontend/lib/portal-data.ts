import baiKoCaptures from "@/lib/pitch/bai-ko-captures.json";
import type { screenSizes } from "@/lib/pitch/kit";
import {
  agentsSiteUrl,
  clipSiteUrl,
  clubSiteUrl,
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
 * Le portail ne vend pas un produit : il pose le message (la vague de l'IA
 * est là, autant y entrer en premier), puis présente chaque produit en
 * quelques écrans — ceux que les commerciaux montrent en rendez-vous — avant
 * d'envoyer vers son sous-domaine. Pas de prix, pas de FAQ : chaque produit
 * porte déjà les siens.
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
const host = (url: string) => url.replace(/^https?:\/\//, "");

export const seo = {
  title: "Ominin — Entrez dans l'ère de l'IA avant vos concurrents",
  description:
    "Ominin construit des outils d'IA qui retirent le travail répétitif du quotidien des commerces : menu et commande à table, clubs, prospection automatique, boutique en ligne, click & collect, publication de clips, et développements sur mesure.",
};

export const nav = {
  cta: {
    label: { fr: "Parlons-en", en: "Get in touch" },
    href: "/sur-mesure",
  },
};

export const hero = {
  /** Une ligne par entrée ; la marquée reçoit le pavé braise. */
  lines: [
    { text: { fr: "L'IA change votre métier.", en: "AI is changing your trade." } },
    { text: { fr: "Prenez de l'avance,", en: "Get ahead," } },
    { text: { fr: "pas du retard.", en: "not left behind." }, mark: true },
  ],
  body: {
    fr: "Les commerces qui s'y mettent tôt auront moins de charges et plus de clients fidèles. Ominin vous donne ces outils dès aujourd'hui — déjà en service au Caffè Panis et au BOHO.",
    en: "The businesses that start early will have lower costs and more loyal customers. Ominin gives you these tools today — already running at Caffè Panis and BOHO.",
  },
  primaryCta: {
    label: { fr: "Découvrir les outils", en: "See the tools" },
    href: "#produits",
  },
  secondaryCta: {
    label: { fr: "Parler à un humain", en: "Talk to a person" },
    href: "/sur-mesure",
  },
  stats: [
    { value: "6", label: { fr: "outils, un interlocuteur", en: "tools, one person to call" } },
    { value: "0 €", label: { fr: "pour démarrer", en: "to get started" } },
    { value: "48 h", label: { fr: "pour vous répondre", en: "to get a reply" } },
  ],
};

/*
 * Scène du hero : un horizon de téléphones (les captures des démos, un
 * produit chacun), et par-dessus ce que fait Ominin au quotidien — un
 * exemple par produit, en notifications qui se relaient. Des exemples,
 * annoncés comme tels : pas un faux direct.
 */
export const heroScene: { src: string; alt: Localized }[] = [
  { src: "/pitch/decks/phone-fidelite.webp", alt: { fr: "La carte de fidélité d'une brasserie", en: "A brasserie's loyalty card" } },
  { src: "/pitch/club/phone-menu.webp", alt: { fr: "La carte du club L'Étoile", en: "L'Étoile's club menu" } },
  { src: `/pitch/bai-ko/${baiKoCaptures["phone-menu"]}`, alt: { fr: "La carte de Baï-Ko, ses bibimbaps en photo", en: "Baï-Ko's menu, its bibimbaps in photos" } },
  { src: "/social/screens/collect-commande.jpg", alt: { fr: "Une commande à emporter à la Trattoria Lucia", en: "A takeaway order at Trattoria Lucia" } },
  { src: "/shop/landing/vitrine-m.webp", alt: { fr: "La vitrine de la boutique MyBox", en: "The MyBox storefront" } },
];

export const heroFeed = {
  /** Une phrase pour les lecteurs d'écran, à la place des notifications. */
  caption: {
    fr: "Exemples : une commande payée à table, un retrait prêt au bar, des prospects trouvés, une commande de boutique, un retrait en cuisine, un clip publié.",
    en: "Examples: an order paid at the table, a pickup ready at the bar, prospects found, a store order, a kitchen pickup, a published clip.",
  },
  items: [
    { id: "menu" as const, product: "Menu", text: { fr: "Table 12 a commandé et payé : 40,00 €", en: "Table 12 ordered and paid: €40.00" } },
    { id: "club" as const, product: "Club", text: { fr: "N° 42 prêt dans 3 min au bar Rooftop", en: "No. 42 ready in 3 min at the Rooftop bar" } },
    { id: "agents" as const, product: "Agents", text: { fr: "18 prospects trouvés, un e-mail prêt à valider", en: "18 prospects found, one email ready to approve" } },
    { id: "shop" as const, product: "Shop", text: { fr: "Commande MyBox : 135,00 €, bon de préparation prêt", en: "MyBox order: €135.00, packing slip ready" } },
    { id: "collect" as const, product: "Collect", text: { fr: "Camille passe à 12:30, le ticket est sorti en cuisine", en: "Camille picks up at 12:30, the ticket is out in the kitchen" } },
    { id: "clip" as const, product: "Clip", text: { fr: "Clip publié sur TikTok, Reels et Shorts", en: "Clip posted to TikTok, Reels and Shorts" } },
  ],
};

export const marquee: Localized[] = [
  { fr: "Restaurants", en: "Restaurants" },
  { fr: "Bars", en: "Bars" },
  { fr: "Clubs", en: "Clubs" },
  { fr: "Boulangeries", en: "Bakeries" },
  { fr: "Pizzerias", en: "Pizzerias" },
  { fr: "Créatrices", en: "Makers" },
  { fr: "Artisans", en: "Tradespeople" },
  { fr: "Traiteurs", en: "Caterers" },
  { fr: "Streamers", en: "Streamers" },
];

export const productsSection = {
  eyebrow: { fr: "Nos produits", en: "Our products" },
  title: { fr: "Un produit par métier.", en: "One product per trade." },
  subtitle: {
    fr: "Choisissez le vôtre : chaque produit se présente en quelques écrans, ceux que nos commerciaux montrent en rendez-vous.",
    en: "Pick yours: each product is told in a few screens, the ones our sales team shows in meetings.",
  },
  /** Nom du groupe de la rangée, pour les lecteurs d'écran. */
  rowLabel: { fr: "Produit présenté", en: "Product shown" },
  openLabel: { fr: "Ouvrir", en: "Open" },
  demoLabel: { fr: "Voir la démo", en: "See the demo" },
  othersLabel: { fr: "Voir les autres produits", en: "See the other products" },
};

export type Screen = keyof typeof screenSizes;

/** Un écran du parcours : une capture des démos, ou une maquette rendue par le composant. */
export type Shot =
  | { kind: "image"; src: string; alt: Localized; screen?: Screen }
  | { kind: "mock"; mock: "agents" | "clip"; step: number };

export interface ProductStep {
  kicker: Localized;
  title: Localized;
  description: Localized;
  shot: Shot;
}

export type ProductId = "menu" | "club" | "agents" | "shop" | "collect" | "clip";

export type Product = {
  id: ProductId;
  name: Localized;
  /** Libellé court de la tuile dans la rangée. */
  short: string;
  /** À qui il s'adresse, sous le libellé de la tuile. */
  audience: Localized;
  href: string;
  /** Host affiché sur le bouton : la destination est explicite avant le clic. */
  destination: string;
  tagline: Localized;
  body: Localized;
  demo?: { label: Localized; href: string };
  steps: ProductStep[];
};

const ckl = (name: string) => `/pitch/groupe-ckl/${name}.jpg`;
const deck = (name: string) => `/pitch/decks/${name}.webp`;
const club = (name: string) => `/pitch/club/${name}.webp`;
const shop = (name: string) => `/shop/landing/${name}.webp`;
const social = (name: string) => `/social/screens/${name}.jpg`;

const image = (src: string, alt: Localized, screen?: Screen): Shot => ({ kind: "image", src, alt, screen });
const mock = (which: "agents" | "clip", step: number): Shot => ({ kind: "mock", mock: which, step });

export const products: Product[] = [
  {
    id: "menu",
    name: untranslated("Ominin Menu"),
    short: "Menu",
    audience: { fr: "Restaurants, bars, cafés", en: "Restaurants, bars, cafés" },
    href: menuSiteUrl,
    destination: host(menuSiteUrl),
    tagline: {
      fr: "La salle prend les commandes toute seule",
      en: "The dining room takes its own orders",
    },
    body: {
      fr: "Menu digital derrière un QR code, commande et paiement à table, fidélité et analyses comprises. Sans application à installer pour le client.",
      en: "A digital menu behind a QR code, ordering and payment at the table, loyalty and analytics included. No app for the guest to install.",
    },
    demo: { label: { fr: "La démo d'une brasserie", en: "A brasserie demo" }, href: `${menuSiteUrl}/demo/brasserie-laissac` },
    steps: [
      {
        kicker: { fr: "01 · Scanner", en: "01 · Scan" },
        title: { fr: "Scanner, choisir, commander.", en: "Scan, choose, order." },
        description: {
          fr: "Un QR code sur la table : la carte s'ouvre, à vos couleurs, sans application. Le client compose, choisit sa cuisson, laisse un pourboire s'il le souhaite.",
          en: "A QR code on the table: the menu opens in your colours, no app needed. The guest composes, picks the cooking, leaves a tip if they wish.",
        },
        shot: image(ckl("parcours-choisir"), { fr: "Un burger choisi sur la carte du Café des Arts, la cuisson au choix", en: "A burger picked from the Café des Arts menu, cooking to choose" }),
      },
      {
        kicker: { fr: "02 · Payer", en: "02 · Pay" },
        title: { fr: "Le paiement, dans la page.", en: "Payment, right in the page." },
        description: {
          fr: "Carte, Apple Pay ou Google Pay en un geste. L'argent part sur votre compte, le ticket sort en cuisine et en caisse.",
          en: "Card, Apple Pay or Google Pay in one tap. The money lands on your account, the ticket prints in the kitchen and at the till.",
        },
        shot: image(ckl("parcours-paiement"), { fr: "Le paiement dans la page : 24,50 €, payer par carte", en: "In-page payment: €24.50, pay by card" }),
      },
      {
        kicker: { fr: "03 · Servir", en: "03 · Serve" },
        title: { fr: "La salle sert, c'est tout.", en: "The staff serve. That's it." },
        description: {
          fr: "Plus de prise de commande ni d'encaissement : l'équipe apporte les plats. Appel serveur et suivi de la table compris.",
          en: "No more order-taking or cashing out: the team brings the dishes. Call-a-waiter and table tracking included.",
        },
        shot: image(ckl("parcours-servi"), { fr: "« Bon appétit ! » : la commande de la table 12 est servie", en: "“Enjoy!”: table 12's order has been served" }),
      },
      {
        kicker: { fr: "04 · Fidéliser", en: "04 · Retain" },
        title: { fr: "Une raison de revenir.", en: "A reason to come back." },
        description: {
          fr: "Des points à chaque commande, la roue du jour, et le combo parfait suggéré par l'IA après le plat principal.",
          en: "Points on every order, the daily wheel, and the perfect pairing suggested by AI after the main course.",
        },
        shot: image(deck("phone-fidelite"), { fr: "Ma carte : 87 points, le prochain palier, les récompenses", en: "My card: 87 points, the next tier, the rewards" }),
      },
      {
        kicker: { fr: "05 · Votre carte", en: "05 · Your menu" },
        title: { fr: "Votre carte, pas une autre.", en: "Your menu, no one else's." },
        description: {
          fr: "Vos couleurs, vos photos, vos formules, vos allergènes — modifiables en direct, depuis votre téléphone.",
          en: "Your colours, your photos, your set menus, your allergens — editable live, from your phone.",
        },
        shot: image(`/pitch/bai-ko/${baiKoCaptures["phone-menu"]}`, { fr: "La carte de Baï-Ko : les bibimbaps en photo, les allergènes", en: "Baï-Ko's menu: bibimbaps in photos, allergens" }),
      },
      {
        kicker: { fr: "06 · Piloter", en: "06 · Run it" },
        title: { fr: "Votre service, en direct.", en: "Your service, live." },
        description: {
          fr: "Les tables, les additions, vos chiffres, et chaque mois une analyse de vos données. Branché sur votre caisse et vos imprimantes.",
          en: "Tables, bills, your numbers, and a monthly analysis of your data. Plugged into your till and your printers.",
        },
        shot: image(ckl("salle-victoria"), { fr: "L'espace de gestion : chaque table, ce qu'elle a commandé, ce qui reste à servir", en: "The management space: every table, what it ordered, what's left to serve" }, "tablet"),
      },
    ],
  },
  {
    id: "club",
    name: untranslated("Ominin Club"),
    short: "Club",
    audience: { fr: "Clubs et discothèques", en: "Clubs and nightclubs" },
    href: clubSiteUrl,
    destination: host(clubSiteUrl),
    tagline: {
      fr: "Commander sans quitter la piste",
      en: "Order without leaving the dance floor",
    },
    body: {
      fr: "La carte du club derrière un QR code, payée d'avance, retirée au bar sans file. Et vos tables vendues avant la soirée.",
      en: "The club's menu behind a QR code, paid upfront, picked up at the bar with no queue. And your tables sold before the night.",
    },
    demo: { label: { fr: "Commander à L'Étoile", en: "Order at L'Étoile" }, href: `${menuSiteUrl}/demo/club` },
    steps: [
      {
        kicker: { fr: "01 · Scanner", en: "01 · Scan" },
        title: { fr: "Un QR sur chaque table, chaque pilier.", en: "A QR on every table, every pillar." },
        description: {
          fr: "On commande d'où l'on est, sans application. La carte du club s'ouvre dans le noir, à son identité.",
          en: "Guests order from wherever they stand, no app. The club's menu opens in the dark, in its own identity.",
        },
        shot: image(club("phone-scan"), { fr: "Le QR code de L'Étoile, scanné par un téléphone dans le club", en: "L'Étoile's QR code scanned by a phone in the club" }),
      },
      {
        kicker: { fr: "02 · Choisir", en: "02 · Choose" },
        title: { fr: "La carte, à jour en direct.", en: "The menu, updated live." },
        description: {
          fr: "Cocktails, bouteilles et leurs options. Une rupture se retire en un geste depuis le bar.",
          en: "Cocktails, bottles and their options. A sold-out item disappears in one tap from the bar.",
        },
        shot: image(club("phone-menu"), { fr: "La carte de L'Étoile : deux cocktails ajoutés, le bouton Commander", en: "L'Étoile's menu: two cocktails added, the Order button" }),
      },
      {
        kicker: { fr: "03 · Payer", en: "03 · Pay" },
        title: { fr: "Payé avant d'arriver au bar.", en: "Paid before reaching the bar." },
        description: {
          fr: "Carte, Apple Pay ou Google Pay. L'IA estime l'attente de chaque bar et envoie la commande vers celui qui sert le plus vite.",
          en: "Card, Apple Pay or Google Pay. AI estimates each bar's wait and routes the order to the one serving fastest.",
        },
        shot: image(club("phone-pay"), { fr: "Deux cocktails, 27 €, paiement accepté dans la page", en: "Two cocktails, €27, payment accepted in the page" }),
      },
      {
        kicker: { fr: "04 · Retirer", en: "04 · Collect" },
        title: { fr: "Le bar sert, il n'encaisse plus.", en: "The bar serves, it no longer cashes." },
        description: {
          fr: "Le ticket sort au bon bar avec un numéro. Le client reçoit une notification dès que c'est prêt et repart sans file.",
          en: "The ticket prints at the right bar with a number. The guest gets a notification when it's ready and leaves with no queue.",
        },
        shot: image(club("phone-ready"), { fr: "« C'est prêt ! » : le numéro 42 à récupérer au bar", en: "“It's ready!”: number 42 to collect at the bar" }),
      },
      {
        kicker: { fr: "05 · Soirées", en: "05 · Nights" },
        title: { fr: "Vos tables, vendues avant la soirée.", en: "Your tables, sold before the night." },
        description: {
          fr: "Chaque soirée a sa page : la date, l'ambiance, et le bouton pour choisir sa table. Acompte ou partage entre invités.",
          en: "Every night has its page: the date, the mood, and the button to pick a table. Deposit or split between guests.",
        },
        shot: image(deck("phone-soiree"), { fr: "La page de la soirée Orbite à L'Étoile : la date, le bouton Choisir ma table", en: "The Orbite night page at L'Étoile: the date, the Choose my table button" }),
      },
      {
        kicker: { fr: "06 · Tables", en: "06 · Tables" },
        title: { fr: "Bar, rooftop, salon VIP.", en: "Bar, rooftop, VIP lounge." },
        description: {
          fr: "Chaque zone a son prix et ses bouteilles. La liste d'invités se remplit toute seule, l'entrée se fait au téléphone.",
          en: "Each area has its price and its bottles. The guest list fills itself, entry is checked on a phone.",
        },
        shot: image(deck("phone-tables"), { fr: "Choisissez votre table : le bar, le rooftop, le salon VIP, chacun avec son prix", en: "Choose your table: the bar, the rooftop, the VIP lounge, each with its price" }),
      },
    ],
  },
  {
    id: "agents",
    name: untranslated("Ominin Agents"),
    short: "Agents",
    audience: { fr: "Artisans et services B2B", en: "Tradespeople and B2B services" },
    href: agentsSiteUrl,
    destination: host(agentsSiteUrl),
    tagline: {
      fr: "Vos prochains clients, contactés pendant que vous travaillez",
      en: "Your next clients, contacted while you work",
    },
    body: {
      fr: "Un agent trouve les entreprises de votre zone, leur écrit en votre nom depuis votre Gmail et vous signale chaque réponse. Vous gardez la main.",
      en: "An agent finds the businesses in your area, writes to them in your name from your Gmail and flags every reply. You stay in control.",
    },
    steps: [
      {
        kicker: { fr: "01 · Votre activité", en: "01 · Your business" },
        title: { fr: "Décrivez votre activité.", en: "Describe your business." },
        description: {
          fr: "Vos services, vos points forts, les entreprises que vous visez et votre zone. Cinq minutes, une seule fois.",
          en: "Your services, your strengths, the businesses you target and your area. Five minutes, once.",
        },
        shot: mock("agents", 0),
      },
      {
        kicker: { fr: "02 · Votre Gmail", en: "02 · Your Gmail" },
        title: { fr: "Connectez votre Gmail.", en: "Connect your Gmail." },
        description: {
          fr: "Les e-mails partent de votre adresse, signés de votre nom. Les réponses arrivent dans votre boîte, comme d'habitude.",
          en: "Emails leave from your address, signed with your name. Replies land in your inbox, as usual.",
        },
        shot: mock("agents", 1),
      },
      {
        kicker: { fr: "03 · L'agent", en: "03 · The agent" },
        title: { fr: "Il cherche, il trouve, il écrit.", en: "It searches, finds and writes." },
        description: {
          fr: "À chaque heure de votre créneau, il repère de nouvelles entreprises, trouve leur contact et rédige un e-mail propre à chacune. Jamais deux fois la même adresse.",
          en: "Every hour in your window, it spots new businesses, finds their contact and writes an email specific to each. Never the same address twice.",
        },
        shot: mock("agents", 2),
      },
      {
        kicker: { fr: "04 · Les réponses", en: "04 · The replies" },
        title: { fr: "Vous récoltez les réponses.", en: "You collect the replies." },
        description: {
          fr: "Il classe chaque réponse, vous prépare un brouillon et vous alerte. Il ne vous reste qu'à rappeler.",
          en: "It sorts every reply, drafts your answer and alerts you. All that's left is to call back.",
        },
        shot: mock("agents", 3),
      },
    ],
  },
  {
    id: "shop",
    name: untranslated("Ominin Shop"),
    short: "Shop",
    audience: { fr: "Créatrices, box, dropshipping", en: "Makers, boxes, dropshipping" },
    href: shopSiteUrl,
    destination: host(shopSiteUrl),
    tagline: {
      fr: "Vendez sous votre nom, pas en messages privés",
      en: "Sell under your name, not in your DMs",
    },
    body: {
      fr: "La boutique en ligne clé en main de celles et ceux qui vendent déjà sur Snapchat, Instagram ou TikTok. Paiement, livraison et commandes gérés depuis le téléphone.",
      en: "A turnkey online store for people already selling on Snapchat, Instagram or TikTok. Payments, shipping and orders run from a phone.",
    },
    demo: { label: { fr: "La boutique MyBox", en: "The MyBox store" }, href: `${shopSiteUrl}/mybox` },
    steps: [
      {
        kicker: { fr: "01 · La story", en: "01 · The story" },
        title: { fr: "Elle touche le lien de votre bio.", en: "She taps the link in your bio." },
        description: {
          fr: "Vous postez comme d'habitude. Votre boutique s'ouvre à votre nom : pas d'application à installer, pas de compte à créer.",
          en: "You post as usual. Your store opens under your name: no app to install, no account to create.",
        },
        shot: image(shop("vitrine-m"), { fr: "La vitrine MyBox sur un téléphone : les box beauté, la livraison offerte", en: "The MyBox storefront on a phone: beauty boxes, free shipping" }),
      },
      {
        kicker: { fr: "02 · Sa box", en: "02 · Her box" },
        title: { fr: "Elle choisit, à sa façon.", en: "She chooses, her way." },
        description: {
          fr: "Un parfum, une taille, une initiale : les options et la personnalisation que vous proposez, sans conversation à relire. Puis carte, Apple Pay ou Google Pay en deux touches.",
          en: "A scent, a size, an initial: the options and personalisation you offer, with no chat to reread. Then card, Apple Pay or Google Pay in two taps.",
        },
        shot: image(shop("produit-m"), { fr: "La box Signature : ses options, l'initiale, le bouton Ajouter", en: "The Signature box: its options, the initial, the Add button" }),
      },
      {
        kicker: { fr: "03 · Votre espace", en: "03 · Your space" },
        title: { fr: "La commande vous arrive, payée.", en: "The order reaches you, paid." },
        description: {
          fr: "Adresse saisie, options et message cadeau compris. Vous imprimez le bon de préparation, saisissez le numéro de suivi : l'e-mail d'expédition part tout seul.",
          en: "Address entered, options and gift message included. You print the packing slip, enter the tracking number: the shipping email goes out by itself.",
        },
        shot: image(shop("gestion-m"), { fr: "L'espace de gestion sur téléphone : la commande payée, prête à préparer", en: "The management space on a phone: the paid order, ready to prepare" }),
      },
      {
        kicker: { fr: "04 · Grand écran", en: "04 · Big screen" },
        title: { fr: "Une vraie boutique, sur ordinateur aussi.", en: "A real store, on desktop too." },
        description: {
          fr: "Le même catalogue, les mêmes photos, à votre identité. Codes promo, seuil de livraison offerte et messages clients gérés au même endroit.",
          en: "The same catalogue, the same photos, in your identity. Promo codes, free-shipping threshold and customer messages handled in one place.",
        },
        shot: image(shop("vitrine-d"), { fr: "La vitrine MyBox sur ordinateur", en: "The MyBox storefront on desktop" }, "desktop"),
      },
    ],
  },
  {
    id: "collect",
    name: untranslated("Ominin Collect"),
    short: "Collect",
    audience: { fr: "Pizzerias, traiteurs, pâtisseries", en: "Pizzerias, caterers, pastry shops" },
    href: collectSiteUrl,
    destination: host(collectSiteUrl),
    tagline: {
      fr: "Vos commandes à emporter, sans décrocher",
      en: "Takeaway orders, without picking up the phone",
    },
    body: {
      fr: "Vos clients commandent et payent sur votre page, pour tout de suite ou pour un autre jour. La commande tombe en cuisine déjà réglée.",
      en: "Your customers order and pay on your own page, for right now or for another day. The order lands in the kitchen already paid.",
    },
    demo: { label: { fr: "Jouer les deux rôles", en: "Play both roles" }, href: `${collectSiteUrl}/demo` },
    steps: [
      {
        kicker: { fr: "01 · Le lien", en: "01 · The link" },
        title: { fr: "Il ouvre votre page, il choisit son heure.", en: "They open your page and pick a time." },
        description: {
          fr: "Un lien à votre nom, sur Google, Instagram ou votre vitrine. Dès que possible ou un créneau de 15 minutes, dans vos horaires seulement.",
          en: "A link under your name, on Google, Instagram or your shopfront. As soon as possible or a 15-minute slot, within your hours only.",
        },
        shot: image(social("collect-commande"), { fr: "La carte de la Trattoria Lucia : trois pizzas et pâtes au panier, 40,00 €", en: "Trattoria Lucia's menu: three pizzas and pastas in the basket, €40.00" }),
      },
      {
        kicker: { fr: "02 · Le paiement", en: "02 · Payment" },
        title: { fr: "Il paye. Vous êtes réglé.", en: "They pay. You're paid." },
        description: {
          fr: "Par carte, directement sur votre compte. Pas de commande fantôme : la cuisine ne lance que ce qui est payé.",
          en: "By card, straight to your account. No ghost orders: the kitchen only starts what's been paid.",
        },
        shot: image(social("collect-paiement"), { fr: "Le paiement de la commande à emporter, dans la page", en: "Paying for the takeaway order, in the page" }),
      },
      {
        kicker: { fr: "03 · La cuisine", en: "03 · The kitchen" },
        title: { fr: "Le ticket sort, la préparation part.", en: "The ticket prints, prep begins." },
        description: {
          fr: "La commande apparaît en direct dans votre espace et sur votre imprimante cuisine. Un geste pour lancer la préparation et annoncer un délai.",
          en: "The order shows up live in your space and on your kitchen printer. One tap to start prep and announce a delay.",
        },
        shot: image(social("collect-gestion"), { fr: "Les commandes en direct : Camille, à emporter, payée en ligne, Commencer la préparation", en: "Live orders: Camille, takeaway, paid online, Start preparing" }),
      },
      {
        kicker: { fr: "04 · Le retrait", en: "04 · Pickup" },
        title: { fr: "« C'est prêt ! » Il passe, il repart.", en: "“It's ready!” They come, they go." },
        description: {
          fr: "Votre client suit l'avancement sur son téléphone, l'heure estimée par l'IA. Déjà payé : il récupère son sac et repart.",
          en: "Your customer follows progress on their phone, with the AI-estimated time. Already paid: they grab their bag and go.",
        },
        shot: image(social("collect-suivi"), { fr: "Le suivi de la commande : prête, à récupérer au comptoir", en: "Order tracking: ready, to collect at the counter" }),
      },
    ],
  },
  {
    id: "clip",
    name: untranslated("Ominin Clip"),
    short: "Clip",
    audience: { fr: "Streamers et clippers", en: "Streamers and clippers" },
    href: clipSiteUrl,
    destination: host(clipSiteUrl),
    tagline: {
      fr: "Vos lives publiés pendant que vous dormez",
      en: "Your streams posted while you sleep",
    },
    body: {
      fr: "Déposez un clip : les agents rédigent titre et description, puis le publient sur TikTok, Reels, Shorts et X. Vous gardez le montage, on s'occupe du reste.",
      en: "Drop a clip: the agents write the title and description, then post it to TikTok, Reels, Shorts and X. You keep the editing, we handle the rest.",
    },
    demo: { label: { fr: "L'espace clipper", en: "The clipper space" }, href: `${clipSiteUrl}/demo` },
    steps: [
      {
        kicker: { fr: "01 · Vos comptes", en: "01 · Your accounts" },
        title: { fr: "Connectez vos comptes.", en: "Connect your accounts." },
        description: {
          fr: "TikTok, YouTube Shorts, Instagram Reels, X : autant de comptes que vous voulez, une seule fois.",
          en: "TikTok, YouTube Shorts, Instagram Reels, X: as many accounts as you want, once.",
        },
        shot: mock("clip", 0),
      },
      {
        kicker: { fr: "02 · Le dépôt", en: "02 · The drop" },
        title: { fr: "Déposez vos clips.", en: "Drop your clips." },
        description: {
          fr: "Un fichier, et c'est tout. Pas de titre à inventer, pas de description à copier-coller d'un réseau à l'autre.",
          en: "One file, that's all. No title to invent, no description to copy-paste from one network to the next.",
        },
        shot: mock("clip", 1),
      },
      {
        kicker: { fr: "03 · Les agents", en: "03 · The agents" },
        title: { fr: "Les agents publient.", en: "The agents publish." },
        description: {
          fr: "Titre, description et hashtags rédigés pour chaque plateforme, publication aux heures qui marchent, 24 h/24.",
          en: "Title, description and hashtags written for each platform, posted at the hours that work, around the clock.",
        },
        shot: mock("clip", 2),
      },
      {
        kicker: { fr: "04 · L'échelle", en: "04 · Scale" },
        title: { fr: "Plus de comptes, pas plus de travail.", en: "More accounts, no more work." },
        description: {
          fr: "Dix comptes ou cinquante, la journée est la même : votre temps repart au montage.",
          en: "Ten accounts or fifty, your day stays the same: your time goes back to editing.",
        },
        shot: mock("clip", 3),
      },
    ],
  },
];

/* Maquettes des produits sans capture : l'agent, puis le clipper. */
export const agentsMock = {
  title: { fr: "Journal de l'agent", en: "Agent log" },
  profile: {
    heading: { fr: "Votre activité", en: "Your business" },
    rows: [
      { label: { fr: "Métier", en: "Trade" }, value: { fr: "Maçonnerie, rénovation", en: "Masonry, renovation" } },
      { label: { fr: "Zone", en: "Area" }, value: { fr: "Nîmes, 30 km", en: "Nîmes, 30 km" } },
      { label: { fr: "Cibles", en: "Targets" }, value: { fr: "Agences, syndics, architectes", en: "Agencies, property managers, architects" } },
    ],
  },
  gmail: {
    heading: { fr: "Compte connecté", en: "Account connected" },
    address: "contact@maconnerie-martin.fr",
    note: { fr: "Envoyé en votre nom, réponses dans votre boîte", en: "Sent in your name, replies in your inbox" },
  },
  entries: [
    { time: "08:47", text: { fr: "Recherche « rénovation à Nîmes »", en: "Searching “renovation in Nîmes”" }, detail: { fr: "18 entreprises trouvées", en: "18 businesses found" } },
    { time: "08:52", text: { fr: "Agence Lumen — adresse trouvée sur leur site", en: "Agence Lumen — address found on their site" }, detail: { fr: "Rénovation de mas en pierre : cible idéale", en: "Stone farmhouse renovations: ideal target" } },
    { time: "08:53", text: { fr: "E-mail rédigé pour Agence Lumen", en: "Email drafted for Agence Lumen" }, detail: { fr: "En attente de votre validation", en: "Awaiting your approval" }, pending: true },
    { time: "09:47", text: { fr: "Envoyé depuis votre boîte", en: "Sent from your inbox" }, detail: { fr: "Signé de votre nom", en: "Signed with your name" } },
  ],
  reply: {
    from: "Agence Lumen",
    time: "14:12",
    text: { fr: "« Intéressés, rappelez-nous demain matin. »", en: "“Interested, call us back tomorrow morning.”" },
    status: { fr: "Brouillon de réponse prêt", en: "Reply draft ready" },
  },
};

export const clipMock = {
  accounts: {
    heading: { fr: "Vos comptes", en: "Your accounts" },
    platforms: ["TikTok", "YouTube Shorts", "Instagram Reels", "X"],
    connected: { fr: "Connecté", en: "Connected" },
  },
  clip: {
    heading: { fr: "Votre clip", en: "Your clip" },
    file: "meilleur-moment-du-live.mp4",
    duration: "0:42",
    agentLine: { fr: "L'agent rédige : titre, description, hashtags", en: "The agent writes: title, description, hashtags" },
  },
  posts: [
    { platform: "TikTok", caption: { fr: "Il ne s'attendait PAS à ça 😳 #live #clip", en: "He did NOT see that coming 😳 #live #clip" }, status: { fr: "Publié · 14:02", en: "Posted · 14:02" }, live: true },
    { platform: "YouTube Shorts", caption: { fr: "La réaction la plus folle du stream d'hier", en: "The wildest reaction from yesterday's stream" }, status: { fr: "Publié · 14:02", en: "Posted · 14:02" }, live: true },
    { platform: "Instagram Reels", caption: { fr: "Ce moment restera dans l'histoire du live 🔥", en: "This moment goes down in stream history 🔥" }, status: { fr: "Publié · 14:03", en: "Posted · 14:03" }, live: true },
    { platform: "X", caption: { fr: "Le clip que tout le monde attendait…", en: "The clip everyone was waiting for…" }, status: { fr: "En file · 14:20", en: "Queued · 14:20" }, live: false },
  ],
  scale: {
    heading: { fr: "Cette semaine", en: "This week" },
    rows: [
      { value: "24", label: { fr: "comptes servis", en: "accounts served" } },
      { value: "312", label: { fr: "publications", en: "posts" } },
      { value: "0", label: { fr: "titre écrit à la main", en: "titles written by hand" } },
    ],
  },
};

/*
 * Pourquoi maintenant : ce que l'IA fait déjà, concrètement, dans nos
 * produits — l'argument du hero, prouvé par quatre cartes.
 */
export const whySection = {
  eyebrow: { fr: "Pourquoi maintenant", en: "Why now" },
  title: { fr: "L'IA n'est plus une option.", en: "AI is no longer optional." },
  subtitle: {
    fr: "Pas de promesse : voici ce qu'elle fait déjà, aujourd'hui, chez nos clients.",
    en: "No promises: here is what it already does, today, at our clients'.",
  },
  cards: [
    {
      stat: { fr: "± 1 min", en: "± 1 min" },
      title: { fr: "L'heure annoncée par l'IA", en: "The time, announced by AI" },
      body: {
        fr: "Au comptoir, au bar, en click & collect : nos modèles apprennent de votre historique et annoncent au client quand sa commande sera prête.",
        en: "At the counter, the bar, or for pickup: our models learn from your history and tell the customer when their order will be ready.",
      },
    },
    {
      stat: { fr: "1 rapport", en: "1 report" },
      title: { fr: "Des décisions sur des chiffres", en: "Decisions made on numbers" },
      body: {
        fr: "Chaque commande devient une donnée. Chaque mois, on vous présente ce qui se vend, quand, et ce que rapporte chaque heure travaillée.",
        en: "Every order becomes data. Every month, we show you what sells, when, and what each working hour brings in.",
      },
    },
    {
      stat: { fr: "24 h/24", en: "24/7" },
      title: { fr: "Des agents qui travaillent pour vous", en: "Agents that work for you" },
      body: {
        fr: "Prospection, rédaction, publication, suggestions à table : les tâches répétitives partent à l'agent, vous gardez la décision.",
        en: "Prospecting, writing, publishing, tableside suggestions: the repetitive work goes to the agent, you keep the decision.",
      },
    },
    {
      stat: { fr: "En prod", en: "Live" },
      title: { fr: "Chez de vrais clients", en: "At real clients" },
      body: {
        fr: "Restaurants, bars, boulangeries, clubs : nos produits tournent chaque jour à Toulouse, Montpellier et ailleurs — pas en démonstration.",
        en: "Restaurants, bars, bakeries, clubs: our products run every day in Toulouse, Montpellier and beyond — not just in demos.",
      },
    },
  ],
};

/*
 * Bande finale : le portail se referme sur l'appel au sur-mesure — les
 * produits ont leurs propres funnels, c'est la demande libre qu'on capte ici.
 */
export const finalCta = {
  titleLead: {
    fr: "La vague est là. Montez à bord avec nous.",
    en: "The wave is here. Climb aboard with us.",
  },
  body: {
    fr: "Décrivez votre commerce et ce qui vous coûte le plus de temps — on vous répond sous deux jours ouvrés, franchement, y compris quand la réponse est non.",
    en: "Describe your business and what costs you the most time — we reply within two business days, honestly, including when the answer is no.",
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
 * Page /sur-mesure : la destination de l'appel final. Elle explique ce qu'on
 * sait construire hors catalogue, puis ouvre un formulaire. Pas de prix — un
 * développement sur mesure se chiffre après discussion.
 */
export const surMesure = {
  seo: {
    title: "Ominin — Développements sur mesure propulsés par l'IA",
    description:
      "Traitement de factures, prévisions, outils internes : décrivez le travail répétitif qui vous coûte le plus, on regarde s'il s'automatise.",
  },
  destination: `${portalHost}/sur-mesure`,
  eyebrow: { fr: "Sur mesure", en: "Custom build" },
  title: {
    fr: "Décrivez le travail qui vous coûte le plus.",
    en: "Tell us which work costs you the most.",
  },
  body: {
    fr: "Nos six produits couvrent des besoins fréquents. Le reste se construit. Si une tâche vous prend des heures chaque semaine et suit toujours les mêmes règles, elle est probablement automatisable — dites-nous laquelle, on vous répond franchement, y compris quand la réponse est non.",
    en: "Our six products cover common needs. The rest gets built. If a task eats hours every week and always follows the same rules, it can probably be automated — tell us which one, and we'll answer honestly, including when the answer is no.",
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
  custom: { fr: "Sur mesure", en: "Custom build" },
};

export const languageToggle = {
  /** Libellé de l'action : on annonce la langue vers laquelle on bascule. */
  label: {
    fr: "Switch to English",
    en: "Passer en français",
  } satisfies Localized,
};

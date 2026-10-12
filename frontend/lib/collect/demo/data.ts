import { mapsDirectionsHref } from "@/lib/collect/shared";
import {
  type Allergen,
  brandName,
  DEMO_SLUG,
  getRestaurant,
  type MenuCategory,
  type MenuItem,
  restaurantThemeClass,
} from "@/lib/menu-data";

/*
 * Fixtures et réglages de la démo interactive Collect. L'unique endroit
 * avec des nombres : minuteries, horloge, persona, sous-ensemble du menu.
 * Les menus viennent de lib/menu-data.ts, jamais dupliqués. La même scène sert la
 * landing (Trattoria Lucia) et les démos client (/collect/demo/[slug]) :
 * tout ce qui dépend du restaurant passe par demoRestaurantInfo(slug),
 * buildDemoMenu(slug) et demoSettings(slug), le reste (copy, minuteries) est
 * partagé.
 */

/** Étapes de la démo : parcours client puis cycle de vie de la commande
 * (miroir du flux collect réel : en_attente → en_preparation → prete →
 * retiree ; payée en ligne, une commande ne se refuse pas). Une commande
 * pour demain est reçue « programmee » ; le restaurant la lance comme les
 * autres, l'horloge de la démo avance alors jusqu'à son créneau. */
export type DemoStep =
  | "menu"
  | "checkout"
  | "paiement"
  | "en_attente"
  | "programmee"
  | "en_preparation"
  | "prete"
  | "retiree";

/** Sous-ensemble du menu par restaurant : la démo de la landing montre un
 * extrait de la Trattoria (assez pour que la navigation par catégories ait
 * du sens dans un écran de téléphone, sans noyer le visiteur). Un client
 * démo sans entrée ici joue sa carte complète ; sans `take`, une catégorie
 * vient entière. */
const DEMO_MENU_SPEC: Record<string, { id: string; take?: number }[]> = {
  [DEMO_SLUG]: [
    { id: "antipasti", take: 3 },
    { id: "pizzas", take: 3 },
    { id: "pates", take: 2 },
    { id: "desserts", take: 2 },
    { id: "cocktails", take: 2 },
  ],
  boho: [
    { id: "a-partager", take: 3 },
    { id: "grillades", take: 3 },
    { id: "pizzas", take: 2 },
    { id: "desserts", take: 3 },
    { id: "cocktails", take: 3 },
  ],
  // La carte à emporter, les formules d'abord ; pas les plaques « À partager »,
  // servies chauffantes en salle (voir aussi DemoSettings.hiddenItems).
  "bai-ko": [
    { id: "formules" },
    { id: "anju" },
    { id: "bibimbap" },
    { id: "pad-thai" },
    { id: "ramyeon" },
    { id: "salades" },
    { id: "sides" },
    { id: "desserts" },
    { id: "boissons" },
  ],
};

/** Réglages propres à une démo client : sans entrée, la démo telle qu'elle a été livrée. */
export interface DemoSettings {
  /**
   * Heure de la démo à son ouverture, qui avance ensuite au rythme réel :
   * créneaux, heure de commande et « prête vers » se lisent à cette heure-là,
   * quelle que soit celle de la visite. Absente : l'heure de l'appareil.
   */
  startsAt?: string;
  /**
   * Le téléphone fait comme un vrai : lui seul aux couleurs du restaurant (la
   * page et l'écran du restaurant restent ceux d'Ominin, comme le produit),
   * la typo de sa carte, son logo en couverture, des cibles de 44 px, le
   * créneau en tête du paiement, un suivi qui rappelle retrait et commande.
   */
  realPhone?: boolean;
  /** Choix qui ne se vendent pas à emporter ; un groupe qui n'en garde qu'un, sans supplément, disparaît. */
  hiddenChoices?: RegExp;
  /** Articles (id) qui ne se vendent pas à emporter. */
  hiddenItems?: string[];
  /** Accroches de catégorie (id → texte) qui citent un choix caché. */
  taglines?: Record<string, string>;
  /** Commandes déjà prises par créneau, à la place de COLLECT_DEMO.slots.takenBySlot. */
  takenBySlot?: readonly number[];
  /** Le plat de la carte derrière un choix de formule (nom du choix → id) : ses allergènes. */
  choiceDishes?: Record<string, string>;
}

const DEMO_SETTINGS: Record<string, DemoSettings> = {
  "bai-ko": {
    // Un service du midi, quelle que soit l'heure de la visite.
    startsAt: "12:20",
    realPhone: true,
    // Le dolsot, bol de pierre chauffé, se sert en salle : Uber Eats vend les
    // quatre baps sans choix de version (demos/bai-ko/pitch/research/
    // delivery-ubereats.md). Question au gérant.
    hiddenChoices: /^Dolsot\b/,
    // Ni le Cheese Chicken Katsu ni le café ne sont proposés à emporter sur
    // Uber Eats (même fichier).
    hiddenItems: ["cheese-chicken-katsu", "cafe"],
    // Celle de la carte annonce la version Dolsot.
    taglines: { bibimbap: "Riz, légumes, garniture et œuf" },
    // Aucun créneau complet aujourd'hui : un trou dans les horaires se lirait comme un bug.
    takenBySlot: [2, 4, 3, 1],
    // Les formules nomment leurs plats autrement que la carte.
    choiceDishes: {
      "Mandu (x3)": "mandu",
      "Nems (x2)": "nem",
      "Bibimbap Beef": "beef-bulgogi-bap",
      "Bibimbap Chicken sweet": "dak-bap-sweet",
      "Bibimbap Chicken spicy (épicé)": "dak-bap-spicy",
      "Bibimbap Tofu": "tofu-bap",
      "Pad Thaï Beef": "pad-thai-beef",
      "Pad Thaï Chicken": "pad-thai-chicken",
      "Pad Thaï Veggie": "pad-thai-veggie",
      "Salade Bœuf bulgogi": "beef-salad",
      "Salade Chicken (épicée)": "chicken-salad",
      "Salade Tofu": "tofu-salad",
    },
  },
};

/** Les allergènes du plat de la carte derrière chaque choix de formule (choiceDishes). */
export function choiceAllergens(slug: string = DEMO_SLUG): Map<string, Allergen[]> {
  const dishes = demoSettings(slug).choiceDishes ?? {};
  const items = new Map(
    (getRestaurant(slug)?.categories ?? []).flatMap((category) =>
      category.items.map((item) => [item.id, item] as const)
    )
  );
  return new Map(
    Object.entries(dishes).flatMap(([choice, id]) => {
      const allergens = items.get(id)?.allergens;
      return allergens ? [[choice, allergens] as const] : [];
    })
  );
}

export function demoSettings(slug: string = DEMO_SLUG): DemoSettings {
  return DEMO_SETTINGS[slug] ?? {};
}

export interface DemoMenuSection {
  id: string;
  name: string;
  /** Le nom dans la langue de la cuisine et l'accroche de la catégorie, comme sur la carte. */
  kicker?: MenuCategory["kicker"];
  tagline?: string;
  items: MenuItem[];
}

/** Les options d'un article sans les choix retirés de la vente à emporter. */
function withoutChoices(item: MenuItem, hidden: RegExp): MenuItem {
  if (!item.options) return item;
  return {
    ...item,
    options: item.options.flatMap((group) => {
      const choices = group.choices.filter((choice) => !hidden.test(choice.name));
      if (choices.length === group.choices.length) return [group];
      // Un seul choix restant ne se choisit plus, sauf s'il porte un supplément.
      return choices.length > 1 || choices[0]?.supplement ? [{ ...group, choices }] : [];
    }),
  };
}

export function buildDemoMenu(slug: string = DEMO_SLUG): DemoMenuSection[] {
  const restaurant = getRestaurant(slug);
  if (!restaurant) return [];
  const spec = DEMO_MENU_SPEC[slug];
  const { hiddenChoices, hiddenItems, taglines } = demoSettings(slug);
  const categories = spec
    ? spec.flatMap(({ id, take }) => {
        const category = restaurant.categories.find((entry) => entry.id === id);
        return category ? [{ ...category, items: category.items.slice(0, take) }] : [];
      })
    : restaurant.categories;
  return categories.map(({ id, name, kicker, tagline, items }) => ({
    id,
    name,
    kicker,
    tagline: taglines?.[id] ?? tagline,
    items: items
      .filter((item) => !hiddenItems?.includes(item.id))
      .map((item) => (hiddenChoices ? withoutChoices(item, hiddenChoices) : item)),
  }));
}

/** Identité du restaurant joué par la démo (volets client et restaurant). */
export interface DemoRestaurantInfo {
  /** Le nom des écrans du personnel et des tickets. */
  name: string;
  /** Le nom tel que la marque l'écrit (Baï-Kō) : celui que lit le client. */
  brandName: string;
  tagline: string;
  address: string;
  coverImage?: string;
  logo?: string;
  /** Le logo écrit déjà le nom : le téléphone ne le retape pas. */
  logoIsName?: boolean;
  /** Sa marque en petit (l'icône d'écran d'accueil), pour la barre collée du téléphone. */
  mark?: string;
  /** Le premier argument de la carte (« 100 % halal »), repris par le bandeau « À emporter ». */
  highlight?: string;
  /** Thème de sa carte, porté par le seul téléphone : l'écran du restaurant reste celui d'Ominin. */
  themeClass?: string;
  itineraryUrl: string;
}

/**
 * La commande racontée par la landing (hero, parcours) : une pizza, des
 * pâtes, un dessert de la carte jouée par la démo — la même histoire d'un
 * bout à l'autre de la page.
 */
export function demoShowcaseOrder(slug: string = DEMO_SLUG) {
  const sections = buildDemoMenu(slug);
  const lines = ["pizzas", "pates", "desserts"].flatMap((id) => {
    const item = sections.find((section) => section.id === id)?.items[0];
    return item ? [item] : [];
  });
  return {
    restaurant: getRestaurant(slug)!.name,
    lines,
    total: lines.reduce((sum, item) => sum + item.price, 0),
  };
}

export function demoRestaurantInfo(slug: string = DEMO_SLUG): DemoRestaurantInfo {
  const restaurant = getRestaurant(slug)!;
  return {
    name: restaurant.name,
    brandName: brandName(restaurant),
    tagline: restaurant.tagline,
    address: restaurant.address,
    coverImage: restaurant.coverImage,
    logo: restaurant.logo,
    logoIsName: restaurant.logoIsName,
    mark: restaurant.icons?.homeScreen,
    highlight: restaurant.highlights?.[0],
    themeClass: restaurantThemeClass(slug),
    itineraryUrl: mapsDirectionsHref(`${restaurant.name}, ${restaurant.address}`),
  };
}

export const COLLECT_DEMO = {
  timings: {
    /** Faux paiement Stripe côté téléphone. */
    paymentMs: 1600,
    /** « Webhook » : différé avant l'apparition côté restaurant. */
    orderArrivalMs: 900,
    /** Inactivité avant que la puce guide fasse respirer le prochain bouton. */
    hintDelayMs: 3500,
    /** Tic du compte à rebours affiché sur le téléphone. */
    countdownTickMs: 1000,
  },
  // Un numéro de fiction : la plage 06 39 98 est réservée par l'ARCEP.
  customer: { name: "Camille", phone: "06 39 98 42 17" } as const,
  /**
   * Le rail passe à une catégorie quand son titre entre dans ce haut de la
   * zone de défilement, sous la barre collante (fraction de sa hauteur).
   */
  railFollowFraction: 1 / 3,
  /** Réglages des créneaux de retrait pour la démo. */
  slots: {
    /** Ouverture du service : demain, les créneaux partent de là (comme le vrai collect). */
    opensAt: "12:00",
    /** Temps de préparation de base (minutes) — décale le premier créneau. */
    prepMinutes: 15,
    /** Une commande à créneau est prête ce temps avant lui (minutes). */
    readyLeadMinutes: 5,
    /** Intervalle entre chaque créneau (minutes). */
    intervalMinutes: 15,
    /** Nombre de créneaux proposés après « Dès que possible ». */
    count: 4,
    /** Capacité par créneau (commandes). */
    capacity: 5,
    /** Commandes déjà « prises » sur certains créneaux (index 0-based). */
    takenBySlot: [2, 4, 5, 1] as readonly number[],
  },
  /** Puce guide : la prochaine action, nommée — jamais d'auto-play. */
  hints: {
    menu: "Composez la commande sur le téléphone.",
    /** Panier commencé : la suite, c'est de le valider. */
    menuReady: "Validez le panier en bas du téléphone.",
    checkout: "Validez : le paiement est simulé.",
    paiement: "Paiement en cours…",
    /** Payée, pas encore à l'écran du restaurant (le différé « webhook »). */
    arriving: "Paiement reçu : la commande arrive côté restaurant…",
    en_attente: "À vous de jouer côté restaurant : lancez la préparation.",
    programmee: "Commande pour demain : lancez sa préparation, la démo avance jusqu'à son créneau.",
    en_preparation: "Votre client suit tout en direct. Marquez la commande prête.",
    prete: "Le client est prévenu — marquez-la retirée au comptoir.",
    retiree: "Et voilà : commandée, payée, retirée. Rejouez quand vous voulez.",
  } satisfies Record<DemoStep | "menuReady" | "arriving", string>,
  /** Annonces lecteur d'écran (région aria-live du stage). Vide = silence. */
  announcements: {
    menu: "",
    checkout: "",
    paiement: "Paiement simulé en cours.",
    en_attente: "Commande envoyée au restaurant.",
    programmee: "Commande programmée pour demain.",
    en_preparation: "Préparation lancée.",
    prete: "Commande prête.",
    retiree: "Commande retirée. Démo terminée.",
  } satisfies Record<DemoStep, string>,
  /** Copy du suivi côté téléphone — miroir du vrai order-confirmation. */
  customerStatus: {
    en_attente: {
      title: "Commande reçue !",
      hint: "Le restaurant va la prendre en charge.",
    },
    // Comme order-confirmation : une commande pour demain est reçue comme les autres.
    programmee: {
      title: "Commande reçue !",
      hint: "Le restaurant la préparera pour votre créneau.",
    },
    en_preparation: {
      title: "En préparation",
      hint: "Votre commande est en cuisine.",
    },
    prete: {
      title: "C'est prêt !",
      hint: "Votre commande vous attend au comptoir.",
    },
    retiree: {
      title: "Commande retirée",
      hint: "Merci et à bientôt !",
    },
  } satisfies Partial<Record<DemoStep, { title: string; hint: string }>>,
  /** Micro-copy sous le bouton Payer — la démo assume qu'elle simule. */
  paymentNotice:
    "Démo — paiement simulé. Dans le vrai parcours : Stripe ou Square, versé sur le compte du restaurant.",
} as const;

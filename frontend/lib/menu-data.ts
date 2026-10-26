import { describeOpeningHours, type OpeningHours } from "@/lib/collect/hours";
import type { Formule } from "@/lib/gestion/types";
// Libellés, mise en forme et adresses de photos vivent dans lib/menu/format
// et lib/menu/images : un module client les importe de là, sans tirer ce
// registre dans son paquet.
import { formatPrice, formatsLine } from "@/lib/menu/format";
import { pexels, pexelsRecadre, unsplash } from "@/lib/menu/images";
import type { PairingNotes } from "@/lib/menu/pairings";
import type { SaisonSpots } from "@/lib/menu/saison";
import type { GarlandMotif, LoyaltyHistoryEntry, LoyaltyWheelConfig } from "@/lib/menu/loyalty";
import bohoAccords from "@/lib/menu/accords/boho.json";
import { veloursPalettes } from "@/components/menu/velours-palettes";
import cafeRicheAccords from "@/lib/menu/accords/cafe-riche.json";
import caffePanisAccords from "@/lib/menu/accords/caffe-panis.json";
import allergenesDemo from "@/lib/menu/allergenes-demo.json";
import rosemarieAccords from "@/lib/menu/accords/rosemarie.json";
import leNoveltyAccords from "@/lib/menu/accords/le-novelty.json";
import leVictoriaAccords from "@/lib/menu/accords/le-victoria.json";
import cafeDesArtsAccords from "@/lib/menu/accords/cafe-des-arts.json";
import brasserieLaissacAccords from "@/lib/menu/accords/brasserie-laissac.json";

export type Badge = "maison" | "top" | "nouveau";

export type Allergen =
  | "gluten"
  | "crustaces"
  | "oeuf"
  | "poisson"
  | "arachides"
  | "soja"
  | "lait"
  | "fruits-a-coque"
  | "celeri"
  | "moutarde"
  | "sesame"
  | "sulfites"
  | "lupin"
  | "mollusques";

/** Mentions qu'une carte imprime à côté d'un plat, hors piment. */
export type DishTag = "vegetarien" | "fermente";

export interface OptionChoice {
  id: string;
  name: string;
  supplement: number;
  /** false : épuisé, grisé sur la carte et refusé à la commande. Absent : disponible. */
  disponible?: boolean;
  /** Un tarif planifié vise ce format : `supplement` porte déjà son prix. */
  tarif?: AppliedTarif;
}

/** Un choix se commande tant qu'il n'est pas marqué épuisé. */
export const isChoiceAvailable = (choice: OptionChoice) => choice.disponible !== false;

/**
 * Un groupe obligatoire toujours affiché dont tous les choix sont épuisés rend
 * l'article impossible à commander, même en vente. Un groupe conditionnel
 * (`when`) ne bloque que si on l'ouvre : la feuille d'options s'en charge.
 */
export const hasBlockedRequiredGroup = (options: OptionGroup[] | undefined) =>
  (options ?? []).some(
    (group) =>
      group.obligatoire && !group.when && !group.choices.some(isChoiceAvailable)
  );

export interface OptionGroup {
  id: string;
  name: string;
  obligatoire: boolean;
  /**
   * Plusieurs choix cumulables dans le groupe — des suppléments, typiquement.
   * place_order additionne déjà les suppléments de toutes les lignes reçues,
   * rien à changer en base. undefined ⇒ choix unique.
   */
  multiple?: boolean;
  /**
   * Les choix sont les formats de l'article (25 cl, 50 cl, 1 L) : chacun se
   * lit à son prix entier, comme sur la carte, et non en supplément.
   */
  formats?: boolean;
  /** Le libellé du choix vide d'un groupe facultatif (« Sans sauce ») ; « Aucun » sinon. */
  aucun?: string;
  /**
   * Le groupe n'apparaît qu'une fois choisi l'un de ces choix d'un autre
   * groupe de l'article (la cuisson, quand le menu prend le steak) : caché,
   * il ne compte ni dans la validation, ni dans le prix, ni sur le ticket.
   * Côté client seulement : place_order et la gestion l'ignorent, le seed le
   * refuse (scripts/seed-restaurant.ts).
   */
  when?: { group: string; choices: string[] };
  choices: OptionChoice[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  badges?: Badge[];
  pairing?: string;
  /** Note de format/volume ("75 cl", "33 cl"). */
  detail?: string;
  /**
   * Les prix de tous les formats sur une ligne (« 25 cl 3,00 € · 50 cl
   * 5,70 € »), sous la description de la fiche. Pas dans `description` : la
   * feuille d'options les montre déjà, choix par choix.
   */
  tarifs?: string;
  /** Nom sur le ticket de cuisine, s'il diffère du nom de la carte. */
  printName?: string;
  /** undefined ⇒ disponible. */
  disponible?: boolean;
  /** undefined/null ⇒ stock illimité. */
  stock?: number | null;
  options?: OptionGroup[];
  /** Taux de TVA (%), pour l'envoi en caisse. undefined ⇒ 10 (défaut base). */
  vatRate?: number;
  /**
   * Délai de commande, en heures : en click & collect, le retrait se choisit
   * au plus tôt ce délai après la commande (place_order le vérifie).
   * undefined ⇒ commandable pour le prochain créneau.
   */
  noticeHours?: number;
  /*
   * Piment, mentions et allergènes tels que la carte de l'établissement les
   * imprime. Les allergènes se saisissent en gestion (items.allergens) ; le
   * reste vient du registre statique, rattaché par nom sur /menu/m
   * (lib/public-menu.ts). undefined ⇒ pas renseigné, pas « aucun » ;
   * [] ⇒ aucun des quatorze.
   */
  /** Force du piment, de 1 à 3 (🌶 à 🌶🌶🌶). */
  spice?: 1 | 2 | 3;
  /**
   * Boisson chaude rangée hors d'une catégorie « boissons: "chaudes" » (le
   * café d'une liste de boissons mêlées) : la salutation porte une tasse.
   */
  chaud?: true;
  tags?: DishTag[];
  allergens?: Allergen[];
  /**
   * Un tarif planifié s'applique en ce moment : `price` porte déjà le prix
   * pratiqué, et ceci dit d'où il vient. undefined ⇒ prix de la carte.
   */
  tarif?: AppliedTarif;
}

/** Les heures d'une règle de tarif (« 15:00:00 » à « 20:00:00 ») ; la fin peut passer minuit. */
export interface RuleHours {
  startsAt: string;
  endsAt: string;
}

/** Le tarif planifié en cours sur un article, tel qu'on l'explique au client. */
export interface AppliedTarif {
  /** Nom donné par le restaurant : « Tarif week-end ». */
  name: string;
  /** Prix de la carte, à barrer quand la règle est une remise. */
  basePrice: number;
  /** Absent : la règle vaut toute la journée, ou elle ne vise qu'un format (le sien porte ses heures). */
  hours?: RuleHours;
}

export interface MenuCategory {
  id: string;
  name: string;
  /** Le nom dans la langue de la cuisine, posé avant le titre (안주 avant « Anju »). */
  kicker?: { text: string; lang: string };
  tagline?: string;
  items: MenuItem[];
  /**
   * Rien que des boissons (registre seulement) : une commande faite de ces
   * seuls articles se salue « Bonne dégustation ! » au service (suivi) ;
   * une seule ligne d'ailleurs, ou une formule, et c'est « Bon appétit ! ».
   * « chaudes » : la salutation porte une tasse, sinon un verre à pied.
   */
  boissons?: true | "chaudes";
  /**
   * Section faite d'articles repris d'autres catégories (la happy hour) :
   * ceux qui viennent d'une catégorie de boissons, qui suivent sa règle
   * (pas d'allergènes sur la fiche) quand la section mêle plats et verres.
   */
  drinkItemIds?: string[];
  /**
   * Une longue liste à parcourir d'un coup d'œil : deux articles par rangée
   * au téléphone, la photo en vignette ronde à côté du nom (CompactCard).
   */
  compact?: true;
}

/**
 * Une annonce du bandeau défilant en haut de la carte, reprise du site de
 * l'établissement. accent : une offre ; brand : la signature de l'enseigne.
 */
export interface TickerItem {
  text: string;
  tone?: "accent" | "brand";
}

/**
 * Une affiche des offres (table affiches) : le visuel du gérant, qui défile
 * sous « Nos Offres », et les formules du jour placées dessus, de gauche à
 * droite, chacune ouverte par son bouton.
 */
export interface AfficheMenu {
  id: string;
  image: string;
  offres: number;
  formules: Formule[];
}

export type CategoryLayout = "top" | "rail" | "wheel";

/** La fidélité d'une carte d'aperçu ; la page rapproche les paliers de ses articles. */
export interface DemoLoyalty {
  pointsPerEuro: number;
  /** Du palier le moins cher au plus cher ; items : ids d'articles de la carte. */
  rewards: { id: string; label: string; points: number; items: string[] }[];
  /**
   * L'habitué que l'aperçu reconnaît d'emblée. Son solde est la somme de son
   * historique, daté à l'ouverture de l'aperçu (il y a `daysAgo` jours).
   */
  member: {
    contact: string;
    firstName: string;
    history: (Omit<LoyaltyHistoryEntry, "at"> & { daysAgo: number })[];
  };
}

export interface Restaurant {
  slug: string;
  /** Le nom des écrans du personnel et des tickets de cuisine. */
  name: string;
  /**
   * Le nom tel que l'enseigne l'écrit, pour la carte du client (titre de la
   * page, logo), quand il diffère de `name` : « Baï-Kō » face à « Baï-Ko ».
   */
  brandName?: string;
  tagline: string;
  /** undefined ⇒ hero typographique, sur le logo s'il y en a un. */
  coverImage?: string;
  /** Logo de l'établissement (chemin public), affiché dans le hero du menu. */
  logo?: string;
  /**
   * Logo tracé en blanc sur fond transparent, pour un fond sombre : la palette
   * Ominin l'inverse quand elle passe en clair, où il disparaîtrait.
   */
  whiteLogo?: boolean;
  /** Le logo écrit déjà le nom (un mot-symbole) : le hero et le pied de page ne le retapent pas, le titre reste lu. */
  logoIsName?: boolean;
  /** Logo du pied de page aux couleurs de l'enseigne (chemin public) ; la palette Ominin garde `logo`. */
  footerLogo?: string;
  /**
   * Icônes de l'établissement à la place de celles d'Ominin (chemins publics) :
   * l'onglet, un PNG de 32 × 32 (déclaré à sa taille, le navigateur le préfère
   * au favicon.ico d'Ominin), et le raccourci d'écran d'accueil d'iOS.
   */
  icons?: { tab: string; homeScreen: string };
  /**
   * Couleur de la barre du navigateur sur la version aux couleurs de
   * l'établissement (/menu/demo et /menu/m).
   */
  themeColor?: string;
  /** Tableau des allergènes publié par l'établissement, lié en pied de carte. */
  allergensUrl?: string;
  /** La mention allergènes de la carte papier, reprise en pied de carte. */
  allergensNote?: string;
  /** Ce qui pend à la guirlande de « Ma carte » (fidélité) ; des lanternes par défaut. */
  loyaltyMotif?: GarlandMotif;
  /**
   * La roue du jour d'un téléphone que la fidélité connaît, une fois sa
   * carte gagnante d'une commande réglée. Registre seulement : sur le vrai
   * menu, /api/fidelite/roue la passe au tirage en base (loyalty_wheel_spin) ;
   * l'aperçu la fait tourner dans le navigateur.
   */
  loyaltyWheel?: LoyaltyWheelConfig;
  /**
   * Fidélité d'une carte d'aperçu (/menu/demo) : en production, les paliers
   * vivent en base. Rien ne part, tout se garde dans le navigateur.
   */
  demoLoyalty?: DemoLoyalty;
  /**
   * Happy hour d'une carte d'aperçu (/menu/demo) : le nom de la règle et le
   * prix du moment de quelques articles. En production, ce sont les tarifs
   * planifiés ; l'aperçu l'ouvre autour de l'heure de la visite, pour qu'on
   * la voie n'importe quand.
   */
  demoHappyHour?: { name: string; prices: Record<string, number> };
  /**
   * Affiche de l'établissement (chemin public) portant déjà logo et nom :
   * elle tient lieu de hero à elle seule, sans texte superposé.
   */
  poster?: string;
  /** Les repères de l'habillage de saison sur l'affiche (lib/menu/saison). */
  saisonSpots?: SaisonSpots;
  /**
   * La même affiche en panorama (srcset), pour les écrans en paysage : en
   * hauteur, elle n'y occupait qu'une colonne entre deux marges floutées.
   */
  posterWide?: string;
  /**
   * Affiches des offres, de la plus ancienne à la plus récente. Sous
   * l'affiche du restaurant (poster), elles prennent la place de l'adresse
   * et du téléphone (qui restent en pied de page) ; sinon, la tête de la
   * section des formules.
   */
  affiches?: AfficheMenu[];
  /**
   * Affiches et formules dans une pastille en bas à gauche
   * (components/menu/formules-pill.tsx), plus en tête de carte.
   */
  formulesPill?: boolean;
  address: string;
  phone: string;
  hours: string;
  /** Arguments courts affichés sous le hero (halal, livraison, promotion). */
  highlights?: string[];
  /** Le bandeau défilant des annonces, en haut de la page. */
  ticker?: TickerItem[];
  /** Catégories en roue posée sur la carte (par défaut), en barre au-dessus
   * de la carte ou en rail d'icônes à gauche (etablissements.category_layout). */
  categoryLayout?: CategoryLayout;
  /** Les mots de la carte que l'établissement explique, repris au pied de carte. */
  glossary?: { term: string; definition: string }[];
  /**
   * L'accord du chef : par plat (son nom en base), ce qui l'accompagne. Le
   * panier le propose à partir de ce qui est déjà commandé, la feuille d'un
   * plat à côté de ses options. Registre seulement, la base n'en a pas.
   */
  pairings?: PairingNotes;
  categories: MenuCategory[];
  /**
   * Formules d'une carte d'aperçu (/menu/demo) : en production elles vivent
   * en base, à part de la carte, et la page les charge elle-même.
   */
  formules?: Formule[];
  /** Lien « laisser un avis Google », proposé en bas du menu. */
  googleReviewUrl?: string;
  /**
   * Identifiant de la fiche Google de l'établissement : le lien d'adresse
   * ouvre la fiche (voir mapsUrl). Registre seulement, la base n'en a pas.
   */
  placeId?: string;
  /** Aperçu d'un pitch qui présente l'estimateur IA comme livré : le ticket le nomme. */
  estimatorLive?: boolean;
  /** /menu/demo à table : « Payer en ligne » et le pourboire, comme chez un client qui règle à table. */
  onlinePayment?: boolean;
  /**
   * À table, chaque commande se suit au bas de l'écran jusqu'au service, comme
   * un ticket fast food — sur /m, en direct (reçue, encaissée, servie) ; sur
   * /menu/demo, le paiement en ligne et la salle se simulent. À réserver aux
   * établissements sans imprimante Omilink : son ticket clôt la commande à
   * l'encaissement, qui se dirait aussitôt « servie ».
   */
  suivi?: boolean;
  /**
   * Boutique en click & collect seul, sans service à table : le seed ouvre
   * le produit collect avec ces horaires, sans offre menu ni tables.
   */
  collect?: { openingHours: OpeningHours };
}

/**
 * Identifiant stable tiré d'un libellé accentué : « Viande hachée » →
 * viande-hachee, « Œuf » → oeuf, « ×6 » → 6. Les cartes en service lisent
 * les ids de leurs choix en base, posés au seed : les changer ici ne touche
 * que les démos et les seeds à venir.
 */
const slugLibelle = (label: string) =>
  label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Groupe tiré d'une liste de libellés, ids dérivés du groupe : à choix unique,
 * ou à choix multiples (`multiple`). Un libellé peut porter son propre
 * supplément, [libellé, supplément] ; sinon celui du groupe s'applique.
 */
const groupeChoix = (
  id: string,
  name: string,
  labels: readonly (string | readonly [string, number])[],
  {
    obligatoire = false,
    multiple = false,
    supplement = 0,
    prefixe = "",
    aucun,
    when,
  }: Partial<Pick<OptionGroup, "obligatoire" | "multiple" | "aucun" | "when">> & {
    supplement?: number;
    prefixe?: string;
  } = {}
): OptionGroup => ({
  id,
  name,
  obligatoire,
  ...(multiple && { multiple }),
  ...(aucun && { aucun }),
  ...(when && { when }),
  choices: labels.map((entry) => {
    const [label, prix] = typeof entry === "string" ? [entry, supplement] : entry;
    return { id: `${id}-${slugLibelle(label)}`, name: `${prefixe}${label}`, supplement: prix };
  }),
});

/** Cuisson d'une viande grillée, demandée à chaque commande. */
const CUISSON: OptionGroup = {
  id: "cuisson",
  name: "Cuisson",
  obligatoire: true,
  choices: [
    { id: "a-point", name: "À point", supplement: 0 },
    { id: "saignant", name: "Saignant", supplement: 0 },
    { id: "bleu", name: "Bleu", supplement: 0 },
    { id: "bien-cuit", name: "Bien cuit", supplement: 0 },
  ],
};

const trattoriaLucia: Restaurant = {
  slug: "trattoria-lucia",
  name: "Trattoria Lucia",
  tagline: "Cucina italiana · Depuis 1987",
  coverImage: unsplash("photo-1414235077428-338989a2e8c0", 1800),
  address: "14 rue des Lombards, Paris 4e",
  phone: "+33 1 42 00 00 00",
  hours: "12h–14h30 · 19h–23h",
  categories: [
    {
      id: "antipasti",
      name: "Antipasti & Planches",
      tagline: "Pour commencer, à partager",
      items: [
        {
          id: "planche-lucia",
          name: "Planche Lucia",
          description:
            "Charcuteries de Parme, pecorino affiné, artichauts grillés, focaccia tiède au romarin.",
          price: 24,
          image: unsplash("photo-1541529086526-db283c563270"),
          badges: ["top"],
          pairing: "Idéal avec un verre de Lambrusco frais",

        },
        {
          id: "burrata",
          name: "Burrata crémeuse",
          description:
            "Burrata des Pouilles, tomates confites, basilic, huile d'olive du lac de Garde.",
          price: 14,
          image: unsplash("photo-1608897013039-887f21d8c804", 400),
          badges: ["maison"],
        },
        {
          id: "carpaccio",
          name: "Carpaccio de bœuf",
          description:
            "Fines tranches de bœuf, copeaux de parmesan 24 mois, roquette, citron.",
          price: 16,
          image: unsplash("photo-1546549032-9571cd6b27df", 400),
        },
        {
          id: "arancini",
          name: "Arancini alla norma",
          description:
            "Croquettes de risotto à l'aubergine fumée, cœur de mozzarella, sauce tomate épicée.",
          price: 11,
          image: unsplash("photo-1595295333158-4742f28fbd85"),
          badges: ["nouveau"],
        },
      ],
    },
    {
      id: "pizzas",
      name: "Pizzas",
      tagline: "Pâte maturée 48h, four à bois",
      items: [
        {
          id: "margherita",
          name: "Margherita D.O.P.",
          description:
            "San Marzano, mozzarella fior di latte, basilic frais, huile d'olive extra vierge.",
          price: 14,
          image: unsplash("photo-1574071318508-1cdbab80d002"),
          badges: ["top"],

        },
        {
          id: "diavola",
          name: "Diavola",
          description:
            "Spianata calabraise piquante, oignons rouges, olives taggiasche, miel de piment.",
          price: 16,
          image: unsplash("photo-1604382354936-07c5d9983bd3", 400),
        },
        {
          id: "tartufo",
          name: "Tartufo nero",
          description:
            "Crème de truffe noire, mozzarella di bufala, champignons, noisettes torréfiées.",
          price: 19,
          image: unsplash("photo-1565299624946-b28f40a0ae38"),
          badges: ["nouveau"],
          pairing: "Idéal avec un Nebbiolo",
        },
        {
          id: "quattro",
          name: "Quattro formaggi",
          description:
            "Gorgonzola, taleggio, pecorino, fior di latte, poire rôtie et noix.",
          price: 17,
          image: unsplash("photo-1513104890138-7c749659a591"),
        },
      ],
    },
    {
      id: "pates",
      name: "Pâtes fraîches",
      tagline: "Façonnées chaque matin",
      items: [
        {
          id: "carbonara",
          name: "Spaghetti alla carbonara",
          description:
            "Guanciale croustillant, jaune d'œuf bio, pecorino romano, poivre noir de Sarawak.",
          price: 17,
          image: unsplash("photo-1612874742237-6526221588e3"),
          badges: ["top", "maison"],
          pairing: "Idéal avec un Frascati Superiore",

        },
        {
          id: "tagliatelle",
          name: "Tagliatelle al ragù",
          description:
            "Ragù de bœuf et porc mijoté 6 heures, parmesan, persil plat.",
          price: 18,
          image: unsplash("photo-1621996346565-e3dbc646d9a9", 400),
          badges: ["maison"],
        },
        {
          id: "risotto",
          name: "Risotto aux cèpes",
          description:
            "Carnaroli crémeux, cèpes poêlés, beurre noisette, parmesan 30 mois.",
          price: 21,
          image: unsplash("photo-1476124369491-e7addf5db371", 400),
        },
        {
          id: "linguine",
          name: "Linguine alle vongole",
          description:
            "Palourdes fraîches, vin blanc, ail, piment doux, persil.",
          price: 22,
          image: unsplash("photo-1563379926898-05f4575a45d8"),
        },
      ],
    },
    {
      id: "viandes",
      name: "Viandes",
      tagline: "Grillées au feu de bois",
      items: [
        {
          id: "tagliata",
          name: "Tagliata di manzo",
          description:
            "Entrecôte maturée tranchée, roquette, tomates cerises, balsamique 12 ans.",
          price: 29,
          image: unsplash("photo-1600891964092-4316c288032e"),
          badges: ["top"],
          pairing: "Idéal avec un Chianti Classico",

        },
        {
          id: "osso-buco",
          name: "Osso buco alla milanese",
          description:
            "Jarret de veau braisé, gremolata, risotto au safran.",
          price: 26,
          image: unsplash("photo-1534939561126-855b8675edd7"),
          badges: ["maison"],
        },
        {
          id: "scaloppine",
          name: "Scaloppine al limone",
          description: "Escalopes de veau, sauce citron, câpres, purée maison.",
          price: 23,
          image: unsplash("photo-1432139555190-58524dae6a55"),
        },
      ],
    },
    {
      id: "poissons",
      name: "Poissons",
      tagline: "Arrivage direct de Méditerranée",
      items: [
        {
          id: "polpo",
          name: "Polpo alla griglia",
          description:
            "Poulpe grillé, crème de pommes de terre fumée, huile au persil, citron brûlé.",
          price: 24,
          image: unsplash("photo-1599487488170-d11ec9c172f0", 400),
          badges: ["nouveau"],
          pairing: "Idéal avec un Vermentino",
        },
        {
          id: "branzino",
          name: "Branzino al forno",
          description:
            "Bar entier rôti, fenouil confit, olives taggiasche, tomates cerises.",
          price: 27,
          image: unsplash("photo-1467003909585-2f8a72700288", 400),
        },
        {
          id: "gamberoni",
          name: "Gamberoni all'aglio",
          description: "Gambas sautées à l'ail, piment, vin blanc, focaccia grillée.",
          price: 25,
          image: unsplash("photo-1565680018434-b513d5e5fd47"),
        },
      ],
    },
    {
      id: "desserts",
      name: "Desserts",
      tagline: "La dolce vita",
      items: [
        {
          id: "tiramisu",
          name: "Tiramisù de la nonna",
          description:
            "Mascarpone onctueux, café ristretto, cacao amer, savoiardi imbibés minute.",
          price: 9,
          image: unsplash("photo-1571877227200-a0d98ea607e9"),
          badges: ["top", "maison"],

        },
        {
          id: "panna-cotta",
          name: "Panna cotta vanille",
          description: "Coulis de fruits rouges, éclats de pistache de Bronte.",
          price: 8,
          image: unsplash("photo-1488477181946-6428a0291777", 400),
        },
        {
          id: "affogato",
          name: "Affogato al caffè",
          description: "Glace fior di latte noyée dans un espresso, amaretti.",
          price: 7,
          image: unsplash("photo-1579954115563-e72bf1381629"),
        },
      ],
    },
    {
      id: "cocktails",
      name: "Cocktails",
      tagline: "L'aperitivo comme à Milan",
      items: [
        {
          id: "negroni",
          name: "Negroni",
          description: "Gin, Campari, vermouth rouge, zeste d'orange.",
          price: 12,
          image: unsplash("photo-1551024709-8f23befc6f87", 400),
          badges: ["top"],
        },
        {
          id: "spritz",
          name: "Spritz Veneziano",
          description: "Aperol, prosecco, eau pétillante, olive verte.",
          price: 10,
          image: unsplash("photo-1514362545857-3bc16c4c7d1b", 400),
        },
        {
          id: "limoncello-spritz",
          name: "Limoncello spritz",
          description: "Limoncello artisanal, prosecco, menthe fraîche.",
          price: 11,
          image: unsplash("photo-1560512823-829485b8bf24"),
          badges: ["nouveau"],
        },
      ],
    },
    {
      id: "vins",
      name: "Vins",
      tagline: "Au verre ou à la bouteille",
      items: [
        {
          id: "chianti",
          name: "Chianti Classico D.O.C.G.",
          description: "Toscane · Sangiovese · verre 7€",
          price: 32,
          image: unsplash("photo-1510812431401-41d2bd2722f3", 400),
        },
        {
          id: "vermentino",
          name: "Vermentino di Sardegna",
          description: "Sardaigne · blanc sec et minéral · verre 6€",
          price: 28,
          image: pexels("19030979/pexels-photo-19030979.jpeg", 400),
        },
        {
          id: "prosecco",
          name: "Prosecco Superiore",
          description: "Valdobbiadene · brut · verre 6,50€",
          price: 30,
          image: unsplash("photo-1592483648228-b35146a4330c"),
        },
        {
          id: "nebbiolo",
          name: "Nebbiolo Langhe",
          description: "Piémont · élégant et structuré · verre 8€",
          price: 38,
          image: unsplash("photo-1553361371-9b22f78e8b1d"),
        },
      ],
    },
    {
      id: "bieres",
      name: "Bières",
      items: [
        {
          id: "moretti",
          name: "Birra Moretti",
          description: "Lager italienne · 33cl",
          price: 6,
          image: unsplash("photo-1608270586620-248524c67de9", 400),
        },
        {
          id: "ichnusa",
          name: "Ichnusa non filtrata",
          description: "Bière sarde non filtrée · 33cl",
          price: 7,
          image: unsplash("photo-1535958636474-b021ee887b13"),
        },
      ],
    },
    {
      id: "softs",
      name: "Softs & Cafés",
      items: [
        {
          id: "limonata",
          name: "Limonata di Sicilia",
          description: "Citrons de Sicile pressés · 25cl",
          price: 5,
          image: unsplash("photo-1621263764928-df1444c5e859"),
        },
        {
          id: "chinotto",
          name: "Chinotto",
          description: "Soda italien d'agrumes amers · 33cl",
          price: 5,
          image: unsplash("photo-1625772299848-391b6a87d7b3"),
        },
        {
          id: "san-pellegrino",
          name: "San Pellegrino",
          description: "Eau pétillante · 50cl",
          price: 4,
          image: unsplash("photo-1523362628745-0c100150b504"),
        },
        {
          id: "espresso",
          name: "Espresso",
          description: "Torréfaction napolitaine",
          price: 2.5,
          image: unsplash("photo-1510707577719-ae7c14805e3a"),
        },
      ],
    },
  ],
};

/*
 * BOHO (Toulouse) — prospect Connect, démo de visite commerciale.
 * Carte transcrite du menu papier fourni par le client (demos/boho/docs/),
 * identité issue de la couverture : logo kilim + terrasse bohème au
 * crépuscule (actifs dans public/boho/). Source de vérité du profil :
 * demos/boho/profile.json.
 */
const boho: Restaurant = {
  slug: "boho",
  name: "BOHO",
  tagline: "L'Âme de Marrakech à Toulouse",
  logo: "/boho/logo.svg",
  poster: "/boho/poster.webp",
  posterWide:
    "/boho/poster-wide-1600.webp 1600w, /boho/poster-wide-2400.webp 2400w, /boho/poster-wide-3040.webp 3040w",
  formulesPill: true,
  // Mesurés sur l'affiche (716 × 1024) : la lune dans le ciel au-dessus de la
  // pergola, les trois suspensions en rotin, la guirlande, les bougies des
  // tables, les massifs de part et d'autre du logo.
  saisonSpots: {
    moon: { x: 72, y: 6.5, size: 11 },
    lamps: [
      { x: 23.2, y: 23.6, size: 30 },
      { x: 12.6, y: 31.7, size: 19, delay: 0.7 },
      { x: 69.6, y: 29.6, size: 21, delay: 1.3 },
    ],
    lanternFaces: [
      { x: 23.2, y: 24.4, size: 9.5 },
      { x: 69.6, y: 30.4, size: 6.4, delay: 0.9 },
    ],
    bulbs: [
      { x: 22.3, y: 9.8, size: 4.4 },
      { x: 31.8, y: 15.6, size: 4, delay: 1.1 },
      { x: 42.6, y: 20, size: 3.6, delay: 0.4 },
      { x: 54.3, y: 23.1, size: 3.4, delay: 1.7 },
      { x: 63.7, y: 24.4, size: 3.2, delay: 0.9 },
      { x: 75.8, y: 25.6, size: 2.8, delay: 2.2 },
      { x: 84.4, y: 27.5, size: 2.6, delay: 1.4 },
    ],
    candles: [
      { x: 19.6, y: 70.3, size: 9 },
      { x: 41.9, y: 53.6, size: 6, delay: 0.6 },
      { x: 16.5, y: 54.8, size: 5, delay: 1.2 },
    ],
    eyes: [
      { x: 15.5, y: 44.5, size: 3.2 },
      { x: 84.5, y: 41, size: 2.6, delay: 4.5 },
    ],
  },
  address: "72 Avenue des États-Unis, 31200 Toulouse",
  phone: "+33 7 72 29 62 98",
  hours: "Lun–Ven 12h–14h · 16h–2h · Sam 18h–3h · Dim 16h–2h",
  // Généré par Claude depuis la carte en ligne (backend/scripts/pairings.py).
  pairings: bohoAccords,
  categories: [
    {
      id: "a-partager",
      name: "À partager",
      items: [
        { id: "nems-legumes", name: "Nems légumes (x4)", price: 6, image: pexels("11041855/pexels-photo-11041855.jpeg", 400) },
        { id: "nems-poulet", name: "Nems poulet (x4)", price: 6, image: unsplash("photo-1631241528578-2e22b55a8b0e", 400) },
        { id: "crevettes-tempura", name: "Crevettes tempura (x2)", price: 7, image: pexels("6036952/pexels-photo-6036952.jpeg", 400) },
        { id: "samoussas-boeuf", name: "Samoussas bœuf (x4)", price: 6, image: unsplash("photo-1732519970445-8f2d6998961f", 400) },
        { id: "yakitori-boeuf", name: "Yakitori bœuf fromage (x2)", price: 6, image: pexels("37183924/pexels-photo-37183924.jpeg", 400) },
        {
          id: "assortiment-boho",
          image: unsplash("photo-1772457677641-394bbc0c20f6", 400),
          name: "Assortiment BOHO",
          description:
            "1 nem poulet, 1 nem crevette, 1 samoussa bœuf, 1 nem légumes.",
          price: 9,
        },
      ],
    },
    {
      id: "grillades",
      name: "L'Entrecôte & grillades",
      tagline: "Le produit phare, frites fraîches maison et salade",
      items: [
        {
          id: "entrecote",
          image: pexels("27643028/pexels-photo-27643028.jpeg", 400),
          name: "L'Entrecôte « La Fameuse »",
          description:
            "Grillée à la perfection, notre sauce verte maison, frites fraîches et salade.",
          price: 20,
          badges: ["top"],
          options: [CUISSON],
        },
        {
          id: "piece-boeuf",
          image: pexels("15661093/pexels-photo-15661093.jpeg", 400),
          name: "Pièce de bœuf grillée",
          description: "Servie avec frites fraîches maison et salade assaisonnée.",
          price: 16.9,
          options: [CUISSON],
        },
        {
          id: "piece-poulet",
          image: pexels("36750259/pexels-photo-36750259.jpeg", 400),
          name: "Pièce de poulet grillée",
          description: "Servie avec frites fraîches maison et salade assaisonnée.",
          price: 16.9,
        },
        {
          id: "magret-canard",
          image: unsplash("photo-1617954096142-d712bc1dad61", 400),
          name: "Magret de canard grillé",
          description: "Servi avec frites fraîches maison et salade assaisonnée.",
          price: 16.9,
          options: [CUISSON],
        },
        {
          id: "saumon-plancha",
          image: unsplash("photo-1519708227418-c8fd9a32b7a2", 400),
          name: "Escalope de saumon frais à la plancha",
          description: "Servie avec frites fraîches maison et salade assaisonnée.",
          price: 16.9,
          options: [CUISSON],
        },
        {
          id: "burger-boho",
          image: unsplash("photo-1568901346375-23c9450c58cd", 400),
          name: "Burger original Boho",
          description: "Servi avec frites fraîches maison et salade assaisonnée.",
          price: 16.9,
          badges: ["maison"],
          options: [CUISSON],
        },
      ],
    },
    {
      id: "pizzas",
      name: "Pizzas",
      items: [
        {
          id: "pizza-margarita",
          image: pexels("12096782/pexels-photo-12096782.jpeg", 400),
          name: "Pizza Margarita",
          description: "Base tomate, mozzarella et basilic.",
          price: 13,
        },
        {
          id: "pizza-saumon",
          image: unsplash("photo-1658057542814-b8f4482be598", 400),
          name: "Pizza Saumon Norvégienne",
          description: "Base crème fraîche, mozzarella, saumon, aneth.",
          price: 15,
        },
        {
          id: "pizza-poulet-indienne",
          image: pexels("11974636/pexels-photo-11974636.jpeg", 400),
          name: "Pizza Poulet Indienne",
          description: "Base crème, poulet, sauce curry, mozzarella.",
          price: 15,
        },
        {
          id: "pizza-chevre-miel",
          image: unsplash("photo-1726947353013-564c23f97247", 400),
          name: "Pizza Chèvre Miel",
          description: "Base crème, mozzarella, fromage de chèvre, miel.",
          price: 15,
        },
      ],
    },
    {
      id: "salades",
      name: "Salades gourmandes",
      items: [
        {
          id: "carpaccio-boeuf",
          image: unsplash("photo-1727243866425-3bf2cbf7480a", 400),
          name: "Carpaccio de bœuf",
          description:
            "Roquette, parmesan, tomates cerises, copeaux de parmesan, huile d'olive.",
          price: 16.5,
        },
        {
          id: "tomate-burrata",
          image: unsplash("photo-1649400454485-b8ad827f929d", 400),
          name: "Tomate burrata",
          description: "Tomates anciennes, burrata crémeuse, pesto, roquette.",
          price: 14.5,
        },
        {
          id: "salade-cesar",
          image: pexels("28618639/pexels-photo-28618639.jpeg", 400),
          name: "Salade César",
          description:
            "Poulet grillé, salade romaine, parmesan, sauce César, croûtons.",
          price: 14.5,
        },
      ],
    },
    {
      id: "desserts",
      name: "Desserts",
      items: [
        { id: "creme-brulee", name: "Crème brûlée", price: 8, image: unsplash("photo-1575301543995-26dd932c3016", 400) },
        { id: "tiramisu-cafe", name: "Tiramisu au café", price: 8, image: pexels("12916029/pexels-photo-12916029.jpeg", 400) },
        { id: "brioche-pain-perdu", name: "Brioche façon pain perdu", price: 8, image: unsplash("photo-1484723091739-30a097e8f929", 400) },
        { id: "coupe-fruits", name: "Coupe de fruits", price: 8, image: unsplash("photo-1631718051263-c567dca19362", 400) },
        { id: "crepes-nutella", name: "Crêpes Nutella", price: 8, image: unsplash("photo-1572542873907-204263f6a869", 400) },
        { id: "gaufre-nutella", name: "Gaufre Nutella", price: 8, image: unsplash("photo-1701694472041-fc7faca1bdb6", 400) },
        {
          id: "coupe-glace",
          image: unsplash("photo-1447195047884-0f014b0d9288", 400),
          name: "Coupe de glace (2 boules)",
          description: "Et son coulis au choix.",
          price: 6,
          options: [
            {
              id: "boule-1",
              name: "1re boule",
              obligatoire: true,
              choices: [
                { id: "b1-vanille", name: "Vanille", supplement: 0 },
                { id: "b1-chocolat", name: "Chocolat", supplement: 0 },
                { id: "b1-fraise", name: "Fraise", supplement: 0 },
                { id: "b1-caramel", name: "Caramel", supplement: 0 },
              ],
            },
            {
              id: "boule-2",
              name: "2e boule",
              obligatoire: true,
              choices: [
                { id: "b2-vanille", name: "Vanille", supplement: 0 },
                { id: "b2-chocolat", name: "Chocolat", supplement: 0 },
                { id: "b2-fraise", name: "Fraise", supplement: 0 },
                { id: "b2-caramel", name: "Caramel", supplement: 0 },
              ],
            },
            {
              id: "coulis",
              name: "Coulis",
              obligatoire: true,
              choices: [
                { id: "coulis-pistache", name: "Pistache", supplement: 0 },
                { id: "coulis-chocolat", name: "Chocolat", supplement: 0 },
                { id: "coulis-fruit-rouge", name: "Fruit rouge", supplement: 0 },
                { id: "coulis-caramel", name: "Caramel", supplement: 0 },
              ],
            },
            {
              id: "chantilly",
              name: "Chantilly",
              obligatoire: false,
              choices: [
                { id: "chantilly-supp", name: "Chantilly supplémentaire", supplement: 1 },
              ],
            },
          ],
        },
        {
          id: "plateau-fruits",
          image: pexels("15076701/pexels-photo-15076701.jpeg", 400),
          name: "Plateau de fruits frais",
          description: "Fruits de saison, frais découpés.",
          price: 15,
        },
      ],
    },
    {
      id: "menu-enfant",
      name: "Menu enfant",
      tagline: "Jusqu'à 10 ans",
      items: [
        {
          id: "menu-enfant-plat",
          name: "Menu enfant",
          description:
            "Plat au choix, frites fraîches et salade, dessert au choix.",
          price: 9.9,
          options: [
            {
              id: "plat-enfant",
              name: "Plat",
              obligatoire: true,
              choices: [
                { id: "enfant-poulet", name: "Poulet grillé", supplement: 0 },
                { id: "enfant-steak", name: "Steak haché", supplement: 0 },
              ],
            },
            {
              id: "dessert-enfant",
              name: "Dessert",
              obligatoire: true,
              choices: [
                {
                  id: "enfant-glace",
                  name: "Coupe de glace et son coulis",
                  supplement: 0,
                },
                { id: "enfant-fruits", name: "Coupe de fruits", supplement: 0 },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "cocktails",
      name: "Cocktails",
      items: [
        {
          id: "mojito",
          image: unsplash("photo-1686294443320-84a84e2a8479", 400),
          name: "Mojito",
          description: "Fraise, framboise, passion, mango, ananas, menthe.",
          price: 8,
        },
        {
          id: "sex-on-the-beach",
          image: unsplash("photo-1644809818228-e29aa5aa8151", 400),
          name: "Sex on the Beach",
          description: "Orange, ananas, pêche, cranberry.",
          price: 8,
        },
        {
          id: "blue-lagoon",
          image: pexels("10986583/pexels-photo-10986583.jpeg", 400),
          name: "Blue Lagoon",
          description: "Ananas, curaçao blue, coco, crème.",
          price: 8,
        },
        {
          id: "ginger-lemonade",
          image: unsplash("photo-1676159434854-2f7f860a18cd", 400),
          name: "Ginger Lemonade",
          description: "Ginger, lemon, miel, soda.",
          price: 8,
        },
        { id: "terracota", name: "Terracota", description: "Fraise, orange.", price: 8, image: unsplash("photo-1652677084727-c1de21f8f73e", 400) },
        {
          id: "latina-passion",
          image: unsplash("photo-1555766720-1e727844cc8f", 400),
          name: "Latina Passion",
          description: "Passion, citron vert.",
          price: 8,
        },
        {
          id: "citronnade-maison",
          image: pexels("16792085/pexels-photo-16792085.jpeg", 400),
          name: "Citronnade maison",
          description: "Citron, menthe, sucre.",
          price: 6,
        },
      ],
    },
    {
      id: "smoothies",
      name: "Smoothies",
      items: [
        { id: "pina-colada", name: "Pina Colada", description: "Ananas, coco.", price: 7, image: unsplash("photo-1607446045710-d5a8fd9bc1db", 400) },
        {
          id: "coco-mango",
          image: unsplash("photo-1719239948819-0afeced16184", 400),
          name: "Coco Mango",
          description: "Mangue, noix de coco, fruit de la passion.",
          price: 7,
        },
        {
          id: "red-dragon",
          image: pexels("34870046/pexels-photo-34870046.jpeg", 400),
          name: "Red Dragon",
          description: "Fraise, framboise, ananas.",
          price: 7,
        },
        {
          id: "rose-garden",
          image: pexels("4958787/pexels-photo-4958787.jpeg", 400),
          name: "Rose Garden",
          description: "Fraise, orange, banane, citron.",
          price: 7,
        },
      ],
    },
    {
      id: "milkshakes",
      name: "Milkshakes",
      items: [
        { id: "milkshake-popcorn", name: "Pop Corn", price: 9, image: pexels("4307385/pexels-photo-4307385.jpeg", 400) },
        { id: "fraise-tagada", name: "Fraise Tagada", price: 9, image: unsplash("photo-1611928237590-087afc90c6fd", 400) },
        { id: "banoffee", name: "Banoffee", price: 9, image: unsplash("photo-1653122025451-ec76a73f8a08", 400) },
      ],
    },
    {
      id: "boissons",
      name: "Boissons",
      items: [
        {
          id: "jus-fruits-frais",
          image: unsplash("photo-1613478223719-2ab802602423", 400),
          name: "Jus de fruits naturel",
          description: "Fruits frais pressés à la minute.",
          price: 6,
        },
        { id: "coca-cola", name: "Coca Cola", price: 3.5 },
        { id: "coca-zero", name: "Coca Zero", price: 3.5 },
        { id: "ice-tea", name: "Ice Tea", price: 3.5 },
        { id: "perrier", name: "Perrier", price: 3.5 },
        { id: "evian", name: "Evian", price: 3.5 },
        { id: "redbull", name: "Redbull", price: 5 },
      ],
    },
    {
      id: "boissons-chaudes",
      name: "Boissons chaudes",
      tagline: "Nespresso — carte complète sur demande",
      items: [
        { id: "ristretto", name: "Ristretto", price: 2 },
        { id: "espresso", name: "Espresso", price: 2 },
        { id: "lungo", name: "Lungo", price: 2 },
        { id: "noisette", name: "Noisette", price: 2.2 },
        { id: "cappuccino", name: "Cappuccino", price: 4, image: unsplash("photo-1630021439100-74a32ab42d3e", 400) },
        { id: "latte-macchiato", name: "Latte Macchiato", price: 4.5, image: unsplash("photo-1550247611-e651810312fe", 400) },
      ],
    },
    {
      id: "chichas",
      name: "Chichas",
      tagline: "Soft inclus · Charbon naturel premium",
      items: [
        {
          id: "chicha-classique",
          name: "Classique",
          description: "Menthe — possibilité tête plate. Week-end 20 €.",
          price: 15,
          image: unsplash("photo-1662805522314-d316b95046b1", 400),
          vatRate: 20,
          options: [
            {
              id: "foyer-classique",
              name: "Foyer",
              obligatoire: false,
              choices: [
                { id: "fc-qasar", name: "Qasar", supplement: 5 },
                { id: "fc-brodhood", name: "Brodhood", supplement: 5 },
              ],
            },
          ],
        },
        {
          id: "chicha-premium",
          name: "Premium",
          description: "Love 66 · Lady Killer · Hawaï.",
          price: 20,
          image: unsplash("photo-1511302188604-d1d5ba206381", 400),
          vatRate: 20,
          options: [
            {
              id: "foyer-premium",
              name: "Foyer",
              obligatoire: false,
              choices: [
                { id: "fp-qasar", name: "Qasar", supplement: 5 },
                { id: "fp-brodhood", name: "Brodhood", supplement: 5 },
              ],
            },
          ],
        },
        {
          id: "chicha-mi-amor",
          name: "Mi Amor",
          price: 25,
          image: unsplash("photo-1574238752695-675b86d49267", 400),
          vatRate: 20,
          options: [
            {
              id: "foyer-mi-amor",
              name: "Foyer",
              obligatoire: false,
              choices: [
                { id: "fma-qasar", name: "Qasar", supplement: 5 },
                { id: "fma-brodhood", name: "Brodhood", supplement: 5 },
              ],
            },
          ],
        },
        {
          id: "chicha-royale",
          name: "Royale",
          description: "Menthe sucrée.",
          price: 30,
          image: unsplash("photo-1630175772812-3368aad7982d", 400),
          vatRate: 20,
          options: [
            {
              id: "foyer-royale",
              name: "Foyer",
              obligatoire: false,
              choices: [
                { id: "fr-qasar", name: "Qasar", supplement: 5 },
                { id: "fr-brodhood", name: "Brodhood", supplement: 5 },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/*
 * LZ.FOOD (Montpellier) — client signé, snack-pizzeria du côté de Port
 * Marianne. Carte transcrite du flyer papier remis par le gérant
 * (demos/lz-food/docs/), identité relevée sur ce même flyer : noir, rouge
 * framboise, étoiles de prix jaunes (actifs dans public/lz-food/). Les
 * orthographes imprimées sont conservées telles quelles (« Tandory »,
 * « Carnivor », « 4 Fromage »). Source de vérité du profil :
 * demos/lz-food/profile.json.
 */

/** Les six viandes du tacos, listées « au choix » sur le flyer. */
const LZ_VIANDES = [
  "Poulet",
  "Tenders",
  "Nugget",
  "Kebab",
  "Cordon bleu",
  "Kefta",
] as const;

/* Un groupe d'options ne retient qu'un choix : un tacos « 3 viandes » aligne
   donc trois groupes plutôt qu'une sélection multiple. */
const lzViande = (id: string, name: string) =>
  groupeChoix(id, name, LZ_VIANDES, { obligatoire: true });

/*
 * Les canettes photographiées au rayon BOISSON du flyer. Le flyer n'imprime
 * aucun texte à cet endroit : ces parfums sont lus sur les visuels, et servent
 * aussi de choix à la formule et au menu enfant. À confirmer avec le gérant.
 */
const LZ_BOISSONS = ["Coca-Cola", "Sprite", "Fanta", "Tropico"] as const;

/*
 * Sauces : aucune n'est imprimée sur le flyer, mais un snack en propose
 * toujours et la commande à table n'a pas de sens sans. Liste courante à
 * valider avec le gérant avant mise en ligne.
 */
const LZ_SAUCES = [
  "Ketchup",
  "Mayonnaise",
  "Algérienne",
  "Samouraï",
  "Blanche",
  "Barbecue",
  "Harissa",
] as const;

/**
 * « + 2,50 € frites + boisson » du flyer. La boisson est portée par la
 * formule elle-même : un groupe d'options ne retenant qu'un choix, un
 * sous-choix imbriqué n'existe pas — et le ticket de cuisine dit ainsi
 * directement quelle canette sortir.
 */
const lzFormule = groupeChoix("formule", "Formule frites + boisson", LZ_BOISSONS, {
  supplement: 2.5,
  prefixe: "Frites + ",
});

/** Sauce unique, comme au comptoir. Ne rien choisir vaut « sans sauce ». */
const lzSauce = groupeChoix("sauce", "Sauce", LZ_SAUCES);

/** Boisson comprise dans le prix (menu enfant). */
const lzBoissonIncluse = groupeChoix("boisson", "Boisson", LZ_BOISSONS, {
  obligatoire: true,
});

/** Parfum de la canette vendue seule. */
const lzParfumCanette = groupeChoix("parfum", "Parfum", LZ_BOISSONS, {
  obligatoire: true,
});

const lzSupplements = (id: string, noms: string[]) =>
  groupeChoix(id, "Suppléments", noms, { supplement: 1, multiple: true });

const lzSupplementsSnack = lzSupplements("supplement", [
  "Cheddar",
  "Emmental",
  "Mozzarella",
  "Poivrons",
  "Oignons",
  "Jambon",
  "Champignons",
  "Œuf",
]);

const lzSupplementsPizza = lzSupplements("supplement", [
  "Cheddar",
  "Emmental",
  "Mozzarella",
  "Viande hachée",
  "Poivrons",
  "Oignons",
  "Poulet",
  "Jambon de dinde",
  "Champignons",
  "Saumon",
  "Œuf",
]);

/** Toutes les pizzas sont annoncées en 33 cm sur le flyer. */
const lzPizza = (
  item: Omit<MenuItem, "detail" | "options">
): MenuItem => ({ ...item, detail: "33 cm", options: [lzSupplementsPizza] });

const lzFood: Restaurant = {
  slug: "lz-food",
  name: "LZ.FOOD",
  tagline: "Snack · Pizzeria · Montpellier",
  address: "394 Chemin de Moularès, 34070 Montpellier",
  phone: "+33 6 65 39 62 29",
  hours: "",
  highlights: ["Livraison dès 20 €", "3 pizzas achetées = 1 bouteille offerte"],
  categories: [
    {
      id: "burgers",
      name: "Burgers",
      tagline: "Formule + frites + boisson : +2,50 €",
      items: [
        {
          id: "burger-cheese",
          name: "Cheese",
          description: "Steak, cheddar.",
          price: 4.9,
          image: pexels("4080534/pexels-photo-4080534.jpeg", 800),
          options: [lzFormule, lzSauce, lzSupplementsSnack],
        },
        {
          id: "burger-chicken",
          name: "Chicken",
          description: "Poulet pané, cheddar.",
          price: 6.9,
          image: pexels("5474836/pexels-photo-5474836.jpeg", 800),
          options: [lzFormule, lzSauce, lzSupplementsSnack],
        },
        {
          id: "burger-double-steaks",
          name: "Double Steaks",
          description: "Double steak, double cheddar.",
          price: 6.9,
          image: pexels("6697455/pexels-photo-6697455.jpeg", 800),
          options: [lzFormule, lzSauce, lzSupplementsSnack],
        },
        {
          id: "burger-gouzou",
          name: "Gouzou",
          description: "Steak, œuf, cheddar, jambon.",
          price: 8.9,
          image: pexels("31450817/pexels-photo-31450817.jpeg", 800),
          options: [lzFormule, lzSauce, lzSupplementsSnack],
        },
      ],
    },
    {
      id: "tacos",
      name: "Tacos",
      tagline: "Six viandes au choix · Formule + frites + boisson : +2,50 €",
      items: [
        {
          id: "tacos-1-viande",
          name: "Tacos 1 viande",
          description:
            "Poulet, tenders, nugget, kebab, cordon bleu ou kefta — au choix.",
          price: 6.9,
          image: pexels("15913640/pexels-photo-15913640.jpeg", 800),
          options: [
            lzViande("viande", "Viande"),
            lzFormule,
            lzSauce,
            lzSupplementsSnack,
          ],
        },
        {
          id: "tacos-2-viandes",
          name: "Tacos 2 viandes",
          description:
            "Deux viandes au choix : poulet, tenders, nugget, kebab, cordon bleu ou kefta.",
          price: 7.9,
          image: pexels("5779364/pexels-photo-5779364.jpeg", 800),
          options: [
            lzViande("viande-1", "1re viande"),
            lzViande("viande-2", "2e viande"),
            lzFormule,
            lzSauce,
            lzSupplementsSnack,
          ],
        },
        {
          id: "tacos-3-viandes",
          name: "Tacos 3 viandes",
          description:
            "Trois viandes au choix : poulet, tenders, nugget, kebab, cordon bleu ou kefta.",
          price: 8.9,
          image: unsplash("photo-1773620494884-940e0db95e46", 800),
          options: [
            lzViande("viande-1", "1re viande"),
            lzViande("viande-2", "2e viande"),
            lzViande("viande-3", "3e viande"),
            lzFormule,
            lzSauce,
            lzSupplementsSnack,
          ],
        },
      ],
    },
    {
      id: "sandwichs",
      name: "Sandwichs",
      tagline: "Formule + frites + boisson : +2,50 €",
      items: [
        {
          id: "sandwich-poulet-creme",
          name: "Sandwich poulet crème",
          description: "Poulet, sauce crème maison, frites.",
          price: 7.5,
          image: pexels("7963144/pexels-photo-7963144.jpeg", 800),
          badges: ["maison"],
          options: [lzFormule, lzSauce, lzSupplementsSnack],
        },
        {
          id: "sandwich-americain-supreme",
          name: "Américain suprême",
          description: "Steak, cheddar, salade, tomate, oignons, râpé.",
          price: 7.5,
          image: pexels("36501096/pexels-photo-36501096.jpeg", 800),
          options: [lzFormule, lzSauce, lzSupplementsSnack],
        },
        {
          id: "sandwich-americain",
          name: "Américain",
          description: "Steak, cheddar, salade, tomate, oignons.",
          price: 6.9,
          image: pexels("38673828/pexels-photo-38673828.jpeg", 800),
          options: [lzFormule, lzSauce, lzSupplementsSnack],
        },
        {
          id: "sandwich-kebab",
          name: "Sandwich kebab",
          description: "Kebab, salade, tomate, oignons.",
          price: 7.5,
          image: pexels("28897047/pexels-photo-28897047.jpeg", 800),
          options: [lzFormule, lzSauce, lzSupplementsSnack],
        },
        {
          id: "sandwich-poulet-creme-supreme",
          name: "Poulet crème suprême",
          description: "Poulet, cheddar, olives vertes.",
          price: 8.5,
          image: pexels("7596517/pexels-photo-7596517.jpeg", 800),
          options: [lzFormule, lzSauce, lzSupplementsSnack],
        },
        {
          id: "sandwich-kefta",
          name: "Sandwich kefta",
          description: "Kefta, salade, tomate, oignons.",
          price: 7.5,
          image: pexels("7776546/pexels-photo-7776546.jpeg", 800),
          options: [lzFormule, lzSauce, lzSupplementsSnack],
        },
      ],
    },
    {
      id: "pizzas-rouges",
      name: "Pizzas rouges",
      tagline: "33 cm · Base sauce tomate · Halal",
      items: [
        lzPizza({
          id: "pizza-margherita",
          name: "Margherita",
          description: "Sauce tomate, olive.",
          price: 8,
          image: pexels("18437684/pexels-photo-18437684.jpeg", 800),
        }),
        lzPizza({
          id: "pizza-buffalo",
          name: "Buffalo",
          description:
            "Sauce tomate, viande hachée, lardons, oignon, sauce barbecue, olive.",
          price: 10.9,
          image: pexelsRecadre("5379638/pexels-photo-5379638.jpeg", 800),
        }),
        lzPizza({
          id: "pizza-kebab",
          name: "Kebab",
          description: "Sauce tomate, kebab, oignon, olive, sauce pita.",
          price: 10.9,
          image: pexels("12261064/pexels-photo-12261064.jpeg", 800),
        }),
        lzPizza({
          id: "pizza-reine",
          name: "Reine",
          description: "Sauce tomate, jambon, champignon, olive.",
          price: 10.9,
          image: pexelsRecadre("34413634/pexels-photo-34413634.jpeg", 800),
        }),
        lzPizza({
          id: "pizza-4-fromage",
          name: "4 Fromage",
          description:
            "Sauce tomate, mozzarella, emmental, chèvre, roquefort, olive.",
          price: 10.9,
          image: pexels("24706515/pexels-photo-24706515.jpeg", 800),
        }),
        lzPizza({
          id: "pizza-burger",
          name: "Burger",
          description:
            "Sauce tomate, viande hachée, tomate fraîche, cheddar, sauce Buggy Burger, olive.",
          price: 10.9,
          image: pexels("7906702/pexels-photo-7906702.jpeg", 800),
        }),
        lzPizza({
          id: "pizza-carnivor",
          name: "Carnivor",
          description:
            "Sauce tomate, viande hachée, merguez, kebab, poulet, olive.",
          price: 13.9,
          image: pexels("10266269/pexels-photo-10266269.jpeg", 800),
        }),
        lzPizza({
          id: "pizza-orientale",
          name: "Orientale",
          description: "Sauce tomate, merguez, poivron, oignon, olive.",
          price: 10.9,
          image: pexels("9685274/pexels-photo-9685274.jpeg", 800),
        }),
        lzPizza({
          id: "pizza-vege",
          name: "Végé",
          description:
            "Sauce tomate, champignon, oignon, tomate fraîche, olive.",
          price: 10.9,
          image: pexels("33593000/pexels-photo-33593000.jpeg", 800),
        }),
      ],
    },
    {
      id: "pizzas-blanches",
      name: "Pizzas blanches",
      tagline: "33 cm · Base crème fraîche maison · Halal",
      items: [
        lzPizza({
          id: "pizza-tandory",
          name: "Tandory",
          description: "Crème fraîche maison, poulet tandory, olive.",
          price: 10.9,
          image: pexels("11974636/pexels-photo-11974636.jpeg", 800),
        }),
        lzPizza({
          id: "pizza-algerienne",
          name: "Algérienne",
          description:
            "Crème fraîche maison, kefta, poivron, oignon, œuf, bordure.",
          price: 10.9,
          image: pexels("11224307/pexels-photo-11224307.jpeg", 800),
        }),
        lzPizza({
          id: "pizza-chevre-miel",
          name: "Chèvre miel",
          description: "Crème fraîche maison, chèvre, miel.",
          price: 10.9,
          image: pexels("33592983/pexels-photo-33592983.jpeg", 800),
        }),
        lzPizza({
          id: "pizza-curry",
          name: "Curry",
          description: "Crème fraîche maison, poulet curry, sauce curry.",
          price: 10.9,
          image: pexels("12089279/pexels-photo-12089279.jpeg", 800),
        }),
        lzPizza({
          id: "pizza-boise",
          name: "Boisé",
          description:
            "Crème fraîche maison, poulet, poivron, sauce Boursin, olive.",
          price: 10.9,
          image: pexels("11176613/pexels-photo-11176613.jpeg", 800),
        }),
        lzPizza({
          id: "pizza-norvegienne",
          name: "Norvégienne",
          description:
            "Crème fraîche maison, mozzarella, olive, saumon fumé, citron.",
          price: 10.9,
          image: pexels("11351374/pexels-photo-11351374.jpeg", 800),
        }),
        lzPizza({
          id: "pizza-lz",
          name: "L.Z",
          description:
            "Crème fraîche maison, poulet, bordure fromage, viande hachée, pomme de terre, olive.",
          price: 10.9,
          image: pexels("5640024/pexels-photo-5640024.jpeg", 800),
        }),
        lzPizza({
          id: "pizza-savoyarde",
          name: "Savoyarde",
          description:
            "Crème fraîche maison, lardons, pomme de terre, raclette, olive.",
          price: 10.9,
          image: pexels("34413614/pexels-photo-34413614.jpeg", 800),
        }),
      ],
    },
    {
      id: "a-grignoter",
      name: "À grignoter",
      items: [
        { id: "nuggets", name: "Nuggets", detail: "x6", price: 3.9, image: pexels("18188572/pexels-photo-18188572.jpeg", 800), options: [lzSauce] },
        { id: "wings", name: "Wings", detail: "x5", price: 4.9, image: pexels("11299743/pexels-photo-11299743.jpeg", 800), options: [lzSauce] },
        { id: "tenders", name: "Tenders", detail: "x3", price: 4.9, image: pexels("33068077/pexels-photo-33068077.jpeg", 800), options: [lzSauce] },
        { id: "nems", name: "Nems", detail: "x4", price: 5.9, image: pexels("12356601/pexels-photo-12356601.jpeg", 800), options: [lzSauce] },
      ],
    },
    {
      id: "menu-enfant",
      name: "Menu enfant",
      items: [
        {
          id: "menu-enfant",
          name: "Menu enfant",
          description: "Nuggets x6, frites et boisson.",
          price: 5.9,
          image: pexels("28525150/pexels-photo-28525150.jpeg", 800),
          options: [lzBoissonIncluse, lzSauce],
        },
      ],
    },
    {
      id: "desserts",
      name: "Desserts",
      items: [
        {
          id: "tiramisu-chocolat",
          name: "Tiramisu chocolat",
          price: 3.2,
          image: pexels("34759483/pexels-photo-34759483.jpeg", 800),
        },
        {
          id: "tiramisu-caramel",
          name: "Tiramisu caramel",
          price: 3.2,
          image: pexels("11182473/pexels-photo-11182473.jpeg", 800),
        },
        { id: "tarte-daim", name: "Tarte au Daim", price: 3.2, image: pexels("30181075/pexels-photo-30181075.jpeg", 800) },
      ],
    },
    {
      id: "boissons",
      name: "Boissons",
      items: [
        { id: "canette", name: "Canette", description: "Coca-Cola, Sprite, Fanta ou Tropico.", price: 1.8, image: pexels("17236593/pexels-photo-17236593.jpeg", 800), options: [lzParfumCanette] },
        { id: "cafe", name: "Café", price: 1.5, image: pexels("18604200/pexels-photo-18604200.jpeg", 800) },
        { id: "red-bull", name: "Red Bull", price: 2.5, image: pexels("17423270/pexels-photo-17423270.jpeg", 800) },
        { id: "bouteille", name: "Bouteille", description: "Coca-Cola.", price: 3.5, image: pexels("29051732/pexels-photo-29051732.jpeg", 800) },
      ],
    },
  ],
};

/*
 * O’Crousti Poulet Original — prospect : le siège du réseau (poulet braisé
 * halal, une quarantaine de restaurants en France et en Suisse). Carte
 * nationale transcrite de ocroustipouletoriginal.com/notre-carte (noms,
 * descriptions et prix tels que publiés, « à titre indicatif » selon le
 * site) ; photos : les visuels produits de ce même site, recadrés dans
 * public/o-crousti-poulet/. Établissement affiché : la boutique de
 * Montpellier Vendémiaire (adresse, téléphone, avis Google), pour qui la
 * démo a d'abord été faite. Source de vérité du profil :
 * demos/o-crousti-poulet/profile.json.
 */

/*
 * « 1 accompagnement » : le site n'en restreint aucun, ni ne dit si le Riz
 * Crousti (4,90 €) ou l'Alloco coûtent plus cher en menu. Les six de la
 * carte, sans supplément — à confirmer avec le siège.
 */
const OCP_ACCOMPAGNEMENTS = [
  "Potatoes",
  "Patates Sautées",
  "Riz Oriental",
  "Riz Crousti",
  "Pâtes Crémo",
  "Alloco",
] as const;

/*
 * Le site ne nomme aucune boisson. Depuis juin 2026, le réseau sert la
 * gamme PepsiCo, annoncée « Pepsi • 7Up • Lipton » : les trois marques,
 * sans parfum inventé. Même liste pour les boissons des menus et pour la
 * canette et la bouteille vendues seules.
 */
const OCP_BOISSONS = ["Pepsi", "7Up", "Lipton"] as const;

/* Les trois sauces du tableau des allergènes du site, nommées comme il les
   imprime, sans prix publié : une offerte au choix, ou « Sans sauce » — à
   confirmer avec le siège. Choix obligatoire, juste après la viande : le
   ticket dit toujours ce qu'il faut servir, et le choix se voit en ouvrant
   la feuille au lieu de rester sous le bord. */
const OCP_SAUCES = ["Sauce Oignons", "Sauce Verte", "Sauce Piquante", "Sans sauce"] as const;

const ocpAccompagnement = (id: string, name: string) =>
  groupeChoix(id, name, OCP_ACCOMPAGNEMENTS, { obligatoire: true });

const ocpBoisson = (id: string, name: string) =>
  groupeChoix(id, name, OCP_BOISSONS, { obligatoire: true });

const ocpSauce = groupeChoix("sauce", "Sauce", OCP_SAUCES, { obligatoire: true });

const oCroustiPoulet: Restaurant = {
  slug: "o-crousti-poulet",
  name: "O’Crousti Poulet",
  tagline: "Original",
  logo: "/o-crousti-poulet/coq.webp",
  whiteLogo: true,
  address: "230 rue Vendémiaire, 34000 Montpellier",
  phone: "+33 7 49 20 64 34",
  hours: "Ouvert 7j/7, du lundi au dimanche",
  highlights: ["Halal", "Ouvert 7j/7"],
  googleReviewUrl:
    "https://search.google.com/local/writereview?placeid=ChIJCXg4SkyvthIR3btCb5k3PUI",
  categories: [
    {
      id: "nos-menus",
      name: "Nos Menus",
      /* Compositions imprimées sur le site, une ligne par élément, liées
         par « + » comme sur le panneau. Espaces insécables écrites dans les
         libellés : un nombre reste avec ce qu'il compte, « ou » et « + » avec
         ce qu'ils introduisent. */
      items: [
        {
          id: "menu-solo",
          name: "Menu Solo",
          description:
            "1\u00a0cuisse, 3\u00a0pilons, 2\u00a0tenders, 2\u00a0saucisses ou\u00a04\u00a0ailes\n+\u00a01\u00a0accompagnement\n+\u00a01\u00a0canette",
          price: 6.9,
          image: "/o-crousti-poulet/menu-solo.webp",
          options: [
            groupeChoix(
              "viande",
              "Viande",
              ["1\u00a0cuisse", "3\u00a0pilons", "2\u00a0tenders", "2\u00a0saucisses", "4\u00a0ailes"],
              { obligatoire: true }
            ),
            ocpSauce,
            ocpAccompagnement("accompagnement", "Accompagnement"),
            ocpBoisson("canette", "Canette"),
          ],
        },
        {
          id: "menu-costaud",
          name: "Menu Costaud",
          description: "1\u00a0poulet\n+\u00a01\u00a0accompagnement\n+\u00a01\u00a0canette",
          price: 12.5,
          image: "/o-crousti-poulet/menu-costaud.webp",
          options: [
            ocpSauce,
            ocpAccompagnement("accompagnement", "Accompagnement"),
            ocpBoisson("canette", "Canette"),
          ],
        },
        {
          id: "menu-duo",
          name: "Menu Duo",
          description: "1\u00a0poulet\n+\u00a02\u00a0accompagnements\n+\u00a02\u00a0canettes",
          price: 17,
          image: "/o-crousti-poulet/menu-duo.webp",
          options: [
            ocpSauce,
            ocpAccompagnement("accompagnement-1", "1er\u00a0accompagnement"),
            ocpAccompagnement("accompagnement-2", "2e\u00a0accompagnement"),
            ocpBoisson("canette-1", "1re\u00a0canette"),
            ocpBoisson("canette-2", "2e\u00a0canette"),
          ],
        },
        {
          id: "menu-gourmand",
          name: "Menu Gourmand",
          description: "4\u00a0cuisses ou\u00a010\u00a0pilons\n+\u00a02\u00a0accompagnements\n+\u00a02\u00a0canettes",
          price: 19.5,
          image: "/o-crousti-poulet/menu-gourmand.webp",
          options: [
            groupeChoix("viande", "Viande", ["4\u00a0cuisses", "10\u00a0pilons"], {
              obligatoire: true,
            }),
            ocpSauce,
            ocpAccompagnement("accompagnement-1", "1er\u00a0accompagnement"),
            ocpAccompagnement("accompagnement-2", "2e\u00a0accompagnement"),
            ocpBoisson("canette-1", "1re\u00a0canette"),
            ocpBoisson("canette-2", "2e\u00a0canette"),
          ],
        },
        {
          id: "menu-family",
          name: "Menu Family",
          description: "2\u00a0poulets ou\u00a04\u00a0cuisses\n+\u00a04\u00a0accompagnements\n+\u00a01\u00a0bouteille 1,5\u00a0L",
          price: 31.5,
          image: "/o-crousti-poulet/menu-family.webp",
          options: [
            groupeChoix("viande", "Viande", ["2\u00a0poulets", "4\u00a0cuisses"], {
              obligatoire: true,
            }),
            ocpSauce,
            ocpAccompagnement("accompagnement-1", "1er\u00a0accompagnement"),
            ocpAccompagnement("accompagnement-2", "2e\u00a0accompagnement"),
            ocpAccompagnement("accompagnement-3", "3e\u00a0accompagnement"),
            ocpAccompagnement("accompagnement-4", "4e\u00a0accompagnement"),
            ocpBoisson("bouteille", "Bouteille 1,5\u00a0L"),
          ],
        },
      ],
    },
    {
      id: "poulet-a-la-carte",
      name: "Poulet à la Carte",
      items: [
        {
          id: "poulet-entier",
          name: "Poulet Entier",
          description: "Entier, braisé, mariné 24h. Une peau craquante dorée, une chair fondante.",
          price: 8.5,
          image: "/o-crousti-poulet/poulet.webp",
        },
        {
          id: "demi-poulet",
          name: "Demi Poulet",
          description: "La bonne dose. La moitié d’un poulet entier braisé, idéale pour un repas généreux.",
          price: 4.5,
          image: "/o-crousti-poulet/demi-poulet.webp",
        },
        {
          id: "cuisse",
          name: "Cuisse de Poulet",
          description: "La star de la carte. Marinée 24h, dorée à la perfection.",
          price: 2.8,
          image: "/o-crousti-poulet/cuisse.webp",
        },
        {
          id: "pilons",
          name: "Pilons de Poulet",
          detail: "x3",
          description: "Trois bouchées de pur plaisir, la pièce parfaite pour picorer.",
          price: 2.8,
          image: "/o-crousti-poulet/pilons.webp",
        },
        {
          id: "blanc-de-poulet",
          name: "Blanc de Poulet",
          description: "La pièce noble, version croustillante : tendre, juteuse, aromatisée à notre façon.",
          price: 5.5,
          image: "/o-crousti-poulet/blanc-de-poulet.webp",
        },
        {
          id: "saucisse",
          name: "Saucisse",
          detail: "x2",
          description: "Big saucisses de volaille caramélisées, servies par 2.",
          price: 3.5,
          image: "/o-crousti-poulet/saucisse.webp",
        },
        {
          id: "donut",
          name: "Donut Poulet & Cheese",
          description: "La surprise qu’on n’attend pas, beignet de poulet braisé au fromage fondant.",
          price: 2.5,
          image: "/o-crousti-poulet/donut.webp",
        },
        {
          id: "tenders",
          name: "Tenders croustillants",
          detail: "x2",
          description: "Aiguillettes de poulet panées, croustillantes à souhait, fondantes à cœur.",
          price: 2.5,
          image: "/o-crousti-poulet/tenders.webp",
        },
        {
          id: "nems",
          name: "Nems au Poulet",
          description: "Nems dorés à la friture, garnis de poulet braisé et légumes croquants.",
          price: 1,
          image: "/o-crousti-poulet/nems.webp",
        },
        {
          id: "bricks",
          name: "Bricks au Poulet",
          description: "Feuilles de brick croustillantes garnies de poulet braisé épicé.",
          price: 2,
          image: "/o-crousti-poulet/bricks.webp",
        },
        {
          id: "ailes",
          name: "Ailes de Poulet",
          detail: "x4",
          description: "Ailes croustillantes bien épicées",
          price: 2.8,
          image: "/o-crousti-poulet/ailes.webp",
        },
      ],
    },
    {
      id: "accompagnements",
      name: "Accompagnements",
      items: [
        { id: "potatoes", name: "Potatoes", description: "Potatoes dorées et croustillantes", price: 3.5, image: "/o-crousti-poulet/potatoes.webp" },
        { id: "patates-sautees", name: "Patates Sautées", description: "Patates sautées maison", price: 3.5, image: "/o-crousti-poulet/patates-sautees.webp" },
        { id: "riz-oriental", name: "Riz Oriental", description: "Riz parfumé aux épices orientales", price: 3.8, image: "/o-crousti-poulet/riz-oriental.webp" },
        {
          id: "riz-crousti",
          name: "Riz Crousti",
          description: "Le riz qui fait toute la différence. Notre riz, assaisonné maison.",
          price: 4.9,
          image: "/o-crousti-poulet/riz-crousti.webp",
        },
        {
          id: "pates-cremo",
          name: "Pâtes Crémo",
          description: "La douceur après le croustillant. Pâtes à la sauce crémeuse maison, onctueuses.",
          price: 3.8,
          image: "/o-crousti-poulet/pates-cremo.webp",
        },
        {
          id: "alloco",
          name: "Alloco",
          description: "Bananes plantains frites, dorées et légèrement sucrées. Touche africaine au menu.",
          price: 4,
          image: "/o-crousti-poulet/alloco.webp",
        },
      ],
    },
    {
      id: "desserts",
      name: "Desserts",
      items: [
        { id: "tiramisu", name: "Tiramisu", description: "Tiramisu fait maison", price: 3, image: "/o-crousti-poulet/tiramisu.webp" },
        { id: "tarte-daim", name: "Tarte Daim", description: "Tarte au chocolat Daim", price: 3, image: "/o-crousti-poulet/tarte-daim.webp" },
      ],
    },
    {
      /* Le site ne vend les boissons qu'en menu, sans prix à l'unité : ceux
         du panneau de la boutique (Boisson 33 cl 2,00 €, Bouteille 4,00 €).
         Sans photo, l'une comme l'autre : le réseau n'en publie aucune, et
         aucune photo libre ne montre sa gamme au logo actuel
         (demos/o-crousti-poulet/profile.json). */
      id: "boissons",
      name: "Boissons",
      items: [
        {
          id: "canette",
          name: "Canette",
          detail: "33\u00a0cl",
          description: "Pepsi, 7Up ou Lipton.",
          price: 2,
          options: [ocpBoisson("boisson", "Boisson")],
        },
        {
          id: "bouteille",
          name: "Bouteille",
          description: "Pepsi, 7Up ou Lipton.",
          price: 4,
          options: [ocpBoisson("boisson", "Boisson")],
        },
      ],
    },
  ],
};

/*
 * Big Smash — prospect : le siège du réseau (smash burgers et poulet frit
 * halal, une dizaine de restaurants en France, groupe NSup, Toulouse). Carte
 * transcrite de bigsmash.fr/la-carte (noms et descriptions tels que publiés ;
 * prix présents dans la page mais masqués à l'affichage, cohérents avec ceux
 * cités par Snacking en 2025 : menus dès 9,90 €, Big Combo 14,90 €) ; photos :
 * les visuels produits du même site, détourés et posés en 16:9 dans
 * public/big-smash/. Établissement affiché : Toulouse Matabiau, le premier
 * restaurant (2021). Suppléments déduits, questions au siège :
 * demos/big-smash/profile.json.
 */

/*
 * Accompagnement d'un menu : la liste des fiches menus du site. Le site ne
 * publie pas le supplément en menu ; ceux-ci reprennent l'écart de prix à la
 * carte avec les frites nature (3 €) — à confirmer avec le siège.
 */
const BS_ACCOMPAGNEMENTS = [
  ["Frites nature", 0],
  ["Frites épicées", 0.5],
  ["Frites cheddar", 1],
  ["Frites cheddar bacon", 2],
  ["Pops nature", 0.5],
  ["Pops cheddar", 1.5],
  ["Pops cheddar bacon", 2.5],
] as const;

/* Les thés et limonades : le site les vend en un seul article, « THÉ &
   LIMONADE » ; leurs noms viennent de la carte Deliveroo de l'enseigne. */
const BS_THES_LIMONADES = [
  "Thé Blanc Tropical",
  "Limonade Red Cherry",
  "Limonade Fizz Yuzu",
  "Limonade Blue Mango Passion",
  "Limonade Lime Watermelon",
];

/*
 * Boisson d'un menu : la liste des fiches menus du site (gamme Coca-Cola, pas
 * de Pepsi), plus le Coca Cola Sans Sucres que montre son visuel et que vend
 * sa carte Deliveroo, le Cherry et les parfums de Volvic de la carte (leur
 * visuel). Même règle que les accompagnements : l'écart de prix à la carte
 * avec le Coca Cola (1,90 €), à confirmer.
 */
const BS_BOISSONS = [
  ["Coca Cola", 0],
  ["Coca Cola Sans Sucres", 0],
  ["Coca Cola Cherry", 0],
  ["Badoit", 0],
  ["Evian", 0],
  ["Volvic Juicy Fraise", 0.6],
  ["Volvic Zest Citron", 0.6],
  ["Red Bull", 1],
  ...BS_THES_LIMONADES.map((nom) => [nom, 1] as const),
] as const;

/* Les sauces maison du site (« SAUCES 0.40 € »). */
const BS_SAUCES = ["Big Smash", "Spicy", "Ranch", "Miel-Moutarde"];
/* Le site ne dit pas quels burgers le combo admet ni à quel prix : les
   quatre que leur carte Deliveroo y inclut sans supplément. */
const BS_COMBO_BURGERS = ["Smash Classic", "Smash Spicy", "Original Cheese", "Big Fish"];

const bsAccompagnement = groupeChoix("accompagnement", "Accompagnement", BS_ACCOMPAGNEMENTS, { obligatoire: true });
const bsBoisson = groupeChoix("boisson", "Boisson", BS_BOISSONS, { obligatoire: true });
/* « Sauce Big Smash » au panier : « Big Smash (+0,40 €) » se lisait comme un
   burger. Les noms de groupe se lisent aussi au comptoir, devant le choix :
   « En plus : Sauce Big Smash », « Retirer : Sans tomate ». */
const bsSauceEnPlus = groupeChoix("sauce", "En plus", BS_SAUCES, { multiple: true, supplement: 0.4, prefixe: "Sauce " });

/* « Nous ne changeons pas les recettes de nos burgers, mais nous pouvons
   retirer les ingrédients de votre choix » (FAQ du site). L'option veggie
   (« steak veggie » ou « poulet veggie », même FAQ) n'est pas proposée :
   son prix n'est pas publié (profile.json, question 2). */
const bsRetirer = (...ingredients: string[]) =>
  groupeChoix("retirer", "Retirer", ingredients, { multiple: true, prefixe: "Sans " });

/** Un menu : son burger, frites ou pops, boisson, puis ce que le client retire ou ajoute. */
const bsMenu = (item: Omit<MenuItem, "options">, retirer: string[]): MenuItem => ({
  ...item,
  options: [bsAccompagnement, bsBoisson, bsRetirer(...retirer), bsSauceEnPlus],
});

/** Un burger seul : ce que le client retire ou ajoute. */
const bsBurger = (item: Omit<MenuItem, "options">, retirer: string[]): MenuItem => ({
  ...item,
  options: [bsRetirer(...retirer), bsSauceEnPlus],
});

/* Coulis et toppings du Big Sundae et du Kool Dog (visuels du site). */
const bsCoulis = groupeChoix("coulis", "Coulis", ["Speculoos", "Caramel", "Fraise", "Nutella"], { obligatoire: true });
const bsTopping = groupeChoix("topping", "Topping", ["Speculoos", "Oreo", "Daim"], { obligatoire: true });

const bigSmash: Restaurant = {
  slug: "big-smash",
  name: "Big Smash",
  tagline: "Toulouse Matabiau",
  logo: "/big-smash/logo.svg",
  whiteLogo: true,
  logoIsName: true,
  // Le mot-symbole en relief, blanc et rouge : l'image de partage du site et le bas de sa carte.
  footerLogo: "/big-smash/logo-relief.svg",
  icons: { tab: "/big-smash/favicon.png", homeScreen: "/big-smash/icon.png" },
  themeColor: "#d72215",
  allergensUrl: "https://cdn.prod.website-files.com/67d1526a4a9145ae97541f0d/681916480339e273bbeb0584_TABLEAU%20ALLERGE%CC%80NES.pdf",
  address: "68 rue de Bayard, 31000 Toulouse",
  phone: "",
  // Ni coupure dans une plage (« dim 12h– / 23h ») ni « · » en début de ligne.
  hours: "Lun–\u2060jeu\u00a011h–\u206023h\u00a0· ven–\u2060sam\u00a011h–\u20600h30\u00a0· dim\u00a012h–\u206023h",
  // « toutes nos viandes sont certifiées AVS et Achahada » (FAQ) ; « fried chicken maison » (accueil).
  highlights: ["Viandes certifiées halal", "Fried chicken maison"],
  googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJR1vj4XS9rhIR7_SQAWKbs6c",
  estimatorLive: true,
  categories: [
    {
      id: "menus",
      name: "Menus",
      tagline: "Servis avec frites et boisson",
      items: [
        bsMenu(
          {
            id: "menu-smash-classic",
            name: "Menu Smash Classic",
            description: "Potato bun, steak haché smashé, feuille de salade, rondelle de tomate, pickles, cheddar et sauce Big Smash servi avec frites et boisson.",
            price: 9.9,
            image: "/big-smash/menu-smash-classic.webp",
          },
          ["salade", "tomate", "pickles", "cheddar"]
        ),
        bsMenu(
          {
            // Le site décrit ce menu avec un filet de poulet : la description du burger Smash Spicy (profile.json, question 5).
            id: "menu-smash-spicy",
            name: "Menu Smash Spicy",
            description: "Potato bun, steak haché smashé, feuille de salade, rondelle de tomate, cheddar, jalapenos et sauce Spicy servi avec frites et boisson.",
            price: 9.9,
            image: "/big-smash/menu-smash-spicy.webp",
          },
          ["salade", "tomate", "cheddar", "jalapenos"]
        ),
        bsMenu(
          {
            id: "menu-smash-bacon",
            name: "Menu Smash Bacon",
            description: "Potato bun, steak haché smashé, feuille de salade, rondelle de tomate, cheddar, bacon de boeuf et sauce Big Smash servi avec frites et boisson.",
            price: 10.9,
            image: "/big-smash/menu-smash-bacon.webp",
          },
          ["salade", "tomate", "cheddar", "bacon"]
        ),
        bsMenu(
          {
            id: "menu-original-cheese",
            name: "Menu Original Cheese",
            description: "Potato bun, steak haché smashé, oignons frais, double cheddar, sauce ketchup et moutarde US servi avec frites et boisson.",
            price: 9.9,
            image: "/big-smash/menu-original-cheese.webp",
          },
          ["oignons", "cheddar"]
        ),
        bsMenu(
          {
            id: "menu-big-smash",
            name: "Menu Big Smash",
            description: "Pain burger, 2 steaks smashés, 2 tranches de cheddar, pickles, salade iceberg et sauce Big Smash servi avec frites et boisson.",
            price: 9.9,
            image: "/big-smash/menu-big-smash.webp",
          },
          ["pickles", "salade", "cheddar"]
        ),
        bsMenu(
          {
            id: "menu-big-cheese",
            name: "Menu Big Cheese",
            description: "Potato bun, double steak haché smashé, oignons frais, pickles, salade, double cheddar et sauce Big Smash servi avec frites et boisson.",
            price: 8.9,
            image: "/big-smash/menu-big-cheese.webp",
          },
          ["oignons", "pickles", "salade", "cheddar"]
        ),
        bsMenu(
          {
            id: "menu-grilled-smash",
            name: "Menu Grilled Smash",
            description: "Butter bread toasté, steak haché smashé, cheddar, oignons confit et sauce Big Smash servi avec frites et boisson.",
            price: 8.9,
            image: "/big-smash/menu-grilled-smash.webp",
          },
          ["cheddar", "oignons confits"]
        ),
        bsMenu(
          {
            id: "menu-surf-turf",
            name: "Menu Surf & Turf",
            description: "Potato bun, steak haché smashé, crevettes panées, graine de sésame, cheddar et sauce Big Sweety servi avec frites et boisson.",
            price: 11.9,
            image: "/big-smash/menu-surf-turf.webp",
          },
          ["cheddar", "sésame"]
        ),
        bsMenu(
          {
            id: "menu-original-chicken",
            name: "Menu Original Chicken",
            description: "Potato bun, filet de poulet pané maison, cheddar, salade et sauce Ranch servi avec frites et boisson.",
            price: 9.9,
            image: "/big-smash/menu-original-chicken.webp",
          },
          ["cheddar", "salade"]
        ),
        bsMenu(
          {
            id: "menu-big-chicken",
            name: "Menu Big Chicken",
            description: "Potato bun, filet de poulet pané maison, feuille de salade, rondelle de tomate, pickles, cheddar et sauce smokey BBQ servi avec frites et boisson.",
            price: 10.9,
            image: "/big-smash/menu-big-chicken.webp",
          },
          ["salade", "tomate", "pickles", "cheddar"]
        ),
        bsMenu(
          {
            id: "menu-chicken-spicy",
            name: "Menu Chicken Spicy",
            description: "Potato bun, filet de poulet pané maison, feuille de salade, rondelle de tomate, jalapenos, cheddar et sauce Spicy servi avec frites et boisson.",
            price: 9.9,
            image: "/big-smash/menu-chicken-spicy.webp",
          },
          ["salade", "tomate", "jalapenos", "cheddar"]
        ),
        bsMenu(
          {
            id: "menu-big-fish",
            name: "Menu Big Fish",
            description: "Potato bun, filet de colin pané maison, cheddar et sauce Tartare servi avec frites et boisson.",
            price: 9.9,
            image: "/big-smash/menu-big-fish.webp",
          },
          ["cheddar"]
        ),
        {
          id: "big-combo",
          name: "Big Combo",
          description: "C'est l'occasion de te faire plaisir avec deux burgers dans ton menu\u00a0!",
          price: 14.9,
          image: "/big-smash/big-combo.webp",
          options: [
            groupeChoix("burger-1", "1er\u00a0burger", BS_COMBO_BURGERS, { obligatoire: true }),
            groupeChoix("burger-2", "2e\u00a0burger", BS_COMBO_BURGERS, { obligatoire: true }),
            bsAccompagnement,
            bsBoisson,
          ],
        },
        {
          id: "big-kids",
          name: "Big Kids",
          description: "Menu enfant 7-11 ans, cheeseburger ou nuggets x5 au choix, frites, dessert au choix, boisson au choix et jouet.",
          price: 6.9,
          image: "/big-smash/big-kids.webp",
          /* Desserts et boissons : ceux de leur carte Deliveroo, le site n'en nomme aucun. */
          options: [
            groupeChoix("plat", "Plat", ["Cheeseburger", "Nuggets x5"], { obligatoire: true }),
            groupeChoix("dessert", "Dessert", ["Kinder Country", "Pom'Potes"], { obligatoire: true }),
            groupeChoix("boisson", "Boisson", ["Evian", "Capri-Sun"], { obligatoire: true }),
          ],
        },
      ],
    },
    {
      id: "burgers",
      name: "Burgers",
      items: [
        bsBurger(
          {
            id: "smash-classic",
            name: "Smash Classic",
            description: "Potato bun, steak haché smashé, feuille de salade, rondelle de tomate, pickles, cheddar et sauce Big Smash.",
            price: 6.9,
            image: "/big-smash/smash-classic.webp",
          },
          ["salade", "tomate", "pickles", "cheddar"]
        ),
        bsBurger(
          {
            id: "smash-spicy",
            name: "Smash Spicy",
            description: "Potato bun, steak haché smashé, feuille de salade, rondelle de tomate, cheddar, jalapenos et sauce Spicy.",
            price: 6.9,
            image: "/big-smash/smash-spicy.webp",
          },
          ["salade", "tomate", "cheddar", "jalapenos"]
        ),
        bsBurger(
          {
            id: "smash-bacon",
            name: "Smash Bacon",
            description: "Potato bun, steak haché smashé, feuille de salade, rondelle de tomate, cheddar, bacon de boeuf et sauce Big Smash.",
            price: 7.9,
            image: "/big-smash/smash-bacon.webp",
          },
          ["salade", "tomate", "cheddar", "bacon"]
        ),
        bsBurger(
          {
            id: "original-cheese",
            name: "Original Cheese",
            description: "Potato bun, steak haché smashé, oignons frais, double cheddar, pickles, sauce ketchup et moutarde US.",
            price: 6.9,
            image: "/big-smash/original-cheese.webp",
          },
          ["oignons", "cheddar", "pickles"]
        ),
        bsBurger(
          {
            id: "big-smash-burger",
            name: "Big Smash Burger",
            description: "Pain burger, 2 steaks smashés, 2 tranches de cheddar, pickles, salade iceberg et sauce Big Smash.",
            price: 6.9,
            image: "/big-smash/big-smash-burger.webp",
          },
          ["cheddar", "pickles", "salade"]
        ),
        bsBurger(
          {
            id: "surf-turf",
            name: "Surf Turf",
            description: "Potato bun, steak haché smashé, crevettes panées, graine de sésame, cheddar et sauce Big Sweety.",
            price: 8.9,
            image: "/big-smash/surf-turf.webp",
          },
          ["cheddar", "sésame"]
        ),
        bsBurger(
          {
            id: "original-chicken",
            name: "Original Chicken",
            description: "Potato bun, filet de poulet pané maison, cheddar, salade et sauce Ranch.",
            price: 6.9,
            image: "/big-smash/original-chicken.webp",
          },
          ["cheddar", "salade"]
        ),
        bsBurger(
          {
            id: "big-chicken",
            name: "Big Chicken",
            description: "Potato bun, filet de poulet pané maison, feuille de salade, rondelle de tomate, pickles, cheddar et sauce Smokey BBQ.",
            price: 7.9,
            image: "/big-smash/big-chicken.webp",
          },
          ["salade", "tomate", "pickles", "cheddar"]
        ),
        bsBurger(
          {
            id: "chicken-spicy",
            name: "Chicken Spicy",
            description: "Potato bun, filet de poulet pané maison, feuille de salade, rondelle de tomate, jalapenos, cheddar et sauce Spicy.",
            price: 7.9,
            image: "/big-smash/chicken-spicy.webp",
          },
          ["salade", "tomate", "jalapenos", "cheddar"]
        ),
        bsBurger(
          {
            id: "big-mountain",
            name: "Big Mountain",
            description: "Potato Bun, filet de poulet pané maison, oignon confit, raclette, bacon et sauce Ranch.",
            price: 8.9,
            image: "/big-smash/big-mountain.webp",
          },
          ["oignon confit", "raclette", "bacon"]
        ),
        bsBurger(
          {
            id: "big-fish",
            name: "Big Fish",
            description: "Potato bun, filet de colin pané maison, cheddar, salade iceberg et sauce Tartare.",
            price: 6.9,
            image: "/big-smash/big-fish.webp",
          },
          ["cheddar", "salade"]
        ),
      ],
    },
    {
      id: "hot-dogs",
      name: "Hot-dogs",
      items: [
        { id: "classic-dog", name: "Classic Dog", description: "Potato bun long, saucisse 100% boeuf, ketchup, moutarde US et oignons frits.", price: 3.9, image: "/big-smash/classic-dog.webp" },
        { id: "spicy-dog", name: "Spicy Dog", description: "Potato bun long, saucisse 100% boeuf, jalapenos émincé et sauce Spicy.", price: 3.9, image: "/big-smash/spicy-dog.webp" },
        { id: "cheesy-dog", name: "Cheesy Dog", description: "Potato bun long, saucisse 100% boeuf, sauce cheddar, pickles émincés et oignons frits.", price: 4.9, image: "/big-smash/cheesy-dog.webp" },
        { id: "bacon-dog", name: "Bacon Dog", description: "Potato bun long, saucisse 100% boeuf bacon, sauce smokey BBQ et oignons frits.", price: 4.9, image: "/big-smash/bacon-dog.webp" },
      ],
    },
    {
      id: "sides",
      name: "Sides",
      items: [
        { id: "frites-nature", name: "Frites nature", price: 3, image: "/big-smash/frites-nature.webp" },
        { id: "frites-epicees", name: "Frites épicées", price: 3.5, image: "/big-smash/frites-epicees.webp" },
        { id: "frites-cheddar", name: "Frites cheddar", price: 4, image: "/big-smash/frites-cheddar.webp" },
        { id: "frites-cheddar-bacon", name: "Frites cheddar bacon", price: 5, image: "/big-smash/frites-cheddar-bacon.webp" },
        { id: "pops-nature", name: "Pops nature", description: "Pomme de terre rapées assaisonnées en forme de petite boule.", price: 3.5, image: "/big-smash/pops-nature.webp" },
        { id: "pops-cheddar", name: "Pops cheddar", description: "Pomme de terre rapées assaisonnées en forme de petite boule avec sauce cheddar.", price: 4.5, image: "/big-smash/pops-cheddar.webp" },
        {
          id: "pops-cheddar-bacon",
          name: "Pops cheddar bacon",
          description: "Pomme de terre rapées assaisonnées en forme de petite boule avec sauce cheddar bacon.",
          price: 5.5,
          // Pas de visuel propre sur le site : celui des Pops cheddar.
          image: "/big-smash/pops-cheddar.webp",
        },
        { id: "chicken-pop-corn", name: "Chicken Pop-Corn", detail: "x15", description: "Morceaux de filet de poulet pané maison.", price: 5.9, image: "/big-smash/chicken-pop-corn.webp" },
        { id: "chicken-pop-corn-spicy", name: "Chicken Pop-Corn Spicy", description: "Morceaux de filet de poulet pané maison servi avec sa sauce spicy.", price: 7.9, image: "/big-smash/chicken-pop-corn-spicy.webp" },
        { id: "tenders", name: "Tenders", detail: "x4", description: "Filet de poulet pané maison.", price: 5.9, image: "/big-smash/tenders.webp" },
        { id: "nuggets", name: "Nuggets", detail: "x5", description: "Nuggets de poulet croustillant.", price: 3.9, image: "/big-smash/nuggets.webp" },
        {
          id: "crevettes-panees",
          name: "Crevettes panées",
          description: "Beignets de crevettes décortiquées croustillants servi avec sauce Big Sweety.",
          price: 5.9,
          image: "/big-smash/crevettes-panees.webp",
          /* « 5.90 - 9.90 » sur le site ; x5 et x10 sur leur carte Deliveroo. */
          options: [groupeChoix("quantite", "Quantité", [["x5", 0], ["x10", 4]], { obligatoire: true })],
        },
        { id: "little-smash", name: "Little Smash", description: "Potato bun, steak haché frais et smashé, cheddar, pickles et sauce Big Smash.", price: 4, image: "/big-smash/little-smash.webp" },
        {
          id: "little-wrap",
          name: "Little Wrap",
          description: "Galette garnie de tenders maison, salade, cheddar, oignons frits, avec la sauce de votre choix (Ranch ou Miel-Moutarde).",
          price: 2.95,
          image: "/big-smash/little-wrap.webp",
          options: [groupeChoix("sauce", "Sauce", ["Ranch", "Miel-Moutarde"], { obligatoire: true })],
        },
        { id: "little-wrap-spicy", name: "Little Wrap Spicy", description: "Galette garnie de cheddar, tenders, salade, jalapenos et sauce Spicy.", price: 2.95, image: "/big-smash/little-wrap-spicy.webp" },
        {
          id: "taco-smash",
          name: "Taco Smash",
          description: "Choisis ton Taco Smash (classique ou épicé).",
          price: 4.9,
          image: "/big-smash/taco-smash.webp",
          options: [groupeChoix("taco", "Taco", ["Classique", "Épicé"], { obligatoire: true })],
        },
        { id: "grilled-cheese", name: "Grilled Cheese", price: 2.5, image: "/big-smash/grilled-cheese.webp" },
        { id: "grilled-cheese-bacon", name: "Grilled Cheese Bacon", price: 3.5, image: "/big-smash/grilled-cheese-bacon.webp" },
        {
          id: "big-salade",
          name: "Big Salade",
          description: "Salade fraîche, tenders croustillants ou crevettes panées, tomates cerises, copeaux de parmesan, oignons frits et sauce Ranch ou Big Sweety.",
          price: 9.9,
          image: "/big-smash/big-salade.webp",
          options: [
            groupeChoix("garniture", "Garniture", ["Tenders croustillants", "Crevettes panées"], { obligatoire: true }),
            groupeChoix("sauce", "Sauce", ["Ranch", "Big Sweety"], { obligatoire: true }),
          ],
        },
        {
          id: "sauces",
          name: "Sauces",
          description: "Découvrez nos sauces exclusives Big Smash\u00a0: Big Smash, Spicy, Ranch et Miel-Moutarde\u00a0!",
          price: 0.4,
          image: "/big-smash/sauces.webp",
          options: [groupeChoix("sauce", "Sauce", BS_SAUCES, { obligatoire: true })],
        },
      ],
    },
    {
      id: "desserts",
      name: "Desserts",
      items: [
        {
          id: "milkshake",
          name: "Milkshake",
          description: "Milkshake avec parfum au choix (caramel, fraise & vanille) et chantilly.",
          price: 4.5,
          image: "/big-smash/milkshake.webp",
          options: [groupeChoix("parfum", "Parfum", ["Caramel", "Fraise", "Vanille"], { obligatoire: true })],
        },
        { id: "milkshake-pistache-macadamia", name: "Milkshake Pistache Macadamia", price: 4.95, image: "/big-smash/milkshake-pistache-macadamia.webp" },
        {
          id: "big-sundae",
          name: "Big Sundae",
          description: "Glace vanille avec coulis et topping au choix.",
          price: 3.5,
          image: "/big-smash/big-sundae.webp",
          options: [bsCoulis, bsTopping],
        },
        { id: "big-sundae-pistachio", name: "Big Sundae Pistachio", description: "Nappage pistache et éclats de pistache caramélisés.", price: 3.95, image: "/big-smash/big-sundae-pistachio.webp" },
        {
          id: "kool-dog",
          name: "Kool Dog",
          description: "Pain hot-dog, glace vanille avec coulis et topping au choix.",
          price: 3.9,
          image: "/big-smash/kool-dog.webp",
          options: [bsCoulis, bsTopping],
        },
        { id: "grilled-nutella", name: "Grilled Nutella", description: "Butter bread toasté et garni de Nutella.", price: 2.5, image: "/big-smash/grilled-nutella.webp" },
        { id: "kinder-country", name: "Kinder Country", description: "Chocolat Kinder au cœur au lait fondant et des céréales soufflées croustillantes.", price: 1, image: "/big-smash/kinder-country.webp" },
      ],
    },
    {
      id: "boissons",
      name: "Boissons",
      items: [
        {
          id: "the-limonade",
          name: "Thé & Limonade",
          price: 2.9,
          image: "/big-smash/the-limonade.webp",
          options: [groupeChoix("parfum", "Parfum", BS_THES_LIMONADES, { obligatoire: true })],
        },
        {
          id: "coca-cola",
          name: "Coca Cola",
          price: 1.9,
          image: "/big-smash/coca-cola.webp",
          // Les trois canettes du visuel du site.
          options: [groupeChoix("gout", "Goût", ["Original", "Sans Sucres", "Cherry"], { obligatoire: true })],
        },
        { id: "fuze-tea-peche", name: "Fuze Tea Pêche", price: 2.2, image: "/big-smash/fuze-tea-peche.webp" },
        { id: "red-bull", name: "Red Bull", price: 2.9, image: "/big-smash/red-bull.webp" },
        { id: "capri-sun", name: "Capri-Sun", price: 2, image: "/big-smash/capri-sun.webp" },
        { id: "badoit", name: "Badoit", price: 1.9, image: "/big-smash/badoit.webp" },
        { id: "evian", name: "Evian", price: 1.5, image: "/big-smash/evian.webp" },
        {
          id: "volvic",
          name: "Volvic",
          price: 2.5,
          image: "/big-smash/volvic.webp",
          // Les deux bouteilles du visuel du site.
          options: [groupeChoix("parfum", "Parfum", ["Juicy Fraise", "Zest Citron"], { obligatoire: true })],
        },
      ],
    },
  ],
};

/*
 * Chicken Street — démo pour le pitch au siège (CS DEVELOPPEMENT, Saint-Denis).
 * Noms et visuels : chickenstreet.fr/la-carte (visuels détourés posés en 16:9
 * dans public/chicken-street/) ; le site ne publie ni prix ni descriptions :
 * prix d'un agrégateur tiers (fastfoodsmenu.com, 08/03/2026), variables selon
 * le restaurant ; sauces, suppléments et nappages : tableau des allergènes du
 * 27/08/2026. Établissement affiché : Paris Gare de l'Est. Prix des menus,
 * suppléments et boissons déduits, questions au siège :
 * demos/chicken-street/profile.json. La carte est celle du site : la Ritchie
 * Box, le Naan Burger Fury et les bowls, absents du site, n'y sont pas (ni
 * visuel ni prix officiel). Le Naan Radikal, « suspendu momentanément » d'après
 * le relevé du tableau des allergènes, n'y figure pas.
 */

/* Les sauces du tableau des allergènes, hors BBQ (« suspendue momentanément »). */
const CS_SAUCES = ["Blanche", "Algérienne", "Samouraï", "Dynamite", "Monster", "Cheddar", "Sweet Thaï", "Ketchup", "Mayonnaise", "Moutarde Dijon", "Poivre"];
/* Boissons : la gamme que liste l'agrégateur (non confirmée par le siège). */
const CS_BOISSONS = ["Coca-Cola", "Coca-Cola Zero", "Coca-Cola Cherry", "Fanta Orange", "Sprite", "Fuze Tea", "Oasis Tropical"];

const csSauce = groupeChoix("sauce", "Sauce", CS_SAUCES, { obligatoire: true, prefixe: "Sauce " });
const csSauceEnPlus = groupeChoix("sauce-plus", "En plus", CS_SAUCES, { multiple: true, supplement: 0.2, prefixe: "Sauce " });
/* Les suppléments du tableau des allergènes ; leurs prix ne sont publiés nulle part (profile.json). */
const csSupplements = groupeChoix(
  "supplement",
  "Suppléments",
  [["Cheddar", 0.5], ["Œuf", 0.5], ["Boursin", 1], ["Galette de pomme de terre", 1], ["Steak haché", 2]],
  { multiple: true }
);
const csBoisson = groupeChoix("boisson", "Boisson 33\u00a0cl", CS_BOISSONS, { obligatoire: true });
const csAccompagnement = groupeChoix("accompagnement", "Accompagnement", [["Frites", 0], ["Onion rings", 1]], { obligatoire: true });
/* Nappages et brisures des glaces (tableau des allergènes). */
const csNappage = groupeChoix("nappage", "Nappage", ["Caramel salé", "Chocolat", "Nutella", "Fruits rouges", "Chocolat blanc"], { obligatoire: true });
const csBrisures = groupeChoix("brisures", "Brisures", ["Speculoos", "Daim", "M&M’s", "Oreo"], { obligatoire: true });

/** Écart supposé entre un article seul et son menu (frites, boisson) : à confirmer avec le siège. */
const CS_MENU_SUPPLEMENT = 3;

/** Un menu : l'article à la carte, frites ou onion rings, boisson, sauce. */
const csMenu = (id: string, name: string, base: number, image: string): MenuItem => ({
  id: `menu-${id}`,
  name: `Menu ${name}`,
  description: `${name}, frites ou onion rings, boisson 33\u00a0cl et sauce au choix.`,
  price: base + CS_MENU_SUPPLEMENT,
  image: `/chicken-street/${image}.webp`,
  options: [csAccompagnement, csBoisson, csSauce, csSauceEnPlus],
});

/** Un article à la carte : sa sauce, ses suppléments s'il en prend, une sauce en plus. */
const csItem = (id: string, name: string, price: number, extra: Partial<MenuItem> = {}, supplements = true): MenuItem => ({
  id,
  name,
  price,
  image: `/chicken-street/${id}.webp`,
  options: supplements ? [csSauce, csSupplements, csSauceEnPlus] : [csSauce, csSauceEnPlus],
  ...extra,
});

const chickenStreet: Restaurant = {
  slug: "chicken-street",
  name: "Chicken Street",
  tagline: "Paris Gare de l’Est",
  logo: "/chicken-street/logo.png",
  whiteLogo: true,
  logoIsName: true,
  icons: { tab: "/chicken-street/favicon.png", homeScreen: "/chicken-street/icon.png" },
  themeColor: "#000000",
  allergensUrl: "https://www.chickenstreet.fr/wp-content/uploads/2026/09/ALLERGENE-27-08-2026.pdf",
  address: "121 rue du Faubourg Saint-Martin, 75010 Paris",
  phone: "",
  // Fiche Google du restaurant, relevée le 06/10/2026.
  hours: "Tous les jours\u00a011h–\u20602h",
  highlights: ["Naan & fried chicken", "Halal", "La Street, c’est chic\u00a0!"],
  estimatorLive: true,
  categories: [
    {
      id: "menus",
      name: "Menus",
      tagline: "Frites ou onion rings, boisson et sauce",
      items: [
        csMenu("naan-tenders", "Naan Tenders", 7.5, "naan-tenders"),
        csMenu("naan-mix", "Naan Mix", 8.5, "naan-mix"),
        csMenu("street-b", "Street B", 6.5, "street-b"),
        csMenu("monster", "Monster", 6.5, "monster"),
        csMenu("tenders-5", "Tenders 5\u00a0pièces", 7.5, "tenders-5"),
        csMenu("burger-naan-dynamite", "Burger Naan Dynamite", 8.5, "burger-naan-dynamite"),
      ],
    },
    {
      id: "naans",
      name: "Naans",
      tagline: "La référence depuis 2011",
      items: [
        csItem("naan-tenders", "Naan Tenders", 7.5),
        csItem("naan-mix", "Naan Mix", 8.5),
        csItem("naan-farmer", "Naan Farmer", 8.5),
        csItem("naan-curry", "Naan Curry", 8.5),
        csItem("naan-tenders-steak", "Naan Tenders Steak", 8.5),
        csItem("naan-supreme", "Naan Supreme", 8.5),
        csItem("naan-thai", "Naan Thaï", 7.5),
        csItem("naan-steak", "Naan Steak", 7.5),
        csItem("naan-tikka", "Naan Tikka", 8.5),
        csItem("naan-imperial", "Naan Imperial", 8.5),
      ],
    },
    {
      id: "fried-chicken",
      name: "Fried Chicken",
      items: [
        csItem("tenders-5", "Tenders 5\u00a0pièces", 7.5, {}, false),
        csItem("wings-6", "Wings 6\u00a0pièces", 6.5, { image: "/chicken-street/wings.webp" }, false),
        csItem("wings", "Wings 10\u00a0pièces", 9.5, {}, false),
        csItem("tenders-n-cheese", "Tenders N Cheese", 5.5, {}, false),
        csItem("family-tenders", "Family Tenders", 29.9, { description: "20 tenders, à partager." }, false),
        csItem("family-mix", "Family Mix", 29.9, { description: "10 tenders et 15 wings, à partager." }, false),
        csItem("family-spicy", "Family Spicy", 29.9, { description: "33 wings épicés, à partager." }, false),
      ],
    },
    {
      id: "burgers",
      name: "Burgers & Wraps",
      items: [
        csItem("burger-naan-dynamite", "Burger Naan Dynamite", 8.5),
        csItem("burger-naan-onion-rings-bacon", "Burger Naan Onion Rings Bacon", 8.5),
        csItem("street-b", "Street B", 6.5),
        csItem("monster", "Monster", 6.5),
        csItem("twice", "Twice", 6.5),
        csItem("double-cheese", "Double Cheese", 4.95),
      ],
    },
    {
      id: "ptits-plaisirs",
      name: "P’tits plaisirs",
      items: [
        csItem("box-mix-16", "Box Mix 16\u00a0pièces", 11.9, {}, false),
        csItem("box-mix-solo", "Box Mix Solo", 4.9, {}, false),
        csItem("tenders-3", "Tenders 3\u00a0pièces", 4.5, {}, false),
        csItem("wings-3", "Wings 3\u00a0pièces", 3.5, {}, false),
        csItem("nuggets-4", "Nuggets 4\u00a0pièces", 3.5, {}, false),
        csItem("cheese", "Cheese", 3.5, {}, false),
        { id: "box-onion-rings", name: "Box Onion Rings", price: 2.95, image: "/chicken-street/box-onion-rings.webp" },
      ],
    },
    {
      id: "enfants",
      name: "Menus enfant",
      items: [
        { id: "menu-enfant-nuggets", name: "Menu Enfant Nuggets", price: 5.5, image: "/chicken-street/menu-enfant-nuggets.webp", options: [csBoisson] },
        { id: "menu-enfant-cheese", name: "Menu Enfant Cheese", price: 5.5, image: "/chicken-street/menu-enfant-cheese.webp", options: [csBoisson] },
      ],
    },
    {
      id: "desserts",
      name: "Desserts",
      items: [
        { id: "ice-street", name: "Ice Street", price: 3.5, image: "/chicken-street/ice-street.webp", options: [csNappage, csBrisures] },
        { id: "ice-mix", name: "Ice Mix", price: 3.95, image: "/chicken-street/ice-mix.webp", options: [csNappage, csBrisures] },
        { id: "tiramisu", name: "Tiramisu", price: 3.5, image: "/chicken-street/tiramisu.webp" },
      ],
    },
    {
      id: "boissons",
      name: "Boissons",
      items: [
        { id: "soda", name: "Soda 33\u00a0cl", price: 2.2, options: [groupeChoix("gout", "Goût", CS_BOISSONS, { obligatoire: true })] },
        { id: "fuze-tea-50", name: "Fuze Tea 50\u00a0cl", price: 2.7 },
        { id: "cristaline", name: "Cristaline 50\u00a0cl", price: 1.5 },
      ],
    },
  ],
};

/*
 * Baï-Kō (Montpellier, Arceaux) — démo pour le pitch au restaurant : Korean
 * street food et thaï, salle néon « pojangmacha », 100 % halal. La carte est
 * celle de bai-ko.com relevée le 12/10/2026 (demos/bai-ko/docs/), noms,
 * prix, piment, mentions et allergènes plat par plat ; les allergènes posés
 * sur un titre de section valent pour toute la section, et le « lactose » de
 * sa légende se lit « lait », le nom du règlement. Là où ses propres mots
 * nomment un allergène que sa légende oublie (fromage, parmesan, kimchi,
 * cacahuètes), la carte le déclare : trop vaut mieux que pas assez, en
 * attendant la confirmation du gérant (profile.json). Les photos sont
 * celles de la galerie du site, recadrées (public/bai-ko/) : les plats sans
 * photo n'en ont pas, plutôt qu'une photo de banque d'un autre plat. Le
 * bandeau reprend celui du site. Questions au gérant : demos/bai-ko/profile.json.
 */

/** Les allergènes que le site pose sur un titre de section (BK_VOLCANO : trois des quatre plats à partager, le Mandu a les siens). */
const BK_BIBIMBAP: Allergen[] = ["gluten", "oeuf", "soja", "sesame"];
const BK_PAD_THAI: Allergen[] = ["gluten", "oeuf", "soja", "arachides", "sesame"];
const BK_RAMYEON: Allergen[] = ["gluten", "oeuf", "soja", "sesame"];
// Le « mix de fromage fondu » des Volcano Cheese : lait, que la légende du site n'y pose pas.
const BK_VOLCANO: Allergen[] = ["gluten", "oeuf", "soja", "sesame", "lait"];

const bkPhoto = (file: string) => `/bai-ko/${file}.webp`;

/**
 * Le bibimbap se sert aussi en dolsot, le bol de pierre chauffé, pour 1 € de
 * plus ; le titre de la section dit ce qu'est un dolsot, le choix garde le mot
 * court que liront la salle et le ticket.
 */
const bkVersion = groupeChoix("version", "Version", ["Bol", ["Dolsot", 1]], { obligatoire: true });

/** Les plats des formules, dans l'ordre du site ; le dolsot ajoute 1 €. Le site pose 🌶 sur le poulet spicy, 🌶🌶 sur la salade au poulet. */
const bkPlatFormule = groupeChoix(
  "plat",
  "Plat",
  [
    "Bibimbap Beef",
    "Bibimbap Chicken sweet",
    "Bibimbap Chicken spicy (épicé)",
    "Bibimbap Tofu",
    ["Dolsot Beef", 1],
    ["Dolsot Chicken sweet", 1],
    ["Dolsot Chicken spicy (épicé)", 1],
    ["Dolsot Tofu", 1],
    "Pad Thaï Beef",
    "Pad Thaï Chicken",
    "Pad Thaï Veggie",
    "Salade Bœuf bulgogi",
    "Salade Chicken (épicée)",
    "Salade Tofu",
  ],
  { obligatoire: true }
);
const bkBoissonFormule = groupeChoix("boisson", "Boisson", ["Coca", "Zero", "Evian", "San Pellegrino", "Ice Tea"], { obligatoire: true });

/** « Supplément viande ou rabokki 5 € » des plats à partager. */
const bkSupplementPartage = groupeChoix("supplement", "Supplément", ["Viande", "Rabokki"], { multiple: true, supplement: 5 });

const baiKo: Restaurant = {
  slug: "bai-ko",
  // Sans le macron, comme le titre de leur site : dans Chromium, Fraunces (les
  // écrans du personnel) pose le macron de « ō » à côté de la lettre, et les
  // imprimantes de cuisine ne l'ont pas. La carte écrit le nom du logo.
  name: "Baï-Ko",
  brandName: "Baï-Kō",
  tagline: "From Seoul to Montpellier",
  logo: "/bai-ko/logo.webp",
  logoIsName: true,
  // Le même logo, à la taille d'un pied de page de marque : à 48 px de haut, « Thaï & Korean Food » ne se lisait plus.
  footerLogo: "/bai-ko/logo.webp",
  icons: { tab: "/bai-ko/favicon.png", homeScreen: "/bai-ko/icon.png" },
  themeColor: "#0a0a0c",
  address: "2 Avenue de Lodève, 34070 Montpellier",
  phone: "+33 6 14 05 59 71",
  onlinePayment: true,
  hours: "Tous les jours\u00a012h–14h30 · 18h30–23h30 (fermeture\u00a0cuisine 30\u00a0min avant)",
  // Les pastilles du site, sauf « Livraison » (le bandeau l'annonce déjà, par Uber Eats) ; en tête le
  // halal de son bandeau « Tous nos produits sont certifiés Halal », qui vaut pour toute la carte.
  highlights: ["100\u00a0% halal", "Dine-in", "Takeaway", "Ouvert 7j/7 · 12h–14h30 · 18h30–23h30"],
  // Le bandeau du site, dans son ordre.
  ticker: [
    { text: "Uber Eats\u00a0— livraison disponible" },
    { text: "Réservation possible à partir de 6 personnes", tone: "accent" },
    { text: "Baï·Kō\u00a0— Thaï & Korean Food", tone: "brand" },
    { text: "Menu étudiant Bento Box 10,90\u00a0€\u00a0— à partir du 1er septembre 2026", tone: "accent" },
  ],
  // Les « Infos » du site, sous sa carte : les mots marqués d'un astérisque.
  glossary: [
    { term: "Tteokbokki", definition: "Gâteaux de riz coréen" },
    { term: "Kimchi", definition: "Chou pimenté et fermenté, assaisonné d’épices coréennes" },
    { term: "Gochujang", definition: "Pâte de piment coréenne fermentée" },
    { term: "Bulgogi yuzu-citron", definition: "Marinade de fruits et légumes à base de sauce soja & miel yuzu-citron" },
  ],
  categories: [
    {
      id: "anju",
      name: "Anju — Tapas",
      kicker: { text: "안주", lang: "ko" },
      tagline: "Seul ou à partager",
      items: [
        { id: "corn-dog", name: "Corn Dog", description: "Saucisse & mozzarella panées", price: 6.5, image: bkPhoto("corn-dog"), allergens: ["gluten", "oeuf", "lait"] },
        {
          id: "tteokbokki",
          name: "Tteokbokki",
          description: "Gâteaux de riz, œuf & mozzarella marinés dans une sauce gochujang",
          price: 8,
          image: bkPhoto("tteokbokki"),
          spice: 2,
          tags: ["fermente"],
          allergens: ["gluten", "oeuf", "lait", "soja", "sesame"],
        },
        { id: "corn-cheese", name: "Corn Cheese", description: "Maïs et mozzarella fondante, dans une sauce mayonnaise sucrée", price: 6, image: bkPhoto("corn-cheese"), allergens: ["lait", "oeuf"] },
        { id: "sotteok-so-tteok", name: "Sotteok-So-tteok", description: "Brochette de tteokbokki et de saucisses", price: 5, spice: 1, allergens: ["gluten", "soja", "sesame"] },
        // Son kimchi porte les crustacés et le poisson que le site déclare sur le Kimchi.
        {
          id: "kimchi-bomb",
          name: "Kimchi Bomb",
          description: "Arancini de riz sauté au kimchi et mozzarella",
          price: 5,
          spice: 1,
          tags: ["fermente"],
          allergens: ["gluten", "oeuf", "lait", "crustaces", "poisson"],
        },
        { id: "mandu", name: "Mandu", detail: "x4", description: "Raviolis grillés aux légumes", price: 6, tags: ["vegetarien"], allergens: ["gluten", "oeuf", "sesame", "soja", "arachides", "celeri"] },
        { id: "nem", name: "Nem", detail: "x3", description: "Au poulet", price: 6, allergens: ["gluten", "oeuf", "soja", "arachides", "sesame", "celeri"] },
        {
          id: "korean-fried-chicken",
          name: "Korean Fried Chicken",
          detail: "x4",
          description: "Spicy (épicé) ou Sweet (soja & miel) · Servi avec quelques tteokbokki frits",
          price: 8,
          image: bkPhoto("korean-fried-chicken"),
          // Le site lui met son badge « Spicy » : la sauce douce reste au choix.
          spice: 1,
          options: [groupeChoix("sauce", "Sauce", ["Spicy (épicé)", "Sweet (soja & miel)"], { obligatoire: true })],
          allergens: ["gluten", "oeuf", "lait", "soja", "sesame"],
        },
        { id: "cheese-chicken-katsu", name: "Cheese Chicken Katsu", detail: "x4", description: "Poulet pané farci à la mozzarella", price: 10, allergens: ["gluten", "oeuf", "lait"] },
      ],
    },
    {
      id: "bibimbap",
      name: "Bibimbap",
      kicker: { text: "돌솥비빔밥", lang: "ko" },
      tagline: "Riz, légumes, garniture et œuf · Version Dolsot (bol en pierre chauffé) +1\u00a0€",
      items: [
        { id: "beef-bulgogi-bap", name: "Beef Bulgogi Bap", description: "Bœuf sauté, sauce bulgogi", price: 14.9, options: [bkVersion], allergens: BK_BIBIMBAP },
        { id: "dak-bap-spicy", name: "Dak Bap Spicy", description: "Poulet frit dans une sauce à base de gochujang", price: 14.9, image: bkPhoto("dak-bap-spicy"), spice: 1, options: [bkVersion], allergens: BK_BIBIMBAP },
        { id: "dak-bap-sweet", name: "Dak Bap Sweet", description: "Poulet frit dans une sauce coréenne ail, miel & soja", price: 14.9, options: [bkVersion], allergens: BK_BIBIMBAP },
        { id: "tofu-bap", name: "Tofu Bap", description: "Tofu mariné dans une sauce coréenne soja", price: 14.9, tags: ["vegetarien"], options: [bkVersion], allergens: BK_BIBIMBAP },
      ],
    },
    {
      id: "pad-thai",
      name: "Pad Thaï",
      tagline: "Nouilles de riz, légumes, garniture et œuf",
      items: [
        { id: "pad-thai-beef", name: "Pad Thaï Beef", description: "Bœuf sauté, sauce soja", price: 14.9, image: bkPhoto("pad-thai-beef"), allergens: BK_PAD_THAI },
        { id: "pad-thai-chicken", name: "Pad Thaï Chicken", description: "Poulet, sauce soja", price: 14.9, image: bkPhoto("pad-thai-chicken"), allergens: BK_PAD_THAI },
        { id: "pad-thai-shrimp", name: "Pad Thaï Shrimp", description: "Crevettes sautées, sauce soja", price: 15.9, allergens: [...BK_PAD_THAI, "crustaces"] },
        { id: "pad-thai-veggie", name: "Pad Thaï Veggie", description: "Tofu & légumes sautés, sauce soja", price: 14.9, tags: ["vegetarien"], allergens: BK_PAD_THAI },
      ],
    },
    {
      id: "a-partager",
      name: "À partager\u00a0!",
      kicker: { text: "공유할 요리", lang: "ko" },
      tagline: "Servi sur plaque chauffante, pour 2, avec 2 bols de riz · Supplément viande ou rabokki 5\u00a0€",
      items: [
        { id: "volcano-cheese-dakgalbi", name: "Volcano Cheese Dakgalbi", detail: "pour 2", description: "Poulet sauté avec mix de fromage fondu", price: 34, spice: 3, options: [bkSupplementPartage], allergens: BK_VOLCANO },
        {
          id: "volcano-cheese-beef-bulgogi",
          name: "Volcano Cheese Beef Bulgogi",
          detail: "pour 2",
          description: "Bœuf sauté avec mix de fromage fondu",
          price: 34,
          image: bkPhoto("volcano-cheese-beef-bulgogi"),
          spice: 1,
          options: [bkSupplementPartage],
          allergens: BK_VOLCANO,
        },
        {
          id: "volcano-cheese-mandu",
          name: "Volcano Cheese Mandu",
          detail: "pour 2",
          description: "Ravioli avec mix de fromage fondu",
          price: 32,
          image: bkPhoto("volcano-cheese-mandu"),
          tags: ["vegetarien"],
          options: [bkSupplementPartage],
          allergens: ["gluten", "oeuf", "soja", "arachides", "sesame", "celeri", "lait"],
        },
        { id: "volcano-cheese-rabokki", name: "Volcano Cheese Rabokki", detail: "pour 2", description: "Tteokbokki & ramen sautés avec mix de fromage fondu", price: 34, spice: 2, options: [bkSupplementPartage], allergens: BK_VOLCANO },
      ],
    },
    {
      id: "ramyeon",
      name: "Ramyeon",
      kicker: { text: "라면", lang: "ko" },
      tagline: "Ramen coréen · Bouillon coréen épicé, servi avec légumes, nouilles udon",
      items: [
        { id: "bulgogi-ramyeon", name: "Bulgogi Ramyeon", description: "Bœuf façon bulgogi", price: 16, spice: 2, allergens: BK_RAMYEON },
        { id: "dak-ramyeon", name: "Dak Ramyeon", description: "Chicken spicy", price: 16, spice: 3, allergens: BK_RAMYEON },
        { id: "dubu-ramyeon", name: "Dubu Ramyeon", description: "Tofu", price: 16, spice: 2, tags: ["vegetarien"], allergens: BK_RAMYEON },
      ],
    },
    {
      id: "salades",
      name: "Salades",
      kicker: { text: "샐러드", lang: "ko" },
      items: [
        { id: "beef-salad", name: "Beef Salad", description: "Salade au bœuf mariné, sauce bulgogi yuzu-citron", price: 14.9, allergens: ["gluten", "oeuf", "soja", "sesame"] },
        { id: "chicken-salad", name: "Chicken Salad", description: "Salade au poulet mariné, sauce bulgogi yuzu-citron", price: 14.9, spice: 2, allergens: ["gluten", "oeuf", "soja", "sesame"] },
        { id: "tofu-salad", name: "Tofu Salad", description: "Salade au tofu caramélisé, sauce bulgogi yuzu-citron", price: 14.9, tags: ["vegetarien"], allergens: ["gluten", "sesame", "soja", "moutarde", "arachides"] },
      ],
    },
    {
      id: "sides",
      name: "Sides",
      kicker: { text: "사이드", lang: "ko" },
      items: [
        { id: "riz-blanc", name: "Riz blanc", price: 3 },
        { id: "kimchi", name: "Kimchi", description: "Chou pimenté et fermenté, assaisonné d’épices coréennes", price: 3, image: bkPhoto("kimchi"), spice: 2, tags: ["fermente"], allergens: ["crustaces", "poisson"] },
        { id: "frites-classiques", name: "Frites Classiques", price: 3 },
        // Le parmesan : lait, que le site ne déclare pas.
        { id: "gamja-crispy", name: "Gamja Crispy", description: "Frites parmesan et herbes", price: 4.5, allergens: ["lait"] },
      ],
    },
    {
      id: "desserts",
      name: "Desserts",
      kicker: { text: "디저트", lang: "ko" },
      items: [
        {
          id: "mochi",
          name: "Mochi",
          description: "Mangue\u00a0Passion\u00a0· Choco-coco\u00a0· Litchi\u00a0· Vanille\u00a0· Yuzu-citron\u00a0· Thé\u00a0Vert\u00a0· Fleur\u00a0de\u00a0Cerisier",
          price: 3.5,
          options: [groupeChoix("parfum", "Parfum", ["Mangue Passion", "Choco-coco", "Litchi", "Vanille", "Yuzu-citron", "Thé Vert", "Fleur de Cerisier"], { obligatoire: true })],
        },
        // « cacahuètes » : la légende de sa photo dans la galerie du site ; sa carte ne lui donne pas d'allergène.
        { id: "mango-rice", name: "Mango Rice", description: "Riz gluant à la mangue et au lait de coco, cacahuètes", price: 8, image: bkPhoto("mango-rice"), allergens: ["arachides"] },
      ],
    },
    {
      id: "boissons",
      name: "Boissons",
      kicker: { text: "음료수", lang: "ko" },
      items: [
        { id: "eau", name: "Evian, San Pellegrino", detail: "50\u00a0cl", price: 3.5, options: [groupeChoix("eau", "Eau", ["Evian", "San Pellegrino"], { obligatoire: true })] },
        {
          id: "coca",
          name: "Coca",
          detail: "33\u00a0cl",
          description: "Coca\u00a0· Coca\u00a0Zéro\u00a0· Coca\u00a0Cherry",
          price: 3,
          options: [groupeChoix("coca", "Version", ["Coca", "Coca Zéro", "Coca Cherry"], { obligatoire: true })],
        },
        { id: "ice-tea", name: "Ice Tea", detail: "33\u00a0cl", price: 3.5 },
        { id: "chilsung", name: "Sprit Coréen Chilsung", detail: "25\u00a0cl", price: 4 },
        {
          id: "soda",
          name: "Soda",
          detail: "25\u00a0cl",
          description: "Pastèque\u00a0· Yuzu-citron\u00a0· Raisin",
          price: 4,
          options: [groupeChoix("parfum", "Parfum", ["Pastèque", "Yuzu-citron", "Raisin"], { obligatoire: true })],
        },
        { id: "aloe-vera", name: "Aloe Vera", detail: "25\u00a0cl", price: 3.5 },
        { id: "bongbong", name: "Bongbong", detail: "25\u00a0cl", description: "Raisin", price: 4 },
        {
          id: "milkis",
          name: "Milkis",
          detail: "25\u00a0cl",
          description: "Fraise\u00a0· Melon\u00a0· Nature",
          price: 4,
          image: bkPhoto("milkis"),
          options: [groupeChoix("parfum", "Parfum", ["Fraise", "Melon", "Nature"], { obligatoire: true })],
        },
        { id: "cafe", name: "Café", price: 2.5 },
      ],
    },
    {
      id: "formules",
      name: "Formules",
      items: [
        {
          id: "menu-midi",
          name: "Menu Midi",
          description: "Plat + boisson\nBibimbap (Dolsot +1\u00a0€), pad thaï ou salade\nCoca, Zero, Evian, San Pellegrino ou Ice Tea",
          price: 16.9,
          options: [bkPlatFormule, bkBoissonFormule],
        },
        {
          id: "menu",
          name: "Menu",
          description: "Entrée + plat + boisson\nMandu (x3) ou nems (x2)\nBibimbap (Dolsot +1\u00a0€), pad thaï ou salade\nCoca, Zero, Evian, San Pellegrino ou Ice Tea",
          price: 20.9,
          options: [groupeChoix("entree", "Entrée", ["Mandu (x3)", "Nems (x2)"], { obligatoire: true }), bkPlatFormule, bkBoissonFormule],
        },
      ],
    },
  ],
};

/*
 * L'Adresse (Portet-sur-Garonne, au sud-ouest de Toulouse) — prospect,
 * « restaurant lounge » : cuisine maison, cocktails sans alcool, chichas.
 * Carte transcrite de leur menu numérique (NFC For You, mis à jour le
 * 2 octobre 2026), articles disponibles seulement ; coquilles évidentes
 * corrigées, chacune listée dans le profil. Identité relevée sur leur logo,
 * la carte imprimée de 2021 et la façade : anthracite bleuté, dorure, nom
 * manuscrit, ruban « Restaurant Lounge ». Source de vérité du profil :
 * demos/l-adresse/profile.json.
 */

/* « Accompagnement : purée, purée de patate douce, poêlé de légumes » — une
   ligne sans prix de leur carte. Les viandes en proposent un au choix :
   déduction à confirmer avec le gérant. */
const ADRESSE_ACCOMPAGNEMENTS = [
  "Purée",
  "Purée de patate douce",
  "Poêlée de légumes",
] as const;

const adresseAccompagnement = groupeChoix(
  "accompagnement",
  "Accompagnement",
  ADRESSE_ACCOMPAGNEMENTS,
  { obligatoire: true }
);

/* « Supplément accompagnement : 4 € », en tête des plats. « … en plus » :
   sur la feuille comme sur le ticket, ne se confond pas avec celui inclus. */
const adresseSupplement = groupeChoix(
  "supplement-accompagnement",
  "Accompagnement supplémentaire",
  ADRESSE_ACCOMPAGNEMENTS.map((label) => `${label} en plus`),
  { supplement: 4, multiple: true }
);

const adresseViande = [CUISSON, adresseAccompagnement, adresseSupplement];

const adresseSaladeCesar = groupeChoix(
  "poulet",
  "Préparation du poulet",
  ["Poulet", "Poulet pané"],
  { obligatoire: true }
);

/* La fiche Google de l'établissement : avis et itinéraire. */
const ADRESSE_FICHE_GOOGLE = "ChIJVVswUVa5rhIR5meIm1C9vkM";

const lAdresse: Restaurant = {
  slug: "l-adresse",
  name: "L’Adresse",
  tagline: "Restaurant Lounge",
  // Le logo tracé d'après leur fichier (docs/logo.png) : le nom manuscrit ;
  // le ruban suit, à part, sous l'accroche (.theme-l-adresse).
  logo: "/l-adresse/logo-nom.svg",
  logoIsName: true,
  footerLogo: "/l-adresse/logo.svg",
  themeColor: "#24272f",
  icons: { tab: "/l-adresse/favicon.png", homeScreen: "/l-adresse/icon.png" },
  address: "8 Chemin des Genêts, 31120 Portet-sur-Garonne",
  phone: "+33 5 34 49 07 66",
  // Insécables dans chaque groupe de jours, gluon (U+2060) après le tiret :
  // la ligne ne se coupe qu'entre deux groupes.
  hours:
    "Mer,\u00a0jeu,\u00a0dim\u00a019h30–\u20602h · Ven,\u00a0sam\u00a019h30–\u20603h · Fermé\u00a0lun,\u00a0mar",
  highlights: ["Cuisine maison", "Cocktails sans alcool", "Chichas premium"],
  googleReviewUrl: `https://search.google.com/local/writereview?placeid=${ADRESSE_FICHE_GOOGLE}`,
  placeId: ADRESSE_FICHE_GOOGLE,
  formules: [
    {
      id: "formule-classique",
      name: "Formule Classique",
      description: "Entrée, plat, dessert",
      price: 36,
      disponible: true,
      etapes: [
        {
          id: "entree",
          name: "Entrée",
          obligatoire: true,
          articles: [
            {
              id: "salade-cesar",
              name: "Salade César",
              detail: "poulet ou poulet pané, croûtons, œuf, parmesan, romaine, sauce césar maison",
              supplement: 0,
              itemId: "salade-cesar",
              options: [adresseSaladeCesar],
            },
            {
              id: "salade-burrata",
              name: "Salade Burrata",
              detail: "mesclun, pignons, tomate, pesto et réduction balsamique",
              supplement: 0,
              itemId: "salade-burrata",
            },
            {
              id: "salade-paysanne",
              name: "Salade paysanne",
              detail: "toast de chèvre (cabécou) et petits lardons fumés",
              supplement: 0,
              itemId: "salade-paysanne",
            },
          ],
        },
        {
          id: "plat",
          name: "Plat",
          obligatoire: true,
          articles: [
            { id: "tagliatelles-saumon", name: "Tagliatelles, saumon", supplement: 0, itemId: "tagliatelles-saumon" },
            { id: "tagliatelles-pesto-burrata", name: "Tagliatelles, pesto burrata", supplement: 0, itemId: "tagliatelles-pesto-burrata" },
            {
              id: "faux-filet",
              name: "Faux filet",
              supplement: 0,
              itemId: "faux-filet",
              // Les options du plat de la carte, comme le fera la base : un
              // article de formule lié à un plat en reprend les options.
              options: adresseViande,
            },
            { id: "tagliatelles-forestiere", name: "Tagliatelles forestière", supplement: 0, itemId: "tagliatelles-forestiere" },
          ],
        },
        {
          id: "dessert",
          name: "Dessert",
          obligatoire: true,
          articles: [
            { id: "fondant-chocolat", name: "Fondant chocolat", supplement: 0, itemId: "fondant-chocolat" },
            { id: "tiramisu-du-moment", name: "Tiramisu du moment", supplement: 0 },
          ],
        },
      ],
    },
  ],
  categories: [
    {
      id: "entrees",
      name: "Entrées",
      items: [
        {
          id: "salade-cesar",
          name: "Salade César",
          image: pexels("28618639/pexels-photo-28618639.jpeg", 800),
          description:
            "Poulet ou poulet pané, croûtons, œuf, parmesan, romaine, sauce césar maison",
          price: 15,
          options: [adresseSaladeCesar],
        },
        {
          id: "salade-burrata",
          name: "Salade Burrata",
          image: pexels("3510248/pexels-photo-3510248.jpeg", 800),
          description: "Mesclun, pignons, tomate, pesto et réduction balsamique",
          price: 15,
        },
        {
          id: "salade-paysanne",
          name: "Salade paysanne",
          description: "Toast de chèvre (cabécou) et petits lardons fumés",
          price: 15,
        },
        {
          id: "medaillon-foie-gras",
          name: "Médaillon de foie gras",
          image: pexels("6880221/pexels-photo-6880221.jpeg", 800),
          description: "Toasts grillés, confiture de figues",
          price: 18,
        },
        { id: "hot-wings", name: "Hot Wings", detail: "8 pièces", price: 12, image: pexels("7230625/pexels-photo-7230625.jpeg", 800) },
        { id: "nuggets", name: "Nuggets", detail: "8 pièces", price: 12, image: pexels("20535805/pexels-photo-20535805.jpeg", 800) },
      ],
    },
    {
      id: "plats",
      name: "Plats",
      tagline:
        "Accompagnements : purée, purée de patate douce ou poêlée de légumes (poivrons rouges et verts, courgettes, brocolis) · supplément\u00a0accompagnement\u00a04\u00a0€ · supplément\u00a0sauce\u00a03\u00a0€",
      items: [
        {
          id: "entrecote",
          name: "Entrecôte",
          image: pexels("16272317/pexels-photo-16272317.jpeg", 800),
          detail: "350\u00a0g",
          price: 26,
          options: adresseViande,
        },
        { id: "faux-filet", name: "Faux filet", price: 25, options: adresseViande, image: pexels("36734926/pexels-photo-36734926.jpeg", 800) },
        { id: "magret-canard", name: "Magret de canard", price: 28, options: adresseViande, image: pexels("34629958/pexels-photo-34629958.jpeg", 800) },
        {
          id: "souris-agneau",
          name: "Souris d’agneau",
          image: pexels("16588046/pexels-photo-16588046.jpeg", 800),
          price: 29,
          options: [adresseAccompagnement, adresseSupplement],
        },
        {
          id: "supreme-volaille",
          name: "Suprême de volaille sauce foie gras",
          image: unsplash("photo-1552723545-1dd9665ace51", 800),
          description: "Blanc de poulet, tagliatelles, sauce forestière",
          price: 25,
        },
        {
          id: "pave-saumon",
          name: "Pavé de saumon",
          image: pexels("17681856/pexels-photo-17681856.jpeg", 800),
          description:
            "Accompagné d’une sauce beurre blanc à l’aneth et écrasée de pomme de terre",
          price: 25,
        },
        {
          id: "tagliatelles-truffe",
          name: "Tagliatelles à la truffe et sabota crémeuse",
          image: pexels("7491886/pexels-photo-7491886.jpeg", 800),
          price: 24,
        },
        { id: "tagliatelles-pesto-burrata", name: "Tagliatelles, pesto burrata", price: 20, image: pexels("39956106/pexels-photo-39956106.jpeg", 800) },
        // Sans photo : la seule libre montrait un saumon gris, qu'on prenait
        // pour du poulet. Les lignes sans photo suivent un nombre pair de
        // plats photographiés (voir .theme-l-adresse, la grille en bureau).
        { id: "tagliatelles-saumon", name: "Tagliatelles, saumon", price: 24 },
        {
          id: "fusilli-truffe-burrata",
          name: "Fusilli à la truffe avec burrata",
          description: "Pâtes à la truffe",
          price: 25,
        },
        { id: "tagliatelles-forestiere", name: "Tagliatelles forestière", price: 20, image: unsplash("photo-1727005217349-66276af3aa7d", 800) },
        { id: "beef-burger", name: "Beef Burger", price: 18, options: [CUISSON], image: pexels("10922928/pexels-photo-10922928.jpeg", 800) },
        { id: "chicken-burger", name: "Chicken Burger", price: 18, image: pexels("7963144/pexels-photo-7963144.jpeg", 800) },
        { id: "supplement-foie-gras", name: "Supplément foie gras", price: 7 },
      ],
    },
    {
      id: "desserts",
      name: "Desserts",
      tagline: "Tous nos desserts sont faits maison",
      items: [
        { id: "creme-brulee-pistache", name: "Crème brûlée pistache", price: 8, image: pexels("36295521/pexels-photo-36295521.jpeg", 800) },
        { id: "fondant-chocolat", name: "Fondant chocolat", price: 8, image: pexels("20377567/pexels-photo-20377567.jpeg", 800) },
        {
          id: "brioche-perdue",
          name: "Brioche perdue, glace vanille et caramel beurre salé",
          image: pexels("30458468/pexels-photo-30458468.jpeg", 800),
          printName: "Brioche perdue",
          price: 8,
        },
      ],
    },
    {
      id: "cocktails",
      name: "Cocktails",
      tagline: "Sans alcool",
      items: [
        {
          id: "copacabana",
          name: "Copacabana",
          image: pexels("24038051/pexels-photo-24038051.jpeg", 800),
          description: "Purée de passion, purée de mangue, lait",
          price: 8,
        },
        {
          id: "mojito",
          name: "Mojito",
          image: pexels("7259054/pexels-photo-7259054.jpeg", 800),
          description: "Classique / Mangue / Fraise / Fruits rouges",
          price: 8,
          options: [
            groupeChoix("parfum", "Parfum", ["Classique", "Mangue", "Fraise", "Fruits rouges"], {
              obligatoire: true,
            }),
          ],
        },
        { id: "sunset", name: "SunSet", description: "Ananas, mangue, kiwi", price: 8, image: pexels("10986584/pexels-photo-10986584.jpeg", 800) },
        { id: "pina-colada", name: "Piña Colada", description: "Ananas, lait de coco", price: 8, image: pexels("13906952/pexels-photo-13906952.jpeg", 800) },
      ],
    },
    {
      id: "boissons",
      name: "Boissons",
      items: [
        {
          id: "coca-cola",
          name: "Coca-Cola",
          description: "Classique / Cherry / Zéro",
          price: 4,
          options: [
            groupeChoix("variante", "Variante", ["Classique", "Cherry", "Zéro"], {
              obligatoire: true,
            }),
          ],
        },
        { id: "orangina", name: "Orangina", price: 4 },
        { id: "sprite", name: "Sprite", price: 4 },
        { id: "ice-tea", name: "Ice Tea", price: 4 },
        { id: "oasis", name: "Oasis", price: 4 },
        { id: "schweppes-agrumes", name: "Schweppes Agrumes", price: 4 },
        {
          id: "diabolo",
          name: "Diabolo",
          description:
            "Sirop au choix : menthe, grenadine, fraise, pêche, cassis, cerise, kiwi, violette, framboise",
          price: 4,
          options: [
            groupeChoix("sirop", "Sirop", [
              "Menthe",
              "Grenadine",
              "Fraise",
              "Pêche",
              "Cassis",
              "Cerise",
              "Kiwi",
              "Violette",
              "Framboise",
            ], { obligatoire: true }),
          ],
        },
        { id: "red-bull", name: "Red Bull", price: 5 },
        // La contenance dans le nom, et non en mention de format : une ligne de
        // commande ne garde que le nom, le bar lisait « Eau plate » pour les
        // deux bouteilles.
        { id: "eau-plate-50cl", name: "Eau plate 50\u00a0cl", price: 3.5 },
        { id: "eau-plate-1l", name: "Eau plate 1\u00a0L", price: 5 },
        { id: "eau-petillante-50cl", name: "Eau pétillante 50\u00a0cl", price: 4 },
        { id: "eau-petillante-1l", name: "Eau pétillante 1\u00a0L", price: 6 },
        { id: "the-menthe", name: "Thé menthe fraîche", price: 2 },
      ],
    },
    {
      id: "chichas",
      name: "Chichas",
      tagline: "Tabac sans nicotine",
      items: [
        {
          id: "chicha-plate",
          name: "Chicha Plate",
          image: pexels("35688051/pexels-photo-35688051.jpeg", 800),
          description: "Menthe, Hawaii, Love, Mi Amor",
          price: 15,
          vatRate: 20,
          options: [
            groupeChoix("parfum", "Parfum", ["Menthe", "Hawaii", "Love", "Mi Amor"], {
              obligatoire: true,
            }),
          ],
        },
        {
          id: "chicha-khaloud",
          name: "Chicha Khaloud",
          image: pexelsRecadre("11089743/pexels-photo-11089743.jpeg", 800),
          description: "Mi Amor, Hawaii, Love 66",
          price: 20,
          vatRate: 20,
          options: [
            groupeChoix("parfum", "Parfum", ["Mi Amor", "Hawaii", "Love 66"], {
              obligatoire: true,
            }),
          ],
        },
      ],
    },
  ],
};

/*
 * Quatre adresses de l'Écusson (Montpellier), démos de prospection du
 * 14 octobre 2026 : Le Novelty, Le Victoria, Café des Arts — trois bars du
 * même groupe, autour de la place Castellane — et Caffè Panis, place du
 * Marché aux Fleurs. Aucun document remis par les gérants : chaque carte est
 * relevée sur le web (leur site, Deliveroo, TheFork, l'ancien site), source
 * par source dans demos/<slug>/docs/recherche-carte.md. Les prix sont à
 * valider avec eux ; les questions ouvertes vivent dans demos/<slug>/profile.json.
 */

type Formats = readonly (readonly [string, number])[];

/** Les formats d'un article (25 cl, 50 cl, 1 L ; x6, x12), chacun à son prix entier ; l'article coûte le premier. */
const groupeFormats = (prix: Formats, id = "volume", name = "Volume"): OptionGroup => ({
  ...groupeChoix(
    id,
    name,
    prix.map(([label, montant]) => [label, Math.round((montant - prix[0][1]) * 100) / 100] as const),
    { obligatoire: true }
  ),
  formats: true,
});

/**
 * Un article en plusieurs formats : la fiche annonce tous les prix, sur une
 * ligne à part (`tarifs`), que la feuille d'options ne répète pas. Pas dans
 * `detail`, qui nomme la ligne de commande (« Coca 33 cl ») : le format
 * choisi y figure déjà comme option. Les autres groupes d'`options` suivent
 * celui des formats.
 */
const articleFormats = (
  id: string,
  name: string,
  prix: Formats,
  { options = [], ...extra }: Partial<MenuItem> = {},
  groupe: readonly [id: string, name: string] | [] = []
): MenuItem => {
  return {
    id,
    name,
    tarifs: formatsLine(prix),
    price: prix[0][1],
    options: [groupeFormats(prix, ...groupe), ...options],
    ...extra,
  };
};

const ALCOOL = { vatRate: 20 } as const;

/** La roue du jour de Caffè Panis, reprise telle quelle par les aperçus de l'Écusson et Rosemarie. */
const roueDuJour: LoyaltyWheelConfig = {
  // Environ 13 points le tour : les petites parts reviennent souvent, +50 rarement.
  slices: [
    { points: 5, weight: 32 },
    { points: 10, weight: 26 },
    { points: 15, weight: 20 },
    { points: 20, weight: 12 },
    { points: 30, weight: 6 },
    { points: 50, weight: 4 },
  ],
  // Provisoire, à valider : le 7e jour d'affilée, les points du tour doublent.
  golden: { every: 7, multiplier: 2 },
};

/*
 * Le Novelty — 10 rue Saint-Guilhem. Toute la carte vient de leur site
 * (lenovelty-montpellier.fr, ouvert le 14 octobre 2026) : les onglets
 * Cocktails · Bières · Softs & Cafés mot pour mot, la carte Tapas et la
 * Formule Goûter lues sur leurs visuels (demos/le-novelty/docs/).
 */
/** Les parfums des mojitos et caïpis des bars de la place Castellane (Novelty, Café des Arts). */
const PARFUMS_FRUITS = ["Mangue", "Fraise", "Framboise", "Passion", "Pêche"];

const NOVELTY_PARFUMS = groupeChoix("parfum", "Parfum", PARFUMS_FRUITS, { aucun: "Sans parfum" });
/** Les sirops que le site nomme sous « Sirop à l'Eau » ; sa liste finit par « … ». */
const NOVELTY_SIROPS = ["Grenadine", "Pêche", "Menthe", "Fraise", "Citron"];
const NOVELTY_SIROP = groupeChoix("sirop", "Sirop", NOVELTY_SIROPS, { obligatoire: true });

/**
 * La condition d'un sous-choix de formule : l'un de ces libellés choisi dans
 * ce groupe. Les ids viennent du groupe lui-même et les libellés partagés
 * sont des constantes : un renommage ne défait pas la condition.
 */
const noveltySi = (groupe: OptionGroup, ...libelles: string[]): OptionGroup["when"] => ({
  group: groupe.id,
  choices: groupe.choices.filter(({ name }) => libelles.includes(name)).map(({ id }) => id),
});
const NOVELTY_DIABOLO = "Diabolo";
const NOVELTY_SIROP_A_L_EAU = "Sirop";
const NOVELTY_BOISSON_CHAUDE = "Boisson chaude";
/** Le parfum de la boisson d'une formule, demandé quand elle est un sirop ou un diabolo. */
const noveltySiropFormule = (boissons: OptionGroup) =>
  groupeChoix("sirop", "Parfum", NOVELTY_SIROPS, {
    obligatoire: true,
    when: noveltySi(boissons, NOVELTY_DIABOLO, NOVELTY_SIROP_A_L_EAU),
  });
const NOVELTY_GOUTER_BOISSON = groupeChoix(
  "boisson",
  "Boisson",
  [NOVELTY_BOISSON_CHAUDE, NOVELTY_DIABOLO, "Limonade", NOVELTY_SIROP_A_L_EAU],
  { obligatoire: true }
);
/** Les boissons chaudes sans alcool de la carte, toutes : la liste de la formule est au gérant. */
const NOVELTY_GOUTER_BOISSON_CHAUDE = groupeChoix(
  "boisson-chaude",
  NOVELTY_BOISSON_CHAUDE,
  [
    "Café",
    "Noisette",
    "Décaféiné",
    "Café Allongé",
    "Double Café",
    "Café Crème",
    "Cappuccino",
    "Chocolat Chaud",
    "Café Viennois",
    "Chocolat Viennois",
    "Thé",
    "Infusion",
  ],
  { obligatoire: true, when: noveltySi(NOVELTY_GOUTER_BOISSON, NOVELTY_BOISSON_CHAUDE) }
);
const NOVELTY_ETUDIANTE_BOISSON = groupeChoix(
  "boisson",
  "Boisson",
  ["Coca", "Fuzetea", "Limonade", NOVELTY_SIROP_A_L_EAU, NOVELTY_DIABOLO],
  { obligatoire: true }
);
/**
 * Les heures de l'affiche happy hour : le bandeau, les points forts et chaque
 * prix les citent. L'étiquette ne se coupe qu'après « Happy hours » ou après
 * le deux-points (« 17h– / 23h » se lisait mal).
 */
const NOVELTY_HAPPY_HOURS = "Happy\u00a0hours 17h\u2060–\u206023h";
/** Les prix de l'affiche : sous chaque article concerné et dans le bandeau. */
const NOVELTY_HH = { cocktail: "6", sansAlcool: "5,50", pinteKro: "4", pinteMonaco: "4,20" } as const;
const noveltyHappyHour = (prix: string) => `${NOVELTY_HAPPY_HOURS}\u00a0: ${prix}\u00a0€`;
// Une case à cocher plutôt qu'un choix obligatoire : le cocktail classique s'ajoute sans détour.
const NOVELTY_XXL = groupeChoix("format", "Format", [["XXL", 3]], { multiple: true });
// « XXL 7€ / 9€ » sur les sans alcool.
const NOVELTY_XXL_SANS_ALCOOL = groupeChoix("format", "Format", [["XXL", 2]], { multiple: true });

const noveltyCocktail = (
  id: string,
  name: string,
  description: string,
  price: number,
  { parfum = false, happyHour = "" } = {}
): MenuItem => ({
  id,
  name,
  description: happyHour ? `${description}\n${noveltyHappyHour(happyHour)}` : description,
  price,
  ...ALCOOL,
  options: parfum ? [NOVELTY_PARFUMS, NOVELTY_XXL] : [NOVELTY_XXL],
});

const noveltySansAlcool = (
  id: string,
  name: string,
  description: string,
  { parfum = false, happyHour = "" } = {}
): MenuItem => ({
  id,
  name,
  description: happyHour ? `${description}\n${noveltyHappyHour(happyHour)}` : description,
  price: 7,
  options: parfum ? [NOVELTY_PARFUMS, NOVELTY_XXL_SANS_ALCOOL] : [NOVELTY_XXL_SANS_ALCOOL],
});

/** Une pression : 25 cl, 50 cl, 1 L. */
const noveltyPression = (id: string, name: string, [demi, pinte, litre]: readonly [number, number, number]) =>
  articleFormats(id, name, [["25 cl", demi], ["50 cl", pinte], ["1 L", litre]], ALCOOL);

/** La pinte de l'affiche happy hour, sous la description (le Monaco en a une). */
const avecPinteHappyHour = (item: MenuItem, prix: string): MenuItem => {
  const happyHour = noveltyHappyHour(`Pinte\u00a0${prix}`);
  return { ...item, description: item.description ? `${item.description}\n${happyHour}` : happyHour };
};

const leNovelty: Restaurant = {
  slug: "le-novelty",
  name: "Le Novelty",
  suivi: true,
  tagline: "Bar — Cocktails — Terrasse",
  logo: "/le-novelty/logo.webp",
  whiteLogo: true,
  icons: { tab: "/le-novelty/favicon.png", homeScreen: "/le-novelty/icon.png" },
  themeColor: "#080808",
  address: "10 Rue Saint-Guilhem, 34000 Montpellier",
  phone: "+33 4 34 35 36 28",
  hours: "Tous\u00a0les\u00a0jours 8h30–\u20601h",
  // Les happy hours sont au bandeau et sous chaque article concerné.
  highlights: ["Ouvert 7j/7 de 8h30 à 1h", "Cocktails en XXL", "Tapas et planches"],
  ticker: [
    {
      text: `${NOVELTY_HAPPY_HOURS} tous les jours\u00a0: pinte de Kro ${NOVELTY_HH.pinteKro}\u00a0€, pinte de Monaco ${NOVELTY_HH.pinteMonaco}\u00a0€, Mojito, Spritz, Coco Bull, Planteur, Caïpirinha et Tête à l'Envers ${NOVELTY_HH.cocktail}\u00a0€, Virgin Mojito et Virgin Colada ${NOVELTY_HH.sansAlcool}\u00a0€`,
      tone: "accent",
    },
    { text: "Café du matin à 1\u00a0€ de 9h à 12h", tone: "brand" },
    { text: "Formule Goûter 5\u00a0€ tous les jours" },
  ],
  pairings: leNoveltyAccords,
  loyaltyWheel: roueDuJour,
  demoLoyalty: {
    pointsPerEuro: 1,
    rewards: [
      {
        id: "cafe-soft",
        label: "1 café ou soft offert",
        points: 50,
        items: ["cafe", "noisette", "cappuccino", "fuzetea"],
      },
      {
        id: "tapas",
        label: "1 tapas offerte",
        points: 100,
        items: [
          "sticks-mozzarella",
          "patatas-bravas",
          "beignets-calamars",
          "accras-morue",
          "croquetas-chorizo",
          "wings-poulet",
          "oignons-rings",
        ],
      },
      {
        id: "cocktail",
        label: "1 cocktail offert",
        points: 150,
        items: [
          "mojito",
          "cuba-libre",
          "ti-punch",
          "caipirinha",
          "gin-tonic",
          "planteur",
          "spritz",
        ],
      },
      {
        id: "planche",
        label: "1 planche offerte",
        points: 250,
        items: ["planche-mixte", "planche-charcuterie", "planche-fromages"],
      },
    ],
    member: {
      contact: "0612345678",
      firstName: "Camille",
      history: [
        { kind: "gain", points: 2, table: 4, rewards: null, daysAgo: 1 },
        { kind: "roue", points: 5, table: null, rewards: null, daysAgo: 1 },
        { kind: "gain", points: 4, table: 9, rewards: null, daysAgo: 2 },
        { kind: "roue", points: 10, table: null, rewards: null, daysAgo: 2 },
        { kind: "gain", points: 17, table: 3, rewards: null, daysAgo: 6 },
        { kind: "roue", points: 15, table: null, rewards: null, daysAgo: 6 },
        { kind: "gain", points: 22, table: 7, rewards: null, daysAgo: 13 },
      ],
    },
  },
  categories: [
    {
      id: "cocktails",
      name: "Cocktails",
      boissons: true,
      tagline: "En XXL\u00a0: +3\u00a0€, sauf Ti-Punch",
      items: [
        noveltyCocktail(
          "mojito",
          "Mojito",
          "Mangue, fraise, framboise, passion ou pêche, rhum Bacardi Carta Oro, citron vert, cassonade, menthe fraîche, limonade",
          9,
          { parfum: true, happyHour: NOVELTY_HH.cocktail }
        ),
        noveltyCocktail("cuba-libre", "Cuba Libre", "Rhum Bacardi Carta Oro, citron vert, Coca Cola", 9),
        { id: "ti-punch", name: "Ti-Punch", description: "Rhum Bacardi Carta Oro, cassonade, citron vert", price: 9, vatRate: 20 },
        noveltyCocktail(
          "caipirinha",
          "Caïpirinha",
          "Mangue, fraise, framboise, passion ou pêche, Cachaça Aguacana, cassonade, citron vert",
          9,
          { parfum: true, happyHour: NOVELTY_HH.cocktail }
        ),
        noveltyCocktail("caipiroska", "Caïpiroska", "Mangue, fraise, framboise, passion ou pêche, vodka Eristoff, cassonade, citron vert", 9, { parfum: true }),
        noveltyCocktail("cosmopolitan", "Cosmopolitan", "Vodka Eristoff, liqueur d'orange, citron vert, cranberry", 9),
        noveltyCocktail("daiquiri", "Daïquiri", "Mangue, fraise, framboise, passion ou pêche, rhum Bacardi Carta Oro, sucre de canne, citron vert", 9, { parfum: true }),
        noveltyCocktail("gin-tonic", "Gin Tonic", "Gin, Schweppes tonic, citron vert", 9),
        noveltyCocktail("planteur", "Planteur", "Rhum Bacardi Carta Oro, ananas, orange, grenadine", 9, { happyHour: NOVELTY_HH.cocktail }),
        noveltyCocktail("coco-bull", "Coco Bull", "Vodka, sirop de cerise, citron vert, Redbull", 9, { happyHour: NOVELTY_HH.cocktail }),
        noveltyCocktail("gin-fizz", "Gin Fizz", "Gin Bombay Sapphire, sucre en poudre, jus de citron, limonade", 9),
        noveltyCocktail("margarita", "Margarita", "Tequila, triple sec, jus de citron", 9),
        noveltyCocktail("pina-colada", "Piña Colada", "Rhum Bacardi Carta Oro, crème de coco, ananas, vanille", 9),
        noveltyCocktail("tequila-sunrise", "Tequila Sunrise", "Tequila, jus d'orange, sirop de grenadine", 9),
        noveltyCocktail(
          "sex-on-the-beach",
          "Sex on the Beach",
          "Vodka Eristoff, crème de pêche, crème de cerise, crème de melon, jus de cranberry, jus d'ananas",
          9
        ),
        noveltyCocktail("tete-a-l-envers", "Tête à l'Envers", "Vodka Eristoff, Orangina, liqueur de Curaçao bleu", 9, {
          happyHour: NOVELTY_HH.cocktail,
        }),
        noveltyCocktail(
          "long-island",
          "Long Island",
          "Rhum Bacardi, gin, tequila, vodka Eristoff, sucre de canne, citron vert, Coca Cola",
          11
        ),
        noveltyCocktail("moscow-mule", "Moscow Mule", "Vodka Eristoff, citron vert, Ginger Beer", 11),
        noveltyCocktail(
          "pornstar",
          "Pornstar",
          "Champagne, liqueur de passion, vodka Eristoff, jus de citron, sirop de vanille",
          11
        ),
        noveltyCocktail("expresso-martini", "Expresso Martini", "Vodka, liqueur café, sirop canne, expresso", 11),
        noveltyCocktail("spritz", "Spritz", "Aperol, Prosecco, Perrier", 9.5, { happyHour: NOVELTY_HH.cocktail }),
        noveltyCocktail("jager-bomb", "Jager Bomb", "Jägermeister, Red Bull", 7),
      ],
    },
    {
      id: "signatures",
      name: "Cocktails signature",
      boissons: true,
      tagline: "En XXL\u00a0: +3\u00a0€",
      items: [
        noveltyCocktail("n-fire", "Le N'Fire", "Jack Daniel's Fire, Triple Sec, jus de citron, jus de cranberry", 13),
        noveltyCocktail(
          "el-marez",
          "El Marez",
          "Gin Premium Belle Rive, jus de citron, sirop de grenadine, menthe fraîche",
          13
        ),
      ],
    },
    {
      id: "sans-alcool",
      name: "Cocktails sans alcool",
      boissons: true,
      tagline: "En XXL\u00a0: 9\u00a0€",
      items: [
        noveltySansAlcool("red-berry", "Red Berry", "Purée de fruits rouges, cranberry, jus d'ananas"),
        noveltySansAlcool("exotique", "Exotique", "Fruit exotique, jus de citron, sirop vanille, jus passion"),
        noveltySansAlcool(
          "virgin-mojito",
          "Virgin Mojito",
          "Mangue, fraise, framboise, passion ou pêche, menthe fraîche, citron vert, cassonade, limonade",
          { parfum: true, happyHour: NOVELTY_HH.sansAlcool }
        ),
        noveltySansAlcool("virgin-colada", "Virgin Colada", "Crème de coco, ananas, vanille", { happyHour: NOVELTY_HH.sansAlcool }),
      ],
    },
    {
      id: "pression",
      name: "Bières pression",
      boissons: true,
      items: [
        avecPinteHappyHour(noveltyPression("kronenbourg", "Kronenbourg Blonde\u00a04,5°", [3.6, 6, 11]), NOVELTY_HH.pinteKro),
        noveltyPression("chouffe", "Chouffe Blonde\u00a08°", [4.5, 8, 15]),
        noveltyPression("cherry-chouffe", "Cherry Chouffe\u00a08°", [4.5, 8, 15]),
        noveltyPression("bete-blanche", "La Bête Blanche\u00a05,2°", [4.5, 8, 15]),
        noveltyPression("ducasse-triple", "Ducasse Triple\u00a09°", [4.5, 8, 15]),
        noveltyPression("bete-blonde", "La Bête Blonde\u00a08°", [4.5, 8, 15]),
        noveltyPression("bete-rouge", "La Bête Rouge\u00a08°", [4.5, 8, 15]),
        noveltyPression("grimbergen", "Grimbergen Blonde\u00a06,7°", [4.5, 8, 15]),
        noveltyPression("fada-ipa", "Fada IPA\u00a05°", [4.5, 8, 15]),
        avecPinteHappyHour(
          articleFormats("monaco", "Monaco", [["25 cl", 3.7], ["50 cl", 6.2]], {
            ...ALCOOL,
            description: "Bière, grenadine, limonade",
          }),
          NOVELTY_HH.pinteMonaco
        ),
        articleFormats("picon-biere", "Picon Bière", [["25 cl", 4.2], ["50 cl", 7]], ALCOOL),
        articleFormats("biere-du-moment", "Bière du Moment", [["25 cl", 4.5], ["50 cl", 8]], ALCOOL),
      ],
    },
    {
      id: "bouteilles",
      name: "Bières bouteilles",
      boissons: true,
      items: [
        { id: "1664-sans-alcool", name: "1664 0° Sans Alcool", price: 5, detail: "33 cl" },
        { id: "heineken", name: "Heineken\u00a05°", price: 6, detail: "33 cl", vatRate: 20 },
        { id: "desperados", name: "Desperados\u00a05,9°", price: 6, detail: "33 cl", vatRate: 20 },
        { id: "corona", name: "Corona\u00a04,5°", price: 6, detail: "33 cl", vatRate: 20 },
        { id: "cidre", name: "Cidre\u00a04,5°", price: 7, detail: "25 cl", vatRate: 20 },
        { id: "kastel-rouge", name: "Kastel Rouge\u00a08°", price: 7, detail: "33 cl", vatRate: 20 },
        { id: "triple-karmeliet", name: "Triple Karmeliet\u00a08,4°", price: 7, detail: "33 cl", vatRate: 20 },
        // Le site imprime « Guinness 8° » : degré non repris, question au gérant.
        { id: "guinness", name: "Guinness", price: 7, detail: "33 cl", vatRate: 20 },
      ],
    },
    {
      id: "boissons-chaudes",
      name: "Boissons chaudes",
      boissons: "chaudes",
      tagline: "Café, noisette, décaféiné, allongé\u00a0: fin de service 20h",
      items: [
        { id: "cafe", name: "Café", price: 1.9 },
        { id: "noisette", name: "Noisette", price: 2 },
        { id: "decafeine", name: "Décaféiné", price: 2 },
        { id: "cafe-allonge", name: "Café Allongé", price: 2.2 },
        { id: "double-cafe", name: "Double Café", price: 3.6 },
        { id: "cafe-creme", name: "Café Crème", price: 3.6 },
        { id: "cappuccino", name: "Cappuccino", price: 3.6 },
        { id: "chocolat-chaud", name: "Chocolat Chaud", price: 3.6 },
        { id: "cafe-viennois", name: "Café Viennois", price: 4 },
        { id: "chocolat-viennois", name: "Chocolat Viennois", price: 4 },
        {
          id: "the-infusion",
          name: "Thé / Infusion",
          price: 3.2,
          options: [groupeChoix("boisson", "Thé ou infusion", ["Thé", "Infusion"], { obligatoire: true })],
        },
        { id: "irish-coffee", name: "Irish Coffee", price: 9, vatRate: 20 },
        { id: "french-coffee", name: "French Coffee", price: 9, vatRate: 20 },
        {
          id: "the-glace",
          name: "Thés Glacés Maison",
          description: "Citron, Passion, Framboise, Pêche",
          price: 5,
          options: [groupeChoix("parfum", "Parfum", ["Citron", "Passion", "Framboise", "Pêche"], { obligatoire: true })],
        },
      ],
    },
    {
      id: "boissons-fraiches",
      name: "Boissons fraîches",
      boissons: true,
      items: [
        {
          id: "coca-cola",
          name: "Coca Cola / Cherry / Zéro",
          price: 4,
          detail: "33 cl",
          options: [groupeChoix("version", "Version", ["Coca Cola", "Cherry", "Zéro"], { obligatoire: true })],
        },
        {
          id: "fanta-sprite",
          name: "Fanta Orange / Sprite",
          price: 4,
          detail: "25 cl",
          options: [groupeChoix("boisson", "Boisson", ["Fanta Orange", "Sprite"], { obligatoire: true })],
        },
        { id: "fuzetea", name: "Fuzetea (thé pêche)", price: 4, detail: "25 cl" },
        {
          id: "tropico-orangina",
          name: "Tropico / Orangina",
          price: 4,
          detail: "25 cl",
          options: [groupeChoix("boisson", "Boisson", ["Tropico", "Orangina"], { obligatoire: true })],
        },
        articleFormats("limonade-pression", "Limonade Pression", [["33 cl", 3.4], ["50 cl", 5]]),
        articleFormats("diabolo", "Diabolo", [["33 cl", 3.6], ["50 cl", 5.2]], { options: [NOVELTY_SIROP] }),
        {
          id: "eau-gazeuse",
          name: "Badoit Rouge / Perrier",
          price: 4,
          detail: "33 cl",
          options: [groupeChoix("boisson", "Boisson", ["Badoit Rouge", "Perrier"], { obligatoire: true })],
        },
        {
          id: "ginger-beer-tonic",
          name: "Ginger Beer Bio / Schweppes Tonic",
          price: 4,
          detail: "25 cl",
          options: [groupeChoix("boisson", "Boisson", ["Ginger Beer Bio", "Schweppes Tonic"], { obligatoire: true })],
        },
        { id: "red-bull", name: "Red Bull", price: 5.5, detail: "25 cl" },
        { id: "evian", name: "Evian", price: 3.8, detail: "33 cl" },
        articleFormats("eau-1l", "Eau Plate / Gazeuse", [["Plate", 5], ["Gazeuse", 5.2]], { detail: "100 cl" }, ["eau", "Eau"]),
        {
          id: "jus-de-fruits",
          name: "Jus de Fruits",
          description: "Orange, ananas, pomme, abricot, tomate, fraise",
          price: 4,
          detail: "25 cl",
          options: [
            groupeChoix("jus", "Jus", ["Orange", "Ananas", "Pomme", "Abricot", "Tomate", "Fraise"], {
              obligatoire: true,
            }),
          ],
        },
        {
          id: "jus-presse",
          name: "Jus de Fruits Pressés",
          description: "Orange, citron",
          price: 5,
          options: [groupeChoix("fruit", "Fruit", ["Orange", "Citron"], { obligatoire: true })],
        },
        articleFormats("sirop-a-l-eau", "Sirop à l'Eau", [["33 cl", 3], ["50 cl", 4.2]], {
          description: "Grenadine, pêche, menthe, fraise, citron…",
          options: [NOVELTY_SIROP],
        }),
        {
          id: "smoothie",
          name: "Smoothie",
          description: "Mangue, pêche, fruits rouges, fruits exotiques",
          price: 6,
          options: [
            groupeChoix("parfum", "Parfum", ["Mangue", "Pêche", "Fruits rouges", "Fruits exotiques"], {
              obligatoire: true,
            }),
          ],
        },
        {
          id: "milk-shake",
          name: "Milk-Shake",
          description: "Vanille, fraise, chocolat, banane",
          price: 6.5,
          options: [
            groupeChoix("parfum", "Parfum", ["Vanille", "Fraise", "Chocolat", "Banane"], { obligatoire: true }),
          ],
        },
      ],
    },
    {
      id: "planches",
      name: "Planches",
      items: [
        { id: "planche-mixte", name: "Planche Mixte", description: "Fromage et Charcuterie", price: 22, image: pexels("29068725/pexels-photo-29068725.jpeg", 800) },
        { id: "planche-charcuterie", name: "Planche de Charcuterie", price: 13, image: pexels("7140437/pexels-photo-7140437.jpeg", 800) },
        { id: "planche-fromages", name: "Planche de Fromages", price: 13, image: pexels("10560868/pexels-photo-10560868.jpeg", 800) },
        {
          id: "planche-tapas",
          name: "Planche Tapas",
          description:
            "Stick de Mozzarella, Beignets de Calamars, Accras de Morue, Wings de Poulet, Oignons Rings, Charcuteries & Fromages",
          price: 30,
        },
        {
          // La couronne de leur carte Tapas se dessine en or (.theme-le-novelty, globals.css).
          id: "planche-gourmande",
          name: "Planche Gourmande",
          description:
            "Stick de Mozzarella, Beignets de Calamars, Accras de Morue, Wings de Poulet, Oignons Rings, Charcuteries & Fromages, Mozzarella Di Bufala, saumon fumé, frites de patates douces, salade, Camembert rôti aux figues & noix",
          price: 60,
        },
      ],
    },
    {
      id: "tapas",
      name: "Tapas à la carte",
      items: [
        { id: "sticks-mozzarella", name: "Sticks Mozzarella", price: 7.5, image: pexels("9650081/pexels-photo-9650081.jpeg", 800) },
        { id: "sepions", name: "Sépions", description: "Seiches persillées", price: 8 },
        { id: "patatas-persillees", name: "Patatas Persillées", price: 7.5, image: pexels("9862286/pexels-photo-9862286.jpeg", 800) },
        { id: "mini-saucissons", name: "Mini Saucissons", price: 7.5, image: pexels("8250416/pexels-photo-8250416.jpeg", 800) },
        { id: "patatas-bravas", name: "Patatas Bravas", price: 7.5, image: pexels("28490819/pexels-photo-28490819.jpeg", 800) },
        {
          id: "bruschetta",
          name: "Bruschetta au choix",
          description: "Chèvre Miel, Norvégienne",
          price: 13,
          options: [groupeChoix("garniture", "Garniture", ["Chèvre Miel", "Norvégienne"], { obligatoire: true })],
        },
        { id: "beignets-calamars", name: "Beignets de Calamars", price: 6.5, image: pexels("6036950/pexels-photo-6036950.jpeg", 800) },
        { id: "mini-nems-poulet", name: "Mini Nems Poulet", price: 8, image: pexels("33712072/pexels-photo-33712072.jpeg", 800) },
        { id: "beignets-crevettes", name: "Beignets de Crevettes", price: 8, image: pexels("7011610/pexels-photo-7011610.jpeg", 800) },
        { id: "croquetas-chorizo", name: "Croquetas de Chorizo", price: 8, image: pexels("34189563/pexels-photo-34189563.jpeg", 800) },
        { id: "wings-poulet", name: "Wings de Poulet", price: 8.5, image: pexels("36617209/pexels-photo-36617209.jpeg", 800) },
      ],
    },
    {
      id: "incontournables",
      name: "Les incontournables",
      items: [
        { id: "mozzarella-bufala", name: "Mozzarella di Bufala", description: "Tomate & jambon Serrano", price: 13, image: unsplash("photo-1490716961549-5dbd18f53101", 800) },
        { id: "jambon-serrano", name: "Jambon Serrano", description: "Toast Pan con Tomate", price: 13, image: pexels("17205218/pexels-photo-17205218.jpeg", 800) },
        { id: "accras-morue", name: "Accras de Morue", price: 6.5, image: pexels("34943603/pexels-photo-34943603.jpeg", 800) },
        { id: "panier-frites", name: "Panier de Frites", price: 5, image: pexels("13161027/pexels-photo-13161027.jpeg", 800) },
        { id: "oignons-rings", name: "Oignons Rings", price: 6.5, image: pexels("29392059/pexels-photo-29392059.jpeg", 800) },
        { id: "frites-patates-douces", name: "Frites de Patates Douces", price: 7.5, image: pexels("30507468/pexels-photo-30507468.jpeg", 800) },
        { id: "camembert-roti", name: "Camembert Rôti", description: "Figues et Noix", price: 12 },
        { id: "fish-and-chips", name: "Fish & Chips", description: "Sauce Tartare", price: 9.5, image: pexels("34019400/pexels-photo-34019400.jpeg", 800) },
        { id: "beignets-courgettes", name: "Beignets de Courgettes", price: 7.5, image: unsplash("photo-1613764816537-a43baeb559c1", 800) },
        { id: "pan-con-tomate", name: "Pan con Tomate", price: 8, image: pexels("3793871/pexels-photo-3793871.jpeg", 800) },
      ],
    },
    {
      id: "formules",
      name: "Formules",
      items: [
        {
          id: "formule-gouter",
          name: "Formule Goûter",
          description: "Crêpe ou Gaufre (Nutella, sucre, citron…) + Boisson au choix (Boisson chaude, diabolo, limonade, sirop)",
          price: 5,
          options: [
            groupeChoix("douceur", "Crêpe ou gaufre", ["Crêpe", "Gaufre"], { obligatoire: true }),
            groupeChoix("garniture", "Garniture", ["Nutella", "Sucre", "Citron"], { obligatoire: true }),
            NOVELTY_GOUTER_BOISSON,
            NOVELTY_GOUTER_BOISSON_CHAUDE,
            noveltySiropFormule(NOVELTY_GOUTER_BOISSON),
            groupeChoix("supplement", "Suppléments", [["Fruit", 1], ["Chantilly", 1]], { multiple: true }),
          ],
        },
        {
          id: "formule-etudiante",
          name: "Formule Étudiante",
          description: "Burger + Frites, Pizza Margarita ou Tagliatelles + Boisson au choix\nSur présentation carte étudiante",
          price: 8.5,
          options: [
            groupeChoix(
              "plat",
              "Plat",
              [
                "Burger bœuf + frites",
                "Burger poulet + frites",
                "Pizza Margarita",
                "Tagliatelles poulet curry",
                "Tagliatelles bolognaise",
              ],
              { obligatoire: true }
            ),
            NOVELTY_ETUDIANTE_BOISSON,
            noveltySiropFormule(NOVELTY_ETUDIANTE_BOISSON),
          ],
        },
      ],
    },
  ],
};

/*
 * Le Victoria — 3 place Castellane (ex-Au Bistrot Victoria). Aucune carte
 * publiée par la maison : celle de Deliveroo, mot pour mot (ouverte le
 * 14 octobre 2026, prix de livraison), avec ses photos, celles du restaurant ;
 * les pressions et les cocktails du bar relevés par Schlouk Map
 * (participatif). Sources : demos/le-victoria/docs/.
 */
const VICTORIA_SUPPLEMENTS_PIZZA = groupeChoix(
  "supplements",
  "Suppléments",
  [
    ...[
      "Œuf",
      "Oignons",
      "Jambon anchois",
      "Aubergines",
      "Copeaux de parmesan",
      "Champignons forestiers",
      "Roquette",
      "Mozzarella",
      "Gruyère",
      "Chèvre",
      "Roquefort brie",
      "Jambon cru",
      "Poivrons",
    ].map((nom) => [nom, 1.3] as const),
    ["Huile de truffe", 2.6],
  ],
  { multiple: true }
);

const VICTORIA_BURGER = [
  groupeChoix("garniture", "Garniture", ["Bacon", "Sans bacon"], { obligatoire: true }),
  groupeChoix("sauce", "Sauce", ["Algérienne", "Mayonnaise", "Ketchup", "Moutarde"], { aucun: "Sans sauce" }),
];

const VICTORIA_GARNITURES_SUCREES = ["Nutella", "Coco", "Caramel beurre salé", "Banane"];
const VICTORIA_SUPPLEMENT_SUCRE = 2;

/** Les horaires du happy hour (site du groupe, Schlouk), un prix réduit ne s'affiche jamais sans eux. */
const VICTORIA_HAPPY_HOUR = "Happy hour 16h⁠–⁠1h";
const victoriaHappyHour = (prix: string) => `${VICTORIA_HAPPY_HOUR} : ${prix} €`;

const victoriaPizza = (
  id: string,
  name: string,
  description: string,
  price: number,
  image?: string
): MenuItem => ({ id, name, description, price, image, options: [VICTORIA_SUPPLEMENTS_PIZZA] });

/**
 * Une famille de crêpes ou de gaufres, avec le supplément de Deliveroo, sans
 * ce que la garniture contient déjà ni ce qu'un article de la famille sert
 * pour moins cher : une crêpe nature + Nutella revenait à 5,20 €, la crêpe
 * Nutella coûte 4 €.
 */
const victoriaSucres = (famille: readonly (readonly [id: string, name: string, price: number, image?: string])[]) => {
  const garnitures = (name: string) =>
    VICTORIA_GARNITURES_SUCREES.filter((garniture) => name.toLowerCase().includes(garniture.toLowerCase()));
  const cle = (choisies: readonly string[]) =>
    VICTORIA_GARNITURES_SUCREES.filter((garniture) => choisies.includes(garniture)).join("+");
  const prixParGarniture = new Map(famille.map(([, name, price]) => [cle(garnitures(name)), price]));
  return famille.map(([id, name, price, image]): MenuItem => {
    const contenues = garnitures(name);
    const offertes = VICTORIA_GARNITURES_SUCREES.filter((garniture) => {
      if (contenues.includes(garniture)) return false;
      const article = prixParGarniture.get(cle([...contenues, garniture]));
      return article === undefined || article >= price + VICTORIA_SUPPLEMENT_SUCRE;
    });
    return {
      id,
      name,
      price,
      image,
      options: [groupeChoix("supplement", "Supplément", offertes, { supplement: VICTORIA_SUPPLEMENT_SUCRE })],
    };
  });
};

/** Un vin à la bouteille ; Deliveroo n'imprime pas le volume de chacun. */
const victoriaVin = (id: string, name: string, price: number, description?: string, detail?: string): MenuItem => ({
  id,
  name,
  description,
  price,
  detail,
  ...ALCOOL,
});

const leVictoria: Restaurant = {
  slug: "le-victoria",
  name: "Le Victoria",
  suivi: true,
  tagline: "Bar Restaurant · Tapas Cocktail",
  // Le badge rond de l'enseigne (avatar TikTok, 221 px) : assez net à cette taille.
  logo: "/le-victoria/badge.webp",
  icons: { tab: "/le-victoria/favicon.png", homeScreen: "/le-victoria/icon.png" },
  themeColor: "#171513",
  address: "3 Place Castellane, 34000 Montpellier",
  phone: "+33 4 48 78 60 29",
  hours: "Tous\u00a0les\u00a0jours 10h–\u20601h",
  // Le premier argument suit la démo Collect, où l'alcool ne part pas ; « 7 jours
  // sur 7 », comme le site du groupe : en capitales, « 7j/7 » se lisait « 7J/7 ».
  highlights: ["Service continu 7 jours sur 7", VICTORIA_HAPPY_HOUR],
  // Ni plats du jour ni girafes sur la carte : ils se demandent. Les plats du
  // jour au midi, comme l'ardoise « Formule du midi » de 2024 (Plat ① 9,90 €).
  ticker: [
    { text: "Le midi, deux plats du jour au choix à partir de 9,90\u00a0€, à demander au serveur", tone: "brand" },
    { text: "Girafes de bière ou de cocktail de 3 à 5\u00a0L pour les groupes, sur demande" },
  ],
  // Accords de l'aperçu, à revoir avec le gérant ; sans café à la carte, les desserts n'en ont pas.
  pairings: leVictoriaAccords,
  loyaltyWheel: roueDuJour,
  demoLoyalty: {
    pointsPerEuro: 1,
    rewards: [
      {
        id: "soft-biere",
        label: "1 soft ou bière offerte",
        points: 50,
        items: [
          "coca-cola",
          "fuze-tea",
          "1664-sans-alcool",
          "heineken",
          "kronenbourg",
          "monaco",
        ],
      },
      {
        id: "dessert-tapas",
        label: "1 dessert ou tapas offert",
        points: 100,
        items: [
          "tarte-citron",
          "tarte-tatin",
          "moelleux-chocolat",
          "frite-maison",
          "wings",
          "croquetas-chorizo",
          "stick-mozzarella",
          "patatas-bravas",
          "mini-nems",
          "mini-saucissons",
          "mini-samossas",
          "frites-patate-douce",
          "fish-and-chips",
        ],
      },
      {
        id: "cocktail",
        label: "1 cocktail offert",
        points: 150,
        items: ["mojito", "cuba-libre", "punch", "sangria", "planteur", "sex-on-the-beach"],
      },
      {
        id: "pizza-tagliatelle",
        label: "1 pizza ou tagliatelle offerte",
        points: 250,
        items: [
          "margherita",
          "vegetariana",
          "4-formaggi",
          "regina",
          "chevre-miel",
          "pizza-poulet",
          "spezzial",
          "salmone",
          "bruschetta-chevre-miel",
          "tagliatelles-curry",
          "tagliatelles-bolognaise",
        ],
      },
    ],
    member: {
      contact: "0612345678",
      firstName: "Mathilde",
      history: [
        { kind: "gain", points: 8, table: 4, rewards: null, daysAgo: 1 },
        { kind: "roue", points: 5, table: null, rewards: null, daysAgo: 1 },
        { kind: "gain", points: 11, table: 2, rewards: null, daysAgo: 2 },
        { kind: "roue", points: 10, table: null, rewards: null, daysAgo: 2 },
        { kind: "gain", points: 12, table: 6, rewards: null, daysAgo: 6 },
        { kind: "roue", points: 15, table: null, rewards: null, daysAgo: 6 },
        { kind: "gain", points: 18, table: 3, rewards: null, daysAgo: 13 },
      ],
    },
  },
  // Le bar d'abord, comme le store (« Tapas Cocktail ») : tapas, cocktails,
  // bières, puis la cuisine ; les vins, à la bouteille, en fin de carte.
  categories: [
    {
      id: "tapas",
      name: "Tapas",
      items: [
        { id: "frite-maison", name: "Frite maison", price: 5, image: "/le-victoria/frite-maison.webp" },
        { id: "wings", name: "Wings poulet", price: 7 },
        { id: "fish-and-chips", name: "Fish and chips tapas", price: 9, image: pexels("15580734/pexels-photo-15580734.jpeg", 800) },
        { id: "croquetas-chorizo", name: "Croquetas chorizo", price: 7, image: pexels("11485207/pexels-photo-11485207.jpeg", 800) },
        { id: "stick-mozzarella", name: "Stick mozzarella", price: 7, image: pexels("29872923/pexels-photo-29872923.jpeg", 800) },
        { id: "patatas-bravas", name: "Patatas bravas", price: 7, image: pexels("20522413/pexels-photo-20522413.jpeg", 800) },
        { id: "mini-nems", name: "Mini nems", price: 7 },
        { id: "mini-saucissons", name: "Mini saucissons", price: 5.5 },
        { id: "mini-samossas", name: "Mini samossas", price: 6, image: pexels("14883757/pexels-photo-14883757.jpeg", 800) },
        { id: "frites-patate-douce", name: "Frites patate douce", price: 7, image: pexels("15801055/pexels-photo-15801055.jpeg", 800) },
      ],
    },
    {
      id: "cocktails",
      name: "Cocktails",
      boissons: true,
      // Les « maison » sont les cocktails XXL de Deliveroo ; le prix happy hour
      // de Schlouk, donné sans volume, ne va qu'aux cocktails du bar.
      tagline: "Prix happy hour sous les cocktails concernés",
      items: [
        { id: "punch", name: "Punch maison", price: 8, detail: "50 cl", vatRate: 20 },
        { id: "sangria", name: "Sangria maison", price: 8, detail: "50 cl", vatRate: 20 },
        { id: "sex-on-the-beach", name: "Sex on the beach maison", price: 8, vatRate: 20 },
        { id: "planteur", name: "Planteur", price: 8, detail: "50 cl", vatRate: 20 },
        { id: "mojito", description: victoriaHappyHour("5,50"), name: "Mojito", price: 8, vatRate: 20 },
        { id: "cuba-libre", description: victoriaHappyHour("5,50"), name: "Cuba Libre", price: 8, vatRate: 20 },
        { id: "jagerbomb", description: victoriaHappyHour("5,50"), name: "Jagerbomb", price: 8, vatRate: 20 },
      ],
    },
    {
      id: "bieres",
      name: "Bières",
      boissons: true,
      // Pressions : le happy hour du groupe va aux « bières pression », et
      // Schlouk n'en donne le prix que pour ces trois 50 cl.
      tagline: "Happy hour sur les pressions\u00a0: prix réduit sous chaque pression",
      items: [
        { id: "kronenbourg", description: victoriaHappyHour("3,50"), name: "Kronenbourg", price: 5.8, detail: "pression 50 cl", vatRate: 20 },
        { id: "monaco", description: victoriaHappyHour("3,50"), name: "Monaco", price: 5.8, detail: "pression 50 cl", vatRate: 20 },
        { id: "pietra", description: victoriaHappyHour("5,50"), name: "Pietra", price: 6.5, detail: "pression 50 cl", vatRate: 20 },
        { id: "heineken", name: "Heineken", price: 5, detail: "33 cl", vatRate: 20 },
        { id: "desperados", name: "Desperados", price: 6, detail: "33 cl", vatRate: 20 },
        { id: "corona", name: "Corona", price: 6, detail: "33 cl", vatRate: 20 },
      ],
    },
    {
      id: "burgers",
      name: "Hamburgers",
      items: [
        {
          id: "le-chicken",
          name: "Hamburger Le Chicken avec frite maison",
          printName: "Burger Le Chicken",
          description: "Steak de poulet pané frit, cheddar, salade, tomate.",
          price: 11.9,
          image: "/le-victoria/burger-chiken.webp",
          options: VICTORIA_BURGER,
        },
        {
          id: "le-classique",
          name: "Le classique avec frite maison",
          printName: "Burger Le classique",
          description: "Steak haché du boucher frais, double cheddar, bacon (au choix), tomates et salades.",
          price: 11.9,
          image: "/le-victoria/burger-classique.webp",
          options: VICTORIA_BURGER,
        },
      ],
    },
    {
      id: "pizzas",
      name: "Pizzas",
      items: [
        // Sans photo : celle du restaurant montre des olives, ni tomates cerises ni basilic.
        victoriaPizza(
          "margherita",
          "Pizza Margherita",
          "Sauce tomate, fromage, mozzarella di buffala, tomates cerises et basilic frais.",
          11.9
        ),
        victoriaPizza(
          "vegetariana",
          "Pizza vegetariana",
          "Sauce tomate, fromage, tomates fraîches, aubergines, courgettes, oignons et poivrons.",
          12.9,
          "/le-victoria/vegetariana.webp"
        ),
        victoriaPizza(
          "4-formaggi",
          "Pizza 4 formaggi",
          "Crème, gruyère, mozzarella, roquefort et chèvre.",
          12.9
        ),
        victoriaPizza(
          "regina",
          "Pizza regina tomate",
          "Sauce tomate, fromage, mozzarella, jambon, champignons frais et basilic.",
          12.9,
          "/le-victoria/regina.webp"
        ),
        victoriaPizza("chevre-miel", "Pizza chèvre miel", "Sauce tomate, fromage de chèvre, miel et herbe.", 12.9),
        victoriaPizza(
          "pizza-poulet",
          "Pizza au poulet",
          "Poulet, fromage, crème fraîche, poivrons et oignon.",
          12.9,
          "/le-victoria/poulet.webp"
        ),
        victoriaPizza(
          "spezzial",
          "Pizza spezzial",
          "Sauce tomate, fromage, mozzarella, après cuisson\u00a0: mozzarella di buffala, jambon cru, roquette et copeaux de parmesan.",
          14.9,
          "/le-victoria/spezzial.webp"
        ),
        victoriaPizza(
          "salmone",
          "Pizza salmone",
          "Crème, saumon, fromage, roquette et saumon fumé.",
          15.9,
          "/le-victoria/salmone.webp"
        ),
        victoriaPizza(
          "bruschetta-chevre-miel",
          "Bruschetta chèvre miel",
          "Sauce tomate, fromage, roquette, chèvre et miel et tomate fraîche.",
          10.9
        ),
      ],
    },
    {
      id: "salades",
      name: "Salades",
      items: [
        {
          id: "salade-cesar",
          name: "Salade César",
          description: "Poulet, œuf dur, copeaux de parmesan, crouton.",
          price: 10.9,
          image: "/le-victoria/salade-cesar.webp",
        },
        {
          id: "salade-chevre-chaud",
          name: "Salade de chèvre chaud",
          description: "Salade, tomate, toasts de chèvre chaud, jambon serrano, crouton.",
          price: 10.9,
        },
      ],
    },
    {
      id: "plats",
      name: "Plats chauds",
      items: [
        {
          id: "tagliatelles-curry",
          name: "Tagliatelle au poulet curry",
          description: "Tagliatelle, poulet, crème fraîche, curry.",
          price: 10.99,
        },
        {
          id: "tagliatelles-bolognaise",
          name: "Tagliatelle bolognaise",
          description: "Tagliatelle, sauce tomate, parmesan, bœuf haché.",
          price: 10.99,
          image: pexels("5639896/pexels-photo-5639896.jpeg", 800),
        },
        {
          id: "souris-agneau",
          name: "Souris d’agneau confite au romarin",
          price: 20.99,
          image: pexelsRecadre("6089651/pexels-photo-6089651.jpeg", 800),
        },
      ],
    },
    {
      id: "desserts",
      name: "Desserts",
      items: [
        {
          id: "cheesecake",
          name: "Cheesecake",
          description: "Fruit rouge ou caramel beurre salé.",
          price: 5,
          image: pexels("14107/pexels-photo-14107.jpeg", 800),
          options: [groupeChoix("parfum", "Parfum", ["Fruit rouge", "Caramel beurre salé"], { obligatoire: true })],
        },
        { id: "tarte-citron", name: "Tarte citron meringuée", price: 6, image: pexels("28869115/pexels-photo-28869115.jpeg", 800) },
        // Sans photo : aucune tatin aux pommes en photo libre (la seule tatin trouvée est aux poires).
        { id: "tarte-tatin", name: "Tarte tatin", price: 5 },
        {
          id: "moelleux-chocolat",
          name: "Moelleux au chocolat",
          price: 5,
          image: pexels("20522414/pexels-photo-20522414.jpeg", 800),
        },
      ],
    },
    {
      id: "crepes",
      name: "Crêpes",
      tagline: "Supplément 2\u00a0€\u00a0: coco, banane, Nutella ou caramel beurre salé, au choix sous chaque crêpe",
      items: [
        ...victoriaSucres([
          ["crepe-nature", "Crêpe nature", 3.2],
          ["crepe-sucre", "Crêpe sucre", 3.6],
          ["crepe-sucre-citron", "Crêpe sucre citron", 3.8],
          ["crepe-nutella", "Crêpe Nutella", 4, pexels("31856262/pexels-photo-31856262.jpeg", 800)],
          ["crepe-caramel", "Crêpe caramel beurre salé", 4],
          ["crepe-nutella-banane", "Crêpe Nutella banane", 5],
          ["crepe-nutella-coco", "Crêpe Nutella coco râpée", 5],
        ]),
      ],
    },
    {
      id: "gaufres",
      name: "Gaufres maison",
      tagline: "Supplément 2\u00a0€\u00a0: coco, banane, Nutella ou caramel beurre salé, au choix sous chaque gaufre",
      items: [
        ...victoriaSucres([
          ["gaufre-sucre", "Gaufre sucre", 3.6],
          ["gaufre-sucre-citron", "Gaufre sucre citron", 3.8],
          ["gaufre-nutella", "Gaufre Nutella", 4, unsplash("photo-1739907283389-2a2c05deb680", 800)],
          ["gaufre-caramel", "Gaufre caramel beurre salé", 4],
          ["gaufre-nutella-banane", "Gaufre Nutella banane", 5],
          ["gaufre-nutella-coco", "Gaufre Nutella coco râpée", 5],
        ]),
      ],
    },
    {
      id: "vins-rouges",
      name: "Vins rouges",
      boissons: true,
      tagline: "À la bouteille",
      items: [
        victoriaVin("merlot", "Merlot", 14),
        victoriaVin("faugeres-rouge", "Faugères", 16, "Château Haut Lignières · 13\u00a0% vol.", "75 cl"),
        victoriaVin("pic-saint-loup-bio", "Pic Saint Loup Bio", 18, "Château de Lancyre · 13\u00a0% vol.", "75 cl"),
        victoriaVin("pic-saint-loup", "Pic Saint Loup", 22, "Château de Lancyre · 14\u00a0% vol.", "75 cl"),
      ],
    },
    {
      id: "vins-blancs",
      name: "Vins blancs",
      boissons: true,
      tagline: "À la bouteille",
      items: [
        victoriaVin("chardonnay", "Chardonnay", 13, "13\u00a0% vol.", "75 cl"),
        victoriaVin("viognier", "Viognier", 14, "14\u00a0% vol.", "75 cl"),
        victoriaVin("picpoul", "Picpoul de Pinet", 15, "Domaine Morin-Langaran · 13\u00a0% vol.", "75 cl"),
        victoriaVin("joy", "Joy", 16, "Blanc doux"),
        victoriaVin("bergerie-hortus", "Bergerie de l’Hortus", 25, "13\u00a0% vol.", "75 cl"),
      ],
    },
    {
      id: "vins-roses",
      name: "Vins rosés",
      boissons: true,
      tagline: "À la bouteille",
      items: [
        victoriaVin("faugeres-rose", "Faugères", 16, "Château Haut Lignières · 13\u00a0% vol.", "75 cl"),
        victoriaVin("amour-de-gris", "Amour de Gris", 17, "Domaine Grand-Chemin · 12\u00a0% vol.", "75 cl"),
        victoriaVin("argali", "Puech-Haut Argali", 22.99, "13\u00a0% vol.", "75 cl"),
      ],
    },
    {
      id: "softs",
      name: "Boissons fraîches",
      boissons: true,
      items: [
        { id: "coca-cola", name: "Coca-Cola", price: 3, detail: "33 cl" },
        { id: "fuze-tea", name: "Fuze Tea", price: 3, detail: "33 cl" },
        { id: "coca-cola-1l", name: "Coca-Cola", price: 5.5, detail: "1 L" },
        { id: "red-bull", name: "Red Bull", price: 5 },
        // Rangée avec les bières sur Deliveroo ; ici, elle part aussi à emporter.
        { id: "1664-sans-alcool", name: "La 1664 sans alcool", price: 5, detail: "33 cl" },
      ],
    },
  ],
};

/*
 * Café des Arts — 3 rue Saint-Guilhem. La dernière carte publiée par la
 * maison : celle de son ancien site (lecafedesartsmontpellier.fr, archives
 * Wayback) — carte restaurant « hiver » 2021-22 et carte « Côté Bar », prix
 * de 2021-22 à faire confirmer. Sources : demos/cafe-des-arts/docs/.
 */
/**
 * Photos libres auditées, par article : la maison n'en publie aucune. Pas
 * de photo quand aucune ne montre le plat écrit : cinq pizzas à la tomate
 * sur treize en ont (aucune à la crème) ; ni l'œuf parfait, la bruschetta
 * chèvre miel, les linguinis aux Saint-Jacques, le suprême de volaille,
 * l'épaule d'agneau, la poire, le baba, le café gourmand ni les coupes. Des
 * boissons, les cocktails sans alcool et les milkshakes, chaque section
 * entière, et quatre cocktails, en tête de la leur.
 */
const CDA_PHOTOS: Partial<Record<string, string>> = {
  "foie-gras-poele": unsplash("photo-1726947226182-3d12f314d2cc", 800),
  "tataki-boeuf": pexels("36130538/pexels-photo-36130538.jpeg", 800),
  "carpaccio-bresaola": pexels("20807274/pexels-photo-20807274.jpeg", 800),
  "veloute-legumes": pexels("19052914/pexels-photo-19052914.jpeg", 800),
  "terrine-porc": pexels("8696528/pexels-photo-8696528.jpeg", 800),
  escargots: pexels("4946442/pexels-photo-4946442.jpeg", 800),
  "salade-perigourdine": pexels("15384773/pexels-photo-15384773.jpeg", 800),
  "salade-caesar": pexels("29935339/pexels-photo-29935339.jpeg", 800),
  "salade-vegetarienne": pexels("20272480/pexels-photo-20272480.jpeg", 800),
  "salade-chevre-chaud": pexels("29843069/pexels-photo-29843069.jpeg", 800),
  "poke-bowl-vegetarien": unsplash("photo-1702650657375-934239d8b472", 800),
  "bruschetta-saumon": pexels("7474060/pexels-photo-7474060.jpeg", 800),
  "bruschetta-catalane": pexels("31779540/pexels-photo-31779540.jpeg", 800),
  "pizza-margarita": pexels("17848752/pexels-photo-17848752.jpeg", 800),
  "pizza-reine": unsplash("photo-1717883235373-ef10b2a745a3", 800),
  "pizza-napolitaine": pexels("33592993/pexels-photo-33592993.jpeg", 800),
  "pizza-4-fromages": pexels("5993865/pexels-photo-5993865.jpeg", 800),
  "pizza-calabrese": pexels("5903102/pexels-photo-5903102.jpeg", 800),
  "seiches-setoise": pexels("38756486/pexels-photo-38756486.jpeg", 800),
  "saint-pierre": pexels("29203708/pexels-photo-29203708.jpeg", 800),
  "risotto-saint-jacques": pexels("22711495/pexels-photo-22711495.jpeg", 800),
  "mac-and-cheese": unsplash("photo-1711861346546-0d472a9c285f", 800),
  "lasagne-boeuf": pexels("31119078/pexels-photo-31119078.jpeg", 800),
  bavette: unsplash("photo-1594041680534-e8c8cdebd659", 800),
  "filet-rossini": pexels("32738697/pexels-photo-32738697.jpeg", 800),
  tartiflette: unsplash("photo-1645453014403-4ad5170a386c", 800),
  "burger-cafe-des-arts": pexels("21517316/pexels-photo-21517316.jpeg", 800),
  "burger-aveyronnais": pexels("12325012/pexels-photo-12325012.jpeg", 800),
  "burger-vegetarien": unsplash("photo-1665026181999-75a97dba3884", 800),
  pannacotta: pexels("20535800/pexels-photo-20535800.jpeg", 800),
  "moelleux-chocolat": pexels("18580161/pexels-photo-18580161.jpeg", 800),
  tiramisu: pexels("33419744/pexels-photo-33419744.jpeg", 800),
  "creme-brulee": pexels("36101016/pexels-photo-36101016.jpeg", 800),
  "profiteroles-maison": pexels("20545324/pexels-photo-20545324.jpeg", 800),
  "assiette-fromages": pexels("31372527/pexels-photo-31372527.jpeg", 800),
  mojito: pexels("37662775/pexels-photo-37662775.jpeg", 800),
  "pina-colada": pexels("16444390/pexels-photo-16444390.jpeg", 800),
  "tequila-sunrise": pexels("5609237/pexels-photo-5609237.jpeg", 800),
  "moscow-mule": unsplash("photo-1527628126150-086ff233b951", 800),
  exotique: pexels("10986576/pexels-photo-10986576.jpeg", 800),
  peachy: pexels("33337322/pexels-photo-33337322.jpeg", 800),
  "virgin-mojito": pexels("11009215/pexels-photo-11009215.jpeg", 800),
  "virgin-colada": pexels("10986589/pexels-photo-10986589.jpeg", 800),
  detox: unsplash("photo-1674691090075-0cbc97a08595", 800),
  "milkshake-1-parfum": pexels("27626320/pexels-photo-27626320.jpeg", 800),
  "milkshake-2-parfums": pexels("28525200/pexels-photo-28525200.jpeg", 800),
};

const cdaPlat = (id: string, name: string, price: number, description?: string): MenuItem => ({
  id,
  name,
  ...(description && { description }),
  price,
  image: CDA_PHOTOS[id],
});

/** Une pizza : les garnitures que la carte sépare d'un tiret, chaque point lié au mot qui le précède. */
const cdaPizza = (id: string, name: string, price: number, garnitures: readonly string[]) =>
  cdaPlat(id, name, price, garnitures.join("\u00a0· "));

const CDA_ESCARGOTS = [["×6", 8], ["×12", 13.5]] as const;

const CDA_PARFUMS_GLACE = [
  "Vanille",
  "Fraise",
  "Chocolat",
  "Menthe-Chocolat",
  "Cassis",
  "Poire",
  "Pistache",
  "Pêche",
  "Citron",
  "Coco",
  "Rhum-raisin",
  "Framboise",
  "Café",
  "Banane",
  "Caramel beurre salé",
];
/**
 * Le sous-choix d'un plat de formule (cuisson, sauce, parfums) ne se montre,
 * obligatoire, qu'une fois ce plat choisi dans son groupe.
 */
const cdaSi = (groupe: OptionGroup, libelle: string): OptionGroup["when"] => {
  const choix = groupe.choices.find(({ name }) => name === libelle);
  // Un libellé mal recopié laisserait le sous-choix caché pour toujours.
  if (!choix) throw new Error(`cdaSi — ${libelle} absent du groupe ${groupe.id}`);
  return { group: groupe.id, choices: [choix.id] };
};

const cdaBoule = (rang: number, name: string, when?: OptionGroup["when"]) =>
  groupeChoix(`boule-${rang}`, name, CDA_PARFUMS_GLACE, { obligatoire: true, when });

const CDA_SAUCES = ["Roquefort", "Échalote", "Poivre"];
// Du plus saignant au plus cuit, comme sur une carte ; les ids de CUISSON.
const CDA_ORDRE_CUISSON = ["bleu", "saignant", "a-point", "bien-cuit"];
const CDA_CUISSON: OptionGroup = {
  ...CUISSON,
  choices: [...CUISSON.choices].sort(
    (a, b) => CDA_ORDRE_CUISSON.indexOf(a.id) - CDA_ORDRE_CUISSON.indexOf(b.id)
  ),
};
const CDA_CUISSONS = CDA_CUISSON.choices.map(({ name }) => name);

/** Les deux parfums d'une « Glace 2 boules » de formule, une fois la glace choisie. */
const cdaGlaceDeFormule = (dessert: OptionGroup, glace: string) => {
  const when = cdaSi(dessert, glace);
  return [cdaBoule(1, "1re boule", when), cdaBoule(2, "2e boule", when)];
};

/** L'entrée d'une formule Brasserie ; au Duo, une fois choisi « Entrée + Plat ». */
const cdaBrasserieEntree = (when?: OptionGroup["when"]) =>
  groupeChoix("entree", "Entrée", ["Terrine Maison", "Œuf mayonnaise", "Velouté de saison"], {
    obligatoire: true,
    when,
  });
const CDA_STEAK_A_CHEVAL = "Steak à cheval et ses pommes grenailles";
const CDA_BRASSERIE_PLAT = groupeChoix(
  "plat",
  "Plat",
  [
    CDA_STEAK_A_CHEVAL,
    "Fish & Chips",
    "Tartiflette",
    "Escalope de poulet sauce forestière et son écrasé de pomme de terre",
    "Omelette jambon-fromage et sa salade",
  ],
  { obligatoire: true }
);
const CDA_BRASSERIE_PLATS = [
  CDA_BRASSERIE_PLAT,
  groupeChoix("cuisson-steak", "Cuisson", CDA_CUISSONS, {
    obligatoire: true,
    when: cdaSi(CDA_BRASSERIE_PLAT, CDA_STEAK_A_CHEVAL),
  }),
];
const CDA_GLACE_2_BOULES = "Glace 2 boules";
/** Le dessert d'une formule Brasserie et ses deux parfums ; au Duo, une fois choisi « Plat + Dessert ». */
const cdaBrasserieDesserts = (when?: OptionGroup["when"]) => {
  const dessert = groupeChoix(
    "dessert",
    "Dessert",
    ["Crème brûlée", CDA_GLACE_2_BOULES, "Mousse au chocolat", "Pannacotta coulis de fruits rouges"],
    { obligatoire: true, when }
  );
  return [dessert, ...cdaGlaceDeFormule(dessert, CDA_GLACE_2_BOULES)];
};

// « Duo 15€00 — Entrée + Plat ou Plat + Dessert » : une ligne, la formule en premier choix.
const CDA_ENTREE_PLAT = "Entrée + Plat";
const CDA_PLAT_DESSERT = "Plat + Dessert";
const CDA_DUO_FORMULE = groupeChoix("formule", "Formule", [CDA_ENTREE_PLAT, CDA_PLAT_DESSERT], {
  obligatoire: true,
});

const CDA_BAVETTE = "Bavette de bœuf sauce au choix, pommes grenailles et légumes de saison";
const CDA_MENU_25_PLAT = groupeChoix(
  "plat",
  "Plat",
  ["Linguines au saumon", "Filet de Saint Pierre grillé et son beurre blanc, fondue de poireaux", CDA_BAVETTE],
  { obligatoire: true }
);
// Les sauces de la bavette de la carte.
const CDA_MENU_25_PLATS = [
  CDA_MENU_25_PLAT,
  groupeChoix("sauce-bavette", "Sauce", CDA_SAUCES, { obligatoire: true, when: cdaSi(CDA_MENU_25_PLAT, CDA_BAVETTE) }),
  groupeChoix("cuisson-bavette", "Cuisson", CDA_CUISSONS, {
    obligatoire: true,
    when: cdaSi(CDA_MENU_25_PLAT, CDA_BAVETTE),
  }),
];
const CDA_GLACE_2_BOULES_AU_CHOIX = "Glace 2 boules au choix";
const CDA_MENU_25_DESSERT = groupeChoix(
  "dessert",
  "Dessert",
  ["Dessert du jour", "Crème brûlée", "Tiramisu Original", CDA_GLACE_2_BOULES_AU_CHOIX],
  { obligatoire: true }
);

const CDA_BAMBINO_ACCOMPAGNEMENT = groupeChoix("accompagnement", "Accompagnement", ["Frites maison", "Purée"], {
  obligatoire: true,
});
// « Glace 1 boule ou Pom'Pote » : la boule se choisit dans les parfums des coupes.
const CDA_GLACE_1_BOULE = "Glace 1 boule";
const CDA_BAMBINO_DESSERT = groupeChoix("dessert", "Dessert", [CDA_GLACE_1_BOULE, "Pom'Pote"], { obligatoire: true });
const CDA_BAMBINO_DESSERTS = [
  CDA_BAMBINO_DESSERT,
  groupeChoix("parfum", "Parfum", CDA_PARFUMS_GLACE, {
    obligatoire: true,
    when: cdaSi(CDA_BAMBINO_DESSERT, CDA_GLACE_1_BOULE),
  }),
];

const cdaCoupe = (id: string, name: string, description: string, price = 8.5): MenuItem => ({
  id,
  name,
  description,
  price,
  image: CDA_PHOTOS[id],
});

// Les deux lignes « Suppléments » de la carte, cumulables.
const CDA_PETIT_DEJEUNER_SUPPLEMENTS = groupeChoix(
  "supplements",
  "Suppléments",
  [["Viennoiserie", 1.6], ["Parfait (fromage blanc, granola, fruits)", 4.5]],
  { multiple: true }
);
// « Boisson chaude au choix » : le café, le thé et le chocolat chaud de la carte.
const CDA_BOISSON_PETIT_DEJEUNER = groupeChoix("boisson-chaude", "Boisson chaude", ["Café", "Thé", "Chocolat chaud"], {
  obligatoire: true,
});

const CDA_CHANTILLY = groupeChoix("supplement", "Supplément", [["Chantilly", 1]], { multiple: true });

// Les parfums des sirops de la carte (« Parfums sirops »), pour le sirop à l'eau et le diabolo.
const CDA_SIROPS = [
  "Grenadine",
  "Menthe",
  "Pêche",
  "Fraise",
  "Citron",
  "Framboise",
  "PAC",
  "Violette",
  "Orgeat",
  "Kiwi",
  "Banane",
  "Cerise",
  "Cassis",
];

const CDA_MARTINI = groupeChoix("version", "Version", ["Bianco", "Rosso", "Fiero"], { obligatoire: true });

const CDA_JAGERBOMB = [["L'unité", 6.5], ["Les 5", 29]] as const;
const CDA_PICHET_BIERE = [["Paulaner", 11], ["St-Thomas", 14], ["Blanche Weissbier", 14]] as const;
const CDA_JACK_DANIELS = [["4 cl", 10], ["70 cl", 110]] as const;

// Les deux lignes imprimées, la recette puis ses déclinaisons, réunies en une description.
const cdaCocktail = (
  id: string,
  name: string,
  description: string,
  { price = 8.5, declinaisons }: { price?: number; declinaisons?: readonly string[] } = {}
): MenuItem => ({
  id,
  name,
  description: declinaisons ? `${description}\u00a0· Déclinaisons\u00a0: ${declinaisons.join(", ")}` : description,
  price,
  image: CDA_PHOTOS[id],
  ...ALCOOL,
  ...(declinaisons && {
    options: [groupeChoix("declinaison", "Déclinaison", declinaisons, { aucun: "Classique" })],
  }),
});

/** Une pression : 25 cl, 50 cl, 1 L, girafe de 3 L. */
const cdaPression = (
  id: string,
  name: string,
  [demi, pinte, litre, girafe]: readonly [number, number, number, number],
  description?: string
) =>
  articleFormats(
    id,
    name,
    [["25 cl", demi], ["50 cl", pinte], ["1 L", litre], ["Girafe 3 L", girafe]],
    { ...ALCOOL, ...(description && { description }) }
  );

const cdaBouteille = (id: string, name: string, price: number, description: string, detail = "33 cl"): MenuItem => ({
  id,
  name,
  description,
  price,
  detail,
  ...ALCOOL,
});

/** Un vin au verre (12,5 cl) et à la bouteille, ou à la bouteille seulement. */
const cdaVin = (id: string, name: string, bouteille: number, verre?: number): MenuItem =>
  verre === undefined
    ? { id, name, price: bouteille, detail: "75 cl", ...ALCOOL }
    : articleFormats(id, name, [["12,5 cl", verre], ["75 cl", bouteille]], ALCOOL);

/** Un spiritueux au verre (4 cl), et à la bouteille (70 cl) quand la carte la propose. */
const cdaSpiritueux = (
  id: string,
  name: string,
  verre: number,
  bouteille?: number,
  extra: Partial<MenuItem> = {}
): MenuItem => {
  if (bouteille === undefined) return { id, name, price: verre, detail: "4 cl", ...ALCOOL, ...extra };
  const prix = [["4 cl", verre], ["70 cl", bouteille]] as const;
  return articleFormats(id, name, prix, { ...ALCOOL, ...extra }, ["format", "Format"]);
};

const cdaDigestif = (id: string, name: string, price = 9): MenuItem => ({ id, name, price, ...ALCOOL });

const cafeDesArts: Restaurant = {
  slug: "cafe-des-arts",
  name: "Café des Arts",
  suivi: true,
  tagline: "Bar · Restaurant",
  logo: "/cafe-des-arts/logo.webp",
  logoIsName: true,
  icons: { tab: "/cafe-des-arts/favicon.png", homeScreen: "/cafe-des-arts/icon.png" },
  themeColor: "#000000",
  address: "3 Rue Saint-Guilhem, 34000 Montpellier",
  phone: "+33 4 12 16 09 40",
  hours: "Tous\u00a0les\u00a0jours 10h–\u20601h",
  // La première, celle de la cuisine, sert aussi le bandeau « À emporter » de la démo Collect.
  highlights: [
    "Restauration de 11h30 à 23h",
    "Ouvert 7j/7 de 10h à 1h",
    "Coupes glacées de Gérard\u00a0Cabiron,\u00a0MOF",
  ],
  ticker: [
    { text: "Terrasse ombragée", tone: "brand" },
    // Seule la girafe de 3 L est chiffrée : les 4 L, 5 L et celles de cocktail attendent leurs prix.
    { text: "Girafes de bière de 3 L", tone: "accent" },
    // L'imposte de la devanture : « Restaurant au 1er étage ».
    { text: "Restaurant au 1er\u00a0étage", tone: "brand" },
    { text: "Pizzas maison", tone: "accent" },
  ],
  pairings: cafeDesArtsAccords,
  loyaltyWheel: roueDuJour,
  // Les paliers de Caffè Panis, du même groupe (1 € = 1 point), sur cette carte.
  demoLoyalty: {
    pointsPerEuro: 1,
    rewards: [
      {
        id: "cafe-soft",
        label: "1 café ou soft offert",
        points: 50,
        items: [
          "cafe",
          "decafeine",
          "noisette",
          "cafe-allonge",
          "double-cafe",
          "cafe-creme",
          "cappuccino",
          "chocolat-chaud",
          "sprite",
          "fanta",
          "tropico",
          "orangina",
          "limonade-pression",
          "cacolac",
        ],
      },
      {
        id: "dessert",
        label: "1 dessert offert",
        points: 100,
        items: [
          "pannacotta",
          "poire-pochee",
          "moelleux-chocolat",
          "tiramisu",
          "dessert-du-jour",
          "profiteroles-maison",
          "creme-brulee",
          "baba-au-rhum",
          "cafe-gourmand",
          "chocolat-liegeois",
          "cafe-liegeois",
          "dame-blanche",
          "delice-des-bois",
          "mont-blanc",
          "parfait-caramel",
          "coconut",
          "gourmande",
          "poire-belle-helene",
          "peche-melba",
          "banana-split",
          "profiteroles",
        ],
      },
      {
        id: "cocktail",
        label: "1 cocktail offert",
        points: 150,
        items: [
          "pina-colada",
          "tequila-sunrise",
          "moscow-mule",
          "cuba-libre",
          "bloody-mary",
          "cosmopolitain",
          "gin-fizz",
          "planteur",
          "mai-tai",
          "margarita",
          "sex-on-the-beach",
          "fiero-spritz",
          "saint-germain-cocktail",
        ],
      },
      {
        id: "pizza",
        label: "1 pizza offerte",
        points: 250,
        items: [
          "pizza-margarita",
          "pizza-romaine",
          "pizza-reine",
          "pizza-royale",
          "pizza-napolitaine",
          "pizza-chevre-miel",
          "pizza-toscana",
          "pizza-4-fromages",
          "pizza-4-saisons",
          "pizza-florentine",
          "pizza-neptune",
          "pizza-campione",
          "pizza-calabrese",
          "pizza-tartufata",
          "pizza-indienne",
          "pizza-norvegienne",
          "pizza-savoyarde",
        ],
      },
    ],
    member: {
      contact: "0612345678",
      firstName: "Léonie",
      history: [
        { kind: "gain", points: 4, table: 5, rewards: null, daysAgo: 1 },
        { kind: "roue", points: 5, table: null, rewards: null, daysAgo: 1 },
        { kind: "gain", points: 8, table: 2, rewards: null, daysAgo: 2 },
        { kind: "roue", points: 10, table: null, rewards: null, daysAgo: 2 },
        { kind: "gain", points: 17, table: 6, rewards: null, daysAgo: 6 },
        { kind: "roue", points: 15, table: null, rewards: null, daysAgo: 6 },
        { kind: "gain", points: 24, table: 3, rewards: null, daysAgo: 13 },
      ],
    },
  },
  categories: [
    {
      id: "menu-brasserie",
      name: "Menu Brasserie",
      tagline: "Servi uniquement le midi, sauf le dimanche et jours fériés",
      items: [
        {
          id: "uno",
          name: "Uno",
          description: "1 plat au choix",
          price: 12,
          options: CDA_BRASSERIE_PLATS,
        },
        {
          id: "duo",
          name: "Duo",
          description: `${CDA_ENTREE_PLAT} ou ${CDA_PLAT_DESSERT}`,
          price: 15,
          options: [
            CDA_DUO_FORMULE,
            cdaBrasserieEntree(cdaSi(CDA_DUO_FORMULE, CDA_ENTREE_PLAT)),
            ...CDA_BRASSERIE_PLATS,
            ...cdaBrasserieDesserts(cdaSi(CDA_DUO_FORMULE, CDA_PLAT_DESSERT)),
          ],
        },
        {
          id: "trio",
          name: "Trio",
          description: "Entrée + Plat + Dessert",
          price: 18,
          options: [cdaBrasserieEntree(), ...CDA_BRASSERIE_PLATS, ...cdaBrasserieDesserts()],
        },
        // Imprimé « Plat » : le plat du jour lui-même est à demander au gérant.
        { id: "plat-du-jour", name: "Plat du jour", price: 10 },
        {
          id: "formule-express",
          name: "Formule Express",
          description: "Plat du jour + Dessert",
          price: 13,
          options: cdaBrasserieDesserts(),
        },
      ],
    },
    {
      id: "menu-bambino",
      name: "Menu Bambino",
      items: [
        {
          id: "bambino-fish-and-chips",
          name: "Fish & Chips",
          description: "Accompagnement + Dessert",
          price: 9,
          options: [CDA_BAMBINO_ACCOMPAGNEMENT, ...CDA_BAMBINO_DESSERTS],
        },
        {
          id: "bambino-nuggets",
          name: "Nuggets de poulets",
          description: "Accompagnement + Dessert",
          price: 9,
          options: [CDA_BAMBINO_ACCOMPAGNEMENT, ...CDA_BAMBINO_DESSERTS],
        },
        {
          id: "pizza-bambino",
          name: "Pizza Bambino",
          description: "Pizza + Dessert",
          price: 9,
          options: CDA_BAMBINO_DESSERTS,
        },
      ],
    },
    {
      id: "menu-25",
      name: "Menu 25",
      items: [
        // Imprimé « Menu » sous le titre « Menu 25 ».
        {
          id: "menu-25-formule",
          name: "Menu 25",
          description: "Entrée + Plat + Dessert",
          price: 25,
          options: [
            groupeChoix(
              "entree",
              "Entrée",
              [
                "Carpaccio de bresaola et ses copeaux de grana padano",
                "Salade de chèvre chaud AOP Pélardon et son lard grillé",
                "Terrine maison",
                "Tataki de bœuf aux graines de sésame",
              ],
              { obligatoire: true }
            ),
            ...CDA_MENU_25_PLATS,
            CDA_MENU_25_DESSERT,
            ...cdaGlaceDeFormule(CDA_MENU_25_DESSERT, CDA_GLACE_2_BOULES_AU_CHOIX),
          ],
        },
      ],
    },
    {
      id: "entrees",
      name: "Entrées",
      items: [
        cdaPlat(
          "foie-gras-poele",
          "Escalopes de foie gras poêlées, compotée d’oignons et sa brioche maison aux figues",
          14.5
        ),
        cdaPlat("tataki-boeuf", "Tataki de bœuf aux graines de sésame", 11.5),
        cdaPlat("carpaccio-bresaola", "Carpaccio de bresaola et ses copeaux de grana padano", 11),
        cdaPlat("oeuf-parfait", "Œuf parfait, fèves et petits pois et son lard grillé", 9.5),
        cdaPlat("veloute-legumes", "Velouté de légumes de saison", 11),
        cdaPlat("terrine-porc", "Terrine de porc maison servie avec ses toasts grillés", 11),
        articleFormats("escargots", "Escargots beurre à l’ail", CDA_ESCARGOTS, {
          image: CDA_PHOTOS.escargots,
        }, ["quantite", "Quantité"]),
      ],
    },
    {
      id: "salades-xxl",
      name: "Les salades XXL",
      items: [
        cdaPlat(
          "salade-perigourdine",
          "Salade périgourdine",
          16.5,
          "Salade, tomates, noix, oignons, gésiers, lardons, foie gras, magret fumé"
        ),
        cdaPlat("salade-caesar", "Salade Caesar au poulet et «\u00a0fromage grana padano\u00a0»", 14.5),
        cdaPlat(
          "salade-vegetarienne",
          "Salade végétarienne",
          14,
          "Salade, tomates, concombres, oignons rouges, maïs, carottes, artichauts, tomates confites et légumes grillés"
        ),
        cdaPlat("salade-chevre-chaud", "Salade de chèvre chaud AOP Pélardon et son lard grillé", 14.5),
        cdaPlat("poke-bowl-vegetarien", "Poke bowl végétarien", 14, "Lentilles vertes du Puy et légumes de saison"),
      ],
    },
    {
      id: "bruschettas",
      name: "Les bruschettas",
      items: [
        cdaPlat(
          "bruschetta-saumon",
          "Bruschetta Saumon",
          13.5,
          "Pain, crème ciboulette, saumon, mozzarella et sa salade composée"
        ),
        cdaPlat(
          "bruschetta-catalane",
          "Bruschetta Catalane",
          13.5,
          "Pain, tomates, jambon cru, chorizo, mozzarella et sa salade composée"
        ),
        cdaPlat(
          "bruschetta-chevre-miel",
          "Bruschetta Chèvre miel",
          13,
          "Pain, crème fraîche, fromage de chèvre, miel, mozzarella et sa salade composée"
        ),
      ],
    },
    {
      id: "pizzas-tomate",
      name: "Les pizzas maison à la tomate",
      tagline: "Supplément garniture\u00a0: 1\u00a0€",
      items: [
        cdaPizza("pizza-margarita", "Margarita", 9.5, ["Sauce tomate", "mozzarella"]),
        cdaPizza("pizza-romaine", "Romaine", 10.5, ["Sauce tomate", "mozzarella", "jambon"]),
        cdaPizza("pizza-reine", "Reine", 11.5, ["Sauce tomate", "mozzarella", "jambon", "champignons"]),
        cdaPizza("pizza-royale", "Royale", 12.5, ["Sauce tomate", "champignons", "mozzarella", "jambon", "œuf"]),
        cdaPizza("pizza-napolitaine", "Napolitaine", 12.5, ["Sauce tomate", "anchois", "mozzarella", "câpres", "olive"]),
        cdaPizza("pizza-chevre-miel", "Chèvre au miel", 13, ["Sauce tomate", "mozzarella", "fromage de chèvre", "miel"]),
        cdaPizza("pizza-toscana", "Toscana", 13.5, ["Sauce tomate", "mozzarella", "jambon", "chorizo", "lardons"]),
        cdaPizza("pizza-4-fromages", "4 Fromages", 13.5, [
          "Sauce tomate",
          "mozzarella",
          "fromage de chèvre",
          "gorgonzola",
          "raclette",
        ]),
        cdaPizza("pizza-4-saisons", "4 Saisons", 13, [
          "Sauce tomate",
          "jambon",
          "mozzarella",
          "champignons",
          "artichauts",
          "poivrons",
        ]),
        cdaPizza(
          "pizza-florentine",
          "Florentine «\u00a0Végétarienne\u00a0»",
          13,
          ["Sauce tomate", "oignons", "mozzarella", "poivrons", "champignons", "artichauts", "tomates", "olives"]
        ),
        cdaPizza("pizza-neptune", "Neptune", 13, [
          "Sauce tomate",
          "mozzarella",
          "thon",
          "oignons",
          "champignons",
          "tomates cerises",
        ]),
        cdaPizza("pizza-campione", "Campione", 13.5, ["Sauce tomate", "mozzarella", "viande hachée", "poivrons", "œuf"]),
        cdaPizza("pizza-calabrese", "Calabrese", 14, [
          "Sauce tomate",
          "mozzarella",
          "tomates",
          "roquette",
          "jambon cru Serrano",
          "copeaux de parmesan",
        ]),
      ],
    },
    {
      id: "pizzas-creme",
      name: "Les pizzas maison à la crème",
      tagline: "Supplément garniture\u00a0: 1\u00a0€",
      items: [
        cdaPizza("pizza-tartufata", "La Tartufata", 16, [
          "Crème fraîche à la truffe",
          "mozzarella",
          "oignons",
          "champignons",
          "roquette",
          "jambon à la truffe",
        ]),
        cdaPizza("pizza-indienne", "Indienne", 13.5, ["Crème fraîche au curry", "mozzarella", "poulet mariné", "oignon"]),
        cdaPizza("pizza-norvegienne", "Norvégienne", 13.5, ["Crème fraîche", "mozzarella", "saumon fumé"]),
        cdaPizza("pizza-savoyarde", "Savoyarde", 14, [
          "Crème fraîche",
          "fromage",
          "lardons",
          "oignons",
          "pommes de terre",
          "reblochon",
        ]),
      ],
    },
    {
      id: "poissons",
      name: "Les poissons",
      items: [
        cdaPlat("seiches-setoise", "Seiches à la sétoise, riz camarguais", 16.5),
        cdaPlat("saint-pierre", "Filet de Saint Pierre grillé, beurre blanc, fondue de poireaux", 18),
        cdaPlat("risotto-saint-jacques", "Risotto aux Saint Jacques", 19.5),
      ],
    },
    {
      id: "pates",
      name: "Les pâtes",
      items: [
        cdaPlat(
          "mac-and-cheese",
          "Mac and cheese et son jambon à la truffe",
          18,
          "Macaronis, crème au fromage truffé, jambon à la truffe"
        ),
        cdaPlat("linguinis-saint-jacques", "Linguinis aux Saint Jacques, tomate basilic", 18.5),
        cdaPlat("lasagne-boeuf", "Lasagne de bœuf maison et sa salade verte", 15.5),
      ],
    },
    {
      id: "viandes-burgers",
      name: "Les viandes & burgers",
      tagline: "Sauces au choix\u00a0: Roquefort, échalote, poivre",
      items: [
        cdaPlat(
          "supreme-volaille",
          "Suprême de volaille fermier Label Rouge sauce forestière, écrasé de pomme de terre",
          16.5
        ),
        {
          id: "bavette",
          name: "Bavette de bœuf sauce au choix, pommes grenailles et légumes de saison",
          price: 16.5,
          image: CDA_PHOTOS.bavette,
          options: [groupeChoix("sauce", "Sauce", CDA_SAUCES, { obligatoire: true }), CDA_CUISSON],
        },
        {
          ...cdaPlat("filet-rossini", "Filet de bœuf façon Rossini, carottes vichy et pommes grenailles", 23.5),
          options: [CDA_CUISSON],
        },
        cdaPlat(
          "epaule-agneau",
          "Épaule d’agneau d’Aveyron cuite basse température (8h), pommes grenailles et légumes de saison",
          18.5
        ),
        cdaPlat("tartiflette", "Tartiflette maison, salade verte, charcuterie", 16),
        {
          ...cdaPlat(
            "burger-cafe-des-arts",
            "Burger Café des Arts «\u00a0bœuf Charolais\u00a0» servi avec ses frites maison et salade",
            16
          ),
          options: [CDA_CUISSON],
        },
        {
          ...cdaPlat(
            "burger-aveyronnais",
            "Burger Aveyronnais au roquefort et bacon «\u00a0bœuf Charolais\u00a0» servi avec ses frites maison et salade",
            16.5
          ),
          options: [CDA_CUISSON],
        },
        cdaPlat(
          "burger-vegetarien",
          "Burger steak végétarien avec compotée d’oignons et chou rouge avec ses frites maison et salade",
          16.5
        ),
      ],
    },
    {
      id: "extra-garniture",
      name: "Extra garniture",
      items: [
        cdaPlat("garniture-riz", "Riz", 5),
        cdaPlat("garniture-puree", "Purée", 5),
        cdaPlat("garniture-legumes", "Légumes", 5),
        cdaPlat("garniture-frites", "Frites maison", 5),
        cdaPlat("garniture-grenailles", "Pommes de terre grenailles", 5),
      ],
    },
    {
      id: "coupes-glacees",
      name: "Coupes glacées",
      tagline: "Gérard\u00a0Cabiron\u00a0· MOF",
      items: [
        cdaCoupe("chocolat-liegeois", "Chocolat Liégeois", "2 Chocolat, 1 Vanille, Chocolat chaud, Chantilly"),
        cdaCoupe("cafe-liegeois", "Café Liégeois", "2 Café, 1 Vanille, Café chaud, Chantilly"),
        cdaCoupe("dame-blanche", "Dame Blanche", "3 Vanille, Chocolat Chaud, Amandes grillées, Chantilly"),
        cdaCoupe(
          "delice-des-bois",
          "Délice des bois",
          "1 Fraise, 1 Framboise, 1 Cassis, Coulis de fruits rouges, Chantilly"
        ),
        cdaCoupe("mont-blanc", "Mont-Blanc", "2 Vanille, 1 Chocolat, Crème de marron, Chocolat chaud, Chantilly"),
        cdaCoupe(
          "parfait-caramel",
          "Parfait Caramel",
          "2 Caramel beurre salé, 1 Vanille, Coulis caramel, Noisettes grillées, Chantilly"
        ),
        cdaCoupe("coconut", "Coconut", "2 Coco, 1 Chocolat, Chocolat chaud, Chantilly"),
        cdaCoupe(
          "gourmande",
          "Gourmande",
          "1 Caramel Beurre salé, 1 Vanille, 1 Chocolat, Cookies, Chocolat chaud, Chantilly"
        ),
        cdaCoupe("poire-belle-helene", "Poire Belle Hélène", "2 Poire, 1 Vanille, Fruits, Chocolat chaud, Chantilly"),
        cdaCoupe("peche-melba", "Pêche Melba", "2 Pêche, 1 Vanille, Fruits, Coulis de fruits rouges, Chantilly"),
        cdaCoupe(
          "banana-split",
          "Banana Split",
          "1 Vanille, 1 Chocolat, 1 Fraise, Banane, Chocolat chaud, Chantilly"
        ),
        { ...cdaCoupe("colonel", "Colonel", "3 Citron, Vodka"), ...ALCOOL },
        { ...cdaCoupe("martiniquaise", "Martiniquaise", "3 Rhum-raisin, Rhum brun"), ...ALCOOL },
        cdaCoupe("profiteroles", "Profiteroles", "Choux maison, Vanille, Chocolat chaud, Chantilly", 9),
        {
          id: "coupe-2-boules",
          name: "Coupe glacée 2 boules",
          price: 4.5,
          options: [cdaBoule(1, "1re boule"), cdaBoule(2, "2e boule")],
        },
        {
          id: "coupe-3-boules",
          name: "Coupe glacée 3 boules",
          price: 6.5,
          options: [cdaBoule(1, "1re boule"), cdaBoule(2, "2e boule"), cdaBoule(3, "3e boule")],
        },
      ],
    },
    {
      id: "desserts-maison",
      name: "Les desserts maison",
      items: [
        cdaPlat("pannacotta", "Pannacotta et son coulis de fruits rouges", 6.5),
        cdaPlat("poire-pochee", "Poire pochée au chocolat", 7),
        cdaPlat("moelleux-chocolat", "Moelleux au chocolat, cœur caramel et sa crème anglaise", 8.5),
        cdaPlat("tiramisu", "Tiramisu Original", 7.5),
        cdaPlat("dessert-du-jour", "Dessert du jour", 7),
        cdaPlat("profiteroles-maison", "Profiteroles maison au chocolat", 9),
        cdaPlat("creme-brulee", "Crème brûlée", 7),
        cdaPlat("baba-au-rhum", "Baba au rhum", 7.5),
        cdaPlat("assiette-fromages", "Assiette de fromages", 8.5),
        cdaPlat("cafe-gourmand", "Café gourmand", 9),
      ],
    },
    {
      id: "boissons-chaudes",
      name: "Boissons chaudes",
      boissons: "chaudes",
      tagline: "Café, décaféiné, noisette, allongé\u00a0: fin de service à 17h",
      items: [
        { id: "cafe", name: "Café", price: 1.8 },
        { id: "decafeine", name: "Décaféiné", price: 1.8 },
        { id: "noisette", name: "Noisette", price: 1.9 },
        { id: "cafe-allonge", name: "Café allongé", price: 2.1 },
        { id: "double-cafe", name: "Double Café", price: 3.2 },
        { id: "cafe-creme", name: "Café crème", price: 3.4 },
        { id: "cappuccino", name: "Cappuccino", price: 3.5 },
        { id: "chocolat-chaud", name: "Chocolat chaud", price: 3.5 },
        {
          id: "viennois",
          name: "Café ou Chocolat Viennois",
          price: 4,
          options: [groupeChoix("boisson", "Boisson", ["Café viennois", "Chocolat viennois"], { obligatoire: true })],
        },
        {
          id: "the-infusion",
          name: "Thé ou Infusion",
          description:
            "Thé noir, thé vert menthe, thé citron, thé fruits rouges, thé caramel, verveine, verveine menthe, camomille",
          price: 3,
          options: [
            groupeChoix(
              "parfum",
              "Parfum",
              [
                "Thé noir",
                "Thé vert menthe",
                "Thé citron",
                "Thé fruits rouges",
                "Thé caramel",
                "Verveine",
                "Verveine menthe",
                "Camomille",
              ],
              { obligatoire: true }
            ),
          ],
        },
        {
          id: "irish-coffee",
          name: "Irish Coffee",
          description: "Double café, whisky, sucre de canne, chantilly",
          price: 7.5,
          ...ALCOOL,
        },
        {
          id: "french-coffee",
          name: "French Coffee",
          description: "Double café, cognac, sucre de canne, chantilly",
          price: 7.5,
          ...ALCOOL,
        },
      ],
    },
    {
      id: "petit-dejeuners",
      name: "Petits déjeuners",
      items: [
        {
          id: "petit-dejeuner-continental",
          name: "Continental",
          description: "Tartines, Viennoiseries, Confiture, Nutella, Beurre, Jus d'orange bio, Boisson chaude au choix",
          price: 6.5,
          options: [CDA_BOISSON_PETIT_DEJEUNER, CDA_PETIT_DEJEUNER_SUPPLEMENTS],
        },
        {
          id: "petit-dejeuner-americain",
          name: "Américain",
          description:
            "2 œufs (au plat ou brouillés), Bacon, Comté, Pain, Jus d'orange bio, Boisson chaude au choix",
          price: 9.9,
          options: [
            groupeChoix("oeufs", "Œufs", ["Au plat", "Brouillés"], { obligatoire: true }),
            CDA_BOISSON_PETIT_DEJEUNER,
            CDA_PETIT_DEJEUNER_SUPPLEMENTS,
          ],
        },
      ],
    },
    {
      id: "boissons-fraiches",
      name: "Boissons fraîches",
      boissons: true,
      items: [
        {
          // Imprimé « Coca-Cola, Coca-Cola zéro, Coca-Cola cherry » : la version se choisit.
          id: "coca-cola",
          name: "Coca-Cola",
          description: "Coca-Cola, zéro ou cherry",
          price: 3.6,
          detail: "33 cl",
          options: [
            groupeChoix("version", "Version", ["Coca-Cola", "Coca-Cola zéro", "Coca-Cola cherry"], {
              obligatoire: true,
            }),
          ],
        },
        { id: "sprite", name: "Sprite", price: 3.6, detail: "33 cl" },
        { id: "fanta", name: "Fanta", price: 3.6, detail: "33 cl" },
        {
          id: "fuze-tea",
          name: "Fuze Tea",
          description: "Pêche intense ou thé vert camomille",
          price: 3.6,
          detail: "25 cl",
          options: [groupeChoix("parfum", "Parfum", ["Pêche intense", "Thé vert camomille"], { obligatoire: true })],
        },
        { id: "tropico", name: "Tropico Tropical", price: 3.6, detail: "25 cl" },
        {
          id: "schweppes",
          name: "Schweppes",
          description: "Agrumes ou tonic",
          price: 3.6,
          detail: "25 cl",
          options: [
            groupeChoix("version", "Version", ["Schweppes agrumes", "Schweppes tonic"], { obligatoire: true }),
          ],
        },
        { id: "orangina", name: "Orangina", price: 3.6, detail: "25 cl" },
        { id: "limonade-pression", name: "Limonade pression", price: 2.8, detail: "30 cl" },
        { id: "cacolac", name: "Cacolac", price: 3.6, detail: "25 cl" },
        { id: "badoit", name: "Badoit", price: 3.6, detail: "33 cl" },
        { id: "evian", name: "Evian", price: 3.6, detail: "33 cl" },
        {
          id: "diabolo",
          name: "Diabolo",
          price: 3,
          detail: "30 cl",
          options: [groupeChoix("sirop", "Sirop", CDA_SIROPS, { obligatoire: true })],
        },
        {
          id: "jus-de-fruits",
          name: "Jus de fruits",
          description: "Orange, Ananas, Pomme, Abricot, Tomate",
          price: 3.6,
          detail: "30 cl",
          options: [
            groupeChoix("jus", "Jus", ["Orange", "Ananas", "Pomme", "Abricot", "Tomate"], { obligatoire: true }),
          ],
        },
        {
          id: "sirop-a-l-eau",
          name: "Sirop à l'eau",
          description:
            "Grenadine, Menthe, Pêche, Fraise, Citron, Framboise, PAC, Violette, Orgeat, Kiwi, Banane, Cerise, Cassis",
          price: 2.5,
          detail: "30 cl",
          options: [groupeChoix("parfum", "Parfum", CDA_SIROPS, { obligatoire: true })],
        },
        {
          id: "red-bull",
          name: "Red Bull",
          description: "Original, Sugar free, Tropical",
          price: 5,
          detail: "25 cl",
          options: [groupeChoix("version", "Version", ["Original", "Sugar free", "Tropical"], { obligatoire: true })],
        },
        { id: "verre-d-eau", name: "Verre d'eau", price: 2, detail: "15 cl" },
        {
          id: "smoothies",
          name: "Smoothies",
          description: "Mangue, Pêche, Fruits rouges, Fraise, Fruits Exotiques",
          price: 5.5,
          options: [
            groupeChoix("parfum", "Parfum", ["Mangue", "Pêche", "Fruits rouges", "Fraise", "Fruits Exotiques"], {
              obligatoire: true,
            }),
          ],
        },
      ],
    },
    {
      id: "milkshake",
      name: "Milkshake",
      boissons: true,
      items: [
        // La carte ne nomme pas leurs parfums : ceux des glaces, à confirmer.
        {
          id: "milkshake-1-parfum",
          name: "Milkshake 1 Parfum",
          price: 5,
          image: CDA_PHOTOS["milkshake-1-parfum"],
          options: [groupeChoix("parfum", "Parfum", CDA_PARFUMS_GLACE, { obligatoire: true }), CDA_CHANTILLY],
        },
        {
          id: "milkshake-2-parfums",
          name: "Milkshake 2 Parfums",
          price: 7,
          image: CDA_PHOTOS["milkshake-2-parfums"],
          options: [
            groupeChoix("parfum-1", "1er parfum", CDA_PARFUMS_GLACE, { obligatoire: true }),
            groupeChoix("parfum-2", "2e parfum", CDA_PARFUMS_GLACE, { obligatoire: true }),
            CDA_CHANTILLY,
          ],
        },
      ],
    },
    {
      id: "bieres-pression",
      name: "Bières pression",
      boissons: true,
      items: [
        cdaPression("paulaner", "Paulaner", [3, 5.7, 11, 28], "4,9° Blonde"),
        cdaPression("st-thomas", "St-Thomas", [4, 7.5, 14, 40], "6,8° Abbaye"),
        cdaPression("munchner-marzen", "Münchner Märzen", [4, 7.5, 14, 40], "5,5° Blonde"),
        cdaPression("salvator", "Salvator", [4, 7.5, 14, 40], "7,9° Ambré foncé"),
        cdaPression("biere-du-mois", "Bière du mois", [4, 7.5, 14, 40]),
        articleFormats("panache", "Panaché", [["25 cl", 3], ["50 cl", 5.9]], {
          ...ALCOOL,
          description: "5,5° Blonde",
        }),
        articleFormats("monaco", "Monaco", [["25 cl", 3.2], ["50 cl", 5.7]], ALCOOL),
        articleFormats("picon-biere", "Picon Bière", [["25 cl", 4], ["50 cl", 7.5]], ALCOOL),
      ],
    },
    {
      id: "bieres-bouteille",
      name: "Bières bouteille",
      boissons: true,
      items: [
        cdaBouteille("heineken", "Heineken", 5, "5°"),
        cdaBouteille("desperados", "Desperados", 6, "5,9°"),
        cdaBouteille("corona", "Corona", 6, "4,5°"),
        cdaBouteille("cubanisto", "Cubanisto", 6, "5,9°"),
        cdaBouteille("kriek-cerise", "Kriek Cerise", 6, "3,5°", "25 cl"),
        cdaBouteille("cidre-magners", "Cidre Magners", 7, "4,5°"),
        cdaBouteille("guinness", "Guinness", 7, "8°"),
        cdaBouteille("tripel-karmeliet", "Tripel Karmeliet", 7, "8,4°"),
        cdaBouteille("chouffe", "Chouffe", 7, "8°"),
        // Imprimé « Paulaner — Sans alcool 0° » : le nom le dit, jusqu'au ticket du bar.
        { id: "paulaner-sans-alcool", name: "Paulaner sans alcool", description: "0°", price: 5, detail: "33 cl" },
      ],
    },
    {
      id: "aperitifs",
      name: "Apéritifs",
      boissons: true,
      items: [
        { id: "kir-maison", name: "Kir Maison", price: 3.7, detail: "10 cl", ...ALCOOL },
        { id: "coupe-de-champagne", name: "Coupe de champagne", price: 8, detail: "10 cl", ...ALCOOL },
        { id: "kir-royal", name: "Kir Royal", price: 9, detail: "10 cl", ...ALCOOL },
        { id: "prosecco-verre", name: "Prosecco Ponte Villoni", price: 5, detail: "12,5 cl", ...ALCOOL },
        { id: "muscat", name: "Muscat", price: 4.5, detail: "6 cl", ...ALCOOL },
        {
          id: "martini",
          name: "Martini",
          description: "Bianco, Rosso ou Fiero",
          price: 4.5,
          detail: "6 cl",
          ...ALCOOL,
          options: [CDA_MARTINI],
        },
        {
          id: "martini-tonic",
          name: "Martini Tonic",
          description: "Bianco, Rosso ou Fiero",
          price: 5,
          detail: "16 cl",
          ...ALCOOL,
          options: [CDA_MARTINI],
        },
        {
          id: "campari-suze",
          name: "Campari, Suze",
          price: 4.5,
          detail: "6 cl",
          ...ALCOOL,
          options: [groupeChoix("aperitif", "Apéritif", ["Campari", "Suze"], { obligatoire: true })],
        },
        { id: "americano-maison", name: "Americano Maison", price: 7, detail: "12 cl", ...ALCOOL },
        { id: "porto-rouge", name: "Porto Rouge", price: 4.5, detail: "6 cl", ...ALCOOL },
        {
          id: "ricard-pastis",
          name: "Ricard, Pastis",
          description: "Fin de service 22h",
          price: 3,
          detail: "2 cl",
          ...ALCOOL,
        },
        {
          id: "sangria-maison",
          name: "Sangria blanche & rouge Maison",
          price: 4,
          ...ALCOOL,
          options: [groupeChoix("sangria", "Sangria", ["Blanche", "Rouge"], { obligatoire: true })],
        },
        { id: "punch-maison", name: "Punch Maison", price: 4, ...ALCOOL },
        { id: "fiero-spritz", name: "Fiero Spritz", price: 8, ...ALCOOL },
        {
          id: "saint-germain-cocktail",
          name: "Saint-Germain cocktail",
          description: "Liqueur St Germain, Prosecco, Perrier",
          price: 8,
          ...ALCOOL,
        },
        {
          id: "le-grand-fizz",
          name: "Le Grand Fizz",
          description: "Grey Goose, Liqueur St Germain, Perrier, Citron Vert",
          price: 10,
          ...ALCOOL,
        },
      ],
    },
    {
      id: "champagnes",
      name: "Champagnes",
      boissons: true,
      items: [
        { id: "champagne-selection-maison", name: "Sélection de la maison", price: 60, ...ALCOOL },
        { id: "champagne-ar-lenoble", name: "AR Lenoble intense", price: 80, ...ALCOOL },
        { id: "champagne-veuve-clicquot", name: "Veuve Clicquot brut", price: 100, ...ALCOOL },
        { id: "champagne-ruinart", name: "Ruinart Blanc de Blanc", price: 130, ...ALCOOL },
      ],
    },
    {
      id: "cocktails",
      name: "Cocktails",
      boissons: true,
      items: [
        cdaCocktail("mojito", "Mojito", "Rhum Bacardi Cuatro, Citron vert, Cassonade, Feuilles de menthe, Limonade", {
          declinaisons: [...PARFUMS_FRUITS, "Piment/Gingembre"],
        }),
        // Les cocktails photographiés en tête, le reste dans l'ordre de la carte.
        cdaCocktail(
          "pina-colada",
          "Piña Colada",
          "Rhum Bacardi Cuatro, Crème de coco, Jus d'ananas, Sirop de Vanille"
        ),
        cdaCocktail("tequila-sunrise", "Tequila Sunrise", "Téquila San José, Jus d'orange, Sirop de grenadine"),
        cdaCocktail("moscow-mule", "Moscow Mule", "Vodka Sobieski, Jus de citron vert, Ginger Beer", { price: 10 }),
        cdaCocktail("mojito-royal", "Mojito Royal", "Au champagne", { price: 10.5 }),
        cdaCocktail("cuba-libre", "Cuba Libre", "Rhum Bacardi Cuatro, Citron vert, Coca-Cola"),
        {
          ...cdaCocktail("ti-punch", "Ti Punch", "Rhum Bacardi Cuatro, Cassonade, Citron vert"),
          options: [groupeChoix("supplement", "Supplément", [["Rhum Bologne Black cane", 3]], { multiple: true })],
        },
        cdaCocktail("caipirinha", "Caipirinha", "Cachaça Aguacana, Cassonade, Citron vert", {
          declinaisons: PARFUMS_FRUITS,
        }),
        cdaCocktail("caipiroska", "Caipiroska", "Vodka Sobieski, Cassonade, Citron vert", {
          declinaisons: PARFUMS_FRUITS,
        }),
        cdaCocktail("bloody-mary", "Bloody Mary", "Vodka Sobieski, Jus de citron, Jus de Tomate, Assaisonnements"),
        cdaCocktail("cosmopolitain", "Cosmopolitain", "Vodka Sobieski, Triple sec, Jus de citron, Jus de Cranberry"),
        cdaCocktail("frozen-daiquiri", "Frozen Daiquiri", "Rhum Bacardi Cuatro, Sucre de Canne, Jus de citron vert", {
          declinaisons: PARFUMS_FRUITS,
        }),
        cdaCocktail("gin-fizz", "Gin Fizz", "Gin Old Lady's, Sucre en poudre, Jus de citron, Eau gazeuse"),
        cdaCocktail("planteur", "Planteur", "Rhum Bacardi Cuatro, Jus d'ananas, Jus d'orange, Sirop de grenadine"),
        cdaCocktail("mai-tai", "Mai Tai", "Rhum Bacardi Cuatro, Triple sec, Jus de citron vert, Sirop D'orgeat"),
        cdaCocktail("margarita", "Margarita", "Téquila San José, Triple sec, Jus de citron vert"),
        cdaCocktail(
          "sex-on-the-beach",
          "Sex on the beach",
          "Vodka Sobieski, Crème de pêche, Jus d'orange, Jus de Pomme, Jus de Cranberry"
        ),
        cdaCocktail(
          "long-island",
          "Long Island",
          "Rhum Bacardi Cuatro, Gin Old Lady's, Téquila San José, Vodka Sobieski, Triple sec, Sucre de canne, Jus de citron vert, Coca-Cola",
          { price: 10 }
        ),
        cdaCocktail(
          "lynchburg-lemonade",
          "Lynchburg Lemonade",
          "Jack Daniel's, Triple sec, Jus de citron, Sucre de canne, Limonade",
          { price: 10 }
        ),
        cdaCocktail(
          "dead-n-stormy",
          "Dead'n'Stormy",
          "Dead Man's Fingers spiced, Citron vert, Sirop de falernum, Ginger Ale",
          { price: 10 }
        ),
        cdaCocktail(
          "cold-and-dark-martini",
          "Cold and Dark Martini",
          "Dead Man's Fingers Coffee Rum, Café, Sirop de vanille",
          { price: 10 }
        ),
      ],
    },
    {
      id: "cocktails-sans-alcool",
      name: "Cocktails sans alcool",
      boissons: true,
      items: [
        cdaPlat("exotique", "Exotique", 6.5, "Jus de litchi, Jus d'ananas, Purée de fruits exotiques"),
        cdaPlat("peachy", "Peachy", 6.5, "Purée de pêche, Jus de citron, Jus d'abricot, Jus de Cranberry"),
        cdaPlat("virgin-mojito", "Virgin Mojito", 6.5, "Menthe fraîche, Citron vert, Cassonade, Limonade"),
        cdaPlat("virgin-colada", "Virgin Colada", 6.5, "Crème de coco, Jus d'ananas, Sirop de vanille"),
        cdaPlat(
          "detox",
          "Detox",
          6.5,
          "Jus d'aloé, Jus de citron, Purée de concombre, Purée de pomme verte, Purée de Cédrat"
        ),
      ],
    },
    {
      id: "rhums",
      name: "Rhums",
      boissons: true,
      items: [
        cdaSpiritueux("bacardi-cuatro", "Bacardi Cuatro", 9, 90),
        cdaSpiritueux("bacardi-oakheart", "Bacardi Oakheart", 9, 90),
        cdaSpiritueux("bacardi-8-ans", "Bacardi", 9, 90, { description: "8\u00a0ans, 40\u00a0%" }),
        // Imprimé « Bacardi Cuatro 4cl — 12€00 — Et sa canette de Redbull Tropical ».
        cdaSpiritueux("bacardi-cuatro-red-bull", "Bacardi Cuatro + Red Bull Tropical", 12, undefined, {
          description: "Et sa canette de Red Bull Tropical",
        }),
        cdaSpiritueux("cihuatan", "Cihuatan", 10, undefined, { description: "8\u00a0ans, 40\u00a0%" }),
        cdaSpiritueux("don-papa", "Don Papa", 10, undefined, { description: "40\u00a0%" }),
        cdaSpiritueux("bumbu", "Bumbu", 10, undefined, { description: "35\u00a0%" }),
        cdaSpiritueux("plantation-pineapple", "Plantation Pineapple", 10, undefined, { description: "40\u00a0%" }),
        cdaSpiritueux("bologne-vo", "Bologne VO", 12, undefined, { description: "41\u00a0%, Guadeloupe" }),
      ],
    },
    {
      id: "vodka",
      name: "Vodka",
      boissons: true,
      items: [
        cdaSpiritueux("sobieski", "Sobieski", 9, 90),
        cdaSpiritueux("grey-goose", "Grey Goose", 10, 90),
        cdaSpiritueux("grey-goose-red-bull", "Grey Goose + Red Bull", 12, 130),
      ],
    },
    {
      id: "gin",
      name: "Gin",
      boissons: true,
      items: [
        // Imprimé « Old Ladies » ici, « Old Lady's » dans les cocktails : le nom du gin.
        cdaSpiritueux("old-ladies", "Old Lady's", 9, 90),
        cdaSpiritueux("bombay-sapphire", "Bombay Sapphire", 12, 110),
        cdaSpiritueux("hendricks", "Hendrick's", 13, 130),
        cdaSpiritueux("floraison-gvine", "Floraison G'vine", 13),
      ],
    },
    {
      id: "whisky",
      name: "Whisky",
      boissons: true,
      items: [
        cdaSpiritueux("william-lawson", "William Lawson", 9, 90),
        // Imprimé « Jack Daniel's, Honey, Fire, Apple » : la version se choisit.
        articleFormats("jack-daniels", "Jack Daniel's", CDA_JACK_DANIELS, {
          ...ALCOOL,
          description: "Original, Honey, Fire ou Apple",
          options: [groupeChoix("version", "Version", ["Original", "Honey", "Fire", "Apple"], { obligatoire: true })],
        }, ["format", "Format"]),
        cdaSpiritueux("cardhu-amber-rock", "Cardhu «\u00a0Amber Rock\u00a0»", 10),
        cdaSpiritueux("crabbie", "Crabbie", 10, undefined, { description: "12 ans" }),
        cdaSpiritueux("chivas", "Chivas", 12, undefined, { description: "12 ans" }),
        cdaSpiritueux("pertuis", "Pertuis", 12),
        cdaSpiritueux("woodford-reserve", "Woodford Réserve", 12),
        cdaSpiritueux("tottori", "Tottori", 14),
      ],
    },
    {
      id: "tequila",
      name: "Téquila",
      boissons: true,
      items: [
        cdaSpiritueux("san-jose", "San José", 9, 90),
        cdaSpiritueux("patron-silver", "Patron Silver", 12, 130),
      ],
    },
    {
      id: "digestifs-liqueurs",
      name: "Digestifs & liqueurs",
      boissons: true,
      items: [
        cdaDigestif("limoncello", "Limoncello"),
        cdaDigestif("amaretto", "Amaretto"),
        cdaDigestif("jagermeister", "Jägermeister"),
        cdaDigestif("poire-williams", "Poire William's"),
        cdaDigestif("armagnac", "Armagnac"),
        cdaDigestif("cognac", "Cognac"),
        cdaDigestif("chartreuse-verte", "Chartreuse verte"),
        cdaDigestif("baileys", "Bailey's"),
        {
          ...cdaDigestif("get", "Get 27, Get 31"),
          options: [groupeChoix("version", "Version", ["Get 27", "Get 31"], { obligatoire: true })],
        },
        cdaDigestif("mirabelle", "Mirabelle"),
        cdaDigestif("calvados", "Calvados Château du Breuil"),
        cdaDigestif("hennessy", "Hennessy Hine Rare VSOP", 12),
      ],
    },
    {
      id: "vins-blanc",
      name: "Vins blancs",
      boissons: true,
      items: [
        cdaVin("blanc-garrigues-chardonnay", "Domaine des Garrigues\u00a0· Chardonnay VDP d'Oc", 17.5, 3.5),
        cdaVin("blanc-duc-de-morny-picpoul", "Duc de Morny\u00a0· Picpoul De Pinet AOP", 23, 4),
        cdaVin("blanc-baume-sauvignon", "Domaine de la Baume\u00a0· Sauvignon IGP", 23, 4),
        cdaVin("blanc-baume-viognier", "Domaine de la Baume\u00a0· Viognier IGP d'Oc", 23, 4),
        cdaVin("blanc-tarriquet", "Tarriquet Premières grives\u00a0· IGP côtes de Gascogne", 25, 4.5),
        cdaVin("blanc-grezan-chardonnay", "Château Grezan\u00a0· Chardonnay AOP", 26),
        cdaVin("blanc-hortus", "Bergerie de l'Hortus\u00a0· Pic Saint Loup AOP", 29),
      ],
    },
    {
      id: "vins-rose",
      name: "Vins rosés",
      boissons: true,
      items: [
        cdaVin("rose-garrigues-cinsault", "Domaine des Garrigues\u00a0· Cinsault VDP d'Oc", 17.5, 3.5),
        cdaVin("rose-le-pive", "Le Pive «\u00a0vin bio\u00a0»\u00a0· Gris de gris IGP", 23, 4),
        cdaVin("rose-rouviere", "Domaine de la Rouvière\u00a0· Côtes de Provence AOP", 25, 4),
        cdaVin("rose-grezan-faugeres", "Château Grezan\u00a0· Faugères AOP", 26),
        cdaVin("rose-hortus", "Bergerie de l'Hortus\u00a0· Pic Saint Loup AOP", 29),
      ],
    },
    {
      id: "vins-rouge",
      name: "Vins rouges",
      boissons: true,
      items: [
        cdaVin("rouge-garrigues-merlot", "Domaine des Garrigues\u00a0· Merlot VDP d'Oc", 17.5, 3.5),
        cdaVin("rouge-boissezon-guiraud", "Domaine Boissezon Guiraud\u00a0· Saint Chinian AOP", 23, 4),
        cdaVin("rouge-deesses-muettes", "Les Déesses Muettes\u00a0· Pic Saint Loup", 23, 4),
        cdaVin("rouge-terre-des-galets", "Terre des Galets\u00a0· Côtes du Rhône AOP", 23, 4),
        cdaVin("rouge-grezan-faugeres", "Château Grezan\u00a0· Faugères AOP", 26),
        cdaVin("rouge-crozes-hermitage", "Saint Pierre Crozes Hermitage AOP", 27),
        cdaVin("rouge-hortus", "Bergerie de l'Hortus\u00a0· Pic Saint Loup AOP", 29),
        cdaVin("rouge-mas-de-quernes", "Mas de Quernes Le Ruches Terrasse du Larzac AOP", 38),
      ],
    },
    {
      id: "vins-petillant",
      name: "Vins pétillants",
      boissons: true,
      items: [cdaVin("prossecco-ponte-villoni", "Prosecco Ponte Villoni Extra Dry", 30, 5)],
    },
    {
      id: "special",
      name: "Spécial",
      boissons: true,
      items: [
        articleFormats("special-sangria", "Sangria «\u00a0Maison\u00a0»", [["25 cl", 4], ["1 L", 14], ["2 L", 25]], ALCOOL),
        articleFormats("special-punch", "Punch «\u00a0Maison\u00a0»", [["25 cl", 3.5], ["1 L", 14], ["2 L", 25]], ALCOOL),
        articleFormats("jagerbomb", "Jägerbomb", CDA_JAGERBOMB, {
          ...ALCOOL,
        }, ["quantite", "Quantité"]),
        {
          id: "planche-shooters",
          name: "Planche shooters x10",
          description: "Vodka Arrangées, Kiss Cool, Orgasme, Vodka Get, Baby Guinness",
          price: 25,
          ...ALCOOL,
        },
        articleFormats("pichet-biere", "Pichet de bière 1 L", CDA_PICHET_BIERE, {
          ...ALCOOL,
        }, ["biere", "Bière"]),
        {
          id: "pichet-cocktail",
          name: "Pichet de cocktail 1 L",
          description: "Mojito, Sex on the Beach ou Piña Colada",
          price: 21,
          ...ALCOOL,
          options: [
            groupeChoix("cocktail", "Cocktail", ["Mojito", "Sex on the Beach", "Piña Colada"], { obligatoire: true }),
          ],
        },
      ],
    },
  ],
};

const panisPlat = (file: string) => `/caffe-panis/plats/${file}.webp`;

/*
 * Caffè Panis — 3 place du Marché aux Fleurs. Aucune carte de salle en ligne
 * (leur menu Sunday renvoie à « la carte papier ») : la carte entière de
 * Ciccio Gang, leur marque de livraison à la même adresse (Uber Eats,
 * archive du 26 novembre 2025), mot pour mot à l'orthographe près, prix de
 * livraison, dans l'ordre d'une carte de salle (Uber Eats ouvre sur les
 * Dwich), les plats à photo en tête de section ; le café Illy de leur fiche
 * TheFork (2022). Sources : demos/caffe-panis/docs/.
 */
const caffePanis: Restaurant = {
  slug: "caffe-panis",
  name: "Caffè Panis",
  suivi: true,
  tagline: "Caffè\u00a0·\u00a0Ristorante",
  logo: "/caffe-panis/logo.webp",
  logoIsName: true,
  icons: { tab: "/caffe-panis/favicon.png", homeScreen: "/caffe-panis/icon.png" },
  themeColor: "#0f4b25",
  address: "3 Place du Marché aux Fleurs, 34000 Montpellier",
  phone: "+33 4 99 67 65 38",
  hours: "Tous\u00a0les\u00a0jours 9h–\u20601h",
  highlights: ["De 9h à 1h, 7j/7"],
  // Accords provisoires, à régénérer avec backend/scripts/pairings.py.
  pairings: caffePanisAccords,
  // Les fanions d'une terrasse italienne.
  loyaltyMotif: "fanions",
  loyaltyWheel: roueDuJour,
  demoHappyHour: {
    name: "Aperitivo Happy Hour",
    prices: { margherita: 9, "cafe-illy": 1.5, "coca-cola": 2 },
  },
  // Les paliers de sa fidélité en production (1 € = 1 point).
  demoLoyalty: {
    pointsPerEuro: 1,
    rewards: [
      {
        id: "cafe-soft",
        label: "1 café Illy ou soft offert",
        points: 50,
        items: ["cafe-illy", "coca-cola", "coca-cola-zero", "fuzetea-peche"],
      },
      {
        id: "dessert",
        label: "1 dessert offert",
        points: 100,
        items: ["il-tiramisu", "mousse-big-love", "deurty-cookie"],
      },
      {
        id: "antipasto",
        label: "1 antipasto offert",
        points: 150,
        items: [
          "trio-arancini",
          "prosciutto",
          "burrata-pesto-forever",
          "classic-burrata",
          "stracciatella-fumee",
          "burrata-truffe-mortadelle",
        ],
      },
      {
        id: "pizza-pasta",
        label: "1 pizza ou pasta offerte",
        points: 250,
        items: [
          "amor-amatriciana",
          "mama-king",
          "margherita",
          "puissance-4",
          "stracciatella-versace",
          "capo",
          "green-circle",
          "truffle-supreme",
          "carbonara-originale",
          "alla-bolognese",
          "all-amatriciana",
          "vivi-e-vechio",
          "con-il-pesto",
          "al-tartufo",
        ],
      },
    ],
    member: {
      contact: "0612345678",
      firstName: "Giulia",
      // Deux jours d'affilée : la série se joue sous les yeux du gérant.
      history: [
        { kind: "gain", points: 3, table: 4, rewards: null, daysAgo: 1 },
        { kind: "roue", points: 5, table: null, rewards: null, daysAgo: 1 },
        { kind: "gain", points: 5, table: 9, rewards: null, daysAgo: 2 },
        { kind: "roue", points: 10, table: null, rewards: null, daysAgo: 2 },
        { kind: "gain", points: 22, table: 3, rewards: null, daysAgo: 6 },
        { kind: "roue", points: 15, table: null, rewards: null, daysAgo: 6 },
        { kind: "gain", points: 25, table: 7, rewards: null, daysAgo: 13 },
      ],
    },
  },
  categories: [
    {
      id: "antipasti",
      name: "Antipasti",
      items: [
        {
          id: "trio-arancini",
          name: "Trio d'arancini",
          description: "Trois dodues boulettes frites de risotto au prosciutto et fromage mozza fior di latte, ouuuuh.",
          price: 6.9,
          image: panisPlat("ciccio/trio-arancini"),
        },
        {
          id: "prosciutto",
          name: "Prosciutto",
          description: "L'inoubliable jambon en direct de la région de Parme, fondant à souhait.",
          price: 7.9,
          image: panisPlat("ciccio/prosciutto"),
        },
        {
          id: "burrata-pesto-forever",
          name: "Burrata Pesto Forever",
          description:
            "Belle burrata straight from Puglia fourrée au pesto de basilic, tomates séchées à l'huile, huile d'olive et basilic frais. Servi avec une boule de pain maison.",
          price: 8.9,
          image: panisPlat("ciccio/burrata-pesto-forever"),
        },
        {
          id: "classic-burrata",
          name: "Classic Burrata",
          description:
            "Burrata de 125 g crémeuse à souhait straight from Puglia, basilic frais, un filet d'huile d'olive e basta.",
          price: 6.9,
          image: panisPlat("classic-burrata"),
        },
        {
          id: "stracciatella-fumee",
          name: "Stracciatella fumée 125\u00a0g",
          description:
            "Stracciatella de 125 g fumée et crémeuse à souhait straight from Puglia, basilic frais, un filet d'huile d'olive et une pointe de sel de poivre e basta.",
          price: 6.9,
          image: panisPlat("ciccio/stracciatella-fumee"),
        },
        {
          id: "burrata-truffe-mortadelle",
          name: "Burrata Truffe & Mortadelle",
          description: "Dodue burrata bien fraîche en direct des Pouilles et crème de truffe d'été.",
          price: 10.9,
          image: panisPlat("ciccio/burrata-truffe-mortadelle"),
        },
      ],
    },
    {
      id: "pizze",
      name: "Pizze",
      items: [
        {
          id: "mama-king",
          name: "Pizza Mama King",
          description:
            "Champignons de Paris cuits finement tranchés, jambon blanc aux herbes, mozza fior di latte, sauce tomates italiennes, olives taggiasche et basilic frais.",
          price: 14.9,
          image: panisPlat("ciccio/pizza-mama-king"),
        },
        {
          id: "margherita",
          name: "Pizza Margherita",
          description:
            "Mozza fior di latte, sauce de tomates italiennes en direct de notre producteur fiammante, gran formaggio râpé et basilic frais.",
          price: 11.9,
          image: panisPlat("ciccio/pizza-margherita"),
        },
        {
          id: "puissance-4",
          name: "Pizza Puissance 4",
          description:
            "Crème fraîche, gorgonzola, gran formaggio râpé, mozza fior di latte et ciboulette. Du cheesy comme on aime.",
          price: 14.9,
          image: panisPlat("ciccio/pizza-puissance-4"),
        },
        {
          id: "stracciatella-versace",
          name: "Pizza Stracciatella Versace",
          description:
            "Jambon de Parme, stracciatella fumée bien crémeuse, pecorino romano râpé, roquette fraîche et sauce tomates italiennes en direct de notre producteur fiammante.",
          price: 19.9,
          image: panisPlat("ciccio/pizza-stracciatella-versace"),
        },
        {
          id: "capo",
          name: "Pizza Capo",
          description:
            "Fines tranches de salame piccante, salsa nduja xxxtra hot, mozza fior di latte, sauce tomates italiennes en direct de notre producteur fiammante et marjolaine fraîche.",
          price: 15.9,
          image: panisPlat("ciccio/pizza-capo"),
        },
        {
          id: "green-circle",
          name: "Pizza Green Circle",
          description:
            "Mozza fior di latte, sauce de tomates italiennes en direct de notre producteur fiammante, gran formaggio râpé, aubergines frites et basilic frais.",
          price: 14.9,
          image: panisPlat("ciccio/pizza-green-circle"),
        },
        {
          id: "truffle-supreme",
          name: "Pizza Truffle Suprême",
          description:
            "Crème de truffe d'été à la ricotta, mozza fior di latte, petits champignons de Paris, beaux copeaux de truffe fraîche d'automne, gran formaggio râpé et ciboulette.",
          price: 20.9,
          image: panisPlat("ciccio/pizza-truffle-supreme"),
        },
        {
          id: "amor-amatriciana",
          name: "Pizza Amor Amatriciana",
          description:
            "Pancetta «\u00a0Poitrine de porc\u00a0» et sauce de tomates italiennes pour une extra dose de saveurs, mozza fior di latte, pecorino et basilic frais.",
          price: 15.9,
          image: panisPlat("ciccio/pizza-amor-amatriciana"),
        },
      ],
    },
    {
      id: "pastas",
      name: "Pastas",
      items: [
        {
          id: "carbonara-originale",
          name: "Pasta Carbonara Originale",
          description: "Pasta rigatoni à la sauce carbonara, guanciale de cochon et pecorino.",
          price: 13.9,
          image: panisPlat("ciccio/pasta-carbonara"),
        },
        {
          id: "alla-bolognese",
          name: "Pasta Alla Bolognese",
          description: "Pasta rigatoni au ragù de bœuf, gran formaggio italiano et feuilles de basilic.",
          price: 14.9,
          image: panisPlat("ciccio/pasta-bolognese"),
        },
        {
          id: "all-amatriciana",
          name: "Pasta All'Amatriciana",
          description: "Pasta rigatoni à la sauce de tomates italiennes, pancetta de cochon et pecorino.",
          price: 14.9,
          image: panisPlat("ciccio/pasta-amatriciana"),
        },
        {
          id: "vivi-e-vechio",
          name: "Pasta Vivi E Vechio",
          description: "Pasta rigatoni à la sauce de tomates italiennes, stracciatella fumée et feuilles de basilic.",
          price: 12.9,
          image: panisPlat("ciccio/pasta-vivi-e-vechio"),
        },
        {
          id: "con-il-pesto",
          name: "Pasta Con Il Pesto",
          description:
            "Pasta casareccia au pesto de basilic frais, gran formaggio italiano, petites noisettes et feuilles de basilic.",
          price: 12.9,
          image: panisPlat("ciccio/pasta-pesto"),
        },
        {
          id: "al-tartufo",
          name: "Pasta Al Tartufo",
          description:
            "Pasta mafaldine à la crème de gorgonzola, jambon truffé, éclat de noisettes, copeaux de parmesan, huile truffée.",
          price: 18.9,
          image: panisPlat("ciccio/pasta-tartufo"),
        },
      ],
    },
    {
      id: "dwich",
      name: "Les Dwich du Panis",
      items: [
        {
          id: "dwich-du-gang",
          name: "Les Dwich du Gang",
          description: "Le dwich jambon pâte à pizza bien fluffy, jambon blanc et mozza fior di latte xxtra fondante.",
          price: 6.9,
          image: panisPlat("ciccio/dwich-du-gang"),
        },
        {
          id: "dwich-regina",
          name: "Le Dwich Regina",
          description:
            "Pâte à pizza bien fluffy, sauce de tomates italiennes en direct de notre producteur fiammante, mozza fior di latte, jambon blanc, champignons de Paris cuits et olives taggiasche.",
          price: 7.9,
          image: panisPlat("ciccio/dwich-regina"),
        },
        {
          id: "dwich-truffe",
          name: "Le Dwich Truffe",
          description:
            "Pâte à pizza bien fluffy, crème de ricotta à la truffe d'été, mozza fior di latte et champignons de Paris cuits.",
          price: 8.9,
          image: panisPlat("ciccio/dwich-truffe"),
        },
      ],
    },
    {
      id: "desserts",
      name: "Desserts",
      items: [
        {
          id: "il-tiramisu",
          name: "Il Tiramisù",
          description:
            "Le grand classique de la casa bien onctueux et une petite pointe de liqueur de marsala, c'est que du love.",
          price: 6.9,
          image: panisPlat("ciccio/tiramisu"),
        },
        {
          id: "mousse-big-love",
          name: "Mousse Big-love",
          description: "Inimitable mousse au bon chocolat, praliné noisette et crunchy gaufrette au chocolat au lait.",
          price: 6.9,
          image: panisPlat("ciccio/mousse-big-love"),
        },
        {
          id: "deurty-cookie",
          name: "Deurty Cookie",
          description:
            "Décadent cookie choco-praliné mi-cuit, noix de pécan, big pépites de chocolat et pour l'overdose de love, cœur fondant ultra coulant à la gianduja.",
          price: 5.9,
          image: panisPlat("ciccio/deurty-cookie"),
        },
      ],
    },
    {
      id: "boissons",
      name: "Boissons",
      boissons: true,
      items: [
        { id: "cafe-illy", name: "Café Illy", price: 2, chaud: true },
        { id: "coca-cola", name: "Coca-Cola", price: 2.9, detail: "33 cl" },
        { id: "coca-cola-zero", name: "Coca-Cola Zéro", price: 2.9, detail: "33 cl" },
        { id: "fuzetea-peche", name: "Fuzetea Pêche", price: 2.9 },
      ],
    },
  ],
};

/*
 * Boulangerie Cyprien (Toulouse, Saint-Cyprien) — client Ominin d'octobre 2026 :
 * son site refait (app/sites/boulangerie-cyprien) et son click & collect. Les
 * noms et descriptions viennent de leur site et de la presse ; leur site ne
 * publie aucun prix : tous ceux-ci, les tailles des gâteaux et leur délai de
 * commande sont à valider par la boutique (demos/boulangerie-cyprien/profile.json).
 */
const CYPRIEN_PHOTOS = "/sites/boulangerie-cyprien/produits";
const cyprienTaille = groupeChoix(
  "taille",
  "Taille",
  [
    ["4 parts", 0],
    ["6 parts", 10],
    ["8 parts", 20],
  ],
  { obligatoire: true }
);
const CYPRIEN_JOURS = [
  ["07:30", "14:00"],
  ["16:00", "20:00"],
] as [string, string][];

const boulangerieCyprien: Restaurant = {
  slug: "boulangerie-cyprien",
  name: "Boulangerie Cyprien",
  tagline: "Boulangerie · Pâtisserie · 100 % artisanale",
  address: "55 rue de la République, 31300 Toulouse",
  phone: "05 34 51 06 60",
  hours:
    "Mar.\u00a0–\u00a0sam. 7h30–14h, 16h–20h · Dim. 7h45–14h · Fermé\u00a0le\u00a0lundi",
  collect: {
    openingHours: {
      "2": CYPRIEN_JOURS,
      "3": CYPRIEN_JOURS,
      "4": CYPRIEN_JOURS,
      "5": CYPRIEN_JOURS,
      "6": CYPRIEN_JOURS,
      "7": [["07:45", "14:00"]],
    },
  },
  googleReviewUrl:
    "https://search.google.com/local/writereview?placeid=ChIJq6oeQnC7rhIRqOhx38rvDn0",
  placeId: "ChIJq6oeQnC7rhIRqOhx38rvDn0",
  categories: [
    {
      id: "gateaux",
      name: "Gâteaux à partager",
      tagline: "Sur commande, 48 h à l'avance.",
      items: [
        {
          id: "tarte-framboise-basilic-partager",
          name: "Tarte framboise-basilic à partager",
          price: 24,
          vatRate: 5.5,
          image: unsplash("photo-1710077801357-96fce895714a"),
          noticeHours: 48,
          options: [cyprienTaille],
        },
        {
          id: "millefeuille-caramel-partager",
          name: "Millefeuille caramel à partager",
          price: 24,
          vatRate: 5.5,
          image: pexels("14996850/pexels-photo-14996850.jpeg"),
          noticeHours: 48,
          options: [cyprienTaille],
        },
        {
          id: "baba-partager",
          name: "Baba au rhum revisité à partager",
          price: 24,
          vatRate: 5.5,
          image: pexels("38947733/pexels-photo-38947733.jpeg"),
          noticeHours: 48,
          options: [cyprienTaille],
        },
        {
          id: "paris-brest-partager",
          name: "Paris-Brest à partager",
          price: 24,
          vatRate: 5.5,
          noticeHours: 48,
          options: [cyprienTaille],
        },
      ],
    },
    {
      id: "patisseries",
      name: "Pâtisseries",
      tagline: "La gamme évolue au fil des saisons.",
      items: [
        {
          id: "paris-brest",
          name: "Paris-Brest",
          price: 5.2,
          vatRate: 5.5,
          image: unsplash("photo-1761637604739-790197a32073"),
        },
        {
          id: "eclair-tout-chocolat",
          name: "Éclair tout chocolat",
          price: 4.6,
          vatRate: 5.5,
          image: `${CYPRIEN_PHOTOS}/eclair-tout-chocolat.jpg`,
        },
        {
          id: "millefeuille-caramel",
          name: "Millefeuille caramel",
          price: 5.2,
          vatRate: 5.5,
          image: pexels("13177923/pexels-photo-13177923.jpeg"),
        },
        {
          id: "tarte-framboise-basilic",
          name: "Tarte framboise-basilic",
          price: 5.4,
          vatRate: 5.5,
        },
        {
          id: "baba",
          name: "Baba au rhum revisité",
          price: 5.2,
          vatRate: 5.5,
          image: pexels("32134460/pexels-photo-32134460.jpeg"),
        },
        {
          id: "chou-praline-pecan",
          name: "Chou praliné-pécan",
          price: 4.8,
          vatRate: 5.5,
          image: pexels("27067952/pexels-photo-27067952.jpeg"),
        },
        {
          id: "flan",
          name: "Flan",
          detail: "la part",
          price: 3.4,
          vatRate: 5.5,
          image: pexels("37389053/pexels-photo-37389053.jpeg"),
        },
      ],
    },
    {
      id: "viennoiseries",
      name: "Viennoiseries",
      tagline: "Beurre AOP Charentes-Poitou, cuites en continu toute la journée.",
      items: [
        {
          id: "croissant",
          name: "Croissant",
          description: "Au beurre AOP Charentes-Poitou.",
          price: 1.4,
          vatRate: 5.5,
          image: `${CYPRIEN_PHOTOS}/croissant.jpg`,
        },
        {
          id: "chocolatine",
          name: "Chocolatine",
          description: "Trois barres de chocolat au lieu de deux.",
          price: 1.6,
          vatRate: 5.5,
          image: `${CYPRIEN_PHOTOS}/chocolatine.jpg`,
        },
        {
          id: "chausson-pommes",
          name: "Chausson aux pommes",
          price: 2.6,
          vatRate: 5.5,
          image: pexels("19803511/pexels-photo-19803511.jpeg"),
        },
      ],
    },
    {
      id: "pains",
      name: "Pains",
      tagline: "Farines du Moulin Calvet, en Aveyron ; levain naturel bio pour l'essentiel.",
      items: [
        {
          id: "pain-des-copains",
          name: "Pain des Copains",
          description:
            "Farine semi-complète de blé bio, levain 100 % naturel. Noté 9/10 par le jury de « La Meilleure Boulangerie de France » sur M6, en 2018.",
          price: 5.2,
          vatRate: 5.5,
          image: `${CYPRIEN_PHOTOS}/pain-levain.jpg`,
        },
        {
          id: "pain-cyprien",
          name: "Pain Cyprien",
          description: "Farine bio certifiée.",
          price: 4.9,
          vatRate: 5.5,
          image: pexels("30890572/pexels-photo-30890572.jpeg"),
        },
        {
          id: "tourte-grand-epeautre",
          name: "Tourte aux blés anciens",
          description: "Grand épeautre, farine bio certifiée.",
          price: 6.2,
          vatRate: 5.5,
          image: unsplash("photo-1586444248902-2f64eddc13df"),
        },
        {
          id: "pain-complet",
          name: "Pain complet",
          description: "Farine bio certifiée.",
          price: 4.2,
          vatRate: 5.5,
          image: pexels("11513152/pexels-photo-11513152.jpeg"),
        },
        {
          id: "baguette-tradition",
          name: "Baguette de tradition",
          price: 1.4,
          vatRate: 5.5,
          image: pexels("30846570/pexels-photo-30846570.jpeg"),
        },
        {
          id: "baguette-graines",
          name: "Baguette tradition aux graines",
          description: "Graines torréfiées par nos soins.",
          price: 1.7,
          vatRate: 5.5,
          image: pexels("4451380/pexels-photo-4451380.jpeg"),
        },
        {
          id: "baguette-charbon",
          name: "Baguette au charbon végétal",
          description: "Au charbon végétal actif.",
          price: 1.9,
          vatRate: 5.5,
        },
        {
          id: "pain-de-mie",
          name: "Pain de mie boulanger",
          price: 4.8,
          vatRate: 5.5,
          image: pexels("7568494/pexels-photo-7568494.jpeg"),
        },
        { id: "pain-viennois", name: "Pain viennois", price: 1.9, vatRate: 5.5 },
      ],
    },
  ],
};

/*
 * Brasserie Laissac — 9 place Alexandre Laissac, la quatrième adresse du
 * groupe du Café des Arts, reprise à l'été 2026 et rouverte le 4 septembre.
 * Aucune carte publiée : celle du panneau extérieur « 1 — BRASSERIE
 * LAISSAC », lue image par image dans le reel de réouverture (Facebook,
 * 4 septembre 2026), les formules des ardoises du comptoir (reel du
 * 21 septembre) et les prix du visuel happy hour (9 septembre). Les lignes
 * illisibles du panneau sont des questions au gérant, pas des lectures :
 * demos/brasserie-laissac/profile.json, sources dans docs/.
 */
/**
 * Photos libres (Pexels, Unsplash), auditées : aucune photo de leurs plats
 * n'est en ligne. Recadrées par le serveur quand le sujet n'est pas au centre.
 */
const LAISSAC_PHOTOS: Partial<Record<string, string>> = {
  "planche-mixte": unsplash("photo-1695606392727-d8b959879721", 800),
  "planche-charcuterie": pexels("1927383/pexels-photo-1927383.jpeg", 800),
  "planche-fromages": pexels("28575893/pexels-photo-28575893.jpeg", 800),
  nuggets: pexels("39853099/pexels-photo-39853099.jpeg", 800),
  "frites-maison": pexels("13187600/pexels-photo-13187600.jpeg", 800),
  "frites-patate-douce": pexels("1893555/pexels-photo-1893555.jpeg", 800),
  "sticks-mozzarella": unsplash("photo-1734774924912-dcbb467f8599", 800),
  wings: pexels("7169620/pexels-photo-7169620.jpeg", 800),
  burrata: unsplash("photo-1751451985575-c8c15d25694c", 800),
  bruschetta: pexels("19029774/pexels-photo-19029774.jpeg", 800),
  "cheese-burger": pexelsRecadre("19247557/pexels-photo-19247557.jpeg", 800),
  "original-burger": pexels("30500761/pexels-photo-30500761.jpeg", 800),
  savoyard: pexels("36554035/pexels-photo-36554035.jpeg", 800),
  chicken: pexels("34407494/pexels-photo-34407494.jpeg", 800),
  "chicken-avocado": pexels("20404825/pexels-photo-20404825.jpeg", 800),
  "california-beef": pexels("35723478/pexels-photo-35723478.jpeg", 800),
  "fish-burger": pexelsRecadre("39042551/pexels-photo-39042551.jpeg", 800),
  // Recadrée : au bureau, la fiche presque carrée montrait la bouteille de soda du fond.
  "chicken-beef": pexelsRecadre("15476362/pexels-photo-15476362.jpeg", 800),
  "salade-caesar": pexels("7462816/pexels-photo-7462816.jpeg", 800),
  "salade-chevre-chaud": unsplash("photo-1585516458230-d89b3bbc73d9", 800),
  "salade-italienne": unsplash("photo-1724116380751-fbde57934e92", 800),
  margherita: pexels("35017347/pexels-photo-35017347.jpeg", 800),
  regina: pexels("28996257/pexels-photo-28996257.jpeg", 800),
  speziale: pexels("15264020/pexels-photo-15264020.jpeg", 800),
  "pizza-poulet": pexelsRecadre("11485225/pexels-photo-11485225.jpeg", 800),
  "quatre-fromaggi": pexels("33194921/pexels-photo-33194921.jpeg", 800),
  tiramisu: pexels("27126833/pexels-photo-27126833.jpeg", 800),
  cheesecake: pexels("13344198/pexels-photo-13344198.jpeg", 800),
  "tarte-tatin": pexels("10885311/pexels-photo-10885311.jpeg", 800),
  "tarte-citron": pexels("34712614/pexels-photo-34712614.jpeg", 800),
  moelleux: pexels("33674412/pexels-photo-33674412.jpeg", 800),
  "assiette-fromages": pexels("14658378/pexels-photo-14658378.jpeg", 800),
  gourmand: pexels("40156949/pexels-photo-40156949.jpeg", 800),
  "dame-blanche": pexelsRecadre("8585804/pexels-photo-8585804.jpeg", 800),
  "chocolat-liegeois": pexels("28162736/pexels-photo-28162736.jpeg", 800),
  "banana-split": pexels("4875225/pexels-photo-4875225.jpeg", 800),
  colonel: pexels("6164191/pexels-photo-6164191.jpeg", 800),
  "glace-3-boules": pexels("11989434/pexels-photo-11989434.jpeg", 800),
  "punch-sangria": pexels("29799870/pexels-photo-29799870.jpeg", 800),
  chardonnay: pexels("10403547/pexels-photo-10403547.jpeg", 800),
  "vin-moelleux": pexels("18363408/pexels-photo-18363408.jpeg", 800),
  spritz: pexelsRecadre("9119755/pexels-photo-9119755.jpeg", 800),
  "pinte-blonde": pexels("20769832/pexels-photo-20769832.jpeg", 800),
  mojito: pexels("7491891/pexels-photo-7491891.jpeg", 800),
  "sex-on-the-beach": pexels("28893433/pexels-photo-28893433.jpeg", 800),
  planteur: pexelsRecadre("37662778/pexels-photo-37662778.jpeg", 800),
  "virgin-colada": pexelsRecadre("33221989/pexels-photo-33221989.jpeg", 800),
};

const LAISSAC_SUPPLEMENTS_BURGER = [
  groupeChoix("supplements", "Suppléments", ["Cheddar", "Bacon", "Miel", "Fromage de chèvre", "Avocat", "Œuf"], {
    multiple: true,
    supplement: 2,
  }),
  groupeChoix(
    "supplements-extra",
    "Suppléments extra",
    ["Steak haché de Bœuf", "Filet de Poulet pané", "Reblochon", "Rösti de pomme de terre"],
    { multiple: true, supplement: 5 }
  ),
];

// La fin de la liste du « Supplément pizza » est illisible sur le panneau : seules ses lectures sûres.
const LAISSAC_SUPPLEMENTS_PIZZA = groupeChoix(
  "supplements",
  "Suppléments",
  ["Jambon", "Champignons", "Œuf", "Poulet", "Oignons", "Fromage de chèvre", "Mozzarella", ["Mozzarella «\u00a0burrata\u00a0»", 4]],
  { multiple: true, supplement: 2 }
);

/** L'accroche des deux sections de pizzas : les suppléments ci-dessus. */
const LAISSAC_ACCROCHE_PIZZAS = "Suppléments\u00a0: 2\u00a0€, burrata\u00a04\u00a0€";
/** Le visuel happy hour : « 17H - 23H ». */
const LAISSAC_HAPPY_HOUR = "de 17h à 23h";

const LAISSAC_PARFUMS_GLACE = ["Café", "Chocolat", "Vanille", "Fraise", "Citron"];
const LAISSAC_CHANTILLY = groupeChoix("chantilly", "Supplément", ["Chantilly"], { multiple: true, supplement: 1.5 });
const LAISSAC_RANGS_BOULE = ["1re boule", "2e boule", "3e boule"];

/** Un article de la carte, avec sa photo s'il en a une. */
const laissacArticle = (id: string, name: string, price: number, extra: Partial<MenuItem> = {}): MenuItem => ({
  id,
  name,
  price,
  image: LAISSAC_PHOTOS[id],
  ...extra,
});

/** Les burgers et les pizzas : chaque famille a ses suppléments. */
const laissacPlat =
  (options: OptionGroup[]) =>
  (id: string, name: string, description: string, price: number, extra: Partial<MenuItem> = {}) =>
    laissacArticle(id, name, price, { description, options, ...extra });
const laissacBurger = laissacPlat(LAISSAC_SUPPLEMENTS_BURGER);
const laissacPizza = laissacPlat([LAISSAC_SUPPLEMENTS_PIZZA]);

/** Une boisson alcoolisée : TVA à 20 %. */
const laissacAlcool = (id: string, name: string, price: number, extra: Partial<MenuItem> = {}) =>
  laissacArticle(id, name, price, { ...ALCOOL, ...extra });

/** Une glace à composer : un parfum par boule, la chantilly en supplément. */
const laissacGlace = (boules: number, price: number) => {
  const pluriel = boules > 1 ? "s" : "";
  return laissacArticle(`glace-${boules}-boule${pluriel}`, `Glace ${boules} boule${pluriel}`, price, {
    options: [
      ...LAISSAC_RANGS_BOULE.slice(0, boules).map((rang, i) =>
        groupeChoix(`boule-${i + 1}`, boules > 1 ? rang : "Parfum", LAISSAC_PARFUMS_GLACE, { obligatoire: true })
      ),
      LAISSAC_CHANTILLY,
    ],
  });
};

const brasserieLaissac: Restaurant = {
  slug: "brasserie-laissac",
  name: "Brasserie Laissac",
  suivi: true,
  // La bio Instagram de la nouvelle équipe : « Restaurant, bar, cocktail, happy hour ».
  tagline: "Restaurant · Bar · Cocktail",
  // La gravure de l'écusson (la brasserie, sa cheminée, le cyprès), détourée du
  // visuel happy hour : l'écusson entier n'existe en ligne qu'en 150 px.
  logo: "/brasserie-laissac/gravure.webp",
  icons: { tab: "/brasserie-laissac/favicon.png", homeScreen: "/brasserie-laissac/icon.png" },
  themeColor: "#0b0a09",
  address: "9 Place Alexandre Laissac, 34000 Montpellier",
  phone: "+33 4 67 57 72 10",
  hours: "Tous\u00a0les\u00a0jours 9h–\u20601h",
  placeId: "ChIJVVXRGqavthIRizXRq7pQJtw",
  // L'ardoise « Service NON STOP 11h30-00h00 » et le visuel « Happy Hour 17H - 23H ».
  highlights: ["Service non stop de 11h30 à minuit", `Happy hour ${LAISSAC_HAPPY_HOUR}`],
  ticker: [
    // L'encart du panneau-carte ; le burger lui-même n'y est ni nommé ni chiffré.
    { text: "Découvrez le burger du moment\u00a0!", tone: "brand" },
    // La page de la brasserie sur le site du groupe.
    { text: "Girafes de bière et de cocktails de 3 à 5\u00a0L pour les groupes" },
    // La bio Instagram : « 1 salle, climatisé ».
    { text: "Salle climatisée" },
  ],
  pairings: brasserieLaissacAccords,
  loyaltyWheel: roueDuJour,
  // Les paliers de Caffè Panis (1 € = 1 point), sur la carte de la brasserie.
  demoLoyalty: {
    pointsPerEuro: 1,
    rewards: [
      {
        id: "pinte-virgin",
        label: "1 pinte ou 1 virgin offert",
        points: 50,
        items: ["pinte-blonde", "pinte-monaco", "virgin-mojito", "virgin-colada"],
      },
      {
        id: "dessert",
        label: "1 dessert offert",
        points: 100,
        items: [
          "tiramisu",
          "tarte-tatin",
          "tarte-citron",
          "moelleux",
          "dame-blanche",
          "cafe-liegeois",
          "chocolat-liegeois",
        ],
      },
      {
        id: "planche",
        label: "1 planche offerte",
        points: 150,
        items: ["planche-charcuterie", "planche-fromages"],
      },
      {
        id: "pizza-burger",
        label: "1 pizza ou burger offert(e)",
        points: 250,
        items: [
          "cheese-burger",
          "original-burger",
          "burger-chevre-miel",
          "rosti-burger",
          "savoyard",
          "vegetarien",
          "chicken",
          "chicken-avocado",
          "california-beef",
          "fish-burger",
          "chicken-beef",
          "margherita",
          "regina",
          "pizza-chevre-miel",
          "speziale",
          "vegetarienne",
          "pizza-poulet",
          "pizza-saumon",
          "quatre-fromaggi",
        ],
      },
    ],
    member: {
      contact: "0612345678",
      firstName: "Hugo",
      history: [
        { kind: "gain", points: 9, table: 5, rewards: null, daysAgo: 1 },
        { kind: "roue", points: 5, table: null, rewards: null, daysAgo: 1 },
        { kind: "gain", points: 6, table: 2, rewards: null, daysAgo: 2 },
        { kind: "roue", points: 10, table: null, rewards: null, daysAgo: 2 },
        { kind: "gain", points: 18, table: 8, rewards: null, daysAgo: 6 },
        { kind: "roue", points: 15, table: null, rewards: null, daysAgo: 6 },
        { kind: "gain", points: 24, table: 3, rewards: null, daysAgo: 13 },
      ],
    },
  },
  categories: [
    {
      // L'ardoise du comptoir : « Formule midi à ne pas rater ». Les plats du
      // jour changent chaque jour (reels Instagram) ; le ① et le ② ne sont
      // pas nommés.
      id: "formule-midi",
      name: "Formule midi",
      tagline: "À ne pas rater",
      items: [
        // Le ticket de cuisine est en cp1252, sans ① ni ② : « 1 », « 2 » sous l'en-tête « FORMULE MIDI ».
        laissacArticle("plat-1-dessert", "Plat ① + dessert", 15.9, { printName: "Plat 1 + dessert" }),
        laissacArticle("plat-2-dessert", "Plat ② + dessert", 17.9, { printName: "Plat 2 + dessert" }),
      ],
    },
    {
      id: "tapas",
      name: "Les tapas",
      items: [
        laissacArticle("planche-mixte", "Planche mixte", 18, { description: "fromage et charcuterie" }),
        laissacArticle("planche-charcuterie", "Planche de charcuterie", 10),
        laissacArticle("planche-fromages", "Planche de fromages", 10),
        laissacArticle("fish-and-chips", "Fish & Chips", 8, { description: "sauce tartare" }),
        laissacArticle("camembert-roti", "Camembert rôti", 11, { description: "figues et noix" }),
        laissacArticle("nuggets", "Nuggets de poulet", 6),
        laissacArticle("frites-maison", "Panier de frites maison", 5),
        laissacArticle("frites-patate-douce", "Frites de patates douces", 6.5),
        laissacArticle("sticks-mozzarella", "Sticks mozzarella", 6.5),
        laissacArticle("wings", "Wings de poulet", 7.5),
        laissacArticle("burrata", "Mozzarella «\u00a0Burrata\u00a0», tomates & jambon Serrano", 10, {
          printName: "Burrata, tomates & Serrano",
        }),
        laissacArticle("bruschetta", "Bruschetta au choix", 8, {
          description: "poulet, chèvre-miel, norvégienne",
          options: [
            groupeChoix("garniture", "Garniture", ["Poulet", "Chèvre-miel", "Norvégienne"], { obligatoire: true }),
          ],
        }),
      ],
    },
    {
      id: "burgers",
      name: "Les burgers",
      tagline: "Servis avec frites maison",
      items: [
        laissacBurger("cheese-burger", "Cheese Burger", "steak haché de Bœuf, cheddar, oignons confits", 7),
        laissacBurger(
          "original-burger",
          "Original Burger Laissac",
          "steak haché de Bœuf, cheddar, salade, tomate, oignons confits",
          9.5
        ),
        // « Chèvre miel » sur le panneau, comme la pizza : le ticket regroupe
        // les lignes par nom et en faisait « 2 × Chèvre miel ».
        laissacBurger(
          "burger-chevre-miel",
          "Burger Chèvre miel",
          "steak haché de Bœuf, cheddar, salade, tomate, oignons confits, fromage de chèvre, miel",
          11.5
        ),
        laissacBurger(
          "rosti-burger",
          "Rösti Burger",
          "steak haché de Bœuf, cheddar, salade, tomate, oignons confits, rösti de pomme de terre",
          11.9
        ),
        laissacBurger(
          "savoyard",
          "Le Savoyard",
          "steak haché de Bœuf, cheddar, salade, tomate, oignons confits, reblochon",
          13.9
        ),
        laissacBurger(
          "vegetarien",
          "Le Végétarien",
          "rösti de pomme de terre, cheddar, salade, tomate, oignons confits, avocat",
          9.9
        ),
        laissacBurger("chicken", "Le Chicken", "filet de Poulet pané, cheddar, salade, tomate, oignons confits", 9.5),
        laissacBurger(
          "chicken-avocado",
          "Chicken Avocado",
          "filet de Poulet pané, cheddar, salade, tomate, oignons confits, avocat",
          10.9
        ),
        laissacBurger(
          "california-beef",
          "California Beef",
          "steak haché de Bœuf, cheddar, salade, tomate, oignons confits, avocat",
          11.5
        ),
        laissacBurger(
          "fish-burger",
          "Fish Burger",
          "filet de Poisson pané, cheddar, salade, tomate, oignons confits, sauce tartare",
          9.5
        ),
        laissacBurger(
          "chicken-beef",
          "Chicken Beef",
          "steak haché de Bœuf, filet de Poulet pané, cheddar, salade, tomate, oignons confits",
          13.9
        ),
      ],
    },
    {
      id: "salades",
      name: "Les salades repas",
      items: [
        laissacArticle("salade-caesar", "Salade Caesar", 11.9, {
          description: "salade, tomates, poulet, œuf dur, copeaux de parmesan, croûtons",
        }),
        laissacArticle("salade-chevre-chaud", "Salade de Chèvre chaud", 11.9, {
          description: "salade, tomates, toasts de chèvre chaud, jambon Serrano, croûtons",
        }),
        laissacArticle("salade-italienne", "Salade Italienne", 12.9, {
          description: "salade, tomates, mozzarella «\u00a0burrata\u00a0», jambon Serrano, croûtons",
        }),
      ],
    },
    {
      id: "pizzas-tomate",
      name: "Les pizzas base tomate",
      tagline: LAISSAC_ACCROCHE_PIZZAS,
      items: [
        laissacPizza("margherita", "Margherita", "tomate, emmental, mozzarella, tomates cerises, basilic", 8.5),
        laissacPizza("regina", "Regina", "tomate, emmental, mozzarella, jambon, champignons, basilic", 10.9),
        laissacPizza(
          "pizza-chevre-miel",
          "Chèvre miel",
          "tomate, emmental, mozzarella, fromage de chèvre, miel, herbes",
          10.9,
          { printName: "Pizza chèvre miel" }
        ),
        laissacPizza(
          "speziale",
          "Speziale",
          "tomate, emmental, mozzarella, jambon cru, mozzarella «\u00a0burrata\u00a0», roquette, copeaux de parmesan",
          13.9
        ),
        laissacPizza(
          "vegetarienne",
          "Végétarienne",
          "tomate, emmental, mozzarella, champignons, courgettes, oignons, poivrons",
          9.9
        ),
      ],
    },
    {
      id: "pizzas-creme",
      name: "Les pizzas base crème",
      tagline: LAISSAC_ACCROCHE_PIZZAS,
      items: [
        laissacPizza("pizza-poulet", "Poulet", "crème, emmental, mozzarella, poulet, oignon, poivron rouge", 10.9, {
          printName: "Pizza poulet",
        }),
        laissacPizza("pizza-saumon", "Saumon", "crème, emmental, mozzarella, saumon fumé, roquette", 12.9, {
          printName: "Pizza saumon",
        }),
        laissacPizza("quatre-fromaggi", "4 Fromaggi", "crème, emmental, mozzarella, roquefort, chèvre", 11.9),
      ],
    },
    {
      id: "desserts",
      name: "Les desserts",
      items: [
        laissacArticle("tiramisu", "Tiramisu au café", 6),
        laissacArticle("cheesecake", "Cheesecake fruits rouges ou caramel beurre salé", 6, {
          printName: "Cheesecake",
          options: [groupeChoix("nappage", "Nappage", ["Fruits rouges", "Caramel beurre salé"], { obligatoire: true })],
        }),
        laissacArticle("tarte-tatin", "Tarte tatin", 6),
        laissacArticle("tarte-citron", "Tarte au citron meringuée", 6),
        laissacArticle("moelleux", "Moelleux au chocolat & sa boule de glace vanille", 6, {
          printName: "Moelleux au chocolat",
        }),
        laissacArticle("assiette-fromages", "Assiette de fromages", 8),
        laissacArticle("gourmand", "Café ou thé gourmand et ses mignardises", 8, {
          printName: "Gourmand",
          options: [groupeChoix("boisson", "Boisson", ["Café", "Thé"], { obligatoire: true })],
        }),
      ],
    },
    {
      // Deux des trois coupes alcoolisées et le détail du Banana split et du
      // Colonel sont illisibles sur le panneau : questions au gérant.
      id: "glaces",
      name: "Les glaces",
      items: [
        laissacArticle("dame-blanche", "Dame blanche", 8.5, {
          description: "3 boules vanille, nappage chocolat, chantilly",
        }),
        laissacArticle("cafe-liegeois", "Café liégeois", 8.5, {
          description: "2 boules café, 1 boule vanille, chantilly",
        }),
        laissacArticle("chocolat-liegeois", "Chocolat liégeois", 8.5, {
          description: "2 boules chocolat, 1 boule vanille, nappage chocolat, chantilly",
        }),
        laissacArticle("banana-split", "Banana split", 8.5),
        laissacArticle("colonel", "Colonel", 9.5, { description: "coupe de glace alcoolisée", ...ALCOOL }),
        laissacGlace(1, 2.5),
        laissacGlace(2, 4.5),
        laissacGlace(3, 6.5),
      ],
    },
    {
      // Les ardoises du comptoir ; ce que chaque formule comprend n'y est pas écrit.
      id: "petit-dejeuner-gouter",
      name: "Petit déjeuner & goûter",
      items: [
        laissacArticle("formule-petit-dejeuner", "Formule petit déjeuner", 6.5),
        laissacArticle("formule-breakfast", "Formule breakfast", 9.9),
        laissacArticle("formule-gouter", "Formule goûter", 6),
      ],
    },
    {
      // Le visuel happy hour, à la nouvelle identité : ses prix sont les seuls
      // publiés pour ces boissons, la carte des boissons n'est pas en ligne.
      id: "happy-hour",
      name: "Happy hour",
      tagline: `Tous les jours ${LAISSAC_HAPPY_HOUR}`,
      boissons: true,
      items: [
        laissacAlcool("punch-sangria", "Verre Punch / Sangria maison", 3, {
          options: [groupeChoix("boisson", "Boisson", ["Punch", "Sangria"], { obligatoire: true })],
        }),
        laissacAlcool("chardonnay", "Verre Chardonnay", 3),
        laissacAlcool("vin-moelleux", "Verre Vin moelleux", 3.5),
        laissacAlcool("spritz", "Apérol Spritz", 6),
        laissacAlcool("pinte-blonde", "Pinte Blonde", 4),
        laissacAlcool("pinte-monaco", "Pinte Monaco", 4.2),
        laissacAlcool("mojito", "Mojito", 5.5),
        laissacAlcool("sex-on-the-beach", "Sex on the Beach", 5.5),
        laissacAlcool("planteur", "Planteur", 5.5),
        laissacAlcool("jager-bomb", "Jager bomb", 5.5),
        laissacArticle("virgin-mojito", "Virgin Mojito", 5),
        laissacArticle("virgin-colada", "Virgin Colada", 5),
      ],
    },
  ],
};

/*
 * L'Étoile — club fictif, vitrine d'Ominin pour les clubs haut de gamme : ni
 * adresse ni téléphone, aucun établissement réel derrière. Sa page est sur
 * mesure : app/menu/demo/club, qui regroupe ces catégories en quatre
 * chapitres (components/menu/etoile). Les shooters « x10 » sont des lignes à
 * part : un toucher, pas de feuille d'options, au club.
 */
const etoileBouteille = (id: string, name: string, detail: string, price: number): MenuItem => ({
  id,
  name,
  detail,
  price,
  ...ALCOOL,
});

const etoileSoft = (id: string, name: string, detail: string, price: number): MenuItem => ({
  id,
  name,
  detail,
  price,
});

const lEtoile: Restaurant = {
  slug: "l-etoile",
  name: "L'Étoile",
  tagline: "Club & Rooftop",
  address: "",
  phone: "",
  hours: "",
  themeColor: "#050507",
  suivi: true,
  categories: [
    {
      id: "rhums",
      name: "Rhums",
      boissons: true,
      items: [etoileBouteille("zacapa", "Zacapa", "70 cl", 160)],
    },
    {
      id: "tequilas",
      name: "Tequilas",
      boissons: true,
      items: [
        etoileBouteille("class-azul-reposado", "Class Azul Reposado", "70 cl", 350),
        etoileBouteille("don-julio-1942", "Don Julio 1942", "70 cl", 350),
        etoileBouteille("don-julio-reposado", "Don Julio Reposado", "70 cl", 160),
        etoileBouteille("don-julio-blanco", "Don Julio Blanco", "70 cl", 150),
      ],
    },
    {
      id: "whiskys",
      name: "Whiskys",
      boissons: true,
      items: [
        etoileBouteille("black-label", "Black Label", "70 cl", 150),
        etoileBouteille("jack-daniels", "Jack Daniel's", "70 cl", 150),
        etoileBouteille("magnum-jack-daniels", "Magnum Jack Daniel's", "175 cl", 300),
        etoileBouteille("jack-daniels-honey", "Jack Daniel's Honey", "70 cl", 150),
        etoileBouteille("jack-daniels-rey", "Jack Daniel's Rey", "70 cl", 150),
        etoileBouteille("jack-daniels-apple", "Jack Daniel's Apple", "70 cl", 150),
      ],
    },
    {
      id: "vodkas",
      name: "Vodkas",
      boissons: true,
      items: [
        etoileBouteille("ciroc", "Ciroc", "70 cl", 150),
        etoileBouteille("magnum-ciroc", "Magnum Ciroc", "175 cl", 300),
        etoileBouteille("ciroc-aromatisee", "Ciroc Aromatisée", "70 cl", 150),
        etoileBouteille("belvedere", "Belvedere", "70 cl", 160),
        etoileBouteille("belvedere-lumineuse", "Belvedere Lumineuse", "70 cl", 170),
        etoileBouteille("belvedere-chrome", "Belvedere Chrome", "70 cl", 180),
      ],
    },
    {
      id: "gins",
      name: "Gins",
      boissons: true,
      items: [etoileBouteille("tanqueray-ten", "Tanqueray Ten", "70 cl", 130)],
    },
    {
      id: "cognacs",
      name: "Cognacs",
      boissons: true,
      items: [
        etoileBouteille("hennessy-fine-75", "Hennessy Fine", "75 cl", 160),
        etoileBouteille("hennessy-fine-150", "Hennessy Fine", "150 cl", 350),
      ],
    },
    {
      id: "sodas",
      name: "Sodas",
      boissons: true,
      items: [
        etoileSoft("fuzetea", "Fuzetea", "33 cl", 6),
        etoileSoft("coca-cola", "Coca-Cola", "33 cl", 6),
        etoileSoft("coca-cola-zero", "Coca-Cola Zéro", "33 cl", 6),
        etoileSoft("hexis-energy-25", "Hexis Energy", "25 cl", 6),
        etoileSoft("hexis-energy-pack", "Hexis Energy Pack", "x5", 25),
        etoileSoft("hexis-energy-100", "Hexis Energy", "100 cl", 15),
      ],
    },
    {
      id: "eau",
      name: "Eau",
      boissons: true,
      items: [etoileSoft("cristaline", "Cristaline", "50 cl", 4)],
    },
    {
      id: "shooters",
      name: "Shooters",
      boissons: true,
      items: [
        etoileBouteille("shooter", "Shooter", "2 cl", 4),
        etoileBouteille("shooter-x10", "Shooter", "Lot de 10 · 2 cl", 30),
        etoileBouteille("shooter-superieur", "Shooter Supérieur", "2 cl", 6),
        etoileBouteille("shooter-superieur-x10", "Shooter Supérieur", "Lot de 10 · 2 cl", 50),
        etoileBouteille("shooter-superieur-tequila", "Shooter Supérieur Tequila", "2 cl", 8),
      ],
    },
    {
      id: "champagnes",
      name: "Champagnes",
      boissons: true,
      items: [
        etoileBouteille("moet-brut", "Moët Brut", "75 cl", 150),
        etoileBouteille("magnum-moet-brut", "Magnum Moët Brut", "150 cl", 300),
        etoileBouteille("moet-ice", "Moët Ice", "75 cl", 150),
        etoileBouteille("moet-rose", "Moët Rosé", "75 cl", 160),
        etoileBouteille("ruinart-blanc-de-blancs", "Ruinart Blanc de Blancs", "75 cl", 300),
        etoileBouteille("dom-perignon-lumineuse", "Dom Pérignon Lumineuse", "75 cl", 400),
        etoileBouteille("armand-de-brignac-gold", "Armand De Brignac Gold", "75 cl", 450),
      ],
    },
  ],
};

/*
 * Café Poulard — comptoir méditerranéen, 27 rue du Faubourg du Courreau
 * (Montpellier), repris des Frères Poulards en février 2026 : click &
 * collect seul, pas de carte QR. Aucune carte imprimée remise et aucun prix
 * en ligne hors le café : les articles sont ceux qu'ils nomment sur leur
 * Instagram (@cafe_poulard) et dans les avis récents, les prix des
 * emplacements à valider avec eux (demos/cafe-poulard/profile.json). Photos :
 * les leurs (Instagram, fiche Google), sinon de banque, marquées au profil.
 */
const POULARD_PHOTOS = "/cafe-poulard";
const POULARD_JOURS = [
  ["08:00", "14:30"],
  ["19:30", "22:30"],
] as [string, string][];
const POULARD_HORAIRES: OpeningHours = {
  "1": [["08:00", "14:30"]],
  "2": POULARD_JOURS,
  "3": POULARD_JOURS,
  "4": POULARD_JOURS,
  "5": POULARD_JOURS,
  "6": POULARD_JOURS,
  "7": POULARD_JOURS,
};
const poulardViennoiserie = groupeChoix("viennoiserie", "Viennoiserie", ["Croissant", "Pain au chocolat"], {
  obligatoire: true,
});

const cafePoulard: Restaurant = {
  slug: "cafe-poulard",
  name: "Café Poulard",
  tagline: "Comptoir méditerranéen",
  coverImage: `${POULARD_PHOTOS}/salle.jpg`,
  themeColor: "#f6efe2",
  address: "27 Rue du Faubourg du Courreau, 34000 Montpellier",
  phone: "04 67 58 55 74",
  // Les horaires de retrait, ceux de la carte « À emporter » : une seule annonce.
  hours: describeOpeningHours(POULARD_HORAIRES),
  highlights: ["Cuisine traditionnelle", "Produits frais de saison", "Comme à la maison"],
  placeId: "ChIJU_sWg6mvthIR1dtA2qr3Q5I",
  collect: { openingHours: POULARD_HORAIRES },
  formules: [
    {
      id: "formule-petit-dejeuner",
      name: "Formule petit-déjeuner",
      description: "Boisson chaude, jus de fruits pressé, viennoiserie",
      price: 6,
      disponible: true,
      etapes: [
        {
          id: "boisson-chaude",
          name: "Boisson chaude",
          obligatoire: true,
          articles: [
            { id: "cafe", name: "Café", supplement: 0, itemId: "cafe" },
            { id: "chocolat", name: "Chocolat", supplement: 0, itemId: "chocolat" },
          ],
        },
        {
          id: "viennoiserie",
          name: "Viennoiserie",
          obligatoire: true,
          articles: [
            { id: "croissant", name: "Croissant", supplement: 0 },
            { id: "pain-au-chocolat", name: "Pain au chocolat", supplement: 0 },
          ],
        },
      ],
    },
  ],
  categories: [
    {
      id: "petit-dejeuner",
      name: "Petit-déjeuner",
      tagline: "Dès 8h, du lundi au dimanche",
      items: [
        { id: "cafe", name: "Café", price: 1.5, chaud: true, image: `${POULARD_PHOTOS}/cafe.jpg` },
        {
          id: "chocolat",
          name: "Chocolat",
          price: 2.5,
          chaud: true,
          image: pexels("239584/pexels-photo-239584.jpeg", 800),
        },
        articleFormats(
          "jus-de-fruits",
          "Jus de fruits",
          [
            ["En bouteille", 3],
            ["Pressé", 4.5],
          ],
          { image: `${POULARD_PHOTOS}/jus-de-fruits.jpg` },
          ["jus", "Jus"]
        ),
        {
          id: "viennoiserie",
          name: "Viennoiserie",
          price: 1.5,
          image: `${POULARD_PHOTOS}/viennoiseries.jpg`,
          options: [poulardViennoiserie],
        },
        {
          id: "tartines-chocolat",
          name: "Tartines chocolat",
          price: 3.5,
          image: pexels("33526181/pexels-photo-33526181.jpeg", 800),
        },
        {
          id: "gaufre",
          name: "Gaufre",
          price: 4,
          image: pexels("32123671/pexels-photo-32123671.jpeg", 800),
        },
      ],
    },
    {
      id: "rotisserie",
      name: "Rôtisserie",
      tagline: "À emporter",
      items: [
        articleFormats(
          "poulet-roti",
          "Poulet rôti à la broche",
          [
            ["Quart", 7],
            ["Demi", 12],
            ["Entier", 20],
          ],
          { image: `${POULARD_PHOTOS}/poulet-roti.jpg` },
          ["portion", "Portion"]
        ),
      ],
    },
    {
      id: "sandwichs",
      name: "Sandwichs & burger",
      items: [
        {
          id: "burger",
          name: "Burger",
          description: "Frites et salade",
          price: 14,
          image: pexels("3248289/pexels-photo-3248289.jpeg", 800),
        },
        {
          id: "sandwich",
          name: "Sandwich",
          price: 7.5,
          image: pexels("25048970/pexels-photo-25048970.jpeg", 800),
        },
        {
          id: "pita",
          name: "Pita",
          price: 8.5,
          image: pexelsRecadre("6275121/pexels-photo-6275121.jpeg", 800),
        },
      ],
    },
    {
      id: "tapas",
      name: "Tapas",
      tagline: "La carte du soir",
      items: [
        {
          id: "poulpe",
          name: "Tentacules de poulpe grillées",
          price: 13,
          image: pexels("37068830/pexels-photo-37068830.jpeg", 800),
        },
        {
          id: "beignets-courgettes",
          name: "Beignets de courgettes, sauce tartare",
          price: 7,
          image: pexels("32153515/pexels-photo-32153515.jpeg", 800),
        },
        {
          id: "camembert-pane",
          name: "Camembert pané",
          description: "À partager",
          price: 8,
          image: pexels("29177201/pexels-photo-29177201.jpeg", 800),
        },
        {
          id: "bouquet-crevettes",
          name: "Bouquet de crevettes",
          price: 11,
          image: `${POULARD_PHOTOS}/bouquet-crevettes.jpg`,
        },
        {
          id: "crudo-daurade",
          name: "Crudo de daurade",
          price: 11,
          image: pexels("27890217/pexels-photo-27890217.jpeg", 800),
        },
        {
          id: "tataki-magret",
          name: "Tataki de magret",
          price: 12,
          image: `${POULARD_PHOTOS}/tataki-magret.jpg`,
        },
        {
          id: "pan-con-tomate",
          name: "Pan con tomate & jambon serrano",
          price: 9,
          image: `${POULARD_PHOTOS}/pan-con-tomate.jpg`,
        },
        {
          id: "gaspacho",
          name: "Gaspacho du moment",
          price: 6,
          image: pexels("37273396/pexels-photo-37273396.jpeg", 800),
        },
      ],
    },
    {
      id: "plats",
      name: "Plats",
      items: [
        {
          id: "filet-daurade",
          name: "Filet de daurade sauce vierge",
          price: 19,
          image: `${POULARD_PHOTOS}/filet-daurade.jpg`,
        },
        {
          id: "salade-mangue",
          name: "Salade exotique mangue",
          price: 14,
          image: `${POULARD_PHOTOS}/salade-mangue.jpg`,
        },
        {
          id: "souris-agneau",
          name: "Souris d'agneau",
          price: 21,
          image: pexels("16588046/pexels-photo-16588046.jpeg", 800),
        },
        {
          id: "brochettes",
          name: "Brochettes",
          description: "Le dimanche, avec frites",
          price: 18,
          image: `${POULARD_PHOTOS}/brochettes.jpg`,
          options: [groupeChoix("brochette", "Brochette", ["Bœuf", "Canard", "Cœurs"], { obligatoire: true })],
        },
        // En dernier : seule fiche sans photo, elle prend la rangée entière.
        { id: "plat-du-jour", name: "Plat du jour", description: "À découvrir chaque midi", price: 15 },
      ],
    },
    {
      id: "desserts",
      name: "Desserts",
      items: [
        {
          id: "clafoutis",
          name: "Clafoutis",
          price: 6,
          image: `${POULARD_PHOTOS}/clafoutis.jpg`,
        },
      ],
    },
  ],
};

/** Photos libres (Pexels, Unsplash), auditées sur planches : le bar n'en publie aucune de ses plats. */
const PETIT_NICE_PHOTOS: Partial<Record<string, string>> = {
  "petit-dejeuner": pexels("10069877/pexels-photo-10069877.jpeg", 800),
  viennoiserie: pexels("8909319/pexels-photo-8909319.jpeg", 800),
  "club-sandwich": unsplash("photo-1712746784291-e29d5d2694d4", 800),
  croque: pexels("31768242/pexels-photo-31768242.jpeg", 800),
  "burger-cbo": pexels("18713432/pexels-photo-18713432.jpeg", 800),
  "salade-italienne": pexels("29882835/pexels-photo-29882835.jpeg", 800),
  "salade-cesar": pexels("15813486/pexels-photo-15813486.jpeg", 800),
  "brie-roti": unsplash("photo-1625428089695-3344815b4528", 800),
  saucisson: pexels("4639328/pexels-photo-4639328.jpeg", 800),
  burratina: pexels("29872991/pexels-photo-29872991.jpeg", 800),
  tenders: pexels("29653191/pexels-photo-29653191.jpeg", 800),
  nachos: pexels("4411802/pexels-photo-4411802.jpeg", 800),
  "ginger-rasberry": pexels("37271933/pexels-photo-37271933.jpeg", 800),
  "lime-mandarine": unsplash("photo-1619604395920-a16f33192a50", 800),
  "peached-iced-tea": pexels("31664032/pexels-photo-31664032.jpeg", 800),
  // Recadrée : au centre, le verre restait dans un coin du cadre.
  "crazy-banana": pexelsRecadre("4051773/pexels-photo-4051773.jpeg", 800),
  "fresh-passion": pexels("5156362/pexels-photo-5156362.jpeg", 800),
  "apple-berries": pexels("38101015/pexels-photo-38101015.jpeg", 800),
  passionnement: pexels("8375043/pexels-photo-8375043.jpeg", 800),
  "tropical-soda": pexels("7377090/pexels-photo-7377090.jpeg", 800),
  "red-berries": pexels("12419161/pexels-photo-12419161.jpeg", 800),
  "mango-drop": pexels("38896800/pexels-photo-38896800.jpeg", 800),
  "coco-spirit": pexels("18454778/pexels-photo-18454778.jpeg", 800),
  exotique: pexels("4669243/pexels-photo-4669243.jpeg", 800),
  virgin: pexels("15523637/pexels-photo-15523637.jpeg", 800),
  cappuccino: pexels("1036443/pexels-photo-1036443.jpeg", 800),
  "chocolat-viennois": pexels("17506136/pexels-photo-17506136.jpeg", 800),
  "irish-coffee": pexels("14721872/pexels-photo-14721872.jpeg", 800),
  smoothie: pexels("4753650/pexels-photo-4753650.jpeg", 800),
  "fruits-presses": unsplash("photo-1689066117649-0ca9762fc92c", 800),
  "pinte-paulaner": pexels("11188309/pexels-photo-11188309.jpeg", 800),
};

const petitNiceArticle = (id: string, name: string, price: number, extra: Partial<MenuItem> = {}): MenuItem => ({
  id,
  name,
  price,
  image: PETIT_NICE_PHOTOS[id],
  ...extra,
});

const petitNiceAlcool = (id: string, name: string, price: number, extra: Partial<MenuItem> = {}) =>
  petitNiceArticle(id, name, price, { ...ALCOOL, ...extra });

/** L'ardoise : « Frites maison +1 € » avec les clubs, les croques et le CBO. */
const PETIT_NICE_FRITES = groupeChoix("frites", "Supplément", [["Frites maison", 1]], { multiple: true });

/** Les sodas du feuillet des boissons fraîches. */
const PETIT_NICE_SODAS = [
  "Pepsi",
  "Pepsi Max",
  "Lipton Ice Tea",
  "Oasis Tropical",
  "Orangina",
  "Schweppes Tonic",
  "Schweppes Agrumes",
  "Schweppes Ginger Ale",
];

/** La formule étudiante : le plat, puis la boisson qui fixe le prix. */
const petitNiceFormuleEtudiante = (id: string, name: string, description: string, price: number, boisson: OptionGroup[] = []) =>
  petitNiceArticle(id, name, price, {
    description,
    options: [
      groupeChoix("plat", "Plat", ["Burger CBO", "Croque Monsieur", "Tenders de poulet frites"], { obligatoire: true }),
      ...boisson,
      groupeChoix("frites", "Supplément", [["Portion de frites (CBO, croque)", 3]], { multiple: true }),
    ],
  });

/*
 * Le Petit Nice — le café-bar de la grande terrasse, 1 place Jean-Jaurès
 * (Écusson, Montpellier). Aucune carte en ligne de leur main : la cuisine
 * vient de l'ardoise de la terrasse, les formules et les boissons des
 * feuillets et des cartes posés sur les tables (photos de clients, 2025 et
 * août 2026). Tous les prix sont à confirmer avec le gérant ; ceux des tapas
 * sont attribués dans l'ordre de lecture. Sources et questions :
 * demos/le-petit-nice/profile.json.
 */
const lePetitNice: Restaurant = {
  slug: "le-petit-nice",
  name: "Le Petit Nice",
  suivi: true,
  // Le logo dit déjà « café ■ bar » : l'accroche nomme la terrasse et sa place.
  tagline: "Terrasse · Place Jean-Jaurès",
  // Le mot-symbole de l'enseigne, redessiné d'après photo (Questrial, Poppins) :
  // le fichier d'origine est à demander.
  logo: "/le-petit-nice/logo.svg",
  logoIsName: true,
  footerLogo: "/le-petit-nice/logo-sarcelle.svg",
  icons: { tab: "/le-petit-nice/favicon.png", homeScreen: "/le-petit-nice/icon.png" },
  themeColor: "#0e7470",
  address: "1 Place Jean Jaurès, 34000 Montpellier",
  phone: "+33 4 67 57 83 56",
  hours: "Tous les jours 8h–⁠1h",
  placeId: "ChIJp7PriaevthIRy1ghMMJXEDw",
  googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJp7PriaevthIRy1ghMMJXEDw",
  // Google et leur reel Instagram : « Tous les jours de 8h à 01h » ; le
  // feuillet des tapas : « Happy Hour 18h-20h ».
  highlights: ["Tous les jours, 8h–⁠1h", "Happy hour 18h–⁠20h"],
  ticker: [
    { text: "Happy hour de 18h à 20h", tone: "accent" },
    { text: "Formule étudiante sur présentation de la carte étudiante", tone: "brand" },
    { text: "Frites maison, nachos et guacamole maison" },
  ],
  categories: [
    {
      // La carte « Formule étudiante » des tables (août 2026).
      id: "formule-etudiante",
      name: "Formule étudiante",
      tagline: "Sur présentation d'une carte étudiante",
      items: [
        petitNiceFormuleEtudiante(
          "formule-etudiante-pinte",
          "Formule étudiante + pinte",
          "Burger CBO, Croque Monsieur ou Tenders de poulet frites, avec une pinte de bière (+18 ans)",
          10
        ),
        petitNiceFormuleEtudiante(
          "formule-etudiante-soft",
          "Formule étudiante + soft",
          "Burger CBO, Croque Monsieur ou Tenders de poulet frites, avec un soft",
          8,
          [groupeChoix("soft", "Soft", PETIT_NICE_SODAS, { obligatoire: true })]
        ),
      ],
    },
    {
      id: "petit-dejeuner",
      name: "Petit-déjeuner",
      items: [
        petitNiceArticle("petit-dejeuner", "Le petit déjeuner", 6.5, {
          description:
            "Une boisson chaude, un verre d'orange ou citron pressé, un croissant ou un pain au chocolat, ou deux tartines beurrées confiture de fraise",
          options: [
            groupeChoix(
              "boisson",
              "Boisson chaude",
              ["Expresso", "Café allongé", "Café noisette", "Grand crème", "Thé", "Chocolat chaud"],
              { obligatoire: true }
            ),
            groupeChoix("presse", "Pressé", ["Orange pressée", "Citron pressé"], { obligatoire: true }),
            groupeChoix(
              "viennoiserie",
              "Viennoiserie ou tartines",
              ["Croissant", "Pain au chocolat", "Deux tartines beurrées, confiture de fraise"],
              { obligatoire: true }
            ),
          ],
        }),
        petitNiceArticle("viennoiserie", "Croissant ou pain au chocolat", 1.9, {
          options: [groupeChoix("viennoiserie", "Viennoiserie", ["Croissant", "Pain au chocolat"], { obligatoire: true })],
        }),
      ],
    },
    {
      // L'ardoise accrochée à l'arbre de la terrasse.
      id: "ardoise",
      name: "À l'ardoise",
      items: [
        petitNiceArticle("plat-du-jour", "Plat du jour", 16, { description: "Demandez le plat du jour au serveur" }),
        petitNiceArticle("dessert-du-jour", "Dessert du jour", 8, { description: "Demandez le dessert du jour au serveur" }),
      ],
    },
    {
      id: "clubs-croques",
      name: "Clubs, croques & burger",
      items: [
        petitNiceArticle("club-sandwich", "Club sandwich", 17, {
          description: "Accompagné de sa salade",
          options: [
            groupeChoix(
              "garniture",
              "Garniture",
              ["Jambon blanc", "Jambon cru", "Poulet bacon", "Thon", "Chorizo", "Bœuf mariné façon asiatique"],
              { obligatoire: true }
            ),
            PETIT_NICE_FRITES,
          ],
        }),
        petitNiceArticle("croque", "Nos croques", 17, {
          printName: "Croque",
          options: [
            groupeChoix(
              "croque",
              "Croque",
              ["Monsieur", "Madame", "Chèvre-tomate", "Petit-Nice", "Italien", "Chorizo"],
              { obligatoire: true, prefixe: "Croque " }
            ),
            PETIT_NICE_FRITES,
          ],
        }),
        petitNiceArticle("burger-cbo", "Burger CBO", 19, {
          description: "Pain artisanal, salade, gouda, poulet pané, bacon, oignon, tomate, mayonnaise épicée",
          options: [PETIT_NICE_FRITES],
        }),
      ],
    },
    {
      id: "salades",
      name: "Salades",
      items: [
        petitNiceArticle("salade-italienne", "Salade Italienne", 18, {
          description: "Jambon cru, tomates confites, mozzarella",
        }),
        petitNiceArticle("salade-chevre-chaud", "Salade Chèvre chaud", 18, {
          description: "Croustillants de chèvre, herbes de Provence",
        }),
        petitNiceArticle("salade-cesar", "Salade César", 18, {
          description: "Poulet pané, copeaux de parmesan, œufs, croûtons",
        }),
        petitNiceArticle("salade-caprese", "Salade Caprese", 18),
        petitNiceArticle("salade-thai", "Salade Thaï", 18),
      ],
    },
    {
      id: "tapas",
      name: "Nos tapas",
      items: [
        petitNiceArticle("brie-roti", "Brie rôti au miel", 10, { detail: "200 g" }),
        petitNiceArticle("saucisson", "Saucisson nature à partager", 10, { detail: "200 g" }),
        petitNiceArticle("burratina", "Burratina et son jambon cru", 10),
        petitNiceArticle("tenders", "Tenders de poulet pané", 9.5),
        petitNiceArticle("nachos", "Nachos et guacamole maison", 9.5),
      ],
    },
    {
      id: "boissons-chaudes",
      name: "Boissons chaudes",
      boissons: "chaudes",
      items: [
        petitNiceArticle("expresso", "Expresso", 2, { description: "Arabica-robusta" }),
        petitNiceArticle("decafeine", "Décaféiné", 2.1, { description: "100 % arabica" }),
        petitNiceArticle("cafe-allonge", "Café allongé", 2.1),
        petitNiceArticle("cafe-noisette", "Café noisette", 2.1),
        petitNiceArticle("cafe-double", "Café double", 4),
        petitNiceArticle("cappuccino", "Cappuccino", 4.2),
        petitNiceArticle("grand-creme", "Grand crème", 4.2),
        petitNiceArticle("cafe-viennois", "Café viennois", 4.4),
        petitNiceArticle("the", "Thé « Jardin d'Asie »", 4.2, {
          options: [
            groupeChoix(
              "the",
              "Thé ou infusion",
              [
                "Thé noir Ceylan",
                "Thé noir Darjeeling",
                "Thé noir Yunnan",
                "Thé noir Earl Grey",
                "Thé noir Fruits rouges",
                "Thé noir Caramel",
                "Thé noir Miel pain d'épices",
                "Thé noir Citron",
                "Thé noir Vanille",
                "Thé vert Gunpowder",
                "Thé vert Menthe",
                "Thé vert Jasmin",
                "Thé vert Agrume",
                "Thé vert Pêche",
                "Infusion Verveine",
                "Infusion Tilleul",
                "Infusion Verveine menthe",
              ],
              { obligatoire: true }
            ),
          ],
        }),
        petitNiceArticle("chocolat-chaud", "Chocolat chaud", 4.7),
        petitNiceArticle("chocolat-caramel", "Chocolat caramel", 4.7),
        petitNiceArticle("chocolat-cannelle", "Chocolat cannelle", 4.7),
        petitNiceArticle("chocolat-noisette", "Chocolat noisette", 4.7),
        petitNiceArticle("chocolat-viennois", "Chocolat viennois", 4.9),
      ],
    },
    {
      id: "cafes-alcoolises",
      name: "Cafés alcoolisés",
      tagline: "Chauds",
      boissons: "chaudes",
      items: [
        petitNiceAlcool("irish-coffee", "Irish coffee", 12, { description: "Irish whisky, café, sucre de canne, chantilly" }),
        petitNiceAlcool("jamaican-coffee", "Jamaican coffee", 12, { description: "Rhum ambré, café, sucre de canne, chantilly" }),
        petitNiceAlcool("italian-coffee", "Italian coffee", 12, { description: "Amaretto, café, sucre de canne, chantilly" }),
        petitNiceAlcool("french-coffee", "French coffee", 12, { description: "Cognac, café, sucre de canne, chantilly" }),
      ],
    },
    {
      id: "thes-glaces",
      name: "Thés glacés",
      boissons: true,
      items: [
        petitNiceArticle("ginger-rasberry", "Ginger Rasberry", 7.5, {
          description: "Gingembre frais, framboise, thé au jasmin, sucre de canne",
        }),
        petitNiceArticle("lime-mandarine", "Lime and Mandarine", 7.5, {
          description: "Citron vert, mandarine, menthe fraîche, thé au jasmin, sucre de canne",
        }),
        petitNiceArticle("peached-iced-tea", "Peached iced tea", 7.5, {
          description: "Purée de pêche, oranges fraîches, thé au jasmin",
        }),
      ],
    },
    {
      // L'orthographe du feuillet : « Coktails ».
      id: "cocktails-sans-alcool",
      name: "Coktails sans alcool",
      boissons: true,
      items: [
        petitNiceArticle("crazy-banana", "Crazy Banana", 7.5, { description: "Purée de banane, sirop de kiwi, jus d'ananas" }),
        petitNiceArticle("pie-apple", "Pie-Apple", 7.5, { description: "Jus d'ananas, cranberry, pomme, citron vert" }),
        petitNiceArticle("fresh-passion", "Fresh Passion", 7.5, { description: "Purée de mandarine, sirop de passion, limonade" }),
        petitNiceArticle("apple-berries", "Apple Berries", 7.5, {
          description: "Purée de framboise, sirop de pomme verte, limonade",
        }),
        // La coupure française, si le nom doit se couper (320 px) ; le ticket garde le mot entier.
        petitNiceArticle("passionnement", "Passion\u00adnément", 7.5, {
          printName: "Passionnément",
          description: "Purée de passion, sirop de vanille, limonade",
        }),
        petitNiceArticle("tropical-soda", "Tropical Soda", 7.5, { description: "Purée de mangue, sirop de Pac, limonade" }),
        petitNiceArticle("red-berries", "Red Berries", 7.5, {
          description: "Purée de framboise, purée de fraise, jus de cranberry, sucre de canne",
        }),
        petitNiceArticle("mango-drop", "Mango Drop", 7.5, {
          description: "Purée de mangue, purée de fraise, jus d'orange, sucre de canne",
        }),
        petitNiceArticle("coco-spirit", "Coco Spirit", 7.5, {
          description: "Purée de coco, purée de mandarine, jus d'orange, sucre de canne",
        }),
        petitNiceArticle("exotique", "Exotique", 7.5, {
          description: "Jus d'ananas, purée de mangue, purée de passion, fruit de la passion frais",
        }),
        petitNiceArticle("virgin", "Virgin Mojito / Virgin Colada", 7.5, {
          options: [groupeChoix("virgin", "Cocktail", ["Virgin Mojito", "Virgin Colada"], { obligatoire: true })],
        }),
      ],
    },
    {
      id: "boissons-fraiches",
      name: "Boissons fraîches",
      boissons: true,
      items: [
        petitNiceArticle("soda", "Sodas", 4.3, {
          options: [groupeChoix("soda", "Soda", PETIT_NICE_SODAS, { obligatoire: true })],
        }),
        petitNiceArticle("nectar", "Nectars & jus", 4.3, {
          detail: "20 cl",
          options: [
            groupeChoix(
              "jus",
              "Parfum",
              ["Orange", "Ananas", "Pamplemousse", "Tomate", "Pomme", "Abricot", "ACE", "Fraise & fruits", "Fruit du dragon"],
              { obligatoire: true }
            ),
          ],
        }),
        petitNiceArticle("fruits-presses", "Fruits pressés", 4.7, {
          options: [groupeChoix("fruit", "Fruit", ["Orange", "Citron", "Orange & citron"], { obligatoire: true })],
        }),
        petitNiceArticle("smoothie", "Smoothies", 7.5, {
          options: [
            groupeChoix(
              "smoothie",
              "Smoothie",
              ["Pêche", "Mangue", "Banane & fraise", "Framboise & fraise", "Mandarine, pêche & menthe", "Mangue & banane"],
              { obligatoire: true }
            ),
          ],
        }),
        articleFormats(
          "sirop",
          "Sirop à l'eau",
          [
            ["25 cl", 3.7],
            ["50 cl", 4],
          ],
          {
            options: [
              groupeChoix(
                "sirop",
                "Sirop",
                [
                  "Fraise",
                  "Grenadine",
                  "Menthe",
                  "Cassis",
                  "Orgeat",
                  "Violette",
                  "Caramel",
                  "Pomme",
                  "Gambetta",
                  "Cerise",
                  "Kiwi",
                  "Passion",
                  "Framboise",
                  "Pêche",
                  "Pac",
                ],
                { obligatoire: true }
              ),
            ],
          }
        ),
      ],
    },
    {
      id: "bieres",
      name: "Bières",
      boissons: true,
      items: [
        petitNiceAlcool("pinte-paulaner", "Pinte Paulaner pression", 7),
        petitNiceAlcool("la-bartavelle", "La Bartavelle", 5, {
          description: "Bière artisanale, brassée localement",
          detail: "33 cl",
          options: [
            groupeChoix("biere", "Bière", ["Blonde", "Triple", "IPA", "Blanche", "Brune", "Rousse"], { obligatoire: true }),
          ],
        }),
      ],
    },
  ],
};

/*
 * Café Riche — brasserie historique, 8 place de la Comédie (Montpellier),
 * depuis 1893 ; « Le Grand Café Riche » sur son site. Aucun document remis :
 * la carte est celle de leur site (caferiche-montpellier.com, pages « La
 * Carte » Restaurant et Brasserie, relevées le 16 octobre 2026), mot pour mot,
 * à ses prix, à confirmer avec eux. Texte archivé, sources et questions :
 * demos/cafe-riche/.
 */
/**
 * Leurs photos (le reportage de leur site) quand le plat y figure — soupe,
 * profiteroles, spritz, cafés ; le reste en photos libres (Pexels),
 * auditées, ou pas de photo quand aucune ne montre le plat de la carte. Les
 * boissons sans photo restent en liste.
 */
const RICHE_PHOTOS: Partial<Record<string, string>> = {
  "menu-opera": pexels("33474053/pexels-photo-33474053.jpeg", 800),
  "menu-enfant": pexels("33709287/pexels-photo-33709287.jpeg", 800),
  "rillettes-thon": pexels("38275222/pexels-photo-38275222.jpeg", 800),
  arancini: pexels("29653193/pexels-photo-29653193.jpeg", 800),
  "avocat-crevette": pexels("10875295/pexels-photo-10875295.jpeg", 800),
  "burrata-pesto": pexels("10745969/pexels-photo-10745969.jpeg", 800),
  "soupe-poisson": "/cafe-riche/soupe-poisson.jpg",
  "terrine-foie-gras": pexels("37767594/pexels-photo-37767594.jpeg", 800),
  "bouquets-crevette": pexels("6426095/pexels-photo-6426095.jpeg", 800),
  "frites-cheddar-bacon": pexels("19264378/pexels-photo-19264378.jpeg", 800),
  frites: pexelsRecadre("8272621/pexels-photo-8272621.jpeg", 800),
  "ardoise-mixte": pexels("6343168/pexels-photo-6343168.jpeg", 800),
  "tataki-thon-teriyaki": pexels("17126515/pexels-photo-17126515.jpeg", 800),
  "chevre-pane-miel": pexels("29177201/pexels-photo-29177201.jpeg", 800),
  chipirones: pexels("33659839/pexels-photo-33659839.jpeg", 800),
  "accras-morue": pexels("18041217/pexels-photo-18041217.jpeg", 800),
  "milanetas-poulet": pexels("34636425/pexels-photo-34636425.jpeg", 800),
  "patatas-bravas": pexels("28490819/pexels-photo-28490819.jpeg", 800),
  huitres: pexels("12955611/pexels-photo-12955611.jpeg", 800),
  "salade-nicoise": pexels("14693797/pexels-photo-14693797.jpeg", 800),
  "salade-italienne": pexels("5713743/pexels-photo-5713743.jpeg", 800),
  "camembert-roti": pexels("20702577/pexels-photo-20702577.jpeg", 800),
  "salade-cesar": pexels("15813486/pexels-photo-15813486.jpeg", 800),
  "salade-grecque": pexels("33691786/pexels-photo-33691786.jpeg", 800),
  "tartare-thon": pexels("32076808/pexels-photo-32076808.jpeg", 800),
  "salade-chevre-chaud": pexels("29843069/pexels-photo-29843069.jpeg", 800),
  "tartare-boeuf": pexels("35981925/pexels-photo-35981925.jpeg", 800),
  "carpaccio-boeuf": pexels("27305239/pexels-photo-27305239.jpeg", 800),
  "magret-canard": pexels("29296209/pexels-photo-29296209.jpeg", 800),
  "steak-a-cheval": pexels("15514358/pexels-photo-15514358.jpeg", 800),
  "supreme-volaille": pexelsRecadre("15532964/pexels-photo-15532964.jpeg", 800),
  "bavette-echalote": pexels("20234697/pexels-photo-20234697.jpeg", 800),
  "burger-aveyronnais": pexels("9469655/pexels-photo-9469655.jpeg", 800),
  "burger-vegi": pexels("20741663/pexels-photo-20741663.jpeg", 800),
  "burger-le-riche": pexels("31450808/pexels-photo-31450808.jpeg", 800),
  "burger-chic-chicken": pexels("12664796/pexels-photo-12664796.jpeg", 800),
  "fish-and-chips": pexels("5894001/pexels-photo-5894001.jpeg", 800),
  "filet-bar": pexels("19318466/pexels-photo-19318466.jpeg", 800),
  "seiche-plancha": pexels("15254107/pexels-photo-15254107.jpeg", 800),
  "rouille-seiche": pexels("38756486/pexels-photo-38756486.jpeg", 800),
  "moules-creme": pexelsRecadre("31235469/pexels-photo-31235469.jpeg", 800),
  "moules-roquefort": pexels("12173349/pexels-photo-12173349.jpeg", 800),
  "linguines-carbonara": pexels("29039082/pexels-photo-29039082.jpeg", 800),
  "linguines-vongole": pexels("17243892/pexels-photo-17243892.jpeg", 800),
  profiteroles: "/cafe-riche/profiteroles.jpg",
  cheesecake: pexels("29653160/pexels-photo-29653160.jpeg", 800),
  "creme-brulee": pexels("5677282/pexels-photo-5677282.jpeg", 800),
  "mousse-chocolat": pexels("7819053/pexels-photo-7819053.jpeg", 800),
  affogato: pexels("10066817/pexels-photo-10066817.jpeg", 800),
  "cafe-gourmand": pexels("15891150/pexels-photo-15891150.jpeg", 800),
  "pain-perdu": pexels("30458468/pexels-photo-30458468.jpeg", 800),
  "panna-cotta": pexels("40037724/pexels-photo-40037724.jpeg", 800),
  tiramisu: pexels("27305272/pexels-photo-27305272.jpeg", 800),
  "glace-1-boule": pexels("16630827/pexels-photo-16630827.jpeg", 800),
  "glace-2-boules": pexels("2586924/pexels-photo-2586924.jpeg", 800),
  "glace-3-boules": pexels("8349413/pexels-photo-8349413.jpeg", 800),
  "chocolat-liegeois": pexels("38371322/pexels-photo-38371322.jpeg", 800),
  "cafe-liegeois": pexels("33144564/pexels-photo-33144564.jpeg", 800),
  "nutella-cup": pexels("8605224/pexels-photo-8605224.jpeg", 800),
  "after-eight": pexels("29851705/pexels-photo-29851705.jpeg", 800),
  "formule-classique": pexels("10069877/pexels-photo-10069877.jpeg", 800),
  brunch: pexels("4109532/pexels-photo-4109532.jpeg", 800),
  croissant: pexels("11675765/pexels-photo-11675765.jpeg", 800),
  "pain-a-tartiner": pexels("6345227/pexels-photo-6345227.jpeg", 800),
  omelette: pexels("23884199/pexels-photo-23884199.jpeg", 800),
  "avocado-toast": pexels("39413009/pexels-photo-39413009.jpeg", 800),
  "cafe-expresso": "/cafe-riche/cafe-expresso.jpg",
  cappuccino: "/cafe-riche/cappuccino.jpg",
  "jus-orange": pexels("17612820/pexels-photo-17612820.jpeg", 800),
  "jus-pamplemousse": pexels("11264639/pexels-photo-11264639.jpeg", 800),
  "jus-citron": pexels("11016603/pexels-photo-11016603.jpeg", 800),
  "the-glace": pexels("11009224/pexels-photo-11009224.jpeg", 800),
  citronnade: pexels("5668215/pexels-photo-5668215.jpeg", 800),
  "citronnade-menthe": pexels("9584971/pexels-photo-9584971.jpeg", 800),
  milkshake: pexels("28525197/pexels-photo-28525197.jpeg", 800),
  frappe: pexels("32395584/pexels-photo-32395584.jpeg", 800),
  spritz: "/cafe-riche/spritz.jpg",
  hugo: pexels("7376785/pexels-photo-7376785.jpeg", 800),
  cosmopolitan: pexels("15813474/pexels-photo-15813474.jpeg", 800),
  negroni: pexels("29707900/pexels-photo-29707900.jpeg", 800),
  "moscow-mule": pexels("19766950/pexels-photo-19766950.jpeg", 800),
  "london-mule": pexels("25951422/pexels-photo-25951422.jpeg", 800),
  "dark-n-stormy": pexels("27126842/pexels-photo-27126842.jpeg", 800),
  mojito: pexelsRecadre("37662776/pexels-photo-37662776.jpeg", 800),
  "pina-colada": pexels("10986589/pexels-photo-10986589.jpeg", 800),
  "sex-on-the-beach": pexels("22882570/pexels-photo-22882570.jpeg", 800),
  daiquiri: pexels("34140556/pexels-photo-34140556.jpeg", 800),
  margarita: pexelsRecadre("32912253/pexels-photo-32912253.jpeg", 800),
  "espresso-martini": pexels("34429981/pexels-photo-34429981.jpeg", 800),
  "pornstar-martini": pexels("28843506/pexels-photo-28843506.jpeg", 800),
  "virgin-mojito": pexels("30591642/pexels-photo-30591642.jpeg", 800),
  "virgin-colada": pexels("30794889/pexels-photo-30794889.jpeg", 800),
  "virgin-sex-on-the-beach": pexels("36189465/pexels-photo-36189465.jpeg", 800),
};

/** « Parfums : citron, cassis, fraise… » sous la glace 1 boule. */
const RICHE_PARFUMS_GLACE = [
  "Citron",
  "Cassis",
  "Fraise",
  "Coco",
  "Vanille",
  "Chocolat",
  "Caramel",
  "Rhum raisin",
  "Pistache",
  "Café",
  "Menthe chocolat",
];

/** Les sirops de la ligne « Sirop 35 cl », repris par le diabolo. */
const RICHE_SIROPS = [
  "Grenadine",
  "Menthe",
  "Pêche",
  "Fraise",
  "Citron amer",
  "Cerise",
  "Framboise",
  "Orgeat",
  "Violette",
  "Cassis",
];

/** « Au choix : grand café, chocolat chaud, crème ou thé » des formules du matin et du brunch. */
const RICHE_BOISSON_MATIN = groupeChoix("boisson", "Boisson chaude", ["Grand café", "Chocolat chaud", "Crème", "Thé"], {
  obligatoire: true,
});

/** « Supplément lait végétal / sirop 0,50 € » des boissons chaudes, sur celles qui prennent du lait. */
const RICHE_SUPPLEMENTS_CHAUD = groupeChoix("supplements", "Suppléments", ["Lait végétal", "Sirop"], {
  multiple: true,
  supplement: 0.5,
});

/** « Supplément Picon 1,00 € · sirop 0,50 € » des bières pression. */
const RICHE_SUPPLEMENTS_PRESSION = groupeChoix("supplements", "Suppléments", [["Picon", 1], ["Sirop", 0.5]], {
  multiple: true,
});

/** « Supplément crème fouettée ou boule de glace 1,50 € » des crêpes ; le parfum de la boule ensuite. */
const RICHE_BOULE_DE_GLACE = "Boule de glace";
const RICHE_SUPPLEMENTS_CREPE = groupeChoix("supplements", "Suppléments", ["Crème fouettée", RICHE_BOULE_DE_GLACE], {
  multiple: true,
  supplement: 1.5,
});
const RICHE_OPTIONS_CREPE = [
  RICHE_SUPPLEMENTS_CREPE,
  groupeChoix("parfum", "Parfum de la boule", RICHE_PARFUMS_GLACE, {
    obligatoire: true,
    when: cdaSi(RICHE_SUPPLEMENTS_CREPE, RICHE_BOULE_DE_GLACE),
  }),
];

/** Menu Opéra : la bavette se commande avec sa cuisson. */
const RICHE_BAVETTE_MENU = "Bavette de bœuf, frites et salade";
const RICHE_PLAT_OPERA = groupeChoix(
  "plat",
  "Plat",
  [
    "Rouille de seiche à la sétoise, riz basmati",
    "Moules marinières au vin blanc, frites",
    "Carpaccio de bœuf, frites et salade",
    "Linguines à la Vongole",
    RICHE_BAVETTE_MENU,
  ],
  { obligatoire: true }
);

/** Un article de la carte, avec sa photo s'il en a une. */
const richeArticle = (id: string, name: string, price: number, extra: Partial<MenuItem> = {}): MenuItem => ({
  id,
  name,
  price,
  image: RICHE_PHOTOS[id],
  ...extra,
});

/** Une boisson alcoolisée : TVA à 20 %. */
const richeAlcool = (id: string, name: string, price: number, extra: Partial<MenuItem> = {}) =>
  richeArticle(id, name, price, { ...ALCOOL, ...extra });

/** Le veau et le canard se servent rosés : pas de bleu ni de saignant. */
const RICHE_CUISSON_ROSE = groupeChoix("cuisson", "Cuisson", ["Rosé", "À point", "Bien cuit"], { obligatoire: true });
/** Le steak haché des burgers : pas de bleu. */
const RICHE_CUISSON_HACHE = groupeChoix("cuisson", "Cuisson", ["Saignant", "À point", "Bien cuit"], { obligatoire: true });

/** Une viande grillée : la cuisson se demande à la commande, du plus saignant au plus cuit (celle de Café des Arts). */
const richeGrillade = (
  id: string,
  name: string,
  price: number,
  extra: Partial<MenuItem> = {},
  cuisson: OptionGroup = CDA_CUISSON
) => richeArticle(id, name, price, { options: [cuisson], ...extra });

/** Une glace à composer : un parfum par boule. */
const richeGlace = (boules: number, price: number, extra: Partial<MenuItem> = {}) => {
  const pluriel = boules > 1 ? "s" : "";
  return richeArticle(`glace-${boules}-boule${pluriel}`, `Glace ${boules} boule${pluriel}`, price, {
    options: ["1re boule", "2e boule", "3e boule"]
      .slice(0, boules)
      .map((rang, i) =>
        groupeChoix(`boule-${i + 1}`, boules > 1 ? rang : "Parfum", RICHE_PARFUMS_GLACE, { obligatoire: true })
      ),
    ...extra,
  });
};

/** Une crêpe, ses suppléments et le parfum de sa boule. */
const richeCrepe = (id: string, name: string, price: number, extra: Partial<MenuItem> = {}) =>
  richeArticle(id, name, price, { options: RICHE_OPTIONS_CREPE, ...extra });

/**
 * Un article à plusieurs formats, avec sa photo s'il en a une. Ses prix un
 * par ligne (.dish-tarifs, globals.css) : sur une seule, le « · » entre deux
 * formats finissait une ligne.
 */
const richeFormats = (
  id: string,
  name: string,
  prix: Formats,
  extra: Partial<MenuItem> = {},
  groupe: Parameters<typeof articleFormats>[4] = []
) =>
  articleFormats(
    id,
    name,
    prix,
    {
      image: RICHE_PHOTOS[id],
      tarifs: prix.map(([label, montant]) => `${label} ${formatPrice(montant)}`.replace(/ /g, "\u00a0")).join("\n"),
      ...extra,
    },
    groupe
  );

/** Un vin au verre de 12 cl et à la bouteille de 75 cl. */
const richeVin = (id: string, name: string, description: string, verre: number, bouteille: number) =>
  richeFormats(
    id,
    name,
    [
      ["Verre 12 cl", verre],
      ["Bouteille 75 cl", bouteille],
    ],
    { description, ...ALCOOL }
  );

/** Une bière pression, 25 cl et 50 cl, ses suppléments ensuite. */
const richePression = (id: string, name: string, demi: number, pinte: number) =>
  richeFormats(
    id,
    name,
    [
      ["25 cl", demi],
      ["50 cl", pinte],
    ],
    { options: [RICHE_SUPPLEMENTS_PRESSION], ...ALCOOL }
  );

/** Les spiritueux d'une famille (whisky, gin…), 4 cl ; la famille en description, l'intertitre de la carte. */
const richeSpiritueux = (famille: string, liste: readonly (readonly [id: string, name: string, price: number])[]) =>
  liste.map(([id, name, price]) => richeAlcool(id, name, price, { description: famille }));

const cafeRiche: Restaurant = {
  slug: "cafe-riche",
  name: "Café Riche",
  suivi: true,
  // Le pied de page de leur site : « Brasserie historique · Depuis 1893 » ; le logo dit déjà l'année.
  tagline: "Brasserie historique",
  // Leur logo (« logo-fond-transparent » de leur site), recadré : « CAFÉ »,
  // « RiCHE » or cerné de bleu, « DEPUIS 1893 », comme sur l'auvent.
  logo: "/cafe-riche/logo.png",
  logoIsName: true,
  // Leur logo sur la crème de la carte, pour la roue, le sceau de fidélité et l'onglet.
  icons: { tab: "/cafe-riche/favicon.png", homeScreen: "/cafe-riche/icon.png" },
  themeColor: "#173a6b",
  address: "8 Place de la Comédie, 34000 Montpellier",
  // Leur site et leur fiche Google.
  phone: "+33 9 80 24 50 63",
  hours: "Tous\u00a0les\u00a0jours 7h–\u20601h",
  // Leur site : « Ouvert 7/7 de 7h à 1h du matin », « produits frais et de
  // saison », « sa terrasse emblématique sur la Place de la Comédie ».
  highlights: ["Ouvert 7/7 de 7h à 1h", "Produits frais et de saison", "Terrasse sur la place de la Comédie"],
  // Accords écrits à la main sur leur carte, à relire avec eux.
  pairings: cafeRicheAccords,
  loyaltyWheel: roueDuJour,
  // Les paliers de Caffè Panis (1 € = 1 point) sur leur carte, à caler avec eux.
  demoLoyalty: {
    pointsPerEuro: 1,
    rewards: [
      {
        id: "cafe-soft",
        label: "1 café ou soft offert",
        points: 50,
        items: ["cafe-expresso", "cappuccino", "cafe-allonge", "coca-cola", "orangina", "perrier"],
      },
      {
        id: "dessert",
        label: "1 dessert offert",
        points: 100,
        items: ["profiteroles", "creme-brulee", "tiramisu", "mousse-chocolat", "panna-cotta", "pain-perdu"],
      },
      {
        id: "entree",
        label: "1 entrée offerte",
        points: 150,
        items: [
          "soupe-poisson",
          "burrata-pesto",
          "arancini",
          "rillettes-thon",
          "avocat-crevette",
          "focaccia-chevre-miel",
          "oeufs-mayonnaise",
        ],
      },
      {
        id: "plat",
        label: "1 plat offert",
        points: 250,
        items: [
          "moules-creme",
          "bavette-echalote",
          "tartare-boeuf",
          "moules-roquefort",
          "fish-and-chips",
          "rouille-seiche",
          "seiche-plancha",
          "supreme-volaille",
          "carpaccio-boeuf",
          "burger-le-riche",
          "burger-chic-chicken",
          "burger-vegi",
          "linguines-carbonara",
          "linguines-vongole",
          "linguines-pesto",
        ],
      },
    ],
    member: {
      contact: "0623456789",
      firstName: "Mathilde",
      // Deux jours d'affilée : la série se joue sous les yeux du gérant.
      history: [
        { kind: "gain", points: 4, table: 12, rewards: null, daysAgo: 1 },
        { kind: "roue", points: 10, table: null, rewards: null, daysAgo: 1 },
        { kind: "gain", points: 16, table: 5, rewards: null, daysAgo: 2 },
        { kind: "roue", points: 5, table: null, rewards: null, daysAgo: 2 },
        { kind: "gain", points: 29, table: 21, rewards: null, daysAgo: 6 },
        { kind: "roue", points: 15, table: null, rewards: null, daysAgo: 6 },
        { kind: "gain", points: 9, table: 3, rewards: null, daysAgo: 13 },
      ],
    },
  },
  ticker: [
    { text: "Brasserie historique depuis 1893", tone: "brand" },
    { text: "Plat du jour du lundi au vendredi, uniquement le midi", tone: "accent" },
    { text: "Brunch de 8\u00a0h\u00a030 à 11\u00a0h\u00a030" },
  ],
  categories: [
    {
      id: "menus",
      name: "Nos menus",
      items: [
        richeArticle("menu-opera", "Menu Opéra", 29.9, {
          description: "Entrée, plat et dessert au choix",
          options: [
            groupeChoix(
              "entree",
              "Entrée",
              [
                "Arancini aux épinards et à la ricotta",
                ["Huîtres fines de claires n°3 (6 pièces)", 5],
                "Salade niçoise",
                ["Terrine de foie gras", 5],
                "Soupe de poisson et croûtons",
              ],
              { obligatoire: true }
            ),
            RICHE_PLAT_OPERA,
            groupeChoix("cuisson", "Cuisson de la bavette", CDA_CUISSONS, {
              obligatoire: true,
              when: cdaSi(RICHE_PLAT_OPERA, RICHE_BAVETTE_MENU),
            }),
            groupeChoix(
              "dessert",
              "Dessert",
              [
                "Cheesecake au citron",
                "Tiramisu",
                "Panna cotta aux fruits rouges",
                "Mousse au chocolat",
                "Dessert du jour (selon disponibilité)",
              ],
              { obligatoire: true }
            ),
          ],
        }),
        richeArticle("menu-enfant", "Menu Enfant", 11, {
          description: "Sirop ou jus de fruits, steak haché ou poulet croustillant, frites, une boule de glace. Jusqu'à 8 ans",
          options: [
            groupeChoix("boisson", "Boisson", ["Sirop", "Jus de fruits"], { obligatoire: true }),
            groupeChoix("plat", "Plat", ["Steak haché", "Poulet croustillant"], { obligatoire: true }),
          ],
        }),
      ],
    },
    {
      id: "formules",
      name: "Nos formules",
      tagline: "Du lundi au vendredi, uniquement le midi",
      items: [
        richeArticle("plat-du-jour-cafe", "Plat du jour + Café", 16.9),
        richeArticle("plat-du-jour", "Plat du jour", 14.9),
        richeArticle("plat-du-jour-cafe-gourmand", "Plat du jour + Café gourmand arabica", 19.9),
      ],
    },
    {
      id: "entrees",
      name: "Entrées",
      items: [
        richeArticle("rillettes-thon", "Rillettes de thon et croûtons", 11.9),
        richeArticle("arancini", "Arancini aux épinards et à la ricotta", 9.9),
        richeArticle("avocat-crevette", "Avocat crevette", 8.9),
        richeArticle("burrata-pesto", "Burrata crémeuse au pesto de basilic", 10.9),
        richeArticle("focaccia-chevre-miel", "Focaccia chèvre miel", 8.9),
        richeArticle("soupe-poisson", "Soupe de poisson et croûtons", 14.9),
        richeArticle("terrine-foie-gras", "Terrine de foie gras mi-cuit maison", 15.9),
        richeArticle("bouquets-crevette", "Bouquets de crevette", 17),
        richeArticle("oeufs-mayonnaise", "Oeufs mayonnaise", 6.9),
      ],
    },
    {
      id: "tapas",
      name: "Tapas",
      // La carte Brasserie : « À partir de 15 h » ; la carte Restaurant n'en dit rien.
      tagline: "À partir de 15\u00a0h",
      items: [
        richeArticle("frites-cheddar-bacon", "Assiette de frites cheddar & bacon", 8.9),
        richeArticle("frites-cheddar", "Assiette de frites cheddar", 7.9),
        richeArticle("frites", "Assiette de frites", 6.5),
        richeArticle("ardoise-mixte", "Ardoise mixte charcuterie et fromage", 24.9),
        richeArticle("tataki-thon-teriyaki", "Tataki de thon teriyaki, sauce thaï", 12.9, { printName: "Tataki de thon teriyaki" }),
        richeArticle("chevre-pane-miel", "Chèvre pané au miel", 10.9),
        richeArticle("chipirones", "Chipirones persillés à la plancha", 9.9),
        richeArticle("milanetas-poulet", "Milanetas de poulet", 8.5),
        richeArticle("accras-morue", "Accras de morue", 7.9),
        richeArticle("patatas-bravas", "Patatas bravas", 7.5),
      ],
    },
    {
      id: "huitres",
      name: "Huîtres",
      items: [
        richeFormats(
          "huitres",
          "Huîtres fines de claires n°3",
          [
            ["6 pièces", 17],
            ["12 pièces", 31],
          ],
          {},
          ["quantite", "Quantité"]
        ),
        richeArticle("huitres-gratinees", "Huîtres gratinées sabayon", 17, { detail: "5 pièces" }),
      ],
    },
    {
      id: "salades",
      name: "Salades repas & poké",
      items: [
        richeArticle("salade-nicoise", "Salade Niçoise", 17.9, {
          description: "Salade, tomates anciennes, oignon, poivrons, olives, anchois, oeuf, thon et concombre",
        }),
        richeArticle("salade-italienne", "Italienne", 17.9, {
          description: "Salade, tomates anciennes, jambon serrano, copeaux de parmesan, burratina au pesto, oignons et olives",
          printName: "Salade italienne",
        }),
        richeArticle("camembert-roti", "Camembert rôti et salade", 13.9),
        richeArticle("salade-cesar", "César", 17.9, {
          description: "Salade, tomates cerises, poulet croustillant, croûtons et copeaux de parmesan",
          printName: "Salade César",
        }),
        richeArticle("salade-grecque", "Salade Grecque", 17.9, {
          description: "Salade, tomates anciennes, oignons, poivrons, olives, feta et concombre",
        }),
        richeArticle("tartare-thon", "Tartare de thon maison, frites et salade", 15.9, { printName: "Tartare de thon" }),
        richeArticle("salade-chevre-chaud", "Chèvre chaud", 17.9, {
          description: "Salade, tomates cerise, noix, miel, chèvre, lard grillé, oignons frits",
          printName: "Salade chèvre chaud",
        }),
        richeArticle("poke-vegan", "Poké Végan", 15.9, {
          description: "Riz vinaigré, radis, tomates cerises, avocat, choux blanc, oignons frits, edamamé",
        }),
      ],
    },
    {
      id: "viandes",
      name: "Viandes",
      items: [
        richeArticle("tartare-boeuf", "Tartare de bœuf", 22.9, { description: "Frites, salade" }),
        richeArticle("carpaccio-boeuf", "Carpaccio de bœuf", 22.9, { description: "Frites", detail: "140 g" }),
        richeGrillade("cote-veau", "Côte de veau", 27.9, { description: "Frites, salade", detail: "300 g" }, RICHE_CUISSON_ROSE),
        richeGrillade(
          "magret-canard",
          "Magret de canard",
          27.9,
          { description: "Frites, salade", detail: "300 g" },
          RICHE_CUISSON_ROSE
        ),
        richeGrillade("steak-a-cheval", "Steak à cheval", 22.9, { description: "Frites, salade" }),
        richeArticle("supreme-volaille", "Suprême de volaille au jus de thym", 19.9, { description: "Frites, salade" }),
        richeGrillade("bavette-echalote", "Bavette de bœuf d'aloyau à l'échalote", 21.9, {
          description: "Frites et légumes du marché",
          printName: "Bavette à l'échalote",
        }),
        richeArticle("accompagnement", "Accompagnement au choix", 3.5, {
          description: "Bol de frites, riz ou légumes",
          options: [groupeChoix("accompagnement", "Accompagnement", ["Bol de frites", "Riz", "Légumes"], { obligatoire: true })],
        }),
        richeArticle("sauce", "Sauce au choix", 1.5, {
          description: "Cheddar, poivre, échalote, roquefort",
          options: [groupeChoix("sauce", "Sauce", ["Cheddar", "Poivre", "Échalote", "Roquefort"], { obligatoire: true })],
        }),
      ],
    },
    {
      id: "burgers",
      name: "Burgers",
      items: [
        richeGrillade(
          "burger-aveyronnais",
          "L'Aveyronnais",
          19.9,
          {
            description: "Salade, tomate, steak haché façon bouchère, lard grillé et sauce roquefort",
            printName: "Burger L'Aveyronnais",
          },
          RICHE_CUISSON_HACHE
        ),
        richeArticle("burger-vegi", "Le Végi", 16.9, {
          description: "Salade, tomate, steak de légumes, pickles de cornichon",
          printName: "Burger Le Végi",
        }),
        richeGrillade(
          "burger-le-riche",
          "Le Riche",
          18.9,
          {
            description: "Sauce burger, salade, tomate, oignons confits, steak haché façon bouchère, sauce cheddar",
            printName: "Burger Le Riche",
          },
          RICHE_CUISSON_HACHE
        ),
        richeArticle("burger-chic-chicken", "Le Chic Chicken", 18.9, {
          description: "Salade, tomate, poulet croustillant, pickles de choux blanc, mayonnaise truffée",
          printName: "Burger Le Chic Chicken",
        }),
      ],
    },
    {
      id: "poissons",
      name: "Poissons",
      items: [
        richeArticle("tataki-thon-riz", "Tataki de thon, riz thaï", 21.9, { description: "Sauce thaï maison" }),
        richeArticle("fish-and-chips", "Fish & chips aïoli «\u00a0maison\u00a0»", 18.9, {
          description: "Frites, salade",
          printName: "Fish & chips",
        }),
        richeArticle("filet-bar", "Filet de bar grillé", 23.9, { description: "Sauce vierge, riz basmati, légumes" }),
        richeArticle("seiche-plancha", "Seiche à la plancha aïoli «\u00a0maison\u00a0»", 18.9, {
          description: "Riz, légumes",
          printName: "Seiche à la plancha",
        }),
        richeArticle("rouille-seiche", "Rouille de seiche à la sétoise", 18.9, { description: "Riz basmati" }),
      ],
    },
    {
      id: "moules",
      name: "Moules frites",
      items: [
        richeArticle("moules-creme", "Moules à la crème et vin blanc", 17.9, { description: "Frites" }),
        richeArticle("moules-roquefort", "Moules au roquefort et vin blanc", 17.9, { description: "Frites" }),
      ],
    },
    {
      id: "pates",
      name: "Pâtes",
      items: [
        richeArticle("linguines-pesto", "Linguines au pesto", 18.9, {
          description: "Burratina, jambon cru & copeaux de parmesan",
        }),
        richeArticle("linguines-carbonara", "Linguines à la carbonara", 17.9, { description: "Copeaux de parmesan" }),
        richeArticle("linguines-vongole", "Linguines à la Vongole", 17.9),
      ],
    },
    {
      id: "desserts",
      name: "Desserts",
      items: [
        richeArticle("profiteroles", "Profiteroles au chocolat maison", 9.9),
        richeArticle("cheesecake", "Cheesecake citron, coulis fruits rouges ou exotique", 8.9, {
          printName: "Cheesecake citron",
          options: [groupeChoix("coulis", "Coulis", ["Fruits rouges", "Exotique"], { obligatoire: true })],
        }),
        richeArticle("creme-brulee", "Crème brûlée «\u00a0maison\u00a0»", 8.9, { printName: "Crème brûlée" }),
        richeArticle("mousse-chocolat", "Mousse au chocolat", 8.9),
        richeArticle("affogato", "Affogato", 5),
        richeArticle("cafe-gourmand", "Café gourmand arabica", 9.9, { description: "3 mignardises, crème fouettée" }),
        richeArticle("pain-perdu", "Pain perdu au caramel beurre salé et glace vanille", 8.9, { printName: "Pain perdu" }),
        richeArticle("panna-cotta", "Panna cotta, coulis de fruits rouges", 8.9, { printName: "Panna cotta" }),
        richeArticle("tiramisu", "Tiramisu", 8.9),
        richeArticle("dessert-du-jour", "Dessert du jour", 9.9, { description: "Selon disponibilité" }),
      ],
    },
    {
      id: "glaces",
      name: "Glaces & coupes glacées",
      items: [
        richeGlace(1, 3.5, {
          description:
            "Parfums : citron, cassis, fraise, coco, vanille, chocolat, caramel, rhum raisin, pistache, café, menthe chocolat",
        }),
        richeGlace(2, 6),
        richeGlace(3, 9),
        richeArticle("chocolat-liegeois", "Chocolat liégeois", 12.9),
        richeArticle("cafe-liegeois", "Café liégeois", 12.9),
        richeArticle("dame-blanche", "Dame blanche", 12.9),
        richeArticle("banana-split", "Banana split", 12.9),
        richeArticle("nutella-cup", "Nutella® cup", 12.9),
        // La dose d'alcool diffère d'une carte à l'autre (2 cl, 4 cl) : question au gérant.
        richeAlcool("colonel", "Colonel", 12.9, { description: "Vodka" }),
        richeAlcool("after-eight", "After Eight", 12.9, { description: "Get 27" }),
      ],
    },
    {
      id: "crepes",
      name: "Crêpes",
      tagline: "Supplément crème fouettée ou boule de glace\u00a0: 1,50\u00a0€",
      items: [
        richeCrepe("crepe-sucre", "Crêpe sucre", 3.9),
        richeCrepe("crepe-beurre-sucre", "Crêpe beurre, sucre", 4),
        richeCrepe("crepe-confiture-fraise", "Crêpe confiture de fraise", 4),
        richeCrepe("crepe-confiture-peche", "Crêpe confiture de pêche", 4),
        richeCrepe("crepe-citron", "Crêpe citron, beurre, sucre", 4.2),
        richeCrepe("crepe-chocolat", "Crêpe chocolat maison", 5),
        richeCrepe("crepe-nutella", "Crêpe Nutella®", 5),
        richeCrepe("crepe-nutella-banane", "Crêpe Nutella® banane", 7.5),
        richeCrepe("crepe-flambee", "Crêpe flambée", 7.6, ALCOOL),
      ],
    },
    {
      id: "petit-dejeuner",
      name: "Petit-déjeuner & brunch",
      tagline: "Petit-déjeuner de 7\u00a0h à 12\u00a0h · brunch de 8\u00a0h\u00a030 à 11\u00a0h\u00a030",
      items: [
        richeArticle("formule-classique", "Formule classique", 7.5, {
          description: "Au choix : grand café, chocolat chaud, crème ou thé\ncroissant, jus d'orange pressée",
          options: [RICHE_BOISSON_MATIN],
        }),
        richeArticle("formule-complete", "Formule complète", 11.5, {
          description:
            "Au choix : grand café, chocolat chaud, crème ou thé\norange pressée, pain à tartiner avec beurre, confiture, Nutella et croissant",
          options: [RICHE_BOISSON_MATIN],
        }),
        richeArticle("brunch", "Brunch", 16.9, {
          description:
            "Au choix : grand café, chocolat chaud, crème ou thé\norange pressée, 2 tartines, avocado toast et fromage frais, croissant, lard grillé, 3 œufs au plat",
          options: [RICHE_BOISSON_MATIN],
        }),
        richeArticle("croissant", "Croissant", 1.6),
        richeArticle("pain-a-tartiner", "Pain à tartiner avec beurre, confiture & Nutella", 3.5, {
          printName: "Pain à tartiner",
        }),
        richeArticle("omelette", "Omelette jambon, fromage", 7.9),
        richeArticle("avocado-toast", "Avocado toast, fromage frais & salade composée", 8.9, {
          printName: "Avocado toast",
          options: [groupeChoix("supplement", "Supplément", [["Saumon fumé", 4]], { multiple: true })],
        }),
      ],
    },
    {
      id: "boissons-chaudes",
      name: "Boissons chaudes",
      boissons: "chaudes",
      tagline: "Supplément lait végétal ou sirop\u00a0: 0,50\u00a0€",
      items: [
        richeArticle("cafe-expresso", "Café expresso", 2.3),
        richeArticle("cafe-expresso-arabica", "Café expresso 100 % arabica", 2.9),
        richeArticle("cafe-allonge", "Café allongé", 2.4),
        richeArticle("cafe-allonge-arabica", "Café allongé 100 % arabica", 3.1),
        richeArticle("decafeine", "Décaféiné", 2.3),
        richeArticle("decafeine-allonge", "Décaféiné allongé", 2.4),
        richeArticle("noisette", "Noisette", 3, { options: [RICHE_SUPPLEMENTS_CHAUD] }),
        richeArticle("double-cafe", "Double café", 4.5),
        richeArticle("double-cafe-arabica", "Double café 100 % arabica", 5.2),
        richeArticle("creme", "Crème", 4.3, { options: [RICHE_SUPPLEMENTS_CHAUD] }),
        richeArticle("chocolat-chaud", "Chocolat chaud", 4.5, { options: [RICHE_SUPPLEMENTS_CHAUD] }),
        richeArticle("cappuccino", "Cappuccino", 4.5, { detail: "25 cl", options: [RICHE_SUPPLEMENTS_CHAUD] }),
        richeArticle("chocolat-ancienne", "Chocolat à l'ancienne", 5.1, {
          detail: "27 cl",
          options: [RICHE_SUPPLEMENTS_CHAUD],
        }),
        richeArticle("the-infusion", "Thé ou infusion", 5, {
          options: [groupeChoix("boisson", "Boisson", ["Thé", "Infusion"], { obligatoire: true })],
        }),
        richeArticle("cafe-latte", "Café latte", 5, {
          description: "Mousse de lait",
          detail: "35 cl",
          options: [RICHE_SUPPLEMENTS_CHAUD],
        }),
      ],
    },
    {
      id: "boissons-fraiches",
      name: "Boissons fraîches",
      boissons: true,
      tagline: "Supplément tranche ou sirop\u00a0: 0,50\u00a0€",
      items: [
        richeArticle("coca-cola", "Coca-Cola", 4.5, {
          detail: "33 cl",
          options: [
            groupeChoix("version", "Version", ["Coca-Cola", "Coca-Cola sans sucres", "Coca-Cola cherry"], {
              obligatoire: true,
            }),
          ],
        }),
        richeArticle("sodas", "Fanta, Sprite, Fuzetea, Tropico", 4.5, {
          detail: "25 cl",
          options: [groupeChoix("soda", "Boisson", ["Fanta", "Sprite", "Fuzetea", "Tropico"], { obligatoire: true })],
        }),
        richeArticle("pago", "Pago", 4.5, {
          detail: "20 cl",
          options: [
            groupeChoix("parfum", "Parfum", ["Pomme", "Orange", "Tomate", "ACE", "Ananas", "Abricot", "Fraise"], {
              obligatoire: true,
            }),
          ],
        }),
        richeArticle("pago-pop", "Pago Pop", 5, {
          detail: "25 cl",
          options: [groupeChoix("parfum", "Parfum", ["Citron hibiscus", "Fraise menthe"], { obligatoire: true })],
        }),
        richeArticle("perrier", "Perrier", 4.5, { detail: "33 cl" }),
        richeArticle("orangina", "Orangina", 4.5, { detail: "25 cl" }),
        richeArticle("schweppes", "Schweppes tonic ou agrumes", 4.5, {
          detail: "25 cl",
          options: [groupeChoix("version", "Version", ["Tonic", "Agrumes"], { obligatoire: true })],
        }),
        richeArticle("ginger-beer", "Ginger beer", 4.5, { detail: "25 cl" }),
        richeArticle("red-bull", "Red Bull", 5, { detail: "25 cl" }),
        richeArticle("sirop", "Sirop", 3.5, {
          detail: "35 cl",
          options: [groupeChoix("parfum", "Parfum", RICHE_SIROPS, { obligatoire: true })],
        }),
        richeArticle("limonade", "Limonade pression", 4.2, { detail: "35 cl" }),
        richeArticle("diabolo", "Diabolo", 4.5, {
          description: "Limonade et sirop au choix",
          detail: "35 cl",
          options: [groupeChoix("parfum", "Sirop", RICHE_SIROPS, { obligatoire: true })],
        }),
        richeFormats(
          "vittel",
          "Vittel",
          [
            ["25 cl", 3.6],
            ["50 cl", 4.9],
            ["1 l", 6.5],
          ],
          { description: "Les 50 cl et 1 l sont réservés à la restauration" }
        ),
        richeFormats(
          "san-pellegrino",
          "San Pellegrino",
          [
            ["50 cl", 4.9],
            ["1 l", 6.5],
          ],
          { description: "Réservé à la restauration" }
        ),
      ],
    },
    {
      id: "jus-boissons-glacees",
      name: "Jus & boissons glacées",
      boissons: true,
      items: [
        richeArticle("jus-orange", "Jus pressé orange", 5, { detail: "33 cl" }),
        richeArticle("jus-pamplemousse", "Jus pressé pamplemousse", 5, { detail: "33 cl" }),
        richeArticle("jus-orange-banane", "Jus pressé orange & banane", 6, { detail: "33 cl" }),
        richeArticle("jus-citron", "Jus pressé citron", 5, { detail: "33 cl" }),
        richeArticle("the-glace", "Thé glacé maison", 5.5, { detail: "40 cl" }),
        richeArticle("citronnade", "Citronnade maison", 6, { detail: "40 cl" }),
        richeArticle("citronnade-menthe", "Citronnade menthe, gingembre", 6, { detail: "40 cl" }),
        richeArticle("milkshake", "Milkshake", 7.5, {
          description: "Vanille, fraise ou coco",
          detail: "40 cl",
          options: [groupeChoix("parfum", "Parfum", ["Vanille", "Fraise", "Coco"], { obligatoire: true })],
        }),
        richeArticle("frappe", "Frappé", 6, { description: "Café latte", detail: "40 cl" }),
      ],
    },
    {
      id: "cocktails-signature",
      name: "Cocktails signature",
      boissons: true,
      tagline: "4 cl d'alcool",
      items: [
        richeAlcool("l-intox-original", "L'Intox Original", 13, {
          description: "Tequila infusée aux poivrons, tabasco, carotte, curcuma, gingembre, Perrier",
        }),
        richeAlcool("pink-riche", "Pink Riche", 13, {
          description: "Gin infusé à la verveine, jus de citron vert, fraise, framboise, pêche blanche",
        }),
        richeAlcool("azzura-mule", "Azzura Mule", 13, {
          description: "Gin infusé à la verveine, ginger beer, fraise, melon, banane, citron, vanille",
        }),
        richeAlcool("sweet-purple", "Sweet Purple", 13, {
          description: "Vodka, menthe, jus de citron vert, framboise, violette, mûre, Perrier",
        }),
        richeAlcool("gentleman-sour", "Gentleman Sour", 13, {
          description: "Whisky infusé au romarin, bitter, sirop vanillé",
        }),
        richeAlcool("spicy-flash", "Spicy Flash", 13, {
          description: "Rhum ambré, jus de passion, jus de citron, abricot, citron, épices",
        }),
      ],
    },
    {
      id: "spritz",
      name: "Cocktails Spritz",
      boissons: true,
      tagline: "4 cl d'alcool",
      items: [
        richeAlcool("spritz", "Spritz", 9, {
          description: "Aperol, Campari ou Limoncello",
          options: [groupeChoix("base", "Base", ["Aperol", "Campari", "Limoncello"], { obligatoire: true })],
        }),
        richeAlcool("hugo", "Hugo", 11, { description: "St-Germain ou équivalent" }),
      ],
    },
    {
      id: "cocktails",
      name: "Cocktails",
      boissons: true,
      tagline: "4 cl d'alcool · supplément purée fraise ou pêche\u00a0: 0,50\u00a0€",
      items: [
        richeAlcool("caipirinha", "Caïpirinha", 10),
        richeAlcool("cosmopolitan", "Cosmopolitan", 10, {
          description: "Vodka, triple sec, jus de cranberry, jus de citron vert",
        }),
        richeAlcool("negroni", "Negroni", 10, { description: "Gin, vermouth rouge, Campari" }),
        richeAlcool("moscow-mule", "Moscow Mule", 10, { description: "Vodka, ginger beer, citron vert" }),
        richeAlcool("london-mule", "London Mule", 10, { description: "Gin, ginger beer, citron vert" }),
        richeAlcool("dark-n-stormy", "Dark'n Stormy", 10, { description: "Rhum ambré, citron vert, ginger beer" }),
        richeAlcool("mojito", "Mojito", 10, { description: "Rhum, citron vert, menthe fraîche, cassonade, soda" }),
        richeAlcool("pina-colada", "Piña Colada", 10, {
          description: "Rhum, crème de coco, sirop de vanille, Malibu, ananas",
        }),
        richeAlcool("sex-on-the-beach", "Sex on the Beach", 10, {
          description: "Vodka, orange, cranberry, crème de pêche",
        }),
        richeAlcool("daiquiri", "Daïquiri", 10, { description: "Rhum, citron vert, sirop de sucre de canne" }),
        richeAlcool("margarita", "Margarita", 10, { description: "Tequila, triple sec, citron vert" }),
        richeAlcool("vodka-red-bull", "Vodka Red Bull", 10),
        richeAlcool("espresso-martini", "Espresso Martini", 13, { description: "Vodka, liqueur de café, café" }),
        richeAlcool("pornstar-martini", "Pornstar Martini", 13, {
          description: "Vodka, vanille, liqueur de fruit de la passion, jus de fruit de la passion, jus de citron",
        }),
      ],
    },
    {
      id: "cocktails-sans-alcool",
      name: "Cocktails sans alcool",
      boissons: true,
      items: [
        richeArticle("virgin-mojito", "Virgin Mojito", 8, { description: "Citron vert, sirop de mojito, menthe fraîche" }),
        richeArticle("virgin-colada", "Virgin Colada", 8, {
          description: "Jus d'ananas, crème de coco, sirop de vanille",
        }),
        richeArticle("virgin-sex-on-the-beach", "Virgin Sex on the Beach", 8, {
          description: "Jus d'orange, jus de cranberry",
        }),
        richeArticle("peace-and-love", "Peace & Love", 8, { description: "Violette, jasmin, hibiscus" }),
      ],
    },
    {
      id: "bieres",
      name: "Bières",
      boissons: true,
      tagline: "Pression 25 cl ou 50 cl · supplément Picon 1,00\u00a0€, sirop 0,50\u00a0€",
      items: [
        richePression("pelforth-blonde", "Pelforth blonde 5,5°", 3.9, 7.2),
        richePression("affligem-abbaye", "Abbaye Affligem 6,7°", 4.5, 8.2),
        richePression("affligem-blanche", "Affligem blanche 5°", 4.5, 8.2),
        richePression("lagunitas-ipa", "Lagunitas IPA 6,2°", 4.9, 8.8),
        richePression("chouffe-blonde", "Chouffe blonde 8°", 4.9, 9.5),
        richePression("cherry-chouffe", "Cherry Chouffe 8°", 6, 10.8),
        richePression("desperados", "Desperados", 5.5, 9.9),
        richeAlcool("pelforth-brune", "Pelforth brune 6,5°", 6, { detail: "33 cl" }),
        richeAlcool("cidre-brut", "Cidre brut", 5.5, { detail: "27,5 cl" }),
        richeArticle("heineken-zero", "Heineken 0°", 5.5, { description: "Sans alcool", detail: "33 cl" }),
      ],
    },
    {
      id: "vins",
      name: "Vins & bulles",
      boissons: true,
      items: [
        richeFormats(
          "vin-pichet",
          "Vin de pays au pichet",
          [
            ["25 cl", 8.5],
            ["50 cl", 14.5],
          ],
          {
            description: "Rouge, rosé ou blanc",
            options: [groupeChoix("couleur", "Couleur", ["Rouge", "Rosé", "Blanc"], { obligatoire: true })],
            ...ALCOOL,
          }
        ),
        richeVin("clapiere-jardin-de-jules", "Domaine de la Clapière «\u00a0Jardin de Jules\u00a0»", "Rouge · Pays d'Oc 2023", 5, 24.9),
        richeVin("loup-dans-la-bergerie", "Le Loup dans la Bergerie", "Rouge · IGP Hérault", 6, 28.9),
        richeVin("chapelle-de-venenge", "La Chapelle de Venenge", "Rouge · AOP Brouilly", 6, 28.9),
        richeAlcool("chateau-laroque-la-cupa", "Château Laroque «\u00a0La Cupa\u00a0»", 48.9, {
          description: "Rouge · AOP Pic Saint-Loup",
          detail: "75 cl",
        }),
        richeAlcool("cigalus", "Cigalus", 59.9, { description: "Rouge · IGP Aude Hauterive", detail: "75 cl" }),
        richeAlcool("puech-haut-tete-de-belier-rouge", "Puech-Haut «\u00a0Tête de Bélier\u00a0» rouge", 62.9, {
          description: "Rouge · AOP Coteaux du Languedoc",
          detail: "75 cl",
        }),
        richeVin("clapiere-jalade", "Domaine de la Clapière «\u00a0Jalade\u00a0»", "Rosé · Pays d'Oc 2023", 5, 24.9),
        richeVin("puech-haut-argali", "Château Puech-Haut «\u00a0Argali\u00a0»", "Rosé · IGP Pays d'Oc", 7.5, 33.9),
        richeVin("chateau-minuty", "Château Minuty", "Rosé · Côtes de Provence", 7.5, 34.9),
        richeAlcool("chateau-minuty-magnum", "Château Minuty magnum", 64.9, {
          description: "Rosé · Côtes de Provence",
          detail: "1,5 l",
        }),
        richeVin("clapiere-figuerette", "Domaine de la Clapière «\u00a0Figuerette\u00a0»", "Blanc · Pays d'Oc 2023", 5, 24.9),
        richeVin("xviii-saint-luc", "XVIII Saint Luc moelleux", "Blanc · IGP Côtes de Gascogne", 5, 24.9),
        richeVin("jamelles-viognier", "Luc les Jamelles, Viognier", "Blanc · IGP d'Oc", 5.5, 26.9),
        richeVin("emalieres-macon-villages", "Les Émalières, Mâcon-Villages", "Blanc · Bourgogne", 6.5, 30.9),
        richeAlcool("puech-haut-tete-de-belier-blanc", "Puech-Haut «\u00a0Tête de Bélier\u00a0» blanc", 59.9, {
          description: "Blanc · AOP Coteaux du Languedoc",
          detail: "75 cl",
        }),
        richeFormats(
          "prosecco",
          "Prosecco",
          [
            ["Verre 12 cl", 8],
            ["Bouteille 75 cl", 30],
          ],
          ALCOOL
        ),
        richeFormats(
          "champagne",
          "Champagne",
          [
            ["Verre 12 cl", 10],
            ["Bouteille 75 cl", 59],
          ],
          ALCOOL
        ),
      ],
    },
    {
      id: "aperitifs",
      name: "Apéritifs",
      boissons: true,
      items: [
        richeAlcool("ricard-pastis", "Ricard, Pastis", 3.5, { detail: "2 cl" }),
        richeAlcool("suze", "Suze", 6, { detail: "4 cl" }),
        richeAlcool("porto-muscat", "Porto, Muscat", 5, {
          detail: "8 cl",
          options: [groupeChoix("vin", "Apéritif", ["Porto", "Muscat"], { obligatoire: true })],
        }),
        richeAlcool("campari", "Campari", 6, { detail: "6 cl" }),
        richeAlcool("martini", "Martini blanc ou rouge", 6, {
          detail: "6 cl",
          options: [groupeChoix("version", "Version", ["Blanc", "Rouge"], { obligatoire: true })],
        }),
        richeAlcool("kir", "Kir", 6, {
          description: "Cassis, pêche, framboise ou mûre",
          detail: "12 cl",
          options: [groupeChoix("parfum", "Parfum", ["Cassis", "Pêche", "Framboise", "Mûre"], { obligatoire: true })],
        }),
        richeAlcool("americano", "Americano", 8.5, { detail: "7 cl" }),
        richeAlcool("campari-perrier", "Campari Perrier", 6.5, { detail: "6 cl" }),
      ],
    },
    {
      id: "spiritueux",
      name: "Spiritueux",
      boissons: true,
      tagline: "4 cl",
      items: [
        ...richeSpiritueux("Whisky", [
          ["glenfiddich", "Glenfiddich", 10],
          ["chivas", "Chivas", 10],
          ["jack-daniels", "Jack Daniel's", 10],
          ["jack-daniels-honey", "Jack Daniel's Honey", 10],
          ["jim-beam", "Jim Beam", 10],
          ["nikka", "Nikka", 12],
          ["black-label", "Black Label", 12],
        ]),
        ...richeSpiritueux("Vodka", [
          ["belvedere", "Belvedere", 10],
          ["grey-goose", "Grey Goose", 10],
        ]),
        ...richeSpiritueux("Gin", [
          ["hendricks", "Hendrick's", 11],
          ["citadelle", "Citadelle", 12],
          ["bombay", "Bombay", 10],
          ["tanqueray", "Tanqueray", 10],
        ]),
        ...richeSpiritueux("Rhum", [
          ["diplomatico-reserva", "Diplomático Reserva", 11],
          ["havana-7-ans", "Havana 7 ans", 10],
          ["pacto-navio", "Pacto Navio", 11],
          ["don-papa-7-ans", "Don Papa 7 ans", 11],
          ["dictador-12-ans", "Dictador 12 ans", 12],
        ]),
      ],
    },
    {
      id: "digestifs",
      name: "Digestifs",
      boissons: true,
      items: [
        richeAlcool("calvados", "Calvados", 9, { detail: "4 cl" }),
        richeAlcool("armagnac-10-ans", "Armagnac 10 ans", 9.5, { detail: "4 cl" }),
        richeAlcool("cognac-vsop", "Cognac VSOP", 10, { detail: "4 cl" }),
        richeAlcool("poire-williams", "Poire Williams", 8.5, { detail: "4 cl" }),
        richeAlcool("get", "Get 27 / 31", 8.5, {
          detail: "6 cl",
          options: [groupeChoix("version", "Version", ["Get 27", "Get 31"], { obligatoire: true })],
        }),
        richeAlcool("limoncello", "Limoncello", 8.5, { detail: "6 cl" }),
        richeAlcool("baileys", "Bailey's", 8.5, { detail: "6 cl" }),
        richeAlcool("genepi", "Génépi", 8.5, { detail: "6 cl" }),
        richeAlcool("disaronno", "Disaronno", 9, { detail: "4 cl" }),
      ],
    },
  ],
};

const LE_CLUB_PHOTOS: Partial<Record<string, string>> = {
  absolut: pexels("4167425/pexels-photo-4167425.jpeg", 800),
  "jack-daniels": pexels("27393242/pexels-photo-27393242.jpeg", 800),
  "chivas-12": pexels("194925/pexels-photo-194925.jpeg", 800),
  "moet-imperial": pexels("5340997/pexels-photo-5340997.jpeg", 800),
  "moet-ice": pexels("1835743/pexels-photo-1835743.jpeg", 800),
  "veuve-clicquot": pexels("33674006/pexels-photo-33674006.jpeg", 800),
  mojito: pexels("37662776/pexels-photo-37662776.jpeg", 800),
  "sex-on-the-beach": pexels("37662778/pexels-photo-37662778.jpeg", 800),
  "pina-colada": pexelsRecadre("33221989/pexels-photo-33221989.jpeg", 800),
  "moscow-mule": pexels("19766950/pexels-photo-19766950.jpeg", 800),
  "tequila-sunrise": pexels("37662774/pexels-photo-37662774.jpeg", 800),
  spritz: pexels("32418599/pexels-photo-32418599.jpeg", 800),
  "long-island": pexels("6680479/pexels-photo-6680479.jpeg", 800),
  verre: pexels("8879617/pexels-photo-8879617.jpeg", 800),
  shooter: pexels("16064240/pexels-photo-16064240.jpeg", 800),
  heineken: pexels("4336734/pexels-photo-4336734.jpeg", 800),
  desperados: pexels("16363708/pexels-photo-16363708.jpeg", 800),
  corona: pexels("17765844/pexels-photo-17765844.jpeg", 800),
  soda: pexels("15205136/pexels-photo-15205136.jpeg", 800),
  "red-bull": pexels("17423270/pexels-photo-17423270.jpeg", 800),
  jus: pexels("11009214/pexels-photo-11009214.jpeg", 800),
  eau: pexels("11206902/pexels-photo-11206902.jpeg", 800),
};

const clubArticle = (id: string, name: string, price: number, extra: Partial<MenuItem> = {}): MenuItem => ({
  id,
  name,
  price,
  image: LE_CLUB_PHOTOS[id],
  ...extra,
});

const clubAlcool = (id: string, name: string, price: number, extra: Partial<MenuItem> = {}) =>
  clubArticle(id, name, price, { ...ALCOOL, ...extra });

const CLUB_SOFTS = ["Coca-Cola", "Coca-Cola Zéro", "Sprite", "Schweppes Tonic", "Jus d'orange", "Jus de cranberry"];
const CLUB_ALCOOLS_VERRE = ["Vodka", "Gin", "Rhum blanc", "Rhum ambré", "Whisky", "Tequila"];
const CLUB_SHOOTERS = groupeChoix("shooter", "Shooter", ["Vodka", "Tequila", "Jägermeister", "Rhum", "Get 27"], {
  obligatoire: true,
});

/** La bouteille arrive en carré avec ses softs, au choix, et le seau à glace. */
const clubBouteille = (id: string, name: string, price: number, description: string) =>
  clubAlcool(id, name, price, {
    description,
    detail: "70 cl",
    options: [
      groupeChoix("softs", "Softs servis avec", CLUB_SOFTS, { obligatoire: true, multiple: true }),
      groupeChoix("supplement", "Supplément", [["4 Red Bull", 20]], { multiple: true }),
    ],
  });

/*
 * Le Club — discothèque, 5 rue du Grand Saint-Jean (Montpellier, près de la
 * gare Saint-Roch), à la place du Cargo depuis 2022 ; exploitée par TKG.
 * Aucune carte publiée nulle part : celle-ci est un exemple de carte de club
 * montpelliérain, posé à la demande de l'utilisateur pour la démo — chaque
 * article et chaque prix est à remplacer par leur carte. Sources et
 * questions : demos/le-club/profile.json.
 */
const leClub: Restaurant = {
  slug: "le-club",
  name: "Le Club",
  suivi: true,
  tagline: "Discothèque · Montpellier",
  address: "5 Rue du Grand Saint-Jean, 34000 Montpellier",
  phone: "+33 6 75 25 74 89",
  // Noxway ; InfoClapas (2022) disait du lundi au samedi dès 23h30 : à confirmer.
  hours: "Du mercredi au samedi, minuit–⁠5h",
  highlights: ["Mercredi au samedi, minuit–⁠5h", "À deux pas de la gare Saint-Roch"],
  categories: [
    {
      id: "bouteilles",
      name: "Bouteilles",
      tagline: "Servies en carré, avec softs et seau à glace",
      boissons: true,
      items: [
        clubBouteille("absolut", "Absolut", 110, "Vodka"),
        clubBouteille("grey-goose", "Grey Goose", 160, "Vodka"),
        clubBouteille("bombay-sapphire", "Bombay Sapphire", 120, "Gin"),
        clubBouteille("havana-club-3", "Havana Club 3 ans", 110, "Rhum"),
        clubBouteille("jack-daniels", "Jack Daniel's", 120, "Whisky"),
        clubBouteille("chivas-12", "Chivas Regal 12 ans", 150, "Whisky"),
        clubBouteille("patron-silver", "Patrón Silver", 170, "Tequila"),
      ],
    },
    {
      id: "champagne",
      name: "Champagne",
      boissons: true,
      items: [
        clubAlcool("moet-imperial", "Moët & Chandon Impérial Brut", 120, { detail: "75 cl" }),
        clubAlcool("moet-ice", "Moët & Chandon Ice Impérial", 140, { detail: "75 cl" }),
        clubAlcool("veuve-clicquot", "Veuve Clicquot Brut", 140, { detail: "75 cl" }),
        clubAlcool("ruinart-blanc-de-blancs", "Ruinart Blanc de Blancs", 190, { detail: "75 cl" }),
      ],
    },
    {
      id: "cocktails",
      name: "Cocktails",
      boissons: true,
      items: [
        clubAlcool("mojito", "Mojito", 10, {
          description: "Rhum blanc, citron vert, menthe fraîche, sucre de canne, eau gazeuse",
          options: [groupeChoix("parfum", "Parfum", PARFUMS_FRUITS, { aucun: "Nature", supplement: 1 })],
        }),
        clubAlcool("sex-on-the-beach", "Sex on the Beach", 10, {
          description: "Vodka, liqueur de pêche, jus d'orange, jus de cranberry",
        }),
        clubAlcool("pina-colada", "Piña Colada", 10, { description: "Rhum blanc, crème de coco, jus d'ananas" }),
        clubAlcool("moscow-mule", "Moscow Mule", 11, { description: "Vodka, ginger beer, citron vert" }),
        clubAlcool("tequila-sunrise", "Tequila Sunrise", 10, { description: "Tequila, jus d'orange, grenadine" }),
        clubAlcool("spritz", "Spritz", 9, { description: "Apérol, prosecco, eau gazeuse" }),
        clubAlcool("long-island", "Long Island Iced Tea", 12, {
          description: "Vodka, gin, rhum, tequila, triple sec, citron, Coca-Cola",
        }),
      ],
    },
    {
      id: "verres",
      name: "Verres",
      tagline: "Un alcool, un soft",
      boissons: true,
      items: [
        clubAlcool("verre", "Verre alcool + soft", 9, {
          printName: "Verre",
          options: [
            groupeChoix("alcool", "Alcool", CLUB_ALCOOLS_VERRE, { obligatoire: true }),
            groupeChoix("soft", "Soft", [...CLUB_SOFTS, ["Red Bull", 2]], { obligatoire: true }),
          ],
        }),
      ],
    },
    {
      id: "shooters",
      name: "Shooters",
      boissons: true,
      items: [
        clubAlcool("shooter", "Shooter", 4, { options: [CLUB_SHOOTERS] }),
        clubAlcool("jagerbomb", "Jägerbomb", 7, { description: "Jägermeister et Red Bull" }),
        clubAlcool("plateau-shooters", "Plateau de 10 shooters", 35, { options: [CLUB_SHOOTERS] }),
      ],
    },
    {
      id: "bieres",
      name: "Bières",
      boissons: true,
      items: [
        clubAlcool("heineken", "Heineken", 7),
        clubAlcool("desperados", "Desperados", 8),
        clubAlcool("corona", "Corona", 8),
      ],
    },
    {
      id: "softs",
      name: "Softs",
      boissons: true,
      items: [
        clubArticle("soda", "Soda", 5, {
          options: [
            groupeChoix("soda", "Soda", ["Coca-Cola", "Coca-Cola Zéro", "Sprite", "Orangina", "Schweppes Tonic"], {
              obligatoire: true,
            }),
          ],
        }),
        clubArticle("red-bull", "Red Bull", 6),
        clubArticle("jus", "Jus de fruits", 5, {
          options: [groupeChoix("jus", "Jus", ["Orange", "Ananas", "Cranberry"], { obligatoire: true })],
        }),
        clubArticle("eau", "Eau minérale", 4, {
          options: [groupeChoix("eau", "Eau", ["Plate", "Gazeuse"], { obligatoire: true })],
        }),
      ],
    },
  ],
};

/*
 * L'Entrepôt Complexe — le club de musique urbaine du 4 rue du Puech Radier,
 * à Lattes. Aucune carte publiée : celle-ci est une carte type de club, à
 * valider avec la direction. Seuls viennent d'une source le cocktail à 15 €
 * (Privateaser), la Vodka Red Bull à 10 € (Noxway), la bouteille de Captain
 * Morgan à 140 € avec 1 L de Pepsi (avis Google, 2023) ; le reste, marques et
 * prix compris, est à confirmer. Sources et questions :
 * demos/l-entrepot/profile.json.
 */

/** Les bouteilles de marque restent sans photo : une étiquette de stock en contredirait le nom. */
const ENTREPOT_PHOTOS: Partial<Record<string, string>> = {
  mojito: pexelsRecadre("37662775/pexels-photo-37662775.jpeg", 800),
  "pina-colada": pexelsRecadre("10986589/pexels-photo-10986589.jpeg", 800),
  "sex-on-the-beach": pexels("4279113/pexels-photo-4279113.jpeg", 800),
  caipirinha: pexels("29095925/pexels-photo-29095925.jpeg", 800),
  planteur: pexelsRecadre("27100878/pexels-photo-27100878.jpeg", 800),
  "tequila-sunrise": pexels("10986584/pexels-photo-10986584.jpeg", 800),
  "virgin-mojito": pexels("7259054/pexels-photo-7259054.jpeg", 800),
  "vodka-red-bull": pexels("16444383/pexels-photo-16444383.jpeg", 800),
  "long-drink": pexels("13061331/pexels-photo-13061331.jpeg", 800),
  shooter: pexels("7282724/pexels-photo-7282724.jpeg", 800),
  jagerbomb: pexels("31682849/pexels-photo-31682849.jpeg", 800),
  "plateau-shooters": pexels("35107450/pexels-photo-35107450.jpeg", 800),
  heineken: pexels("4336734/pexels-photo-4336734.jpeg", 800),
  desperados: pexels("16363708/pexels-photo-16363708.jpeg", 800),
  corona: pexels("2286972/pexels-photo-2286972.jpeg", 800),
  pepsi: pexels("30554816/pexels-photo-30554816.jpeg", 800),
  "pepsi-max": pexels("8879617/pexels-photo-8879617.jpeg", 800),
  "seven-up": pexels("9996446/pexels-photo-9996446.jpeg", 800),
  "ice-tea": pexels("11009226/pexels-photo-11009226.jpeg", 800),
  "jus-orange": pexels("17612821/pexels-photo-17612821.jpeg", 800),
  "jus-ananas": pexels("11009200/pexels-photo-11009200.jpeg", 800),
  eau: pexels("9996342/pexels-photo-9996342.jpeg", 800),
  "red-bull": pexels("17423276/pexels-photo-17423276.jpeg", 800),
};

const entrepotArticle = (id: string, name: string, price: number, extra: Partial<MenuItem> = {}): MenuItem => ({
  id,
  name,
  price,
  image: ENTREPOT_PHOTOS[id],
  ...extra,
});

const entrepotAlcool = (id: string, name: string, price: number, extra: Partial<MenuItem> = {}) =>
  entrepotArticle(id, name, price, { ...ALCOOL, ...extra });

/** Les softs du bar, servis aussi en diluant : la maison sert Pepsi. */
const ENTREPOT_DILUANTS = ["Pepsi", "Pepsi Max", "7Up", "Jus d'orange", "Jus d'ananas", "Tonic"];

const ENTREPOT_SHOW = ["Show cierges magiques", 20] as const;

/**
 * Une bouteille : son seul format s'affiche à côté du nom ; plusieurs (70 cl,
 * magnum) se choisissent, chacun à son prix.
 */
const entrepotBouteille = (id: string, name: string, prix: Formats, extra: Partial<MenuItem>) =>
  prix.length === 1
    ? entrepotAlcool(id, name, prix[0][1], { detail: prix[0][0], ...extra })
    : articleFormats(id, name, prix, { ...ALCOOL, ...extra }, ["format", "Format"]);

/** Un alcool fort : 1 L de diluant compris, le reste en plus. */
const entrepotSpiritueux = (id: string, name: string, description: string, prix: Formats) =>
  entrepotBouteille(id, name, prix, {
    description,
    options: [
      groupeChoix("diluant", "Diluant (1 L compris)", ENTREPOT_DILUANTS, { obligatoire: true }),
      groupeChoix("extras", "En plus", [["Red Bull ×4", 24], ["1 L de diluant en plus", 10], ENTREPOT_SHOW], {
        multiple: true,
      }),
    ],
  });

const entrepotChampagne = (id: string, name: string, prix: Formats) =>
  entrepotBouteille(id, name, prix, {
    options: [groupeChoix("extras", "En plus", [ENTREPOT_SHOW], { multiple: true })],
  });

const ENTREPOT_SHOOTERS = groupeChoix("alcool", "Alcool", ["Vodka", "Tequila", "Jägermeister", "Get 27"], {
  obligatoire: true,
});

const lEntrepot: Restaurant = {
  slug: "l-entrepot",
  name: "L'Entrepôt",
  brandName: "L'Entrepôt Complexe",
  suivi: true,
  tagline: "Club · Musique urbaine · Lattes",
  // Le mot-symbole de leur site (lentrepotcomplexe.com), palmier compris.
  logo: "/l-entrepot/logo.webp",
  logoIsName: true,
  icons: { tab: "/l-entrepot/favicon.png", homeScreen: "/l-entrepot/icon.png" },
  themeColor: "#0b0b12",
  address: "4 rue du Puech Radier, 34970 Lattes",
  phone: "07 88 76 35 16",
  // Leur programme d'octobre 2026 : jeudi, vendredi, samedi et dimanche soir.
  hours: "Du jeudi au dimanche, 23h–⁠7h",
  highlights: ["Dancehall · Shatta · Bouyon · Afrobeat", "Entrée 15 € avec 1 conso alcool ou 2 softs"],
  ticker: [
    { text: "Entrée gratuite pour les filles avec 1 cocktail offert, horaire selon la soirée", tone: "accent" },
    { text: "La référence de la musique urbaine dans la région", tone: "brand" },
    { text: "Plus de 300 m d'écrans LED" },
  ],
  categories: [
    {
      id: "bouteilles",
      name: "Bouteilles",
      tagline: "Servies à votre table, avec 1 L de diluant au choix",
      boissons: true,
      items: [
        entrepotSpiritueux("absolut", "Absolut", "Vodka", [["70 cl", 150]]),
        entrepotSpiritueux("grey-goose", "Grey Goose", "Vodka", [
          ["70 cl", 190],
          ["Magnum 1,5 L", 380],
        ]),
        entrepotSpiritueux("belvedere", "Belvedere", "Vodka", [["70 cl", 200]]),
        entrepotSpiritueux("jack-daniels", "Jack Daniel's", "Tennessee whiskey", [["70 cl", 160]]),
        entrepotSpiritueux("chivas-12", "Chivas Regal 12 ans", "Blended scotch whisky", [["70 cl", 180]]),
        entrepotSpiritueux("captain-morgan", "Captain Morgan", "Rhum épicé", [["70 cl", 140]]),
        entrepotSpiritueux("bombay-sapphire", "Bombay Sapphire", "Gin", [["70 cl", 150]]),
        entrepotSpiritueux("patron-silver", "Patrón Silver", "Tequila", [["70 cl", 200]]),
      ],
    },
    {
      id: "champagnes",
      name: "Champagnes",
      tagline: "Servis frappés, en seau à glace",
      boissons: true,
      items: [
        entrepotChampagne("moet-imperial", "Moët & Chandon Brut Impérial", [
          ["75 cl", 150],
          ["Magnum 1,5 L", 300],
        ]),
        entrepotChampagne("moet-ice", "Moët & Chandon Ice Impérial", [["75 cl", 180]]),
        entrepotChampagne("veuve-clicquot", "Veuve Clicquot Brut", [["75 cl", 170]]),
        entrepotChampagne("ruinart-blanc", "Ruinart Blanc de Blancs", [["75 cl", 250]]),
      ],
    },
    {
      id: "cocktails",
      name: "Cocktails",
      boissons: true,
      items: [
        entrepotAlcool("mojito", "Mojito", 15, {
          description: "Rhum blanc, citron vert, menthe fraîche, sucre de canne, eau gazeuse",
        }),
        entrepotAlcool("pina-colada", "Piña Colada", 15, { description: "Rhum blanc, crème de coco, jus d'ananas" }),
        entrepotAlcool("sex-on-the-beach", "Sex on the Beach", 15, {
          description: "Vodka, liqueur de pêche, jus d'orange, jus de cranberry",
        }),
        entrepotAlcool("caipirinha", "Caïpirinha", 15, { description: "Cachaça, citron vert, sucre de canne" }),
        entrepotAlcool("planteur", "Planteur", 15, {
          description: "Rhum ambré, jus d'orange et d'ananas, sirop de canne, cannelle",
        }),
        entrepotAlcool("tequila-sunrise", "Tequila Sunrise", 15, {
          description: "Tequila, jus d'orange, sirop de grenadine",
        }),
        entrepotArticle("virgin-mojito", "Virgin Mojito", 10, {
          description: "Sans alcool : citron vert, menthe fraîche, sucre de canne, eau gazeuse",
        }),
      ],
    },
    {
      id: "long-drinks",
      name: "Long drinks",
      boissons: true,
      items: [
        entrepotAlcool("vodka-red-bull", "Vodka Red Bull", 10, { description: "Vodka, Red Bull" }),
        entrepotAlcool("long-drink", "Long drink", 10, {
          description: "Un alcool et un diluant au choix",
          options: [
            groupeChoix("alcool", "Alcool", ["Vodka", "Whisky", "Rhum", "Gin"], { obligatoire: true }),
            groupeChoix("diluant", "Diluant", [...ENTREPOT_DILUANTS, "Red Bull"], { obligatoire: true }),
          ],
        }),
      ],
    },
    {
      id: "shooters",
      name: "Shooters",
      boissons: true,
      items: [
        entrepotAlcool("shooter", "Shooter", 5, {
          description: "Vodka, tequila, Jägermeister ou Get 27",
          options: [ENTREPOT_SHOOTERS],
        }),
        entrepotAlcool("jagerbomb", "Jägerbomb", 8, { description: "Jägermeister, Red Bull" }),
        entrepotAlcool("plateau-shooters", "Plateau 10 shooters", 40, {
          description: "Dix shooters du même alcool, au choix",
          options: [ENTREPOT_SHOOTERS],
        }),
      ],
    },
    {
      id: "bieres",
      name: "Bières",
      boissons: true,
      items: [
        entrepotAlcool("heineken", "Heineken", 8),
        entrepotAlcool("desperados", "Desperados", 9),
        entrepotAlcool("corona", "Corona", 9),
      ],
    },
    {
      id: "softs",
      name: "Softs",
      boissons: true,
      items: [
        entrepotArticle("pepsi", "Pepsi", 5),
        entrepotArticle("pepsi-max", "Pepsi Max", 5),
        entrepotArticle("seven-up", "7Up", 5),
        entrepotArticle("ice-tea", "Lipton Ice Tea", 5),
        entrepotArticle("jus-orange", "Jus d'orange", 5),
        entrepotArticle("jus-ananas", "Jus d'ananas", 5),
        entrepotArticle("eau", "Eau plate", 4),
        entrepotArticle("red-bull", "Red Bull", 7),
      ],
    },
  ],
};

/*
 * Le Pulp (Pulp Garden) — la discothèque à ciel ouvert de l'Espace Latipolia,
 * route de Palavas à Lattes. Leur seule carte en ligne : « Tarifs
 * bouteilles », l'image d'un PDF de pulpgarden.fr (déposé en août 2021),
 * transcrite ligne à ligne (demos/le-pulp/docs/). Ni verre, ni cocktail, ni
 * soft : le club n'affiche que la bouteille. Sources et questions :
 * demos/le-pulp/profile.json.
 */
const PULP_PHOTOS: Partial<Record<string, string>> = {
  "jack-daniels": pexels("9387678/pexels-photo-9387678.jpeg", 800),
  "chivas-12": pexels("194925/pexels-photo-194925.jpeg", 800),
  smirnoff: pexels("19613748/pexels-photo-19613748.jpeg", 800),
  belvedere: unsplash("photo-1645784125144-4c06a561fc58", 800),
  // Une bouteille de 70 cl : aucune photo libre d'un magnum de Belvedere.
  "belvedere-magnum": unsplash("photo-1659717602925-a9d07c713e99", 800),
  havana: pexels("17687334/pexels-photo-17687334.jpeg", 800),
  bacardi: unsplash("photo-1561150169-371f366b828a", 800),
  "rhum-vieux-ambre": pexels("7254902/pexels-photo-7254902.jpeg", 800),
  malibu: pexels("16845292/pexels-photo-16845292.jpeg", 800),
  moet: pexels("3858809/pexels-photo-3858809.jpeg", 800),
  // La coiffe cuivrée du Rosé Impérial, dans son seau.
  "moet-rose": unsplash("photo-1643618829236-a23857519fb6", 800),
  "dom-perignon": pexels("12099317/pexels-photo-12099317.jpeg", 800),
  // Magnum et jéroboam : des bouteilles de 75 cl, faute de grands formats en photo libre.
  "moet-magnum": pexels("21221001/pexels-photo-21221001.jpeg", 800),
  "moet-jeroboam": unsplash("photo-1531821945121-d55c446bd62f", 800),
};

/** Une bouteille servie à table, sa contenance en pastille : TVA à 20 %. */
const pulpBouteille = (
  id: string,
  name: string,
  contenance: string,
  price: number,
  extra: Partial<MenuItem> = {}
): MenuItem => ({ id, name, price, detail: contenance, image: PULP_PHOTOS[id], ...ALCOOL, ...extra });

/** La même bouteille en 35 et 70 cl, chacune à son prix, comme sur la carte. */
const pulpContenances = (id: string, name: string, prix: Formats) =>
  articleFormats(id, name, prix, { image: PULP_PHOTOS[id], ...ALCOOL }, ["contenance", "Contenance"]);

const lePulp: Restaurant = {
  slug: "le-pulp",
  name: "Le Pulp",
  // Le logo : « pulp » en orange, « Garden » en vert dessous.
  brandName: "Pulp Garden",
  suivi: true,
  // Leur site : « Open air discothèque ».
  tagline: "Open air discothèque",
  // Le mot-symbole de leur site (logo_pulp_low.png) retracé en vectoriel, et
  // « Garden » relevé sur l'en-tête de la carte des bouteilles.
  logo: "/le-pulp/logo.svg",
  logoIsName: true,
  themeColor: "#050505",
  // Leur site : « La Calade - Route de Palavas 34970 LATTES ». Pas de numéro
  // de rue, ni au BODACC ni à la Base Adresse Nationale.
  address: "La Calade, Route de Palavas, 34970 Lattes",
  phone: "+33 6 76 57 77 22",
  hours: "Jeudi, vendredi, samedi & veille de jour férié dès\u00a023h",
  // Leur site, mot pour mot.
  highlights: ["Patio à la déco unique", "2 espaces bar et 1 dancefloor", "Entrée gratuite tous les soirs"],
  ticker: [
    { text: "Jeudi, vendredi, samedi & veille de jour férié dès 23h", tone: "accent" },
    { text: "Un incontournable des nuits montpelliéraines", tone: "brand" },
    { text: "Pour toute réservation : 06 76 57 77 22" },
    { text: "Ambiance généraliste clubbing" },
  ],
  categories: [
    {
      id: "whisky",
      name: "Whisky",
      boissons: true,
      items: [
        pulpContenances("jb", "JB", [
          ["35 cl", 65],
          ["70 cl", 130],
        ]),
        pulpBouteille("jack-daniels", "Jack Daniel's", "70 cl", 150),
        pulpBouteille("chivas-12", "Chivas Regal 12 ans", "70 cl", 150),
      ],
    },
    {
      id: "vodka",
      name: "Vodka",
      boissons: true,
      items: [
        pulpContenances("smirnoff", "Smirnoff", [
          ["35 cl", 65],
          ["70 cl", 130],
        ]),
        pulpBouteille("belvedere", "Belvedere", "70 cl", 150),
        pulpBouteille("belvedere-magnum", "Belvedere Magnum", "175 cl", 340),
        pulpBouteille("belvedere-jeroboam", "Belvedere Jéroboam", "300 cl", 700),
      ],
    },
    {
      id: "rhum-malibu",
      name: "Rhum & Malibu",
      boissons: true,
      items: [
        pulpBouteille("trois-rivieres", "3 Rivières", "70 cl", 150),
        pulpBouteille("havana", "Havana", "70 cl", 130),
        pulpBouteille("bacardi", "Bacardi", "70 cl", 130),
        pulpBouteille("rhum-vieux-ambre", "Rhum vieux ambré", "70 cl", 150),
        pulpBouteille("malibu", "Malibu", "70 cl", 130),
        // Une ligne de la carte, un prix pour les trois : la bouteille se choisit.
        pulpBouteille("gin-get-tequila", "Gin / Get 27 / Tequila", "70 cl", 130, {
          options: [groupeChoix("bouteille", "Bouteille", ["Gin", "Get 27", "Tequila"], { obligatoire: true })],
        }),
      ],
    },
    {
      id: "champagne",
      name: "Champagne",
      boissons: true,
      items: [
        pulpBouteille("moet", "Moët & Chandon", "75 cl", 130),
        pulpBouteille("moet-rose", "Moët & Chandon Rosé", "75 cl", 150),
        pulpBouteille("dom-perignon", "Dom Pérignon", "75 cl", 300),
        pulpBouteille("moet-magnum", "Magnum Moët & Chandon", "150 cl", 260),
        // La carte imprime « MOËT & CANDON » : coquille corrigée (profile.json, note 3).
        pulpBouteille("moet-jeroboam", "Jéroboam Moët & Chandon", "300 cl", 550),
      ],
    },
  ],
};

/** Leurs photos (la couverture du Bonbon, juin 2025, créditée au café), puis
 * des photos libres (Pexels, Unsplash) auditées sur planches. */
const GRACES_PHOTOS: Partial<Record<string, string>> = {
  "tomates-mozzarella": "/cafe-3-graces/tomates-mozzarella.jpg",
  "loup-grille": "/cafe-3-graces/loup-grille.jpg",
  "mozzarella-panee": pexels("35017889/pexels-photo-35017889.jpeg", 800),
  carpaccio: pexels("20105550/pexels-photo-20105550.jpeg", 800),
  "jambon-serrano": pexels("24706530/pexels-photo-24706530.jpeg", 800),
  "moules-gratinees": pexels("30279441/pexels-photo-30279441.jpeg", 800),
  "saumon-blinis": unsplash("photo-1577906096429-f73c2c312435", 800),
  houmous: pexels("11842151/pexels-photo-11842151.jpeg", 800),
  "patatas-bravas": pexels("38947752/pexels-photo-38947752.jpeg", 800),
  "planche-charcuterie": pexels("5975763/pexels-photo-5975763.jpeg", 800),
  "planche-mixte": pexels("22819916/pexels-photo-22819916.jpeg", 800),
  "planche-mediterranee": pexels("34026509/pexels-photo-34026509.jpeg", 800),
  seiches: pexels("27402124/pexels-photo-27402124.jpeg", 800),
  "tataki-thon": pexels("5638521/pexels-photo-5638521.jpeg", 800),
  risotto: pexels("31779539/pexels-photo-31779539.jpeg", 800),
  "cote-de-boeuf": pexels("31372405/pexels-photo-31372405.jpeg", 800),
  rosyne: unsplash("photo-1750943082685-f9c1e15b3273", 800),
  aglae: pexels("32538760/pexels-photo-32538760.jpeg", 800),
  thalie: pexels("36642832/pexels-photo-36642832.jpeg", 800),
  "burger-classic": unsplash("photo-1726039536976-404844bb2de8", 800),
  "burger-italien": pexels("10746615/pexels-photo-10746615.jpeg", 800),
  "burger-crispy": pexels("39042553/pexels-photo-39042553.jpeg", 800),
  "salade-cesar": unsplash("photo-1772302541031-a3b86115ba5d", 800),
  "salade-nordique": pexels("15735983/pexels-photo-15735983.jpeg", 800),
  tiramisu: pexels("35135510/pexels-photo-35135510.jpeg", 800),
  "creme-brulee": unsplash("photo-1615234435691-3b7bae98085e", 800),
  "brioche-perdue": pexels("18319031/pexels-photo-18319031.jpeg", 800),
  brownie: pexels("7491897/pexels-photo-7491897.jpeg", 800),
  // Recadrées par le serveur : au centre, le sujet était coupé ou dans un coin.
  "dame-blanche": pexelsRecadre("9510367/pexels-photo-9510367.jpeg", 800),
  "cafe-liegeois": pexels("22222985/pexels-photo-22222985.jpeg", 800),
  "chocolat-liegeois": unsplash("photo-1633881613747-e98695066141", 800),
  "banana-split": pexels("16560563/pexels-photo-16560563.jpeg", 800),
  "fraise-melba": unsplash("photo-1704006158609-2fe604e3e76f", 800),
  "peche-melba": pexels("11569101/pexels-photo-11569101.jpeg", 800),
  exotique: unsplash("photo-1703763253190-4af44c87a23e", 800),
  "glace-3-boules": pexels("1683546/pexels-photo-1683546.jpeg", 800),
  "coupe-3-graces": pexels("14608732/pexels-photo-14608732.jpeg", 800),
  "crepe-sucre": pexels("6811051/pexels-photo-6811051.jpeg", 800),
  "crepe-sucre-citron": pexels("6758320/pexels-photo-6758320.jpeg", 800),
  "crepe-confiture": pexels("12814862/pexels-photo-12814862.jpeg", 800),
  "crepe-chocolat": unsplash("photo-1515467837915-15c4777ba46a", 800),
  "crepe-nutella": pexels("30910215/pexels-photo-30910215.jpeg", 800),
  cappuccino: pexelsRecadre("37662747/pexels-photo-37662747.jpeg", 800),
  "chocolat-chaud": pexels("10406759/pexels-photo-10406759.jpeg", 800),
  latte: pexels("12580180/pexels-photo-12580180.jpeg", 800),
  "pinky-groovy": pexels("8169597/pexels-photo-8169597.jpeg", 800),
  "yellow-slow": pexelsRecadre("5817627/pexels-photo-5817627.jpeg", 800),
  mojito: pexels("13772509/pexels-photo-13772509.jpeg", 800),
  "pina-colada": pexels("28525186/pexels-photo-28525186.jpeg", 800),
  mule: unsplash("photo-1671536055547-99f21db6e297", 800),
  "aperol-spritz": pexels("36631083/pexels-photo-36631083.jpeg", 800),
  "espresso-martini": pexels("15866911/pexels-photo-15866911.jpeg", 800),
  "pornstar-martini": pexels("34760238/pexels-photo-34760238.jpeg", 800),
};

const gracesArticle = (id: string, name: string, price: number, extra: Partial<MenuItem> = {}): MenuItem => ({
  id,
  name,
  price,
  image: GRACES_PHOTOS[id],
  ...extra,
});

/** Une boisson alcoolisée : TVA à 20 %. */
const gracesAlcool = (id: string, name: string, price: number, extra: Partial<MenuItem> = {}) =>
  gracesArticle(id, name, price, { ...ALCOOL, ...extra });

const gracesFormats = (id: string, name: string, prix: Formats, extra: Partial<MenuItem> = {}) =>
  articleFormats(id, name, prix, { image: GRACES_PHOTOS[id], ...extra });

/** La boisson chaude d'une formule : la Formule douceur exclut le viennois et les lattes (« latte gourmand »). */
const GRACES_BOISSONS_CHAUDES = [
  "Café",
  "Allongé",
  "Noisette",
  "Double café",
  "Cappuccino",
  "Thé",
  "Infusion",
  "Chocolat chaud maison",
  "Latte machiatto",
];

/** La boisson chaude des formules du petit déjeuner, puis « Orange pressée supplément 2€ ». */
const GRACES_OPTIONS_PETIT_DEJ = [
  groupeChoix("boisson", "Boisson chaude", GRACES_BOISSONS_CHAUDES, { obligatoire: true }),
  groupeChoix("supplement", "Supplément", [["Orange pressée", 2]], { multiple: true }),
];

/**
 * Les softs de la Formule douceur : leur carte, hors orange pressée (exclue
 * par la formule) et hors Granini, sirop et diabolo, dont le parfum ne se
 * choisirait pas ici.
 */
const GRACES_SOFTS = [
  "Coca Regular",
  "Coca Zero",
  "Coca Cherry",
  "Perrier",
  "Fanta",
  "Sprite",
  "Fuze Tea",
  "Schweppes Tonic",
  "Schweppes Agrumes",
  "Oasis Tropical",
  "Ginger Beer",
  "Limonade tranche",
];

/** Les parfums imprimés sous le diabolo, repris pour le sirop à l'eau ; « pac », coupé à l'impression, attend le gérant. */
const GRACES_PARFUMS_SIROP = ["Fraise", "Menthe", "Citron", "Grenadine", "Pêche"];

/** Les onze parfums des boules glacées. */
const GRACES_PARFUMS_GLACE = [
  "Vanille",
  "Chocolat",
  "Fraise",
  "Café",
  "Caramel",
  "Mangue",
  "Passion",
  "Coco",
  "Citron",
  "Framboise",
  "Poire",
];

const GRACES_CREPES = ["Sucre", "Sucre citron", "Confiture", "Crème de marron", "Chocolat maison", "Nutella"];

const GRACES_SUPP_FRUIT = groupeChoix("supplement", "Supplément", [["Fruit", 1]], { multiple: true });

const gracesCrepe = (id: string, name: string, price: number) =>
  gracesArticle(id, name, price, {
    options: [groupeChoix("supplements", "Suppléments", [["Banane", 1], ["Chantilly", 1]], { multiple: true })],
  });

/** Une coupe : « boule de glace 1,50€ » en supplément. */
const gracesCoupe = (id: string, name: string, price: number, description: string) =>
  gracesArticle(id, name, price, {
    description,
    options: [groupeChoix("supplement", "Supplément", [["Boule de glace", 1.5]], { multiple: true })],
  });

/** Les boules glacées : un parfum par boule, la chantilly en supplément. */
const gracesGlace = (boules: number, price: number) => {
  const pluriel = boules > 1 ? "s" : "";
  return gracesArticle(`glace-${boules}-boule${pluriel}`, `Glace ${boules} boule${pluriel}`, price, {
    description: GRACES_PARFUMS_GLACE.join(", "),
    options: [
      ...["1re boule", "2e boule", "3e boule"]
        .slice(0, boules)
        .map((rang, i) =>
          groupeChoix(`boule-${i + 1}`, boules > 1 ? rang : "Parfum", GRACES_PARFUMS_GLACE, { obligatoire: true })
        ),
      groupeChoix("supplement", "Supplément", [["Chantilly", 1]], { multiple: true }),
    ],
  });
};

/** Une pression, 25 cl et 50 cl, « supp sirop 0,20€ / picon 0,80€ ». */
const gracesPression = (id: string, name: string, demi: number, pinte: number, extra: Partial<MenuItem> = {}) =>
  gracesFormats(
    id,
    name,
    [
      ["25 cl", demi],
      ["50 cl", pinte],
    ],
    {
      ...ALCOOL,
      ...extra,
      options: [
        ...(extra.options ?? []),
        groupeChoix("supplements", "Suppléments", [["Sirop", 0.2], ["Picon", 0.8]], { multiple: true }),
      ],
    }
  );

/** Un vin au verre (ou à la flûte) de 12 cl et à la bouteille de 75 cl ; sans prix au verre, la bouteille seule. */
const gracesVin = (id: string, name: string, description: string, bouteille: number, verre?: number, au = "Verre 12 cl") =>
  verre
    ? gracesFormats(
        id,
        name,
        [
          [au, verre],
          ["Bouteille 75 cl", bouteille],
        ],
        { description, ...ALCOOL }
      )
    : gracesAlcool(id, name, bouteille, { description, detail: "75 cl" });

/** Les spiritueux d'une famille, servis en 4 cl ; la famille en description, l'intertitre de la carte. */
const gracesSpiritueux = (famille: string, liste: readonly (readonly [id: string, name: string, price: number])[]) =>
  liste.map(([id, name, price]) => gracesAlcool(id, name, price, { description: famille, detail: "4 cl" }));

/*
 * Café 3 Grâces — la brasserie du 14 place de la Comédie (Montpellier), face
 * à la fontaine des Trois Grâces, reprise et rebaptisée en 2025 (SAS 3G). La
 * carte vient de leur site (cafe3graces.com, octobre 2026) : le texte de la
 * cuisine, mot pour mot, et les pages de leur carte imprimée (petit déjeuner,
 * boissons, glaces et crêpes). Sources et questions :
 * demos/cafe-3-graces/profile.json.
 */
const cafe3Graces: Restaurant = {
  slug: "cafe-3-graces",
  name: "Café 3 Grâces",
  suivi: true,
  // Leur site : « brasserie emblématique de la Place de la Comédie » ; le
  // logo dit déjà « depuis 1790 ».
  tagline: "Brasserie · Place de la Comédie",
  // L'arche de leur logo ; les Grâces, le soleil, les étoiles et le nom
  // arrivent en calques par-dessus (.theme-cafe-3-graces).
  logo: "/cafe-3-graces/logo-arche.webp",
  logoIsName: true,
  footerLogo: "/cafe-3-graces/logo.webp",
  icons: { tab: "/cafe-3-graces/favicon.png", homeScreen: "/cafe-3-graces/icon.png" },
  themeColor: "#44522e",
  address: "14 Place de la Comédie, 34000 Montpellier",
  // Leur site et Le Bonbon (juin 2025).
  phone: "+33 4 99 62 73 39",
  hours: "",
  // Leur site : « une cuisine méditerranéenne », « produits frais et de
  // saison » ; leur carte : « Crêpes maison ».
  highlights: ["Cuisine méditerranéenne", "Produits frais et de saison", "Crêpes maison"],
  // Leur affiche du petit déjeuner, la Formule douceur de leur carte et de
  // leur chevalet, la phrase d'accueil de leur site.
  ticker: [
    { text: "Formule petit déj dès 5,90\u00a0€", tone: "accent" },
    { text: "Formule douceur\u00a0: crêpe au choix + boisson chaude ou soft, 7,90\u00a0€", tone: "accent" },
    { text: "Brasserie emblématique de la Place de la Comédie depuis 1790", tone: "brand" },
    { text: "Cuisine méditerranéenne, produits frais et de saison" },
  ],
  categories: [
    {
      // L'affiche « Formule petit déj » de leur site.
      id: "petit-dejeuner",
      name: "Formule petit déj",
      tagline: "Orange pressée supplément 2\u00a0€",
      items: [
        gracesArticle("brunch", "Brunch", 14.9, {
          description: "Boisson chaude, croissant, avocado toast, jus d’orange, œufs & bacon, brioche perdu",
          options: GRACES_OPTIONS_PETIT_DEJ,
        }),
        gracesArticle("classic", "Classic", 5.9, {
          description: "Boisson chaude, croissant, jus d’orange",
          options: GRACES_OPTIONS_PETIT_DEJ,
        }),
        gracesArticle("complet", "Complet", 7.9, {
          description: "Boisson chaude, croissant, jus d’orange, tartine & beurre, Nutella",
          options: GRACES_OPTIONS_PETIT_DEJ,
        }),
      ],
    },
    {
      id: "entrees",
      name: "Entrées",
      items: [
        gracesArticle("stracciatella", "Stracciatella & toasts grillés", 9, {
          description: "Stracciatella, toasts grillés, huile d’olive, éclats de pistache.",
        }),
        gracesArticle("mozzarella-panee", "Mozzarella panée", 12, {
          description: "Mozzarella panée aux deux sésames, servie avec une sauce tomate maison.",
        }),
        gracesArticle("tomates-mozzarella", "Tomates & mozzarella di bufala", 12, {
          description: "Tomates fraîches, mozzarella di bufala, arrosées d’huile d’olive et de basilic.",
        }),
        gracesArticle("trilogie-mozzarella", "Trilogie de mozzarella", 19, {
          description: "Mozzarella croustillante, burrata & stracciatella, huile d’olive et basilic.",
        }),
        gracesArticle("carpaccio", "Carpaccio de boeuf à l’italienne", 11, {
          description: "Fines tranches de boeuf, parmesan, pesto, huile d’olive et citron.",
        }),
        gracesArticle("jambon-serrano", "Jambon Serrano & pan con tomate", 13, {
          description: "Tranches de Jambon Serrano affinées, pain grillé frotté à la tomate et à l’ail.",
        }),
      ],
    },
    {
      id: "tapas",
      name: "Tapas & planches",
      items: [
        gracesArticle("moules-gratinees", "Moules gratinée au beurre persillé", 11, {
          description: "Moules nappées d’un beurre persillé, gratinées au four.",
        }),
        gracesArticle("saumon-blinis", "Saumon fumé & blinis", 13, {
          description: "Saumon fumé, blinis moelleux et crème citronnée onctueuse.",
        }),
        gracesArticle("houmous", "Houmous maison & pain pita doré", 9, {
          description: "Purée aux pois chiches & tahini, citron, pain pita grillé.",
        }),
        gracesArticle("patatas-bravas", "Patatas bravas", 9, {
          description: "Pommes de terre dorées, servies avec une sauce bravas relevée.",
        }),
        gracesArticle("planche-charcuterie", "Planche charcuterie", 21, {
          description: "Jambon cru, spianata picante, terrine de campagne, coppa, fuet catalan.",
        }),
        gracesArticle("planche-mixte", "Planche mixte", 27, {
          description: "Assortiment de charcuteries et fromages affinés.",
        }),
        gracesArticle("planche-mediterranee", "Planche Méditerranée", 19, {
          description: "Houmous, tapenade, tzatziki, féta, moules gratinées, pain pita grillé.",
        }),
      ],
    },
    {
      id: "plats",
      name: "Plats",
      items: [
        gracesArticle("seiches", "Seiches persillées", 21, {
          description: "Seiches à la plancha, à l’ail et au persil, servies avec son risotto et ses légumes du soleil.",
        }),
        gracesArticle("tataki-thon", "Tataki de thon", 23, {
          description: "Thon mi-cuit en croûte de sésame, servi avec une julienne de légumes croquants.",
        }),
        gracesArticle("loup-grille", "Loup grillé", 24, {
          description: "Loup entier grillé, servi avec son risotto et ses légumes du soleil.",
        }),
        gracesArticle("risotto", "Risotto crémeux", 18, {
          description: "Un risotto onctueux aux champignons, légumes grillés et copeaux de parmesan.",
        }),
        gracesArticle("escalope-milanaise", "Escalope milanaise", 22, {
          description: "Escalope de veau panée, tendre et croustillante servie avec des linguines à la tomate.",
        }),
        gracesArticle("cote-de-boeuf", "Côte de boeuf", 28, {
          detail: "400 g",
          description: "Côte de boeuf grillée, sauce roquefort maison, servie avec ses frites croustillantes et sa salade fraîche.",
          options: [CDA_CUISSON],
        }),
      ],
    },
    {
      // Les trois pinsas portent le nom des Grâces : Aglaé, Thalie et
      // « Rosyne » (Euphrosyne), écrit ainsi sur leur carte.
      id: "pinsa",
      name: "Pinsa",
      items: [
        gracesArticle("rosyne", "Rosyne", 18, {
          description: "Pâte à pizza légère, base crème, saumon fumé, crème citronnée, câpres, aneth.",
        }),
        gracesArticle("aglae", "Aglaé", 17, {
          description: "Pâte à pizza légère, sauce tomate, mozzarella, jambon cru, roquette, parmesan.",
        }),
        gracesArticle("thalie", "Thalie", 16, {
          description: "Pâte à pizza légère, sauce tomate, mozzarella, filet d’huile d’olive, basilic frais.",
        }),
      ],
    },
    {
      id: "burgers",
      name: "Burgers maison",
      items: [
        gracesArticle("burger-classic", "Le Classic", 19, {
          description: "Pain bun, steak de boeuf, oignons, bacon, tomate, salade, sauce cheddar maison.",
        }),
        gracesArticle("burger-italien", "L’Italien", 21, {
          description: "Pain briochée, steak de boeuf, jambon cru, mozzarella, tomates confites, parmesan, roquette, pesto.",
        }),
        gracesArticle("burger-crispy", "Le Crispy", 19, {
          description: "Pain bun, poulet crispy, oignons, bacon, tomate, salade, sauce cheddar maison.",
        }),
      ],
    },
    {
      id: "salades",
      name: "Salades gourmandes",
      items: [
        gracesArticle("salade-cesar", "La César", 16, {
          description: "Salade, poulet crispy, croûtons maison, parmesan, oignons, sauce César.",
        }),
        gracesArticle("salade-nordique", "La Nordique", 18, {
          description: "Salade, saumon fumé, croûtons, tomates, féta, aneth, vinaigrette citronnée.",
        }),
        gracesArticle("salade-romaine", "La Romaine", 17, {
          description: "Salade, jambon cru, mozzarella di bufala, olives, tomates confites, pesto.",
        }),
      ],
    },
    {
      id: "douceurs",
      name: "Les douceurs maison",
      items: [
        gracesArticle("tiramisu", "Tiramisu", 9, { description: "Recette traditionnelle au café." }),
        gracesArticle("creme-brulee", "Crème brûlée", 9, {
          description: "Crème onctueuse à la vanille, fondante & craquante.",
        }),
        gracesArticle("brioche-perdue", "Brioche perdue", 9, {
          description: "Brioche dorée, chantilly, caramel beurre salé.",
        }),
        gracesArticle("brownie", "Brownie", 9, { description: "Brownie au chocolat, glace vanille, chantilly." }),
        gracesArticle("cafe-gourmand", "Café gourmand", 10, { description: "Gourmandises maison & café." }),
      ],
    },
    {
      // La page « Coupes glacées » de leur carte imprimée : les coupes, les
      // boules, puis la Coupe 3 Grâces.
      id: "glaces",
      name: "Coupes glacées",
      items: [
        gracesCoupe("dame-blanche", "Dame blanche", 9.9, "3 boules vanille, chocolat maison, chantilly"),
        gracesCoupe("cafe-liegeois", "Café liégeois", 9.9, "1 boule vanille, 2 boules café, café froid, chantilly, coulis café"),
        gracesCoupe(
          "chocolat-liegeois",
          "Chocolat liégeois",
          9.9,
          "1 boule vanille, 2 boules chocolat, chocolat maison, chantilly, coulis chocolat"
        ),
        gracesCoupe(
          "poire-belle-helene",
          "Poire Belle Hélène",
          10.9,
          "1 boule vanille, 2 boules poire, 1/2 poire, chocolat maison, chantilly"
        ),
        gracesCoupe(
          "banana-split",
          "Banana split",
          10.9,
          "1 boule vanille, 1 boule chocolat, 1 boule fraise, banane fraîche, chocolat maison, chantilly"
        ),
        gracesCoupe("fraise-melba", "Fraise Melba", 10.9, "1 boule vanille, 2 boules fraise, fraises en sirop, chantilly"),
        gracesCoupe("peche-melba", "Pêche Melba", 10.9, "1 boule vanille, 2 boules pêche, 1/2 pêche, coulis exotique, chantilly"),
        gracesCoupe("exotique", "Exotique", 11.9, "1 boule coco, 1 boule passion, 1 boule mangue, fruits, chantilly"),
        gracesCoupe("gourmande", "Gourmande", 11.9, "1 boule vanille, 1 boule caramel, 1 boule chocolat, Nutella, chantilly"),
        gracesGlace(1, 3),
        gracesGlace(2, 5.5),
        gracesGlace(3, 8),
        gracesCoupe(
          "coupe-3-graces",
          "Coupe 3 Grâces",
          16.5,
          "1 boule passion, 1 boule coco, 1 boule mangue, 1 boule poire, 1 boule fraise, 1 boule framboise, coulis fruits rouges, chantilly & fruits"
        ),
      ],
    },
    {
      id: "crepes",
      name: "Crêpes maison",
      tagline: "Supplément banane 1\u00a0€, chantilly 1\u00a0€",
      items: [
        gracesCrepe("crepe-sucre", "Crêpe sucre", 4),
        gracesCrepe("crepe-sucre-citron", "Crêpe sucre citron", 4.5),
        gracesCrepe("crepe-confiture", "Crêpe confiture", 4.5),
        gracesCrepe("crepe-creme-de-marron", "Crêpe crème de marron", 5),
        gracesCrepe("crepe-chocolat", "Crêpe chocolat maison", 5),
        gracesCrepe("crepe-nutella", "Crêpe Nutella", 5),
        gracesArticle("formule-douceur", "Formule douceur", 7.9, {
          description: "Crêpe au choix + boisson chaude ou soft. Hors viennois, latte gourmand & orange pressée",
          options: [
            groupeChoix("crepe", "Crêpe", GRACES_CREPES, { obligatoire: true }),
            groupeChoix("boisson", "Boisson chaude ou soft", [...GRACES_BOISSONS_CHAUDES, ...GRACES_SOFTS], {
              obligatoire: true,
            }),
          ],
        }),
      ],
    },
    {
      id: "boissons-chaudes",
      name: "Boissons chaudes",
      tagline: "Café, allongé et noisette servis jusqu’à 17h",
      boissons: "chaudes",
      items: [
        gracesArticle("cafe", "Café, allongé", 2.2, {
          options: [groupeChoix("cafe", "Café", ["Café", "Allongé"], { obligatoire: true })],
        }),
        gracesArticle("noisette", "Noisette", 2.5),
        gracesArticle("double-cafe", "Double café", 4.1),
        gracesArticle("cappuccino", "Cappuccino", 4.1),
        gracesArticle("the-infusion", "Thé & infusion", 4.1, {
          options: [groupeChoix("boisson", "Boisson", ["Thé", "Infusion"], { obligatoire: true })],
        }),
        gracesArticle("chocolat-chaud", "Chocolat chaud maison", 4.5),
        gracesArticle("viennois", "Viennois", 5.1, {
          description: "Café ou chocolat",
          options: [groupeChoix("viennois", "Viennois", ["Café", "Chocolat"], { obligatoire: true, prefixe: "Viennois " })],
        }),
        gracesArticle("latte", "Latte machiatto", 4.4),
        gracesArticle("latte-vanille", "Latte vanille", 4.9),
        gracesArticle("latte-caramel", "Latte caramel", 4.9),
      ],
    },
    {
      id: "softs",
      name: "Softs",
      boissons: true,
      items: [
        gracesArticle("coca", "Coca", 4.4, {
          description: "Regular, zero ou cherry",
          options: [groupeChoix("version", "Version", ["Regular", "Zero", "Cherry"], { obligatoire: true, prefixe: "Coca " })],
        }),
        gracesArticle("perrier", "Perrier", 4.4),
        gracesArticle("fanta", "Fanta", 4.4),
        gracesArticle("sprite", "Sprite", 4.4),
        gracesArticle("fuze-tea", "Fuze Tea", 4.4),
        gracesArticle("granini", "Granini", 4.4, {
          description: "ACE, orange, pomme, ananas, tomate, abricot",
          options: [
            groupeChoix("parfum", "Parfum", ["ACE", "Orange", "Pomme", "Ananas", "Tomate", "Abricot"], { obligatoire: true }),
          ],
        }),
        gracesArticle("orange-pressee", "Orange pressée", 5),
        gracesArticle("schweppes", "Schweppes", 4.4, {
          description: "Tonic ou agrumes",
          options: [groupeChoix("version", "Version", ["Tonic", "Agrumes"], { obligatoire: true, prefixe: "Schweppes " })],
        }),
        gracesArticle("oasis", "Oasis Tropical", 4.4),
        gracesArticle("ginger-beer", "Ginger Beer", 4.4),
        gracesArticle("limonade", "Limonade tranche", 4.2),
        gracesArticle("sirop", "Sirop à l’eau", 3.2, {
          options: [groupeChoix("parfum", "Parfum", GRACES_PARFUMS_SIROP, { obligatoire: true })],
        }),
        gracesArticle("diabolo", "Diabolo", 4.2, {
          description: "Fraise, menthe, citron, grenadine, pêche",
          options: [groupeChoix("parfum", "Parfum", GRACES_PARFUMS_SIROP, { obligatoire: true })],
        }),
      ],
    },
    {
      id: "sans-alcool",
      name: "Sans alcool & smoothies",
      boissons: true,
      items: [
        gracesArticle("douceurs-des-iles", "Douceurs des îles", 7, {
          description: "Sirop grenadine, jus d’orange, jus d’ananas, purée passion",
        }),
        gracesArticle("virgin-pina", "Virgin piña", 7, { description: "Purée de coco, jus d’ananas" }),
        gracesArticle("virgin-mojito", "Virgin mojito", 7, { description: "Menthe fraîche, citron vert, cassonade, limonade" }),
        gracesArticle("crazy-melon", "Crazy Melon", 8, { description: "Smoothie melon, mangue, passion" }),
        gracesArticle("papaya-mania", "Papaya Mania", 8, { description: "Smoothie fraise, pêche, papaye" }),
        gracesArticle("pinky-groovy", "Pinky Groovy", 8, { description: "Smoothie fraise, banane" }),
        gracesArticle("yellow-slow", "Yellow Slow", 8, { description: "Smoothie ananas, papaye, mangue" }),
      ],
    },
    {
      id: "cocktails",
      name: "Cocktails",
      boissons: true,
      tagline: "L’abus d’alcool est dangereux pour la santé, à consommer avec modération",
      items: [
        gracesAlcool("mojito", "Mojito", 10, {
          description: "Rhum, menthe fraîche, cassonade, citron vert, eau gazeuse",
          options: [GRACES_SUPP_FRUIT],
        }),
        gracesAlcool("caipirinha-roska", "Caipirinha & Roska", 10, {
          description: "Cachaça ou Vodka citron vert, cassonade",
          options: [
            groupeChoix("cocktail", "Cocktail", ["Caipirinha (cachaça)", "Roska (vodka)"], { obligatoire: true }),
            GRACES_SUPP_FRUIT,
          ],
        }),
        gracesAlcool("sex-on-the-beach", "Sex on the beach", 10, {
          description: "Vodka, liqueur de pêche, jus d’orange, jus de cranberry",
        }),
        gracesAlcool("pina-colada", "Piña colada", 10, { description: "Rhum, crème de coco, jus d’ananas" }),
        gracesAlcool("mule", "Moscow / London mule", 10, {
          description: "Vodka ou Gin, ginger beer, citron vert",
          options: [groupeChoix("cocktail", "Cocktail", ["Moscow mule (vodka)", "London mule (gin)"], { obligatoire: true })],
        }),
        gracesAlcool("bombay-tonic", "Bombay tonic", 10, { description: "Gin Bombay Sapphire, tonic, citron jaune" }),
        gracesAlcool("aperol-spritz", "Apérol spritz", 10, { description: "Aperol, Prosecco, eau gazeuse, orange" }),
        gracesAlcool("saint-germain-spritz", "Saint-Germain spritz", 12, {
          description: "Saint-Germain, Prosecco, eau gazeuse, citron jaune",
        }),
        gracesAlcool("peach-lover", "Peach lover", 12, { description: "Gin Belle Rive, crème pêche, Prosecco, limonade" }),
        gracesAlcool("espresso-martini", "Espresso martini", 12, {
          description: "Vodka, café, liqueur de café, sucre de canne",
        }),
        gracesAlcool("pornstar-martini", "Pornstar martini", 12, {
          description: "Vodka, fruit de la passion, sirop de vanille, Prosecco",
        }),
      ],
    },
    {
      id: "bieres",
      name: "Bières",
      boissons: true,
      tagline: "Pression : supplément sirop 0,20\u00a0€, picon 0,80\u00a0€",
      items: [
        gracesPression("bud", "Bud blonde", 3.9, 6.9),
        gracesPression("goose-island", "Goose Island", 4.5, 8.5, { description: "IPA" }),
        gracesPression("hoegaarden", "Hoegaarden", 4.5, 8.5, { description: "Blanche" }),
        gracesPression("leffe", "Leffe blonde", 4.9, 8.9, { description: "Abbaye" }),
        gracesPression("panache", "Panaché / Monaco", 3.9, 6.9, {
          options: [groupeChoix("boisson", "Boisson", ["Panaché", "Monaco"], { obligatoire: true })],
        }),
        gracesAlcool("leffe-ruby", "Leffe Ruby", 6, { detail: "33 cl" }),
        gracesAlcool("corona", "Corona", 6, { detail: "33 cl" }),
        gracesArticle("corona-0", "Corona 0%", 5, { detail: "33 cl" }),
      ],
    },
    {
      // Verre de 12 cl et bouteille de 75 cl ; la flûte pour les bulles. Un
      // soleil à la place du prix au verre : bouteille seule.
      id: "vins",
      name: "Vins & bulles",
      boissons: true,
      items: [
        gracesVin("marie-antoinette-blanc", "Marie Antoinette blanc", "Blanc · IGP Terres du Midi · Chardonnay & Clairette", 19, 5),
        gracesVin("domaine-de-joy", "Domaine de JOŸ", "Blanc · IGP Côtes de Gascogne · Gros manseng", 23, 5),
        gracesVin("paul-mas-viognier", "Domaine Paul Mas", "Blanc · IGP Pays d’Oc · Viognier", 24, 6),
        gracesVin("clos-real", "Le Clos Real", "Blanc · AOP Côtes de Provence · Vermentino, Ugni Blanc, Clairette", 34),
        gracesVin("marie-antoinette-rouge", "Marie Antoinette rouge", "Rouge · IGP Terres du Midi · Grenache, Syrah & Merlot", 19, 5),
        gracesVin(
          "paul-mas-1892",
          "Paul Mas 1892",
          "Rouge · IGP Pays d’Oc BIO · Carignan, Mourvèdre, Grenache noir & Sauvignon",
          24
        ),
        gracesVin(
          "domaine-argenteille",
          "Domaine de l’Argenteille",
          "Rouge · AOP Terrasses du Larzac · Grenache, Mourvèdre, Carignan, Syrah",
          27,
          6
        ),
        gracesVin("grain-de-sagesse", "Grain de Sagesse", "Rouge · IGP de l’Hérault · Vermentino & Roussanne", 35),
        gracesVin("marie-antoinette-rose", "Marie Antoinette rosé", "Rosé · IGP Terres du Midi · Grenache, Cinsault & Carignan", 19, 5),
        gracesVin("grande-sieste", "La Grande Sieste", "Rosé · IGP Pays d’Oc · Grenache, Cinsault, Syrah", 26, 6),
        gracesVin("martini-spumante", "Martini Spumante", "Bulles · 100% Glera", 30, 6, "Flûte 12 cl"),
        gracesVin("piper-heidsieck", "Maison Piper-Heidsieck Brut", "Bulles · Pinot noir, Meunier & Chardonnay", 70, 10, "Flûte 12 cl"),
      ],
    },
    {
      id: "aperitifs",
      name: "Apéritifs & digestifs",
      boissons: true,
      items: [
        gracesAlcool("ricard", "Ricard", 3),
        gracesAlcool("suze", "Suze", 4.4),
        gracesAlcool("martini", "Martini", 4.4),
        gracesAlcool("campari", "Campari", 4.4),
        gracesAlcool("kir", "Kir", 4.4),
        gracesAlcool("kir-royal", "Kir royal", 10),
        gracesAlcool("americano", "Americano", 9),
        gracesAlcool("muscat", "Muscat", 4.5),
        gracesAlcool("porto", "Porto", 4.5),
        gracesAlcool("bumbu", "Bumbu cream", 8),
        gracesAlcool("baileys", "Bailey’s", 7),
        gracesAlcool("get", "Get 27/31", 7, {
          options: [groupeChoix("version", "Version", ["Get 27", "Get 31"], { obligatoire: true })],
        }),
        gracesAlcool("limoncello", "Limoncello", 7),
        gracesAlcool("poire", "Poire", 7),
      ],
    },
    {
      id: "spiritueux",
      name: "Spiritueux",
      boissons: true,
      items: [
        ...gracesSpiritueux("Rhum", [
          ["bacardi", "Bacardi", 7],
          ["dictador", "Dictador 12 ans", 9],
          ["gouverneur", "Gouverneur", 12],
        ]),
        ...gracesSpiritueux("Whisky", [
          ["ballantines", "Ballantine’s", 7],
          ["jack-daniels", "Jack Daniel’s", 9],
          ["duke", "Duke straight", 12],
        ]),
        ...gracesSpiritueux("Vodka", [
          ["eristoff", "Eristoff", 7],
          ["grey-goose", "Grey Goose", 10],
        ]),
        ...gracesSpiritueux("Tequila", [
          ["erena", "Erena reposado", 9],
          ["patron", "Patròn silver", 12],
        ]),
      ],
    },
  ],
};

/*
 * Rosemarie — 3 rue des Sœurs Noires, Saint-Roch : cantine méditerranéenne,
 * petites assiettes, plats, cocktails infusés maison. Aucune carte en ligne
 * (les liens « menu » de leurs trois sites sont morts) : la carte de l'été
 * 2026, celle de leur nouvelle identité, lue sur le chevalet de la rue (photo
 * de client, Restaurant Guru), dans son ordre. Chaque ligne y est une seule
 * phrase : le nom est ce qui précède la première virgule (la deuxième pour
 * « Roquette », qui seule ne nommerait pas le plat), le reste la
 * description. Les boissons hors cocktails n'y figurent pas. Sources :
 * demos/rosemarie/docs/.
 */
const rosemarie: Restaurant = {
  slug: "rosemarie",
  name: "Rosemarie",
  suivi: true,
  tagline: "cantine méditerranéenne",
  // Notre proposition, faute de fichier : le R du mot-symbole, blanc sur le jaune.
  icons: { tab: "/rosemarie/favicon.png", homeScreen: "/rosemarie/icon.png" },
  themeColor: "#f8c800",
  address: "3 rue des Sœurs Noires, 34000 Montpellier",
  phone: "",
  hours: "Lun.–sam. 9h–\u20601h · dim. 9h–\u2060minuit",
  allergensNote: "Nous tenons à votre disposition la liste des ingrédients allergènes et la traçabilité des viandes.",
  highlights: ["Ouvert 7j/7", "Service continu"],
  pairings: rosemarieAccords,
  loyaltyWheel: roueDuJour,
  // Les paliers de Caffè Panis (1 € = 1 point), sur la carte de Rosemarie.
  demoLoyalty: {
    pointsPerEuro: 1,
    rewards: [
      {
        id: "granite",
        label: "1 cocktail granité offert",
        points: 50,
        items: ["granite-rhum-romarin", "granite-vodka-griottes", "granite-goyave"],
      },
      {
        id: "dessert",
        label: "1 dessert ou 1 glace offert",
        points: 100,
        items: ["abricots-rotis", "citron-biscotti", "ananas-caramelise", "soupe-pasteque", "glace-chouchous", "glace-zezettes", "glace-oreillettes", "glace-nature"],
      },
      {
        id: "petite-assiette",
        label: "1 petite assiette offerte",
        points: 150,
        items: ["focaccia", "burrata", "jambon-serrano", "babaganoush", "houmous-petit-pois", "gaspacho-verde", "croquettes-poisson", "labneh", "beignets-courgettes", "panzerotto", "polenta-frite"],
      },
      {
        id: "plat",
        label: "1 plat offert",
        points: 250,
        items: ["carpaccio-boeuf", "tartare-veau", "calamars-setoise", "roquette-encornet", "paccheri-ragu", "effiloche-porc", "pave-truite", "clafoutis-tomates", "boulettes-poulet", "persille-boeuf"],
      },
    ],
    member: {
      contact: "0612345678",
      firstName: "Margaux",
      // Deux jours d'affilée : la série se joue sous les yeux du gérant.
      history: [
        { kind: "gain", points: 4, table: 6, rewards: null, daysAgo: 1 },
        { kind: "roue", points: 5, table: null, rewards: null, daysAgo: 1 },
        { kind: "gain", points: 7, table: 12, rewards: null, daysAgo: 2 },
        { kind: "roue", points: 10, table: null, rewards: null, daysAgo: 2 },
        { kind: "gain", points: 31, table: 3, rewards: null, daysAgo: 8 },
        { kind: "roue", points: 15, table: null, rewards: null, daysAgo: 8 },
        { kind: "gain", points: 24, table: 9, rewards: null, daysAgo: 15 },
      ],
    },
  },
  categories: [
    {
      id: "cocktails-granites",
      name: "Cocktails granités",
      boissons: true,
      items: [
        {
          id: "granite-rhum-romarin",
          name: "Rhum infusé au romarin",
          description: "Jus de coco, citron vert pressé & sirop de vanille.",
          price: 6.5,
          image: pexelsRecadre("1590154/pexels-photo-1590154.jpeg", 800),
          ...ALCOOL,
        },
        {
          id: "granite-vodka-griottes",
          name: "Vodka infusée aux griottes & basilic",
          description: "Jus de pomme & sucre de canne.",
          price: 6.5,
          image: pexelsRecadre("27626307/pexels-photo-27626307.jpeg", 800),
          ...ALCOOL,
        },
        {
          id: "granite-goyave",
          name: "Nectar de goyave",
          description: "Sirop de grenadine, jus de pomme (sans alcool).",
          price: 6,
          image: pexels("8375246/pexels-photo-8375246.jpeg", 800),
        },
      ],
    },
    {
      id: "cocktails",
      name: "Cocktails",
      boissons: true,
      items: [
        {
          id: "cocktail-cachaca",
          name: "Cachaça infusée ananas",
          description: "Liqueur thym & verveine, citron vert et sirop de cassonade.",
          price: 9,
          image: pexelsRecadre("12049920/pexels-photo-12049920.jpeg", 800),
          ...ALCOOL,
        },
        {
          id: "cocktail-gin-hibiscus",
          name: "Gin infusé hibiscus",
          description: "Liqueur sureau infusé à la menthe, limonade.",
          price: 9,
          image: pexels("35992010/pexels-photo-35992010.jpeg", 800),
          ...ALCOOL,
        },
        {
          id: "cocktail-tequila-framboise",
          name: "Tequila infusée framboises",
          description: "Liqueur de bergamote, sirop d'agave & jus de cranberry.",
          price: 9,
          image: pexels("2110923/pexels-photo-2110923.jpeg", 800),
          ...ALCOOL,
        },
      ],
    },
    {
      id: "petites-assiettes",
      name: "Petites assiettes & tapas",
      items: [
        {
          id: "focaccia",
          name: "Focaccia",
          description: "Olives à la grecque & romarin.",
          price: 6,
          image: pexels("38860516/pexels-photo-38860516.jpeg", 800),
        },
        {
          id: "burrata",
          name: "Burrata",
          description: "Pesto romesco, parmesan & épinards.",
          price: 8.5,
          image: pexels("29380174/pexels-photo-29380174.jpeg", 800),
        },
        {
          id: "jambon-serrano",
          name: "Jambon Serrano",
          description: "18 mois.",
          price: 6.5,
          image: pexels("19688911/pexels-photo-19688911.jpeg", 800),
        },
        {
          id: "babaganoush",
          name: "Babaganoush",
          description: "Zaatar, grenades & granny smith.",
          price: 7,
          image: pexels("4768983/pexels-photo-4768983.jpeg", 800),
        },
        {
          id: "houmous-petit-pois",
          name: "Houmous de petit pois",
          description: "Zaatar.",
          price: 6.5,
          image: pexels("20507447/pexels-photo-20507447.jpeg", 800),
        },
        {
          id: "gaspacho-verde",
          name: "Gaspacho verde",
          description: "Menthe & concombres.",
          price: 7,
          image: pexels("15239056/pexels-photo-15239056.jpeg", 800),
        },
        {
          id: "croquettes-poisson",
          name: "Croquettes de poisson",
          description: "Olives, aneth, persil & mayo épicée.",
          price: 7,
          image: pexels("17598323/pexels-photo-17598323.jpeg", 800),
        },
        {
          id: "labneh",
          name: "Labneh",
          description: "Olives kalamata, pistaches vertes, pain pita maison.",
          price: 8,
          image: pexels("14930577/pexels-photo-14930577.jpeg", 800),
        },
        {
          id: "beignets-courgettes",
          name: "Beignets courgettes",
          description: "Menthe, provolone fumé & yaourt grec aux herbes.",
          price: 7,
          image: pexels("38163967/pexels-photo-38163967.jpeg", 800),
        },
        {
          id: "panzerotto",
          name: "Panzerotto au bœuf",
          description: "Mozzarella, olives & petit pois.",
          price: 6.5,
          image: pexelsRecadre("28442527/pexels-photo-28442527.jpeg", 800),
        },
        {
          id: "polenta-frite",
          name: "Polenta frite",
          description: "Aïoli.",
          price: 6.5,
          image: pexels("37296919/pexels-photo-37296919.jpeg", 800),
        },
      ],
    },
    {
      id: "salades-viandes-poissons",
      name: "Salades, viandes & poissons",
      items: [
        {
          id: "carpaccio-boeuf",
          name: "Carpaccio de bœuf poivré",
          description: "Pousses d'épinards & pecorino.",
          price: 17,
          image: pexels("17478679/pexels-photo-17478679.jpeg", 800),
        },
        {
          id: "tartare-veau",
          name: "Tartare de veau vitello",
          description: "Roquette & frites.",
          price: 17,
          image: pexels("20081518/pexels-photo-20081518.jpeg", 800),
        },
        {
          id: "calamars-setoise",
          name: "Calamars à la sétoise",
          description: "Riz rouge de Camargue aux olives.",
          price: 17,
          image: pexels("1618943/pexels-photo-1618943.jpeg", 800),
        },
        {
          id: "roquette-encornet",
          name: "Roquette, tentacule d'encornet rôtie",
          description: "Pastèque sumac, vinaigrette framboise.",
          price: 16.5,
          image: pexels("8971797/pexels-photo-8971797.jpeg", 800),
        },
        {
          id: "paccheri-ragu",
          name: "Paccheri al ragù",
          description: "Sauce mijotée tomate & bœuf, pecorino.",
          price: 15.5,
          image: pexels("15230669/pexels-photo-15230669.jpeg", 800),
        },
        {
          id: "effiloche-porc",
          name: "Éffiloché de porc des Pyrénées",
          description: "Coleslaw méditerranéen, pita & sauce barbecue.",
          price: 16,
          image: pexelsRecadre("18354021/pexels-photo-18354021.jpeg", 800),
        },
        {
          id: "pave-truite",
          name: "Pavé de truite rôtie",
          description: "Ajo blanco, salade fenouil & condiment tomate rougail.",
          price: 17,
          image: pexels("4663250/pexels-photo-4663250.jpeg", 800),
        },
        {
          id: "clafoutis-tomates",
          name: "Clafoutis tomates",
          description: "Chèvre, olives noires & roquette.",
          price: 15,
          image: pexels("5419185/pexels-photo-5419185.jpeg", 800),
        },
        {
          id: "boulettes-poulet",
          name: "Boulettes de poulet panées",
          description: "Citron confit, menthe, taboulé méditerranéen.",
          price: 16,
          image: pexels("1765012/pexels-photo-1765012.jpeg", 800),
        },
        {
          id: "persille-boeuf",
          name: "Persillé de bœuf",
          description: "Jus de moelle fumé, frites & salade.",
          price: 19,
          image: unsplash("photo-1504973960431-1c467e159aa4", 800),
        },
      ],
    },
    {
      id: "garnitures",
      name: "Garnitures",
      items: [
        {
          id: "riz-rouge",
          name: "Riz rouge de Camargue aux olives",
          price: 5.5,
          image: pexels("6659610/pexels-photo-6659610.jpeg", 800),
        },
        {
          id: "frites",
          name: "Frites",
          description: "Sel de Camargue & romarin.",
          price: 5.5,
          image: pexels("7687530/pexels-photo-7687530.jpeg", 800),
        },
        {
          id: "coleslaw",
          name: "Coleslaw",
          price: 5.5,
          image: pexelsRecadre("29930364/pexels-photo-29930364.jpeg", 800),
        },
        {
          id: "taboule",
          name: "Taboulé méditerranéen",
          price: 6,
          image: pexels("15108402/pexels-photo-15108402.jpeg", 800),
        },
      ],
    },
    {
      id: "desserts",
      name: "Pâtisseries & desserts",
      items: [
        {
          id: "abricots-rotis",
          name: "Abricots rôtis",
          description: "Romarin, verveine, fromage blanc.",
          price: 7,
          image: pexels("2739274/pexels-photo-2739274.jpeg", 800),
        },
        {
          id: "citron-biscotti",
          name: "Citron biscotti al limone",
          description: "Crème limone.",
          price: 7,
          image: pexels("3026801/pexels-photo-3026801.jpeg", 800),
        },
        {
          id: "ananas-caramelise",
          name: "Ananas caramélisé",
          description: "Ganache chocolat, crumble cacahuète et coulis ananas.",
          price: 7,
          image: pexels("30649014/pexels-photo-30649014.jpeg", 800),
        },
        {
          id: "soupe-pasteque",
          name: "Soupe glacée pastèque",
          description: "Framboises et basilic.",
          price: 6.5,
          image: pexels("37279441/pexels-photo-37279441.jpeg", 800),
        },
      ],
    },
    {
      id: "glaces",
      name: "Glaces italiennes à la fleur de lait",
      items: [
        {
          id: "glace-chouchous",
          name: "Chouchous",
          description: "Caramel beurre salé & noisettes.",
          price: 7,
          image: pexelsRecadre("35756355/pexels-photo-35756355.jpeg", 800),
        },
        {
          id: "glace-zezettes",
          name: "Zézettes de Sète",
          description: "Coulis ananas piment d'Espelette & oranges confites.",
          price: 6.5,
          image: pexelsRecadre("34281009/pexels-photo-34281009.jpeg", 800),
        },
        {
          id: "glace-oreillettes",
          name: "Oreillettes de Montpellier",
          description: "Coulis de framboises, pralines roses.",
          price: 6.5,
          image: pexelsRecadre("1352281/pexels-photo-1352281.jpeg", 800),
        },
        {
          id: "glace-nature",
          name: "Glace au lait nature",
          price: 5,
          image: pexels("1294943/pexels-photo-1294943.jpeg", 800),
        },
      ],
    },
  ],
};

/*
 * Les allergènes des démos, supposés d'après le nom, la description et la
 * recette d'usage (scripts : aucun ; à régénérer à la main). Quelques plats
 * par démo restent sans : la fiche montre alors « non renseignés ». Ceux que
 * la carte imprime (Baï-Kō) restent les siens. Jamais sur /menu/m : la carte
 * en ligne ne lit que ceux de la base (lib/public-menu.ts).
 */
const withDemoAllergens = (registry: Record<string, Restaurant>): Record<string, Restaurant> => {
  const table = allergenesDemo as Record<string, Record<string, Allergen[]>>;
  return Object.fromEntries(
    Object.entries(registry).map(([slug, restaurant]) => [
      slug,
      {
        ...restaurant,
        categories: restaurant.categories.map((category) => ({
          ...category,
          items: category.items.map((item) => ({
            ...item,
            allergens: item.allergens ?? table[slug]?.[item.id],
          })),
        })),
      },
    ])
  );
};

const restaurants: Record<string, Restaurant> = withDemoAllergens({
  [trattoriaLucia.slug]: trattoriaLucia,
  [boho.slug]: boho,
  [lzFood.slug]: lzFood,
  [oCroustiPoulet.slug]: oCroustiPoulet,
  [bigSmash.slug]: bigSmash,
  [chickenStreet.slug]: chickenStreet,
  [baiKo.slug]: baiKo,
  [lAdresse.slug]: lAdresse,
  [leNovelty.slug]: leNovelty,
  [leVictoria.slug]: leVictoria,
  [cafeDesArts.slug]: cafeDesArts,
  [caffePanis.slug]: caffePanis,
  [boulangerieCyprien.slug]: boulangerieCyprien,
  [brasserieLaissac.slug]: brasserieLaissac,
  [lEtoile.slug]: lEtoile,
  [cafeRiche.slug]: cafeRiche,
  [cafePoulard.slug]: cafePoulard,
  [lePetitNice.slug]: lePetitNice,
  [leClub.slug]: leClub,
  [lEntrepot.slug]: lEntrepot,
  [lePulp.slug]: lePulp,
  [cafe3Graces.slug]: cafe3Graces,
  [rosemarie.slug]: rosemarie,
});

/** La démo d'Ominin Club (scripts/club-demo.ts), servie en direct par la scène de L'Étoile. */
const ETOILE_LIVE_SLUG = "l-etoile-demo";

/** Classe de thème CSS par établissement (voir globals.css) : habille le
 * menu public et les démos aux couleurs du restaurant. Absente ⇒ thème
 * Ominin par défaut. */
const themeClasses: Record<string, string> = {
  [boho.slug]: "theme-boho",
  [lzFood.slug]: "theme-lz-food",
  [oCroustiPoulet.slug]: "theme-o-crousti-poulet",
  [bigSmash.slug]: "theme-big-smash",
  [chickenStreet.slug]: "theme-chicken-street",
  [baiKo.slug]: "theme-bai-ko",
  [lAdresse.slug]: "theme-l-adresse",
  [leNovelty.slug]: "theme-le-novelty",
  [leVictoria.slug]: "theme-le-victoria",
  [cafeDesArts.slug]: "theme-cafe-des-arts",
  [caffePanis.slug]: "theme-caffe-panis",
  [boulangerieCyprien.slug]: "theme-boulangerie-cyprien",
  [brasserieLaissac.slug]: "theme-brasserie-laissac",
  [lEtoile.slug]: "theme-l-etoile",
  [ETOILE_LIVE_SLUG]: "theme-l-etoile",
  [cafeRiche.slug]: "theme-cafe-riche",
  [cafePoulard.slug]: "theme-cafe-poulard",
  [lePetitNice.slug]: "theme-le-petit-nice",
  [leClub.slug]: "theme-le-club",
  [lEntrepot.slug]: "theme-l-entrepot",
  [lePulp.slug]: "theme-le-pulp",
  [cafe3Graces.slug]: "theme-cafe-3-graces",
  [rosemarie.slug]: "theme-rosemarie",
};

export function restaurantThemeClass(slug: string): string | undefined {
  return themeClasses[slug];
}

/** Les cartes posées sur le velours animé (components/menu/panis-backdrop), à leurs teintes. */
export function hasVelours(slug: string): boolean {
  return slug in veloursPalettes;
}

/**
 * Le menu en direct que la scène de L'Étoile (components/menu/etoile)
 * habille : la démo d'Ominin Club, hors des moteurs de recherche.
 */
export function etoileScene(slug: string): boolean {
  return slug === ETOILE_LIVE_SLUG;
}

/**
 * La carte en base habillée par la scène : chaque catégorie reprend, par son
 * nom, l'identifiant et la nature de celle du registre, sur lesquels la scène
 * range ses chapitres. Une catégorie inconnue du registre n'y paraît pas.
 */
export function etoileSceneCategories(categories: MenuCategory[]): MenuCategory[] {
  const byName = new Map(lEtoile.categories.map((category) => [category.name, category]));
  return categories.map((category) => {
    const scene = byName.get(category.name);
    return scene ? { ...category, id: scene.id, boissons: scene.boissons } : category;
  });
}

export function getRestaurant(slug: string): Restaurant | undefined {
  return restaurants[slug];
}

/**
 * Lien « itinéraire » vers l'adresse de l'établissement. Recherche Google Maps
 * plutôt qu'un point GPS, reprise par l'application de cartographie par défaut
 * du téléphone. Avec l'identifiant de la fiche, la recherche ouvre la fiche
 * elle-même : l'adresse seule tombe sur la rue — sur le voisin, quand elle
 * est celle d'un centre commercial.
 */
export function mapsUrl(address: string, placeId?: string): string {
  const fiche = placeId ? `&query_place_id=${encodeURIComponent(placeId)}` : "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}${fiche}`;
}

/** Le nom que lit le client sur sa carte. */
export const brandName = (restaurant: Restaurant) => restaurant.brandName ?? restaurant.name;

/**
 * Le numéro tel qu'un client français le lit (« 07 49 20 64 34 ») ; le
 * lien, lui, garde la forme internationale (tel:).
 */
export function displayPhone(phone: string): string {
  return phone.replace(/^\+33\s?/, "0");
}

/** L'adresse affichée : le code postal ne se sépare pas de sa ville. */
export function displayAddress(address: string): string {
  return address.replace(/\b(\d{5}) /, "$1\u00a0");
}

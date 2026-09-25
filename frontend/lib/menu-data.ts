export type Badge = "maison" | "top" | "nouveau";

export const BADGE_LABELS: Record<Badge, string> = {
  maison: "Recette maison",
  top: "Top vente",
  nouveau: "Nouveauté",
};

export interface OptionChoice {
  id: string;
  name: string;
  supplement: number;
}

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
   * Un tarif planifié s'applique en ce moment : `price` porte déjà le prix
   * pratiqué, et ceci dit d'où il vient. undefined ⇒ prix de la carte.
   */
  tarif?: AppliedTarif;
}

/** Le tarif planifié en cours sur un article, tel qu'on l'explique au client. */
export interface AppliedTarif {
  /** Nom donné par le restaurant : « Tarif week-end ». */
  name: string;
  /** Prix de la carte, à barrer quand la règle est une remise. */
  basePrice: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  tagline?: string;
  items: MenuItem[];
}

export interface Restaurant {
  slug: string;
  name: string;
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
  /**
   * Affiche de l'établissement (chemin public) portant déjà logo et nom :
   * elle tient lieu de hero à elle seule, sans texte superposé.
   */
  poster?: string;
  address: string;
  phone: string;
  hours: string;
  /** Arguments courts affichés sous le hero (halal, livraison, promotion). */
  highlights?: string[];
  categories: MenuCategory[];
  /** Lien « laisser un avis Google », proposé en bas du menu. */
  googleReviewUrl?: string;
}

export const unsplash = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

export const pexels = (path: string, w = 1200) =>
  `https://images.pexels.com/photos/${path}?auto=compress&cs=tinysrgb&w=${w}`;

/**
 * Même photo, recadrée par le serveur d'images plutôt que par le navigateur.
 * Utile quand le sujet n'est pas au centre du cliché : `object-fit: cover`
 * rogne alors la pizza et garde le décor. `crop=entropy` recentre sur la zone
 * la plus dense de l'image. h vaut les 9/16 de w, le format des vignettes.
 */
export const pexelsRecadre = (path: string, w = 1200) =>
  `${pexels(path, w)}&h=${Math.round((w * 9) / 16)}&fit=crop&crop=entropy`;

/** Identifiant stable tiré d'un libellé accentué : « Viande hachée » → viande-hachee. */
const slugLibelle = (label: string) =>
  label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/œ/g, "oe")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

/** Groupe à choix unique tiré d'une liste de libellés, ids dérivés du groupe. */
const groupeChoix = (
  id: string,
  name: string,
  labels: readonly string[],
  { obligatoire = false, supplement = 0, prefixe = "" } = {}
): OptionGroup => ({
  id,
  name,
  obligatoire,
  choices: labels.map((label) => ({
    id: `${id}-${slugLibelle(label)}`,
    name: `${prefixe}${label}`,
    supplement,
  })),
});

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
  address: "72 Avenue des États-Unis, 31200 Toulouse",
  phone: "+33 7 72 29 62 98",
  hours: "Lun–Ven 12h–14h · 16h–2h · Sam 18h–3h · Dim 16h–2h",
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
          options: [
            {
              id: "cuisson",
              name: "Cuisson",
              obligatoire: true,
              choices: [
                { id: "a-point", name: "À point", supplement: 0 },
                { id: "saignant", name: "Saignant", supplement: 0 },
                { id: "bleu", name: "Bleu", supplement: 0 },
                { id: "bien-cuit", name: "Bien cuit", supplement: 0 },
              ],
            },
          ],
        },
        {
          id: "piece-boeuf",
          image: pexels("15661093/pexels-photo-15661093.jpeg", 400),
          name: "Pièce de bœuf grillée",
          description: "Servie avec frites fraîches maison et salade assaisonnée.",
          price: 16.9,
          options: [
            {
              id: "cuisson",
              name: "Cuisson",
              obligatoire: true,
              choices: [
                { id: "a-point", name: "À point", supplement: 0 },
                { id: "saignant", name: "Saignant", supplement: 0 },
                { id: "bleu", name: "Bleu", supplement: 0 },
                { id: "bien-cuit", name: "Bien cuit", supplement: 0 },
              ],
            },
          ],
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
          options: [
            {
              id: "cuisson",
              name: "Cuisson",
              obligatoire: true,
              choices: [
                { id: "a-point", name: "À point", supplement: 0 },
                { id: "saignant", name: "Saignant", supplement: 0 },
                { id: "bleu", name: "Bleu", supplement: 0 },
                { id: "bien-cuit", name: "Bien cuit", supplement: 0 },
              ],
            },
          ],
        },
        {
          id: "saumon-plancha",
          image: unsplash("photo-1519708227418-c8fd9a32b7a2", 400),
          name: "Escalope de saumon frais à la plancha",
          description: "Servie avec frites fraîches maison et salade assaisonnée.",
          price: 16.9,
          options: [
            {
              id: "cuisson",
              name: "Cuisson",
              obligatoire: true,
              choices: [
                { id: "a-point", name: "À point", supplement: 0 },
                { id: "saignant", name: "Saignant", supplement: 0 },
                { id: "bleu", name: "Bleu", supplement: 0 },
                { id: "bien-cuit", name: "Bien cuit", supplement: 0 },
              ],
            },
          ],
        },
        {
          id: "burger-boho",
          image: unsplash("photo-1568901346375-23c9450c58cd", 400),
          name: "Burger original Boho",
          description: "Servi avec frites fraîches maison et salade assaisonnée.",
          price: 16.9,
          badges: ["maison"],
          options: [
            {
              id: "cuisson",
              name: "Cuisson",
              obligatoire: true,
              choices: [
                { id: "a-point", name: "À point", supplement: 0 },
                { id: "saignant", name: "Saignant", supplement: 0 },
                { id: "bleu", name: "Bleu", supplement: 0 },
                { id: "bien-cuit", name: "Bien cuit", supplement: 0 },
              ],
            },
          ],
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

const lzSupplements = (id: string, noms: string[]): OptionGroup => ({
  id,
  name: "Suppléments",
  obligatoire: false,
  multiple: true,
  choices: noms.map((nom) => ({
    id: `${id}-${slugLibelle(nom)}`,
    name: nom,
    supplement: 1,
  })),
});

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
 * O’Crousti Poulet (Montpellier) — prospect, franchisé du réseau « O’Crousti
 * Poulet Original » (poulet braisé halal). Carte transcrite du panneau
 * lumineux photographié en boutique (demos/o-crousti-poulet/docs/) : un menu
 * et quatorze suppléments, aux prix de Montpellier. Le panneau ne décrit
 * aucun article : pas de description inventée. Adresse, téléphone et avis :
 * la boutique de Port Marianne (230 rue Vendémiaire). Photos : les visuels
 * produits du site de la franchise, et trois photos de banque (frites,
 * canette, bouteille) recadrées — toutes dans public/o-crousti-poulet/.
 * Source de vérité du profil : demos/o-crousti-poulet/profile.json.
 */

/*
 * « +1 accompagnement au choix » : le panneau ne les nomme pas. Ce sont les
 * trois accompagnements de sa liste de suppléments — déduction à confirmer
 * avec le gérant.
 */
const OCP_ACCOMPAGNEMENTS = ["Frites", "Riz oriental", "Pâtes crémo"] as const;

/*
 * Le panneau n'imprime que « Boisson 33cl » et « Bouteille », sans marque.
 * Canettes lues sur la page Uber Eats de la boutique Vendémiaire (celles à
 * 2,00 €, le prix du panneau) — à confirmer avec le gérant.
 */
const OCP_BOISSONS = [
  "Coca-Cola",
  "Coca-Cola Zéro",
  "Coca-Cola Cherry",
  "Fanta Orange",
  "Orangina",
  "Ice Tea Pêche",
] as const;

const ocpBoisson = groupeChoix("boisson", "Boisson", OCP_BOISSONS, {
  obligatoire: true,
});

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
      id: "menu-solo",
      name: "Menu Solo Inclus",
      items: [
        {
          id: "menu-solo",
          name: "Menu Solo",
          description:
            // Espaces insécables (\u00a0) : « ou 2 saucisses » ne se coupe
            // pas, la ligne ne se casse que devant un « ou », comme sur le
            // panneau.
            "1\u00a0cuisse de\u00a0poulet ou\u00a03\u00a0pilons ou\u00a04\u00a0ailes ou\u00a02\u00a0saucisses\n+\u00a01\u00a0accompagnement au\u00a0choix\n+\u00a01\u00a0boisson 33\u00a0cl",
          price: 6.9,
          image: "/o-crousti-poulet/menu-solo.webp",
          options: [
            groupeChoix(
              "viande",
              "Viande",
              ["1 cuisse de poulet", "3 pilons", "4 ailes", "2 saucisses"],
              { obligatoire: true }
            ),
            groupeChoix("accompagnement", "Accompagnement", OCP_ACCOMPAGNEMENTS, {
              obligatoire: true,
            }),
            groupeChoix("boisson", "Boisson 33\u00a0cl", OCP_BOISSONS, {
              obligatoire: true,
            }),
          ],
        },
      ],
    },
    {
      id: "supplements",
      name: "Nos Suppléments",
      items: [
        { id: "poulet", name: "Poulet", price: 8.5, image: "/o-crousti-poulet/poulet.webp" },
        { id: "demi-poulet", name: "Demi poulet", price: 4.5, image: "/o-crousti-poulet/demi-poulet.webp" },
        { id: "cuisse", name: "Cuisse", price: 2.8, image: "/o-crousti-poulet/cuisse.webp" },
        { id: "pilons", name: "Pilons", detail: "x3", price: 2.8, image: "/o-crousti-poulet/pilons.webp" },
        { id: "ailes", name: "Ailes", detail: "x4", price: 2.8, image: "/o-crousti-poulet/ailes.webp" },
        { id: "blanc-de-poulet", name: "Blanc de poulet", price: 4, image: "/o-crousti-poulet/blanc-de-poulet.webp" },
        { id: "donut", name: "Donut", price: 2.5, image: "/o-crousti-poulet/donut.webp" },
        { id: "saucisse", name: "Saucisse", price: 2, image: "/o-crousti-poulet/saucisse.webp" },
        { id: "riz-oriental", name: "Riz oriental", price: 3.8, image: "/o-crousti-poulet/riz-oriental.webp" },
        { id: "pates-cremo", name: "Pâtes crémo", price: 3.8, image: "/o-crousti-poulet/pates-cremo.webp" },
        { id: "frites", name: "Frites", price: 3.5, image: "/o-crousti-poulet/frites.webp" },
        { id: "boisson", name: "Boisson", detail: "33\u00a0cl", price: 2, image: "/o-crousti-poulet/boisson.webp", options: [ocpBoisson] },
        { id: "bouteille", name: "Bouteille", price: 4, image: "/o-crousti-poulet/bouteille.webp", options: [ocpBoisson] },
        {
          id: "dessert",
          name: "Dessert",
          price: 4,
          image: "/o-crousti-poulet/tiramisu.webp",
          /* Les deux desserts à 4 € de la carte nationale du réseau ; le
             panneau n'en nomme aucun. À confirmer avec le gérant. */
          options: [
            groupeChoix("dessert", "Dessert", ["Tiramisu", "Tarte Daim"], {
              obligatoire: true,
            }),
          ],
        },
      ],
    },
  ],
};

const restaurants: Record<string, Restaurant> = {
  [trattoriaLucia.slug]: trattoriaLucia,
  [boho.slug]: boho,
  [lzFood.slug]: lzFood,
  [oCroustiPoulet.slug]: oCroustiPoulet,
};

/** Classe de thème CSS par établissement (voir globals.css) : habille le
 * menu public et les démos aux couleurs du restaurant. Absente ⇒ thème
 * Ominin par défaut. */
const themeClasses: Record<string, string> = {
  [boho.slug]: "theme-boho",
  [lzFood.slug]: "theme-lz-food",
  [oCroustiPoulet.slug]: "theme-o-crousti-poulet",
};

export function restaurantThemeClass(slug: string): string | undefined {
  return themeClasses[slug];
}

export function getRestaurant(slug: string): Restaurant | undefined {
  return restaurants[slug];
}

export const DEMO_SLUG = trattoriaLucia.slug;

/**
 * Lien « itinéraire » vers l'adresse de l'établissement. Recherche Google Maps
 * plutôt qu'un point GPS : on n'a que l'adresse écrite, et la recherche est
 * reprise par l'application de cartographie par défaut du téléphone.
 */
export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Espace insécable avant € : le prix ne se coupe jamais de sa devise. */
export function formatPrice(price: number): string {
  return `${price.toFixed(2).replace(".", ",")}\u00a0€`;
}

/**
 * Le numéro tel qu'un client français le lit (« 07 49 20 64 34 ») ; le
 * lien, lui, garde la forme internationale (tel:, wa.me).
 */
export function displayPhone(phone: string): string {
  return phone.replace(/^\+33\s?/, "0");
}

/** L'adresse affichée : le code postal ne se sépare pas de sa ville. */
export function displayAddress(address: string): string {
  return address.replace(/\b(\d{5}) /, "$1\u00a0");
}

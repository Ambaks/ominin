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
  /** undefined ⇒ disponible. */
  disponible?: boolean;
  /** undefined/null ⇒ stock illimité. */
  stock?: number | null;
  options?: OptionGroup[];
  /** Taux de TVA (%), pour l'envoi en caisse. undefined ⇒ 10 (défaut base). */
  vatRate?: number;
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
  /** undefined ⇒ fond dégradé de repli dans le hero. */
  coverImage?: string;
  /** Logo de l'établissement (chemin public), affiché dans le hero du menu. */
  logo?: string;
  address: string;
  phone: string;
  hours: string;
  categories: MenuCategory[];
  /** Fournisseur de paiement présélectionné au seed (démos clients). */
  paymentProvider?: "stripe" | "sumup";
}

export const unsplash = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

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
          image: unsplash("photo-1566995541428-f4e719c69aa2"),
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
  tagline: "Ambiance bohème · L'élégance de la simplicité",
  logo: "/boho/logo.svg",
  address: "72 Avenue des États-Unis, 31200 Toulouse",
  phone: "+33 7 72 29 62 98",
  hours: "Lun–Ven 12h–14h · 16h–2h · Sam 18h–3h · Dim 16h–2h",
  // SumUp présélectionné : le gérant termine l'OAuth dans /gestion/etablissement.
  paymentProvider: "sumup",
  categories: [
    {
      id: "a-partager",
      name: "À partager",
      items: [
        { id: "nems-legumes", name: "Nems légumes (x4)", price: 6, image: unsplash("photo-1544025162-d76694265947", 400) },
        { id: "nems-poulet", name: "Nems poulet (x4)", price: 6, image: unsplash("photo-1515022376298-7333f33e704b", 400) },
        { id: "crevettes-tempura", name: "Crevettes tempura (x2)", price: 7, image: unsplash("photo-1565680018434-b513d5e5fd47", 400) },
        { id: "samoussas-boeuf", name: "Samoussas bœuf (x4)", price: 6, image: unsplash("photo-1601050690597-df0568f70950", 400) },
        { id: "yakitori-boeuf", name: "Yakitori bœuf fromage (x2)", price: 6, image: unsplash("photo-1778327564625-abda522078de", 400) },
        {
          id: "assortiment-boho",
          image: unsplash("photo-1541529086526-db283c563270", 400),
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
          image: unsplash("photo-1600891964092-4316c288032e", 400),
          name: "L'Entrecôte « La Fameuse »",
          description:
            "Grillée à la perfection, notre sauce verte maison, frites fraîches et salade.",
          price: 20,
          badges: ["top"],
        },
        {
          id: "piece-boeuf",
          image: unsplash("photo-1546964124-0cce460f38ef", 400),
          name: "Pièce de bœuf grillée",
          description: "Servie avec frites fraîches maison et salade assaisonnée.",
          price: 16.9,
        },
        {
          id: "piece-poulet",
          image: unsplash("photo-1598515214211-89d3c73ae83b", 400),
          name: "Pièce de poulet grillée",
          description: "Servie avec frites fraîches maison et salade assaisonnée.",
          price: 16.9,
        },
        {
          id: "magret-canard",
          image: unsplash("photo-1580554530778-ca36943938b2", 400),
          name: "Magret de canard grillé",
          description: "Servi avec frites fraîches maison et salade assaisonnée.",
          price: 16.9,
        },
        {
          id: "saumon-plancha",
          image: unsplash("photo-1467003909585-2f8a72700288", 400),
          name: "Escalope de saumon frais à la plancha",
          description: "Servie avec frites fraîches maison et salade assaisonnée.",
          price: 16.9,
        },
        {
          id: "burger-boho",
          image: unsplash("photo-1568901346375-23c9450c58cd", 400),
          name: "Burger original Boho",
          description: "Servi avec frites fraîches maison et salade assaisonnée.",
          price: 16.9,
          badges: ["maison"],
        },
      ],
    },
    {
      id: "pizzas",
      name: "Pizzas",
      items: [
        {
          id: "pizza-margarita",
          image: unsplash("photo-1574071318508-1cdbab80d002", 400),
          name: "Pizza Margarita",
          description: "Base tomate, mozzarella et basilic.",
          price: 13,
        },
        {
          id: "pizza-saumon",
          image: unsplash("photo-1786175307135-f07babbf501b", 400),
          name: "Pizza Saumon Norvégienne",
          description: "Base crème fraîche, mozzarella, saumon, aneth.",
          price: 15,
        },
        {
          id: "pizza-poulet-indienne",
          image: unsplash("photo-1613564834361-9436948817d1", 400),
          name: "Pizza Poulet Indienne",
          description: "Base crème, poulet, sauce curry, mozzarella.",
          price: 15,
        },
        {
          id: "pizza-chevre-miel",
          image: unsplash("photo-1513104890138-7c749659a591", 400),
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
          image: unsplash("photo-1546549032-9571cd6b27df", 400),
          name: "Carpaccio de bœuf",
          description:
            "Roquette, parmesan, tomates cerises, copeaux de parmesan, huile d'olive.",
          price: 16.5,
        },
        {
          id: "tomate-burrata",
          image: unsplash("photo-1608897013039-887f21d8c804", 400),
          name: "Tomate burrata",
          description: "Tomates anciennes, burrata crémeuse, pesto, roquette.",
          price: 14.5,
        },
        {
          id: "salade-cesar",
          image: unsplash("photo-1512621776951-a57141f2eefd", 400),
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
        { id: "creme-brulee", name: "Crème brûlée", price: 8, image: unsplash("photo-1470124182917-cc6e71b22ecc", 400) },
        { id: "tiramisu-cafe", name: "Tiramisu au café", price: 8, image: unsplash("photo-1571877227200-a0d98ea607e9", 400) },
        { id: "brioche-pain-perdu", name: "Brioche façon pain perdu", price: 8, image: unsplash("photo-1484723091739-30a097e8f929", 400) },
        { id: "coupe-fruits", name: "Coupe de fruits", price: 8, image: unsplash("photo-1490474418585-ba9bad8fd0ea", 400) },
        { id: "crepes-nutella", name: "Crêpes Nutella", price: 8, image: unsplash("photo-1519676867240-f03562e64548", 400) },
        { id: "gaufre-nutella", name: "Gaufre Nutella", price: 8, image: unsplash("photo-1562376552-0d160a2f238d", 400) },
        {
          id: "coupe-glace",
          image: unsplash("photo-1497034825429-c343d7c6a68f", 400),
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
          image: unsplash("photo-1498837167922-ddd27525d352", 400),
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
          image: unsplash("photo-1551024709-8f23befc6f87", 400),
          name: "Mojito",
          description: "Fraise, framboise, passion, mango, ananas, menthe.",
          price: 8,
        },
        {
          id: "sex-on-the-beach",
          image: unsplash("photo-1514362545857-3bc16c4c7d1b", 400),
          name: "Sex on the Beach",
          description: "Orange, ananas, pêche, cranberry.",
          price: 8,
        },
        {
          id: "blue-lagoon",
          image: unsplash("photo-1560512823-829485b8bf24", 400),
          name: "Blue Lagoon",
          description: "Ananas, curaçao blue, coco, crème.",
          price: 8,
        },
        {
          id: "ginger-lemonade",
          image: unsplash("photo-1625772299848-391b6a87d7b3", 400),
          name: "Ginger Lemonade",
          description: "Ginger, lemon, miel, soda.",
          price: 8,
        },
        { id: "terracota", name: "Terracota", description: "Fraise, orange.", price: 8, image: unsplash("photo-1536935338788-846bb9981813", 400) },
        {
          id: "latina-passion",
          image: unsplash("photo-1541807084-5c52b6b3adef", 400),
          name: "Latina Passion",
          description: "Passion, citron vert.",
          price: 8,
        },
        {
          id: "citronnade-maison",
          image: unsplash("photo-1621263764928-df1444c5e859", 400),
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
        { id: "pina-colada", name: "Pina Colada", description: "Ananas, coco.", price: 7, image: unsplash("photo-1589733955941-5eeaf752f6dd", 400) },
        {
          id: "coco-mango",
          image: unsplash("photo-1623065422902-30a2d299bbe4", 400),
          name: "Coco Mango",
          description: "Mangue, noix de coco, fruit de la passion.",
          price: 7,
        },
        {
          id: "red-dragon",
          image: unsplash("photo-1553530666-ba11a7da3888", 400),
          name: "Red Dragon",
          description: "Fraise, framboise, ananas.",
          price: 7,
        },
        {
          id: "rose-garden",
          image: unsplash("photo-1505252585461-04db1eb84571", 400),
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
        { id: "milkshake-popcorn", name: "Pop Corn", price: 9, image: unsplash("photo-1572490122747-3968b75cc699", 400) },
        { id: "fraise-tagada", name: "Fraise Tagada", price: 9, image: unsplash("photo-1686638745403-d21193f16b2f", 400) },
        { id: "banoffee", name: "Banoffee", price: 9, image: unsplash("photo-1541658016709-82535e94bc69", 400) },
      ],
    },
    {
      id: "boissons",
      name: "Boissons",
      items: [
        {
          id: "jus-fruits-frais",
          image: unsplash("photo-1622597467836-f3285f2131b8", 400),
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
        { id: "cappuccino", name: "Cappuccino", price: 4, image: unsplash("photo-1572442388796-11668a67e53d", 400) },
        { id: "latte-macchiato", name: "Latte Macchiato", price: 4.5, image: unsplash("photo-1485808191679-5f86510681a1", 400) },
      ],
    },
  ],
};

const restaurants: Record<string, Restaurant> = {
  [trattoriaLucia.slug]: trattoriaLucia,
  [boho.slug]: boho,
};

/** Classe de thème CSS par établissement (voir globals.css) : habille le
 * menu public et les démos aux couleurs du restaurant. Absente ⇒ thème
 * Ominin par défaut. */
const themeClasses: Record<string, string> = {
  [boho.slug]: "theme-boho",
};

export function restaurantThemeClass(slug: string): string | undefined {
  return themeClasses[slug];
}

export function getRestaurant(slug: string): Restaurant | undefined {
  return restaurants[slug];
}

export const DEMO_SLUG = trattoriaLucia.slug;

export function formatPrice(price: number): string {
  const formatted = Number.isInteger(price)
    ? String(price)
    : price.toFixed(2).replace(".", ",");
  return `${formatted} €`;
}

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
  coverImage: string;
  address: string;
  phone: string;
  hours: string;
  categories: MenuCategory[];
}

const unsplash = (id: string, w = 1200) =>
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

const restaurants: Record<string, Restaurant> = {
  [trattoriaLucia.slug]: trattoriaLucia,
};

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

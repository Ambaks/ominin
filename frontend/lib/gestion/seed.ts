import { DEMO_SLUG, getRestaurant } from "@/lib/menu-data";
import { SEED_TABLE_COUNT, STORAGE_VERSION } from "./constants";
import type {
  GestionState,
  Order,
  OrderItem,
  OrderItemOption,
} from "./types";

/**
 * État de démonstration : le menu de la Trattoria Lucia enrichi de stocks,
 * disponibilités et options, plus des commandes, tables et une formule
 * plausibles pour exercer chaque écran.
 */
export function seed(): GestionState {
  const restaurant = getRestaurant(DEMO_SLUG)!;
  const categories = structuredClone(restaurant.categories);

  const byId = new Map(
    categories.flatMap((category) => category.items).map((item) => [item.id, item])
  );
  const item = (id: string) => byId.get(id)!;

  item("arancini").stock = 0;
  item("tartufo").stock = 5;
  item("risotto").disponible = false;
  item("margherita").options = [
    {
      id: crypto.randomUUID(),
      name: "Taille",
      obligatoire: true,
      choices: [
        { id: crypto.randomUUID(), name: "Classique 29 cm", supplement: 0 },
        { id: crypto.randomUUID(), name: "Grande 33 cm", supplement: 4 },
      ],
    },
  ];
  item("tagliata").options = [
    {
      id: crypto.randomUUID(),
      name: "Cuisson",
      obligatoire: true,
      choices: [
        { id: crypto.randomUUID(), name: "Saignante", supplement: 0 },
        { id: crypto.randomUUID(), name: "À point", supplement: 0 },
        { id: crypto.randomUUID(), name: "Bien cuite", supplement: 0 },
      ],
    },
  ];

  const line = (
    itemId: string,
    quantity: number,
    options?: OrderItemOption[]
  ): OrderItem => ({
    id: crypto.randomUUID(),
    itemId,
    name: item(itemId).name,
    quantity,
    unitPrice: item(itemId).price,
    options,
  });
  const minutesAgo = (minutes: number) =>
    new Date(Date.now() - minutes * 60_000).toISOString();

  const groupeId = crypto.randomUUID();

  const orders: Order[] = [
    {
      id: crypto.randomUUID(),
      tableId: "table-2",
      status: "en_attente",
      createdAt: minutesAgo(4),
      items: [
        line("burrata", 1),
        line("margherita", 1, [
          { groupName: "Taille", choiceName: "Grande 33 cm", supplement: 4 },
        ]),
      ],
    },
    {
      id: crypto.randomUUID(),
      tableId: "table-7",
      status: "en_attente",
      createdAt: minutesAgo(1),
      items: [line("carbonara", 2), line("spritz", 1)],
    },
    {
      id: crypto.randomUUID(),
      tableId: "table-3",
      status: "en_preparation",
      createdAt: minutesAgo(14),
      items: [
        line("tagliata", 1, [
          { groupName: "Cuisson", choiceName: "Saignante", supplement: 0 },
        ]),
        line("moretti", 1),
      ],
    },
    {
      id: crypto.randomUUID(),
      tableId: "table-9",
      status: "prete",
      createdAt: minutesAgo(22),
      items: [line("diavola", 2), line("san-pellegrino", 1)],
    },
    {
      id: crypto.randomUUID(),
      tableId: "table-8",
      status: "servie",
      createdAt: minutesAgo(38),
      items: [line("quattro", 1), line("panna-cotta", 2)],
    },
    {
      id: crypto.randomUUID(),
      tableId: "table-4",
      groupeId,
      status: "en_preparation",
      createdAt: minutesAgo(11),
      items: [line("planche-lucia", 1), line("negroni", 2)],
    },
    {
      id: crypto.randomUUID(),
      tableId: "table-6",
      groupeId,
      status: "prete",
      createdAt: minutesAgo(11),
      items: [line("linguine", 1), line("polpo", 1), line("vermentino", 1)],
    },
    {
      id: crypto.randomUUID(),
      tableId: "table-5",
      status: "payee",
      createdAt: minutesAgo(95),
      items: [line("margherita", 2), line("tiramisu", 2)],
      paymentMode: "especes",
    },
    {
      id: crypto.randomUUID(),
      tableId: "table-1",
      status: "payee",
      createdAt: minutesAgo(150),
      items: [line("osso-buco", 1), line("nebbiolo", 1)],
      paymentMode: "carte",
    },
    {
      id: crypto.randomUUID(),
      tableId: "table-10",
      status: "annulee",
      createdAt: minutesAgo(45),
      items: [line("carpaccio", 1)],
    },
  ];

  const article = (
    itemId: string,
    supplement = 0
  ): GestionState["formules"][number]["etapes"][number]["articles"][number] => ({
    id: crypto.randomUUID(),
    name: item(itemId).name,
    supplement,
    itemId,
    options: item(itemId).options
      ? structuredClone(item(itemId).options)
      : undefined,
  });

  return {
    version: STORAGE_VERSION,
    etablissement: {
      slug: restaurant.slug,
      name: restaurant.name,
      offre: "connect",
    },
    role: "gerant",
    categories,
    formules: [
      {
        id: crypto.randomUUID(),
        name: "Formule Pranzo",
        description: "Entrée + plat au choix, servie le midi en semaine.",
        price: 24,
        disponible: true,
        etapes: [
          {
            id: crypto.randomUUID(),
            name: "Entrée",
            obligatoire: true,
            articles: [article("burrata"), article("arancini")],
          },
          {
            id: crypto.randomUUID(),
            name: "Plat",
            obligatoire: true,
            articles: [
              article("margherita"),
              article("carbonara"),
              article("tagliata", 6),
            ],
          },
          {
            id: crypto.randomUUID(),
            name: "Dessert",
            obligatoire: false,
            articles: [article("tiramisu", 3), article("affogato", 2)],
          },
        ],
      },
    ],
    tables: Array.from({ length: SEED_TABLE_COUNT }, (_, index) => ({
      id: `table-${index + 1}`,
      number: index + 1,
    })),
    groups: [
      { id: groupeId, tableIds: ["table-4", "table-6"], createdAt: minutesAgo(11) },
    ],
    orders,
  };
}

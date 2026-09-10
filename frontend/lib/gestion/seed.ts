import { DEMO_SLUG, getRestaurant } from "@/lib/menu-data";
import { FEATURES, ORDER_TABS, SEED_TABLE_COUNT } from "./constants";
import { lineTotal } from "./selectors";
import type {
  GestionState,
  Order,
  OrderItem,
  OrderItemOption,
  OrderPayment,
  PaymentLeg,
} from "./types";

/**
 * Commande de démonstration avant ses jambes de règlement : elles se
 * déduisent des lignes réglées, comme le backfill SQL le fait de l'historique.
 * Une addition partagée entre liquide et carte échappe à cette déduction —
 * cashPart dit alors ce qui est parti en espèces, la carte prend le reste.
 */
type DraftOrder = Omit<Order, "payments"> & { cashPart?: number };

function legsOf(order: DraftOrder): OrderPayment[] {
  const settled = order.items.filter((line) => line.paidMode);
  if (order.cashPart != null) {
    const goods = settled.reduce((sum, line) => sum + lineTotal(line), 0);
    return [
      {
        mode: "especes",
        amount: order.cashPart,
        cashGiven: order.cashPart,
        cashChange: 0,
        paidAt: order.createdAt,
      },
      {
        mode: "carte",
        amount: Math.round((goods - order.cashPart) * 100) / 100,
        paidAt: order.createdAt,
      },
    ];
  }
  const byMode = new Map<PaymentLeg, number>();
  for (const line of settled) {
    if (line.paidMode === "mixte") continue;
    byMode.set(
      line.paidMode as PaymentLeg,
      (byMode.get(line.paidMode as PaymentLeg) ?? 0) + lineTotal(line)
    );
  }
  return [...byMode].map(([mode, amount]) => ({
    mode,
    amount,
    cashGiven: mode === "especes" ? order.cashGiven : undefined,
    cashChange: mode === "especes" ? order.cashChange : undefined,
    paidAt: order.createdAt,
  }));
}

/**
 * État de démonstration : le menu de la Trattoria Lucia enrichi de stocks,
 * disponibilités et options, plus des commandes, tables et une formule
 * plausibles pour exercer chaque écran — additions à encaisser (dont une
 * réglée en partie), tables payées à servir (dont une servie à moitié et une
 * réglée en ligne), une addition partagée entre espèces et carte, commandes
 * closes.
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

  const minutesAgo = (minutes: number) =>
    new Date(Date.now() - minutes * 60_000).toISOString();

  const line = (
    itemId: string,
    quantity: number,
    state: Pick<OrderItem, "paidMode" | "servedAt"> = {},
    options?: OrderItemOption[]
  ): OrderItem => ({
    id: crypto.randomUUID(),
    itemId,
    name: item(itemId).name,
    quantity,
    // Même convention que place_order : suppléments inclus dans unitPrice.
    unitPrice:
      item(itemId).price +
      (options?.reduce((sum, option) => sum + option.supplement, 0) ?? 0),
    options,
    ...state,
  });

  const drafts: DraftOrder[] = [
    {
      id: crypto.randomUUID(),
      type: "sur_place",
      tableId: "table-2",
      status: "en_attente",
      createdAt: minutesAgo(4),
      items: [
        line("burrata", 1),
        line("margherita", 1, {}, [
          { groupName: "Taille", choiceName: "Grande 33 cm", supplement: 4 },
        ]),
      ],
    },
    {
      id: crypto.randomUUID(),
      type: "sur_place",
      tableId: "table-7",
      status: "en_attente",
      createdAt: minutesAgo(1),
      items: [line("carbonara", 2), line("spritz", 1)],
    },
    {
      id: crypto.randomUUID(),
      type: "sur_place",
      tableId: "table-8",
      status: "en_attente",
      createdAt: minutesAgo(9),
      items: [
        line("quattro", 1, { paidMode: "especes" }),
        line("panna-cotta", 2),
      ],
    },
    {
      id: crypto.randomUUID(),
      type: "sur_place",
      tableId: "table-3",
      status: "payee",
      createdAt: minutesAgo(14),
      paymentMode: "carte",
      items: [
        line("tagliata", 1, { paidMode: "carte" }, [
          { groupName: "Cuisson", choiceName: "Saignante", supplement: 0 },
        ]),
        line("moretti", 1, { paidMode: "carte" }),
      ],
    },
    {
      id: crypto.randomUUID(),
      type: "sur_place",
      tableId: "table-9",
      status: "payee",
      createdAt: minutesAgo(22),
      paymentMode: "especes",
      cashGiven: 40,
      cashChange: 4,
      items: [
        line("diavola", 2, { paidMode: "especes", servedAt: minutesAgo(6) }),
        line("san-pellegrino", 1, { paidMode: "especes" }),
      ],
    },
    {
      id: crypto.randomUUID(),
      type: "sur_place",
      tableId: "table-4",
      status: "payee",
      createdAt: minutesAgo(11),
      paidOnline: true,
      paymentMode: "carte",
      tipAmount: 3,
      items: [
        line("planche-lucia", 1, { paidMode: "en_ligne" }),
        line("negroni", 2, { paidMode: "en_ligne" }),
      ],
    },
    {
      id: crypto.randomUUID(),
      type: "sur_place",
      tableId: "table-5",
      status: "servie",
      createdAt: minutesAgo(95),
      paymentMode: "especes",
      items: [
        line("margherita", 2, { paidMode: "especes", servedAt: minutesAgo(70) }),
        line("tiramisu", 2, { paidMode: "especes", servedAt: minutesAgo(50) }),
      ],
    },
    {
      id: crypto.randomUUID(),
      type: "sur_place",
      tableId: "table-1",
      status: "servie",
      createdAt: minutesAgo(150),
      paymentMode: "carte",
      items: [
        line("osso-buco", 1, { paidMode: "carte", servedAt: minutesAgo(120) }),
        line("nebbiolo", 1, { paidMode: "carte", servedAt: minutesAgo(140) }),
      ],
    },
    {
      id: crypto.randomUUID(),
      type: "sur_place",
      tableId: "table-6",
      status: "servie",
      createdAt: minutesAgo(60),
      paymentMode: "mixte",
      cashPart: 20,
      items: [
        line("osso-buco", 1, { paidMode: "mixte", servedAt: minutesAgo(40) }),
        line("spritz", 2, { paidMode: "mixte", servedAt: minutesAgo(50) }),
      ],
    },
    {
      id: crypto.randomUUID(),
      type: "sur_place",
      tableId: "table-10",
      status: "annulee",
      createdAt: minutesAgo(45),
      items: [line("carpaccio", 1)],
    },
  ];

  const orders: Order[] = drafts.map(({ cashPart, ...order }) => ({
    ...order,
    payments: legsOf({ ...order, cashPart }),
  }));

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
    etablissement: {
      id: crypto.randomUUID(),
      slug: restaurant.slug,
      name: restaurant.name,
      tagline: restaurant.tagline,
      address: restaurant.address,
      phone: restaurant.phone,
      hours: restaurant.hours,
      offre: "connect",
      onlinePayment: false,
      paymentProvider: null,
      collectSlotCapacity: 5,
      adminPinSet: false,
    },
    subscriptionStatus: "active",
    collectSubscriptionStatus: null,
    userId: "demo-user",
    role: "gerant",
    members: [],
    // La démonstration montre tout : l'offre connect ouvre chaque écran.
    features: Object.fromEntries(
      FEATURES.map((feature) => [feature, true])
    ) as GestionState["features"],
    orderTabs: ORDER_TABS,
    staff: [],
    categories,
    // La démo montre la carte telle quelle : un tarif planifié se règle, il
    // ne se raconte pas.
    priceRules: [],
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
      staffId: null,
      groupId: null,
    })),
    orders,
  };
}

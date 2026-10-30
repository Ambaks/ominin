import { getRestaurant } from "@/lib/menu-data";
import { demoState, paidOrder, type Line, type Scenario, type ServiceDemo } from "../_service/fixtures";

/*
 * Un coup de feu au comptoir, joué sans base : les commandes payées en ligne
 * d'un restaurant fast food, telles que l'espace de gestion les reçoit ; leurs
 * lignes se désignent comme dans ../_service/fixtures.
 */

interface Ticket {
  number: number;
  /** Passée il y a tant de minutes, à l'ouverture de l'écran. */
  minutesAgo: number;
  status: "servie" | "prete" | "payee";
  lines: Line[];
}

interface Service {
  /** Le restaurant que montre l'écran, quand la carte est celle de tout un réseau. */
  site?: string;
  /** Le service jusqu'ici, numéros consécutifs : remises, prêtes, en préparation. */
  tickets: Ticket[];
  /**
   * Commandes ouvertes déjà là quand le coup de feu commence (rush) ; les
   * suivantes arrivent. Assez peu pour que l'arrivée se voie à l'écran.
   */
  openAtStart: number;
  /** Payées ensuite, dans cet ordre, reprises en boucle sous les numéros suivants. */
  arrivals: Line[][];
  /** Secondes avant chaque arrivée, reprises en boucle. */
  cadenceS: number[];
  /** Commandes ouvertes au-delà desquelles l'arrivée suivante attend une remise. */
  maxOpen: number;
}

const SERVICES: Record<string, Service> = {
  // Un matin de boulangerie : la file avant le travail.
  "boulangerie-cyprien": {
    tickets: [
      { number: 12, minutesAgo: 24, status: "servie", lines: [["Croissant", 2], ["Baguette de tradition", 1]] },
      { number: 13, minutesAgo: 20, status: "servie", lines: [["Chocolatine", 3]] },
      { number: 14, minutesAgo: 16, status: "servie", lines: [["Pain Cyprien", 1], ["Flan", 2]] },
      { number: 15, minutesAgo: 12, status: "servie", lines: [["Chausson aux pommes", 1], ["Baguette tradition aux graines", 1]] },
      { number: 16, minutesAgo: 8, status: "prete", lines: [["Éclair tout chocolat", 2], ["Pain complet", 1]] },
      { number: 17, minutesAgo: 5, status: "payee", lines: [["Croissant", 4], ["Chocolatine", 2]] },
      { number: 18, minutesAgo: 3, status: "payee", lines: [["Paris-Brest", 1], ["Baguette de tradition", 2]] },
      { number: 19, minutesAgo: 1, status: "payee", lines: [["Pain des Copains", 1], ["Chou praliné-pécan", 2]] },
    ],
    openAtStart: 3,
    arrivals: [
      [["Croissant", 2], ["Pain viennois", 1]],
      [["Baba au rhum revisité", 2]],
      [["Baguette au charbon végétal", 1], ["Flan", 1]],
      [["Tarte framboise-basilic", 1], ["Chocolatine", 2]],
      [["Millefeuille caramel", 2], ["Pain de mie boulanger", 1]],
    ],
    cadenceS: [6, 32, 41, 27, 45, 30],
    maxOpen: 10,
  },
  // Une nuit à L'Étoile : les commandes du bar, payées sans quitter la piste.
  "l-etoile": {
    tickets: [
      { number: 201, minutesAgo: 26, status: "servie", lines: [["Moët Brut", 1], ["Coca-Cola", 2]] },
      { number: 202, minutesAgo: 22, status: "servie", lines: [["Black Label", 1], ["Fuzetea", 2]] },
      { number: 203, minutesAgo: 18, status: "servie", lines: [["Ciroc", 1], ["Hexis Energy", 3]] },
      { number: 204, minutesAgo: 13, status: "servie", lines: [["Don Julio Blanco", 1], ["Cristaline", 2]] },
      { number: 205, minutesAgo: 9, status: "prete", lines: [["Ruinart Blanc de Blancs", 1]] },
      { number: 206, minutesAgo: 5, status: "payee", lines: [["Belvedere", 1], ["Coca-Cola Zéro", 3]] },
      { number: 207, minutesAgo: 3, status: "payee", lines: [["Jack Daniel's", 1], ["Coca-Cola", 2]] },
      { number: 208, minutesAgo: 1, status: "payee", lines: [["Moët Rosé", 1], ["Cristaline", 1]] },
    ],
    openAtStart: 3,
    arrivals: [
      [["Hennessy Fine", 1], ["Coca-Cola", 2]],
      [["Tanqueray Ten", 1], ["Fuzetea", 2]],
      [["Moët Ice", 1]],
      [["Zacapa", 1], ["Coca-Cola Zéro", 2]],
      [["Dom Pérignon Lumineuse", 1], ["Cristaline", 2]],
    ],
    cadenceS: [6, 32, 41, 27, 45, 30],
    maxOpen: 10,
  },
  "o-crousti-poulet": {
    tickets: [
      { number: 30, minutesAgo: 40, status: "servie", lines: [["Menu Solo", 1, "1 cuisse", "Potatoes", "Pepsi"]] },
      { number: 31, minutesAgo: 36, status: "servie", lines: [["Menu Duo", 1, "Riz Crousti", "Potatoes", "Pepsi", "Lipton"]] },
      { number: 32, minutesAgo: 33, status: "servie", lines: [["Poulet Entier", 1], ["Riz Crousti", 1], ["Bouteille", 1, "Pepsi"]] },
      { number: 33, minutesAgo: 29, status: "servie", lines: [["Menu Costaud", 1, "Patates Sautées", "7Up", "Sauce Piquante"]] },
      { number: 34, minutesAgo: 25, status: "servie", lines: [["Menu Solo", 2, "3 pilons", "Potatoes", "Lipton"]] },
      { number: 35, minutesAgo: 21, status: "servie", lines: [["Tenders croustillants", 2], ["Potatoes", 1], ["Canette", 1, "Pepsi"]] },
      { number: 36, minutesAgo: 16, status: "payee", lines: [["Menu Solo", 1, "4 ailes", "Potatoes", "Pepsi", "Sauce Piquante"], ["Donut Poulet & Cheese", 1]] },
      { number: 37, minutesAgo: 12, status: "prete", lines: [["Menu Costaud", 1, "Riz Oriental", "Lipton"]] },
      { number: 38, minutesAgo: 10, status: "prete", lines: [["Menu Solo", 2, "2 tenders", "Riz Crousti", "Pepsi"]] },
      { number: 39, minutesAgo: 9, status: "payee", lines: [["Menu Duo", 1, "Potatoes", "Pâtes Crémo", "Pepsi", "7Up", "Sauce Verte"], ["Tarte Daim", 1]] },
      { number: 40, minutesAgo: 6, status: "payee", lines: [["Demi Poulet", 1], ["Riz Crousti", 1], ["Canette", 1, "Lipton"]] },
      { number: 41, minutesAgo: 5, status: "payee", lines: [["Menu Solo", 1, "2 saucisses", "Patates Sautées", "7Up"]] },
      { number: 42, minutesAgo: 4, status: "payee", lines: [["Menu Gourmand", 1, "10 pilons", "Potatoes", "Alloco", "Pepsi", "Pepsi", "Sauce Piquante"]] },
      { number: 43, minutesAgo: 3, status: "payee", lines: [["Menu Family", 1, "2 poulets", "Riz Crousti", "Riz Crousti", "Potatoes", "Alloco", "Pepsi", "Sauce Oignons"]] },
      { number: 44, minutesAgo: 2, status: "payee", lines: [["Menu Costaud", 1, "Potatoes", "Pepsi", "Sauce Oignons"], ["Nems au Poulet", 4]] },
      { number: 45, minutesAgo: 1, status: "payee", lines: [["Menu Solo", 1, "1 cuisse", "Alloco", "Lipton"], ["Tiramisu", 1]] },
    ],
    openAtStart: 5,
    arrivals: [
      [["Ailes de Poulet", 2], ["Potatoes", 1], ["Canette", 1, "7Up"]],
      [["Menu Solo", 1, "1 cuisse", "Riz Oriental", "Lipton"]],
      [["Menu Duo", 1, "Potatoes", "Riz Crousti", "Pepsi", "Pepsi"], ["Donut Poulet & Cheese", 1]],
      [["Menu Costaud", 1, "Potatoes", "7Up", "Sauce Piquante"]],
      [["Poulet Entier", 1], ["Riz Crousti", 1], ["Pâtes Crémo", 1], ["Bouteille", 1, "Pepsi"]],
      [["Menu Solo", 3, "4 ailes", "Potatoes", "Pepsi"]],
      [["Menu Gourmand", 1, "4 cuisses", "Riz Crousti", "Patates Sautées", "Lipton", "7Up"], ["Tiramisu", 1]],
      [["Menu Solo", 1, "3 pilons", "Pâtes Crémo", "7Up"], ["Bricks au Poulet", 2]],
      [["Menu Family", 1, "4 cuisses", "Potatoes", "Potatoes", "Riz Crousti", "Alloco", "Pepsi", "Sauce Verte"]],
    ],
    cadenceS: [6, 14, 11, 18, 9, 15, 21, 12],
    maxOpen: 14,
  },
  "big-smash": {
    site: "Toulouse Matabiau",
    tickets: [
      { number: 30, minutesAgo: 41, status: "servie", lines: [["Menu Smash Classic", 1, "Frites nature", "Coca Cola"]] },
      { number: 31, minutesAgo: 37, status: "servie", lines: [["Big Combo", 1, "Smash Classic", "Original Cheese", "Frites cheddar", "Coca Cola"]] },
      { number: 32, minutesAgo: 34, status: "servie", lines: [["Menu Big Chicken", 1, "Frites épicées", "Limonade Red Cherry"], ["Milkshake", 1, "Fraise"]] },
      { number: 33, minutesAgo: 30, status: "servie", lines: [["Menu Big Smash", 2, "Frites nature", "Coca Cola", "Sans pickles"]] },
      { number: 34, minutesAgo: 26, status: "servie", lines: [["Tenders", 2], ["Frites cheddar bacon", 1], ["Fuze Tea Pêche", 1]] },
      { number: 35, minutesAgo: 22, status: "servie", lines: [["Menu Original Cheese", 1, "Pops cheddar", "Badoit"], ["Big Kids", 1, "Nuggets x5", "Kinder Country", "Capri-Sun"]] },
      { number: 36, minutesAgo: 17, status: "payee", lines: [["Menu Chicken Spicy", 1, "Frites épicées", "Red Bull"], ["Big Sundae", 1, "Caramel", "Oreo"]] },
      { number: 37, minutesAgo: 13, status: "prete", lines: [["Menu Surf & Turf", 1, "Frites nature", "Limonade Fizz Yuzu"]] },
      { number: 38, minutesAgo: 11, status: "prete", lines: [["Menu Smash Classic", 2, "Frites cheddar", "Coca Cola", "Sans tomate"]] },
      { number: 39, minutesAgo: 9, status: "payee", lines: [["Menu Smash Bacon", 1, "Frites cheddar bacon", "Thé Blanc Tropical", "Sans tomate", "Sauce Big Smash", "Sauce Spicy"], ["Milkshake Pistache Macadamia", 1]] },
      { number: 40, minutesAgo: 7, status: "payee", lines: [["Menu Big Chicken", 1, "Frites nature", "Coca Cola"], ["Chicken Pop-Corn", 1]] },
      { number: 41, minutesAgo: 5, status: "payee", lines: [["Big Smash Burger", 2, "Sans pickles"], ["Frites cheddar bacon", 1], ["Coca Cola", 2]] },
      { number: 42, minutesAgo: 4, status: "payee", lines: [["Menu Grilled Smash", 1, "Pops nature", "Evian"], ["Grilled Nutella", 1]] },
      { number: 43, minutesAgo: 3, status: "payee", lines: [["Big Combo", 1, "Smash Spicy", "Big Fish", "Frites épicées", "Limonade Blue Mango Passion"]] },
      { number: 44, minutesAgo: 2, status: "payee", lines: [["Menu Big Cheese", 1, "Frites cheddar", "Coca Cola", "Sauce Big Smash"], ["Crevettes panées", 1, "x5"]] },
      { number: 45, minutesAgo: 1, status: "payee", lines: [["Menu Original Chicken", 1, "Frites nature", "Badoit"], ["Milkshake", 1, "Vanille"]] },
    ],
    openAtStart: 5,
    arrivals: [
      [["Menu Smash Spicy", 1, "Frites épicées", "Coca Cola"]],
      [["Menu Big Smash", 1, "Frites cheddar bacon", "Thé Blanc Tropical"], ["Big Sundae Pistachio", 1]],
      [["Tenders", 1], ["Frites nature", 1], ["Coca Cola", 1]],
      [["Big Combo", 1, "Smash Classic", "Smash Classic", "Frites cheddar", "Red Bull"]],
      [["Menu Big Chicken", 2, "Frites nature", "Coca Cola"], ["Big Kids", 1, "Cheeseburger", "Kinder Country", "Evian"]],
      [["Menu Smash Bacon", 1, "Pops cheddar bacon", "Limonade Lime Watermelon", "Sans salade"]],
      [["Cheesy Dog", 2], ["Frites cheddar", 1], ["Milkshake", 1, "Caramel"]],
      [["Menu Surf & Turf", 1, "Frites épicées", "Limonade Red Cherry"]],
      [["Menu Chicken Spicy", 1, "Frites nature", "Badoit"], ["Chicken Pop-Corn Spicy", 1]],
    ],
    // Une première arrivée tout de suite, puis le rythme d'un restaurant au coup de feu.
    cadenceS: [6, 32, 41, 27, 45, 30, 38, 25],
    maxOpen: 14,
  },
  "chicken-street": {
    site: "Paris Gare de l’Est",
    tickets: [
      { number: 33, minutesAgo: 41, status: "servie", lines: [["Menu Naan Mix", 1, "Frites", "Coca-Cola", "Sauce Algérienne"]] },
      { number: 34, minutesAgo: 37, status: "servie", lines: [["Family Tenders", 1, "Sauce Blanche"], ["Soda 33\u00a0cl", 2, "Coca-Cola"]] },
      { number: 35, minutesAgo: 34, status: "servie", lines: [["Menu Street B", 1, "Frites", "Fanta Orange", "Sauce Samouraï"]] },
      { number: 36, minutesAgo: 30, status: "servie", lines: [["Naan Tenders Steak", 2, "Sauce Blanche", "Cheddar"], ["Box Onion Rings", 1]] },
      { number: 37, minutesAgo: 26, status: "servie", lines: [["Menu Burger Naan Dynamite", 1, "Frites", "Sprite", "Sauce Dynamite"]] },
      { number: 38, minutesAgo: 22, status: "servie", lines: [["Menu Monster", 1, "Onion rings", "Coca-Cola Zero", "Sauce Monster"], ["Menu Enfant Nuggets", 1, "Oasis Tropical"]] },
      { number: 39, minutesAgo: 17, status: "payee", lines: [["Naan Curry", 1, "Sauce Blanche"], ["Tiramisu", 1]] },
      { number: 40, minutesAgo: 13, status: "prete", lines: [["Menu Tenders 5\u00a0pièces", 1, "Frites", "Fuze Tea", "Sauce Cheddar"]] },
      { number: 41, minutesAgo: 11, status: "prete", lines: [["Menu Naan Mix", 2, "Frites", "Coca-Cola", "Sauce Algérienne"]] },
      { number: 42, minutesAgo: 9, status: "payee", lines: [["Menu Naan Tenders", 1, "Frites", "Coca-Cola Cherry", "Sauce Algérienne", "Sauce Samouraï"], ["Ice Street", 1, "Caramel salé", "Oreo"]] },
      { number: 43, minutesAgo: 7, status: "payee", lines: [["Box Mix 16\u00a0pièces", 1, "Sauce Dynamite"], ["Soda 33\u00a0cl", 2, "Coca-Cola"]] },
      { number: 44, minutesAgo: 5, status: "payee", lines: [["Burger Naan Dynamite", 2, "Sauce Dynamite"], ["Box Onion Rings", 1]] },
      { number: 45, minutesAgo: 4, status: "payee", lines: [["Menu Monster", 1, "Frites", "Sprite", "Sauce Poivre"]] },
      { number: 46, minutesAgo: 3, status: "payee", lines: [["Naan Supreme", 1, "Sauce Algérienne", "Cheddar"], ["Wings 3\u00a0pièces", 1, "Sauce Sweet Thaï"]] },
      { number: 47, minutesAgo: 2, status: "payee", lines: [["Family Mix", 1, "Sauce Blanche"]] },
      { number: 48, minutesAgo: 1, status: "payee", lines: [["Menu Naan Tenders", 1, "Frites", "Coca-Cola", "Sauce Blanche"], ["Ice Mix", 1, "Nutella", "Speculoos"]] },
    ],
    openAtStart: 8,
    arrivals: [
      [["Menu Street B", 1, "Frites", "Coca-Cola", "Sauce Algérienne"]],
      [["Naan Supreme", 1, "Sauce Blanche"], ["Tenders 3\u00a0pièces", 1, "Sauce Cheddar"]],
      [["Menu Tenders 5\u00a0pièces", 2, "Frites", "Coca-Cola Cherry", "Sauce Samouraï"]],
      [["Family Spicy", 1, "Sauce Dynamite"], ["Soda 33\u00a0cl", 3, "Fanta Orange"]],
      [["Menu Naan Mix", 1, "Onion rings", "Fuze Tea", "Sauce Blanche"], ["Menu Enfant Cheese", 1, "Oasis Tropical"]],
      [["Twice", 1, "Sauce Ketchup"], ["Box Mix Solo", 1, "Sauce Algérienne"]],
      [["Menu Burger Naan Dynamite", 1, "Frites", "Sprite", "Sauce Monster"]],
      [["Naan Thaï", 1, "Sauce Sweet Thaï"], ["Ice Street", 1, "Chocolat", "Daim"]],
    ],
    cadenceS: [6, 30, 38, 26, 44, 29, 36, 24],
    maxOpen: 14,
  },
};

export function hasCounterDemo(slug: string): boolean {
  return Object.hasOwn(SERVICES, slug);
}

/** « Chicken Street · Paris Gare de l’Est » : l'enseigne, et le restaurant s'il est précisé. */
export function counterTitle(slug: string, name: string): string {
  const site = SERVICES[slug]?.site;
  return site ? `${name} · ${site}` : name;
}

/** Le service au comptoir de slug, ouvert à openedAt (ms), à l'heure de l'appareil. */
export function counterDemo(
  slug: string,
  openedAt: number,
  scenario: Scenario
): ServiceDemo | null {
  const restaurant = getRestaurant(slug);
  if (!restaurant || !hasCounterDemo(slug)) return null;
  const service = SERVICES[slug];
  const items = restaurant.categories.flatMap((category) => category.items);

  const closed = service.tickets.filter((ticket) => ticket.status === "servie");
  const open = service.tickets.filter((ticket) => ticket.status !== "servie");
  const deferred = scenario === "rush" ? open.slice(service.openAtStart) : [];
  const present = [...closed, ...open.slice(0, open.length - deferred.length)];
  const firstArrival =
    deferred[0]?.number ??
    Math.max(...service.tickets.map((ticket) => ticket.number)) + 1;
  const linesOf = (index: number) =>
    index < deferred.length
      ? deferred[index].lines
      : service.arrivals[(index - deferred.length) % service.arrivals.length];
  const ticket = (number: number, status: Ticket["status"], lines: readonly Line[], createdAt: string) =>
    paidOrder(items, `demo-${number}`, lines, createdAt, { status, tableId: null, orderNumber: number });

  return {
    state: demoState(
      restaurant,
      "fast_food",
      [],
      present.flatMap(
        ({ number, minutesAgo, status, lines }) =>
          ticket(number, status, lines, new Date(openedAt - minutesAgo * 60_000).toISOString()) ?? []
      )
    ),
    arrival: (index, createdAt) => ticket(firstArrival + index, "payee", linesOf(index), createdAt),
    delayMs: (index) => service.cadenceS[index % service.cadenceS.length] * 1000,
    maxOpen: service.maxOpen,
  };
}

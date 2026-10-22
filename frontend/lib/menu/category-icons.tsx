/*
 * Icônes des catégories de la carte, pour le rail vertical (CategoryRail).
 * Dessinées au trait sur une grille de 24, en currentColor : le rail les
 * teinte à la couleur d'accent de l'établissement. L'icône se déduit du nom
 * de la catégorie (« Pizzas », « Salades gourmandes ») ; un nom qu'aucun mot
 * ne reconnaît prend la cloche de service.
 */

type IconId =
  | "pizza"
  | "burger"
  | "salad"
  | "pasta"
  | "soup"
  | "meat"
  | "chicken"
  | "fish"
  | "sushi"
  | "sandwich"
  | "fries"
  | "share"
  | "bread"
  | "breakfast"
  | "cheese"
  | "dessert"
  | "icecream"
  | "coffee"
  | "drink"
  | "cocktail"
  | "wine"
  | "beer"
  | "kids"
  | "veggie"
  | "hookah"
  | "cloche";

/* Mots du nom → icône, du plus précis au plus large : « menu enfant » avant
 * « menu », « glaces » avant « desserts ». Comparés sans accents ni
 * majuscules, en début de mot. */
const KEYWORDS: [IconId, string[]][] = [
  ["kids", ["enfant", "kids", "junior", "p'tit", "petit loup", "bambin"]],
  ["pizza", ["pizza"]],
  ["burger", ["burger", "smash"]],
  ["sushi", ["sushi", "maki", "sashimi", "california", "poke", "japon"]],
  ["pasta", ["pate", "pasta", "risotto", "nouille", "ramen", "wok", "udon", "pho"]],
  ["soup", ["soupe", "veloute", "bouillon", "potage"]],
  ["salad", ["salade", "bowl", "crudite"]],
  ["chicken", ["poulet", "chicken", "tender", "wings", "aile", "nugget", "volaille"]],
  ["fish", ["poisson", "fruits de mer", "crustace", "fish", "saumon", "moule"]],
  ["meat", ["viande", "grill", "entrecote", "boeuf", "steak", "brochette", "kebab", "tacos", "plancha", "barbecue", "bbq"]],
  ["sandwich", ["sandwich", "wrap", "panini", "croque", "bagel", "snack"]],
  ["fries", ["frite", "accompagnement", "side", "garniture"]],
  ["share", ["partager", "entree", "tapas", "aperitif", "mezze", "antipast", "planche", "starter", "a grignoter"]],
  ["bread", ["viennoiserie", "boulangerie", "pain", "croissant", "brioche"]],
  ["breakfast", ["petit dej", "petit-dej", "brunch", "breakfast", "oeuf"]],
  ["cheese", ["fromage"]],
  ["icecream", ["glace", "sorbet", "ice cream", "coupe"]],
  ["dessert", ["dessert", "patisserie", "gateau", "douceur", "sucre", "crepe", "gaufre", "tarte"]],
  ["coffee", ["cafe", "the", "boisson chaude", "chocolat chaud", "coffee", "infusion"]],
  ["cocktail", ["cocktail", "mocktail", "spiritueux", "alcool"]],
  ["wine", ["vin", "champagne", "rose", "bulles"]],
  ["beer", ["biere", "pression", "beer"]],
  ["drink", ["boisson", "soft", "jus", "drink", "smoothie", "milkshake", "shake", "frappe", "limonade", "eau"]],
  ["hookah", ["chicha", "shisha", "narguile"]],
  ["veggie", ["vegan", "vegetarien", "veggie", "vegetal"]],
  ["cloche", ["formule", "menu", "plat", "suggestion", "chef", "specialite", "du jour"]],
];

/* Tracés (viewBox 0 0 24 24, trait 1.6, extrémités arrondies). */
const PATHS: Record<IconId, string[]> = {
  pizza: ["M3.5 7.5c5.4-3 11.6-3 17 0L12 21 3.5 7.5Z", "M5.2 10.2c4.3-2.2 9.3-2.2 13.6 0", "M10 11.5h.01M14 13h.01M12 16.5h.01"],
  burger: ["M4 11h16a8 7 0 0 0-16 0Z", "M3.5 14h17", "M4.5 17.5c0 1 1 2 2.5 2h10c1.5 0 2.5-1 2.5-2Z", "M9 7.5h.01M12 6.5h.01M15 7.5h.01"],
  salad: ["M3.5 12h17a8.5 7 0 0 1-17 0Z", "M8 12c-1.5-2.5-.5-5 2-6 .5 2.2 0 4.2-2 6", "M12.5 12c0-3 2-5 5-5 0 2.5-1.5 4.5-5 5", "M11 12c-.2-1.6.4-3 1.6-4"],
  pasta: ["M3.5 12h17a8.5 7 0 0 1-17 0Z", "M8 12c.5-2 2-2 2.5 0s2 2 2.5 0 2-2 2.5 0", "M15 9.5 19.5 3", "M17 10l3.5-4.5"],
  soup: ["M3.5 11h17a8.5 7.5 0 0 1-17 0Z", "M9 7.5c-.8-1 .8-2 0-3.2M12 7.5c-.8-1 .8-2 0-3.2M15 7.5c-.8-1 .8-2 0-3.2"],
  meat: ["M4 20l2.9-2.9M10.1 13.9l.8-.8M13.6 10.4l.8-.8M17.1 6.9 20 4", "M8.5 17.7a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z", "M12 14.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z", "M15.5 10.7a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"],
  chicken: ["M14.5 4.5c3 0 5 2.3 5 5 0 3.5-3.4 5.2-6 5l-3.3 3.3", "M14.5 4.5c-3 0-5 2.5-5 5.2 0 1.3.4 2.4 1 3.3", "M10.2 17.8a1.6 1.6 0 1 1-2.2 2.2 1.6 1.6 0 0 1-2.2-2.2 1.6 1.6 0 1 1 2.2-2.2"],
  fish: ["M3 12c3-4.5 9-6 14-2.5L21 7v10l-4-2.5C12 18 6 16.5 3 12Z", "M8 11.5h.01"],
  sushi: ["M4 9.5c0-2 3.6-3.5 8-3.5s8 1.5 8 3.5v5c0 2-3.6 3.5-8 3.5s-8-1.5-8-3.5Z", "M4 9.5c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5", "M9.5 9.5c0-.8 1.1-1.5 2.5-1.5s2.5.7 2.5 1.5-1.1 1.5-2.5 1.5-2.5-.7-2.5-1.5Z"],
  sandwich: ["M3.5 15.5 12 5l8.5 10.5Z", "M3.5 15.5v2.5h17v-2.5", "M6.5 12h11"],
  fries: ["M6.5 10.5h11l-1.5 9.5H8Z", "M8 10.5 7 4.5M10.5 10.5 10 3.5M13.5 10.5 14 3.5M16 10.5l1-6"],
  share: ["M2.5 15h17v2.5c0 .8-.7 1.5-1.5 1.5H4c-.8 0-1.5-.7-1.5-1.5Z", "M19.5 16.5h2", "M7 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M12.5 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M15.5 15l1.5-4.5h-3Z"],
  bread: ["M4.5 15.5C3 12 5 7 9 6l2.5 4L12 5c1.5-.2 3 .1 4 .8l-.8 4.7 2.6-3.3c2 2 2.6 5.3 1.7 8.3", "M4.5 15.5c2 2.5 5 3.5 7.5 3.5s5.6-1 7.5-3.5"],
  breakfast: ["M12 3.5c-3.6 0-6.5 5-6.5 9a6.5 6.5 0 0 0 13 0c0-4-2.9-9-6.5-9Z", "M12 15.5a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6Z"],
  cheese: ["M3.5 17.5V11L17 5l3.5 6v6.5Z", "M3.5 11h17", "M8 14.5h.01M14 14h.01M11.5 16.5h.01"],
  dessert: ["M4 19.5h16v-6.5L4 10.5Z", "M4 14.5l16 2", "M4 10.5 15.5 5l4.5 8", "M15.5 5c0-1 .8-1.8 1.8-1.5"],
  icecream: ["M7.5 11 12 21l4.5-10", "M6.5 11a5.5 5.5 0 0 1 11 0Z", "M9.5 6.2c.8-1.2 4.2-1.2 5 0"],
  coffee: ["M5 9.5h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z", "M16 11h1.5a2.5 2.5 0 0 1 0 5H15.5", "M3.5 21h14", "M9 6.5c-.6-.9.6-1.6 0-2.7M12.5 6.5c-.6-.9.6-1.6 0-2.7"],
  drink: ["M6.5 7.5h11L16 21H8Z", "M13 7.5 15 2.5h2.5", "M7.2 12h9.6"],
  cocktail: ["M4 4.5h16L12 13Z", "M12 13v7.5", "M8.5 20.5h7", "M15.5 4.5l2.5-2"],
  wine: ["M7.5 3.5h9v4a4.5 4.5 0 0 1-9 0Z", "M12 12v8.5", "M8.5 20.5h7", "M7.6 6.5h8.8"],
  beer: ["M6 6.5h9.5v12.5a1.5 1.5 0 0 1-1.5 1.5H7.5A1.5 1.5 0 0 1 6 19Z", "M15.5 9.5h1.8a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1.8", "M6 6.5c0-1.7 1.5-3 3.2-2.5a2.6 2.6 0 0 1 4.6.4c1.4-.1 1.7 1.1 1.7 2.1", "M9 10.5v7M12.5 10.5v7"],
  kids: ["M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z", "M8.5 14c1.8 2 5.2 2 7 0", "M9 10h.01M15 10h.01"],
  veggie: ["M5 19C5 10 10 5 19.5 4.5 19 14 14 19 5 19Z", "M5 19 13 11"],
  hookah: ["M9.5 21h5a2.5 2.5 0 0 0 2.5-2.5c0-2.5-2-3.5-2-5.5H9c0 2-2 3-2 5.5A2.5 2.5 0 0 0 9.5 21Z", "M12 13V6.5", "M9.5 6.5h5", "M10.5 3.5h3", "M15.5 15.5c2.5 0 4-1 5-3.5"],
  cloche: ["M3 17.5h18", "M4.5 17.5a7.5 7 0 0 1 15 0", "M12 10.5V9", "M10.5 9h3", "M5 20.5h14"],
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function categoryIcon(name: string): IconId {
  const words = ` ${normalize(name).replace(/[^a-z0-9'-]+/g, " ")}`;
  for (const [icon, keywords] of KEYWORDS) {
    if (keywords.some((keyword) => words.includes(` ${keyword}`))) return icon;
  }
  return "cloche";
}

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {PATHS[categoryIcon(name)].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

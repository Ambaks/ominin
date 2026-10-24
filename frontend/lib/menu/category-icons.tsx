import { normalizeText } from "@/lib/admin/format";
import type { MenuCategory } from "@/lib/menu-data";

/*
 * Icônes des catégories de la carte, pour le rail vertical (CategoryRail).
 * Dessinées au trait sur une grille de 24, dans une emprise d'environ 18 à
 * 20 px pour un poids optique égal, en currentColor : le rail les teinte à
 * la couleur d'accent de l'établissement. L'icône se déduit du nom de la
 * catégorie (« Pizzas », « Boissons chaudes ») ; un nom qu'aucun mot ne
 * reconnaît prend la cloche de service. Au repos, la roue (CategoryWheel)
 * n'affiche que les icônes : deux catégories voisines ne doivent jamais se
 * ressembler.
 */

export type IconId =
  | "pizza"
  | "pizzaPie"
  | "burger"
  | "salad"
  | "pasta"
  | "noodles"
  | "riceBowl"
  | "wok"
  | "dumpling"
  | "soup"
  | "meat"
  | "chicken"
  | "fish"
  | "sushi"
  | "sandwich"
  | "wrap"
  | "fries"
  | "share"
  | "board"
  | "crepe"
  | "star"
  | "heart"
  | "mocktail"
  | "beerBottle"
  | "bread"
  | "croissant"
  | "breakfast"
  | "dessert"
  | "cake"
  | "icecream"
  | "coffee"
  | "irishCoffee"
  | "tea"
  | "icedDrink"
  | "smoothie"
  | "milkshake"
  | "soda"
  | "water"
  | "cocktail"
  | "spirit"
  | "tumbler"
  | "shot"
  | "wine"
  | "champagne"
  | "grapes"
  | "beer"
  | "kids"
  | "veggie"
  | "hookah"
  | "slate"
  | "cloche";

/*
 * Expressions du nom → icône, de la plus précise à la plus large : « menu
 * enfant » avant « menu », « café gourmand » (un dessert) avant « café »,
 * « boissons chaudes » avant « boissons ». Chaque mot d'une expression se
 * compare à un mot entier du nom, au pluriel près (s, x) ; un mot suivi de
 * « * » reconnaît aussi ce qui commence par lui (« pizz* » : pizza, pizzeria).
 * L'élision tombe avant la comparaison : « l'ardoise » se lit « ardoise ».
 */
const RULES: [IconId, string[]][] = [
  ["kids", ["enfant*", "kids", "junior", "bambin*", "p'tit*"]],
  ["cake", ["gateau"]],
  ["dessert", ["cafe gourmand", "the gourmand"]],
  ["crepe", ["crepe", "galette"]],
  ["irishCoffee", ["cafe alcoolise", "irish coffee"]],
  ["icedDrink", ["the glace", "ice tea", "iced tea", "boisson glacee", "long drink"]],
  ["coffee", ["boisson chaude", "cafe", "espresso", "chocolat chaud", "coffee"]],
  ["tea", ["thes", "the vert", "the menthe", "infusion", "tisane"]],
  ["smoothie", ["smoothie", "jus", "detox"]],
  ["milkshake", ["milkshake", "shake", "frappe", "frappuccino"]],
  ["mocktail", ["sans alcool", "mocktail", "virgin"]],
  ["star", ["signature", "special*", "best*"]],
  ["heart", ["incontournable", "coup de coeur", "favori*", "prefere*"]],
  ["wine", ["spritz"]],
  ["cocktail", ["cocktail", "coktail", "happy hour", "aperitif"]],
  ["beerBottle", ["biere bouteille", "bouteille biere"]],
  ["beer", ["biere", "pression", "beer"]],
  ["wine", ["vin", "verre"]],
  ["champagne", ["champagne", "bulles", "petillant", "prosecco", "cremant"]],
  ["spirit", ["spiritueux", "rhum", "vodka", "gin", "liqueur", "malibu", "bouteille"]],
  ["tumbler", ["whisky", "whiskie", "cognac", "bourbon", "digestif"]],
  ["shot", ["shooter", "shot", "tequila"]],
  ["water", ["eau", "water"]],
  ["soda", ["boisson", "soft", "soda", "drink", "limonade"]],
  ["hookah", ["chicha", "shisha", "narguile*"]],
  ["pizza", ["pizz*", "pinsa"]],
  ["burger", ["burger*", "hamburger*", "smash*"]],
  ["sushi", ["sushi", "maki", "sashimi", "california", "japon*"]],
  ["noodles", ["nouille", "ramen", "ramyeon", "udon", "pho", "soba"]],
  ["wok", ["wok", "pad", "saute"]],
  ["riceBowl", ["bibimbap", "riz", "donburi", "poke"]],
  ["dumpling", ["anju", "mandu", "gyoza", "dim sum", "bao"]],
  ["pasta", ["pate", "pasta", "risotto"]],
  ["soup", ["soupe", "veloute", "bouillon", "potage"]],
  ["salad", ["salade", "bowl", "crudite"]],
  ["chicken", ["poulet", "rotisserie", "chicken", "tender", "wing", "aile", "nugget", "volaille"]],
  ["fish", ["poisson", "huitre", "fruits de mer", "crustace", "fish", "saumon", "moule"]],
  ["meat", ["viande", "grill*", "entrecote", "boeuf", "steak", "brochette", "kebab", "plancha", "barbecue", "bbq"]],
  ["wrap", ["tacos", "wrap", "burrito"]],
  ["sandwich", ["sandwich", "dwich", "hot-dog*", "hotdog*", "panini", "croque", "bagel", "snack*"]],
  ["fries", ["frite", "accompagnement", "side", "garniture"]],
  ["board", ["planche", "antipast*", "charcuterie", "fromage"]],
  ["share", ["partager", "entree", "tapas", "mezze", "starter", "grignoter", "bruschetta"]],
  ["croissant", ["viennoiserie", "croissant"]],
  ["bread", ["naan", "boulangerie", "pain", "brioche"]],
  ["breakfast", ["petit dej*", "petit-dej*", "brunch", "breakfast", "oeuf"]],
  ["icecream", ["glace*", "sorbet", "ice cream"]],
  ["dessert", ["dessert", "patisserie", "douceur", "gaufre", "tarte"]],
  ["veggie", ["vegan", "vegetarien", "veggie", "vegetal"]],
  ["slate", ["ardoise", "suggestion", "du jour"]],
  ["cloche", ["formule", "menu", "plat", "chef"]],
];

/*
 * Icônes sœurs, plausibles pour le même nom : elles ne servent qu'à départager
 * deux catégories voisines (« Vins rouges » puis « Vins blancs », « Vodka »
 * puis « Gin »), jamais à remplacer l'icône propre d'un nom.
 */
const SIBLINGS: Partial<Record<IconId, IconId[]>> = {
  pizza: ["pizzaPie"],
  cloche: ["slate"],
  share: ["board"],
  board: ["share"],
  dessert: ["cake"],
  cake: ["dessert"],
  spirit: ["tumbler", "shot"],
  tumbler: ["spirit", "shot"],
  shot: ["spirit", "tumbler"],
  wine: ["grapes"],
  champagne: ["wine"],
  sandwich: ["wrap"],
  wrap: ["sandwich"],
  soda: ["icedDrink"],
};

/* Tracés (viewBox 0 0 24 24, trait 1.6, extrémités arrondies). */
const PATHS: Record<IconId, string[]> = {
  // Pizza entière, une part soulevée : la sœur de la part seule.
  pizzaPie: ["M11.2 12.8L18.9 10.7A8 8 0 1 1 13.3 5.1Z", "M12.5 11.5L14.5 3.8A8 8 0 0 1 20.2 9.5Z", "M7.5 10.5h.01M8.5 16.5h.01M13.5 15.5h.01"],
  pizza: ["M3.5 7.5c5.4-3 11.6-3 17 0L12 21 3.5 7.5Z", "M5.2 10.2c4.3-2.2 9.3-2.2 13.6 0", "M10 11.5h.01M14 13h.01M12 16.5h.01"],
  burger: ["M4 11h16a8 7 0 0 0-16 0Z", "M3.5 14h17", "M4.5 17.5c0 1 1 2 2.5 2h10c1.5 0 2.5-1 2.5-2Z", "M9 7.5h.01M12 6.5h.01M15 7.5h.01"],
  salad: ["M3.5 12h17a8.5 7 0 0 1-17 0Z", "M8 12c-1.5-2.5-.5-5 2-6 .5 2.2 0 4.2-2 6", "M12.5 12c0-3 2-5 5-5 0 2.5-1.5 4.5-5 5", "M11 12c-.2-1.6.4-3 1.6-4"],
  noodles: ["M3.5 13h17a8.5 7 0 0 1-17 0Z", "M4.5 6.5 20.5 3", "M5 9l15.5-3", "M10 8.2c-.9 1.4.9 2.4 0 4.8", "M12.5 7.7c-.9 1.5.9 2.5 0 5.3", "M15 7.2c-.9 1.6.9 2.8 0 5.8"],
  riceBowl: ["M3.5 13h17a8.5 7 0 0 1-17 0Z", "M5.5 13c0-3.8 2.9-6.5 6.5-6.5s6.5 2.7 6.5 6.5", "M9 10.5l.8-.6M12 9l.9.4M14.3 11.2l.8-.5M10.6 12.2l.8.3"],
  wok: ["M2.5 12.5h14a7 5.5 0 0 1-14 0Z", "M16.5 13.5 21.5 11", "M5.5 9.5c.3-2.5 2.5-4.5 5-4.5", "M13 5.5h.01M15 8h.01M11 8.5h.01"],
  // Ravioli asiatique : mandu, gyoza.
  dumpling: ["M21 15.5A2.2 2.2 0 0 0 19.8 11.5A2.3 2.3 0 0 0 16.5 8.6A2.4 2.4 0 0 0 12 7.5A2.4 2.4 0 0 0 7.5 8.6A2.3 2.3 0 0 0 4.2 11.5A2.2 2.2 0 0 0 3 15.5C5.5 17.6 8.5 18.5 12 18.5s6.5-.9 9-3", "M19.8 11.5L17.6 12.6M16.5 8.6L15.2 10.5M12 7.5L12 9.7M7.5 8.6L8.8 10.5M4.2 11.5L6.4 12.6"],
  pasta: ["M3.5 12h17a8.5 7 0 0 1-17 0Z", "M8 12c.5-2 2-2 2.5 0s2 2 2.5 0 2-2 2.5 0", "M15 9.5 19.5 3", "M17 10l3.5-4.5"],
  soup: ["M3.5 11h17a8.5 7.5 0 0 1-17 0Z", "M9 7.5c-.8-1 .8-2 0-3.2M12 7.5c-.8-1 .8-2 0-3.2M15 7.5c-.8-1 .8-2 0-3.2"],
  // Brochette : trois morceaux francs sur une pique.
  meat: ["M3 21l1.6-1.6M19.4 4.6 21 3", "M4.5 14.5l5 5 2.5-2.5-5-5Z", "M8.5 10.5l5 5 2.5-2.5-5-5Z", "M12.5 6.5l5 5 2.5-2.5-5-5Z"],
  chicken: ["M14.5 4.5c3 0 5 2.3 5 5 0 3.5-3.4 5.2-6 5l-3.3 3.3", "M14.5 4.5c-3 0-5 2.5-5 5.2 0 1.3.4 2.4 1 3.3", "M10.2 17.8a1.6 1.6 0 1 1-2.2 2.2 1.6 1.6 0 0 1-2.2-2.2 1.6 1.6 0 1 1 2.2-2.2"],
  fish: ["M3 12c3-4.5 9-6 14-2.5L21 7v10l-4-2.5C12 18 6 16.5 3 12Z", "M8 11.5h.01"],
  sushi: ["M4 9.5c0-2 3.6-3.5 8-3.5s8 1.5 8 3.5v5c0 2-3.6 3.5-8 3.5s-8-1.5-8-3.5Z", "M4 9.5c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5", "M9.5 9.5c0-.8 1.1-1.5 2.5-1.5s2.5.7 2.5 1.5-1.1 1.5-2.5 1.5-2.5-.7-2.5-1.5Z"],
  sandwich: ["M3.5 15.5 12 5l8.5 10.5Z", "M3.5 15.5v2.5h17v-2.5", "M6.5 12h11"],
  // Burrito : rouleau en biais, garniture visible au bout.
  wrap: ["M13.2 5.2L4.3 14A4 4 -45 0 0 10 19.7L18.8 10.8", "M13.2 5.2A2 4 -45 0 1 18.8 10.8A2 4 -45 0 1 13.2 5.2Z", "M7.9 10.5L9.6 12.9L11.8 13.7L13.5 16.1", "M14.9 7.4L16.4 7.9M17.1 8.9L17.2 9.6"],
  fries: ["M6.5 10.5h11l-1.5 9.5H8Z", "M8 10.5 7 4.5M10.5 10.5 10 3.5M13.5 10.5 14 3.5M16 10.5l1-6"],
  // À partager : deux coupelles de tapas, piques plantées.
  share: ["M2.5 13h8a4 3.5 0 0 1-8 0Z", "M13.5 13h8a4 3.5 0 0 1-8 0Z", "M6.5 13 5.5 6.5", "M17.5 13l1.5-6.5"],
  bread: ["M4.5 15.5C3 12 5 7 9 6l2.5 4L12 5c1.5-.2 3 .1 4 .8l-.8 4.7 2.6-3.3c2 2 2.6 5.3 1.7 8.3", "M4.5 15.5c2 2.5 5 3.5 7.5 3.5s5.6-1 7.5-3.5"],
  croissant: ["M3.2 15.8C2.6 10 6.8 5.5 12 5.5s9.4 4.5 8.8 10.3c-.9 1.2-2.6 1.4-3.5.6C16.8 13.3 14.6 11.5 12 11.5s-4.8 1.8-5.3 4.9c-.9.8-2.6.6-3.5-.6Z", "M9 5.9l.8 5.9M15 5.9l-.8 5.9", "M4.6 9.3l3.6 4M19.4 9.3l-3.6 4"],
  breakfast: ["M12 3.5c-3.6 0-6.5 5-6.5 9a6.5 6.5 0 0 0 13 0c0-4-2.9-9-6.5-9Z", "M12 15.5a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6Z"],
  // Planche : planche à manche, fromage et rondelle.
  board: ["M2.5 15.5h15a2 2 0 0 1 0 4h-15Z", "M19.5 17.5h2", "M5 15.5l3.5-5 4.5 5", "M16 13.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  // Crêpe pliée en quatre.
  crepe: ["M3.5 19.5 12 4l8.5 15.5Z", "M3.5 19.5 14.5 8.5"],
  // Cœur : incontournables, coups de cœur.
  heart: ["M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"],
  // Étoile : signatures, spécialités.
  star: ["M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z"],
  // Sans alcool : coupe et rondelle de citron.
  mocktail: ["M4.5 6.5h12L10.5 14Z", "M10.5 14v6.5", "M7 20.5h7", "M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M18 3v6M15 6h6"],
  // Bière en bouteille.
  beerBottle: ["M10 2.5h4v4c0 1 2 2.2 2 4.5V20a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20v-9c0-2.3 2-3.5 2-4.5Z", "M8 12.5h8v4H8Z"],
  dessert: ["M4 19.5h16v-6.5L4 10.5Z", "M4 14.5l16 2", "M4 10.5 15.5 5l4.5 8", "M15.5 5c0-1 .8-1.8 1.8-1.5"],
  // Gâteau entier à bougie.
  cake: ["M4.5 20.5V13a1.5 1.5 0 0 1 1.5-1.5h12a1.5 1.5 0 0 1 1.5 1.5v7.5", "M3 20.5h18", "M4.5 15c1.25 1.2 2.5 1.2 3.75 0s2.5-1.2 3.75 0 2.5 1.2 3.75 0 2.5-1.2 3.75 0", "M12 11.5V8", "M12 5.8c-.8-.6-.7-1.7 0-2.5.7.8.8 1.9 0 2.5Z"],
  icecream: ["M7.5 11 12 21l4.5-10", "M6.5 11a5.5 5.5 0 0 1 11 0Z", "M9.5 6.2c.8-1.2 4.2-1.2 5 0"],
  coffee: ["M5 9.5h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z", "M16 11h1.5a2.5 2.5 0 0 1 0 5H15.5", "M3.5 21h14", "M9 6.5c-.6-.9.6-1.6 0-2.7M12.5 6.5c-.6-.9.6-1.6 0-2.7"],
  // Café arrosé : verre à pied et anse, comme l'irish coffee.
  irishCoffee: ["M6.5 6.5h10v3a5 5 0 0 1-10 0Z", "M16.5 8h1.3a2 2 0 0 1 0 4h-1.7", "M6.5 9h10", "M11.5 14.5v6", "M8.5 20.5h6", "M9.5 4c-.6-.8.6-1.4 0-2.2M13.5 4c-.6-.8.6-1.4 0-2.2"],
  // Thé : tasse basse et sachet.
  tea: ["M4.5 11h12v2a6 6 0 0 1-12 0Z", "M16.5 12h1.5a2.2 2.2 0 0 1 0 4.4h-2", "M10.5 11V4.5h3", "M12.5 4.5v3h2v3h-2"],
  // Boisson glacée : verre droit, glaçons et rondelle de citron, sans paille.
  icedDrink: ["M7 5.5h9v13.7a1.8 1.8 0 0 1-1.8 1.8H8.8A1.8 1.8 0 0 1 7 19.2Z", "M7 9.5h9", "M9 12.5l2.3-.8.8 2.3-2.3.8Z", "M11.6 16.2l2.1-.9.9 2.1-2.1.9Z", "M18.5 8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M18.5 5.5 16.5 3.4M18.5 5.5l2.6-.5M18.5 5.5l-.4 3"],
  // Smoothie : verre droit, paille et quartier de fruit.
  smoothie: ["M7 8h10l-1.2 12.5H8.2Z", "M7.4 12.5h9.2", "M13 8l1.5-5.5h2.5", "M18.5 8a2.5 2.5 0 0 0-4.5-1.5"],
  // Milkshake : coupe haute, dôme de crème et paille.
  milkshake: ["M7.5 10h9l-1.5 10.5h-6Z", "M6.5 10c0-2.6 2.5-4.5 5.5-4.5s5.5 1.9 5.5 4.5", "M13.5 5.7 15.5 2", "M7.6 14h8.8"],
  // Soft : verre, paille et glaçons.
  soda: ["M6.5 7.5h11L16 21H8Z", "M13 7.5 15 2.5h2.5", "M9.5 11h2.5v2.5H9.5Z", "M12.5 14.5H15V17h-2.5Z"],
  water: ["M12 3c3.3 4.2 6.3 7.6 6.3 11.2a6.3 6.3 0 0 1-12.6 0C5.7 10.6 8.7 7.2 12 3Z", "M9.2 14.6a2.9 2.9 0 0 0 2.4 2.6"],
  cocktail: ["M4 4.5h16L12 13Z", "M12 13v7.5", "M8.5 20.5h7", "M15.5 4.5l2.5-2"],
  // Alcools forts : une bouteille à étiquette.
  spirit: ["M10 3h4v3.5c0 1 2 2 2 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20v-9c0-2.5 2-3.5 2-4.5Z", "M8 13h8v4H8"],
  // Verre à whisky, glaçon : alcools servis secs.
  tumbler: ["M4.5 7.5h15l-1.2 11.6a1.6 1.6 0 0 1-1.6 1.4H7.3a1.6 1.6 0 0 1-1.6-1.4Z", "M5.2 12.5h13.6", "M8.5 11.2l3.4-1.4 1.4 3.4-3.4 1.4Z"],
  // Deux verres à shot.
  shot: ["M3 9.5h7.5l-1 10.5H4Z", "M4.4 17h4.7", "M13.5 9.5H21l-1 10.5h-5.5Z", "M14.9 17h4.7", "M3.3 12.5h6.9M13.8 12.5h6.9"],
  wine: ["M7.5 3.5h9v4a4.5 4.5 0 0 1-9 0Z", "M12 12v8.5", "M8.5 20.5h7", "M7.6 6.5h8.8"],
  // Deux flûtes qui trinquent.
  champagne: ["M3.2 4.1 7.7 3c1.4 4.8 2.1 8.7.1 9.9-2.4 0-3.6-3.9-4.6-8.8Z", "M7.8 12.9l1.7 7.2", "M7.1 20.7 12 19.5", "M4.2 8l4.4-1.1", "M16.3 3l4.5 1.1c-1 4.9-2.2 8.8-4.6 8.8-2-1.2-1.3-5.1.1-9.9Z", "M16.2 12.9l-1.7 7.2", "M12 19.5l4.9 1.2", "M15.4 6.9l4.4 1.1", "M12 4.5v-2M9.6 3.6 8.6 2.4M14.4 3.6l1-1.2"],
  grapes: ["M7.5 10.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM12 10.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM16.5 10.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z", "M9.8 14.6a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4ZM14.2 14.6a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z", "M12 18.7a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z", "M12 6.1V3", "M12 4c1.3-1.3 3.7-1.3 5 0"],
  beer: ["M6 6.5h9.5v12.5a1.5 1.5 0 0 1-1.5 1.5H7.5A1.5 1.5 0 0 1 6 19Z", "M15.5 9.5h1.8a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1.8", "M6 6.5c0-1.7 1.5-3 3.2-2.5a2.6 2.6 0 0 1 4.6.4c1.4-.1 1.7 1.1 1.7 2.1", "M9 10.5v7M12.5 10.5v7"],
  // Menu enfant : une tête d'ourson.
  kids: ["M12 20a6.5 6 0 1 0 0-12 6.5 6 0 0 0 0 12Z", "M7.2 9.3a2.4 2.4 0 1 1 2.6-3.1M16.8 9.3a2.4 2.4 0 1 0-2.6-3.1", "M12 17.3a1.8 1.5 0 1 0 0-3 1.8 1.5 0 0 0 0 3Z", "M9.5 12.5h.01M14.5 12.5h.01"],
  veggie: ["M5 19C5 10 10 5 19.5 4.5 19 14 14 19 5 19Z", "M5 19 13 11"],
  hookah: ["M9.5 21h5a2.5 2.5 0 0 0 2.5-2.5c0-2.5-2-3.5-2-5.5H9c0 2-2 3-2 5.5A2.5 2.5 0 0 0 9.5 21Z", "M12 13V6.5", "M9.5 6.5h5", "M10.5 3.5h3", "M15.5 15.5c2.5 0 4-1 5-3.5"],
  // Ardoise sur chevalet : suggestions, plats du jour.
  slate: ["M4.5 3.5h15v11h-15Z", "M7 14.5 5 20.5M17 14.5l2 6", "M7.5 7h9M7.5 10.5h5.5"],
  cloche: ["M3 17.5h18", "M4.5 17.5a7.5 7 0 0 1 15 0", "M12 10.5V9", "M10.5 9h3", "M5 20.5h14"],
};

/** Un mot du nom contre un mot de règle : égal, au pluriel près, ou par
 * préfixe quand la règle finit par « * ». */
function matches(word: string, rule: string): boolean {
  if (rule.endsWith("*")) return word.startsWith(rule.slice(0, -1));
  return word === rule || word === `${rule}s` || word === `${rule}x`;
}

/** Les icônes que reconnaît le nom, de la plus précise à la plus large. */
function candidates(name: string): IconId[] {
  const words = normalizeText(name)
    .replace(/\b[dl]['’]/g, "")
    .split(/[^a-z0-9'-]+/)
    .filter(Boolean);
  const found = (expression: string) => {
    const parts = expression.split(" ");
    for (let start = 0; start + parts.length <= words.length; start++) {
      if (parts.every((part, offset) => matches(words[start + offset], part))) return true;
    }
    return false;
  };
  return RULES.filter(([, expressions]) => expressions.some(found)).map(([icon]) => icon);
}

const DRINKS = new Set<IconId>([
  "mocktail", "beerBottle", "coffee", "irishCoffee", "tea", "icedDrink", "smoothie", "milkshake",
  "soda", "water", "cocktail", "spirit", "tumbler", "shot", "wine", "champagne", "grapes", "beer",
]);

/** Une catégorie de boissons : sur la carte, ses fiches ne parlent pas
 * d'allergènes. Son nom ne doit rien reconnaître qui se mange (« Cocktails
 * signature » oui, « Desserts & boissons » non) : dans le doute, ils restent. */
export function isDrinkCategory({ name, boissons }: Pick<MenuCategory, "name" | "boissons">): boolean {
  if (boissons) return true;
  const found = candidates(name).filter((id) => id !== "star" && id !== "heart");
  return found.length > 0 && found.every((id) => DRINKS.has(id));
}

/** Les icônes des catégories d'une carte, chacune différente autant que
 * possible : un nom dont la première icône est déjà prise passe à la
 * suivante qu'il reconnaît, la répète si sa voisine ne l'a pas, sinon prend
 * une icône sœur ; deux voisines ne partagent une icône que faute d'autre. */
export function categoryIcons(names: string[]): IconId[] {
  const taken = new Set<IconId>();
  const icons: IconId[] = [];
  for (const name of names) {
    const found = candidates(name);
    const own: IconId[] = found.length > 0 ? found : ["cloche"];
    const previous = icons.at(-1);
    const pick = (ids: IconId[]) => ids.find((id) => !taken.has(id)) ?? ids.find((id) => id !== previous);
    const icon = pick(own) ?? pick(own.flatMap((id) => SIBLINGS[id] ?? [])) ?? own[0];
    taken.add(icon);
    icons.push(icon);
  }
  return icons;
}

export function CategoryIcon({ icon, className }: { icon: IconId; className?: string }) {
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
      {PATHS[icon].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

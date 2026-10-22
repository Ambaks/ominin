import { normalizeText } from "@/lib/admin/format";

/*
 * Icônes des catégories de la carte, pour le rail vertical (CategoryRail).
 * Dessinées au trait sur une grille de 24, dans une emprise d'environ 18 à
 * 20 px pour un poids optique égal, en currentColor : le rail les teinte à
 * la couleur d'accent de l'établissement. L'icône se déduit du nom de la
 * catégorie (« Pizzas », « Boissons chaudes ») ; un nom qu'aucun mot ne
 * reconnaît prend la cloche de service.
 */

export type IconId =
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
  | "board"
  | "crepe"
  | "star"
  | "heart"
  | "mocktail"
  | "beerBottle"
  | "bread"
  | "breakfast"
  | "dessert"
  | "icecream"
  | "coffee"
  | "tea"
  | "smoothie"
  | "milkshake"
  | "soda"
  | "cocktail"
  | "spirit"
  | "wine"
  | "beer"
  | "kids"
  | "veggie"
  | "hookah"
  | "cloche";

/*
 * Expressions du nom → icône, de la plus précise à la plus large : « menu
 * enfant » avant « menu », « café gourmand » (un dessert) avant « café »,
 * « boissons chaudes » avant « boissons ». Chaque mot d'une expression se
 * compare à un mot entier du nom, au pluriel près (s, x) ; un mot suivi de
 * « * » reconnaît aussi ce qui commence par lui (« pizz* » : pizza, pizzeria).
 */
const RULES: [IconId, string[]][] = [
  ["kids", ["enfant*", "kids", "junior", "bambin*", "p'tit*"]],
  ["dessert", ["cafe gourmand", "the gourmand", "gateau"]],
  ["crepe", ["crepe", "galette"]],
  ["coffee", ["boisson chaude", "cafe", "espresso", "chocolat chaud", "coffee"]],
  ["tea", ["thes", "the glace", "the vert", "the menthe", "infusion", "tisane"]],
  ["smoothie", ["smoothie", "jus", "detox"]],
  ["milkshake", ["milkshake", "shake", "frappe", "frappuccino"]],
  ["mocktail", ["sans alcool", "mocktail", "virgin"]],
  ["star", ["signature", "special*", "best*"]],
  ["heart", ["incontournable", "coup de coeur", "favori*", "prefere*"]],
  ["cocktail", ["cocktail", "coktail", "long drink", "happy hour", "aperitif"]],
  ["beerBottle", ["biere bouteille", "bouteille biere"]],
  ["beer", ["biere", "pression", "beer"]],
  ["spirit", ["spiritueux", "rhum", "vodka", "gin", "whisky", "whiskie", "tequila", "cognac", "digestif", "liqueur", "shooter", "malibu"]],
  ["wine", ["vin", "champagne", "bulles", "verre", "bouteille"]],
  ["soda", ["boisson", "soft", "soda", "drink", "limonade", "eau"]],
  ["hookah", ["chicha", "shisha", "narguile*"]],
  ["pizza", ["pizz*", "pinsa"]],
  ["burger", ["burger*", "hamburger*", "smash*"]],
  ["sushi", ["sushi", "maki", "sashimi", "california", "poke", "japon*"]],
  ["pasta", ["pate", "pasta", "risotto", "nouille", "ramen", "ramyeon", "wok", "udon", "pho", "pad", "bibimbap"]],
  ["soup", ["soupe", "veloute", "bouillon", "potage"]],
  ["salad", ["salade", "bowl", "crudite"]],
  ["chicken", ["poulet", "rotisserie", "chicken", "tender", "wing", "aile", "nugget", "volaille"]],
  ["fish", ["poisson", "huitre", "fruits de mer", "crustace", "fish", "saumon", "moule"]],
  ["meat", ["viande", "grill*", "entrecote", "boeuf", "steak", "brochette", "kebab", "plancha", "barbecue", "bbq"]],
  ["sandwich", ["sandwich", "tacos", "dwich", "hot-dog*", "hotdog*", "wrap", "panini", "croque", "bagel", "snack*"]],
  ["fries", ["frite", "accompagnement", "side", "garniture"]],
  ["board", ["planche", "antipast*", "charcuterie", "fromage"]],
  ["share", ["partager", "entree", "tapas", "mezze", "starter", "grignoter", "bruschetta"]],
  ["bread", ["viennoiserie", "naan", "boulangerie", "pain", "croissant", "brioche"]],
  ["breakfast", ["petit dej*", "petit-dej*", "brunch", "breakfast", "oeuf"]],
  ["icecream", ["glace*", "sorbet", "ice cream"]],
  ["dessert", ["dessert", "patisserie", "douceur", "gaufre", "tarte"]],
  ["veggie", ["vegan", "vegetarien", "veggie", "vegetal"]],
  ["cloche", ["formule", "menu", "plat", "suggestion", "chef"]],
];

/* Tracés (viewBox 0 0 24 24, trait 1.6, extrémités arrondies). */
const PATHS: Record<IconId, string[]> = {
  pizza: ["M3.5 7.5c5.4-3 11.6-3 17 0L12 21 3.5 7.5Z", "M5.2 10.2c4.3-2.2 9.3-2.2 13.6 0", "M10 11.5h.01M14 13h.01M12 16.5h.01"],
  burger: ["M4 11h16a8 7 0 0 0-16 0Z", "M3.5 14h17", "M4.5 17.5c0 1 1 2 2.5 2h10c1.5 0 2.5-1 2.5-2Z", "M9 7.5h.01M12 6.5h.01M15 7.5h.01"],
  salad: ["M3.5 12h17a8.5 7 0 0 1-17 0Z", "M8 12c-1.5-2.5-.5-5 2-6 .5 2.2 0 4.2-2 6", "M12.5 12c0-3 2-5 5-5 0 2.5-1.5 4.5-5 5", "M11 12c-.2-1.6.4-3 1.6-4"],
  pasta: ["M3.5 12h17a8.5 7 0 0 1-17 0Z", "M8 12c.5-2 2-2 2.5 0s2 2 2.5 0 2-2 2.5 0", "M15 9.5 19.5 3", "M17 10l3.5-4.5"],
  soup: ["M3.5 11h17a8.5 7.5 0 0 1-17 0Z", "M9 7.5c-.8-1 .8-2 0-3.2M12 7.5c-.8-1 .8-2 0-3.2M15 7.5c-.8-1 .8-2 0-3.2"],
  // Brochette : trois morceaux francs sur une pique.
  meat: ["M3 21l1.6-1.6M19.4 4.6 21 3", "M4.5 14.5l5 5 2.5-2.5-5-5Z", "M8.5 10.5l5 5 2.5-2.5-5-5Z", "M12.5 6.5l5 5 2.5-2.5-5-5Z"],
  chicken: ["M14.5 4.5c3 0 5 2.3 5 5 0 3.5-3.4 5.2-6 5l-3.3 3.3", "M14.5 4.5c-3 0-5 2.5-5 5.2 0 1.3.4 2.4 1 3.3", "M10.2 17.8a1.6 1.6 0 1 1-2.2 2.2 1.6 1.6 0 0 1-2.2-2.2 1.6 1.6 0 1 1 2.2-2.2"],
  fish: ["M3 12c3-4.5 9-6 14-2.5L21 7v10l-4-2.5C12 18 6 16.5 3 12Z", "M8 11.5h.01"],
  sushi: ["M4 9.5c0-2 3.6-3.5 8-3.5s8 1.5 8 3.5v5c0 2-3.6 3.5-8 3.5s-8-1.5-8-3.5Z", "M4 9.5c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5", "M9.5 9.5c0-.8 1.1-1.5 2.5-1.5s2.5.7 2.5 1.5-1.1 1.5-2.5 1.5-2.5-.7-2.5-1.5Z"],
  sandwich: ["M3.5 15.5 12 5l8.5 10.5Z", "M3.5 15.5v2.5h17v-2.5", "M6.5 12h11"],
  fries: ["M6.5 10.5h11l-1.5 9.5H8Z", "M8 10.5 7 4.5M10.5 10.5 10 3.5M13.5 10.5 14 3.5M16 10.5l1-6"],
  // À partager : deux coupelles de tapas, piques plantées.
  share: ["M2.5 13h8a4 3.5 0 0 1-8 0Z", "M13.5 13h8a4 3.5 0 0 1-8 0Z", "M6.5 13 5.5 6.5", "M17.5 13l1.5-6.5"],
  bread: ["M4.5 15.5C3 12 5 7 9 6l2.5 4L12 5c1.5-.2 3 .1 4 .8l-.8 4.7 2.6-3.3c2 2 2.6 5.3 1.7 8.3", "M4.5 15.5c2 2.5 5 3.5 7.5 3.5s5.6-1 7.5-3.5"],
  breakfast: ["M12 3.5c-3.6 0-6.5 5-6.5 9a6.5 6.5 0 0 0 13 0c0-4-2.9-9-6.5-9Z", "M12 15.5a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6Z"],
  // Planche : planche à manche, fromage et rondelle.
  board: ["M2.5 15.5h15a2 2 0 0 1 0 4h-15Z", "M19.5 17.5h2", "M5 15.5l3.5-5 4.5 5", "M16 13.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  // Crêpe pliée en quatre.
  crepe: ["M3.5 19.5 12 4l8.5 15.5Z", "M3.5 19.5 14.5 8.5"],
  // Étoile : signatures, incontournables.
  // Cœur : incontournables, coups de cœur.
  heart: ["M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"],
  star: ["M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z"],
  // Sans alcool : coupe et rondelle de citron.
  mocktail: ["M4.5 6.5h12L10.5 14Z", "M10.5 14v6.5", "M7 20.5h7", "M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M18 3v6M15 6h6"],
  // Bière en bouteille.
  beerBottle: ["M10 2.5h4v4c0 1 2 2.2 2 4.5V20a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20v-9c0-2.3 2-3.5 2-4.5Z", "M8 12.5h8v4H8Z"],
  dessert: ["M4 19.5h16v-6.5L4 10.5Z", "M4 14.5l16 2", "M4 10.5 15.5 5l4.5 8", "M15.5 5c0-1 .8-1.8 1.8-1.5"],
  icecream: ["M7.5 11 12 21l4.5-10", "M6.5 11a5.5 5.5 0 0 1 11 0Z", "M9.5 6.2c.8-1.2 4.2-1.2 5 0"],
  coffee: ["M5 9.5h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z", "M16 11h1.5a2.5 2.5 0 0 1 0 5H15.5", "M3.5 21h14", "M9 6.5c-.6-.9.6-1.6 0-2.7M12.5 6.5c-.6-.9.6-1.6 0-2.7"],
  // Thé : tasse basse et sachet.
  tea: ["M4.5 11h12v2a6 6 0 0 1-12 0Z", "M16.5 12h1.5a2.2 2.2 0 0 1 0 4.4h-2", "M10.5 11V4.5h3", "M12.5 4.5v3h2v3h-2"],
  // Smoothie : verre droit, paille et quartier de fruit.
  smoothie: ["M7 8h10l-1.2 12.5H8.2Z", "M7.4 12.5h9.2", "M13 8l1.5-5.5h2.5", "M18.5 8a2.5 2.5 0 0 0-4.5-1.5"],
  // Milkshake : coupe haute, dôme de crème et paille.
  milkshake: ["M7.5 10h9l-1.5 10.5h-6Z", "M6.5 10c0-2.6 2.5-4.5 5.5-4.5s5.5 1.9 5.5 4.5", "M13.5 5.7 15.5 2", "M7.6 14h8.8"],
  // Soft : verre, paille et glaçons.
  soda: ["M6.5 7.5h11L16 21H8Z", "M13 7.5 15 2.5h2.5", "M9.5 11h2.5v2.5H9.5Z", "M12.5 14.5H15V17h-2.5Z"],
  cocktail: ["M4 4.5h16L12 13Z", "M12 13v7.5", "M8.5 20.5h7", "M15.5 4.5l2.5-2"],
  // Alcools forts : une bouteille à étiquette.
  spirit: ["M10 3h4v3.5c0 1 2 2 2 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20v-9c0-2.5 2-3.5 2-4.5Z", "M8 13h8v4H8"],
  wine: ["M7.5 3.5h9v4a4.5 4.5 0 0 1-9 0Z", "M12 12v8.5", "M8.5 20.5h7", "M7.6 6.5h8.8"],
  beer: ["M6 6.5h9.5v12.5a1.5 1.5 0 0 1-1.5 1.5H7.5A1.5 1.5 0 0 1 6 19Z", "M15.5 9.5h1.8a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1.8", "M6 6.5c0-1.7 1.5-3 3.2-2.5a2.6 2.6 0 0 1 4.6.4c1.4-.1 1.7 1.1 1.7 2.1", "M9 10.5v7M12.5 10.5v7"],
  // Menu enfant : une tête d'ourson.
  kids: ["M12 20a6.5 6 0 1 0 0-12 6.5 6 0 0 0 0 12Z", "M7.2 9.3a2.4 2.4 0 1 1 2.6-3.1M16.8 9.3a2.4 2.4 0 1 0-2.6-3.1", "M12 17.3a1.8 1.5 0 1 0 0-3 1.8 1.5 0 0 0 0 3Z", "M9.5 12.5h.01M14.5 12.5h.01"],
  veggie: ["M5 19C5 10 10 5 19.5 4.5 19 14 14 19 5 19Z", "M5 19 13 11"],
  hookah: ["M9.5 21h5a2.5 2.5 0 0 0 2.5-2.5c0-2.5-2-3.5-2-5.5H9c0 2-2 3-2 5.5A2.5 2.5 0 0 0 9.5 21Z", "M12 13V6.5", "M9.5 6.5h5", "M10.5 3.5h3", "M15.5 15.5c2.5 0 4-1 5-3.5"],
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
  const words = normalizeText(name).split(/[^a-z0-9'-]+/).filter(Boolean);
  const found = (expression: string) => {
    const parts = expression.split(" ");
    for (let start = 0; start + parts.length <= words.length; start++) {
      if (parts.every((part, offset) => matches(words[start + offset], part))) return true;
    }
    return false;
  };
  return RULES.filter(([, expressions]) => expressions.some(found)).map(([icon]) => icon);
}

/** Les icônes des catégories d'une carte, chacune différente autant que
 * possible : un nom dont la première icône est déjà prise passe à la
 * suivante qu'il reconnaît, et ne la répète que faute d'autre. */
export function categoryIcons(names: string[]): IconId[] {
  const taken = new Set<IconId>();
  return names.map((name) => {
    const found = candidates(name);
    const icon = found.find((id) => !taken.has(id)) ?? found[0] ?? "cloche";
    taken.add(icon);
    return icon;
  });
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

import type { MenuCategory } from "@/lib/menu-data";
import { pexels, unsplash } from "./images";

/*
 * Prototype : les boissons de Caffè Panis en vignettes (MenuCategory.compact),
 * des photos libres posées par nom d'article. La base ne porte ni l'un ni
 * l'autre ; si la mise en page plaît, le drapeau et les photos y entrent.
 */
const THUMB_WIDTH = 200;

const espresso = unsplash("photo-1510707577719-ae7c14805e3a", THUMB_WIDTH);
const photo = (id: number) => pexels(`${id}/pexels-photo-${id}.jpeg`, THUMB_WIDTH);
// Alcools forts et vins : la vraie bouteille, étiquette recadrée.
const bottle = (slug: string) => `/caffe-panis/bouteilles/${slug}.webp`;

const drink = (slug: string) => `/caffe-panis/boissons/${slug}.webp`;

const PREVIEW: Record<string, Record<string, string>> = {
  "caffe-panis/Boissons chaudes": {
    "Café Illy": drink("cafe-illy"),
    "Déca Illy": drink("deca-illy"),
    Noisette: drink("noisette"),
    "Café allongé": drink("cafe-allonge"),
    "Double café": drink("double-cafe"),
    "Café crème": drink("cafe-creme"),
    Cappuccino: drink("cappuccino"),
    Chocolat: drink("chocolat"),
    "Thé Dammann Frères": drink("the-dammann-freres"),
    "Café viennois": drink("cafe-viennois"),
    "Chocolat viennois": drink("chocolat-viennois"),
    "Café frappé": drink("cafe-frappe"),
    "Chocolat frappé": drink("chocolat-frappe"),
  },
  "caffe-panis/Alcools forts": {
    Baileys: bottle("baileys"),
    Limoncello: photo(21854837),
    Mentheuse: bottle("mentheuse"),
    Croqueuse: bottle("croqueuse"),
    Pulpeuse: bottle("pulpeuse"),
    "Get 27": bottle("get-27"),
    "Whisky Ballantine's": bottle("whisky-ballantines"),
    Jägermeister: bottle("jagermeister"),
    Vodka: photo(4946713),
    Tequila: photo(32912387),
    "Rhum Captain Morgan": bottle("rhum-captain-morgan"),
    "Gin Beefeater": bottle("gin-beefeater"),
    "Bourbon Four Roses": bottle("bourbon-four-roses"),
    "Whisky Jack Daniel's": bottle("whisky-jack-daniels"),
    "Cognac Hennessy": bottle("cognac-hennessy"),
    "Armagnac Samalens": bottle("armagnac-samalens"),
    Calvados: photo(7809749),
    "Poire Williams": photo(7809750),
    "Vodka Belvedere": bottle("vodka-belvedere"),
    "Whisky Chivas 12 ans": bottle("whisky-chivas-12-ans"),
    "Whisky Aberlour 12 ans": bottle("whisky-aberlour-12-ans"),
    Bacardi: bottle("bacardi"),
    "Rhum agricole Martinique": photo(15523624),
    "Rhum Bumbu": bottle("rhum-bumbu"),
    "Rhum Gouverneur": bottle("rhum-gouverneur"),
  },
  // La démo (menu-data.ts) : une seule section de boissons.
  "caffe-panis/Boissons": {
    "Café Illy": "/cafe-poulard/cafe.jpg",
    "Coca-Cola": "/big-smash/coca-cola.webp",
    "Coca-Cola Zéro": "/big-smash/coca-cola.webp",
    "Fuzetea Pêche": "/big-smash/fuze-tea-peche.webp",
  },
  "caffe-panis/Bulles": {
    Prosecco: photo(12151233),
    "Champagne Robert-Allait": photo(20303995),
    Pavone: photo(6728572),
  },
  "caffe-panis/Apéritifs": {
    "Pastis Panis": photo(27848730),
    Kir: photo(8983396),
    Suze: photo(18142598),
    Muscat: photo(15130312),
    Porto: photo(14472650),
    Campari: photo(32443614),
    Martini: photo(34437244),
    Lillet: photo(128242),
  },
  "caffe-panis/Boissons fraîches": {
    Pepsi: drink("pepsi"),
    Orangina: drink("orangina"),
    Perrier: drink("perrier"),
    Schweppes: drink("schweppes"),
    "Fuze Tea": drink("fuze-tea"),
    "Sirop Teisseire": drink("sirop-teisseire"),
    Diabolo: drink("diabolo"),
    "Limonade à la tireuse": drink("limonade-a-la-tireuse"),
    "Jus pressé": drink("jus-presse"),
    "Jus de fruit Granini": drink("jus-de-fruit-granini"),
    "Red Bull": drink("red-bull"),
  },
  "caffe-panis/Gamme Isope": {
    "Tonic Water Original": drink("tonic-water-original"),
    "Soda Craft Pamplemousse": drink("soda-craft-pamplemousse"),
    "Ginger Beer Spicy": drink("ginger-beer-spicy"),
    "Tonic Water Concombre": drink("tonic-water-concombre"),
  },
  "caffe-panis/Shooter": {
    Shooter: drink("shooter"),
  },
  "caffe-panis/Eaux": {
    Evian: drink("evian"),
    "San Pellegrino": drink("san-pellegrino"),
    Vittel: drink("vittel"),
  },
  "caffe-panis/Bières": {
    Moretti: drink("moretti"),
    "Gallia Blanche": drink("gallia-blanche"),
    "Gallia IPA": drink("gallia-ipa"),
    "Pélican": drink("pelican"),
    "Kriek Mort Subite": drink("kriek-mort-subite"),
    Monaco: drink("monaco"),
    Corona: drink("corona"),
    "Corona 0 %": drink("corona-0"),
  },
  "caffe-panis/Cocktails Signatures": {
    "Tropical Mule": drink("tropical-mule"),
    "Caipirinha Piment": drink("caipirinha-piment"),
    "Honey Deuce": drink("honey-deuce"),
    "Beach House": drink("beach-house"),
    "Purple Tonic": drink("purple-tonic"),
    "Panis Melon": drink("panis-melon"),
    "Sexy Sandia": drink("sexy-sandia"),
  },
  "caffe-panis/Sours": {
    "Aperol Sour": drink("aperol-sour"),
    "Whisky Sour": drink("whisky-sour"),
    "Amaretto Sour": drink("amaretto-sour"),
    "St-Germain Sour": drink("st-germain-sour"),
  },
  "caffe-panis/Spritz": {
    "Apérol Spritz": drink("aperol-spritz"),
    "Campari Spritz": drink("campari-spritz"),
    "Lemon Spritz": drink("lemon-spritz"),
    "Italicus Spritz": drink("italicus-spritz"),
    "Napoleon Spritz": drink("napoleon-spritz"),
    "St-Germain Spritz": drink("st-germain-spritz"),
  },
  "caffe-panis/Classiques": {
    Mojito: drink("mojito"),
    "Expresso Martini": drink("expresso-martini"),
    Mule: drink("mule"),
    "Gin Fizz": drink("gin-fizz"),
    "Basilic Smash": drink("basilic-smash"),
    Negroni: drink("negroni"),
    "Tequila Sunrise": drink("tequila-sunrise"),
    "Pornstar Martini": drink("pornstar-martini"),
  },
  "caffe-panis/Virgin": {
    Martinini: drink("martinini"),
    "Dry Panis": drink("dry-panis"),
  },
  "caffe-panis/Vins rouges": {
    "Pays d'Hérault rouge": photo(7597560),
    "Sans Chichi": bottle("sans-chichi"),
    "Côte du Rhône": bottle("cotes-du-rhone"),
    "Salut de la Terre": bottle("salut-de-la-terre"),
    "Pic St Loup": bottle("pic-st-loup"),
  },
  "caffe-panis/Vins blancs": {
    "Secret de Lunes": bottle("secret-de-lunes"),
    "Jardin de Lyse": bottle("jardin-de-lyse"),
    "Terre d'Ardoise": bottle("terre-d-ardoise"),
    "Petit Chardonnay": bottle("petit-chardonnay"),
    "Inédit moelleux": bottle("inedit-moelleux"),
    "Les Hautes Terres": bottle("les-hautes-terres"),
  },
  "caffe-panis/Vins rosés": {
    "Pays d'Hérault rosé": photo(4906328),
    Pive: bottle("pive"),
    "Inédit rosé": bottle("inedit-rose"),
    "Château Lancyre": bottle("chateau-lancyre-rose"),
  },
  "caffe-panis/Alcools forts en bouteille": {
    "Vodka Poliakov · bouteille": bottle("vodka-poliakov-bouteille"),
    "Vodka Absolut · bouteille": bottle("vodka-absolut-bouteille"),
    "Gin Gordon's · bouteille": bottle("gin-gordons-bouteille"),
  },
};

export function withCompactPreview(slug: string, categories: MenuCategory[]): MenuCategory[] {
  return categories.map((category) => {
    const photos = PREVIEW[`${slug}/${category.name}`];
    // La vignette ne montre ni accord, ni pastille, ni mention, ni délai :
    // une section qui en porte reste en lignes.
    const plain = category.items.every(
      (item) =>
        !item.pairing &&
        !item.badges?.length &&
        !item.tags?.length &&
        !item.spice &&
        !item.noticeHours
    );
    if (!photos || !plain) {
      return category;
    }
    return {
      ...category,
      compact: true,
      items: category.items.map((item) =>
        !item.image && Object.hasOwn(photos, item.name)
          ? { ...item, image: photos[item.name] }
          : item
      ),
    };
  });
}

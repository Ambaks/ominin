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

const PREVIEW: Record<string, Record<string, string>> = {
  "caffe-panis/Boissons chaudes": {
    // Une tasse Illy, de la démo de Café Poulard : le café de la maison.
    "Café Illy": "/cafe-poulard/cafe.jpg",
    "Déca Illy": espresso,
    Noisette: photo(10187350),
    "Café allongé": photo(18604200),
    "Double café": espresso,
    "Café crème": unsplash("photo-1550247611-e651810312fe", THUMB_WIDTH),
    Cappuccino: unsplash("photo-1630021439100-74a32ab42d3e", THUMB_WIDTH),
    Chocolat: photo(239584),
    "Thé Dammann Frères": photo(1493080),
    "Café viennois": photo(12181626),
    "Chocolat viennois": photo(15149193),
    "Café frappé": photo(8605859),
    "Chocolat frappé": photo(11512983),
  },
  "caffe-panis/Alcools forts": {
    Baileys: photo(27496550),
    Limoncello: photo(21854837),
    Mentheuse: photo(8375236),
    Croqueuse: photo(36287065),
    Pulpeuse: photo(4669243),
    "Get 27": photo(4869319),
    "Whisky Ballantine's": photo(3645478),
    Jägermeister: photo(13834054),
    Vodka: photo(4946713),
    Tequila: photo(32912387),
    "Rhum Captain Morgan": photo(12741759),
    "Gin Beefeater": photo(1170598),
    "Bourbon Four Roses": photo(19523925),
    "Whisky Jack Daniel's": photo(18702874),
    "Cognac Hennessy": photo(7254690),
    "Armagnac Samalens": photo(31343058),
    Calvados: photo(7809749),
    "Poire Williams": photo(7809750),
    "Vodka Belvedere": photo(7949031),
    "Whisky Chivas 12 ans": photo(10747972),
    "Whisky Aberlour 12 ans": photo(14657147),
    Bacardi: photo(8620368),
    "Rhum agricole Martinique": photo(15523624),
    "Rhum Bumbu": photo(12716237),
    "Rhum Gouverneur": photo(30731387),
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
    Pepsi: photo(11942006),
    Orangina: photo(5946617),
    Perrier: photo(18212879),
    Schweppes: photo(3743524),
    "Fuze Tea": photo(4731076),
    "Sirop Teisseire": photo(9454713),
    Diabolo: photo(18142599),
    "Limonade à la tireuse": photo(16976656),
    "Jus pressé": photo(6412586),
    "Jus de fruit Granini": photo(6412582),
    "Red Bull": photo(17220086),
  },
  "caffe-panis/Gamme Isope": {
    "Tonic Water Original": photo(14564811),
    "Soda Craft Pamplemousse": photo(7494034),
    "Ginger Beer Spicy": photo(19789236),
    "Tonic Water Concombre": photo(7376790),
  },
  "caffe-panis/Shooter": {
    Shooter: photo(8375116),
  },
  "caffe-panis/Eaux": {
    Evian: photo(11860559),
    "San Pellegrino": photo(20058265),
    Vittel: photo(2479095),
  },
  "caffe-panis/Bières": {
    Moretti: photo(8508488),
    "Gallia Blanche": photo(7016593),
    "Gallia IPA": photo(16386282),
    Pélican: photo(4968299),
    "Kriek Mort Subite": photo(6210913),
    Monaco: photo(16736469),
    Corona: photo(17765843),
    "Corona 0 %": photo(30848808),
  },
  "caffe-panis/Cocktails Signatures": {
    "Tropical Mule": photo(29848265),
    "Caipirinha Piment": photo(15523624),
    "Honey Deuce": photo(8084633),
    "Beach House": photo(19034751),
    "Purple Tonic": photo(9787788),
    "Panis Melon": photo(27299930),
    "Sexy Sandia": photo(31702856),
  },
  "caffe-panis/Sours": {
    "Aperol Sour": photo(4227022),
    "Whisky Sour": photo(26623288),
    "Amaretto Sour": photo(34989155),
    "St-Germain Sour": photo(37646396),
  },
  "caffe-panis/Spritz": {
    "Apérol Spritz": photo(33493346),
    "Campari Spritz": photo(11912752),
    "Lemon Spritz": photo(7376782),
    "Italicus Spritz": photo(8939973),
    "Napoleon Spritz": photo(12086898),
    "St-Germain Spritz": photo(7376989),
  },
  "caffe-panis/Classiques": {
    Mojito: photo(36580447),
    "Expresso Martini": photo(18059150),
    Mule: photo(29177421),
    "Gin Fizz": photo(7809742),
    "Basilic Smash": photo(12266611),
    Negroni: photo(34437244),
    "Tequila Sunrise": photo(28893429),
    "Pornstar Martini": photo(29532544),
  },
  "caffe-panis/Virgin": {
    Martinini: photo(5668202),
    "Dry Panis": photo(21085810),
  },
  "caffe-panis/Vins rouges": {
    "Pays d'Hérault rouge": photo(7597560),
    "Sans Chichi": photo(7458524),
    "Côte du Rhône": photo(8964266),
    "Salut de la Terre": photo(2954929),
    "Pic St Loup": photo(2954924),
  },
  "caffe-panis/Vins blancs": {
    "Secret de Lunes": photo(2584451),
    "Jardin de Lyse": photo(2231814),
    "Terre d'Ardoise": photo(10508457),
    "Petit Chardonnay": photo(7283407),
    "Inédit moelleux": photo(14695634),
    "Les Hautes Terres": photo(10012572),
  },
  "caffe-panis/Vins rosés": {
    "Pays d'Hérault rosé": photo(4906328),
    Pive: photo(9009955),
    "Inédit rosé": photo(5360447),
    "Château Lancyre": photo(9009956),
  },
  "caffe-panis/Alcools forts en bouteille": {
    "Vodka Poliakov · bouteille": photo(4946713),
    "Vodka Absolut · bouteille": photo(17722186),
    "Gin Gordon's · bouteille": photo(1170598),
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

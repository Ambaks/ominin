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
// Alcools, vins, bulles, apéritifs : la vraie bouteille, sans étiquette quand
// la carte ne dit pas la marque ; carrés de 1200 px, nets jusque dans la fiche.
const bottle = (slug: string) => `/caffe-panis/bouteilles/${slug}.webp`;

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
    Baileys: bottle("baileys"),
    Limoncello: bottle("limoncello"),
    Mentheuse: bottle("mentheuse"),
    Croqueuse: bottle("croqueuse"),
    Pulpeuse: bottle("pulpeuse"),
    "Get 27": bottle("get-27"),
    "Whisky Ballantine's": bottle("whisky-ballantines"),
    Jägermeister: bottle("jagermeister"),
    Vodka: bottle("vodka"),
    Tequila: bottle("tequila"),
    "Rhum Captain Morgan": bottle("rhum-captain-morgan"),
    "Gin Beefeater": bottle("gin-beefeater"),
    "Bourbon Four Roses": bottle("bourbon-four-roses"),
    "Whisky Jack Daniel's": bottle("whisky-jack-daniels"),
    "Cognac Hennessy": bottle("cognac-hennessy"),
    "Armagnac Samalens": bottle("armagnac-samalens"),
    Calvados: bottle("calvados"),
    "Poire Williams": photo(7809750),
    "Vodka Belvedere": bottle("vodka-belvedere"),
    "Whisky Chivas 12 ans": bottle("whisky-chivas-12-ans"),
    "Whisky Aberlour 12 ans": bottle("whisky-aberlour-12-ans"),
    Bacardi: bottle("bacardi"),
    "Rhum agricole Martinique": bottle("rhum-agricole-martinique"),
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
    Prosecco: bottle("prosecco"),
    "Champagne Robert-Allait": bottle("champagne-robert-allait"),
    Pavone: bottle("pavone"),
  },
  "caffe-panis/Apéritifs": {
    "Pastis Panis": bottle("pastis-panis"),
    Kir: bottle("kir"),
    Suze: bottle("suze"),
    Muscat: bottle("muscat"),
    Porto: bottle("porto"),
    Campari: bottle("campari"),
    Martini: bottle("martini"),
    Lillet: bottle("lillet"),
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
    "Pays d'Hérault rouge": bottle("pays-d-herault-rouge"),
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
    "Pays d'Hérault rosé": bottle("pays-d-herault-rose"),
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

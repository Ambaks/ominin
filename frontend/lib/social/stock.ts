/*
 * Vidéos de vraies personnes que l'agent social monte en plein écran dans
 * les Reels : elles donnent des visages et de l'émotion à la publicité.
 * Sélection faite à la main sur Mixkit, chaque clip sous la « Mixkit Stock
 * Video Free License » (usage commercial, publicités comprises, sans
 * attribution), vérifiée sur sa page. Le rédacteur (backend) lit ce
 * catalogue par /api/social/stock ; la description est tout ce qu'il en
 * sait. Un clip horizontal est recadré au centre en 9:16 au montage.
 */

export interface StockClip {
  id: string;
  description: string;
  /** MP4 lu au moment du rendu. */
  url: string;
  /** Page Mixkit du clip, pour retrouver sa licence. */
  source: string;
}

export const STOCK: readonly StockClip[] = [
  {
    id: "woman-ramen-restaurant-chat",
    description:
      "Une jeune femme savoure un bol de ramen dans un restaurant chaleureux et discute en souriant avec ses amis, ambiance gourmande et détendue.",
    url: "https://assets.mixkit.co/videos/51257/51257-1080.mp4",
    source: "https://mixkit.co/free-stock-video/a-young-woman-captured-eating-a-delicious-ramen-and-engaging-51257/",
  },
  {
    id: "woman-ramen-photo-phone",
    description:
      "Une amie photographie au smartphone une jeune femme rieuse attablée devant des bols de ramen, moment complice et joyeux au restaurant.",
    url: "https://assets.mixkit.co/videos/51252/51252-1080.mp4",
    source: "https://mixkit.co/free-stock-video/a-young-woman-playfuly-poses-to-the-mobile-camera-eating-51252/",
  },
  {
    id: "man-texting-happy",
    description:
      "Un homme souriant tient son téléphone et tape un message, visage expressif et satisfait, plan rapproché vertical.",
    url: "https://assets.mixkit.co/videos/41174/41174-1080.mp4",
    source: "https://mixkit.co/free-stock-video/happy-man-texting-on-his-smartphone-41174/",
  },
  {
    id: "woman-phone-coffee-shop",
    description:
      "Une jeune femme brune tape un message sur son smartphone, assise dans un café, concentrée et détendue.",
    url: "https://assets.mixkit.co/videos/43270/43270-1080.mp4",
    source: "https://mixkit.co/free-stock-video/woman-typing-on-her-cell-phone-43270/",
  },
  {
    id: "woman-sofa-phone",
    description:
      "Une jeune femme élégante aux cheveux courts écrit sur son téléphone, assise sur un canapé, ambiance calme et soignée.",
    url: "https://assets.mixkit.co/videos/49939/49939-1080.mp4",
    source: "https://mixkit.co/free-stock-video/portrait-of-a-woman-chatting-on-her-cell-phone-49939/",
  },
  {
    id: "woman-browsing-online-shop",
    description:
      "Gros plan sur les mains d'une femme qui fait défiler les articles d'une boutique en ligne sur son téléphone.",
    url: "https://assets.mixkit.co/videos/42136/42136-1080.mp4",
    source: "https://mixkit.co/free-stock-video/woman-exploring-an-online-sales-page-on-her-cell-phone-42136/",
  },
  {
    id: "hand-scrolling-online-shop",
    description:
      "La main d'un homme fait défiler une page de vente en ligne sur son smartphone, gros plan sur l'écran et le geste.",
    url: "https://assets.mixkit.co/videos/42133/42133-1080.mp4",
    source: "https://mixkit.co/free-stock-video/a-mans-hand-scrolling-on-a-sales-page-42133/",
  },
  {
    id: "hands-sealing-parcel",
    description:
      "Les mains d'un homme et d'une femme ferment un colis en carton avec du ruban adhésif, préparation de commande en duo.",
    url: "https://assets.mixkit.co/videos/42137/42137-1080.mp4",
    source: "https://mixkit.co/free-stock-video/hands-of-two-people-sealing-a-package-with-tape-42137/",
  },
  {
    id: "woman-filling-parcel",
    description:
      "Une jeune femme verse des chips de calage dans un carton, filmée depuis l'intérieur de la boîte, geste soigné d'emballage de commande.",
    url: "https://assets.mixkit.co/videos/42135/42135-1080.mp4",
    source: "https://mixkit.co/free-stock-video/young-woman-pouring-packing-filler-into-a-box-42135/",
  },
  {
    id: "couple-unboxing-clothes",
    description:
      "Un jeune couple enthousiaste sort des vêtements d'un carton, filmé depuis l'intérieur de la boîte, joie de recevoir une commande.",
    url: "https://assets.mixkit.co/videos/42134/42134-1080.mp4",
    source: "https://mixkit.co/free-stock-video/couple-taking-clothes-out-of-a-box-42134/",
  },
  {
    id: "courier-delivers-parcel-door",
    description:
      "Un livreur remet un colis à une jeune femme devant l'entrée d'un immeuble, elle signe pour réceptionner la livraison.",
    url: "https://assets.mixkit.co/videos/42164/42164-1080.mp4",
    source: "https://mixkit.co/free-stock-video/postman-delivering-a-package-to-a-girl-42164/",
  },
  {
    id: "waiter-serves-pizza-couple",
    description:
      "Un serveur dépose rapidement une pizza pepperoni devant un homme et une femme attablés en terrasse au milieu des plantes, service vif.",
    url: "https://assets.mixkit.co/videos/44019/44019-720.mp4",
    source: "https://mixkit.co/free-stock-video/a-table-being-served-pizza-by-a-waiter-44019/",
  },
  {
    id: "waiter-pizza-terrace-table",
    description:
      "Un serveur porte une pizza tout juste sortie du four et la pose au centre d'une table en terrasse, plan rapproché appétissant.",
    url: "https://assets.mixkit.co/videos/44008/44008-720.mp4",
    source: "https://mixkit.co/free-stock-video/waiter-serving-a-pizza-at-a-table-44008/",
  },
  {
    id: "waiter-busy-restaurant",
    description:
      "Un serveur apporte une assiette de viande dans un restaurant-bar animé rempli de clients attablés, ambiance de coup de feu.",
    url: "https://assets.mixkit.co/videos/4672/4672-720.mp4",
    source: "https://mixkit.co/free-stock-video/waiter-serving-meat-stew-in-a-restaurant-4672/",
  },
  {
    id: "waiter-brings-coffee",
    description:
      "Un serveur aux cheveux noirs apporte une tasse de café sur un plateau et la dépose sur la table en bois d'une cliente.",
    url: "https://assets.mixkit.co/videos/219/219-720.mp4",
    source: "https://mixkit.co/free-stock-video/waiter-carries-a-cup-of-coffee-to-customer-219/",
  },
  {
    id: "restaurant-dining-room-overview",
    description:
      "Vue plongeante sur une salle de restaurant élégante en plein service : clients qui mangent, serveurs qui vont et viennent, lumière d'après-midi.",
    url: "https://assets.mixkit.co/videos/4385/4385-720.mp4",
    source: "https://mixkit.co/free-stock-video/customers-in-a-minimalist-style-restaurant-4385/",
  },
  {
    id: "chef-teppanyaki-grill",
    description:
      "Un cuisinier saisit des morceaux de viande sur une grande plancha devant des clients au comptoir d'un restaurant, gestes rapides.",
    url: "https://assets.mixkit.co/videos/4678/4678-720.mp4",
    source: "https://mixkit.co/free-stock-video/chef-cooking-on-a-large-grill-4678/",
  },
  {
    id: "chef-shaping-pizza-dough",
    description:
      "Un pizzaiolo étire et façonne une pâte à pizza bien ronde sur le plan de travail d'une cuisine de restaurant.",
    url: "https://assets.mixkit.co/videos/42469/42469-720.mp4",
    source: "https://mixkit.co/free-stock-video/chef-shaping-a-pizza-42469/",
  },
  {
    id: "chef-pizza-into-oven",
    description:
      "Un cuisinier enfourne une pizza garnie dans un four chaud à l'aide d'une pelle à pizza, cuisine en action.",
    url: "https://assets.mixkit.co/videos/42480/42480-720.mp4",
    source: "https://mixkit.co/free-stock-video/chef-puts-the-pizza-in-the-oven-42480/",
  },
  {
    id: "pizza-boxed-takeaway",
    description:
      "Un employé de pizzeria dépose une pizza brûlante dans sa boîte en carton, prête à emporter.",
    url: "https://assets.mixkit.co/videos/42484/42484-720.mp4",
    source: "https://mixkit.co/free-stock-video/close-up-shot-of-a-freshly-made-hot-pizza-42484/",
  },
  {
    id: "pizza-cut-in-box",
    description:
      "Un pizzaiolo découpe une pizza dans sa boîte avant de la fermer pour le client, commande à emporter prête.",
    url: "https://assets.mixkit.co/videos/42485/42485-720.mp4",
    source: "https://mixkit.co/free-stock-video/cutting-a-pizza-with-a-special-slicer-42485/",
  },
  {
    id: "pastry-chef-mixing",
    description:
      "Une pâtissière expérimentée travaille une préparation à gâteau avec deux spatules dans une cuisine professionnelle, gestes précis et passionnés.",
    url: "https://assets.mixkit.co/videos/50030/50030-720.mp4",
    source: "https://mixkit.co/free-stock-video/professional-pastry-chef-adding-butter-for-a-mixture-50030/",
  },
  {
    id: "couple-choosing-cookies-counter",
    description:
      "Un couple rit et plaisante en choisissant des cookies devant le comptoir d'un café, ambiance complice de commande au comptoir.",
    url: "https://assets.mixkit.co/videos/39955/39955-720.mp4",
    source: "https://mixkit.co/free-stock-video/couple-choosing-cookies-at-counter-39955/",
  },
  {
    id: "friends-ordering-at-counter",
    description:
      "Deux jeunes amies regardent le menu au-dessus du comptoir d'un café rustique et choisissent leur commande, enjouées.",
    url: "https://assets.mixkit.co/videos/41229/41229-720.mp4",
    source: "https://mixkit.co/free-stock-video/two-girls-choosing-at-the-counter-in-a-coffee-shop-41229/",
  },
  {
    id: "woman-pizza-laughing-phone",
    description:
      "Une jeune femme mange une pizza en terrasse et réagit en riant à ce qu'un ami lui montre sur son téléphone.",
    url: "https://assets.mixkit.co/videos/44026/44026-720.mp4",
    source: "https://mixkit.co/free-stock-video/girl-eating-while-talking-to-a-boy-44026/",
  },
  {
    id: "man-shows-phone-at-table",
    description:
      "Un jeune homme montre quelque chose sur son téléphone à une amie pendant qu'ils partagent une pizza en terrasse.",
    url: "https://assets.mixkit.co/videos/44021/44021-720.mp4",
    source: "https://mixkit.co/free-stock-video/guy-showing-something-to-a-girl-on-his-cell-phone-44021/",
  },
  {
    id: "couple-photographs-dessert",
    description:
      "Un couple déjeune au restaurant et photographie son dessert au smartphone sur une table en bois, moment de partage.",
    url: "https://assets.mixkit.co/videos/4853/4853-720.mp4",
    source: "https://mixkit.co/free-stock-video/couple-in-a-restaurant-taking-photos-of-the-dessert-4853/",
  },
  {
    id: "hands-packing-handmade-soaps",
    description:
      "Les mains d'une artisane sélectionnent et emballent des savons faits main sur un établi en bois, avec étiquettes artisanales.",
    url: "https://assets.mixkit.co/videos/2812/2812-720.mp4",
    source: "https://mixkit.co/free-stock-video/hands-selecting-and-packaging-handmade-soaps-2812/",
  },
  {
    id: "man-packing-box-to-ship",
    description:
      "Un jeune homme dans son salon termine d'emballer un carton à expédier et le ferme au ruban adhésif.",
    url: "https://assets.mixkit.co/videos/31218/31218-720.mp4",
    source: "https://mixkit.co/free-stock-video/man-in-his-living-room-finishes-packing-a-box-to-31218/",
  },
  {
    id: "courier-delivers-woman-home",
    description:
      "Un livreur remet un colis à une femme sur le pas de sa porte, échange souriant de fin de commande.",
    url: "https://assets.mixkit.co/videos/42130/42130-720.mp4",
    source: "https://mixkit.co/free-stock-video/delivering-a-package-to-a-woman-at-home-42130/",
  },
];

export const STOCK_BY_ID = new Map(STOCK.map((clip) => [clip.id, clip]));

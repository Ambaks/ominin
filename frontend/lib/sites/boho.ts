/*
 * Site public du BOHO (Toulouse), restaurant chicha à l'ambiance bohème, sous
 * menu.ominin.com/w/boho une fois la capacité ouverte, et sur sa démonstration
 * (menu.ominin.com/demo/boho/site). Les faits viennent de sa carte papier et de son profil (demos/boho) ; la carte,
 * les prix, l'adresse et les horaires sont relus en base à chaque
 * revalidation, comme sur son menu QR.
 */

/** La nuit du site (--bo-nuit), celle de l'affiche, pour la barre du navigateur. */
export const BOHO_THEME_COLOR = "#0a0e1c";

export const bohoLinks = {
  tiktok: "https://www.tiktok.com/@bohotoulouse",
  tiktokHandle: "@bohotoulouse",
  maps: "https://share.google/EIUzbXbXysu7yPcXN",
};

export const bohoPhotos = {
  /** L'affiche des bulles, envoyée par le gérant : toujours entière, jamais recadrée. */
  afficheBulles: {
    src: "/boho/affiche-bulles.webp",
    width: 1122,
    height: 1402,
    alt: "Affiche du Boho Côté Jardin : vivez l'expérience en bulle, sous des dômes de verre illuminés au jardin. Réservation conseillée, places limitées.",
  },
  /** Les dômes de l'affiche, sans son texte : le fond du haut de page. */
  domes: {
    src: "/boho/domes.webp",
    alt: "Trois dômes de verre illuminés dans le jardin du Boho, rideaux ouverts sur une table dressée",
  },
  /** La même terrasse, coupée avant le logo de l'affiche : elle peut passer sous le texte. */
  jardin: {
    src: "/boho/jardin.webp",
    alt: "La terrasse du Boho le soir : suspensions en rotin, guirlandes et bougies sur les tables",
  },
  /** L'affiche de la carte papier : la terrasse au crépuscule. */
  terrasse: {
    src: "/boho/poster.webp",
    alt: "La terrasse du Boho au crépuscule : pergola, suspensions en rotin et guirlandes",
  },
};

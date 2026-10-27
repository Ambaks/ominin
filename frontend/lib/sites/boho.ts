import { BOHO_DEMO_SLUG } from "@/lib/bulles/demo";

/*
 * Site public du BOHO (Toulouse), restaurant chicha à l'ambiance bohème.
 * Servi pour l'instant sur sa démonstration (menu.ominin.com/demo/boho/site),
 * tant que le Boho n'a pas pris l'offre, puis sous son propre slug. Les
 * faits viennent de sa carte papier et de son profil (demos/boho) ; la carte,
 * les prix, l'adresse et les horaires sont relus en base à chaque
 * revalidation, comme sur son menu QR.
 */

/** L'établissement qui porte le site : la démonstration, avant la vente. */
export const BOHO_SITE_SLUG = BOHO_DEMO_SLUG;

/** La nuit prune du site (--bo-nuit), pour la barre du navigateur. */
export const BOHO_THEME_COLOR = "#251b20";

export const bohoLinks = {
  tiktok: "https://www.tiktok.com/@bohotoulouse",
  tiktokHandle: "@bohotoulouse",
  maps: "https://share.google/EIUzbXbXysu7yPcXN",
};

export const bohoPhotos = {
  /** L'affiche de la carte papier : la terrasse au crépuscule. */
  terrasse: {
    src: "/boho/poster.webp",
    alt: "La terrasse du Boho au crépuscule : pergola, suspensions en rotin et guirlandes",
  },
};

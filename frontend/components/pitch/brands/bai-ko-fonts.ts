import { Bebas_Neue, DM_Sans, Noto_Sans_KR, Noto_Sans_Math } from "next/font/google";

/*
 * Les polices du pitch Baï-Kō (les rôles : o-crousti-poulet-fonts.ts), celles
 * de son site : DM Sans pour le texte, Bebas Neue pour les titres, les
 * grands chiffres et le nom, Noto Sans KR pour la touche coréenne en néon.
 * latin-ext : le « ō » de Baï-Kō.
 */
const dmSans = DM_Sans({
  variable: "--font-pitch-text",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-pitch-numeral",
  subsets: ["latin", "latin-ext"],
  weight: "400",
});

/** Trois caractères coréens à l'écran : pas de préchargement, seules leurs tranches se téléchargent. */
const notoSansKr = Noto_Sans_KR({
  variable: "--font-pitch-flourish",
  weight: "700",
  preload: false,
});

/**
 * « ≈ » et « → » : DM Sans, telle que Google la sert, ne les a dans aucune
 * tranche, et Chrome les prenait dans Arial. Noto Sans Math, de même dessin,
 * les donne (bai-ko.css).
 */
const notoSansMath = Noto_Sans_Math({
  variable: "--font-pitch-symbols",
  subsets: ["math"],
  weight: "400",
  preload: false,
});

export const baiKoFonts = [dmSans, bebasNeue, notoSansKr, notoSansMath].map((font) => font.variable).join(" ");

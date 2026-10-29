import { MUSIC_BY_ID } from "./music";
import { SCREEN_BY_ID } from "./screens";
import type { SocialBrand } from "./brands";

/*
 * Le script d'une publication en scènes : chaque scène est un bloc animé de
 * social-video/ (mêmes composants et jetons que le site) rempli de son texte,
 * et deux scènes voisines se joignent par une transition. Le rédacteur écrit
 * ce script, les agents du montage (social-video/scripts/produce) le
 * corrigent scène par scène puis transition par transition : ils ne
 * changent que ce que ces catalogues permettent, jamais le dessin des blocs.
 */

export type BlockId = "hook" | "phone" | "relay" | "points" | "cta";

export interface HookProps {
  eyebrow: string;
  title: string;
}
export interface PhoneProps {
  title: string;
  screen: string;
}
export interface RelayProps {
  title: string;
}
export interface PointsProps {
  kicker: string;
  title: string;
  points: string[];
}
export interface CtaProps {
  cta: string;
  line: string;
}

export type PostScene =
  | { block: "hook"; frames: number; props: HookProps }
  | { block: "phone"; frames: number; props: PhoneProps }
  | { block: "relay"; frames: number; props: RelayProps }
  | { block: "points"; frames: number; props: PointsProps }
  | { block: "cta"; frames: number; props: CtaProps };

export type TransitionKind = "cut" | "fade" | "slide" | "wipe" | "flip" | "iris" | "push";
export type TransitionDirection = "from-left" | "from-right" | "from-top" | "from-bottom";

export interface PostTransition {
  kind: TransitionKind;
  /** Pour slide, wipe et flip. */
  direction: TransitionDirection;
  frames: number;
}

export interface PostScript {
  brand: SocialBrand;
  scenes: PostScene[];
  /** Une de moins que de scènes : transitions[i] joint les scènes i et i + 1. */
  transitions: PostTransition[];
  /** Musique sous la publication (lib/social/music), ou "" : sans musique. */
  music?: string;
}

/** La note d'un arbitre du montage (social-video/scripts/produce). */
export interface Review {
  score: number;
  verdict: string;
  /** Ce que le script peut corriger : texte, props, durée, bloc, transition. */
  fixes: string[];
  /** Ce que seul le dessin du bloc peut corriger : remonté au développeur. */
  design_issues: string[];
}

/** Les notes du montage, tour par tour (social_posts.production). */
export interface ProduceReport {
  scenes: Review[][];
  transitions: Review[][];
  final: Review;
}

/* Bornes du montage, en images à 30 par seconde : une scène se lit, une
 * transition ne la mange pas. */
export const SCENE_FRAMES = { min: 45, max: 180 };
export const TRANSITION_FRAMES = { min: 8, max: 24 };

interface BlockSpec {
  id: BlockId;
  /** Ce que montre le bloc, pour le rédacteur et les agents. */
  description: string;
  /** Chaque prop : ce qu'elle porte et sa limite. */
  props: Record<string, string>;
}

export const BLOCKS: readonly BlockSpec[] = [
  {
    id: "hook",
    description:
      "L'accroche : une étiquette au nom de la marque, puis un grand titre en Geist très gras dont les mots montent un à un ; les mots encadrés de [[ ]] reçoivent le pavé braise du site. Première scène, idéalement.",
    props: {
      eyebrow: "Étiquette en capitales, 1 à 4 mots (après « Ominin Menu · »).",
      title: "Le titre, 40 caractères au plus, un seul passage [[ ]] de 1 à 2 mots.",
    },
  },
  {
    id: "phone",
    description:
      "Un iPhone qui entre en légère rotation 3D et montre une capture réelle de l'outil, sous un titre. Pour montrer ce que voit le client ou l'équipe.",
    props: {
      title: "Titre au-dessus du téléphone, 36 caractères au plus, un passage [[ ]].",
      screen: "Id d'une capture du catalogue des captures (son contenu est décrit là).",
    },
  },
  {
    id: "relay",
    description:
      "Le relais du site : la carte de la table 12 se remplit de trois plats, le total monte, le tampon « Payée » tombe, le ticket sort de l'imprimante de la cuisine et la pastille « En cuisine en 18 s. Le serveur apporte. » apparaît. Pour la commande à table et le paiement.",
    props: {
      title: "Titre au-dessus du relais, 36 caractères au plus, un passage [[ ]].",
    },
  },
  {
    id: "points",
    description:
      "Une étiquette, un titre, puis deux ou trois points qui apparaissent l'un après l'autre avec une pastille braise. Pour dire ce que fait la fonctionnalité.",
    props: {
      kicker: "Étiquette, 1 à 3 mots.",
      title: "Titre, 40 caractères au plus, un passage [[ ]].",
      points: "2 ou 3 points, 42 caractères au plus chacun, sans rien affirmer hors de la fonctionnalité.",
    },
  },
  {
    id: "cta",
    description:
      "L'écran final : l'appel à l'action en très grand, le mot-clé sur le pavé braise qui pulse, une ligne dessous et l'adresse du site. Toujours la dernière scène.",
    props: {
      cta: "« Écrivez [[MOT-CLÉ]] en message », le mot-clé de la marque encadré de [[ ]].",
      line: "Ce qu'on obtient en écrivant, 48 caractères au plus.",
    },
  },
];

export const TRANSITIONS: readonly { kind: TransitionKind; description: string }[] = [
  { kind: "cut", description: "Coupe franche, sans transition : nerveuse, sur le rythme." },
  { kind: "fade", description: "Fondu enchaîné : doux, pour un temps calme ; deux textes posés au même endroit se superposent un instant, à éviter entre deux scènes de texte." },
  { kind: "slide", description: "La scène suivante pousse la précédente dans la direction choisie." },
  { kind: "wipe", description: "La scène suivante se dévoile par un balayage dans la direction choisie." },
  { kind: "flip", description: "La scène tourne comme une carte, dans la direction choisie." },
  { kind: "iris", description: "La scène suivante s'ouvre en cercle depuis le centre." },
  { kind: "push", description: "Coupe poussée : zoom avant sur la scène qui part, éclair braise, la suivante arrive en grand." },
];

const DIRECTIONS: readonly TransitionDirection[] = ["from-left", "from-right", "from-top", "from-bottom"];
const HIGHLIGHT_ONCE = /^[^[\]]*\[\[[^[\]]+\]\][^[\]]*$/;

/** Le texte d'un titre sans ses marques [[ ]], pour en compter les caractères. */
const plain = (text: string) => text.replace(/\[\[|\]\]/g, "");

function fits(text: unknown, max: number): text is string {
  return typeof text === "string" && text.trim().length > 0 && plain(text).length <= max;
}

/** Ce qui cloche dans une scène, ou null : ce que les agents réécrivent passe par là. */
export function sceneError(scene: PostScene): string | null {
  if (!BLOCKS.some((block) => block.id === scene.block)) return `bloc inconnu « ${scene.block} »`;
  if (!Number.isInteger(scene.frames) || scene.frames < SCENE_FRAMES.min || scene.frames > SCENE_FRAMES.max) {
    return `durée de ${scene.frames} images hors de ${SCENE_FRAMES.min}–${SCENE_FRAMES.max}`;
  }
  const p = scene.props as unknown as Record<string, unknown>;
  const titled = (max: number) =>
    fits(p.title, max) && HIGHLIGHT_ONCE.test(p.title as string) ? null : `title : ${max} caractères au plus, un seul [[ ]]`;
  switch (scene.block) {
    case "hook":
      return fits(p.eyebrow, 32) ? titled(40) : "eyebrow vide ou trop long";
    case "phone":
      return SCREEN_BY_ID.has(p.screen as string) ? titled(36) : `capture inconnue « ${p.screen} »`;
    case "relay":
      return titled(36);
    case "points": {
      const points = p.points;
      if (!Array.isArray(points) || points.length < 2 || points.length > 3 || !points.every((point) => fits(point, 42))) {
        return "points : 2 ou 3, 42 caractères au plus";
      }
      return fits(p.kicker, 24) ? titled(40) : "kicker vide ou trop long";
    }
    case "cta":
      return HIGHLIGHT_ONCE.test(String(p.cta)) && fits(p.cta, 40) && fits(p.line, 48) ? null : "cta ou line hors limites";
  }
}

export function transitionError(transition: PostTransition): string | null {
  if (!TRANSITIONS.some((t) => t.kind === transition.kind)) return `transition inconnue « ${transition.kind} »`;
  if (!DIRECTIONS.includes(transition.direction)) return `direction inconnue « ${transition.direction} »`;
  const { min, max } = TRANSITION_FRAMES;
  if (transition.kind !== "cut" && (!Number.isInteger(transition.frames) || transition.frames < min || transition.frames > max)) {
    return `durée de ${transition.frames} images hors de ${min}–${max}`;
  }
  return null;
}

export function scriptError(script: PostScript): string | null {
  if (script.music && !MUSIC_BY_ID.has(script.music)) return `musique inconnue « ${script.music} »`;
  if (script.scenes.length < 2) return "au moins deux scènes";
  if (script.scenes.at(-1)?.block !== "cta") return "la dernière scène est l'appel à l'action";
  if (script.transitions.length !== script.scenes.length - 1) return "une transition entre chaque paire de scènes";
  for (const [index, scene] of script.scenes.entries()) {
    const error = sceneError(scene);
    if (error) return `scène ${index + 1} : ${error}`;
  }
  for (const [index, transition] of script.transitions.entries()) {
    const error = transitionError(transition);
    if (error) return `transition ${index + 1} : ${error}`;
  }
  return null;
}

/** Durée totale : les transitions font se chevaucher les scènes voisines. */
export function scriptFrames(script: PostScript): number {
  const scenes = script.scenes.reduce((total, scene) => total + scene.frames, 0);
  return scenes - script.transitions.reduce((total, t) => total + (t.kind === "cut" ? 0 : t.frames), 0);
}

import { SCREEN_BY_ID } from "./screens";
import type { SocialBrand } from "./brands";

/*
 * Le script d'une publication en scènes : chaque scène est un bloc animé de
 * social-video/ (mêmes composants et jetons que le site) rempli de son texte,
 * et deux scènes voisines se joignent par une transition. Le rédacteur écrit
 * ce script, les agents du montage (social-video/scripts/produce) le
 * corrigent scène par scène puis transition par transition : ils ne
 * changent que ce que ces catalogues permettent, jamais le dessin des blocs.
 * Sans son : la publication se lit en silence, comme la plupart des Reels.
 *
 * Pour que deux publications ne se ressemblent pas, chacune reçoit un format
 * (l'ordre de ses scènes), un habillage (couleurs et fond) et un rythme (ses
 * transitions et sa cadence), choisis par le backend parmi les moins
 * récemment utilisés.
 */

export type BlockId = "hook" | "phone" | "relay" | "points" | "split" | "figure" | "steps" | "question" | "cta";

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
export interface SplitProps {
  title: string;
  beforeLabel: string;
  before: string;
  afterLabel: string;
  after: string;
}
export interface FigureProps {
  title: string;
  value: string;
  label: string;
}
export interface StepsProps {
  title: string;
  steps: string[];
}
export interface QuestionProps {
  question: string;
  answer: string;
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
  | { block: "split"; frames: number; props: SplitProps }
  | { block: "figure"; frames: number; props: FigureProps }
  | { block: "steps"; frames: number; props: StepsProps }
  | { block: "question"; frames: number; props: QuestionProps }
  | { block: "cta"; frames: number; props: CtaProps };

export type TransitionKind = "cut" | "fade" | "slide" | "wipe" | "flip" | "iris" | "push";
export type TransitionDirection = "from-left" | "from-right" | "from-top" | "from-bottom";

export interface PostTransition {
  kind: TransitionKind;
  /** Pour slide, wipe et flip. */
  direction: TransitionDirection;
  frames: number;
}

export type FormatId = "probleme-solution" | "avant-apres" | "idee-recue" | "trois-etapes" | "question-reponse" | "le-chiffre";
export type LookId = "braise" | "lin" | "nuit" | "flamme";
export type RhythmId = "nerveux" | "fluide" | "relief";

export interface PostScript {
  brand: SocialBrand;
  format: FormatId;
  look: LookId;
  rhythm: RhythmId;
  scenes: PostScene[];
  /** Une de moins que de scènes : transitions[i] joint les scènes i et i + 1. */
  transitions: PostTransition[];
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
      eyebrow: "Étiquette en capitales, 1 à 3 mots, 24 caractères au plus.",
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
    id: "split",
    description:
      "Le face-à-face : un titre, puis l'écran partagé en deux, un côté puis l'autre, chacun avec son étiquette et sa phrase (avant / avec Ominin, ou on pense / en vrai). Pour un contraste.",
    props: {
      title: "Titre au-dessus, 36 caractères au plus, un passage [[ ]].",
      beforeLabel: "Étiquette du premier côté, 14 caractères au plus (« Avant », « On pense »).",
      before: "Phrase du premier côté, 40 caractères au plus.",
      afterLabel: "Étiquette du second côté, 14 caractères au plus (« Avec Ominin », « En vrai »).",
      after: "Phrase du second côté, 40 caractères au plus.",
    },
  },
  {
    id: "figure",
    description:
      "Le chiffre : un nombre énorme qui se compte jusqu'à sa valeur, une ligne qui dit ce qu'il mesure, sous un titre. Seulement un chiffre des tarifs ou de la fiche, jamais inventé.",
    props: {
      title: "Titre au-dessus, 36 caractères au plus, un passage [[ ]].",
      value: "Le chiffre avec son unité, 8 caractères au plus (« 0 € », « 3 % », « 18 s »).",
      label: "Ce que mesure le chiffre, 40 caractères au plus.",
    },
  },
  {
    id: "steps",
    description:
      "Trois étapes numérotées qui s'allument l'une après l'autre sous un titre. Pour dire comment ça marche, dans l'ordre.",
    props: {
      title: "Titre au-dessus, 36 caractères au plus, un passage [[ ]].",
      steps: "Exactement 3 étapes, 32 caractères au plus chacune.",
    },
  },
  {
    id: "question",
    description:
      "La question : une bulle de message avec la question telle qu'on la pose (un client à table, ou le restaurateur lui-même), puis la réponse en grand titre. Pour une question fréquente ou une objection.",
    props: {
      question: "La question, avec les mots de qui la pose, 60 caractères au plus, sans [[ ]].",
      answer: "La réponse en titre, 40 caractères au plus, un passage [[ ]].",
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

/* Un format : l'ordre de ses scènes, emplacement par emplacement — les blocs
 * admis, et si l'emplacement peut manquer. */
type Slot = { blocks: readonly BlockId[]; optional?: boolean };

const PROOF: readonly BlockId[] = ["phone", "relay"];

export const FORMATS: readonly { id: FormatId; name: string; description: string; slots: readonly Slot[] }[] = [
  {
    id: "probleme-solution",
    name: "Problème → solution",
    description: "L'accroche nomme la douleur, puis on montre la fonctionnalité qui la règle et ce qu'elle fait.",
    slots: [{ blocks: ["hook"] }, { blocks: ["points", ...PROOF] }, { blocks: ["points", ...PROOF], optional: true }, { blocks: ["cta"] }],
  },
  {
    id: "avant-apres",
    name: "Avant / après",
    description: "L'accroche, puis le face-à-face (split) entre la vie sans et avec la fonctionnalité, puis la preuve à l'écran.",
    slots: [{ blocks: ["hook"] }, { blocks: ["split"] }, { blocks: PROOF }, { blocks: ["cta"] }],
  },
  {
    id: "idee-recue",
    name: "Idée reçue",
    description: "L'accroche reprend une objection courante (« encore une appli », « trop cher »…), le face-à-face (split, « On pense » / « En vrai ») la renverse avec un fait de la fiche, puis la preuve.",
    slots: [{ blocks: ["hook"] }, { blocks: ["split"] }, { blocks: [...PROOF, "points"] }, { blocks: ["cta"] }],
  },
  {
    id: "trois-etapes",
    name: "Trois étapes",
    description: "L'accroche, puis comment ça marche en trois étapes (steps), puis la preuve si elle aide.",
    slots: [{ blocks: ["hook"] }, { blocks: ["steps"] }, { blocks: PROOF, optional: true }, { blocks: ["cta"] }],
  },
  {
    id: "question-reponse",
    name: "Question → réponse",
    description: "On ouvre sur la question qu'on entend (bloc question, en première scène), l'écran y répond, puis ce que fait la fonctionnalité.",
    slots: [{ blocks: ["question"] }, { blocks: PROOF }, { blocks: ["points"], optional: true }, { blocks: ["cta"] }],
  },
  {
    id: "le-chiffre",
    name: "Le chiffre",
    description: "L'accroche, puis un chiffre des tarifs ou de la fiche en très grand (figure), puis la preuve.",
    slots: [{ blocks: ["hook"] }, { blocks: ["figure"] }, { blocks: [...PROOF, "points"] }, { blocks: ["cta"] }],
  },
];

/* Les habillages : jeux de couleurs et de fond posés sur toute la publication
 * (social-video/src/loop.css), les blocs n'en savent rien. */
export const LOOKS: readonly { id: LookId; name: string }[] = [
  { id: "braise", name: "Braise : fond sombre, grille et halo de braise" },
  { id: "lin", name: "Lin : fond clair des pages en mode clair" },
  { id: "nuit", name: "Nuit : noir profond, un seul faisceau de lumière" },
  { id: "flamme", name: "Flamme : fond au dégradé de braise, texte sombre" },
];

/* Les rythmes : les transitions admises et la durée d'une scène. */
export const RHYTHMS: readonly {
  id: RhythmId;
  name: string;
  transitions: readonly TransitionKind[];
  sceneFrames: { min: number; max: number };
}[] = [
  { id: "nerveux", name: "Nerveux : coupes franches et poussées, scènes courtes", transitions: ["cut", "push"], sceneFrames: { min: 45, max: 90 } },
  { id: "fluide", name: "Fluide : glissements et balayages, scènes posées", transitions: ["slide", "wipe"], sceneFrames: { min: 60, max: 150 } },
  { id: "relief", name: "Relief : cartes qui tournent et ouvertures en cercle", transitions: ["flip", "iris", "slide"], sceneFrames: { min: 60, max: 120 } },
];

/** Les scènes suivent-elles les emplacements du format ? */
function follows(blocks: readonly BlockId[], slots: readonly Slot[]): boolean {
  if (!slots.length) return !blocks.length;
  const [slot, ...rest] = slots;
  if (blocks.length && slot.blocks.includes(blocks[0]) && follows(blocks.slice(1), rest)) return true;
  return Boolean(slot.optional) && follows(blocks, rest);
}

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
      return fits(p.eyebrow, 24) ? titled(40) : "eyebrow vide ou trop long";
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
    case "split":
      return fits(p.beforeLabel, 14) && fits(p.afterLabel, 14) && fits(p.before, 40) && fits(p.after, 40)
        ? titled(36)
        : "étiquettes 14 caractères au plus, phrases 40 au plus";
    case "figure":
      return fits(p.value, 8) && /\d/.test(p.value as string) && fits(p.label, 40) ? titled(36) : "value : un chiffre, 8 caractères au plus ; label 40 au plus";
    case "steps": {
      const steps = p.steps;
      if (!Array.isArray(steps) || steps.length !== 3 || !steps.every((step) => fits(step, 32))) return "steps : exactement 3, 32 caractères au plus";
      return titled(36);
    }
    case "question":
      return fits(p.question, 60) && !String(p.question).includes("[[") && fits(p.answer, 40) && HIGHLIGHT_ONCE.test(String(p.answer))
        ? null
        : "question 60 caractères au plus sans [[ ]], answer 40 au plus avec un [[ ]]";
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
  const format = FORMATS.find((item) => item.id === script.format);
  const rhythm = RHYTHMS.find((item) => item.id === script.rhythm);
  if (!format) return `format inconnu « ${script.format} »`;
  if (!rhythm) return `rythme inconnu « ${script.rhythm} »`;
  if (!LOOKS.some((look) => look.id === script.look)) return `habillage inconnu « ${script.look} »`;
  const blocks = script.scenes.map((scene) => scene.block);
  if (!follows(blocks, format.slots)) return `les scènes (${blocks.join(", ")}) ne suivent pas le format « ${format.name} »`;
  if (script.transitions.length !== script.scenes.length - 1) return "une transition entre chaque paire de scènes";
  for (const [index, scene] of script.scenes.entries()) {
    const error = sceneError(scene) ?? rhythmFramesError(scene, rhythm.sceneFrames);
    if (error) return `scène ${index + 1} : ${error}`;
  }
  for (const [index, transition] of script.transitions.entries()) {
    const error =
      transitionError(transition) ??
      (rhythm.transitions.includes(transition.kind) ? null : `${transition.kind} hors du rythme « ${rhythm.name} »`);
    if (error) return `transition ${index + 1} : ${error}`;
  }
  return null;
}

function rhythmFramesError(scene: PostScene, { min, max }: { min: number; max: number }): string | null {
  return scene.frames >= min && scene.frames <= max ? null : `durée de ${scene.frames} images hors du rythme (${min}–${max})`;
}

/** Durée totale : les transitions font se chevaucher les scènes voisines. */
export function scriptFrames(script: PostScript): number {
  const scenes = script.scenes.reduce((total, scene) => total + scene.frames, 0);
  return scenes - script.transitions.reduce((total, t) => total + (t.kind === "cut" ? 0 : t.frames), 0);
}

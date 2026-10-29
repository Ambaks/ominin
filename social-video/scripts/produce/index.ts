import { join } from "node:path";
import type { Feature } from "../../../frontend/lib/social/features.ts";
import {
  sceneError,
  scriptError,
  scriptFrames,
  TRANSITION_FRAMES,
  transitionError,
  RHYTHMS,
  type PostScene,
  type PostScript,
  type PostTransition,
  type ProduceReport,
} from "../../../frontend/lib/social/script.ts";
import { describeFilm, joinFilm, postFilm, sceneFilm } from "../film.ts";
import type { Studio } from "../studio.ts";
import { ask, REVIEW_SCHEMA, type Review } from "./agents.ts";
import { PRODUCE } from "./config.ts";
import {
  featureSection,
  finalReviewer,
  SCENE_SCHEMA,
  sceneEditor,
  sceneReviewer,
  storySection,
  TRANSITION_SCHEMA,
  transitionEditor,
  transitionReviewer,
} from "./prompts.ts";

/*
 * Le montage par agents d'une publication en scènes. D'abord chaque scène,
 * seule, toutes en parallèle : un arbitre frais la note sur ses
 * planches-contacts (film.ts), un monteur la réécrit d'après sa critique, et on recommence pour
 * PRODUCE.sceneRounds tours. Puis chaque jointure de deux scènes voisines,
 * de même, pour PRODUCE.transitionRounds tours. Enfin un arbitre regarde la
 * publication entière. La meilleure version notée de chaque pièce est
 * gardée ; une pièce qui atteint PRODUCE.target ne bouge plus.
 *
 * Les rendus passent un par un (un seul navigateur), les agents en parallèle.
 */

interface Piece<T> {
  value: T;
  review: Review;
  history: Review[];
}


type Run = { studio: Studio; feature: Feature | null; dir: string; stage: (stage: string) => Promise<void> };

function better(a: Review, b: Review): boolean {
  return a.score > b.score;
}

/** Le monteur rend une pièce ; une sortie hors des règles est renvoyée une fois avec l'erreur. */
async function edit<T>(
  system: string,
  prompt: string,
  schema: Record<string, unknown>,
  check: (value: T) => string | null,
  cwd: string,
): Promise<T | null> {
  let request = prompt;
  for (let attempt = 0; attempt < 2; attempt++) {
    const value = await ask<T>({ system, prompt: request, schema, model: PRODUCE.editorModel, cwd });
    const error = check(value);
    if (!error) return value;
    request = `${prompt}\n\nTa proposition précédente est refusée : ${error}. Corrige-la.`;
  }
  return null;
}

async function loop<T>(
  run: Run,
  label: string,
  initial: T[],
  rounds: number,
  render: (value: T, index: number, round: number) => Promise<string>,
  review: (value: T, index: number, film: string) => Promise<Review>,
  rewrite: (piece: Piece<T>, index: number) => Promise<T | null>,
): Promise<Piece<T>[]> {
  const judge = async (values: (T | null)[], round: number) => {
    const films: (string | null)[] = [];
    for (const [index, value] of values.entries()) {
      films.push(value === null ? null : await render(value, index, round));
    }
    return Promise.all(values.map((value, index) => (value === null ? null : review(value, index, films[index]!))));
  };

  const first = await judge(initial, 0);
  const pieces: Piece<T>[] = initial.map((value, index) => ({ value, review: first[index]!, history: [first[index]!] }));
  for (let round = 1; round <= rounds; round++) {
    const open = pieces.map((piece) => piece.review.score < PRODUCE.target);
    if (!open.some(Boolean)) break;
    const candidates = await Promise.all(
      pieces.map((piece, index) => (open[index] ? rewrite(piece, index) : Promise.resolve(null))),
    );
    const reviews = await judge(candidates, round);
    for (const [index, candidate] of candidates.entries()) {
      const result = reviews[index];
      if (candidate === null || !result) continue;
      pieces[index].history.push(result);
      if (better(result, pieces[index].review)) pieces[index] = { ...pieces[index], value: candidate, review: result };
    }
    const scores = pieces.map((piece) => piece.review.score.toFixed(1)).join(" · ");
    console.log(`  tour ${round} : ${scores}`);
    await run.stage(`${label} · tour ${round}/${rounds} · ${scores}`);
  }
  return pieces;
}

function reviewPrompt(run: Run, script: PostScript, subject: string, film: string): string {
  return [featureSection(run.feature), "", storySection(script), "", subject, "", film].join("\n");
}

/** Le rythme imposé à la publication : ses transitions et la durée d'une scène. */
const rhythmOf = (script: PostScript) => RHYTHMS.find((rhythm) => rhythm.id === script.rhythm)!;

/** Une scène réécrite garde son bloc et la durée du rythme. */
function keepsShape(candidate: PostScene, original: PostScene, script: PostScript): string | null {
  if (candidate.block !== original.block) return `garde le bloc « ${original.block} »`;
  const { min, max } = rhythmOf(script).sceneFrames;
  if (candidate.frames < min || candidate.frames > max) return `durée de ${min} à ${max} images (rythme imposé)`;
  return sceneError(candidate);
}

/** Le rédacteur ne compte pas les caractères : une scène hors des limites du
 * bloc est réécrite par un monteur avant le premier rendu, une transition
 * hors de ses bornes y est ramenée. */
async function repair(run: Run, script: PostScript): Promise<PostScript> {
  const scenes = await Promise.all(
    script.scenes.map(async (scene, index) => {
      const error = sceneError(scene);
      if (!error) return scene;
      const review: Review = { score: 0, verdict: `Scène hors des règles du bloc : ${error}.`, fixes: [error], design_issues: [] };
      const fixed = await edit<PostScene>(
        sceneEditor,
        rewritePrompt(run, script, `SCÈNE ${index + 1} : ${JSON.stringify(scene)}`, review),
        SCENE_SCHEMA,
        (candidate) => keepsShape(candidate, scene, script),
        run.dir,
      );
      if (!fixed) throw new Error(`scène ${index + 1} irréparable : ${error}`);
      return fixed;
    }),
  );
  const { min, max } = TRANSITION_FRAMES;
  const rhythm = rhythmOf(script);
  const transitions = script.transitions.map((t) => ({
    ...t,
    kind: rhythm.transitions.includes(t.kind) ? t.kind : rhythm.transitions[0],
    frames: Math.min(Math.max(Math.round(t.frames), min), max),
  }));
  const bounds = rhythm.sceneFrames;
  const repaired = {
    ...script,
    scenes: scenes.map((scene) => ({ ...scene, frames: Math.min(Math.max(scene.frames, bounds.min), bounds.max) })),
    transitions,
  };
  const error = scriptError(repaired);
  if (error) throw new Error(`script refusé : ${error}`);
  return repaired;
}

function rewritePrompt(run: Run, script: PostScript, subject: string, review: Review): string {
  return [
    featureSection(run.feature),
    "",
    storySection(script),
    "",
    subject,
    "",
    `L'ARBITRE A NOTÉ ${review.score.toFixed(1)}/10 : ${review.verdict}`,
    "Corrige au moins ceci, sans casser ce qui marche :",
    ...review.fixes.map((fix) => `- ${fix}`),
  ].join("\n");
}

async function scenes(run: Run, script: PostScript): Promise<Piece<PostScene>[]> {
  const alone = (scene: PostScene): PostScript => ({ ...script, scenes: [scene], transitions: [] });
  const subject = (scene: PostScene, index: number) => `SCÈNE ${index + 1} : ${JSON.stringify(scene)}`;
  return loop<PostScene>(
    run,
    "Scènes",
    script.scenes,
    PRODUCE.sceneRounds,
    async (scene, index, round) =>
      describeFilm(await sceneFilm(run.studio, alone(scene), join(run.dir, `scene-${index + 1}`, `r${round}`))),
    (scene, index, images) =>
      ask<Review>({
        system: sceneReviewer,
        prompt: reviewPrompt(run, script, subject(scene, index), images),
        schema: REVIEW_SCHEMA,
        model: PRODUCE.reviewerModel,
        cwd: run.dir,
      }),
    (piece, index) =>
      edit<PostScene>(
        sceneEditor,
        rewritePrompt(run, script, subject(piece.value, index), piece.review),
        SCENE_SCHEMA,
        (scene) => keepsShape(scene, piece.value, script),
        run.dir,
      ),
  );
}

async function transitions(run: Run, script: PostScript): Promise<Piece<PostTransition>[]> {
  const pair = (transition: PostTransition, index: number): PostScript => ({
    ...script,
    scenes: [script.scenes[index], script.scenes[index + 1]],
    transitions: [transition],
  });
  const subject = (transition: PostTransition, index: number) =>
    `JOINTURE ${index + 1} → ${index + 2} : ${JSON.stringify(transition)}`;
  return loop<PostTransition>(
    run,
    "Transitions",
    script.transitions,
    PRODUCE.transitionRounds,
    async (transition, index, round) => {
      const length = transition.kind === "cut" ? 0 : transition.frames;
      const start = script.scenes[index].frames - length;
      return describeFilm(await joinFilm(run.studio, pair(transition, index), start, length, join(run.dir, `join-${index + 1}`, `r${round}`)));
    },
    (transition, index, images) =>
      ask<Review>({
        system: transitionReviewer,
        prompt: reviewPrompt(run, script, subject(transition, index), images),
        schema: REVIEW_SCHEMA,
        model: PRODUCE.reviewerModel,
        cwd: run.dir,
      }),
    (piece, index) =>
      edit<PostTransition>(
        transitionEditor,
        rewritePrompt(run, script, subject(piece.value, index), piece.review),
        { ...TRANSITION_SCHEMA, properties: { ...TRANSITION_SCHEMA.properties, kind: { type: "string", enum: rhythmOf(script).transitions } } },
        (transition) =>
          transitionError(transition) ??
          (rhythmOf(script).transitions.includes(transition.kind) ? null : `transitions du rythme : ${rhythmOf(script).transitions.join(", ")}`),
        run.dir,
      ),
  );
}

async function finalReview(run: Run, script: PostScript): Promise<Review> {
  const middles: number[] = [];
  let start = 0;
  for (const [index, scene] of script.scenes.entries()) {
    middles.push(start + Math.floor(scene.frames * 0.6));
    const transition = script.transitions[index];
    if (transition) start += scene.frames - (transition.kind === "cut" ? 0 : transition.frames);
  }
  const film = await postFilm(run.studio, script, scriptFrames(script), middles, join(run.dir, "final"));
  return ask<Review>({
    system: finalReviewer,
    prompt: reviewPrompt(run, script, "PUBLICATION À NOTER : ci-dessus.", describeFilm(film)),
    schema: REVIEW_SCHEMA,
    model: PRODUCE.reviewerModel,
    cwd: run.dir,
  });
}

export async function produce(
  studio: Studio,
  draft: PostScript,
  feature: Feature | null,
  dir: string,
  stage: (stage: string) => Promise<void> = async () => {},
): Promise<{ script: PostScript; report: ProduceReport }> {
  const run: Run = { studio, feature, dir, stage };
  await stage("Scènes · premier rendu");
  const script = await repair(run, draft);
  console.log("Scènes");
  const scenePieces = await scenes(run, script);
  const withScenes: PostScript = { ...script, scenes: scenePieces.map((piece) => piece.value) };
  console.log("Transitions");
  await stage("Transitions · premier rendu");
  const transitionPieces = await transitions(run, withScenes);
  const produced: PostScript = { ...withScenes, transitions: transitionPieces.map((piece) => piece.value) };
  console.log("Publication entière");
  await stage("Publication entière");
  const final = await finalReview(run, produced);
  return {
    script: produced,
    report: {
      scenes: scenePieces.map((piece) => piece.history),
      transitions: transitionPieces.map((piece) => piece.history),
      final,
    },
  };
}

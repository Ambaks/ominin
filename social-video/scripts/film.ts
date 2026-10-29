import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { PostScript } from "../../frontend/lib/social/script.ts";
import type { Studio } from "./studio.ts";

/*
 * Ce que regardent les arbitres à la place de la vidéo, qu'un agent ne sait
 * pas lire : des planches-contacts. Une planche de toute la scène à dix
 * images par seconde pour le rythme, une planche image par image de
 * l'entrée (ou de la transition) pour le mouvement, et deux images nettes
 * pour juger la lecture des textes. Les planches sont assemblées par ffmpeg.
 */

const run = promisify(execFile);

/* Vignettes des planches : 216 × 384, dix par ligne. */
const SHEET_SCALE = 0.2;
const COLUMNS = 10;
/* Images nettes : demi-définition. */
const DETAIL_SCALE = 0.5;
/* La scène entière à dix images par seconde ; l'entrée, les 36 premières images une à une. */
const OVERVIEW_EVERY = 3;
const ENTRY_FRAMES = 36;
/* Autour d'une transition : un peu de la scène qui part et de celle qui arrive. */
const JOIN_MARGIN = 8;
/* La publication entière, pour l'arbitre final : cinq images par seconde. */
const POST_EVERY = 6;

export interface Film {
  sheets: { path: string; caption: string }[];
  details: { path: string; frame: number }[];
}

const range = (from: number, to: number, step = 1) =>
  Array.from({ length: Math.max(0, Math.ceil((to - from) / step)) }, (_, i) => from + i * step);

async function sheet(paths: string[], out: string): Promise<void> {
  const list = `${out}.txt`;
  await writeFile(list, paths.map((path) => `file '${path}'`).join("\n"));
  const rows = Math.ceil(paths.length / COLUMNS);
  await run("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-vf", `tile=${COLUMNS}x${rows}:padding=6:color=0x3a3a3a`, "-frames:v", "1", out]);
  await rm(list);
}

async function filmOf(
  studio: Studio,
  script: PostScript,
  dir: string,
  strips: { name: string; frames: number[]; caption: string }[],
  details: number[],
): Promise<Film> {
  await mkdir(dir, { recursive: true });
  const sheets: Film["sheets"] = [];
  for (const strip of strips) {
    const paths = await studio.sequence(script, strip.frames, SHEET_SCALE, join(dir, `${strip.name}-frames`));
    const path = join(dir, `${strip.name}.jpg`);
    await sheet(paths, path);
    sheets.push({ path, caption: strip.caption });
  }
  const stills = await studio.stills(script, details, dir, "detail");
  return { sheets, details: stills.map((path, i) => ({ path, frame: details[i] })) };
}

const reading = `de gauche à droite puis ligne par ligne, ${COLUMNS} vignettes par ligne`;

/** Une scène seule. */
export function sceneFilm(studio: Studio, script: PostScript, dir: string): Promise<Film> {
  const frames = script.scenes[0].frames;
  const entry = Math.min(ENTRY_FRAMES, frames);
  return filmOf(
    studio,
    script,
    dir,
    [
      {
        name: "scene",
        frames: [...range(0, frames, OVERVIEW_EVERY), frames - 1],
        caption: `toute la scène (${frames} images, ${(frames / 30).toFixed(1)} s), une vignette toutes les ${OVERVIEW_EVERY} images soit dix par seconde, ${reading} ; la dernière vignette est la dernière image`,
      },
      {
        name: "entree",
        frames: range(0, entry),
        caption: `l'entrée image par image (images 0 à ${entry - 1}, ${(entry / 30).toFixed(1)} s), ${reading} : c'est le mouvement tel qu'on le voit, un état qui ne dure que deux ou trois vignettes passe à l'œil`,
      },
    ],
    [Math.round(frames * 0.6), frames - 1],
  );
}

/** Deux scènes voisines et la transition qui les joint, qui commence à l'image start et dure length. */
export function joinFilm(studio: Studio, script: PostScript, start: number, length: number, dir: string): Promise<Film> {
  const from = start - JOIN_MARGIN;
  const to = start + length + JOIN_MARGIN;
  return filmOf(
    studio,
    script,
    dir,
    [
      {
        name: "jointure",
        frames: range(from, to + 1),
        caption: `la jointure image par image (images ${from} à ${to} : ${JOIN_MARGIN} images de la scène qui part, la transition de ${length} images, ${JOIN_MARGIN} images de la suivante), ${reading}`,
      },
    ],
    [from, to],
  );
}

/** La publication entière : son rythme, et une image nette au milieu de chaque scène. */
export function postFilm(studio: Studio, script: PostScript, total: number, middles: number[], dir: string): Promise<Film> {
  return filmOf(
    studio,
    script,
    dir,
    [
      {
        name: "publication",
        frames: [...range(0, total, POST_EVERY), total - 1],
        caption: `toute la publication (${total} images, ${(total / 30).toFixed(1)} s), une vignette toutes les ${POST_EVERY} images soit cinq par seconde, ${reading}`,
      },
    ],
    middles,
  );
}

/** Ce que l'agent doit ouvrir, et comment le lire. */
export function describeFilm(film: Film): string {
  return [
    "PLANCHES-CONTACTS (la vidéo, image par image) :",
    ...film.sheets.map((sheet) => `- ${sheet.path} : ${sheet.caption}`),
    "IMAGES NETTES (pour lire les textes) :",
    ...film.details.map((detail) => `- ${detail.path} (image ${detail.frame}, ${(detail.frame / 30).toFixed(1)} s)`),
  ].join("\n");
}

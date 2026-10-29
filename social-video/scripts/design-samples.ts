import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { type BlockId, type PostScene, sceneError } from "../../frontend/lib/social/script.ts";
import { describeFilm, sceneFilm } from "./film.ts";
import { openStudio, ROOT, type Studio } from "./studio.ts";

/*
 * Ce que partagent la revue de dessin et l'aperçu des designers : les
 * contenus d'essai de chaque bloc (samples/design.json), leurs
 * planches-contacts (film.ts), et un verrou pour qu'un seul navigateur de rendu tourne à la
 * fois, quel que soit le nombre d'agents qui demandent un aperçu.
 */

const LOCK = join(ROOT, "out", ".render-lock");
const LOCK_POLL_MS = 2000;
/* Un verrou plus vieux vient d'un rendu interrompu : on le reprend. */
const LOCK_STALE_MS = 10 * 60 * 1000;

export async function designSamples(): Promise<Record<BlockId, PostScene[]>> {
  return JSON.parse(await readFile(join(ROOT, "samples", "design.json"), "utf8"));
}

async function lock(): Promise<void> {
  await mkdir(join(ROOT, "out"), { recursive: true });
  for (;;) {
    try {
      await mkdir(LOCK);
      return;
    } catch {
      const held = await stat(LOCK).catch(() => null);
      if (held && Date.now() - held.mtimeMs > LOCK_STALE_MS) await rm(LOCK, { recursive: true, force: true });
      else await sleep(LOCK_POLL_MS);
    }
  }
}

export async function withStudio<T>(work: (studio: Studio) => Promise<T>): Promise<T> {
  await lock();
  try {
    const studio = await openStudio();
    try {
      return await work(studio);
    } finally {
      await studio.close();
    }
  } finally {
    await rm(LOCK, { recursive: true, force: true });
  }
}

/** Les planches-contacts d'un bloc sur chacun de ses contenus d'essai, décrites pour un agent. */
export async function blockFilm(studio: Studio, block: BlockId, scenes: PostScene[], dir: string): Promise<string> {
  const lines: string[] = [];
  for (const [index, scene] of scenes.entries()) {
    const error = sceneError(scene);
    if (error) throw new Error(`${block} ${index + 1} : ${error}`);
    const film = await sceneFilm(studio, { brand: "menu", scenes: [scene], transitions: [] }, join(dir, `c${index + 1}`));
    lines.push(`CONTENU ${index + 1} : ${JSON.stringify(scene.props)}`, describeFilm(film), "");
  }
  return lines.join("\n");
}

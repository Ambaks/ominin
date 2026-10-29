import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BlockId } from "../../frontend/lib/social/script.ts";
import { blockFilm, designSamples, withStudio } from "./design-samples.ts";
import { ask, REVIEW_SCHEMA, type Review } from "./produce/agents.ts";
import { FILM_READING } from "./produce/prompts.ts";
import { PRODUCE } from "./produce/config.ts";
import { ROOT } from "./studio.ts";

/*
 * La revue de dessin des blocs, un tour de la boucle de design :
 *   npx tsx scripts/design-review.ts <tour> [bloc…]
 * Chaque bloc est rendu sur les contenus de samples/design.json (deux par
 * bloc, pour ne pas dessiner pour un seul texte), puis un arbitre frais par
 * bloc, tous en parallèle, note le dessin sur ses planches-contacts. Écrit
 * out/design/r<tour>/<bloc>.json, que lisent les agents qui redessinent.
 */


const reviewer = `\
Tu es l'arbitre du dessin d'un bloc de motion design, une scène réutilisable \
des Reels Instagram d'Ominin Menu. Le texte change d'une publication à \
l'autre : tu juges le DESSIN du bloc (mise en page, typographie, couleurs, \
mouvement, finition), pas le texte. On te le montre sur deux contenus \
différents ; ouvre chaque image avec l'outil Read avant de juger.

${FILM_READING}

Toile verticale 1080 × 1920 à 30 images par seconde. L'interface d'Instagram couvre environ 250 px en haut, \
400 px en bas et une colonne d'icônes à droite : aucun texte n'y va, mais le \
bas peut porter un élément visuel. Identité : celle du site d'Ominin \
(menu.ominin.com) — fond presque noir chaud, grille fine, halo de braise, \
titres Geist très gras et serrés, mot clé sur un pavé dégradé ambre → terre \
cuite → rose, cartes sombres à fin liseré, objets de l'outil (carte, ticket, \
téléphone) montrés pour de vrai.

LA GRILLE (sur 10) :
- Lisible sur un téléphone, 2 points : tout texte d'au moins 28 px en pleine \
définition, contrasté, rien de coupé ni de superposé.
- Composition, 2,5 points : hiérarchie nette, la toile utile remplie sans \
vide mort ni entassement, alignements justes, tient sur les deux contenus.
- Mouvement, 2,5 points : d'après les planches, une entrée chorégraphiée et \
fluide, un rythme juste, de la vie jusqu'à la fin de la scène, aucun état \
laid qui dure assez pour se voir.
- Finition et identité, 3 points : on croirait une scène du site ; détails \
soignés (ombres, marges, rayons, rythme) ; rien de générique.
Un 9 se mérite : une scène qu'un studio de motion design livrerait telle \
quelle. Pas de note de complaisance.

SORTIE :
- score : la note sur 10, une décimale.
- verdict : deux phrases.
- fixes : liste vide (le texte ne te regarde pas).
- design_issues : de trois à huit changements de dessin concrets, du plus \
important au moins important, chacun précis (quoi, où, de combien : \
« agrandir le téléphone à 70 % de la largeur », « faire entrer les points \
par le bas avec 6 images d'écart »).`;

const [round, ...only] = process.argv.slice(2);
if (!round) throw new Error("usage : design-review.ts <tour> [bloc…]");
const samples = await designSamples();
const blocks = (Object.keys(samples) as BlockId[]).filter((block) => !only.length || only.includes(block));
const dir = join(ROOT, "out", "design", `r${round}`);
await mkdir(dir, { recursive: true });

const shots: Record<string, string> = {};
await withStudio(async (studio) => {
  for (const block of blocks) shots[block] = await blockFilm(studio, block, samples[block], join(dir, block));
});

const reviews = await Promise.all(
  blocks.map((block) =>
    ask<Review>({
      system: reviewer,
      prompt: `BLOC « ${block} »\n\n${shots[block]}`,
      schema: REVIEW_SCHEMA,
      model: PRODUCE.reviewerModel,
      cwd: dir,
    }),
  ),
);
for (const [index, block] of blocks.entries()) {
  await writeFile(join(dir, `${block}.json`), JSON.stringify({ ...reviews[index], images: shots[block] }, null, 2));
  console.log(`${block} : ${reviews[index].score.toFixed(1)} — ${reviews[index].verdict}`);
}

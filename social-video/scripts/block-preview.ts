import { join } from "node:path";
import type { BlockId } from "../../frontend/lib/social/script.ts";
import { blockFilm, designSamples, withStudio } from "./design-samples.ts";
import { ROOT } from "./studio.ts";

/*
 * Aperçu d'un bloc pour son designer : ses planches-contacts sur les contenus
 * d'essai, dans out/design/preview/<bloc>/<étiquette>/.
 *   npx tsx scripts/block-preview.ts <bloc> <étiquette>
 * Attend son tour si un autre rendu tourne.
 */

const [block, tag] = process.argv.slice(2) as [BlockId, string];
if (!block || !tag) throw new Error("usage : block-preview.ts <bloc> <étiquette>");
const samples = await designSamples();
if (!samples[block]) throw new Error(`bloc inconnu « ${block} »`);
console.log(await withStudio((studio) => blockFilm(studio, block, samples[block], join(ROOT, "out", "design", "preview", block, tag))));

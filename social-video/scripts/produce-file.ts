import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { FEATURES } from "../../frontend/lib/social/features.ts";
import { scriptError, type PostScript } from "../../frontend/lib/social/script.ts";
import { produce } from "./produce/index.ts";
import { openStudio, ROOT } from "./studio.ts";

/*
 * Monte une publication depuis un fichier { feature, script } :
 *   npx tsx scripts/produce-file.ts samples/<nom>.json [--no-agents]
 * Écrit out/<nom>/ : la vidéo, le script retenu et le rapport des agents.
 * --no-agents rend le script tel quel, pour voir les blocs.
 */

const [file, flag] = process.argv.slice(2);
if (!file) throw new Error("usage : produce-file.ts <fichier.json> [--no-agents]");
const { feature: featureId, script } = JSON.parse(await readFile(file, "utf8")) as { feature: string; script: PostScript };
const feature = FEATURES.find((item) => item.id === featureId);
if (!feature) throw new Error(`fonctionnalité inconnue « ${featureId} »`);
const error = scriptError(script);
if (error) throw new Error(`script refusé : ${error}`);

const dir = join(ROOT, "out", basename(file, ".json"));
await mkdir(dir, { recursive: true });
const studio = await openStudio();
try {
  let final = script;
  if (flag !== "--no-agents") {
    const result = await produce(studio, script, feature, dir);
    final = result.script;
    await writeFile(join(dir, "report.json"), JSON.stringify(result.report, null, 2));
    console.log(`Note finale : ${result.report.final.score} — ${result.report.final.verdict}`);
  }
  await writeFile(join(dir, "script.json"), JSON.stringify(final, null, 2));
  await studio.video(final, join(dir, "post.mp4"));
  console.log(join(dir, "post.mp4"));
} finally {
  await studio.close();
}

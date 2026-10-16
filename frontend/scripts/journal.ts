/*
 * Ajoute une entrée au journal de l'équipe (admin → Projet → Journal) : ce
 * qui vient d'être poussé, par qui, sur quelle branche et à quel commit.
 * Appelé par le skill /push, après le push.
 *
 * Usage, depuis frontend/ :  npm run journal -- "<titre>" <fichier du résumé>
 * Écrit dans le projet auquel la CLI Supabase est liée (la production), avec
 * la session de `npm run db:login` : aucune clé à poser. Lit OMININ_OWNER
 * (marwan ou ambaka : qui travaille sur ce poste) dans ../backend/.env.
 */

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isOwner } from "../lib/admin/owners";

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();

const [title, summaryPath] = process.argv.slice(2);
if (!title?.trim() || !summaryPath) {
  throw new Error('Usage : npm run journal -- "<titre>" <fichier du résumé>');
}
const owner = process.env.OMININ_OWNER;
if (!isOwner(owner)) {
  throw new Error("OMININ_OWNER manque ou ne vaut ni marwan ni ambaka — renseigne backend/.env.");
}

const entry = JSON.stringify({
  owner,
  title: title.trim(),
  summary: readFileSync(summaryPath, "utf8").trim(),
  branch: git("rev-parse", "--abbrev-ref", "HEAD"),
  commit_sha: git("rev-parse", "--short", "HEAD"),
});
// Les valeurs passent en un seul littéral JSON, entre dollar-quotes à
// étiquette aléatoire : aucun texte du résumé ne peut refermer la chaîne.
const tag = `j${randomUUID().replaceAll("-", "")}`;
const sql = `insert into public.projet_journal (owner, title, summary, branch, commit_sha)
select owner, title, summary, branch, commit_sha
from jsonb_populate_record(null::public.projet_journal, $${tag}$${entry}$${tag}$::jsonb);`;

const dir = mkdtempSync(join(tmpdir(), "journal-"));
try {
  const file = join(dir, "entry.sql");
  writeFileSync(file, sql);
  // La CLI est un script Node : lancée par Node, sans shell, sur tout système.
  execFileSync(
    process.execPath,
    [
      resolve("node_modules/supabase/dist/supabase.js"),
      "--workdir",
      "..",
      "db",
      "query",
      "--linked",
      "--file",
      file,
      "--output-format",
      "json",
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  console.log(`Journal : « ${title.trim()} » ajouté.`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

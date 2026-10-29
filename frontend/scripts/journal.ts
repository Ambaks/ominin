/*
 * Poste une entrée du journal de l'équipe dans le salon #journal de Discord :
 * ce qui vient d'être poussé, par qui, sur quelle branche et à quel commit.
 * Appelé par le skill /push, après le push.
 *
 * Usage, depuis frontend/ :  npm run journal -- "<titre>" <fichier du résumé>
 * Lit OMININ_OWNER (marwan ou ambaka : qui travaille sur ce poste) dans
 * ../backend/.env, le bot et le salon (DISCORD_BOT_TOKEN, DISCORD_GUILD_ID,
 * DISCORD_JOURNAL_CHANNEL_ID) dans .env.local.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { OWNER_LABELS, isOwner } from "../lib/admin/owners";
import { DISCORD_MESSAGE_MAX, postDiscord } from "../lib/discord";

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();

const [title, summaryPath] = process.argv.slice(2);
if (!title?.trim() || !summaryPath) {
  throw new Error('Usage : npm run journal -- "<titre>" <fichier du résumé>');
}
const owner = process.env.OMININ_OWNER;
if (!isOwner(owner)) {
  throw new Error("OMININ_OWNER manque ou ne vaut ni marwan ni ambaka — renseigne backend/.env.");
}

const head = `📓 **${title.trim()}**\n${OWNER_LABELS[owner]} · \`${git("rev-parse", "--abbrev-ref", "HEAD")}\` · \`${git("rev-parse", "--short", "HEAD")}\``;
const lines = [head, ...readFileSync(summaryPath, "utf8").trim().split("\n")];

// Un message Discord a une taille maximale : le résumé part en plusieurs, coupé entre deux lignes.
const messages: string[] = [];
for (const line of lines) {
  const last = messages.at(-1);
  if (last !== undefined && last.length + line.length + 1 <= DISCORD_MESSAGE_MAX) messages[messages.length - 1] = `${last}\n${line}`;
  else messages.push(line.slice(0, DISCORD_MESSAGE_MAX));
}
void (async () => {
  for (const message of messages) await postDiscord("journal", message);
  console.log(`Journal : « ${title.trim()} » posté dans #journal.`);
})();

/*
 * Publie les documents du dépôt (lib/legal/documents) dans legal_versions.
 * C'est ce script qui tient la procédure juridique, et il tient par un refus :
 *
 *   une version déjà publiée dont l'empreinte a changé n'est pas réécrite.
 *
 * L'empreinte couvre l'annexe tarifaire, engendrée depuis lib/landing-data.ts.
 * Changer un prix change donc l'empreinte, le script s'arrête, et la seule
 * issue est d'ajouter une version au tableau du document — avec sa date
 * d'effet, donc son préavis, donc la réacceptation. Le contrat ne peut pas
 * changer en silence.
 *
 * Depuis frontend/ :
 *   npm run legal:check     → dit ce qui serait publié, n'écrit rien
 *   npm run legal:publish   → écrit
 */

import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "../lib/gmail";
import { contactEmail } from "../lib/landing-data";
import {
  LEGAL_PATHS,
  PRICE_NOTICE_DAYS,
  missingIdentity,
} from "../lib/legal/constants";
import { documents } from "../lib/legal/documents";
import { frenchDate } from "../lib/legal/format";
import { documentHash, shortHash } from "../lib/legal/hash";
import type { LegalDoc, LegalDocument } from "../lib/legal/types";
import { siteUrl } from "../lib/site";
import type { Database } from "../lib/supabase/database.types";

const dryRun = process.argv.includes("--check");
/*
 * L'article 9 des CGV promet un préavis « par courrier électronique … et par
 * un bandeau ». Le bandeau vit dans l'espace de gestion ; l'e-mail part
 * d'ici, à la publication — c'est le moment où le préavis commence à courir.
 * Il part par défaut : une promesse contractuelle ne doit pas dépendre d'un
 * second geste qu'on peut oublier. --no-mail pour une publication technique
 * (correction de coquille sans changement de fond).
 */
const noMail = process.argv.includes("--no-mail");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises — renseigne backend/.env."
  );
}
const db = createClient<Database>(url, key, {
  auth: { persistSession: false },
});

const DAY_MS = 86_400_000;

/** Journal lisible : ce qui a bougé, et ce qui n'aurait pas dû. */
const problems: string[] = [];

/*
 * Préavis. La première version d'un document s'applique immédiatement — on ne
 * donne pas trente jours de préavis à des clients qui n'ont encore rien signé.
 * Toute version suivante, elle, doit laisser le délai annoncé aux CGV : c'est
 * la contrepartie de la clause de révision, et le seul cas qu'il faut vraiment
 * arrêter est celui d'un nouveau tarif applicable tout de suite.
 */
function checkNotice(document: LegalDocument, isFirstVersion: boolean) {
  if (isFirstVersion) return;
  // Arrondi vers le bas : « au moins 30 jours » ne peut pas être satisfait
  // par 29 jours et 16 heures.
  const days = Math.floor(
    (Date.parse(document.effectiveFrom) - Date.now()) / DAY_MS
  );
  if (days < PRICE_NOTICE_DAYS) {
    problems.push(
      `${document.doc} ${document.version} : date d'effet dans ${days} jour(s), ` +
        `${PRICE_NOTICE_DAYS} de préavis annoncés aux CGV. Repousse-la — ` +
        `une révision applicable sans préavis ne tient pas.`
    );
  }
}

/*
 * Deux temps, et c'est le point. On examine d'abord tous les documents sans
 * rien écrire, puis on n'écrit que si rien n'a été relevé. Écrire au fil de
 * l'examen publiait une version refusée pour préavis insuffisant — la ligne
 * partait en base, le contrat devenait applicable à sa date, et le message
 * « Refusé » qui suivait n'y changeait rien. Une publication est atomique ou
 * n'est pas.
 */
type Planned = { doc: LegalDoc; document: LegalDocument; hash: string };

async function examine(
  doc: LegalDoc,
  document: LegalDocument,
  planned: Planned[]
) {
  const hash = documentHash(document);
  const { data: existing, error } = await db
    .from("legal_versions")
    .select("id, body_sha256, effective_from")
    .eq("doc", doc)
    .eq("version", document.version)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (existing) {
    if (existing.body_sha256 !== hash) {
      // La date d'effet entre dans l'empreinte : ce message couvre donc aussi
      // le cas d'une date avancée après coup, qui viderait le préavis.
      const moved =
        Date.parse(existing.effective_from) !== Date.parse(document.effectiveFrom)
          ? ` Sa date d'effet est passée du ${frenchDate(existing.effective_from)} au ${frenchDate(document.effectiveFrom)}.`
          : "";
      problems.push(
        `${doc} ${document.version} : le texte a changé depuis sa publication ` +
          `(${shortHash(existing.body_sha256)} → ${shortHash(hash)}).${moved} ` +
          `Une version publiée ne se réécrit pas : ajoute une nouvelle version ` +
          `dans lib/legal/documents, avec sa propre date d'effet.`
      );
      return;
    }
    console.log(`  = ${doc} ${document.version} (${shortHash(hash)}) inchangé`);
    return;
  }

  const { count } = await db
    .from("legal_versions")
    .select("id", { count: "exact", head: true })
    .eq("doc", doc);
  // Les versions que ce passage vient de retenir comptent aussi : sans cela
  // la deuxième version d'un même document passerait pour la première et
  // échapperait au préavis.
  const alreadyThisRun = planned.filter((entry) => entry.doc === doc).length;
  checkNotice(document, (count ?? 0) + alreadyThisRun === 0);
  planned.push({ doc, document, hash });
}

async function insertPlanned(planned: Planned[]) {
  for (const { doc, document, hash } of planned) {
    const { error } = await db.from("legal_versions").insert({
      doc,
      version: document.version,
      effective_from: document.effectiveFrom,
      body_sha256: hash,
      summary: document.summary,
    });
    if (error) throw new Error(error.message);
    console.log(
      `  ✓ ${doc} ${document.version} (${shortHash(hash)}) ` +
        `effet ${frenchDate(document.effectiveFrom)}`
    );
  }
}

/** Gérants et propriétaires à prévenir : ceux que le contrat engage. */
async function recipients(): Promise<string[]> {
  const [{ data: gerants, error: e1 }, { data: proprietaires, error: e2 }] =
    await Promise.all([
      db.from("memberships").select("email").eq("role", "gerant"),
      db.from("shop_members").select("email").eq("role", "proprietaire"),
    ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);
  const all = [...(gerants ?? []), ...(proprietaires ?? [])]
    .map((row) => row.email?.trim().toLowerCase())
    .filter((email): email is string => Boolean(email));
  return [...new Set(all)];
}

function noticeHtml(published: LegalDocument[], site: string) {
  const items = published
    .map(
      (document) =>
        `<li><strong>${document.title}</strong> — version ${document.version}, ` +
        `applicable le ${frenchDate(document.effectiveFrom)}.<br>${document.summary}</li>`
    )
    .join("");
  const future = published.some(
    (document) => Date.parse(document.effectiveFrom) > Date.now()
  );
  return [
    "<p>Bonjour,</p>",
    future
      ? "<p>Nos conditions évoluent. Voici ce qui change :</p>"
      : "<p>Nos conditions sont désormais en vigueur :</p>",
    `<ul>${items}</ul>`,
    "<p>Vous pouvez les lire dès maintenant : ",
    `<a href="${site}${LEGAL_PATHS.cgv}">conditions générales de vente</a> et `,
    `<a href="${site}${LEGAL_PATHS.dpa}">accord de sous-traitance</a>.</p>`,
    future
      ? "<p>À la date d'application, votre espace de gestion vous demandera de les accepter. " +
        "Si elles ne vous conviennent pas, vous pouvez résilier avant cette date, " +
        "sans frais ni pénalité.</p>"
      : "<p>À votre prochaine connexion, votre espace de gestion vous demandera de les " +
        "accepter. Si elles ne vous conviennent pas, vous pouvez résilier à tout moment, " +
        "sans frais ni pénalité.</p>",
    `<p>Une question ? Répondez à ce message ou écrivez-nous à ${contactEmail}.</p>`,
    "<p>— Ominin</p>",
  ].join("");
}

/*
 * Prévenir les clients de toute version publiée, y compris la première.
 * L'article 9 n'impose le préavis qu'aux révisions, mais une première version
 * applicable tout de suite ferme l'espace de gestion des clients déjà servis
 * à leur prochaine connexion : leur envoyer l'information après coup serait
 * la découvrir par un écran de blocage.
 */
async function notify(published: LegalDocument[]) {
  if (!published.length) return;

  const to = await recipients();
  if (!to.length) {
    console.log("\nAucun destinataire à prévenir.");
    return;
  }
  if (dryRun || noMail) {
    console.log(
      `\nAvis NON envoyé (${dryRun ? "--check" : "--no-mail"}) — ` +
        `${to.length} destinataire(s) : ${to.join(", ")}`
    );
    return;
  }
  const subject = "Ominin — nos conditions";
  const html = noticeHtml(published, siteUrl);
  let sent = 0;
  for (const address of to) {
    try {
      await sendEmail(address, subject, html, contactEmail);
      sent += 1;
    } catch (cause) {
      // Un destinataire injoignable ne doit pas priver les autres de l'avis.
      console.error(`  ✗ avis non remis à ${address} :`, cause);
    }
  }
  console.log(`\nAvis envoyé à ${sent}/${to.length} destinataire(s).`);
  if (sent === 0) {
    /*
     * Rien n'est parti, et les versions sont déjà en base : une nouvelle
     * exécution les trouvera publiées et n'aura plus rien à annoncer. Sortir
     * en erreur est le seul moyen que l'oubli se voie — l'avis devra être
     * renvoyé à la main.
     */
    problems.push(
      "Aucun avis n'a pu être envoyé alors que les versions sont publiées — " +
        "préviens les clients manuellement, l'envoi ne sera pas rejoué."
    );
  }
}

async function main() {
  const incomplete = missingIdentity();
  if (incomplete.length) {
    // Bloquant : des mentions légales incomplètes ne sont pas des mentions
    // légales (LCEN art. 6-III), et le contrat les cite.
    problems.push(
      `Identité de l'éditeur incomplète : ${incomplete.join(", ")} — ` +
        `renseigne NEXT_PUBLIC_OMININ_SIREN / _RCS / _ADDRESS.`
    );
  }

  console.log(dryRun ? "Vérification :" : "Publication :");
  const planned: Planned[] = [];
  for (const [doc, versions] of Object.entries(documents)) {
    for (const document of versions) {
      await examine(doc as LegalDoc, document, planned);
    }
  }

  // Rien n'a encore été écrit : un seul reproche suffit à tout arrêter.
  if (problems.length) {
    console.error("\nRefusé — rien n'a été publié :");
    for (const problem of problems) console.error(`  ✗ ${problem}`);
    process.exit(1);
  }

  if (dryRun) {
    for (const { doc, document, hash } of planned) {
      console.log(
        `  + ${doc} ${document.version} (${shortHash(hash)}) ` +
          `effet ${frenchDate(document.effectiveFrom)}`
      );
    }
    await notify(planned.map((entry) => entry.document));
    console.log("\nRien à redire.");
    return;
  }

  await insertPlanned(planned);
  await notify(planned.map((entry) => entry.document));

  // L'avis n'a pas pu partir : les versions sont publiées et ne seront plus
  // annoncées par une nouvelle exécution. Sortir en erreur est ce qui rend
  // l'oubli visible.
  if (problems.length) {
    console.error("\nPublié, mais :");
    for (const problem of problems) console.error(`  ✗ ${problem}`);
    process.exit(1);
  }
  console.log("\nPublié.");
}

void main();

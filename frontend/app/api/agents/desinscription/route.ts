import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Désinscription des e-mails envoyés par un agent client (lien CNIL en pied
 * de chaque e-mail + en-tête List-Unsubscribe one-click, RFC 8058). Même
 * mécanique que /api/desinscription de Léa : jeton HMAC émis par le backend
 * (même secret, préfixé « agents: » pour qu'un jeton d'un produit ne vaille
 * jamais sur l'autre), GET sans effet (les scanners de liens suivent tout),
 * POST qui désinscrit, idempotent.
 *
 * L'opposition vaut pour l'entreprise qui a écrit, pas pour les autres
 * clients : c'est elle que la page nomme.
 */

function verifyToken(prospectId: string, token: string): boolean {
  const secret = process.env.OUTREACH_UNSUBSCRIBE_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`agents:${prospectId.toLowerCase()}`)
    .digest("hex");
  const provided = Buffer.from(token, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  return provided.length === wanted.length && timingSafeEqual(provided, wanted);
}

function params(url: URL): { prospectId: string; token: string } {
  return {
    prospectId: url.searchParams.get("p") ?? "",
    token: url.searchParams.get("t") ?? "",
  };
}

/** Statuts d'où la désinscription retire le prospect du parcours. */
const OPEN_STATUSES = ["pending", "qualified", "no_email", "contacted", "interested"];

async function findProspect(prospectId: string) {
  const supabase = createAdminClient();
  const { data: prospect } = await supabase
    .from("agents_prospects")
    .select("id, user_id, email")
    .eq("id", prospectId)
    .maybeSingle();
  if (!prospect) return null;
  const { data: profile } = await supabase
    .from("agents_profiles")
    .select("company_name")
    .eq("user_id", prospect.user_id)
    .maybeSingle();
  return { ...prospect, company: profile?.company_name || "cette entreprise" };
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const PAGE_SHELL = (content: string) => `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Désinscription</title>
  </head>
  <body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#111010;color:#f4f1ea;font-family:system-ui,sans-serif">
    <main style="max-width:26rem;padding:2rem;text-align:center">${content}</main>
  </body>
</html>`;

const html = (content: string) =>
  new NextResponse(PAGE_SHELL(content), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });

/** Aucune mutation : affiche la confirmation dont le bouton POSTe. */
export async function GET(request: Request) {
  const { prospectId, token } = params(new URL(request.url));
  if (!prospectId || !verifyToken(prospectId, token)) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  }
  const prospect = await findProspect(prospectId);
  if (!prospect) return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  return html(`
      <h1 style="font-size:1.25rem;font-weight:600">Se désinscrire ?</h1>
      <p style="color:#b8b2a6;line-height:1.6">
        Confirmez pour ne plus recevoir d'e-mails de ${escapeHtml(prospect.company)}.
      </p>
      <form method="post" action="?p=${encodeURIComponent(prospectId)}&t=${encodeURIComponent(token)}">
        <button type="submit" style="cursor:pointer;border:0;border-radius:9999px;background:#f4f1ea;color:#111010;font-weight:600;padding:0.75rem 1.5rem">
          Confirmer la désinscription
        </button>
      </form>`);
}

/** Désinscription effective : bouton de la page GET et one-click RFC 8058. */
export async function POST(request: Request) {
  const { prospectId, token } = params(new URL(request.url));
  if (!prospectId || !verifyToken(prospectId, token)) {
    return new NextResponse(null, { status: 400 });
  }
  const prospect = await findProspect(prospectId);
  if (!prospect) return new NextResponse(null, { status: 400 });

  const supabase = createAdminClient();
  if (prospect.email) {
    await supabase.from("agents_suppressions").upsert(
      {
        user_id: prospect.user_id,
        email: prospect.email.toLowerCase(),
        reason: "opt_out",
        prospect_id: prospect.id,
      },
      { onConflict: "user_id,email", ignoreDuplicates: true }
    );
  }
  await supabase
    .from("agents_prospects")
    .update({ status: "not_interested" })
    .eq("id", prospect.id)
    .in("status", OPEN_STATUSES);

  return html(`
      <h1 style="font-size:1.25rem;font-weight:600">C'est noté.</h1>
      <p style="color:#b8b2a6;line-height:1.6">
        Vous ne recevrez plus d'e-mails de ${escapeHtml(prospect.company)}.
      </p>`);
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Désinscription de la prospection (lien CNIL en pied de chaque e-mail de
 * l'agent « Léa », + en-tête List-Unsubscribe one-click en POST, RFC 8058).
 *
 * Pas d'auth : le lien arrive dans la boîte du restaurateur. Le jeton HMAC
 * (généré côté backend Python avec le même secret) prouve que l'URL vient
 * bien de nous — impossible de désinscrire autrui en devinant un UUID.
 * Écriture via service_role : outreach_suppressions n'a aucune policy RLS.
 *
 * GET ne modifie RIEN : les scanners de liens (Safe Links, antivirus…)
 * suivent chaque URL d'un e-mail entrant, et un GET mutateur désinscrivait
 * silencieusement des restaurants qui n'avaient rien demandé. La page GET
 * affiche un bouton dont le POST effectue la désinscription — même chemin
 * que le one-click RFC 8058.
 *
 * Idempotent : redemander la désinscription répond toujours 200.
 */

function verifyToken(restaurantId: string, token: string): boolean {
  const secret = process.env.OUTREACH_UNSUBSCRIBE_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(restaurantId.toLowerCase())
    .digest("hex");
  const provided = Buffer.from(token, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  return provided.length === wanted.length && timingSafeEqual(provided, wanted);
}

function params(url: URL): { restaurantId: string; token: string } {
  return {
    restaurantId: url.searchParams.get("r") ?? "",
    token: url.searchParams.get("t") ?? "",
  };
}

/** Statuts encore automatiques : un lead déjà avancé à la main (visité,
 * RDV fixé…) n'est jamais régressé — la suppression d'envoi suffit. */
const LEAD_DEMOTABLE_FROM = [
  "new",
  "to_contact",
  "contacted",
  "interested",
] as const;

async function unsubscribe(url: URL): Promise<boolean> {
  const { restaurantId, token } = params(url);
  if (!restaurantId || !verifyToken(restaurantId, token)) return false;

  const supabase = createAdminClient();
  const { data: restaurant } = await supabase
    .from("crm_restaurants")
    .select("id, email")
    .eq("id", restaurantId)
    .maybeSingle();
  if (!restaurant) return false;

  if (restaurant.email) {
    await supabase.from("outreach_suppressions").upsert(
      {
        email: restaurant.email.toLowerCase(),
        reason: "opt_out",
        restaurant_id: restaurant.id,
      },
      { onConflict: "email", ignoreDuplicates: true }
    );
  }
  await supabase
    .from("crm_restaurants")
    .update({ outreach_opted_out_at: new Date().toISOString() })
    .eq("id", restaurant.id);
  await supabase
    .from("crm_leads")
    .update({ status: "not_interested" })
    .eq("restaurant_id", restaurant.id)
    .in("status", LEAD_DEMOTABLE_FROM);
  return true;
}

const PAGE_SHELL = (content: string) => `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Désinscription — Ominin</title>
  </head>
  <body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#111010;color:#f4f1ea;font-family:system-ui,sans-serif">
    <main style="max-width:26rem;padding:2rem;text-align:center">${content}</main>
  </body>
</html>`;

const confirmFormHtml = (restaurantId: string, token: string) =>
  PAGE_SHELL(`
      <h1 style="font-size:1.25rem;font-weight:600">Se désinscrire ?</h1>
      <p style="color:#b8b2a6;line-height:1.6">
        Confirmez pour ne plus recevoir d'e-mails de prospection d'Ominin.
      </p>
      <form method="post" action="?r=${encodeURIComponent(restaurantId)}&t=${encodeURIComponent(token)}">
        <button type="submit" style="cursor:pointer;border:0;border-radius:9999px;background:#f4f1ea;color:#111010;font-weight:600;padding:0.75rem 1.5rem">
          Confirmer la désinscription
        </button>
      </form>`);

const DONE_HTML = PAGE_SHELL(`
      <h1 style="font-size:1.25rem;font-weight:600">C'est noté.</h1>
      <p style="color:#b8b2a6;line-height:1.6">
        Vous ne recevrez plus d'e-mails de prospection de notre part.
      </p>`);

/** Aucune mutation : affiche la confirmation dont le bouton POSTe. */
export async function GET(request: Request) {
  const { restaurantId, token } = params(new URL(request.url));
  if (!restaurantId || !verifyToken(restaurantId, token)) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  }
  return new NextResponse(confirmFormHtml(restaurantId, token), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/** Désinscription effective : bouton de la page GET et one-click RFC 8058. */
export async function POST(request: Request) {
  const ok = await unsubscribe(new URL(request.url));
  if (!ok) return new NextResponse(null, { status: 400 });
  return new NextResponse(DONE_HTML, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

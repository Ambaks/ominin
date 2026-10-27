import { NextResponse } from "next/server";
import { kickHubrise } from "@/lib/hubrise/sync";
import { createClient } from "@/lib/supabase/server";

/*
 * L'équipe vient d'encaisser, de dire une commande prête ou de la remettre
 * dans l'espace — des écritures directes en base, que rien côté serveur ne
 * voit passer : la caisse HubRise du restaurant suit sans attendre le filet
 * du cron. Réservée à un compte connecté ; vider la file ne fait rien quand
 * rien n'y attend.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  kickHubrise();
  return NextResponse.json({ ok: true }, { status: 202 });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/*
 * Recherche Google Places d'un commercial (5.2). Chaque appel compte d'abord
 * dans le quota du jour du commercial (commercial_count_places, refusé sans
 * quota réglé) ; la recherche elle-même passe par le backend (POST
 * /places/search), qui tient la clé, la requête et le masque de champs de la
 * découverte de Léa — un seul endroit pour les trois.
 */
export async function POST(request: Request) {
  const backendUrl = process.env.BACKEND_URL;
  const secret = process.env.AGENT_TRIGGER_SECRET;
  if (!backendUrl || !secret) {
    return NextResponse.json({ error: "La recherche Google n'est pas configurée." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { query?: unknown } | null;
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) return NextResponse.json({ error: "Que cherchez-vous ?" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.rpc("commercial_count_places");
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  const response = await fetch(`${backendUrl}/places/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Agent-Secret": secret },
    body: JSON.stringify({ query }),
  }).catch(() => null);
  if (!response?.ok) {
    console.error("[commercial] Google Places", response?.status, await response?.text().catch(() => ""));
    return NextResponse.json({ error: "Google ne répond pas. Réessayez." }, { status: 502 });
  }
  return NextResponse.json(await response.json());
}

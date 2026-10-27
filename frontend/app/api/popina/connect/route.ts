import { after, NextResponse } from "next/server";
import { popinaApi, PopinaError } from "@/lib/popina/client";
import { reconcile } from "@/lib/popina/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGerant } from "@/lib/supabase/gerant";

/*
 * Connexion de la caisse Popina (ventes saisies sur la caisse → Ominin).
 * GET → statut, POST { apiKey } → la clé est vérifiée auprès de Popina, le
 * lieu enregistré et les ventes des dernières heures importées en arrière-
 * plan, DELETE → déconnexion. La clé ne repart jamais vers le navigateur.
 */

export async function GET() {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { data: connection, error } = await createAdminClient()
    .from("popina_connections")
    .select("location_name, last_failed_at, last_sale_at, reconciled_at")
    .eq("etablissement_id", auth.etablissementId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Statut illisible." }, { status: 500 });
  if (!connection) return NextResponse.json({ connected: false });
  return NextResponse.json({
    connected: true,
    blocked: connection.last_failed_at !== null,
    locationName: connection.location_name,
    lastSaleAt: connection.last_sale_at,
    reconciledAt: connection.reconciled_at,
  });
}

export async function POST(request: Request) {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { apiKey } = (await request.json().catch(() => ({}))) as { apiKey?: unknown };
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return NextResponse.json({ error: "Collez la clé d'API remise par Popina." }, { status: 400 });
  }

  let location: { id?: unknown; name?: unknown };
  try {
    location = await popinaApi(apiKey.trim(), "/v1/locations/own");
  } catch (error) {
    if (error instanceof PopinaError && error.status === 401) {
      return NextResponse.json({ error: "Popina ne reconnaît pas cette clé." }, { status: 400 });
    }
    console.error("[popina] vérification de clé en échec", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Popina ne répond pas, réessayez." }, { status: 502 });
  }

  if (typeof location.id !== "string") {
    console.error("[popina] lieu illisible", { location });
    return NextResponse.json({ error: "Popina a répondu sans lieu, réessayez." }, { status: 502 });
  }

  const admin = createAdminClient();
  const { data: connection, error } = await admin
    .from("popina_connections")
    .upsert({
      etablissement_id: auth.etablissementId,
      api_key: apiKey.trim(),
      location_id: location.id,
      location_name: typeof location.name === "string" ? location.name : null,
      connected_at: new Date().toISOString(),
      last_failed_at: null,
    })
    .select("*")
    .single();
  if (error) {
    const taken = error.code === "23505";
    if (!taken) console.error("[popina] connexion non enregistrée", { message: error.message });
    return NextResponse.json(
      {
        error: taken
          ? "Cette caisse est déjà reliée à un autre établissement."
          : "Connexion non enregistrée, réessayez.",
      },
      { status: taken ? 409 : 500 }
    );
  }

  // Les ventes des dernières heures, sans faire attendre le gérant ; un
  // échec ici n'empêche pas la connexion, le filet horaire reprendra.
  after(async () => {
    try {
      const failures = await reconcile(admin, connection);
      if (failures.length) console.error("[popina] première relecture incomplète", { failures });
    } catch (failure) {
      console.error("[popina] première relecture en échec", {
        message: failure instanceof Error ? failure.message : String(failure),
      });
    }
  });
  return NextResponse.json({ connected: true });
}

export async function DELETE() {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { error } = await createAdminClient()
    .from("popina_connections")
    .delete()
    .eq("etablissement_id", auth.etablissementId);
  if (error) {
    return NextResponse.json({ error: "Déconnexion impossible, réessayez." }, { status: 500 });
  }
  return NextResponse.json({ connected: false });
}

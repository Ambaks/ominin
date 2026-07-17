import { NextResponse } from "next/server";
import { requireClipUser } from "@/lib/clip/server";
import { isValidSourceUrl } from "@/lib/clip/vod/validation";
import { rowToJob } from "@/lib/clip/vod/types";

export async function POST(request: Request) {
  const auth = await requireClipUser();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const body = (await request.json().catch(() => null)) as {
    url?: string;
  } | null;
  const url = body?.url?.trim();
  if (!url || !isValidSourceUrl(url)) {
    return NextResponse.json({ error: "URL invalide." }, { status: 400 });
  }

  const { count } = await supabase
    .from("clipper_jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["en_attente", "en_cours"]);

  if ((count ?? 0) >= 1) {
    return NextResponse.json(
      { error: "Vous avez déjà un traitement en cours." },
      { status: 429 }
    );
  }

  const { data: job, error } = await supabase
    .from("clipper_jobs")
    .insert({ user_id: user.id, source_url: url })
    .select()
    .single();

  if (error || !job) {
    return NextResponse.json(
      { error: error?.message ?? "Échec de la création du job." },
      { status: 500 }
    );
  }

  return NextResponse.json(rowToJob(job));
}

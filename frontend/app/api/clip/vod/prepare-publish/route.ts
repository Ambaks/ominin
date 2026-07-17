import { NextResponse } from "next/server";
import { requireClipUser } from "@/lib/clip/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireClipUser();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const body = (await request.json().catch(() => null)) as {
    clipId?: string;
  } | null;

  if (!body?.clipId) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { data: clip } = await supabase
    .from("clipper_clips")
    .select("storage_path, job_id")
    .eq("id", body.clipId)
    .single();

  if (!clip?.storage_path) {
    return NextResponse.json(
      { error: "Clip introuvable." },
      { status: 404 }
    );
  }

  const admin = createAdminClient();

  const { data: downloaded, error: dlError } = await admin.storage
    .from("clipper-output")
    .download(clip.storage_path);

  if (dlError || !downloaded) {
    return NextResponse.json(
      { error: "Impossible de lire le clip." },
      { status: 500 }
    );
  }

  const dest = `${user.id}/${crypto.randomUUID()}.mp4`;
  const { error: uploadError } = await admin.storage
    .from("clips")
    .upload(dest, downloaded, { contentType: "video/mp4" });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ storagePath: dest });
}

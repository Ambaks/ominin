import { NextResponse } from "next/server";
import { requireClipUser } from "@/lib/clip/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rowToClip } from "@/lib/clip/vod/types";

const SIGNED_URL_TTL = 3600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireClipUser();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { id } = await params;

  const { data: job } = await supabase
    .from("clipper_jobs")
    .select("id")
    .eq("id", id)
    .single();

  if (!job) {
    return NextResponse.json(
      { error: "Job introuvable." },
      { status: 404 }
    );
  }

  const { data: rows, error } = await supabase
    .from("clipper_clips")
    .select("*")
    .eq("job_id", id)
    .order("rank");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const clips = (rows ?? []).map(rowToClip);
  const admin = createAdminClient();
  const playbackUrls: Record<string, string> = {};

  const paths = clips
    .map((clip) => clip.storagePath)
    .filter((p): p is string => p != null);

  if (paths.length > 0) {
    const { data: signed } = await admin.storage
      .from("clipper-output")
      .createSignedUrls(paths, SIGNED_URL_TTL);

    if (signed) {
      for (const entry of signed) {
        if (entry.signedUrl && entry.path) {
          const clip = clips.find((c) => c.storagePath === entry.path);
          if (clip) playbackUrls[clip.id] = entry.signedUrl;
        }
      }
    }
  }

  return NextResponse.json({ clips, playbackUrls });
}

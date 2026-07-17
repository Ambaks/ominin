import { NextResponse } from "next/server";
import { requireClipUser } from "@/lib/clip/server";
import { rowToJob } from "@/lib/clip/vod/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireClipUser();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { id } = await params;
  const { data, error } = await supabase
    .from("clipper_jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Job introuvable." },
      { status: 404 }
    );
  }

  return NextResponse.json(rowToJob(data));
}

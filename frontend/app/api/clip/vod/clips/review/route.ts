import { NextResponse } from "next/server";
import { requireClipUser } from "@/lib/clip/server";

export async function POST(request: Request) {
  const auth = await requireClipUser();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const body = (await request.json().catch(() => null)) as {
    clipId?: string;
    approved?: boolean;
  } | null;

  if (!body?.clipId || typeof body.approved !== "boolean") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { error } = await supabase
    .from("clipper_clips")
    .update({ approved: body.approved })
    .eq("id", body.clipId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

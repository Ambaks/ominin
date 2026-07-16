import { NextResponse } from "next/server";
import { ACCEPTED_VIDEO_TYPES, MAX_CLIP_BYTES } from "@/lib/clip/constants";
import { requireClipUser } from "@/lib/clip/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * URL d'upload signée vers le bucket privé « clips » : la vidéo part du
 * navigateur directement vers Supabase Storage (jamais par ce serveur — les
 * route handlers plafonnent le corps des requêtes bien sous la taille d'un
 * clip). Rangement sous <user_id>/<uuid>.<ext>, comme le bucket photos.
 */
export async function POST(request: Request) {
  const auth = await requireClipUser();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = (await request.json().catch(() => null)) as {
    fileType?: string;
    fileSize?: number;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const extension = body.fileType ? ACCEPTED_VIDEO_TYPES[body.fileType] : null;
  if (!extension) {
    return NextResponse.json(
      { error: "Format non supporté (MP4, MOV ou WebM)." },
      { status: 415 }
    );
  }
  if (
    typeof body.fileSize !== "number" ||
    body.fileSize <= 0 ||
    body.fileSize > MAX_CLIP_BYTES
  ) {
    return NextResponse.json(
      { error: "Ce clip dépasse 50 Mo. Compressez-le ou contactez-nous." },
      { status: 413 }
    );
  }

  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("clips")
    .createSignedUploadUrl(path);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ path, signedUrl: data.signedUrl });
}

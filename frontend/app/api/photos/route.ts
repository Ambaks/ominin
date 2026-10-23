import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGerant } from "@/lib/supabase/gerant";

/*
 * Upload des photos de plats vers le bucket public « photos ». L'écriture
 * passe par la clé service (aucune policy storage côté client) : la route
 * vérifie que l'appelant est gérant, puis range le fichier sous
 * <etablissement_id>/<uuid>.<ext>. Le bucket plafonne à 5 Mo et n'accepte
 * que jpeg/png/webp — le client compresse avant envoi.
 */

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const auth = await requireGerant("Seul le gérant peut modifier les photos du menu.");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }
  const extension = EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Format non supporté (JPEG, PNG ou WebP)." },
      { status: 415 }
    );
  }

  const path = `${auth.etablissementId}/${crypto.randomUUID()}.${extension}`;
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("photos")
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("photos").getPublicUrl(path);
  return NextResponse.json({ url: publicUrl });
}

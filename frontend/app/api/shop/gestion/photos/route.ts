import { NextResponse } from "next/server";
import { requireShopMember } from "@/lib/shop/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Photos produit d'une boutique → bucket public « shop-photos », sous
 * <shop_id>/<uuid>.<ext>. Écriture par la clé service après contrôle du
 * membre (convention du bucket photos des restaurants).
 */
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: Request) {
  const session = await requireShopMember();
  if (session instanceof NextResponse) return session;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  const extension = EXTENSIONS[file.type];
  if (!extension) return NextResponse.json({ error: "Format non supporté (JPEG, PNG ou WebP)." }, { status: 415 });

  const path = `${session.shop.id}/${crypto.randomUUID()}.${extension}`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from("shop-photos").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = admin.storage.from("shop-photos").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}

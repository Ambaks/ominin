import { NextResponse } from "next/server";
import { getShopBySlug } from "@/lib/shop/server";
import { parseEmail } from "@/lib/shop/validation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { slug?: string; email?: unknown };
  const email = parseEmail(body.email);
  if (typeof body.slug !== "string" || !email) return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  const shop = await getShopBySlug(body.slug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable." }, { status: 404 });
  const { error } = await createAdminClient()
    .from("shop_newsletter_subscribers")
    .upsert({ shop_id: shop.id, email, unsubscribed_at: null }, { onConflict: "shop_id,email" });
  if (error) return NextResponse.json({ error: "Impossible d'enregistrer ton adresse pour le moment." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

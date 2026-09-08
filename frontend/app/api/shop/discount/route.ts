import { NextResponse } from "next/server";
import { validateDiscountCode } from "@/lib/shop/checkout";
import { getShopBySlug } from "@/lib/shop/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Vérification d'un code promo au récapitulatif (le serveur revalide au paiement). */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { slug?: string; code?: string; subtotalCents?: number };
  if (typeof body.slug !== "string" || typeof body.code !== "string" || !Number.isInteger(body.subtotalCents)) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const shop = await getShopBySlug(body.slug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable." }, { status: 404 });
  const result = await validateDiscountCode(createAdminClient(), shop.id, body.code, body.subtotalCents as number);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ code: result.code, discountCents: result.discountCents, description: result.description });
}

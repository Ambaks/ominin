import { NextResponse } from "next/server";
import type { Product } from "@/lib/commercial/labels";
import { createClient } from "@/lib/supabase/server";

const PRODUCTS: readonly Product[] = ["menu", "collect", "shop"];

/*
 * Lien d'inscription d'un commercial (?c=) : rend le restaurant pour
 * pré-remplir le tunnel et, si le gérant est connecté, rattache le lien à
 * son compte — c'est ce rattachement qui, à l'acceptation des CGV, en fait le
 * Client Apporté du commercial. Le jeton seul est la preuve : la base n'en
 * garde que l'empreinte. Un refus (lien d'un autre compte, compte commercial
 * ou admin) revient avec son motif, affiché dans le tunnel.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; product?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const product = PRODUCTS.find((entry) => entry === body?.product);
  if (!token || !product) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: info, error } = await supabase.rpc("signup_link_info", { p_token: token });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!info) return NextResponse.json({ info: null, claimed: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ info, claimed: false });
  const { data: claimed, error: claimError } = await supabase.rpc("signup_link_claim", {
    p_token: token,
    p_product: product,
  });
  if (claimError) return NextResponse.json({ info, error: claimError.message }, { status: 409 });
  return NextResponse.json({ info, claimed });
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import {
  ExistingAccountError,
  normalizeEmail,
  sendAccessLink,
} from "@/lib/commercial/access";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Invitation d'un commercial : la fiche, puis le lien d'accès. Rappeler la
 * route pour une adresse déjà invitée renvoie un lien — rédigé en invitation
 * tant que le contrat n'est pas signé (l'identité n'est écrite qu'à la
 * signature), en simple connexion ensuite.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!email) {
    return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }

  const admin = createAdminClient();
  const columns = "id, email, user_id, first_name";
  const { data: existing, error } = await admin
    .from("commerciaux")
    .select(columns)
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  let commercial = existing;
  if (!commercial) {
    const { data: created, error: insertError } = await admin
      .from("commerciaux")
      .insert({ email })
      .select(columns)
      .single();
    if (insertError) throw new Error(insertError.message);
    commercial = created;
  }

  try {
    await sendAccessLink(admin, commercial, commercial.first_name ? "connexion" : "invitation");
  } catch (cause) {
    if (cause instanceof ExistingAccountError) {
      // Une fiche créée pour cette invitation refusée ne mènerait à rien.
      if (!existing) await admin.from("commerciaux").delete().eq("id", commercial.id);
      return NextResponse.json({ error: cause.message }, { status: 409 });
    }
    console.error("[commercial] invitation non envoyée", { email, cause });
    return NextResponse.json(
      {
        error: `Fiche enregistrée, mais l'e-mail n'est pas parti : ${
          cause instanceof Error ? cause.message : String(cause)
        }`,
      },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}

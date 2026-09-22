import { NextResponse } from "next/server";
import { revokeToken } from "@/lib/agents/google";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Déconnexion : révoque l'accès chez Google puis supprime la boîte (le jeton
 * suit par cascade). L'agent cesse de lire et d'envoyer dès le passage
 * suivant ; l'historique des e-mails reste consultable.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: token } = await admin
    .from("agents_mailbox_tokens")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();
  if (token) await revokeToken(token.refresh_token);

  const { error } = await admin.from("agents_mailboxes").delete().eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "Déconnexion impossible." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

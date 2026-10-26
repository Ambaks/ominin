import { NextResponse } from "next/server";
import { sendInviteEmail } from "@/lib/gestion/invite-notify";
import { rateLimit } from "@/lib/rate-limit/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Role = Database["public"]["Enums"]["member_role"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentification requise." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    role?: Role;
    etablissement_id?: string;
  } | null;
  if (!body?.email || !body.role || !body.etablissement_id) {
    return NextResponse.json(
      { error: "Champs requis : email, role, etablissement_id." },
      { status: 400 },
    );
  }

  const email = body.email.trim().toLowerCase();
  const { role, etablissement_id } = body;

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("etablissement_id", etablissement_id)
    .maybeSingle();
  if (!membership || membership.role !== "gerant") {
    return NextResponse.json(
      { error: "Seul le gérant peut inviter des membres." },
      { status: 403 },
    );
  }
  const limited = await rateLimit("teamInvite", user.id);
  if (limited) return limited;

  const { data: etablissement } = await supabase
    .from("etablissements")
    .select("name")
    .eq("id", etablissement_id)
    .single();
  if (!etablissement) {
    return NextResponse.json(
      { error: "Établissement introuvable." },
      { status: 404 },
    );
  }

  const admin = createAdminClient();

  const { data: invitation, error: insertError } = await admin
    .from("invitations")
    .insert({ etablissement_id, email, role })
    .select("token")
    .single();
  if (insertError) {
    const isDuplicate =
      insertError.code === "23505" ||
      insertError.message.includes("duplicate");
    return NextResponse.json(
      {
        error: isDuplicate
          ? "Une invitation existe déjà pour cette adresse."
          : insertError.message,
      },
      { status: 409 },
    );
  }

  const requestUrl = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ?? requestUrl.host;
  const origin = `${requestUrl.protocol}//${host}`;

  /*
   * Le compte de l'invité est ouvert ici, déjà confirmé : un compte en
   * attente de confirmation se laisse prendre par une simple inscription
   * publique, le projet confirmant les e-mails d'office. Le lien envoyé est
   * un lien magique — il prouve l'accès à la boîte — et porte le jeton de
   * l'invitation, sans lequel /menu/invitation n'accepte rien
   * (accept_invitation).
   */
  try {
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (created.error && created.error.code !== "email_exists") {
      throw created.error;
    }

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${origin}/auth/callback` },
      });
    if (linkError) throw linkError;

    const verifyUrl = new URL(`${origin}/auth/callback`);
    verifyUrl.search = new URLSearchParams({
      token_hash: linkData.properties.hashed_token,
      type: "email",
      next: `/menu/invitation?token=${invitation.token}`,
    }).toString();
    await sendInviteEmail(email, etablissement.name, role, verifyUrl.toString());
  } catch (emailError) {
    console.error("Invitation email error:", emailError);
    const reason =
      emailError instanceof Error ? emailError.message : "Erreur inconnue";
    return NextResponse.json({
      invited: true,
      email_sent: false,
      email_error: reason,
    });
  }

  return NextResponse.json({ invited: true, email_sent: true });
}

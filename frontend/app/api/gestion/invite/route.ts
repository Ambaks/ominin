import { NextResponse } from "next/server";
import { sendInviteEmail, sendTeamNotification } from "@/lib/gestion/invite-notify";
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

  const { error: insertError } = await admin
    .from("invitations")
    .insert({ etablissement_id, email, role });
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

  const { data: pending } = await admin
    .from("invitations")
    .select("id")
    .eq("etablissement_id", etablissement_id)
    .eq("email", email)
    .maybeSingle();

  try {
    if (pending) {
      const { data: linkData, error: linkError } =
        await admin.auth.admin.generateLink({
          type: "invite",
          email,
          options: { redirectTo: `${origin}/auth/callback` },
        });
      if (linkError) throw linkError;

      const verifyUrl = `${origin}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=invite&next=/invitation`;
      await sendInviteEmail(email, etablissement.name, role, verifyUrl);
    } else {
      await sendTeamNotification(
        email,
        etablissement.name,
        role,
        `${origin}/connexion`,
      );
    }
  } catch (emailError) {
    console.error("Invitation email error:", emailError);
    const reason =
      emailError instanceof Error ? emailError.message : "Erreur inconnue";
    return NextResponse.json({
      invited: true,
      existing_user: !pending,
      email_sent: false,
      email_error: reason,
    });
  }

  return NextResponse.json({
    invited: true,
    existing_user: !pending,
    email_sent: true,
  });
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvitationForm } from "./invitation-form";

export default async function InvitationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, etablissement_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/connexion");

  const { data: etablissement } = await supabase
    .from("etablissements")
    .select("name")
    .eq("id", membership.etablissement_id)
    .single();

  return (
    <InvitationForm
      restaurantName={etablissement?.name ?? "votre restaurant"}
      role={membership.role}
    />
  );
}

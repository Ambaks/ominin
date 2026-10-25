import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { InvitationForm, InvitationNotice } from "./invitation-form";

/*
 * Acceptation d'une invitation d'équipe. On n'arrive ici que par le lien de
 * l'e-mail : la session prouve l'accès à la boîte, le jeton désigne
 * l'invitation. Elle se lit au service_role — l'invité n'est pas encore
 * membre, la RLS ne lui montre rien — et accept_invitation revérifie tout.
 */
export default async function InvitationPage({
  searchParams,
}: PageProps<"/menu/invitation">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/menu/connexion");

  const { token } = await searchParams;
  const { data: invitation } =
    typeof token === "string"
      ? await createAdminClient()
          .from("invitations")
          .select("email, role, etablissements(name)")
          .eq("token", token)
          .maybeSingle()
      : { data: null };

  if (!invitation) {
    return (
      <InvitationNotice title="Invitation introuvable">
        Elle a peut-être déjà été acceptée ou annulée. Si vous faites déjà
        partie de l&rsquo;équipe, connectez-vous ; sinon, demandez au gérant de
        vous inviter de nouveau.
      </InvitationNotice>
    );
  }
  if (invitation.email !== user.email.toLowerCase()) {
    return (
      <InvitationNotice title="Mauvais compte">
        Cette invitation a été envoyée à {invitation.email}. Ouvrez le lien
        reçu à cette adresse.
      </InvitationNotice>
    );
  }

  return (
    <InvitationForm
      token={token as string}
      restaurantName={invitation.etablissements?.name ?? "votre restaurant"}
      role={invitation.role}
    />
  );
}

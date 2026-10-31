import type { Metadata } from "next";
import {
  ExpiredLinkNotice,
  NewPasswordForm,
} from "@/components/auth/password-reset";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Nouveau mot de passe — Ominin",
  robots: { index: false, follow: false },
};

/*
 * On n'arrive ici que par le lien de l'e-mail : /auth/callback a posé la
 * session, qui prouve l'accès à la boîte. Sans session, le lien a expiré.
 */
export default async function NouveauMotDePassePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return <ExpiredLinkNotice />;
  return <NewPasswordForm email={user.email} />;
}

import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { commercialOrigin, commercialPrefix } from "@/lib/site";
import { sendAccessEmail } from "./mail";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Adresse saisie, en minuscules, ou null. Ni espace ni séparateur d'adresses :
 * elle finit dans les en-têtes To/Reply-To de lib/gmail.ts.
 */
export function normalizeEmail(raw: unknown): string | null {
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return /^[^\s@,;:<>"()[\]\\]+@[^\s@,;:<>"()[\]\\]+\.[^\s@,;:<>"()[\]\\]+$/.test(email)
    ? email
    : null;
}

/** L'adresse a déjà un compte Ominin qui n'a pas été créé pour un commercial. */
export class ExistingAccountError extends Error {
  constructor(email: string) {
    super(
      `${email} a déjà un compte Ominin, ouvert hors de l'espace commercial : par sécurité, il ne peut pas y être rattaché. Invitez une autre adresse du commercial.`
    );
    this.name = "ExistingAccountError";
  }
}

/*
 * Compte de la fiche. Il est créé ici, d'un seul appel, déjà confirmé, sans
 * mot de passe et marqué « commercial » (app_metadata, que seul le
 * service_role écrit) : on n'y entre que par un lien envoyé à l'adresse.
 * Jamais de compte en attente de confirmation — une inscription publique sur
 * l'adresse d'un compte non confirmé en ouvre la session tant que le projet
 * confirme les e-mails d'office. Un compte non marqué à la même adresse a pu
 * être ouvert par n'importe qui : jamais confirmé ni invité, il est supprimé ;
 * sinon on refuse.
 */
async function commercialAccount(admin: Admin, email: string): Promise<string> {
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { commercial: true },
  });
  if (!created.error) return created.data.user.id;

  // « email_exists », ou une erreur sans code quand deux invitations créent le
  // même compte au même instant : dans les deux cas, l'état réel tranche.
  const { data, error } = await admin.rpc("auth_account_state", { p_email: email });
  if (error) throw new Error(error.message);
  const [account] = data;
  if (!account) throw created.error;
  if (account.commercial) return account.id;
  if (account.confirmed || account.invited) throw new ExistingAccountError(email);

  const { error: deleteError } = await admin.auth.admin.deleteUser(account.id);
  if (deleteError) throw deleteError;
  const retried = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { commercial: true },
  });
  // Un nouveau compte est réapparu entre la suppression et la création : on
  // ne boucle pas, l'admin relance.
  if (retried.error) throw new Error("Un compte vient d'être ouvert à cette adresse : réessayez.");
  return retried.data.user.id;
}

/**
 * Rattache une connexion Google à la fiche invitée à cette adresse, encore
 * sans compte, et marque le compte « commercial » : les liens envoyés ensuite
 * le reconnaissent. Sans invitation, rien n'est ouvert.
 */
export async function linkGoogleCommercial(user: User) {
  if (!user.email || !user.app_metadata.providers?.includes("google")) return;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("commerciaux")
    .update({ user_id: user.id })
    .eq("email", user.email.toLowerCase())
    .is("user_id", null)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data.length) return;
  const { error: markError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { commercial: true },
  });
  if (markError) throw markError;
}

/**
 * Lien de connexion à l'espace, envoyé par notre Gmail plutôt que par
 * l'e-mail de Supabase. `kind` ne change que le texte de l'e-mail.
 */
export async function sendAccessLink(
  admin: Admin,
  commercial: { id: string; email: string; user_id: string | null },
  kind: "invitation" | "connexion"
) {
  const userId = await commercialAccount(admin, commercial.email);
  if (userId !== commercial.user_id) {
    const { error } = await admin
      .from("commerciaux")
      .update({ user_id: userId })
      .eq("id", commercial.id);
    if (error) throw new Error(error.message);
  }

  const redirectTo = `${commercialOrigin}/auth/callback`;
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: commercial.email,
    options: { redirectTo },
  });
  if (link.error) throw link.error;

  const url = new URL(redirectTo);
  url.search = new URLSearchParams({
    token_hash: link.data.properties.hashed_token,
    type: "email",
    next: `${commercialPrefix}/espace`,
  }).toString();
  await sendAccessEmail(commercial.email, kind, url.toString());
}

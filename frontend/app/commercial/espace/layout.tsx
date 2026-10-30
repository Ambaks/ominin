import { redirect } from "next/navigation";
import { ContactLink, ContractToSign, Notice } from "@/components/commercial/contract";
import { CommercialShell } from "@/components/commercial/shell";
import { CodeForm } from "@/components/commercial/space/code-form";
import { SpaceShell } from "@/components/commercial/space/shell";
import { commercialPrefix } from "@/lib/site";
import { commercialAccount } from "@/lib/commercial/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/*
 * Garde de l'espace (le proxy la double) : un compte invité qui n'a encore
 * signé aucune version ne voit que le contrat à signer ; signé, il entre dans
 * l'outil. Le compte se lit par commercial_account(), rattaché à la session,
 * jamais par l'adresse e-mail. Après la fin du contrat, les écrans de travail
 * renvoient vers Argent (requireRunningContract).
 */
export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect(`${commercialPrefix}/connexion`);
  const email = user.email.toLowerCase();

  const account = await commercialAccount();

  if (!account) {
    return (
      <CommercialShell email={email}>
        <Notice title="Espace réservé">
          Cet espace est réservé aux commerciaux invités par Ominin. Si vous
          pensez qu’il s’agit d’une erreur, écrivez-nous à <ContactLink />.
        </Notice>
      </CommercialShell>
    );
  }
  // Entré par un lien : le code à 6 chiffres d'abord, pour se connecter depuis l'application installée.
  if (!user.app_metadata.providers?.includes("google") && !user.user_metadata.commercial_code_set) {
    return (
      <CommercialShell email={email}>
        <div className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-hairline bg-surface p-6">
          <div>
            <h1 className="font-display text-xl font-medium">Choisis ton code</h1>
            <p className="mt-1 text-sm text-muted">Tu te connecteras avec ton e-mail et ce code, notamment depuis l’application sur ton téléphone.</p>
          </div>
          <CodeForm submitLabel="Valider mon code" />
        </div>
      </CommercialShell>
    );
  }
  if (!account.signed) {
    return (
      <CommercialShell email={email}>
        <ContractToSign admin={createAdminClient()} commercial={account} signature={null} />
      </CommercialShell>
    );
  }
  return <SpaceShell account={account}>{children}</SpaceShell>;
}

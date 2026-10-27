import { ContractToSign, Signed } from "@/components/commercial/contract";
import { AccountPanel } from "@/components/commercial/space/account";
import { Documents } from "@/components/commercial/space/money";
import { Notifications } from "@/components/commercial/space/notifications";
import { commercialAccount } from "@/lib/commercial/session";
import { latestCommercialSignature } from "@/lib/legal/commercial";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Compte : identité, contrat signé, nouvelle version à signer, résiliation. */
export default async function ComptePage() {
  const account = (await commercialAccount())!;
  const admin = createAdminClient();
  const signature = await latestCommercialSignature(admin, account.id);

  return (
    <div className="flex flex-col gap-8">
      <AccountPanel />
      <Documents />
      {!account.ended && <Notifications />}
      {!account.signed_in_force && !account.ended && (
        <section className="rounded-2xl border border-ember-2/30 bg-surface p-5">
          <ContractToSign admin={admin} commercial={account} signature={signature} />
        </section>
      )}
      {signature && <Signed signature={signature} />}
    </div>
  );
}

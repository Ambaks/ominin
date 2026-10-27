import { redirect } from "next/navigation";
import { cache } from "react";
import { commercialPrefix } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import type { CommercialAccount } from "./api";

/** La fiche du commercial connecté (commercial_account), lue une fois par rendu. */
export const commercialAccount = cache(async (): Promise<CommercialAccount | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("commercial_account");
  if (error) throw new Error(error.message);
  return data as unknown as CommercialAccount | null;
});

/**
 * Écrans de travail (restaurants, kit, clients) : après la fin du contrat, il
 * ne reste que l'argent, les relevés et le contrat (art. 8) — direction Argent.
 */
export async function requireRunningContract(): Promise<CommercialAccount> {
  const account = await commercialAccount();
  if (!account || account.ended) redirect(`${commercialPrefix}/espace/argent`);
  return account;
}

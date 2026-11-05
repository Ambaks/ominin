import { formatVendeur } from "@/lib/bulles/format";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

export type BulleCheckout = ({ provider: "demo" } | { provider: "square"; locationId: string }) & {
  /** « Vendu par … », dit au-dessus du paiement (formatVendeur). */
  vendeur: string | null;
};

/**
 * Le restaurant peut-il encaisser une place en ligne ? Démonstration, ou
 * Square activé avec un point de vente et un compte relié — la caisse du
 * menu, avec la même commission. Vérifié avant de tenir une place : sinon le client
 * remplirait le formulaire pour se heurter au paiement.
 */
export async function bulleCheckout(admin: Admin, etablissementId: string): Promise<BulleCheckout | null> {
  const [{ data: etab }, { data: account }] = await Promise.all([
    admin
      .from("etablissements")
      .select("payment_provider, online_payment, square_location_id, raison_sociale, siret")
      .eq("id", etablissementId)
      .maybeSingle(),
    admin
      .from("square_accounts")
      .select("etablissement_id")
      .eq("etablissement_id", etablissementId)
      .maybeSingle(),
  ]);
  const vendeur = etab ? formatVendeur(etab.raison_sociale, etab.siret) : null;
  if (etab?.payment_provider === "demo") return { provider: "demo", vendeur };
  if (
    etab?.payment_provider === "square" &&
    etab.online_payment &&
    etab.square_location_id &&
    account
  ) {
    return { provider: "square", locationId: etab.square_location_id, vendeur };
  }
  return null;
}

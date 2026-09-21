import { planTrial } from "@/lib/landing-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { offreTrialEnd } from "./trial";

/**
 * Rend le verdict des mois offerts s'il est dû : true ⇒ abonnement à 0 €
 * acquis, false ⇒ mensualités dues, null ⇒ rien à trancher (offre sans mois
 * offerts, ou mois encore en cours). Le verdict est définitif : une remise se
 * corrige à la main en base.
 */
export async function settleOffreTrial(
  etablissementId: string
): Promise<boolean | null> {
  const db = createAdminClient();
  const { data: row, error } = await db
    .from("subscriptions")
    .select("trial_started_at, fee_exempt")
    .eq("etablissement_id", etablissementId)
    .eq("product", "offre")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row?.trial_started_at) return null;
  if (row.fee_exempt !== null) return row.fee_exempt;

  const { data: etablissement, error: etablissementError } = await db
    .from("etablissements")
    .select("offre")
    .eq("id", etablissementId)
    .single();
  if (etablissementError) throw new Error(etablissementError.message);
  // Offre dépubliée depuis : plus de seuil à opposer au restaurant.
  const trial = planTrial(etablissement.offre);
  const endsAt = offreTrialEnd(etablissement.offre, row.trial_started_at);
  if (!trial || !endsAt || Date.now() < endsAt.getTime()) return null;

  const { data: revenue, error: revenueError } = await db.rpc(
    "offre_trial_revenue",
    {
      p_etablissement_id: etablissementId,
      p_from: row.trial_started_at,
      p_to: endsAt.toISOString(),
    }
  );
  if (revenueError) throw new Error(revenueError.message);

  const feeExempt = (revenue ?? 0) >= trial.exemptionRevenue;
  const { error: writeError } = await db
    .from("subscriptions")
    .update({ fee_exempt: feeExempt, updated_at: new Date().toISOString() })
    .eq("etablissement_id", etablissementId)
    .eq("product", "offre")
    // Deux onglets peuvent demander le verdict en même temps : le premier
    // écrit, le second ne réécrit rien (même calcul, même résultat).
    .is("fee_exempt", null);
  if (writeError) throw new Error(writeError.message);
  return feeExempt;
}

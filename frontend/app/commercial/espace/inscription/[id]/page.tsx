import { notFound } from "next/navigation";
import { SignupLaunch } from "@/components/commercial/space/signup-launch";
import { requireRunningContract } from "@/lib/commercial/session";
import { createClient } from "@/lib/supabase/server";

/* ?qr=1 : l'écran de suivi reste ouvert quand on recharge la page. */
export default async function LancerInscriptionPage({ params, searchParams }: PageProps<"/commercial/espace/inscription/[id]">) {
  await requireRunningContract();
  const [{ id }, { qr }] = await Promise.all([params, searchParams]);
  const { data: place, error } = await (await createClient()).rpc("commercial_map", { p_restaurant: id }).maybeSingle();
  if (error) throw new Error(error.message);
  if (!place) notFound();
  return <SignupLaunch restaurantId={place.id} restaurantName={place.name} following={qr === "1"} />;
}

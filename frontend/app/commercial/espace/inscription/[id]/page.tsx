import { notFound } from "next/navigation";
import { SignupLaunch } from "@/components/commercial/space/signup-launch";
import { requireRunningContract } from "@/lib/commercial/session";
import { createClient } from "@/lib/supabase/server";

export default async function LancerInscriptionPage({ params }: PageProps<"/commercial/espace/inscription/[id]">) {
  await requireRunningContract();
  const { id } = await params;
  const { data: place, error } = await (await createClient()).rpc("commercial_map", { p_restaurant: id }).maybeSingle();
  if (error) throw new Error(error.message);
  if (!place) notFound();
  return <SignupLaunch restaurantId={place.id} restaurantName={place.name} />;
}

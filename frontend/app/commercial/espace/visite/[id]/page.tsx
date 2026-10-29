import { notFound } from "next/navigation";
import { VisitScreen } from "@/components/commercial/space/visit";
import type { MapRestaurant } from "@/lib/commercial/api";
import { requireRunningContract } from "@/lib/commercial/session";
import { createClient } from "@/lib/supabase/server";

export default async function VisitePage({ params }: PageProps<"/commercial/espace/visite/[id]">) {
  await requireRunningContract();
  const { id } = await params;
  const { data: place, error } = await (await createClient()).rpc("commercial_map", { p_restaurant: id }).maybeSingle();
  if (error) throw new Error(error.message);
  if (!place) notFound();
  return <VisitScreen place={place as MapRestaurant} />;
}

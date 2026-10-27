import { NewRestaurantScreen } from "@/components/commercial/space/new-restaurant";
import { requireRunningContract } from "@/lib/commercial/session";

export default async function NouveauRestaurantPage({
  searchParams,
}: PageProps<"/commercial/espace/restaurants/nouveau">) {
  await requireRunningContract();
  const { nom } = await searchParams;
  return <NewRestaurantScreen initialName={typeof nom === "string" ? nom : ""} />;
}

import { RestaurantScreen } from "@/components/commercial/space/restaurant";
import { requireRunningContract } from "@/lib/commercial/session";

export default async function RestaurantPage({ params }: PageProps<"/commercial/espace/restaurants/[id]">) {
  await requireRunningContract();
  const { id } = await params;
  return <RestaurantScreen id={id} />;
}

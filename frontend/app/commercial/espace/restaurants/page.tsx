import { RestaurantsScreen } from "@/components/commercial/space/restaurants";
import { requireRunningContract } from "@/lib/commercial/session";

export default async function RestaurantsPage() {
  await requireRunningContract();
  return <RestaurantsScreen />;
}

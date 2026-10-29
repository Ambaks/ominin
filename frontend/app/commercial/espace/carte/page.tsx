import { MapScreen } from "@/components/commercial/space/map";
import { requireRunningContract } from "@/lib/commercial/session";

export default async function CartePage() {
  await requireRunningContract();
  return <MapScreen />;
}

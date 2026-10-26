import { NearbyScreen } from "@/components/commercial/space/nearby";
import { requireRunningContract } from "@/lib/commercial/session";

export default async function AutourPage() {
  await requireRunningContract();
  return <NearbyScreen />;
}

import { TodayScreen } from "@/components/commercial/space/today";
import { requireRunningContract } from "@/lib/commercial/session";

export default async function AujourdhuiPage() {
  await requireRunningContract();
  return <TodayScreen />;
}

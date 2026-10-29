import { DashboardScreen } from "@/components/commercial/space/dashboard";
import { requireRunningContract } from "@/lib/commercial/session";

export default async function TableauPage() {
  await requireRunningContract();
  return <DashboardScreen />;
}

import { redirect } from "next/navigation";
import { commercialPrefix } from "@/lib/site";

export default function EspacePage() {
  redirect(`${commercialPrefix}/espace/tableau`);
}

import { redirect } from "next/navigation";
import { DEMO_SLUG } from "@/lib/menu-data";

export default function Home() {
  redirect(`/m/${DEMO_SLUG}`);
}

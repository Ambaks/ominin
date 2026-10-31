import BulleLayout from "@/app/menu/w/[slug]/bulle/layout";
import { demoParams } from "@/lib/bulles/demo-params";
import { BOHO_THEME_COLOR } from "@/lib/sites/boho";

/* Les pages des bulles de la démonstration, dans la même DA que celles d'un établissement. */
export const viewport = { themeColor: BOHO_THEME_COLOR, colorScheme: "dark" as const };

export default function DemoBulleLayout(props: LayoutProps<"/menu/demo/[slug]/bulle">) {
  return BulleLayout({ ...props, params: demoParams(props.params) });
}

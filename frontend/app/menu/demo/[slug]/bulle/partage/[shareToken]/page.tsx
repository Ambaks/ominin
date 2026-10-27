import BullePartagePage from "@/app/menu/m/[slug]/bulle/partage/[shareToken]/page";
import { demoParams } from "@/lib/bulles/demo-params";

export { metadata } from "@/app/menu/m/[slug]/bulle/partage/[shareToken]/page";

/* Les places se prennent pendant qu'on lit la page : relu à chaque visite. */
export const dynamic = "force-dynamic";

export default function DemoPartagePage(props: PageProps<"/menu/demo/[slug]/bulle/partage/[shareToken]">) {
  return BullePartagePage({ ...props, params: demoParams(props.params) });
}

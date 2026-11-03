import BulleTablePage from "@/app/menu/w/[slug]/bulle/table/[table]/page";
import { demoParams } from "@/lib/bulles/demo-params";

export { metadata } from "@/app/menu/w/[slug]/bulle/table/[table]/page";

/* Payer le reste depuis la table d'une bulle : relu à chaque visite. */
export const dynamic = "force-dynamic";

export default function DemoBulleTablePage(props: PageProps<"/menu/demo/[slug]/bulle/table/[table]">) {
  return BulleTablePage({ ...props, params: demoParams(props.params) });
}

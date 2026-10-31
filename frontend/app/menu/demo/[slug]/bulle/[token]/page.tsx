import BulleReservationPage from "@/app/menu/w/[slug]/bulle/[token]/page";
import { demoParams } from "@/lib/bulles/demo-params";

export { metadata } from "@/app/menu/w/[slug]/bulle/[token]/page";

/* Le statut change sans l'organisateur : relu à chaque visite, comme hors démo. */
export const dynamic = "force-dynamic";

export default function DemoReservationPage(props: PageProps<"/menu/demo/[slug]/bulle/[token]">) {
  return BulleReservationPage({ ...props, params: demoParams(props.params) });
}

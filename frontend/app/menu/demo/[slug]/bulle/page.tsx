import type { Metadata } from "next";
import BullePage, { generateMetadata as bulleMetadata } from "@/app/menu/m/[slug]/bulle/page";
import { demoParams } from "@/lib/bulles/demo-params";

/* Réserver une bulle sur la démonstration : paiement de démonstration, aucun débit. */
export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata(props: PageProps<"/menu/demo/[slug]/bulle">): Promise<Metadata> {
  return bulleMetadata({ ...props, params: demoParams(props.params) });
}

export default function DemoBullePage(props: PageProps<"/menu/demo/[slug]/bulle">) {
  return BullePage({ ...props, params: demoParams(props.params) });
}

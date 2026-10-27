import type { Metadata, Viewport } from "next";
import MenuPage, {
  generateMetadata as menuMetadata,
  generateViewport as menuViewport,
} from "@/app/menu/m/[slug]/page";
import { demoParams } from "@/lib/bulles/demo-params";

/*
 * La carte de la démonstration des bulles : le menu QR de boho-demo, en
 * direct. Avec ?table=<n> d'une bulle, la commande reste fermée tant qu'une
 * réservation payée en entier n'a pas commencé.
 */
export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata(props: PageProps<"/menu/demo/[slug]/carte">): Promise<Metadata> {
  const metadata = await menuMetadata({ ...props, params: demoParams(props.params) });
  return { ...metadata, robots: { index: false, follow: false } };
}

export async function generateViewport(props: PageProps<"/menu/demo/[slug]/carte">): Promise<Viewport> {
  return menuViewport({ ...props, params: demoParams(props.params) });
}

export default function DemoCartePage(props: PageProps<"/menu/demo/[slug]/carte">) {
  return MenuPage({ ...props, params: demoParams(props.params) });
}

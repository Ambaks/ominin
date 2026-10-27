import type { Metadata } from "next";
import BohoSitePage, { generateMetadata as siteMetadata } from "@/app/menu/m/[slug]/site/page";
import { demoParams } from "@/lib/bulles/demo-params";
import { BOHO_THEME_COLOR } from "@/lib/sites/boho";

/* Le site du Boho sur sa démonstration (lib/bulles/demo) : la page /m/<slug>/site, sur boho-demo. */
export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

export const viewport = { themeColor: BOHO_THEME_COLOR, colorScheme: "dark" as const };

export async function generateMetadata(props: PageProps<"/menu/demo/[slug]/site">): Promise<Metadata> {
  return siteMetadata({ ...props, params: demoParams(props.params) });
}

export default function DemoSitePage(props: PageProps<"/menu/demo/[slug]/site">) {
  return BohoSitePage({ ...props, params: demoParams(props.params) });
}

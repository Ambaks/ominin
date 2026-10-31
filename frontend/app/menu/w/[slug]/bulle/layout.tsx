import type { Viewport } from "next";
import { KilimMark } from "@/components/sites/boho/marks";
import { bohoFontVariables } from "@/lib/menu/brand-fonts";
import { BOHO_THEME_COLOR } from "@/lib/sites/boho";
import { isSiteOpen } from "@/lib/sites/public";
import { carteUrl, siteUrlOf } from "@/lib/bulles/links";
import "@/components/sites/boho/boho.css";
import "@/components/sites/boho/bulles.css";

/*
 * Les pages des bulles (réserver, suivre sa réservation, payer sa place par
 * le lien d'un ami) portent la DA du Boho, le seul établissement qui en
 * propose. Le nom ramène à son site, ou à défaut à sa carte.
 */
export const viewport: Viewport = {
  themeColor: BOHO_THEME_COLOR,
  colorScheme: "dark",
};

export default async function BulleLayout({ children, params }: LayoutProps<"/menu/w/[slug]/bulle">) {
  const { slug } = await params;
  const home = (await isSiteOpen(slug)) ? siteUrlOf(slug) : carteUrl(slug);
  return (
    <div className={`bo-site bo-bulle-site ${bohoFontVariables}`}>
      <header className="bo-header bo-header--plain">
        <a href={home} className="bo-brand" aria-label="Retour au site">
          <KilimMark className="bo-brand-mark" />
          <span>BOHO</span>
        </a>
      </header>
      <main className="bo-bulle-main">{children}</main>
    </div>
  );
}

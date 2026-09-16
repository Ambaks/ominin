import type { Metadata } from "next";
import { ShopGestionShell } from "@/components/shop/gestion/shell";
import { FONT_VARIABLES, shopThemeStyle } from "@/lib/shop/fonts";
import { countToPrepare, countUnread, requireShopSession } from "@/lib/shop/server";
import { resolveTheme } from "@/lib/shop/theme";
import "../shop-store.css";

/*
 * Espace de gestion d'une boutique, habillé du thème de cette boutique : même
 * palette et mêmes polices que son site public. La gérante passe de sa
 * vitrine à son arrière-boutique sans changer d'univers, et une boutique dont
 * la palette change se règle d'un seul endroit, ses réglages.
 *
 * Les écrans de gestion restent écrits avec les jetons d'Ominin (surface,
 * hairline, ember…) : c'est `.shop-gestion-root` qui les redéfinit à partir
 * de la palette, dans shop-store.css. Rien à reprendre écran par écran, et un
 * écran ajouté demain suivra sans rien demander.
 */

export const metadata: Metadata = {
  title: "Espace de gestion — Ominin Shop",
  robots: { index: false, follow: false },
};

export default async function ShopGestionLayout({ children }: LayoutProps<"/shop/gestion">) {
  const session = await requireShopSession();
  const [toPrepare, unread] = await Promise.all([
    countToPrepare(session.shop.id),
    countUnread(session.shop.id),
  ]);
  const theme = resolveTheme(session.shop.theme);

  return (
    <div
      className={`shop-gestion-root ${FONT_VARIABLES}`}
      style={shopThemeStyle(theme.palette, theme.fonts)}
    >
      <ShopGestionShell
        shopName={session.shop.name}
        shopSlug={session.shop.slug}
        role={session.role}
        counts={{ toPrepare, unread }}
      >
        {children}
      </ShopGestionShell>
    </div>
  );
}

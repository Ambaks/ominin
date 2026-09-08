import type { Metadata } from "next";
import { ShopGestionShell } from "@/components/shop/gestion/shell";
import { countToPrepare, countUnread, requireShopSession } from "@/lib/shop/server";

export const metadata: Metadata = { title: "Espace de gestion — Ominin Shop", robots: { index: false, follow: false } };

export default async function ShopGestionLayout({ children }: LayoutProps<"/shop/gestion">) {
  const session = await requireShopSession();
  const [toPrepare, unread] = await Promise.all([countToPrepare(session.shop.id), countUnread(session.shop.id)]);
  return (
    <ShopGestionShell shopName={session.shop.name} shopSlug={session.shop.slug} role={session.role} counts={{ toPrepare, unread }}>
      {children}
    </ShopGestionShell>
  );
}

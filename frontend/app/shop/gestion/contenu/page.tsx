import { FaqManager } from "@/components/shop/gestion/managers";
import { PageHeader } from "@/components/shop/gestion/page-header";
import { SettingsForm } from "@/components/shop/gestion/settings";
import { getAllFaq, requireShopSession } from "@/lib/shop/server";

export default async function ShopContentPage() {
  const { shop } = await requireShopSession();
  const faq = await getAllFaq(shop.id);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Contenu" description="Textes des pages À propos, FAQ, livraison et pages légales." />
      <FaqManager shopId={shop.id} items={faq} />
      <SettingsForm shop={shop} section="texts" />
    </div>
  );
}

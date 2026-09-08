import { redirect } from "next/navigation";
import { DiscountManager } from "@/components/shop/gestion/managers";
import { PageHeader } from "@/components/shop/gestion/page-header";
import { getDiscountCodes, requireShopSession } from "@/lib/shop/server";

export default async function ShopDiscountsPage() {
  const { shop, role } = await requireShopSession();
  if (role !== "proprietaire") redirect("/gestion");
  const codes = await getDiscountCodes(shop.id);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Codes promo" description="Saisis par la cliente dans le récapitulatif de commande." />
      <DiscountManager shopId={shop.id} codes={codes} />
    </div>
  );
}

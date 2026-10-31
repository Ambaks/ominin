import { CustomersList } from "@/components/shop/gestion/customers-list";
import { PageHeader } from "@/components/shop/gestion/page-header";
import { formatPrice } from "@/lib/shop/format";
import { getCustomerTotals, requireShopSession } from "@/lib/shop/server";

export default async function ShopCustomersPage() {
  const { shop } = await requireShopSession();
  const { customers, revenueCents } = await getCustomerTotals(shop.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        description={`${customers} cliente${customers > 1 ? "s" : ""} · ${formatPrice(revenueCents)} de ventes cumulées`}
      />
      <CustomersList shopId={shop.id} />
    </div>
  );
}

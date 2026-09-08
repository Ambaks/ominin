import Link from "next/link";
import { ShippingManager } from "@/components/shop/gestion/managers";
import { OrdersTable } from "@/components/shop/gestion/orders-table";
import { PageHeader } from "@/components/shop/gestion/page-header";
import { getAllShippingMethods, listOrders, requireShopSession } from "@/lib/shop/server";

export default async function ShopShippingPage() {
  const { shop } = await requireShopSession();
  const [methods, { orders }] = await Promise.all([getAllShippingMethods(shop.id), listOrders(shop.id, { status: "to_prepare" })]);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Livraisons" description="Les modes proposés à la commande et les colis à préparer." />
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-medium">Modes de livraison</h2>
        <ShippingManager shopId={shop.id} methods={methods} shopThreshold={shop.free_shipping_threshold_cents} />
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-medium">À préparer et expédier ({orders.length})</h2>
          <Link href="/gestion/commandes?statut=to_prepare" className="text-xs font-medium text-ember-1">
            Voir dans les commandes
          </Link>
        </div>
        <OrdersTable orders={orders} emptyLabel="Rien à expédier pour le moment." />
      </section>
    </div>
  );
}

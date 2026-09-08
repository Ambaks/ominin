import Link from "next/link";
import { OrdersTable } from "@/components/shop/gestion/orders-table";
import { PageHeader, secondaryButton } from "@/components/shop/gestion/page-header";
import { ORDERS_PAGE_SIZE, ORDER_STATUS_LABELS } from "@/lib/shop/constants";
import { countOrdersByStatus, listOrders, requireShopSession } from "@/lib/shop/server";
import type { ShopOrderStatus } from "@/lib/shop/types";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "to_prepare", label: "À préparer" },
  ...(["paid", "preparing", "shipped", "delivered", "cancelled", "refunded"] as ShopOrderStatus[]).map((s) => ({ key: s, label: ORDER_STATUS_LABELS[s] })),
];

export default async function ShopOrdersPage({ searchParams }: PageProps<"/shop/gestion/commandes">) {
  const { shop } = await requireShopSession();
  const params = await searchParams;
  const status = (typeof params.statut === "string" ? params.statut : "all") as ShopOrderStatus | "all" | "to_prepare";
  const q = typeof params.q === "string" ? params.q : undefined;
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const [{ orders, total }, counts] = await Promise.all([listOrders(shop.id, { status, q, page }), countOrdersByStatus(shop.id)]);
  const pages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));

  const href = (patch: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ statut: params.statut, q, ...patch })) if (typeof v === "string" && v) sp.set(k, v);
    const s = sp.toString();
    return `/gestion/commandes${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Commandes" description={`${total} commande${total > 1 ? "s" : ""}${q ? ` pour « ${q} »` : ""}`} />
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = status === f.key;
          const count = f.key === "to_prepare" ? (counts.paid ?? 0) + (counts.preparing ?? 0) : counts[f.key];
          return (
            <Link key={f.key} href={href({ statut: f.key === "all" ? undefined : f.key, page: undefined })} className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${active ? "ember-gradient text-background" : "border border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"}`}>
              {f.label}
              {count != null && f.key !== "all" && <span className="ml-1.5 text-[10px] opacity-70">{count}</span>}
            </Link>
          );
        })}
        <form method="get" className="ml-auto">
          {params.statut && <input type="hidden" name="statut" value={String(params.statut)} />}
          <input name="q" defaultValue={q ?? ""} placeholder="N°, nom ou e-mail" className="h-9 w-56 rounded-full border border-hairline bg-background px-4 text-sm outline-none placeholder:text-faint focus:border-ember-2/50" />
        </form>
      </div>
      <OrdersTable orders={orders} emptyLabel="Aucune commande ne correspond." />
      {pages > 1 && (
        <nav className="flex items-center justify-between text-xs text-muted" aria-label="Pagination">
          <span>
            Page {page} sur {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={href({ page: String(page - 1) })} className={secondaryButton}>
                Précédente
              </Link>
            )}
            {page < pages && (
              <Link href={href({ page: String(page + 1) })} className={secondaryButton}>
                Suivante
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

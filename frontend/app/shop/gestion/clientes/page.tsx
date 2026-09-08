import Link from "next/link";
import { PageHeader, TableShell, td, th } from "@/components/shop/gestion/page-header";
import { formatDate, formatPrice } from "@/lib/shop/format";
import { listCustomers, requireShopSession } from "@/lib/shop/server";

export default async function ShopCustomersPage({ searchParams }: PageProps<"/shop/gestion/clientes">) {
  const { shop } = await requireShopSession();
  const { q } = await searchParams;
  const needle = typeof q === "string" ? q.trim().toLowerCase() : "";
  const all = await listCustomers(shop.id);
  const customers = needle ? all.filter((c) => (c.email ?? "").includes(needle) || (c.name ?? "").toLowerCase().includes(needle)) : all;
  const revenue = all.reduce((s, c) => s + Number(c.total_spent_cents ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        description={`${all.length} cliente${all.length > 1 ? "s" : ""} · ${formatPrice(revenue)} de ventes cumulées`}
        actions={
          <form method="get">
            <input name="q" defaultValue={needle} placeholder="Nom ou e-mail" className="h-9 w-56 rounded-full border border-hairline bg-background px-4 text-sm outline-none placeholder:text-faint focus:border-ember-2/50" />
          </form>
        }
      />
      <TableShell>
        <thead>
          <tr>
            <th className={th}>Cliente</th>
            <th className={th}>Commandes</th>
            <th className={`${th} text-right`}>Total dépensé</th>
            <th className={th}>Première commande</th>
            <th className={th}>Dernière commande</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {customers.length === 0 && (
            <tr>
              <td colSpan={6} className={`${td} py-10 text-center text-muted`}>
                Aucune cliente pour le moment.
              </td>
            </tr>
          )}
          {customers.map((c) => (
            <tr key={c.email}>
              <td className={td}>
                <span className="block font-medium">{c.name}</span>
                <span className="block text-xs text-muted">{c.email}</span>
              </td>
              <td className={td}>{c.orders_count}</td>
              <td className={`${td} text-right font-semibold tabular-nums`}>{formatPrice(Number(c.total_spent_cents ?? 0))}</td>
              <td className={`${td} text-muted`}>{c.first_order_at ? formatDate(c.first_order_at) : "—"}</td>
              <td className={`${td} text-muted`}>{c.last_order_at ? formatDate(c.last_order_at) : "—"}</td>
              <td className={`${td} text-right`}>
                <Link href={`/gestion/commandes?q=${encodeURIComponent(c.email ?? "")}`} className="text-xs font-medium text-ember-1">
                  Ses commandes
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </TableShell>
    </div>
  );
}

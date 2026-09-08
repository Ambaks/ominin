import Link from "next/link";
import { OrdersTable } from "@/components/shop/gestion/orders-table";
import { Card, KpiCard, PageHeader, primaryButton } from "@/components/shop/gestion/page-header";
import { SalesChart } from "@/components/shop/gestion/sales-chart";
import { DASHBOARD_CHART_DAYS, DASHBOARD_KPI_DAYS } from "@/lib/shop/constants";
import { formatPrice, formatRelative, initials } from "@/lib/shop/format";
import { getDashboardStats, listConversations, requireShopSession } from "@/lib/shop/server";

export default async function ShopDashboardPage() {
  const { shop } = await requireShopSession();
  const [stats, conversations] = await Promise.all([getDashboardStats(shop.id), listConversations(shop.id, "open")]);
  const trend = stats.revenuePrevious > 0 ? Math.round(((stats.revenue - stats.revenuePrevious) / stats.revenuePrevious) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Aperçu"
        description={`Les ${DASHBOARD_KPI_DAYS} derniers jours`}
        actions={
          <Link href="/gestion/produits/nouveau" className={primaryButton}>
            + Nouveau produit
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Ventes" value={formatPrice(stats.revenue)} hint={trend != null ? `${trend >= 0 ? "+" : ""}${trend} % vs période précédente` : `${stats.ordersCount} commande${stats.ordersCount > 1 ? "s" : ""}`} />
        <KpiCard label="À préparer" value={String(stats.toPrepare)} hint="commandes payées en attente" />
        <KpiCard label="Panier moyen" value={stats.averageBasket ? formatPrice(stats.averageBasket) : "—"} hint={`${stats.ordersCount} commande${stats.ordersCount > 1 ? "s" : ""}`} />
        <KpiCard label="Messages non lus" value={String(stats.unreadMessages)} hint={conversations[0] ? `dernier reçu ${formatRelative(conversations[0].last_message_at)}` : "aucun message"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card title={`Ventes des ${DASHBOARD_CHART_DAYS} derniers jours`} description="Montant encaissé par jour, TTC">
          <SalesChart data={stats.salesByDay} />
        </Card>
        <Card
          title="Messages"
          action={
            <Link href="/gestion/messages" className="text-xs font-medium text-ember-1">
              Tout voir
            </Link>
          }
        >
          {conversations.length === 0 ? (
            <p className="py-4 text-sm text-muted">Aucune conversation ouverte.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-hairline">
              {conversations.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <Link href={`/gestion/messages/${c.id}`} className="flex items-start gap-3 py-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[11px] font-semibold text-ember-1">{initials(c.customer_name ?? c.customer_email)}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={`truncate text-sm ${c.unread_shop ? "font-semibold" : ""}`}>{c.customer_name ?? c.customer_email}</span>
                      <span className="truncate text-xs text-muted">{c.subject ?? "Conversation"}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-faint">{formatRelative(c.last_message_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card
        title="Commandes récentes"
        action={
          <Link href="/gestion/commandes" className="text-xs font-medium text-ember-1">
            Toutes les commandes
          </Link>
        }
      >
        <OrdersTable orders={stats.recentOrders} emptyLabel="Aucune commande pour le moment. Elles apparaîtront ici dès le premier paiement." />
      </Card>

      {stats.lowStock.length > 0 && (
        <p className="rounded-2xl border border-ember-2/40 bg-ember-2/10 px-5 py-4 text-sm">
          <span className="font-semibold">Stock faible : </span>
          {stats.lowStock.map((p, i) => (
            <span key={p.id}>
              <Link href={`/gestion/produits/${p.id}`} className="underline-offset-2 hover:underline">
                {p.name} ({p.stock})
              </Link>
              {i < stats.lowStock.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

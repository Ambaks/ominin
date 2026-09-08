import Link from "next/link";
import { ORDER_STATUS_LABELS, SHIPPING_KIND_LABELS } from "@/lib/shop/constants";
import { formatDateTime, formatPrice, fullName } from "@/lib/shop/format";
import type { OrderItemOption, OrderWithItems, ShopOrderStatus } from "@/lib/shop/types";
import { TableShell, td, th } from "./page-header";

const STATUS_DOT: Record<ShopOrderStatus, string> = {
  pending: "bg-faint",
  paid: "bg-ember-1",
  preparing: "bg-ember-2",
  shipped: "bg-status-to-contact",
  delivered: "bg-status-signed",
  cancelled: "bg-faint",
  refunded: "bg-ember-3",
};

export function OrderStatusBadge({ status }: { status: ShopOrderStatus }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-hairline px-2.5 py-1 text-xs font-medium">
      <span className={`size-1.5 rounded-full ${STATUS_DOT[status]}`} />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function OrdersTable({ orders, emptyLabel = "Aucune commande." }: { orders: OrderWithItems[]; emptyLabel?: string }) {
  if (orders.length === 0) return <p className="rounded-2xl border border-dashed border-hairline px-5 py-10 text-center text-sm text-muted">{emptyLabel}</p>;
  return (
    <TableShell>
      <thead>
        <tr>
          <th className={th}>N°</th>
          <th className={th}>Date</th>
          <th className={th}>Cliente</th>
          <th className={th}>Contenu</th>
          <th className={th}>Livraison</th>
          <th className={th}>Statut</th>
          <th className={`${th} text-right`}>Total</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id} className="transition-colors hover:bg-surface-raised">
            <td className={`${td} whitespace-nowrap font-semibold`}>
              <Link href={`/gestion/commandes/${o.id}`} className="hover:text-ember-1">
                {o.order_number}
              </Link>
            </td>
            <td className={`${td} whitespace-nowrap text-muted`}>{formatDateTime(o.created_at)}</td>
            <td className={td}>
              <span className="block">{fullName(o.first_name, o.last_name) || "—"}</span>
              <span className="block text-xs text-muted">{o.email}</span>
            </td>
            <td className={`${td} max-w-[260px] text-muted`}>
              <span className="line-clamp-2">
                {o.shop_order_items
                  .map((i) => {
                    const options = (i.options as OrderItemOption[] | null) ?? [];
                    return `${i.quantity > 1 ? `${i.quantity} × ` : ""}${i.product_name}${options.length ? ` (${options.map((op) => op.value).join(", ")})` : ""}`;
                  })
                  .join(" · ")}
              </span>
            </td>
            <td className={`${td} text-muted`}>
              <span className="block">{o.shipping_method_name ?? "—"}</span>
              {o.shipping_kind && <span className="block text-xs text-faint">{SHIPPING_KIND_LABELS[o.shipping_kind]}</span>}
            </td>
            <td className={td}>
              <OrderStatusBadge status={o.status} />
            </td>
            <td className={`${td} text-right font-semibold tabular-nums`}>{formatPrice(o.total_cents)}</td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

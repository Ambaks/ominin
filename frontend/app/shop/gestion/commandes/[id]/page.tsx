import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderActions } from "@/components/shop/gestion/order-actions";
import { OrderStatusBadge } from "@/components/shop/gestion/orders-table";
import { Card, PageHeader } from "@/components/shop/gestion/page-header";
import { PAYMENT_STATUS_LABELS, SHIPPING_KIND_LABELS } from "@/lib/shop/constants";
import { countryName, formatDateTime, formatPrice, fullName } from "@/lib/shop/format";
import { getOrder, requireShopSession } from "@/lib/shop/server";
import type { Address, OrderItemOption, RelayPoint } from "@/lib/shop/types";

export default async function ShopOrderPage({ params }: PageProps<"/shop/gestion/commandes/[id]">) {
  const { id } = await params;
  const { shop, role } = await requireShopSession();
  const order = await getOrder(shop.id, id);
  if (!order) notFound();
  const address = order.shipping_address as unknown as Address | null;
  const relay = order.relay_point as unknown as RelayPoint | null;
  const billing = order.billing_address as unknown as Address | null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/gestion/commandes", label: "Toutes les commandes" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {order.order_number}
            <OrderStatusBadge status={order.status} />
            <span className="rounded-full border border-hairline px-2.5 py-1 text-xs font-medium text-muted">{PAYMENT_STATUS_LABELS[order.payment_status]}</span>
          </span>
        }
        description={`Passée le ${formatDateTime(order.created_at)}${order.paid_at ? ` · payée le ${formatDateTime(order.paid_at)}` : ""}`}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px] xl:items-start">
        <div className="flex flex-col gap-6">
          <Card title="Contenu">
            <ul className="flex flex-col divide-y divide-hairline">
              {order.shop_order_items.map((item) => {
                const options = (item.options as OrderItemOption[] | null) ?? [];
                return (
                  <li key={item.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                    <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-surface-raised">{item.image_url && <img src={item.image_url} alt="" className="size-full object-cover" />}</span>
                    <span className="flex flex-1 flex-col text-sm">
                      <span className="font-medium">{item.product_name}</span>
                      {options.map((o) => (
                        <span key={o.label + o.value} className="text-xs text-muted">
                          {o.label} : {o.value}
                        </span>
                      ))}
                      <span className="text-xs text-muted">
                        {item.quantity} × {formatPrice(item.unit_price_cents)}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{formatPrice(item.total_cents)}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-5 flex flex-col gap-1.5 border-t border-hairline pt-4 text-sm text-muted">
              <div className="flex justify-between">
                <dt>Sous-total</dt>
                <dd className="text-foreground">{formatPrice(order.subtotal_cents)}</dd>
              </div>
              {order.discount_cents > 0 && (
                <div className="flex justify-between">
                  <dt>Réduction {order.discount_code}</dt>
                  <dd>- {formatPrice(order.discount_cents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>Livraison</dt>
                <dd className="text-foreground">{order.shipping_cents ? formatPrice(order.shipping_cents) : "Offerte"}</dd>
              </div>
              <div className="flex justify-between border-t border-hairline pt-2 text-base font-semibold text-foreground">
                <dt>Total</dt>
                <dd>{formatPrice(order.total_cents)}</dd>
              </div>
              {order.platform_fee_cents > 0 && (
                <div className="flex justify-between text-xs">
                  <dt>Commission plateforme</dt>
                  <dd>{formatPrice(order.platform_fee_cents)}</dd>
                </div>
              )}
            </dl>
          </Card>

          {(order.is_gift || order.gift_message || order.customer_note) && (
            <Card title="Attentions particulières" className="border-ember-2/40">
              <div className="flex flex-col gap-3 text-sm">
                {order.is_gift && <p className="font-medium text-ember-1">Commande cadeau : ne pas mettre de prix dans le colis.</p>}
                {order.gift_message && (
                  <div className="rounded-xl bg-surface-raised px-4 py-3">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-faint">Mot doux à glisser</span>
                    <p className="mt-1 whitespace-pre-line italic">« {order.gift_message} »</p>
                  </div>
                )}
                {order.customer_note && (
                  <div className="rounded-xl bg-surface-raised px-4 py-3">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-faint">Note de la cliente</span>
                    <p className="mt-1 whitespace-pre-line">{order.customer_note}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card title="Historique">
            <ol className="flex flex-col gap-3">
              {order.shop_order_events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ember-2" />
                  <span className="flex flex-col">
                    <span>{e.message ?? e.type}</span>
                    <span className="text-xs text-faint">{formatDateTime(e.created_at)}</span>
                  </span>
                </li>
              ))}
              {order.shop_order_events.length === 0 && <li className="text-sm text-muted">Aucun événement.</li>}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Actions">
            <OrderActions order={order} role={role} />
          </Card>
          <Card title="Cliente">
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">{fullName(order.first_name, order.last_name) || "—"}</span>
              <a href={`mailto:${order.email}`} className="text-ember-1 hover:underline">
                {order.email}
              </a>
              {order.phone && <a href={`tel:${order.phone.replace(/\s/g, "")}`}>{order.phone}</a>}
              <Link href={`/gestion/commandes?q=${encodeURIComponent(order.email)}`} className="mt-2 text-xs font-medium text-ember-1">
                Voir ses commandes
              </Link>
            </div>
          </Card>
          <Card title="Livraison" description={order.shipping_kind ? `${order.shipping_method_name ?? ""} · ${SHIPPING_KIND_LABELS[order.shipping_kind]}` : undefined}>
            <div className="flex flex-col gap-3 text-sm text-muted">
              {order.shipping_kind === "relay" && relay ? (
                <address className="not-italic leading-relaxed">
                  <span className="block font-medium text-foreground">{relay.name}</span>
                  {relay.address}
                  <br />
                  {relay.postal_code} {relay.city}
                  {relay.code && (
                    <>
                      <br />
                      Code : {relay.code}
                    </>
                  )}
                </address>
              ) : address ? (
                <address className="not-italic leading-relaxed">
                  {address.line1}
                  {address.line2 && (
                    <>
                      <br />
                      {address.line2}
                    </>
                  )}
                  <br />
                  {address.postal_code} {address.city}, {countryName(address.country)}
                </address>
              ) : (
                <p>Remise en main propre.</p>
              )}
              {billing && order.shipping_kind !== "home" && (
                <address className="not-italic leading-relaxed">
                  <span className="block font-medium text-foreground">Facturation</span>
                  {billing.line1}
                  <br />
                  {billing.postal_code} {billing.city}, {countryName(billing.country)}
                </address>
              )}
              {order.tracking_number && (
                <p>
                  <span className="font-medium text-foreground">Suivi :</span>{" "}
                  {order.tracking_url ? (
                    <a href={order.tracking_url} target="_blank" rel="noreferrer" className="text-ember-1 hover:underline">
                      {order.tracking_number}
                    </a>
                  ) : (
                    order.tracking_number
                  )}
                  {order.carrier && ` · ${order.carrier}`}
                </p>
              )}
            </div>
          </Card>
          {order.stripe_payment_intent_id && (
            <Card title="Paiement">
              <p className="text-xs text-muted">
                Stripe ·{" "}
                <a href={`https://dashboard.stripe.com/payments/${order.stripe_payment_intent_id}`} target="_blank" rel="noreferrer" className="font-mono text-ember-1 hover:underline">
                  {order.stripe_payment_intent_id}
                </a>
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

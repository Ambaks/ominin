import { SHIPPING_KIND_LABELS } from "@/lib/shop/constants";
import { countryName, formatDate, formatDateTime, formatPrice, fullName } from "@/lib/shop/format";
import type { Address, OrderItemOption, OrderWithItems, RelayPoint, ShopOrder, ShopOrderEvent, ShopOrderStatus } from "@/lib/shop/types";
import { CheckIcon, GiftIcon } from "../icons";
import { PaymentPill, StatusPill } from "./ui";

/* Récapitulatif d'une commande, partagé entre confirmation, suivi, espace cliente et gestion. */

export function OrderItemsList({ order }: { order: OrderWithItems }) {
  return (
    <ul className="flex flex-col divide-y divide-shop-line-soft">
      {order.shop_order_items.map((item) => {
        const options = (item.options as OrderItemOption[] | null) ?? [];
        return (
          <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
            <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-shop-tint">
              {item.image_url ? (
                <img src={item.image_url} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-shop-accent-soft">
                  <GiftIcon className="size-6" strokeWidth={1.3} />
                </span>
              )}
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="font-shop-display text-lg text-shop-ink">{item.product_name}</span>
              {options.map((o) => (
                <span key={o.label + o.value} className="text-xs text-shop-ink-soft">
                  {o.label} : <span className="text-shop-ink">{o.value}</span>
                </span>
              ))}
              <span className="text-xs text-shop-ink-soft">
                {item.quantity} × {formatPrice(item.unit_price_cents)}
              </span>
            </span>
            <span className="text-sm font-semibold">{formatPrice(item.total_cents)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function OrderTotals({ order }: { order: ShopOrder }) {
  return (
    <dl className="flex flex-col gap-2 text-sm text-shop-ink-soft">
      <div className="flex justify-between">
        <dt>Sous-total</dt>
        <dd className="text-shop-ink">{formatPrice(order.subtotal_cents)}</dd>
      </div>
      {order.discount_cents > 0 && (
        <div className="flex justify-between">
          <dt>Réduction{order.discount_code ? ` (${order.discount_code})` : ""}</dt>
          <dd className="text-shop-ok">- {formatPrice(order.discount_cents)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt>Livraison{order.shipping_method_name ? ` · ${order.shipping_method_name}` : ""}</dt>
        <dd className={order.shipping_cents === 0 ? "text-shop-ok" : "text-shop-ink"}>{order.shipping_cents === 0 ? "Offerte" : formatPrice(order.shipping_cents)}</dd>
      </div>
      <div className="flex justify-between border-t border-shop-line pt-3 text-base font-semibold text-shop-ink">
        <dt>Total</dt>
        <dd>{formatPrice(order.total_cents)}</dd>
      </div>
    </dl>
  );
}

export function OrderShippingBlock({ order }: { order: ShopOrder }) {
  const name = fullName(order.first_name, order.last_name);
  if (order.shipping_kind === "pickup") return <p className="text-sm leading-relaxed text-shop-ink-soft">Remise en main propre : nous convenons ensemble d&apos;un créneau.</p>;
  if (order.shipping_kind === "relay" && order.relay_point) {
    const r = order.relay_point as unknown as RelayPoint;
    return (
      <address className="text-sm not-italic leading-relaxed text-shop-ink-soft">
        <span className="block font-semibold text-shop-ink">{name}</span>
        <span className="block font-medium text-shop-ink">{r.name}</span>
        {r.address}
        <br />
        {r.postal_code} {r.city}
        {r.code && (
          <>
            <br />
            Code : {r.code}
          </>
        )}
      </address>
    );
  }
  const a = order.shipping_address as unknown as Address | null;
  if (!a) return null;
  return (
    <address className="text-sm not-italic leading-relaxed text-shop-ink-soft">
      <span className="block font-semibold text-shop-ink">{name}</span>
      {a.line1}
      {a.line2 && (
        <>
          <br />
          {a.line2}
        </>
      )}
      <br />
      {a.postal_code} {a.city}
      <br />
      {countryName(a.country)}
    </address>
  );
}

export function OrderCard({ order }: { order: OrderWithItems }) {
  return (
    <div className="flex flex-col gap-6 rounded-[24px] border border-shop-line bg-shop-paper p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="shop-label text-[10px] text-shop-ink-soft">Commande</span>
          <span className="font-shop-display text-2xl text-shop-ink">{order.order_number}</span>
          <span className="text-xs text-shop-ink-soft">Passée le {formatDate(order.created_at)}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill status={order.status} />
          <PaymentPill status={order.payment_status} />
        </div>
      </div>
      <OrderItemsList order={order} />
      <div className="grid gap-6 border-t border-shop-line pt-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="shop-label text-[10px] text-shop-ink-soft">{order.shipping_kind ? SHIPPING_KIND_LABELS[order.shipping_kind] : "Livraison"}</span>
          <OrderShippingBlock order={order} />
          {order.tracking_number && (
            <p className="text-sm text-shop-ink-soft">
              Suivi :{" "}
              {order.tracking_url ? (
                <a href={order.tracking_url} target="_blank" rel="noreferrer" className="font-medium text-shop-accent-deep underline-offset-2 hover:underline">
                  {order.tracking_number}
                </a>
              ) : (
                <span className="font-medium text-shop-ink">{order.tracking_number}</span>
              )}
              {order.carrier ? ` · ${order.carrier}` : ""}
            </p>
          )}
        </div>
        <OrderTotals order={order} />
      </div>
      {order.gift_message && (
        <p className="rounded-2xl bg-shop-tint px-4 py-3 text-sm italic leading-relaxed text-shop-accent-deep">« {order.gift_message} »</p>
      )}
    </div>
  );
}

const STEPS: { status: ShopOrderStatus; label: string; hint: string }[] = [
  { status: "paid", label: "Confirmée", hint: "Paiement reçu" },
  { status: "preparing", label: "En préparation", hint: "Préparée à la main" },
  { status: "shipped", label: "Expédiée", hint: "Confiée au transporteur" },
  { status: "delivered", label: "Livrée", hint: "Bonne réception" },
];
const ORDER: ShopOrderStatus[] = ["paid", "preparing", "shipped", "delivered"];

export function OrderTimeline({ order, events }: { order: ShopOrder; events?: ShopOrderEvent[] }) {
  if (order.status === "cancelled" || order.status === "refunded") {
    return (
      <div className="flex flex-col gap-2">
        <StatusPill status={order.status} className="w-fit" />
        <p className="text-sm text-shop-ink-soft">{order.status === "cancelled" ? "Cette commande a été annulée." : "Cette commande a été remboursée."} Une question ? Écris-nous.</p>
      </div>
    );
  }
  const current = ORDER.indexOf(order.status);
  const dates: Partial<Record<ShopOrderStatus, string | null>> = { paid: order.paid_at, shipped: order.shipped_at, delivered: order.delivered_at };
  return (
    <div className="flex flex-col gap-6">
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((step, i) => {
          const done = i <= current;
          const active = i === current;
          return (
            <li key={step.status} className="flex flex-col items-center gap-2 text-center">
              <span className={`flex size-9 items-center justify-center rounded-full border-[1.5px] text-xs font-semibold ${done ? "border-shop-accent bg-shop-accent text-shop-paper" : "border-shop-ink-faint text-shop-ink-mute"} ${active ? "ring-4 ring-shop-accent/20" : ""}`}>
                {done ? <CheckIcon className="size-4" strokeWidth={2.4} /> : i + 1}
              </span>
              <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${done ? "text-shop-ink" : "text-shop-ink-mute"}`}>{step.label}</span>
              <span className="hidden text-[11px] text-shop-ink-soft sm:block">{dates[step.status] ? formatDate(dates[step.status] as string) : step.hint}</span>
            </li>
          );
        })}
      </ol>
      {events && events.length > 0 && (
        <details className="group text-xs text-shop-ink-soft">
          <summary className="cursor-pointer font-medium text-shop-accent-deep">Historique détaillé</summary>
          <ul className="mt-3 flex flex-col gap-1.5">
            {events
              .filter((e) => e.type !== "email" && e.type !== "alert")
              .map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="w-28 shrink-0 text-shop-ink-mute">{formatDateTime(e.created_at)}</span>
                  <span>{e.message ?? e.type}</span>
                </li>
              ))}
          </ul>
        </details>
      )}
    </div>
  );
}

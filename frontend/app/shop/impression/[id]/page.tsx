import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/shop/gestion/print-button";
import { SHIPPING_KIND_LABELS } from "@/lib/shop/constants";
import { countryName, formatDate } from "@/lib/shop/format";
import { getOrder, getShopSession } from "@/lib/shop/server";
import type { Address, OrderItemOption, RelayPoint } from "@/lib/shop/types";

export const metadata: Metadata = { title: "Bon de préparation", robots: { index: false } };

/** Bon de préparation imprimable, hors coquille de gestion (page blanche). */
export default async function PackingSlipPage({ params }: PageProps<"/shop/impression/[id]">) {
  const { id } = await params;
  const session = await getShopSession();
  if (!session) redirect("/connexion");
  const order = await getOrder(session.shop.id, id);
  if (!order) notFound();
  const a = order.shipping_address as unknown as Address | null;
  const r = order.relay_point as unknown as RelayPoint | null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 bg-white px-8 py-10 text-[#222] print:max-w-none print:px-0" style={{ colorScheme: "light" }}>
      <div className="flex justify-end print:hidden">
        <PrintButton />
      </div>
      <header className="flex items-start justify-between border-b border-[#ddd] pb-6">
        <div>
          <p className="font-display text-2xl font-semibold">{session.shop.name}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#777]">Bon de préparation</p>
        </div>
        <div className="text-right text-sm">
          <span className="block font-display text-2xl">{order.order_number}</span>
          <span className="block text-[#777]">{formatDate(order.created_at)}</span>
        </div>
      </header>
      <section className="grid grid-cols-2 gap-8 text-sm">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#777]">Destinataire</span>
          <span className="font-semibold">
            {order.first_name} {order.last_name}
          </span>
          {order.shipping_kind === "relay" && r ? (
            <>
              <span>Point relais : {r.name}</span>
              <span>{r.address}</span>
              <span>
                {r.postal_code} {r.city}
              </span>
              {r.code && <span>Code : {r.code}</span>}
            </>
          ) : a ? (
            <>
              <span>{a.line1}</span>
              {a.line2 && <span>{a.line2}</span>}
              <span>
                {a.postal_code} {a.city}
              </span>
              <span>{countryName(a.country)}</span>
            </>
          ) : (
            <span>Remise en main propre</span>
          )}
          {order.phone && <span className="mt-1 text-[#777]">{order.phone}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#777]">Livraison</span>
          <span className="font-semibold">{order.shipping_method_name ?? "—"}</span>
          {order.shipping_kind && <span className="text-[#777]">{SHIPPING_KIND_LABELS[order.shipping_kind]}</span>}
          {order.is_gift && <span className="mt-2 inline-block w-fit rounded-md border border-[#c66] px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[#c66]">Cadeau, sans prix</span>}
        </div>
      </section>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#222] text-left">
            <th className="py-2 pr-4 font-semibold">Article</th>
            <th className="py-2 pr-4 font-semibold">Options</th>
            <th className="py-2 text-right font-semibold">Qté</th>
          </tr>
        </thead>
        <tbody>
          {order.shop_order_items.map((item) => {
            const options = (item.options as OrderItemOption[] | null) ?? [];
            return (
              <tr key={item.id} className="border-b border-[#ddd]">
                <td className="py-3 pr-4 font-medium">{item.product_name}</td>
                <td className="py-3 pr-4 text-[#777]">{options.map((o) => `${o.label} : ${o.value}`).join(" · ") || "—"}</td>
                <td className="py-3 text-right text-lg font-semibold">{item.quantity}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {order.gift_message && (
        <section className="rounded-xl border border-dashed border-[#c99] p-5">
          <span className="block text-[10px] uppercase tracking-[0.2em] text-[#777]">Mot doux à recopier et glisser dans le colis</span>
          <p className="mt-2 whitespace-pre-line font-display text-lg italic leading-relaxed">« {order.gift_message} »</p>
        </section>
      )}
      {order.customer_note && (
        <section className="text-sm">
          <span className="block text-[10px] uppercase tracking-[0.2em] text-[#777]">Note de la cliente</span>
          <p className="mt-1 whitespace-pre-line">{order.customer_note}</p>
        </section>
      )}
    </main>
  );
}

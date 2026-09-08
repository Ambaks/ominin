import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SearchIcon } from "@/components/shop/icons";
import { OrderCard, OrderTimeline } from "@/components/shop/store/order-summary";
import { Alert, Button, Field, Input } from "@/components/shop/store/ui";
import { findOrderForTracking, getShopBySlug } from "@/lib/shop/server";
import { parseEmail } from "@/lib/shop/validation";

export const metadata: Metadata = { title: "Suivre ma commande", robots: { index: false } };

export default async function TrackingPage({ params, searchParams }: PageProps<"/shop/[slug]/suivi">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  const orderNumber = typeof query.commande === "string" ? query.commande : "";
  const email = typeof query.email === "string" ? parseEmail(query.email) : null;
  const searched = Boolean(orderNumber || query.email);
  const order = orderNumber && email ? await findOrderForTracking(shop.id, orderNumber, email) : null;

  return (
    <section className="shop-container flex flex-col gap-10 py-12 md:py-20">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="shop-kicker">Où en est ma commande ?</span>
          <h1 className="text-4xl md:text-[44px]">Suivre ma commande</h1>
          <p className="max-w-md text-sm leading-relaxed text-shop-ink-soft">Indique ton numéro de commande (il figure dans ton e-mail de confirmation) et l&apos;adresse e-mail utilisée.</p>
        </div>
        <form method="get" className="grid gap-4 rounded-[24px] border border-shop-line bg-shop-paper p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Numéro de commande" htmlFor="commande">
            <Input id="commande" name="commande" required placeholder={`${shop.order_prefix}-2609-0001`} defaultValue={orderNumber} />
          </Field>
          <Field label="Adresse e-mail" htmlFor="email">
            <Input id="email" name="email" type="email" required defaultValue={typeof query.email === "string" ? query.email : ""} />
          </Field>
          <Button type="submit" className="h-12">
            <SearchIcon className="size-4" /> Rechercher
          </Button>
        </form>
        {searched && !order && (
          <Alert tone="warning" title="Commande introuvable">
            Vérifie le numéro et l&apos;adresse e-mail. Si le problème persiste, écris-nous via la page Contact.
          </Alert>
        )}
      </div>
      {order && (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <div className="rounded-[24px] border border-shop-line bg-shop-paper px-6 py-6 md:px-10">
            <OrderTimeline order={order} events={order.shop_order_events} />
          </div>
          <OrderCard order={order} />
        </div>
      )}
    </section>
  );
}

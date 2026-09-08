import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckIcon } from "@/components/shop/icons";
import { CheckoutForm } from "@/components/shop/store/checkout-form";
import { getActiveShippingMethods, getCurrentUser, getShopBySlug, paymentsEnabled } from "@/lib/shop/server";

export const metadata: Metadata = { title: "Commande", robots: { index: false } };

function Steps() {
  const steps = [
    { label: "Panier", state: "done" },
    { label: "Livraison", state: "current" },
    { label: "Paiement", state: "todo" },
  ] as const;
  return (
    <ol className="flex items-center justify-center gap-4 text-xs font-medium md:gap-5">
      {steps.map((step, i) => (
        <li key={step.label} className="flex items-center gap-4 md:gap-5">
          <span className={`flex items-center gap-2.5 ${step.state === "todo" ? "text-shop-ink-mute" : step.state === "done" ? "text-shop-ink-soft" : "text-shop-ink"}`}>
            <span
              className={`flex size-[26px] items-center justify-center rounded-full text-[11px] font-semibold ${
                step.state === "done" ? "bg-shop-tint-strong text-shop-accent-deep" : step.state === "current" ? "bg-shop-accent text-shop-paper" : "border border-shop-ink-faint text-shop-ink-mute"
              }`}
            >
              {step.state === "done" ? <CheckIcon className="size-3.5" strokeWidth={2.4} /> : i + 1}
            </span>
            {step.label}
          </span>
          {i < steps.length - 1 && <span className={`h-px w-10 md:w-14 ${step.state === "done" ? "bg-shop-accent-soft" : "bg-shop-line"}`} aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

export default async function CheckoutPage({ params, searchParams }: PageProps<"/shop/[slug]/commande">) {
  const [{ slug }, { annulee }] = await Promise.all([params, searchParams]);
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  const [methods, enabled, user] = await Promise.all([getActiveShippingMethods(shop.id), paymentsEnabled(shop.id), getCurrentUser()]);

  return (
    <section className="shop-container flex flex-col gap-10 py-10 md:py-14">
      <Steps />
      <CheckoutForm methods={methods} freeShippingThreshold={shop.free_shipping_threshold_cents} initialEmail={user?.email ?? null} paymentsEnabled={enabled} cancelled={annulee === "1"} />
    </section>
  );
}

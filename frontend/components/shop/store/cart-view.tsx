"use client";

import Link from "next/link";
import { useEffect } from "react";
import { itemUnitPrice, useCart } from "@/lib/shop/cart";
import { formatPrice } from "@/lib/shop/format";
import { ArrowRightIcon, BagIcon, GiftIcon, TrashIcon } from "../icons";
import { QuantityStepper } from "./add-to-cart-form";
import { useShop } from "./context";
import { shopHref } from "./href";
import { ButtonLink, EmptyState } from "./ui";

export function CartView({ freeShippingThreshold }: { freeShippingThreshold: number | null }) {
  const { slug } = useShop();
  const { items, hydrated, subtotal, updateQuantity, removeItem } = useCart();

  if (!hydrated) return <div className="h-64 animate-pulse rounded-[20px] bg-shop-tint" aria-busy />;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<BagIcon className="size-6" strokeWidth={1.5} />}
        title="Ton panier est vide"
        description="Il n'attend que ton premier coup de cœur."
        action={<ButtonLink href={shopHref(slug, "/boutique")}>Découvrir la boutique</ButtonLink>}
      />
    );
  }

  const remaining = freeShippingThreshold != null ? freeShippingThreshold - subtotal : null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:items-start">
      <ul className="flex flex-col divide-y divide-shop-line-soft rounded-[24px] border border-shop-line bg-shop-paper px-5 md:px-7">
        {items.map((item) => (
          <li key={item.key} className="flex gap-4 py-5 md:gap-6">
            <Link href={shopHref(slug, `/produit/${item.slug}`)} className="h-28 w-[88px] shrink-0 overflow-hidden rounded-2xl bg-shop-tint md:h-32 md:w-[104px]">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-shop-accent-soft">
                  <GiftIcon className="size-7" strokeWidth={1.3} />
                </span>
              )}
            </Link>
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <Link href={shopHref(slug, `/produit/${item.slug}`)} className="font-shop-display text-lg text-shop-ink hover:text-shop-accent-deep md:text-xl">
                    {item.name}
                  </Link>
                  {item.options.map((o) => (
                    <span key={o.linkId} className="text-xs text-shop-ink-soft">
                      {o.label} : <span className="text-shop-ink">{o.value}</span>
                    </span>
                  ))}
                </div>
                <span className="whitespace-nowrap text-[15px] font-semibold text-shop-ink">{formatPrice(itemUnitPrice(item) * item.quantity)}</span>
              </div>
              <div className="mt-auto flex items-center justify-between gap-4">
                <QuantityStepper size="sm" value={item.quantity} onChange={(q) => updateQuantity(item.key, q)} />
                <button type="button" onClick={() => removeItem(item.key)} className="inline-flex items-center gap-1.5 text-xs font-medium text-shop-ink-soft transition hover:text-shop-error">
                  <TrashIcon className="size-3.5" /> Retirer
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="flex flex-col gap-5 rounded-[24px] border border-shop-line bg-shop-paper p-6 shop-shadow lg:sticky lg:top-28">
        <h2 className="text-2xl">Récapitulatif</h2>
        <dl className="flex flex-col gap-2.5 text-sm text-shop-ink-soft">
          <div className="flex justify-between">
            <dt>Sous-total</dt>
            <dd className="text-shop-ink">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Livraison</dt>
            <dd>calculée à l&apos;étape suivante</dd>
          </div>
        </dl>
        {remaining != null &&
          (remaining > 0 ? (
            <p className="rounded-2xl bg-shop-tint px-4 py-3 text-xs leading-relaxed text-shop-accent-deep">
              Plus que <span className="font-semibold">{formatPrice(remaining)}</span> pour profiter de la livraison offerte.
            </p>
          ) : (
            <p className="rounded-2xl bg-shop-ok-soft px-4 py-3 text-xs font-medium text-shop-ok">La livraison t&apos;est offerte.</p>
          ))}
        <div className="flex items-baseline justify-between border-t border-shop-line pt-4">
          <span className="text-[15px] font-semibold">Total</span>
          <span className="text-[22px] font-semibold">{formatPrice(subtotal)}</span>
        </div>
        <ButtonLink href={shopHref(slug, "/commande")} size="lg" className="w-full">
          Passer la commande <ArrowRightIcon className="size-4" />
        </ButtonLink>
        <Link href={shopHref(slug, "/boutique")} className="text-center text-xs font-medium text-shop-accent-deep hover:text-shop-accent">
          Continuer mes achats
        </Link>
      </aside>
    </div>
  );
}

/** Vide le panier après une commande payée (page de confirmation). */
export function ClearCart() {
  const { clear, hydrated } = useCart();
  useEffect(() => {
    if (hydrated) clear();
  }, [hydrated, clear]);
  return null;
}

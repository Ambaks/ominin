"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCart } from "@/lib/shop/cart";
import { CART_MAX_QUANTITY, PERSONALIZATION_MAX_LENGTH } from "@/lib/shop/constants";
import { formatPrice } from "@/lib/shop/format";
import type { CartOption, ProductDetail } from "@/lib/shop/types";
import { BagIcon, MinusIcon, PlusIcon } from "../icons";
import { useShop } from "./context";
import { shopHref } from "./href";
import { useShopToast } from "./toast";
import { Button, Field, Input, Select, Textarea } from "./ui";

export function QuantityStepper({ value, onChange, min = 1, max = CART_MAX_QUANTITY, size = "md" }: { value: number; onChange: (v: number) => void; min?: number; max?: number; size?: "sm" | "md" }) {
  const h = size === "md" ? "h-[54px] w-[140px]" : "h-11 w-[116px]";
  const btn = size === "md" ? "w-12" : "w-10";
  return (
    <div className={`inline-flex items-center rounded-full border border-shop-line bg-shop-paper ${h}`} role="group" aria-label="Quantité">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Diminuer la quantité" className={`flex h-full items-center justify-center rounded-l-full text-shop-ink-soft hover:text-shop-ink disabled:opacity-40 ${btn}`}>
        <MinusIcon className="size-4" strokeWidth={1.8} />
      </button>
      <span className="flex-1 text-center text-sm font-semibold text-shop-ink" aria-live="polite">
        {value}
      </span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Augmenter la quantité" className={`flex h-full items-center justify-center rounded-r-full text-shop-ink hover:text-shop-accent-deep disabled:opacity-40 ${btn}`}>
        <PlusIcon className="size-4" strokeWidth={1.8} />
      </button>
    </div>
  );
}

export function AddToCartForm({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const { slug } = useShop();
  const { addItem, setGiftMessage } = useCart();
  const toast = useShopToast();
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [personalization, setPersonalization] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const links = product.shop_product_options;
  const soldOut = product.stock != null && product.stock <= 0;
  const maxQty = product.stock != null ? Math.min(CART_MAX_QUANTITY, product.stock) : CART_MAX_QUANTITY;

  const chosen = useMemo<CartOption[]>(() => {
    const result: CartOption[] = [];
    for (const link of links) {
      const value = link.shop_option_groups?.shop_option_values.find((v) => v.id === selections[link.id]);
      if (value) result.push({ linkId: link.id, label: link.label, valueId: value.id, value: value.label, priceDeltaCents: value.price_delta_cents });
    }
    return result;
  }, [links, selections]);

  const unitPrice = product.price_cents + chosen.reduce((s, o) => s + o.priceDeltaCents, 0);

  const handleAdd = () => {
    const missing = links.find((l) => l.is_required && !selections[l.id]);
    if (missing) {
      setError(`Choisis « ${missing.label} » avant d'ajouter au panier.`);
      return;
    }
    setError(null);
    const engraved = product.personalization_label ? personalization.trim().toUpperCase() || null : null;
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.shop_product_images[0]?.url ?? null,
      unitPriceCents: product.price_cents,
      quantity,
      options: chosen,
      personalization: engraved,
    });
    if (note.trim()) setGiftMessage(note.trim());
    const details = chosen.map((o) => `${o.label} : ${o.value}`);
    if (engraved) details.push(`${product.personalization_label} : ${engraved}`);
    toast.show(`${product.name} ajouté au panier`, {
      detail: details.join(" · ") || undefined,
      action: { label: "Voir le panier", onClick: () => router.push(shopHref(slug, "/panier")) },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {links.map((link) => {
        const values = (link.shop_option_groups?.shop_option_values ?? []).filter((v) => v.is_available);
        return (
          <Field key={link.id} label={link.label} htmlFor={`option-${link.id}`} optional={!link.is_required}>
            <Select id={`option-${link.id}`} value={selections[link.id] ?? ""} onChange={(e) => setSelections((s) => ({ ...s, [link.id]: e.target.value }))} aria-invalid={Boolean(error && link.is_required && !selections[link.id])}>
              <option value="">Choisir…</option>
              {values.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                  {v.price_delta_cents ? ` (${v.price_delta_cents > 0 ? "+" : ""}${formatPrice(v.price_delta_cents)})` : ""}
                </option>
              ))}
            </Select>
          </Field>
        );
      })}

      {product.personalization_label && (
        <Field label={product.personalization_label} htmlFor="personalization" optional hint={`Ton initiale, un âge, un jour à retenir : ${PERSONALIZATION_MAX_LENGTH} caractères au plus.`}>
          <Input id="personalization" value={personalization} onChange={(e) => setPersonalization(e.target.value)} maxLength={PERSONALIZATION_MAX_LENGTH} autoComplete="off" autoCapitalize="characters" placeholder="M" className="max-w-32 text-center font-shop-display text-xl uppercase tracking-[0.2em]" />
        </Field>
      )}

      <Field label="Un mot doux" htmlFor="note" optional hint="Il sera glissé dans le colis, sans aucun prix apparent. Tu pourras le modifier à l'étape de commande.">
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pour toi, parce que tu le mérites…" className="min-h-[84px]" maxLength={300} />
      </Field>

      {error && (
        <p className="text-sm text-shop-error" role="alert">
          {error}
        </p>
      )}

      {/* Le bouton passe sous le compteur quand la ligne est trop étroite (téléphones) : insécable, il élargirait toute la page. */}
      <div className="flex flex-wrap items-center gap-3.5">
        <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, maxQty)} />
        <Button size="lg" className="min-w-[240px] flex-1" onClick={handleAdd} disabled={soldOut}>
          <BagIcon className="size-[18px]" />
          {soldOut ? "Épuisé pour le moment" : `Ajouter au panier · ${formatPrice(unitPrice * quantity)}`}
        </Button>
      </div>
      {product.stock != null && product.stock > 0 && product.stock <= 3 && (
        <p className="text-xs font-medium text-shop-accent-deep">
          Plus que {product.stock} exemplaire{product.stock > 1 ? "s" : ""} disponible{product.stock > 1 ? "s" : ""}.
        </p>
      )}
    </div>
  );
}

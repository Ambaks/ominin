import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { CHECKOUT_EXPIRES_MINUTES, CHECKOUT_MIN_TOTAL_CENTS } from "./constants";
import { computeDiscount, computeShippingCents, platformFeeCents, type DiscountResult } from "./pricing";
import { addOrderEvent } from "./orders";
import type { OrderItemOption, ProductDetail, Shop } from "./types";
import type { CheckoutInput } from "./validation";

/*
 * Passage en caisse : le client n'envoie que des identifiants et des
 * quantités. Prix, options, disponibilité, frais de port, remise et
 * commission sont recalculés ici depuis la base, puis la commande est créée
 * « en attente » et la session Stripe Checkout ouverte sur le compte
 * connecté de la boutique (l'argent lui arrive directement). Le webhook et
 * la page de confirmation la passent en payée.
 */

type Admin = ReturnType<typeof createAdminClient>;

export async function validateDiscountCode(admin: Admin, shopId: string, rawCode: string, subtotalCents: number): Promise<DiscountResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Saisis un code." };
  // Égalité stricte : aucun joker possible depuis le champ public.
  const { data } = await admin.from("shop_discount_codes").select("*").eq("shop_id", shopId).eq("code", code).maybeSingle();
  if (!data) return { ok: false, error: "Code inconnu." };
  return computeDiscount(data, subtotalCents);
}

interface PricedItem {
  product: ProductDetail;
  quantity: number;
  unitPriceCents: number;
  options: OrderItemOption[];
}

async function priceItems(admin: Admin, shopId: string, items: CheckoutInput["items"]): Promise<PricedItem[]> {
  const ids = [...new Set(items.map((i) => i.productId))];
  const { data } = await admin
    .from("shop_products")
    .select("*, shop_product_images(*), shop_categories(*), shop_product_options(*, shop_option_groups(*, shop_option_values(*)))")
    .eq("shop_id", shopId)
    .in("id", ids)
    .eq("is_active", true);
  const byId = new Map((data ?? []).map((p) => [p.id, p]));

  const priced: PricedItem[] = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) throw new Error("Un article de ton panier n'est plus disponible. Merci de vérifier ton panier.");
    if (product.stock != null && product.stock < item.quantity) {
      throw new Error(
        product.stock === 0 ? `« ${product.name} » est épuisé pour le moment.` : `Il ne reste que ${product.stock} exemplaire(s) de « ${product.name} ».`
      );
    }
    const options: OrderItemOption[] = [];
    let delta = 0;
    for (const link of [...product.shop_product_options].sort((a, b) => a.sort_order - b.sort_order)) {
      const chosen = item.options.find((o) => o.linkId === link.id);
      const value = chosen ? link.shop_option_groups?.shop_option_values.find((v) => v.id === chosen.valueId) : undefined;
      if (!value) {
        if (link.is_required) throw new Error(`Merci de choisir « ${link.label} » pour ${product.name}.`);
        continue;
      }
      if (!value.is_available) throw new Error(`« ${value.label} » n'est plus disponible pour ${product.name}.`);
      options.push({ label: link.label, value: value.label, price_delta_cents: value.price_delta_cents });
      delta += value.price_delta_cents;
    }
    product.shop_product_images.sort((a, b) => a.sort_order - b.sort_order);
    priced.push({ product, quantity: item.quantity, unitPriceCents: product.price_cents + delta, options });
  }
  return priced;
}

/** Stripe n'accepte que des URL https absolues pour les visuels d'articles. */
function absoluteImage(url: string | null | undefined, origin: string): string | null {
  if (!url) return null;
  if (url.startsWith("https://")) return url;
  if (url.startsWith("/") && origin.startsWith("https://")) return `${origin}${url}`;
  return null;
}

export async function createCheckoutSession(
  shop: Shop,
  input: CheckoutInput,
  origin: string,
  userId: string | null
): Promise<{ url: string } | { error: string }> {
  const admin = createAdminClient();

  const [{ data: method }, { data: account }] = await Promise.all([
    admin.from("shop_shipping_methods").select("*").eq("shop_id", shop.id).eq("id", input.shippingMethodId).eq("is_active", true).maybeSingle(),
    admin.from("shop_payment_accounts").select("*").eq("shop_id", shop.id).maybeSingle(),
  ]);
  if (!method) return { error: "Ce mode de livraison n'est plus disponible." };
  if (!method.countries.map((c) => c.toUpperCase()).includes(input.country)) {
    return { error: "Ce mode de livraison n'est pas disponible pour le pays choisi." };
  }
  if (method.kind === "home" && !input.address) return { error: "Merci de renseigner ton adresse de livraison." };
  if (method.kind === "relay" && !input.relayPoint) return { error: "Merci d'indiquer le point relais souhaité." };
  if (!account?.charges_enabled) return { error: "Le paiement en ligne n'est pas encore activé. Réessaie un peu plus tard ou écris-nous." };

  let priced: PricedItem[];
  try {
    priced = await priceItems(admin, shop.id, input.items);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Panier invalide." };
  }
  const subtotalCents = priced.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);

  let discountCents = 0;
  let discountCode: string | null = null;
  if (input.discountCode) {
    const result = await validateDiscountCode(admin, shop.id, input.discountCode, subtotalCents);
    if (!result.ok) return { error: result.error };
    discountCents = result.discountCents;
    discountCode = result.code;
  }

  const shippingCents = computeShippingCents(method, subtotalCents, shop.free_shipping_threshold_cents);
  const totalCents = subtotalCents - discountCents + shippingCents;
  if (totalCents < CHECKOUT_MIN_TOTAL_CENTS) return { error: "Le montant de la commande est trop faible pour être payé en ligne." };
  const feeCents = platformFeeCents(totalCents, Number(shop.platform_fee_percent));

  const { data: order, error: orderError } = await admin
    .from("shop_orders")
    .insert({
      shop_id: shop.id,
      user_id: userId,
      email: input.email,
      phone: input.phone,
      first_name: input.firstName,
      last_name: input.lastName,
      shipping_address: method.kind === "home" ? (input.address as unknown as Json) : null,
      shipping_method_id: method.id,
      shipping_method_name: method.name,
      shipping_kind: method.kind,
      shipping_cents: shippingCents,
      relay_point: method.kind === "relay" ? (input.relayPoint as unknown as Json) : null,
      is_gift: input.isGift,
      gift_message: input.giftMessage,
      customer_note: input.customerNote,
      subtotal_cents: subtotalCents,
      discount_cents: discountCents,
      discount_code: discountCode,
      platform_fee_cents: feeCents,
      total_cents: totalCents,
      stripe_account_id: account.stripe_account_id,
    })
    .select("*")
    .single();
  if (orderError || !order) {
    console.error("[shop checkout]", orderError);
    return { error: "Impossible d'enregistrer la commande. Réessaie dans un instant." };
  }

  await admin.from("shop_order_items").insert(
    priced.map((i) => ({
      order_id: order.id,
      product_id: i.product.id,
      product_name: i.product.name,
      product_slug: i.product.slug,
      image_url: i.product.shop_product_images[0]?.url ?? null,
      unit_price_cents: i.unitPriceCents,
      quantity: i.quantity,
      options: i.options as unknown as Json,
      total_cents: i.unitPriceCents * i.quantity,
    }))
  );
  await addOrderEvent(admin, order.id, "created", "Commande créée, en attente de paiement");

  const stripe = getStripe();
  const accountOptions: Stripe.RequestOptions = { stripeAccount: account.stripe_account_id };
  const shopUrl = `${origin}/${shop.slug}`;

  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
  if (discountCents > 0 && discountCode) {
    const coupon = await stripe.coupons.create(
      { amount_off: discountCents, currency: "eur", duration: "once", name: `Code ${discountCode}` },
      accountOptions
    );
    discounts = [{ coupon: coupon.id }];
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      locale: "fr",
      customer_email: input.email,
      line_items: priced.map((i) => {
        const image = absoluteImage(i.product.shop_product_images[0]?.url, origin);
        const description = i.options.map((o) => `${o.label} : ${o.value}`).join(" · ");
        return {
          quantity: i.quantity,
          price_data: {
            currency: "eur",
            unit_amount: i.unitPriceCents,
            product_data: {
              name: i.product.name,
              ...(description && { description }),
              ...(image && { images: [image] }),
              metadata: { product_id: i.product.id },
            },
          },
        };
      }),
      discounts,
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shippingCents, currency: "eur" },
            display_name: shippingCents === 0 ? `${method.name} · offerte` : method.name,
            ...(method.delay_min_days != null &&
              method.delay_max_days != null && {
                delivery_estimate: {
                  minimum: { unit: "business_day", value: Math.max(1, method.delay_min_days) },
                  maximum: { unit: "business_day", value: Math.max(1, method.delay_max_days) },
                },
              }),
          },
        },
      ],
      billing_address_collection: "auto",
      payment_intent_data: {
        description: `${shop.name} · commande ${order.order_number}`,
        metadata: { order_id: order.id, order_number: order.order_number, shop_id: shop.id },
        ...(feeCents > 0 && { application_fee_amount: feeCents }),
      },
      metadata: { order_id: order.id, order_number: order.order_number, shop_id: shop.id },
      success_url: `${shopUrl}/commande/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${shopUrl}/commande?annulee=1`,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRES_MINUTES * 60,
    },
    accountOptions
  );

  await admin.from("shop_orders").update({ stripe_checkout_session_id: session.id }).eq("id", order.id);
  if (!session.url) return { error: "Stripe n'a pas renvoyé de page de paiement. Réessaie." };
  return { url: session.url };
}

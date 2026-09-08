import { createClient } from "@/lib/supabase/client";
import type { Json, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { check, must } from "@/lib/supabase/result";
import type { ShopTheme } from "./theme";
import type { ShopOrderStatus } from "./types";

/*
 * Surface de mutation de l'espace de gestion. Les écritures simples passent
 * par le client Supabase sous RLS (membre de la boutique) ; ce qui exige un
 * secret ou un e-mail (photos, Stripe, expédition, réponse à une cliente)
 * passe par les routes /api/shop/gestion/*. Les pages appellent puis
 * rafraîchissent (router.refresh()) : pas de store local.
 */

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Une erreur est survenue.");
  return data;
}

// ---------------------------------------------------------------------------
// Boutique

export type ShopSettingsInput = Omit<TablesUpdate<"shops">, "id" | "slug" | "created_at" | "updated_at" | "platform_fee_percent" | "is_active">;

export async function updateShop(shopId: string, input: ShopSettingsInput) {
  check(await createClient().from("shops").update(input).eq("id", shopId));
}

export async function updateTheme(shopId: string, theme: ShopTheme) {
  check(await createClient().from("shops").update({ theme: theme as unknown as Json }).eq("id", shopId));
}

export async function createShop(input: { name: string; slug: string; orderPrefix: string }): Promise<string> {
  return must(
    await createClient().rpc("create_shop", { p_name: input.name, p_slug: input.slug, p_order_prefix: input.orderPrefix })
  );
}

// ---------------------------------------------------------------------------
// Catalogue

export type ProductInput = Omit<TablesInsert<"shop_products">, "id" | "shop_id" | "created_at" | "updated_at">;
export interface ProductImageInput {
  url: string;
  alt: string | null;
}
export interface ProductOptionInput {
  group_id: string;
  label: string;
  is_required: boolean;
}

export async function saveProduct(
  shopId: string,
  id: string | null,
  input: ProductInput,
  images: ProductImageInput[],
  options: ProductOptionInput[]
): Promise<string> {
  const supabase = createClient();
  const productId = id
    ? (check(await supabase.from("shop_products").update(input).eq("id", id).eq("shop_id", shopId)), id)
    : must(await supabase.from("shop_products").insert({ ...input, shop_id: shopId }).select("id").single()).id;

  // Photos et options : la liste est remplacée, l'ordre est celui de l'affichage.
  check(await supabase.from("shop_product_images").delete().eq("product_id", productId));
  if (images.length) {
    check(
      await supabase
        .from("shop_product_images")
        .insert(images.map((img, i) => ({ product_id: productId, url: img.url, alt: img.alt, sort_order: i })))
    );
  }
  check(await supabase.from("shop_product_options").delete().eq("product_id", productId));
  if (options.length) {
    check(
      await supabase.from("shop_product_options").insert(
        options.map((o, i) => ({ shop_id: shopId, product_id: productId, group_id: o.group_id, label: o.label, is_required: o.is_required, sort_order: i }))
      )
    );
  }
  return productId;
}

export async function setProductActive(id: string, isActive: boolean) {
  check(await createClient().from("shop_products").update({ is_active: isActive }).eq("id", id));
}

export async function deleteProduct(id: string) {
  check(await createClient().from("shop_products").delete().eq("id", id));
}

export type CategoryInput = Omit<TablesInsert<"shop_categories">, "id" | "shop_id">;
export async function saveCategory(shopId: string, id: string | null, input: CategoryInput) {
  const supabase = createClient();
  if (id) check(await supabase.from("shop_categories").update(input).eq("id", id));
  else check(await supabase.from("shop_categories").insert({ ...input, shop_id: shopId }));
}
export async function deleteCategory(id: string) {
  check(await createClient().from("shop_categories").delete().eq("id", id));
}

export interface OptionValueInput {
  id?: string;
  label: string;
  price_delta_cents: number;
  is_available: boolean;
}

export async function saveOptionGroup(
  shopId: string,
  id: string | null,
  input: { name: string; description: string | null },
  values: OptionValueInput[]
): Promise<string> {
  const supabase = createClient();
  const groupId = id
    ? (check(await supabase.from("shop_option_groups").update(input).eq("id", id)), id)
    : must(await supabase.from("shop_option_groups").insert({ ...input, shop_id: shopId }).select("id").single()).id;

  // Les valeurs existantes sont mises à jour (les commandes passées les
  // référencent par libellé, pas par id, mais on garde les ids stables).
  const existing = must(await supabase.from("shop_option_values").select("id").eq("group_id", groupId));
  const kept = new Set<string>();
  for (const [i, value] of values.entries()) {
    const row = { group_id: groupId, label: value.label, price_delta_cents: value.price_delta_cents, is_available: value.is_available, sort_order: i };
    if (value.id && existing.some((e) => e.id === value.id)) {
      check(await supabase.from("shop_option_values").update(row).eq("id", value.id));
      kept.add(value.id);
    } else {
      kept.add(must(await supabase.from("shop_option_values").insert(row).select("id").single()).id);
    }
  }
  const stale = existing.filter((e) => !kept.has(e.id)).map((e) => e.id);
  if (stale.length) check(await supabase.from("shop_option_values").delete().in("id", stale));
  return groupId;
}

export async function deleteOptionGroup(id: string) {
  check(await createClient().from("shop_option_groups").delete().eq("id", id));
}

// ---------------------------------------------------------------------------
// Livraison, codes promo, FAQ

export type ShippingMethodInput = Omit<TablesInsert<"shop_shipping_methods">, "id" | "shop_id" | "created_at">;
export async function saveShippingMethod(shopId: string, id: string | null, input: ShippingMethodInput) {
  const supabase = createClient();
  if (id) check(await supabase.from("shop_shipping_methods").update(input).eq("id", id));
  else check(await supabase.from("shop_shipping_methods").insert({ ...input, shop_id: shopId }));
}
export async function setShippingMethodActive(id: string, isActive: boolean) {
  check(await createClient().from("shop_shipping_methods").update({ is_active: isActive }).eq("id", id));
}
export async function deleteShippingMethod(id: string) {
  check(await createClient().from("shop_shipping_methods").delete().eq("id", id));
}

export type DiscountCodeInput = Omit<TablesInsert<"shop_discount_codes">, "id" | "shop_id" | "created_at" | "uses">;
export async function saveDiscountCode(shopId: string, id: string | null, input: DiscountCodeInput) {
  const supabase = createClient();
  if (id) check(await supabase.from("shop_discount_codes").update(input).eq("id", id));
  else check(await supabase.from("shop_discount_codes").insert({ ...input, shop_id: shopId }));
}
export async function deleteDiscountCode(id: string) {
  check(await createClient().from("shop_discount_codes").delete().eq("id", id));
}

export type FaqInput = Omit<TablesInsert<"shop_faq_items">, "id" | "shop_id">;
export async function saveFaqItem(shopId: string, id: string | null, input: FaqInput) {
  const supabase = createClient();
  if (id) check(await supabase.from("shop_faq_items").update(input).eq("id", id));
  else check(await supabase.from("shop_faq_items").insert({ ...input, shop_id: shopId }));
}
export async function deleteFaqItem(id: string) {
  check(await createClient().from("shop_faq_items").delete().eq("id", id));
}

// ---------------------------------------------------------------------------
// Commandes et messages (routes serveur : e-mails, Stripe)

export async function updateOrderStatus(
  orderId: string,
  status: ShopOrderStatus,
  options: { trackingNumber?: string; trackingUrl?: string; carrier?: string; notify?: boolean } = {}
) {
  return postJson<{ warning?: string }>("/api/shop/gestion/orders", { orderId, action: "status", status, ...options });
}
export async function saveTracking(orderId: string, tracking: { trackingNumber: string; trackingUrl: string; carrier: string }) {
  return postJson("/api/shop/gestion/orders", { orderId, action: "tracking", ...tracking });
}
export async function saveOrderNotes(orderId: string, notes: string) {
  check(await createClient().from("shop_orders").update({ admin_notes: notes.trim() || null }).eq("id", orderId));
}
export async function refundOrder(orderId: string, amountCents: number | null) {
  return postJson("/api/shop/gestion/orders", { orderId, action: "refund", amountCents });
}
export async function resendConfirmation(orderId: string) {
  return postJson("/api/shop/gestion/orders", { orderId, action: "resend" });
}

export async function replyToConversation(conversationId: string, body: string) {
  return postJson<{ warning?: string }>("/api/shop/gestion/messages", { conversationId, body });
}
export async function setConversationStatus(conversationId: string, status: "open" | "closed") {
  check(await createClient().from("shop_conversations").update({ status, unread_shop: false }).eq("id", conversationId));
}
export async function markConversationRead(conversationId: string) {
  check(await createClient().from("shop_conversations").update({ unread_shop: false }).eq("id", conversationId));
}

// ---------------------------------------------------------------------------
// Photos, Stripe, abonnement

export async function uploadProductPhoto(file: File): Promise<string> {
  const { compressPhoto } = await import("./photo");
  const blob = await compressPhoto(file);
  const form = new FormData();
  form.append("file", new File([blob], "photo.webp", { type: "image/webp" }));
  const response = await fetch("/api/shop/gestion/photos", { method: "POST", body: form });
  const body = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !body.url) throw new Error(body.error ?? "L'envoi de la photo a échoué.");
  return body.url;
}

export async function stripeOnboardingUrl(): Promise<string> {
  return (await postJson<{ url: string }>("/api/shop/gestion/stripe-connect", {})).url;
}
export async function refreshStripeStatus(): Promise<{ connected: boolean; chargesEnabled: boolean }> {
  const response = await fetch("/api/shop/gestion/stripe-connect");
  const body = (await response.json()) as { connected: boolean; chargesEnabled: boolean; error?: string };
  if (!response.ok) throw new Error(body.error ?? "Une erreur est survenue.");
  return body;
}
export async function subscriptionCheckoutUrl(): Promise<string> {
  return (await postJson<{ url: string }>("/api/shop/gestion/subscribe", {})).url;
}

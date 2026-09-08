import { redirect } from "next/navigation";
import { cache } from "react";
import { shopSiteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import {
  DASHBOARD_CHART_DAYS,
  DASHBOARD_KPI_DAYS,
  LOW_STOCK_THRESHOLD,
  ORDERS_PAGE_SIZE,
} from "./constants";
import type {
  ConversationWithMessages,
  OptionGroupWithValues,
  OrderFull,
  OrderWithItems,
  ProductDetail,
  ProductWithImages,
  Shop,
  ShopCategory,
  ShopConversation,
  ShopCustomerStat,
  ShopDiscountCode,
  ShopFaqItem,
  ShopOrderStatus,
  ShopPaymentAccount,
  ShopSession,
  ShopShippingMethod,
  ShopSubscription,
} from "./types";

/*
 * Lectures côté serveur. Le site public d'une boutique lit avec le client
 * anonyme (aucun cookie : pages cachables, RLS « public read ») ; l'espace
 * cliente et l'espace de gestion lisent avec la session (RLS par user_id
 * ou par membre) ; les recherches sans session (suivi invité) passent par
 * la clé service avec des égalités strictes.
 */

const PRODUCT_DETAIL_SELECT =
  "*, shop_product_images(*), shop_categories(*), shop_product_options(*, shop_option_groups(*, shop_option_values(*)))";

/** Origine publique d'une boutique, pour les e-mails et les URL Stripe hors requête. */
export function shopPublicUrl(slug: string): string {
  return `${shopSiteUrl}/${slug}`;
}

export const getShopBySlug = cache(async (slug: string): Promise<Shop | null> => {
  const { data } = await createPublicClient()
    .from("shops")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
});

// ---------------------------------------------------------------------------
// Catalogue public

function sortImages<T extends { shop_product_images: { sort_order: number }[] }>(product: T): T {
  product.shop_product_images.sort((a, b) => a.sort_order - b.sort_order);
  return product;
}

export async function getCategories(shopId: string): Promise<ShopCategory[]> {
  const { data } = await createPublicClient()
    .from("shop_categories")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
}

export async function getProducts(
  shopId: string,
  options: { collection?: string; featured?: boolean; limit?: number } = {}
): Promise<ProductWithImages[]> {
  let query = createPublicClient()
    .from("shop_products")
    .select("*, shop_product_images(*), shop_categories(*)")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");
  if (options.featured) query = query.eq("is_featured", true);
  if (options.limit) query = query.limit(options.limit);
  const { data } = await query;
  const products = (data ?? []).map(sortImages);
  return options.collection
    ? products.filter((p) => p.shop_categories?.slug === options.collection)
    : products;
}

export async function getProductBySlug(shopId: string, slug: string): Promise<ProductDetail | null> {
  const { data } = await createPublicClient()
    .from("shop_products")
    .select(PRODUCT_DETAIL_SELECT)
    .eq("shop_id", shopId)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  const product = sortImages(data);
  product.shop_product_options.sort((a, b) => a.sort_order - b.sort_order);
  for (const link of product.shop_product_options) {
    link.shop_option_groups?.shop_option_values.sort((a, b) => a.sort_order - b.sort_order);
  }
  return product;
}

export async function getRelatedProducts(product: ProductDetail, limit: number): Promise<ProductWithImages[]> {
  const all = await getProducts(product.shop_id);
  const sameCategory = all.filter((p) => p.id !== product.id && p.category_id === product.category_id);
  const others = all.filter((p) => p.id !== product.id && p.category_id !== product.category_id);
  return [...sameCategory, ...others].slice(0, limit);
}

export async function getActiveShippingMethods(shopId: string): Promise<ShopShippingMethod[]> {
  const { data } = await createPublicClient()
    .from("shop_shipping_methods")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
}

export async function getFaq(shopId: string): Promise<ShopFaqItem[]> {
  const { data } = await createPublicClient()
    .from("shop_faq_items")
    .select("*")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
}

/** Le paiement n'est proposé que si le compte Stripe de la boutique encaisse. */
export async function paymentsEnabled(shopId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("shop_payment_accounts")
    .select("charges_enabled")
    .eq("shop_id", shopId)
    .maybeSingle();
  return Boolean(data?.charges_enabled);
}

// ---------------------------------------------------------------------------
// Espace cliente (session)

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function listOrdersForUser(shopId: string, userId: string): Promise<OrderWithItems[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_orders")
    .select("*, shop_order_items(*)")
    .eq("shop_id", shopId)
    .eq("user_id", userId)
    .neq("status", "pending")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getOrderForUser(shopId: string, userId: string, id: string): Promise<OrderFull | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_orders")
    .select("*, shop_order_items(*), shop_order_events(*)")
    .eq("shop_id", shopId)
    .eq("id", id)
    .eq("user_id", userId)
    .order("created_at", { referencedTable: "shop_order_events", ascending: true })
    .maybeSingle();
  return data;
}

export async function listConversationsForUser(shopId: string, userId: string): Promise<ShopConversation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_conversations")
    .select("*")
    .eq("shop_id", shopId)
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false });
  return data ?? [];
}

export async function getConversationForUser(
  shopId: string,
  userId: string,
  id: string
): Promise<ConversationWithMessages | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_conversations")
    .select("*, shop_messages(*)")
    .eq("shop_id", shopId)
    .eq("id", id)
    .eq("user_id", userId)
    .order("created_at", { referencedTable: "shop_messages", ascending: true })
    .maybeSingle();
  return data;
}

/** Suivi invité : numéro + e-mail, égalités strictes (aucun joker possible depuis l'URL). */
export async function findOrderForTracking(
  shopId: string,
  orderNumber: string,
  email: string
): Promise<OrderFull | null> {
  const { data } = await createAdminClient()
    .from("shop_orders")
    .select("*, shop_order_items(*), shop_order_events(*)")
    .eq("shop_id", shopId)
    .eq("order_number", orderNumber.trim().toUpperCase())
    .eq("email", email.trim().toLowerCase())
    .neq("status", "pending")
    .order("created_at", { referencedTable: "shop_order_events", ascending: true })
    .maybeSingle();
  return data;
}

// ---------------------------------------------------------------------------
// Espace de gestion (membre)

/** Membre connecté et sa boutique, ou null (pas de session / pas de boutique). */
export const getShopSession = cache(async (): Promise<ShopSession | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("shop_members")
    .select("role, shops(*)")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!data?.shops) return null;
  return { userId: user.id, email: user.email ?? null, role: data.role, shop: data.shops };
});

/** Garde des pages de gestion : connectée sans boutique ⇒ création de boutique. */
export async function requireShopSession(): Promise<ShopSession> {
  const session = await getShopSession();
  if (!session) redirect("/inscription/boutique");
  return session;
}

export async function getAllProducts(shopId: string): Promise<ProductWithImages[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_products")
    .select("*, shop_product_images(*), shop_categories(*)")
    .eq("shop_id", shopId)
    .order("sort_order")
    .order("created_at");
  return (data ?? []).map(sortImages);
}

export async function getProductById(shopId: string, id: string): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_products")
    .select(PRODUCT_DETAIL_SELECT)
    .eq("shop_id", shopId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  data.shop_product_options.sort((a, b) => a.sort_order - b.sort_order);
  return sortImages(data);
}

export async function getAllCategories(shopId: string): Promise<ShopCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("shop_categories").select("*").eq("shop_id", shopId).order("sort_order");
  return data ?? [];
}

export async function getOptionGroups(shopId: string): Promise<OptionGroupWithValues[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_option_groups")
    .select("*, shop_option_values(*)")
    .eq("shop_id", shopId)
    .order("name");
  for (const group of data ?? []) group.shop_option_values.sort((a, b) => a.sort_order - b.sort_order);
  return data ?? [];
}

export async function getOptionGroup(shopId: string, id: string): Promise<OptionGroupWithValues | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_option_groups")
    .select("*, shop_option_values(*)")
    .eq("shop_id", shopId)
    .eq("id", id)
    .maybeSingle();
  data?.shop_option_values.sort((a, b) => a.sort_order - b.sort_order);
  return data;
}

export async function getAllShippingMethods(shopId: string): Promise<ShopShippingMethod[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("shop_shipping_methods").select("*").eq("shop_id", shopId).order("sort_order");
  return data ?? [];
}

export async function getDiscountCodes(shopId: string): Promise<ShopDiscountCode[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_discount_codes")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAllFaq(shopId: string): Promise<ShopFaqItem[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("shop_faq_items").select("*").eq("shop_id", shopId).order("sort_order");
  return data ?? [];
}

export async function getPaymentAccount(shopId: string): Promise<ShopPaymentAccount | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("shop_payment_accounts").select("*").eq("shop_id", shopId).maybeSingle();
  return data;
}

export async function getSubscription(shopId: string): Promise<ShopSubscription | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("shop_subscriptions").select("*").eq("shop_id", shopId).maybeSingle();
  return data;
}

export interface OrderFilters {
  status?: ShopOrderStatus | "all" | "to_prepare";
  q?: string;
  page?: number;
}

export async function listOrders(
  shopId: string,
  filters: OrderFilters = {}
): Promise<{ orders: OrderWithItems[]; total: number }> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * ORDERS_PAGE_SIZE;
  let query = supabase
    .from("shop_orders")
    .select("*, shop_order_items(*)", { count: "exact" })
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .range(from, from + ORDERS_PAGE_SIZE - 1);

  if (filters.status === "to_prepare") query = query.in("status", ["paid", "preparing"]);
  else if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  else query = query.neq("status", "pending"); // paniers jamais payés masqués par défaut

  // Recherche : métacaractères PostgREST retirés, jokers ILIKE neutralisés.
  const q = filters.q?.trim().replace(/[%,()_\\]/g, "");
  if (q) {
    query = query.or(
      `order_number.ilike.%${q}%,email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`
    );
  }
  const { data, count } = await query;
  return { orders: data ?? [], total: count ?? 0 };
}

export async function getOrder(shopId: string, id: string): Promise<OrderFull | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_orders")
    .select("*, shop_order_items(*), shop_order_events(*)")
    .eq("shop_id", shopId)
    .eq("id", id)
    .order("created_at", { referencedTable: "shop_order_events", ascending: true })
    .maybeSingle();
  return data;
}

export async function countOrdersByStatus(shopId: string): Promise<Record<string, number>> {
  const supabase = await createClient();
  const statuses: ShopOrderStatus[] = ["paid", "preparing", "shipped", "delivered", "cancelled", "refunded"];
  const results = await Promise.all(
    statuses.map((s) =>
      supabase.from("shop_orders").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", s)
    )
  );
  return Object.fromEntries(statuses.map((s, i) => [s, results[i].count ?? 0]));
}

export async function countToPrepare(shopId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("shop_orders")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .in("status", ["paid", "preparing"]);
  return count ?? 0;
}

export async function countUnread(shopId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("shop_conversations")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("unread_shop", true)
    .eq("status", "open");
  return count ?? 0;
}

export async function listConversations(
  shopId: string,
  status: "open" | "closed" | "all"
): Promise<ShopConversation[]> {
  const supabase = await createClient();
  let query = supabase
    .from("shop_conversations")
    .select("*")
    .eq("shop_id", shopId)
    .order("last_message_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);
  const { data } = await query;
  return data ?? [];
}

export async function getConversation(shopId: string, id: string): Promise<ConversationWithMessages | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_conversations")
    .select("*, shop_messages(*)")
    .eq("shop_id", shopId)
    .eq("id", id)
    .order("created_at", { referencedTable: "shop_messages", ascending: true })
    .maybeSingle();
  return data;
}

export async function listCustomers(shopId: string): Promise<ShopCustomerStat[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shop_customer_stats")
    .select("*")
    .eq("shop_id", shopId)
    .order("last_order_at", { ascending: false });
  return data ?? [];
}

export interface DashboardStats {
  revenue: number;
  revenuePrevious: number;
  ordersCount: number;
  toPrepare: number;
  averageBasket: number;
  unreadMessages: number;
  salesByDay: { day: string; orders_count: number; revenue_cents: number }[];
  recentOrders: OrderWithItems[];
  lowStock: ProductWithImages[];
}

export async function getDashboardStats(shopId: string): Promise<DashboardStats> {
  const supabase = await createClient();
  const now = Date.now();
  const since = new Date(now - DASHBOARD_KPI_DAYS * 86_400_000).toISOString();
  const sincePrevious = new Date(now - 2 * DASHBOARD_KPI_DAYS * 86_400_000).toISOString();

  const [paid, paidPrevious, toPrepare, unread, salesByDay, recent, lowStock] = await Promise.all([
    supabase.from("shop_orders").select("total_cents").eq("shop_id", shopId).eq("payment_status", "paid").gte("paid_at", since),
    supabase
      .from("shop_orders")
      .select("total_cents")
      .eq("shop_id", shopId)
      .eq("payment_status", "paid")
      .gte("paid_at", sincePrevious)
      .lt("paid_at", since),
    countToPrepare(shopId),
    countUnread(shopId),
    supabase.rpc("shop_sales_by_day", { p_shop: shopId, p_days: DASHBOARD_CHART_DAYS }),
    supabase
      .from("shop_orders")
      .select("*, shop_order_items(*)")
      .eq("shop_id", shopId)
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("shop_products")
      .select("*, shop_product_images(*)")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .not("stock", "is", null)
      .lte("stock", LOW_STOCK_THRESHOLD)
      .limit(5),
  ]);

  const sum = (rows: { total_cents: number }[] | null) => (rows ?? []).reduce((s, r) => s + r.total_cents, 0);
  const revenue = sum(paid.data);
  const ordersCount = paid.data?.length ?? 0;
  return {
    revenue,
    revenuePrevious: sum(paidPrevious.data),
    ordersCount,
    toPrepare,
    averageBasket: ordersCount > 0 ? Math.round(revenue / ordersCount) : 0,
    unreadMessages: unread,
    salesByDay: salesByDay.data ?? [],
    recentOrders: recent.data ?? [],
    lowStock: (lowStock.data ?? []).map(sortImages),
  };
}

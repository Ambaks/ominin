import { createClient } from "@/lib/supabase/client";
import { mustPage, type ListPage } from "@/lib/supabase/result";
import type { ProductWithImages, ShopConversation, ShopCustomerStat } from "./types";

/* Les longues listes de l'espace de gestion, lues page par page sous RLS. */

/** Métacaractères PostgREST retirés, jokers ILIKE neutralisés. */
const ilikeTerm = (search: string) => search.replace(/[%,()_\\]/g, "");

export async function fetchCustomersPage(
  shopId: string,
  search: string,
  limit: number,
  offset: number
): Promise<ListPage<ShopCustomerStat>> {
  let query = createClient().from("shop_customer_stats").select("*", { count: "exact" }).eq("shop_id", shopId);
  const term = ilikeTerm(search);
  if (term) query = query.or(`email.ilike.%${term}%,name.ilike.%${term}%`);
  return mustPage(
    await query
      .order("last_order_at", { ascending: false })
      .order("email")
      .range(offset, offset + limit - 1)
  );
}

export async function fetchConversationsPage(
  shopId: string,
  status: "open" | "closed" | "all",
  limit: number,
  offset: number
): Promise<ListPage<ShopConversation>> {
  let query = createClient().from("shop_conversations").select("*", { count: "exact" }).eq("shop_id", shopId);
  if (status !== "all") query = query.eq("status", status);
  return mustPage(
    await query
      .order("last_message_at", { ascending: false })
      .order("id")
      .range(offset, offset + limit - 1)
  );
}

export async function fetchProductsPage(
  shopId: string,
  limit: number,
  offset: number
): Promise<ListPage<ProductWithImages>> {
  const page = mustPage(
    await createClient()
      .from("shop_products")
      .select("*, shop_product_images(*), shop_categories(*)", { count: "exact" })
      .eq("shop_id", shopId)
      .order("sort_order")
      .order("created_at")
      .order("id")
      .range(offset, offset + limit - 1)
  );
  for (const product of page.rows) {
    product.shop_product_images.sort((a, b) => a.sort_order - b.sort_order);
  }
  return page;
}

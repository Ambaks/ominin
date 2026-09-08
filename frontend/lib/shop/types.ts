import type { Enums, Tables } from "@/lib/supabase/database.types";

/*
 * Types du domaine Shop : alias des lignes générées (database.types.ts) et
 * formes composées telles que PostgREST les renvoie avec les jointures.
 */

export type Shop = Tables<"shops">;
export type ShopMember = Tables<"shop_members">;
export type ShopSubscription = Tables<"shop_subscriptions">;
export type ShopPaymentAccount = Tables<"shop_payment_accounts">;
export type ShopCategory = Tables<"shop_categories">;
export type ShopOptionGroup = Tables<"shop_option_groups">;
export type ShopOptionValue = Tables<"shop_option_values">;
export type ShopProduct = Tables<"shop_products">;
export type ShopProductImage = Tables<"shop_product_images">;
export type ShopProductOption = Tables<"shop_product_options">;
export type ShopShippingMethod = Tables<"shop_shipping_methods">;
export type ShopDiscountCode = Tables<"shop_discount_codes">;
export type ShopOrder = Tables<"shop_orders">;
export type ShopOrderItem = Tables<"shop_order_items">;
export type ShopOrderEvent = Tables<"shop_order_events">;
export type ShopConversation = Tables<"shop_conversations">;
export type ShopMessage = Tables<"shop_messages">;
export type ShopFaqItem = Tables<"shop_faq_items">;
export type ShopCustomerStat = Tables<"shop_customer_stats">;

export type ShopMemberRole = Enums<"shop_member_role">;
export type ShopOrderStatus = Enums<"shop_order_status">;
export type ShopPaymentStatus = Enums<"shop_payment_status">;
export type ShopShippingKind = Enums<"shop_shipping_kind">;
export type ShopMessageSender = Enums<"shop_message_sender">;
export type ShopDiscountType = Enums<"shop_discount_type">;
export type ShopProductBadge = Enums<"shop_product_badge">;

export type OptionGroupWithValues = ShopOptionGroup & {
  shop_option_values: ShopOptionValue[];
};

export type ProductOptionLink = ShopProductOption & {
  shop_option_groups: OptionGroupWithValues | null;
};

export type ProductWithImages = ShopProduct & {
  shop_product_images: ShopProductImage[];
  shop_categories?: ShopCategory | null;
};

export type ProductDetail = ProductWithImages & {
  shop_product_options: ProductOptionLink[];
};

export type OrderWithItems = ShopOrder & { shop_order_items: ShopOrderItem[] };
export type OrderFull = OrderWithItems & { shop_order_events: ShopOrderEvent[] };

export type ConversationWithMessages = ShopConversation & {
  shop_messages: ShopMessage[];
};

/** Formes des colonnes jsonb, figées à la commande. */
export interface Address {
  line1: string;
  line2?: string | null;
  postal_code: string;
  city: string;
  country: string;
}

export interface RelayPoint {
  name: string;
  address: string;
  postal_code: string;
  city: string;
  code?: string | null;
}

export interface OrderItemOption {
  label: string;
  value: string;
  price_delta_cents: number;
}

/** Panier côté navigateur (localStorage, par boutique). */
export interface CartOption {
  linkId: string;
  label: string;
  valueId: string;
  value: string;
  priceDeltaCents: number;
}

export interface CartItem {
  key: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  options: CartOption[];
}

/** Membre connecté et sa boutique, tels que les pages de gestion les reçoivent. */
export interface ShopSession {
  userId: string;
  email: string | null;
  role: ShopMemberRole;
  shop: Shop;
}

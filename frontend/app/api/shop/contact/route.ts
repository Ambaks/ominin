import { NextResponse } from "next/server";
import { sendShopMail } from "@/lib/shop/mail";
import { contactAcknowledgementMail, newMessageNotificationMail } from "@/lib/shop/mail-templates";
import { getCurrentUser, getShopBySlug, shopPublicUrl } from "@/lib/shop/server";
import { parseContact } from "@/lib/shop/validation";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Message d'une cliente (page Contact) : conversation + premier message en
 * base, accusé de réception à la cliente, notification à la boutique. Une
 * cliente connectée voit la conversation dans son espace (user_id).
 */
export async function POST(request: Request) {
  const parsed = parseContact(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;

  const shop = await getShopBySlug(input.slug);
  if (!shop) return NextResponse.json({ error: "Boutique introuvable." }, { status: 404 });

  const admin = createAdminClient();
  const user = await getCurrentUser();

  let orderId: string | null = null;
  if (input.orderNumber) {
    const { data: order } = await admin.from("shop_orders").select("id").eq("shop_id", shop.id).eq("order_number", input.orderNumber).eq("email", input.email).maybeSingle();
    orderId = order?.id ?? null;
  }
  const subject = input.subject ?? (input.orderNumber ? `Commande ${input.orderNumber}` : "Message via le site");

  const { data: conversation, error } = await admin
    .from("shop_conversations")
    .insert({ shop_id: shop.id, user_id: user?.id ?? null, customer_email: input.email, customer_name: input.name, subject, order_id: orderId })
    .select("id")
    .single();
  if (error || !conversation) {
    console.error("[shop contact]", error);
    return NextResponse.json({ error: "Impossible d'envoyer le message pour le moment." }, { status: 500 });
  }
  await admin.from("shop_messages").insert({ conversation_id: conversation.id, sender: "customer", body: input.message });

  const ctx = { shop, shopUrl: shopPublicUrl(shop.slug) };
  const ack = contactAcknowledgementMail(ctx, input.name, input.message);
  await sendShopMail({ to: input.email, fromName: shop.name, replyTo: shop.contact_email, ...ack });
  if (shop.contact_email) {
    const notification = newMessageNotificationMail(ctx, { name: input.name, email: input.email, subject, message: input.message, conversationId: conversation.id });
    await sendShopMail({ to: shop.contact_email, fromName: "Ominin Shop", replyTo: input.email, ...notification });
  }
  return NextResponse.json({ ok: true });
}

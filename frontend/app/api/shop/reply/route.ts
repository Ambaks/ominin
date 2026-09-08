import { NextResponse } from "next/server";
import { sendShopMail } from "@/lib/shop/mail";
import { newMessageNotificationMail } from "@/lib/shop/mail-templates";
import { shopPublicUrl } from "@/lib/shop/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Réponse d'une cliente connectée dans une conversation qui lui appartient
 * (RLS sur la lecture ; l'insertion et le marquage « non lu » côté boutique
 * passent par la clé service, puis notification e-mail à la boutique).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { conversationId?: string; body?: string };
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (typeof body.conversationId !== "string" || text.length < 2 || text.length > 3000) {
    return NextResponse.json({ error: "Message invalide." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Connecte-toi pour répondre." }, { status: 401 });

  const { data: conversation } = await supabase.from("shop_conversations").select("*, shops(*)").eq("id", body.conversationId).eq("user_id", user.id).maybeSingle();
  if (!conversation?.shops) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  const admin = createAdminClient();
  const { error } = await admin.from("shop_messages").insert({ conversation_id: conversation.id, sender: "customer", body: text });
  if (error) return NextResponse.json({ error: "Impossible d'envoyer ta réponse." }, { status: 500 });
  await admin.from("shop_conversations").update({ unread_shop: true, unread_customer: false, status: "open", last_message_at: new Date().toISOString() }).eq("id", conversation.id);

  const shop = conversation.shops;
  if (shop.contact_email) {
    const mail = newMessageNotificationMail({ shop, shopUrl: shopPublicUrl(shop.slug) }, { name: conversation.customer_name ?? conversation.customer_email, email: conversation.customer_email, subject: conversation.subject, message: text, conversationId: conversation.id });
    await sendShopMail({ to: shop.contact_email, fromName: "Ominin Shop", replyTo: conversation.customer_email, ...mail });
  }
  return NextResponse.json({ ok: true });
}

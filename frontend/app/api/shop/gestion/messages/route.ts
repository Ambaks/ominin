import { NextResponse } from "next/server";
import { requireShopMember } from "@/lib/shop/api-auth";
import { sendShopMail } from "@/lib/shop/mail";
import { shopReplyMail } from "@/lib/shop/mail-templates";
import { shopPublicUrl } from "@/lib/shop/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Réponse de la boutique à une cliente : message en base + e-mail. */
export async function POST(request: Request) {
  const session = await requireShopMember();
  if (session instanceof NextResponse) return session;
  const body = (await request.json().catch(() => ({}))) as { conversationId?: string; body?: string };
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (typeof body.conversationId !== "string" || text.length < 2) return NextResponse.json({ error: "Message vide." }, { status: 400 });

  const admin = createAdminClient();
  const { data: conversation } = await admin.from("shop_conversations").select("*").eq("id", body.conversationId).eq("shop_id", session.shop.id).maybeSingle();
  if (!conversation) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  const { error } = await admin.from("shop_messages").insert({ conversation_id: conversation.id, sender: "shop", body: text });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await admin.from("shop_conversations").update({ unread_shop: false, unread_customer: true, status: "open", last_message_at: new Date().toISOString() }).eq("id", conversation.id);

  const shop = session.shop;
  const mail = shopReplyMail({ shop, shopUrl: shopPublicUrl(shop.slug) }, { customerName: conversation.customer_name, reply: text, conversationId: conversation.id, hasAccount: Boolean(conversation.user_id) });
  const sent = await sendShopMail({ to: conversation.customer_email, fromName: shop.name, replyTo: shop.contact_email, ...mail });
  return NextResponse.json({ ok: true, warning: sent ? undefined : "Réponse enregistrée, mais l'e-mail n'a pas pu être envoyé." });
}

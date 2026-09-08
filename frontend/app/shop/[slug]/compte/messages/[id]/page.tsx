import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { shopHref } from "@/components/shop/store/href";
import { CustomerReplyForm, MessageBubbles } from "@/components/shop/store/message-thread";
import { getConversationForUser, getCurrentUser, getShopBySlug } from "@/lib/shop/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };

export default async function AccountConversationPage({ params }: PageProps<"/shop/[slug]/compte/messages/[id]">) {
  const { slug, id } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(shopHref(slug, `/compte?next=${encodeURIComponent(shopHref(slug, `/compte/messages/${id}`))}`));
  const conversation = await getConversationForUser(shop.id, user.id, id);
  if (!conversation) notFound();
  // La cliente ne peut pas modifier la conversation (RLS) : marquage côté serveur, après contrôle d'appartenance ci-dessus.
  if (conversation.unread_customer) await createAdminClient().from("shop_conversations").update({ unread_customer: false }).eq("id", id);

  return (
    <section className="shop-container py-12 md:py-20">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <nav className="text-xs text-shop-ink-soft">
          <Link href={shopHref(slug, "/compte")} className="hover:text-shop-ink">
            Mon compte
          </Link>{" "}
          /{" "}
          <Link href={shopHref(slug, "/compte/messages")} className="hover:text-shop-ink">
            Mes messages
          </Link>{" "}
          / <span className="text-shop-ink">{conversation.subject ?? "Conversation"}</span>
        </nav>
        <h1 className="text-3xl md:text-4xl">{conversation.subject ?? "Conversation"}</h1>
        <div className="rounded-[24px] border border-shop-line bg-shop-bg p-5 md:p-7">
          <MessageBubbles messages={conversation.shop_messages} viewer="customer" />
        </div>
        <div className="rounded-[24px] border border-shop-line bg-shop-paper p-6">
          <CustomerReplyForm conversationId={conversation.id} />
        </div>
      </div>
    </section>
  );
}

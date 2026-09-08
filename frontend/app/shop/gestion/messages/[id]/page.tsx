import Link from "next/link";
import { notFound } from "next/navigation";
import { ConversationView } from "@/components/shop/gestion/conversation-view";
import { PageHeader } from "@/components/shop/gestion/page-header";
import { formatDateTime } from "@/lib/shop/format";
import { getConversation, requireShopSession } from "@/lib/shop/server";
import { createClient } from "@/lib/supabase/server";

export default async function ShopConversationPage({ params }: PageProps<"/shop/gestion/messages/[id]">) {
  const { id } = await params;
  const { shop } = await requireShopSession();
  const conversation = await getConversation(shop.id, id);
  if (!conversation) notFound();
  if (conversation.unread_shop) {
    const supabase = await createClient();
    await supabase.from("shop_conversations").update({ unread_shop: false }).eq("id", id);
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/gestion/messages", label: "Messages" }}
        title={conversation.subject ?? "Conversation"}
        description={
          <>
            {conversation.customer_name ?? ""} · <a href={`mailto:${conversation.customer_email}`} className="text-ember-1">{conversation.customer_email}</a> · ouverte le {formatDateTime(conversation.created_at)}
            {conversation.order_id && (
              <>
                {" "}
                ·{" "}
                <Link href={`/gestion/commandes/${conversation.order_id}`} className="text-ember-1">
                  voir la commande
                </Link>
              </>
            )}
            {conversation.status === "closed" && " · clôturée"}
          </>
        }
      />
      <div className="mx-auto w-full max-w-3xl">
        <ConversationView conversation={conversation} />
      </div>
    </div>
  );
}

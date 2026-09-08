import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shop/gestion/page-header";
import { formatRelative, initials } from "@/lib/shop/format";
import { listConversations, requireShopSession } from "@/lib/shop/server";

export default async function ShopMessagesPage({ searchParams }: PageProps<"/shop/gestion/messages">) {
  const { shop } = await requireShopSession();
  const { statut } = await searchParams;
  const status = statut === "closed" ? "closed" : statut === "all" ? "all" : "open";
  const conversations = await listConversations(shop.id, status);
  const filters = [
    { key: "open", label: "Ouvertes" },
    { key: "closed", label: "Clôturées" },
    { key: "all", label: "Toutes" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Messages" description="Messages envoyés depuis la page Contact et réponses des clientes." />
      <div className="flex gap-2">
        {filters.map((f) => (
          <Link key={f.key} href={`/gestion/messages?statut=${f.key}`} className={`rounded-full px-4 py-2 text-sm font-medium ${status === f.key ? "ember-gradient text-background" : "border border-hairline text-muted hover:text-foreground"}`}>
            {f.label}
          </Link>
        ))}
      </div>
      {conversations.length === 0 ? (
        <EmptyState title="Aucune conversation" body="Les messages de vos clientes apparaîtront ici." />
      ) : (
        <ul className="flex flex-col divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link href={`/gestion/messages/${c.id}`} className={`flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface-raised ${c.unread_shop ? "bg-surface-raised/60" : ""}`}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-semibold text-ember-1">{initials(c.customer_name ?? c.customer_email)}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center justify-between gap-3">
                    <span className={`truncate text-sm ${c.unread_shop ? "font-semibold" : "font-medium"}`}>{c.customer_name ?? c.customer_email}</span>
                    <span className="shrink-0 text-xs text-faint">{formatRelative(c.last_message_at)}</span>
                  </span>
                  <span className="truncate text-sm text-muted">{c.subject ?? "Conversation"}</span>
                  <span className="truncate text-xs text-faint">
                    {c.customer_email}
                    {c.status === "closed" && " · clôturée"}
                  </span>
                </span>
                {c.unread_shop && <span className="mt-2 size-2.5 shrink-0 rounded-full bg-ember-3" aria-label="Non lu" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

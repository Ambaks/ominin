import Link from "next/link";
import { ConversationsList } from "@/components/shop/gestion/conversations-list";
import { PageHeader } from "@/components/shop/gestion/page-header";
import { requireShopSession } from "@/lib/shop/server";

export default async function ShopMessagesPage({ searchParams }: PageProps<"/shop/gestion/messages">) {
  const { shop } = await requireShopSession();
  const { statut } = await searchParams;
  const status = statut === "closed" ? "closed" : statut === "all" ? "all" : "open";
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
      <ConversationsList shopId={shop.id} status={status} />
    </div>
  );
}

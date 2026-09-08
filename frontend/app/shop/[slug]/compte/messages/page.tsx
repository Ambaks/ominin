import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRightIcon, MessageIcon } from "@/components/shop/icons";
import { shopHref } from "@/components/shop/store/href";
import { ButtonLink, EmptyState } from "@/components/shop/store/ui";
import { formatRelative } from "@/lib/shop/format";
import { getCurrentUser, getShopBySlug, listConversationsForUser } from "@/lib/shop/server";

export const metadata: Metadata = { title: "Mes messages", robots: { index: false } };

export default async function AccountMessagesPage({ params }: PageProps<"/shop/[slug]/compte/messages">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(shopHref(slug, `/compte?next=${encodeURIComponent(shopHref(slug, "/compte/messages"))}`));
  const conversations = await listConversationsForUser(shop.id, user.id);

  return (
    <section className="shop-container py-12 md:py-20">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <nav className="text-xs text-shop-ink-soft">
          <Link href={shopHref(slug, "/compte")} className="hover:text-shop-ink">
            Mon compte
          </Link>{" "}
          / <span className="text-shop-ink">Mes messages</span>
        </nav>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-4xl">Mes messages</h1>
          <ButtonLink href={shopHref(slug, "/contact")} variant="secondary" size="sm">
            Nouveau message
          </ButtonLink>
        </div>
        {conversations.length === 0 ? (
          <EmptyState icon={<MessageIcon className="size-6" strokeWidth={1.5} />} title="Aucun échange pour le moment" description="Les messages envoyés depuis la page Contact en étant connectée apparaîtront ici." />
        ) : (
          <ul className="flex flex-col gap-3">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link href={shopHref(slug, `/compte/messages/${c.id}`)} className="group flex items-center gap-4 rounded-[20px] border border-shop-line bg-shop-paper px-6 py-5 transition hover:border-shop-accent-soft hover:shop-shadow">
                  {c.unread_customer && <span className="size-2.5 shrink-0 rounded-full bg-shop-accent" aria-label="Nouvelle réponse" />}
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="font-shop-display text-lg text-shop-ink">{c.subject ?? "Conversation"}</span>
                    <span className="text-xs text-shop-ink-soft">
                      {c.status === "closed" ? "Clôturée · " : ""}Dernier message {formatRelative(c.last_message_at)}
                    </span>
                  </div>
                  <ArrowRightIcon className="size-[18px] text-shop-ink-mute transition group-hover:text-shop-accent-deep" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

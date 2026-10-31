"use client";

import Link from "next/link";
import { useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPager } from "@/components/ui/list-pager";
import { formatRelative, initials } from "@/lib/shop/format";
import { fetchConversationsPage } from "@/lib/shop/gestion-lists";
import type { ShopConversation } from "@/lib/shop/types";
import { usePagedList } from "@/lib/use-paged-list";

const rowId = (conversation: ShopConversation) => conversation.id;

export function ConversationsList({ shopId, status }: { shopId: string; status: "open" | "closed" | "all" }) {
  const fetchPage = useCallback(
    (_search: string, limit: number, offset: number) => fetchConversationsPage(shopId, status, limit, offset),
    [shopId, status]
  );
  const list = usePagedList({ fetchPage, rowId });

  if (list.error != null && list.total === null) {
    return (
      <p role="alert" className="text-sm text-ember-3">
        Chargement impossible.{" "}
        <button type="button" onClick={() => void list.reload()} className="underline">
          Réessayer
        </button>
      </p>
    );
  }
  if (list.total === 0) {
    return <EmptyState title="Aucune conversation" body="Les messages de vos clientes apparaîtront ici." />;
  }
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface">
        {list.rows.map((c) => (
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
      <ListPager
        shown={list.rows.length}
        total={list.total ?? 0}
        pageSize={list.pageSize}
        loading={list.loading}
        onPageSize={list.setPageSize}
        onMore={() => void list.showMore()}
      />
    </div>
  );
}

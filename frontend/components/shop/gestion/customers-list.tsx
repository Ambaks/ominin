"use client";

import Link from "next/link";
import { useCallback } from "react";
import { TableShell, td, th } from "@/components/shop/gestion/page-header";
import { ListPager } from "@/components/ui/list-pager";
import { formatDate, formatPrice } from "@/lib/shop/format";
import { fetchCustomersPage } from "@/lib/shop/gestion-lists";
import type { ShopCustomerStat } from "@/lib/shop/types";
import { usePagedList } from "@/lib/use-paged-list";

const rowId = (customer: ShopCustomerStat) => customer.email ?? "";

export function CustomersList({ shopId }: { shopId: string }) {
  const fetchPage = useCallback(
    (search: string, limit: number, offset: number) => fetchCustomersPage(shopId, search, limit, offset),
    [shopId]
  );
  const list = usePagedList({ fetchPage, rowId });

  return (
    <div className="flex flex-col gap-3">
      <input
        value={list.search}
        onChange={(event) => list.setSearch(event.target.value)}
        placeholder="Nom ou e-mail"
        aria-label="Chercher une cliente"
        className="h-9 w-56 rounded-full border border-hairline bg-background px-4 text-sm outline-none placeholder:text-faint focus:border-ember-2/50"
      />
      {list.error != null && (
        <p role="alert" className="text-sm text-ember-3">
          Chargement impossible.{" "}
          <button type="button" onClick={() => void list.reload()} className="underline">
            Réessayer
          </button>
        </p>
      )}
      <TableShell>
        <thead>
          <tr>
            <th className={th}>Cliente</th>
            <th className={th}>Commandes</th>
            <th className={`${th} text-right`}>Total dépensé</th>
            <th className={th}>Première commande</th>
            <th className={th}>Dernière commande</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {list.total === 0 && (
            <tr>
              <td colSpan={6} className={`${td} py-10 text-center text-muted`}>
                {list.query ? "Aucune cliente ne correspond." : "Aucune cliente pour le moment."}
              </td>
            </tr>
          )}
          {list.rows.map((c) => (
            <tr key={c.email}>
              <td className={td}>
                <span className="block font-medium">{c.name}</span>
                <span className="block text-xs text-muted">{c.email}</span>
              </td>
              <td className={td}>{c.orders_count}</td>
              <td className={`${td} text-right font-semibold tabular-nums`}>{formatPrice(Number(c.total_spent_cents ?? 0))}</td>
              <td className={`${td} text-muted`}>{c.first_order_at ? formatDate(c.first_order_at) : "—"}</td>
              <td className={`${td} text-muted`}>{c.last_order_at ? formatDate(c.last_order_at) : "—"}</td>
              <td className={`${td} text-right`}>
                <Link href={`/gestion/commandes?q=${encodeURIComponent(c.email ?? "")}`} className="text-xs font-medium text-ember-1">
                  Ses commandes
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </TableShell>
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

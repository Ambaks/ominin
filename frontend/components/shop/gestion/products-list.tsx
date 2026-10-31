"use client";

import Link from "next/link";
import { useCallback } from "react";
import { TableShell, td, th } from "@/components/shop/gestion/page-header";
import { ProductActiveToggle } from "@/components/shop/gestion/settings";
import { ListPager } from "@/components/ui/list-pager";
import { BADGE_LABELS } from "@/lib/shop/constants";
import { formatPrice } from "@/lib/shop/format";
import { fetchProductsPage } from "@/lib/shop/gestion-lists";
import type { ProductWithImages } from "@/lib/shop/types";
import { usePagedList } from "@/lib/use-paged-list";

const rowId = (product: ProductWithImages) => product.id;

export function ProductsList({ shopId }: { shopId: string }) {
  const fetchPage = useCallback(
    (_search: string, limit: number, offset: number) => fetchProductsPage(shopId, limit, offset),
    [shopId]
  );
  const list = usePagedList({ fetchPage, rowId });

  return (
    <div className="flex min-w-0 flex-col gap-3">
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
            <th className={th}>Visible</th>
            <th className={th}>Produit</th>
            <th className={th}>Collection</th>
            <th className={`${th} text-right`}>Prix</th>
            <th className={th}>Stock</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {list.total === 0 && (
            <tr>
              <td colSpan={6} className={`${td} py-10 text-center text-muted`}>
                Aucun produit. Créez le premier.
              </td>
            </tr>
          )}
          {list.rows.map((p) => (
            <tr key={p.id}>
              <td className={td}>
                <ProductActiveToggle id={p.id} isActive={p.is_active} name={p.name} onChanged={() => void list.reload()} />
              </td>
              <td className={td}>
                <Link href={`/gestion/produits/${p.id}`} className="flex items-center gap-3">
                  <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-surface-raised">{p.shop_product_images[0] && <img src={p.shop_product_images[0].url} alt="" className="size-full object-cover" />}</span>
                  <span className="flex flex-col">
                    <span className="font-medium hover:text-ember-1">{p.name}</span>
                    <span className="text-xs text-muted">
                      /produit/{p.slug}
                      {p.badge && ` · ${BADGE_LABELS[p.badge]}`}
                      {p.is_featured && " · accueil"}
                    </span>
                  </span>
                </Link>
              </td>
              <td className={`${td} text-muted`}>{p.shop_categories?.name ?? "—"}</td>
              <td className={`${td} text-right font-semibold tabular-nums`}>{formatPrice(p.price_cents)}</td>
              <td className={`${td} ${p.stock != null && p.stock <= 2 ? "font-semibold text-ember-2" : "text-muted"}`}>{p.stock == null ? "Illimité" : p.stock}</td>
              <td className={`${td} text-right`}>
                <Link href={`/gestion/produits/${p.id}`} className="text-xs font-medium text-ember-1">
                  Modifier
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

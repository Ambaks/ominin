import Link from "next/link";
import { CategoriesManager } from "@/components/shop/gestion/managers";
import { PageHeader, primaryButton, TableShell, td, th } from "@/components/shop/gestion/page-header";
import { ProductActiveToggle } from "@/components/shop/gestion/settings";
import { BADGE_LABELS } from "@/lib/shop/constants";
import { formatPrice } from "@/lib/shop/format";
import { getAllCategories, getAllProducts, requireShopSession } from "@/lib/shop/server";

export default async function ShopProductsPage() {
  const { shop } = await requireShopSession();
  const [products, categories] = await Promise.all([getAllProducts(shop.id), getAllCategories(shop.id)]);
  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Produits"
        description={`${products.length} produit${products.length > 1 ? "s" : ""} · ${products.filter((p) => p.is_active).length} visible${products.filter((p) => p.is_active).length > 1 ? "s" : ""}`}
        actions={
          <Link href="/gestion/produits/nouveau" className={primaryButton}>
            + Nouveau produit
          </Link>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px] xl:items-start">
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
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className={`${td} py-10 text-center text-muted`}>
                  Aucun produit. Créez le premier.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id}>
                <td className={td}>
                  <ProductActiveToggle id={p.id} isActive={p.is_active} name={p.name} />
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
                <td className={`${td} text-muted`}>{categoryName(p.category_id)}</td>
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
        <CategoriesManager shopId={shop.id} categories={categories} />
      </div>
    </div>
  );
}

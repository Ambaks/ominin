import Link from "next/link";
import { CategoriesManager } from "@/components/shop/gestion/managers";
import { PageHeader, primaryButton } from "@/components/shop/gestion/page-header";
import { ProductsList } from "@/components/shop/gestion/products-list";
import { getAllCategories, getProductCounts, requireShopSession } from "@/lib/shop/server";

export default async function ShopProductsPage() {
  const { shop } = await requireShopSession();
  const [counts, categories] = await Promise.all([getProductCounts(shop.id), getAllCategories(shop.id)]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Produits"
        description={`${counts.total} produit${counts.total > 1 ? "s" : ""} · ${counts.active} visible${counts.active > 1 ? "s" : ""}`}
        actions={
          <Link href="/gestion/produits/nouveau" className={primaryButton}>
            + Nouveau produit
          </Link>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px] xl:items-start">
        <ProductsList shopId={shop.id} />
        <CategoriesManager shopId={shop.id} categories={categories} />
      </div>
    </div>
  );
}

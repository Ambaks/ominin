import { notFound } from "next/navigation";
import { PageHeader, secondaryButton } from "@/components/shop/gestion/page-header";
import { ProductForm } from "@/components/shop/gestion/product-form";
import { getAllCategories, getOptionGroups, getProductById, requireShopSession } from "@/lib/shop/server";

export default async function EditProductPage({ params }: PageProps<"/shop/gestion/produits/[id]">) {
  const { id } = await params;
  const { shop } = await requireShopSession();
  const [product, categories, optionGroups] = await Promise.all([getProductById(shop.id, id), getAllCategories(shop.id), getOptionGroups(shop.id)]);
  if (!product) notFound();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/gestion/produits", label: "Produits" }}
        title={product.name}
        description={product.is_active ? "Visible en boutique" : "Masqué"}
        actions={
          <a href={`/${shop.slug}/produit/${product.slug}`} target="_blank" rel="noopener" className={secondaryButton}>
            Voir la fiche
          </a>
        }
      />
      <ProductForm shopId={shop.id} product={product} categories={categories} optionGroups={optionGroups} />
    </div>
  );
}

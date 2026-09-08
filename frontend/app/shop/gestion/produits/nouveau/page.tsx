import { PageHeader } from "@/components/shop/gestion/page-header";
import { ProductForm } from "@/components/shop/gestion/product-form";
import { getAllCategories, getOptionGroups, requireShopSession } from "@/lib/shop/server";

export default async function NewProductPage() {
  const { shop } = await requireShopSession();
  const [categories, optionGroups] = await Promise.all([getAllCategories(shop.id), getOptionGroups(shop.id)]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/gestion/produits", label: "Produits" }} title="Nouveau produit" description="Visible en boutique dès l'enregistrement si « Visible » est coché." />
      <ProductForm shopId={shop.id} product={null} categories={categories} optionGroups={optionGroups} />
    </div>
  );
}

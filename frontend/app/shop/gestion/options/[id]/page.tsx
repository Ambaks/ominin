import { notFound } from "next/navigation";
import { OptionGroupForm } from "@/components/shop/gestion/option-group-form";
import { PageHeader } from "@/components/shop/gestion/page-header";
import { getOptionGroup, requireShopSession } from "@/lib/shop/server";

export default async function OptionGroupPage({ params }: PageProps<"/shop/gestion/options/[id]">) {
  const { id } = await params;
  const { shop } = await requireShopSession();
  const group = id === "nouveau" ? null : await getOptionGroup(shop.id, id);
  if (id !== "nouveau" && !group) notFound();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/gestion/options", label: "Options" }} title={group ? group.name : "Nouvelle liste"} description={group ? `${group.shop_option_values.length} valeurs` : "Par exemple la liste des parfums."} />
      <OptionGroupForm shopId={shop.id} group={group} />
    </div>
  );
}

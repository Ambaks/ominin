import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, primaryButton } from "@/components/shop/gestion/page-header";
import { getOptionGroups, requireShopSession } from "@/lib/shop/server";

export default async function ShopOptionsPage() {
  const { shop } = await requireShopSession();
  const groups = await getOptionGroups(shop.id);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Options"
        description="Listes de choix proposées sur les fiches produit (parfum, couleur, taille…)."
        actions={
          <Link href="/gestion/options/nouveau" className={primaryButton}>
            + Nouvelle liste
          </Link>
        }
      />
      {groups.length === 0 ? (
        <EmptyState title="Aucune liste d'options" body="Créez par exemple une liste « Parfum » avec les fragrances disponibles." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {groups.map((g) => {
            const available = g.shop_option_values.filter((v) => v.is_available).length;
            return (
              <li key={g.id}>
                <Link href={`/gestion/options/${g.id}`} className="flex flex-col gap-2 rounded-2xl border border-hairline bg-surface p-5 transition-colors hover:border-ember-2/40">
                  <span className="font-display text-lg font-medium">{g.name}</span>
                  <span className="text-xs text-muted">
                    {g.shop_option_values.length} valeur{g.shop_option_values.length > 1 ? "s" : ""} · {available} disponible{available > 1 ? "s" : ""}
                  </span>
                  <span className="line-clamp-2 text-sm text-muted">{g.shop_option_values.map((v) => v.label).join(" · ")}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

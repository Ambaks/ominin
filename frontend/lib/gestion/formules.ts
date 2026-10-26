import type { Article, Etape } from "@/lib/gestion/types";
import type { MenuCategory } from "@/lib/menu-data";

/**
 * Les choix d'une étape : les articles de sa catégorie, dans l'ordre de la
 * carte, puis ceux ajoutés un par un (qui l'emportent s'ils la recoupent). Un
 * article de la catégorie a pour id celui de l'article de la carte, comme
 * formule_line en base.
 */
export function etapeArticles(etape: Etape, categories: MenuCategory[]): Article[] {
  if (!etape.categoryId) return etape.articles;
  const items = categories.find((category) => category.id === etape.categoryId)?.items ?? [];
  const exclus = new Set([
    ...(etape.exclus ?? []),
    ...etape.articles.flatMap((article) => (article.itemId ? [article.itemId] : [])),
  ]);
  return [
    ...items
      .filter((item) => !exclus.has(item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
        supplement: etape.supplements?.[item.id] ?? 0,
        itemId: item.id,
        options: item.options,
      })),
    ...etape.articles,
  ];
}

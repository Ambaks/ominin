import { normalizeText } from "@/lib/admin/format";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";
import { etapeArticles } from "@/lib/gestion/formules";
import type { Article, Etape } from "@/lib/gestion/types";
import type { MenuCategory, OptionGroup } from "@/lib/menu-data";

/*
 * Le brouillon d'une étape, tel que le constructeur l'édite : les prix en
 * texte (« 1,50 »), convertis à l'enregistrement. Une étape est une catégorie
 * vivante (ses articles du moment, moins les retirés, plus des suppléments)
 * ou une liste fermée de plats de la carte. Les anciens choix hors carte
 * (sans itemId) sont gardés tels quels : la feuille ne sait plus en créer.
 */

/**
 * « Proposé d'office » (décision 18) : le plat présélectionné d'une étape.
 * Demandé à la tête pour `Etape` (lib/gestion/types.ts, gelé) ; en attendant,
 * la clé voyage dans le JSON `etapes` sous ce type local.
 */
export type EtapeAvecDefaut = Etape & { defaut?: string };

export interface ArticleDraft {
  id: string;
  name: string;
  detail: string;
  supplement: string;
  itemId?: string;
  /** Options d'un ancien choix hors carte, gardées telles quelles. */
  options?: OptionGroup[];
}

export interface EtapeDraft {
  id: string;
  name: string;
  obligatoire: boolean;
  categoryId?: string;
  exclus: string[];
  /** Suppléments des articles de la catégorie, en texte, par id d'article. */
  supplements: Record<string, string>;
  articles: ArticleDraft[];
  /** Plat proposé d'office au client (id de l'article de la carte). */
  defaut?: string;
}

/** Nom d'une liste fermée que le gérant n'a pas nommée. */
const LISTE_NAME = "Au choix";

export function emptyEtape(name = "", categoryId?: string): EtapeDraft {
  return {
    id: crypto.randomUUID(),
    name,
    obligatoire: true,
    categoryId,
    exclus: [],
    supplements: {},
    articles: [],
  };
}

/** La catégorie de la carte qui porte le nom d'une étape de modèle (« Nos plats »). */
export function modeleCategory(
  name: string,
  categories: MenuCategory[]
): MenuCategory | undefined {
  const word = new RegExp(`\\b${normalizeText(name)}s?\\b`);
  return categories.find((category) => word.test(normalizeText(category.name)));
}

/** Les étapes d'un modèle, chacune sur la catégorie qui porte son nom. */
export function modeleEtapes(
  modele: readonly string[],
  categories: MenuCategory[]
): EtapeDraft[] {
  return modele.map((name) => emptyEtape(name, modeleCategory(name, categories)?.id));
}

export function etapesToDraft(etapes: Etape[]): EtapeDraft[] {
  return etapes.map((etape) => ({
    id: etape.id,
    name: etape.name,
    obligatoire: etape.obligatoire,
    categoryId: etape.categoryId,
    exclus: etape.exclus ?? [],
    supplements: Object.fromEntries(
      Object.entries(etape.supplements ?? {}).map(([itemId, supplement]) => [
        itemId,
        priceToInput(supplement),
      ])
    ),
    articles: etape.articles.map((article) => ({
      id: article.id,
      name: article.name,
      detail: article.detail ?? "",
      supplement: article.supplement > 0 ? priceToInput(article.supplement) : "",
      itemId: article.itemId,
      options: article.options,
    })),
    defaut: (etape as EtapeAvecDefaut).defaut,
  }));
}

/**
 * Une étape sans nom prend celui de sa catégorie ; sans nom ni contenu, elle
 * n'est pas gardée. Une étape nommée mais vide reste : la formule s'enregistre
 * incomplète, marquée « À compléter », et le menu client ne la propose pas.
 */
export function draftToEtapes(
  drafts: EtapeDraft[],
  categories: MenuCategory[]
): Etape[] {
  return drafts.flatMap((draft) => {
    const articles: Article[] = draft.articles
      .map((article) => ({
        id: article.id,
        name: article.name.trim(),
        detail: article.detail.trim() || undefined,
        supplement: parsePriceInput(article.supplement) ?? 0,
        itemId: article.itemId,
        options: article.options,
      }))
      .filter((article) => article.name);
    const category = categories.find((c) => c.id === draft.categoryId);
    const supplements = Object.fromEntries(
      Object.entries(draft.supplements).flatMap(([itemId, text]) => {
        const supplement = parsePriceInput(text);
        return supplement && !draft.exclus.includes(itemId) ? [[itemId, supplement]] : [];
      })
    );
    const name =
      draft.name.trim() || category?.name || (articles.length ? LISTE_NAME : "");
    if (!name) return [];
    const etape: EtapeAvecDefaut = {
      id: draft.id,
      name,
      obligatoire: draft.obligatoire,
      ...(draft.categoryId && {
        categoryId: draft.categoryId,
        exclus: draft.exclus.length ? draft.exclus : undefined,
        supplements: Object.keys(supplements).length ? supplements : undefined,
      }),
      articles,
    };
    const choices = etapeArticles(etape, categories);
    if (draft.defaut && choices.some((choice) => choice.itemId === draft.defaut)) {
      etape.defaut = draft.defaut;
    }
    return [etape];
  });
}

/** Les choix qu'offre un brouillon d'étape, dans l'ordre de la carte. */
export function draftChoices(draft: EtapeDraft, categories: MenuCategory[]): Article[] {
  const [etape] = draftToEtapes([draft], categories);
  return etape ? etapeArticles(etape, categories) : [];
}

/** Une étape obligatoire sans aucun choix : le menu client ne propose pas la formule. */
export function etapeIncomplete(etape: Etape, categories: MenuCategory[]): boolean {
  return etape.obligatoire && etapeArticles(etape, categories).length === 0;
}

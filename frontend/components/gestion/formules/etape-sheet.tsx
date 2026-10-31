"use client";

import { useState } from "react";
import { ChevronDownIcon, XIcon } from "@/components/gestion/icons";
import { PrixInput } from "@/components/gestion/menu/prix-input";
import { Checkbox, Chip, Field, GlassButton, Input, Select, Switch } from "@/components/gestion/ui";
import type { MenuCategory, MenuItem } from "@/lib/menu-data";
import { carteOrder, draftChoices, type ArticleDraft, type EtapeDraft } from "./etape-draft";

/*
 * Le réglage d'une étape, dans la feuille du constructeur : « Parmi » une
 * catégorie (tous ses plats cochés, en décocher un le retire, un plat ajouté
 * plus tard entre de lui-même) ou des plats précis dans toute la carte. Un
 * « + € » par plat pour un supplément. Repliés : le nom pour le client, « le
 * client peut passer », « proposé d'office ». Les choix hors carte ne se
 * créent plus ici : le plat se crée sur la carte (décision 15).
 */

/** Valeur du sélecteur pour la liste fermée (aucune catégorie n'a cet id). */
const LISTE = "liste";
/** Valeur du sélecteur quand la catégorie de l'étape a été supprimée. */
const ORPHELINE = "orpheline";

/** Titre de la feuille pour une étape. */
export function etapeTitle(etape: EtapeDraft, index: number, categories: MenuCategory[]): string {
  return (
    etape.name.trim() ||
    categories.find((c) => c.id === etape.categoryId)?.name ||
    `Étape ${index + 1}`
  );
}

export function EtapeEditor({
  etape,
  categories,
  onChange,
}: {
  etape: EtapeDraft;
  categories: MenuCategory[];
  onChange: (etape: EtapeDraft) => void;
}) {
  const patch = (next: Partial<EtapeDraft>) => onChange({ ...etape, ...next });
  const category = categories.find((c) => c.id === etape.categoryId);
  const orphan = Boolean(etape.categoryId) && !category;
  const choices = draftChoices(etape, categories);
  const order = carteOrder(categories);
  // Ce que les listes ci-dessous ne montrent pas : anciens choix hors carte,
  // et plats d'une autre catégorie ajoutés un à un à une étape de catégorie.
  const visible = new Set((etape.categoryId ? (category?.items ?? []) : categories.flatMap((c) => c.items)).map((item) => item.id));
  const others = etape.articles.filter((article) => !article.itemId || !visible.has(article.itemId));
  // Ouvert à l'arrivée seulement : React réécrirait l'attribut sous la main.
  const [optionsOpen] = useState(!etape.obligatoire || Boolean(etape.defaut));

  const chooseCategory = (next: MenuCategory) => {
    const inCategory = (article: ArticleDraft) =>
      next.items.some((item) => item.id === article.itemId);
    // Ses plats déjà cochés un par un rejoignent la catégorie, avec leur supplément.
    patch({
      categoryId: next.id,
      // Un nom qui était celui de l'ancienne catégorie suit la nouvelle.
      name: etape.name.trim() === category?.name ? "" : etape.name,
      exclus: [],
      supplements: Object.fromEntries(
        etape.articles
          .filter((article) => inCategory(article) && article.supplement)
          .map((article) => [article.itemId!, article.supplement])
      ),
      articles: etape.articles.filter((article) => !inCategory(article)),
    });
  };

  const chooseList = () => {
    // La catégorie devient une liste fermée de ses plats gardés, suppléments compris.
    const kept = (category?.items ?? []).filter((item) => !etape.exclus.includes(item.id));
    patch({
      categoryId: undefined,
      name: etape.name.trim() === category?.name ? "" : etape.name,
      exclus: [],
      supplements: {},
      articles: [
        ...kept.map((item) => ({
          id: crypto.randomUUID(),
          name: item.name,
          detail: "",
          supplement: etape.supplements[item.id] ?? "",
          itemId: item.id,
        })),
        ...etape.articles,
      ],
    });
  };

  const toggleItem = (item: MenuItem) => {
    if (etape.categoryId) {
      const excluded = etape.exclus.includes(item.id);
      patch({
        exclus: excluded
          ? etape.exclus.filter((id) => id !== item.id)
          : [...etape.exclus, item.id],
      });
      return;
    }
    const picked = etape.articles.some((article) => article.itemId === item.id);
    // La liste garde l'ordre de la carte, comme le menu la lit.
    const byCarte = (a: ArticleDraft, b: ArticleDraft) =>
      (a.itemId ? (order.get(a.itemId) ?? Infinity) : Infinity) -
      (b.itemId ? (order.get(b.itemId) ?? Infinity) : Infinity);
    patch({
      articles: picked
        ? etape.articles.filter((article) => article.itemId !== item.id)
        : [
            ...etape.articles,
            { id: crypto.randomUUID(), name: item.name, detail: "", supplement: "", itemId: item.id },
          ].sort(byCarte),
    });
  };

  const supplementOf = (item: MenuItem) =>
    etape.categoryId
      ? (etape.supplements[item.id] ?? "")
      : (etape.articles.find((article) => article.itemId === item.id)?.supplement ?? "");

  const setSupplement = (item: MenuItem, supplement: string) =>
    etape.categoryId
      ? patch({ supplements: { ...etape.supplements, [item.id]: supplement } })
      : patch({
          articles: etape.articles.map((article) =>
            article.itemId === item.id ? { ...article, supplement } : article
          ),
        });

  const isPicked = (item: MenuItem) =>
    etape.categoryId
      ? !etape.exclus.includes(item.id)
      : etape.articles.some((article) => article.itemId === item.id);

  const groups = etape.categoryId ? (category ? [category] : []) : categories;

  return (
    <div className="flex flex-col gap-5">
      <Field
        label="Parmi"
        hint={
          orphan
            ? undefined
            : etape.categoryId
              ? "Toute la catégorie : un plat que vous y ajouterez plus tard entrera aussi dans la formule. Décochez ceux que vous ne voulez pas."
              : "Cochez des plats dans toute la carte."
        }
        error={orphan ? "Cette catégorie a été supprimée de la carte : choisissez-en une autre." : undefined}
      >
        <Select
          value={orphan ? ORPHELINE : (etape.categoryId ?? LISTE)}
          onChange={(event) => {
            const next = categories.find((c) => c.id === event.target.value);
            if (next) chooseCategory(next);
            else if (event.target.value === LISTE) chooseList();
          }}
        >
          {orphan && (
            <option value={ORPHELINE} disabled>
              Catégorie supprimée
            </option>
          )}
          {categories.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name} ({candidate.items.length})
            </option>
          ))}
          <option value={LISTE}>Des plats précis, dans toute la carte</option>
        </Select>
      </Field>

      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group.id} className="g-plate flex flex-col p-2">
            {!etape.categoryId && <p className="g-eyebrow px-2 pt-1.5 pb-1">{group.name}</p>}
            {group.items.length === 0 && (
              <p className="px-2 py-2 text-g-meta text-muted">Aucun plat dans cette catégorie.</p>
            )}
            {group.items.map((item) => (
              <ChoiceRow
                key={item.id}
                item={item}
                picked={isPicked(item)}
                supplement={supplementOf(item)}
                onToggle={() => toggleItem(item)}
                onSupplement={(value) => setSupplement(item, value)}
              />
            ))}
          </div>
        ))}
        <p className="text-g-meta text-muted">
          Un plat qui n&rsquo;existe que dans la formule ? Ajoutez-le d&rsquo;abord à la carte, puis cochez-le ici.
        </p>
      </div>

      {others.length > 0 && (
        <div className="g-plate flex flex-col gap-2 p-3">
          <p className="text-g-meta text-muted">
            Autres choix de cette étape, gardés tels quels : plats d&rsquo;une autre catégorie ou anciens choix hors carte.
          </p>
          {others.map((article) => (
            <div key={article.id} className="flex min-h-g-control items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-g-body">{article.name}</span>
              {!article.itemId && <Chip>hors carte</Chip>}
              {article.supplement && (
                <span className="text-g-meta text-muted tabular-nums">+{article.supplement} €</span>
              )}
              <GlassButton
                variant="icon"
                aria-label={`Retirer ${article.name}`}
                onClick={() =>
                  patch({ articles: etape.articles.filter((a) => a.id !== article.id) })
                }
              >
                <XIcon />
              </GlassButton>
            </div>
          ))}
        </div>
      )}

      <details open={optionsOpen} className="group">
        <summary className="flex min-h-g-control cursor-pointer list-none flex-col justify-center gap-0.5 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 text-g-body font-semibold">
            <ChevronDownIcon className="size-4 shrink-0 -rotate-90 text-muted transition-transform group-open:rotate-0 motion-reduce:transition-none" />
            Plus d&rsquo;options
          </span>
          <span className="pl-6 text-g-meta text-muted group-open:hidden">
            nom pour le client, étape facultative, proposé d&rsquo;office
          </span>
        </summary>
        <div className="flex flex-col gap-4 pt-3">
          <Field label="Nom de l'étape pour le client">
            <Input
              value={etape.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder={category?.name ?? "Au choix"}
            />
          </Field>
          <Switch
            checked={!etape.obligatoire}
            onChange={(skippable) => patch({ obligatoire: !skippable })}
            label="Le client peut passer cette étape"
            hint="Facultative : sans choix, la formule se commande quand même."
          />
          <Field label="Proposé d'office" hint="Coché d'avance pour le client.">
            <Select
              value={etape.defaut ?? ""}
              onChange={(event) => patch({ defaut: event.target.value || undefined })}
            >
              <option value="">Aucun</option>
              {choices
                .filter((choice) => choice.itemId)
                .map((choice) => (
                  <option key={choice.itemId} value={choice.itemId}>
                    {choice.name}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
      </details>
    </div>
  );
}

function ChoiceRow({
  item,
  picked,
  supplement,
  onToggle,
  onSupplement,
}: {
  item: MenuItem;
  picked: boolean;
  supplement: string;
  onToggle: () => void;
  onSupplement: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const showPrice = picked && (editing || supplement !== "");
  return (
    <div className="flex min-h-g-control items-center gap-2 px-2">
      <div className="min-w-0 flex-1">
        <Checkbox
          checked={picked}
          onChange={onToggle}
          label={<span className={`break-words ${picked ? "" : "text-muted line-through"}`}>{item.name}</span>}
        />
      </div>
      {showPrice ? (
        <PrixInput
          value={supplement}
          onChange={onSupplement}
          placeholder="+0,00"
          aria-label={`Supplément pour ${item.name}`}
          autoFocus={editing}
          className="w-28 shrink-0"
        />
      ) : (
        picked && (
          // Pastille cliquable : la zone tactile s'étend hors du dessin (44 px).
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Supplément pour ${item.name}`}
            className="g-chip g-press relative text-muted after:absolute after:-inset-y-2.5 after:inset-x-0 after:content-['']"
          >
            + €
          </button>
        )
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { XIcon } from "@/components/gestion/icons";
import { GlassButton } from "@/components/gestion/ui";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PriceInput } from "@/components/ui/price-input";
import { Toggle } from "@/components/ui/toggle";
import type { MenuCategory, MenuItem } from "@/lib/menu-data";
import { draftChoices, type ArticleDraft, type EtapeDraft } from "./etape-draft";

/*
 * La feuille d'une étape : « Parmi : » une catégorie (tous ses plats cochés,
 * en décocher un le retire, un plat ajouté plus tard entre de lui-même) ou
 * des plats précis dans toute la carte. Un « + € » par plat pour un
 * supplément. Repliés : le nom pour le client, « le client peut passer »,
 * « proposé d'office ». Les choix hors carte ne se créent plus ici : le plat
 * se crée sur la carte (décision 15).
 */
export function EtapeSheet({
  etape,
  index,
  categories,
  onChange,
  onRemove,
  onClose,
}: {
  etape: EtapeDraft;
  index: number;
  categories: MenuCategory[];
  onChange: (etape: EtapeDraft) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const patch = (next: Partial<EtapeDraft>) => onChange({ ...etape, ...next });
  const category = categories.find((c) => c.id === etape.categoryId);
  const choices = draftChoices(etape, categories);
  const legacy = etape.articles.filter((article) => !article.itemId);

  const chooseCategory = (next: MenuCategory) => {
    const inCategory = (article: ArticleDraft) =>
      next.items.some((item) => item.id === article.itemId);
    // Ses plats déjà cochés un par un rejoignent la catégorie, avec leur supplément.
    patch({
      categoryId: next.id,
      name: etape.name,
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
    patch({
      articles: picked
        ? etape.articles.filter((article) => article.itemId !== item.id)
        : [
            ...etape.articles,
            { id: crypto.randomUUID(), name: item.name, detail: "", supplement: "", itemId: item.id },
          ],
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

  const groups = etape.categoryId && category ? [category] : categories;
  const title = etape.name.trim() || category?.name || `Choix ${index + 1}`;

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <GlassButton className="mr-auto" onClick={onRemove}>
            Retirer cette étape
          </GlassButton>
          <GlassButton variant="primary" onClick={onClose}>
            OK
          </GlassButton>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-g-body font-semibold">Parmi :</legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((candidate) => {
              const active = candidate.id === etape.categoryId;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => active || chooseCategory(candidate)}
                  className={pick(active)}
                >
                  {candidate.name}
                  <span className={`text-g-meta tabular-nums ${active ? "" : "text-muted"}`}>
                    {candidate.items.length}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={!etape.categoryId}
              onClick={() => etape.categoryId && chooseList()}
              className={pick(!etape.categoryId)}
            >
              Des plats précis…
            </button>
          </div>
          <p className="text-g-meta text-muted">
            {etape.categoryId
              ? "Toute la catégorie : un plat que vous y ajouterez plus tard entrera aussi dans la formule. Décochez ceux que vous ne voulez pas."
              : "Cochez des plats dans toute la carte."}
          </p>
        </fieldset>

        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <div key={group.id} className="g-plate flex flex-col p-2">
              {!etape.categoryId && (
                <p className="g-eyebrow px-2 pt-1.5 pb-1">{group.name}</p>
              )}
              {group.items.length === 0 && (
                <p className="px-2 py-2 text-g-meta text-muted">Aucun plat dans cette catégorie.</p>
              )}
              {group.items.map((item) => {
                const picked = isPicked(item);
                const supplement = supplementOf(item);
                return (
                  <ChoiceRow
                    key={item.id}
                    item={item}
                    picked={picked}
                    supplement={supplement}
                    onToggle={() => toggleItem(item)}
                    onSupplement={(value) => setSupplement(item, value)}
                  />
                );
              })}
            </div>
          ))}
          <p className="text-g-meta text-muted">
            Un plat qui n&rsquo;existe que dans la formule ? Ajoutez-le d&rsquo;abord à la carte, puis cochez-le ici.
          </p>
        </div>

        {legacy.length > 0 && (
          <div className="g-plate flex flex-col gap-2 p-3">
            <p className="text-g-meta text-muted">
              Choix hors carte, gardés tels quels. Pour les modifier, créez-les sur la carte.
            </p>
            {legacy.map((article) => (
              <div key={article.id} className="flex min-h-g-control items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-g-body">{article.name}</span>
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

        <details open={!etape.obligatoire || Boolean(etape.defaut)} className="group">
          <summary className="flex min-h-g-control cursor-pointer list-none items-center justify-between gap-3 text-g-body font-semibold [&::-webkit-details-marker]:hidden">
            Plus d&rsquo;options
            <span className="text-g-meta font-normal text-muted group-open:hidden">
              nom pour le client, étape facultative, proposé d&rsquo;office
            </span>
          </summary>
          <div className="flex flex-col gap-4 pt-3">
            <Field label="Nom de l'étape pour le client">
              <input
                value={etape.name}
                onChange={(event) => patch({ name: event.target.value })}
                placeholder={category?.name ?? "Au choix"}
                className={inputClass}
              />
            </Field>
            <label className="flex min-h-g-control items-center gap-3 text-g-body">
              <Toggle
                checked={!etape.obligatoire}
                onChange={(skippable) => patch({ obligatoire: !skippable })}
                label="Le client peut passer cette étape"
              />
              Le client peut passer cette étape
            </label>
            <Field label="Proposé d'office" hint="Présélectionné : le client n'a qu'à confirmer.">
              <select
                value={etape.defaut ?? ""}
                onChange={(event) => patch({ defaut: event.target.value || undefined })}
                className={inputClass}
              >
                <option value="">Aucun</option>
                {choices
                  .filter((choice) => choice.itemId)
                  .map((choice) => (
                    <option key={choice.itemId} value={choice.itemId}>
                      {choice.name}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
        </details>
      </div>
    </Modal>
  );
}

const pick = (active: boolean) =>
  `g-press inline-flex min-h-g-control items-center gap-1.5 rounded-full px-3.5 text-g-label font-semibold ${
    active ? "ember-gradient text-background" : "border border-hairline text-foreground"
  }`;

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
      <label className="flex min-w-0 flex-1 items-center gap-2.5 text-g-body">
        <input
          type="checkbox"
          checked={picked}
          onChange={onToggle}
          className="size-4 shrink-0 accent-ember-2"
        />
        <span className={`truncate ${picked ? "" : "text-muted line-through"}`}>{item.name}</span>
      </label>
      {showPrice ? (
        <PriceInput
          value={supplement}
          onChange={onSupplement}
          placeholder="+0,00"
          className="w-28 shrink-0"
        />
      ) : (
        picked && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Supplément pour ${item.name}`}
            className="g-chip g-press text-muted"
          >
            + €
          </button>
        )
      )}
    </div>
  );
}

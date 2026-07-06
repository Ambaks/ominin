"use client";

import { useState } from "react";
import { CategoryManager } from "@/components/gestion/menu/category-manager";
import { ItemFormModal } from "@/components/gestion/menu/item-form-modal";
import { MenuItemCard } from "@/components/gestion/menu/menu-item-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { MenuItem } from "@/lib/menu-data";

export default function MenuPage() {
  const state = useGestion();
  const { can } = useGestionAccess();
  const toast = useToast();
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState<MenuItem | null>(null);
  const [managingCats, setManagingCats] = useState(false);

  if (!state) return null;

  const canEdit = can("menu.edit");
  const categories = state.categories;
  const category =
    categories.find((candidate) => candidate.id === activeCatId) ??
    categories[0];
  const importCandidates = categories
    .flatMap((candidate) => candidate.items)
    .filter((item) => item.options?.length);

  const editingCategoryId = editing
    ? categories.find((candidate) =>
        candidate.items.some((item) => item.id === editing.id)
      )?.id
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
          Menu
        </h1>
        {canEdit && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setManagingCats(true)}
              className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
            >
              Catégories
            </button>
            {category && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="ember-gradient rounded-full px-4 py-2 text-sm font-semibold text-background"
              >
                + Ajouter un article
              </button>
            )}
          </div>
        )}
      </div>

      {!category ? (
        <EmptyState
          title="Aucune catégorie"
          body="Créez une première catégorie pour organiser votre menu."
          action={
            canEdit && (
              <button
                type="button"
                onClick={() => setManagingCats(true)}
                className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
              >
                Créer une catégorie
              </button>
            )
          }
        />
      ) : (
        <>
          <PillTabs
            tabs={categories.map((candidate) => ({
              id: candidate.id,
              label: candidate.name,
              count: candidate.items.length,
            }))}
            activeId={category.id}
            onSelect={setActiveCatId}
          />

          {canEdit ? (
            <input
              key={category.id}
              defaultValue={category.tagline ?? ""}
              placeholder="Note de catégorie affichée sur le menu client…"
              onBlur={async (event) => {
                const value = event.target.value;
                if (value.trim() === (category.tagline ?? "")) return;
                await api.updateCategoryTagline(category.id, value);
                toast.success("Note enregistrée.");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="border-b border-hairline bg-transparent pb-2 font-display text-base italic text-muted outline-none transition-colors placeholder:text-faint focus:border-ember-2/50 lg:text-sm"
            />
          ) : (
            category.tagline && (
              <p className="font-display text-sm italic text-muted">
                {category.tagline}
              </p>
            )
          )}

          {category.items.length === 0 ? (
            <EmptyState
              title="Catégorie vide"
              body="Ajoutez un premier article à cette catégorie."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {category.items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onEdit={() => setEditing(item)}
                  onDelete={() => setDeleting(item)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {(creating || editing) && category && (
        <ItemFormModal
          item={editing ?? undefined}
          initialCategoryId={editingCategoryId ?? category.id}
          categories={categories}
          importCandidates={importCandidates.filter(
            (item) => item.id !== editing?.id
          )}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Supprimer « ${deleting.name} » ?`}
          message="L'article sera retiré définitivement du menu."
          confirmLabel="Supprimer"
          destructive
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api.deleteItem(deleting.id);
            setDeleting(null);
            toast.success("Article supprimé.");
          }}
        />
      )}

      {managingCats && (
        <CategoryManager categories={categories} onClose={() => setManagingCats(false)} />
      )}
    </div>
  );
}

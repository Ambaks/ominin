"use client";

import { useState } from "react";
import { FormuleCard } from "@/components/gestion/formules/formule-card";
import { FormuleFormModal } from "@/components/gestion/formules/formule-form-modal";
import { CategoryManager } from "@/components/gestion/menu/category-manager";
import { ItemFormModal } from "@/components/gestion/menu/item-form-modal";
import { MenuItemCard } from "@/components/gestion/menu/menu-item-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useRunMutation } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { Formule } from "@/lib/gestion/types";
import type { MenuItem } from "@/lib/menu-data";

type View = "menu" | "formules";

export default function MenuPage() {
  const state = useGestion();
  const { can } = useGestionAccess();
  const run = useRunMutation();
  const [view, setView] = useState<View>("menu");
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [creatingItem, setCreatingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  const [managingCats, setManagingCats] = useState(false);
  const [creatingFormule, setCreatingFormule] = useState(false);
  const [editingFormule, setEditingFormule] = useState<Formule | null>(null);
  const [deletingFormule, setDeletingFormule] = useState<Formule | null>(null);

  if (!state) return null;

  const canEditMenu = can("menu.edit");
  const canEditFormules = can("formules.edit");
  const categories = state.categories;
  const category =
    categories.find((c) => c.id === activeCatId) ?? categories[0];
  const importCandidates = categories
    .flatMap((c) => c.items)
    .filter((item) => item.options?.length);
  const editingCategoryId = editingItem
    ? categories.find((c) => c.items.some((item) => item.id === editingItem.id))?.id
    : undefined;
  const menuItems = categories.flatMap((c) => c.items);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex rounded-full border border-hairline p-1">
            <button
              type="button"
              onClick={() => setView("menu")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                view === "menu"
                  ? "ember-gradient text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Menu
            </button>
            <button
              type="button"
              onClick={() => setView("formules")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                view === "formules"
                  ? "ember-gradient text-background"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Formules
            </button>
          </div>
        </div>

        {view === "menu" && canEditMenu && (
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
                onClick={() => setCreatingItem(true)}
                className="ember-gradient rounded-full px-4 py-2 text-sm font-semibold text-background"
              >
                + Ajouter un article
              </button>
            )}
          </div>
        )}

        {view === "formules" && canEditFormules && (
          <button
            type="button"
            onClick={() => setCreatingFormule(true)}
            className="ember-gradient shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-background"
          >
            + Nouvelle formule
          </button>
        )}
      </div>

      {view === "menu" && (
        <>
          {!category ? (
            <EmptyState
              title="Aucune catégorie"
              body="Créez une première catégorie pour organiser votre menu."
              action={
                canEditMenu && (
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
                tabs={categories.map((c) => ({
                  id: c.id,
                  label: c.name,
                  count: c.items.length,
                }))}
                activeId={category.id}
                onSelect={setActiveCatId}
              />

              {canEditMenu ? (
                <input
                  key={category.id}
                  defaultValue={category.tagline ?? ""}
                  placeholder="Note de catégorie affichée sur le menu client…"
                  onBlur={(event) => {
                    const value = event.target.value;
                    if (value.trim() === (category.tagline ?? "")) return;
                    void run(
                      () => api.updateCategoryTagline(category.id, value),
                      "Note enregistrée."
                    );
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
                      onEdit={() => setEditingItem(item)}
                      onDelete={() => setDeletingItem(item)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {view === "formules" && (
        <>
          <p className="text-sm text-muted">
            Les formules s'affichent au-dessus des catégories sur le menu
            client — inutile de créer une catégorie pour elles.
          </p>

          {state.formules.length === 0 ? (
            <EmptyState
              title="Aucune formule"
              body="Créez une formule pour proposer un menu à étapes (entrée + plat + dessert…)."
              action={
                canEditFormules && (
                  <button
                    type="button"
                    onClick={() => setCreatingFormule(true)}
                    className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
                  >
                    Créer une formule
                  </button>
                )
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {state.formules.map((formule) => (
                <FormuleCard
                  key={formule.id}
                  formule={formule}
                  onEdit={() => setEditingFormule(formule)}
                  onDelete={() => setDeletingFormule(formule)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {(creatingItem || editingItem) && category && (
        <ItemFormModal
          item={editingItem ?? undefined}
          initialCategoryId={editingCategoryId ?? category.id}
          categories={categories}
          importCandidates={importCandidates.filter(
            (item) => item.id !== editingItem?.id
          )}
          onClose={() => {
            setCreatingItem(false);
            setEditingItem(null);
          }}
        />
      )}

      {deletingItem && (
        <ConfirmDialog
          title={`Supprimer « ${deletingItem.name} » ?`}
          message="L'article sera retiré définitivement du menu."
          confirmLabel="Supprimer"
          destructive
          onClose={() => setDeletingItem(null)}
          onConfirm={() =>
            void run(async () => {
              await api.deleteItem(deletingItem.id);
              setDeletingItem(null);
            }, "Article supprimé.")
          }
        />
      )}

      {managingCats && (
        <CategoryManager categories={categories} onClose={() => setManagingCats(false)} />
      )}

      {(creatingFormule || editingFormule) && (
        <FormuleFormModal
          formule={editingFormule ?? undefined}
          menuItems={menuItems}
          onClose={() => {
            setCreatingFormule(false);
            setEditingFormule(null);
          }}
        />
      )}

      {deletingFormule && (
        <ConfirmDialog
          title={`Supprimer « ${deletingFormule.name} » ?`}
          message="La formule sera retirée définitivement du menu."
          confirmLabel="Supprimer"
          destructive
          onClose={() => setDeletingFormule(null)}
          onConfirm={() =>
            void run(async () => {
              await api.deleteFormule(deletingFormule.id);
              setDeletingFormule(null);
            }, "Formule supprimée.")
          }
        />
      )}
    </div>
  );
}

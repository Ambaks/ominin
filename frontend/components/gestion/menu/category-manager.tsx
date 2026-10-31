"use client";

import { useState } from "react";
import { ChevronDownIcon, TrashIcon } from "@/components/gestion/icons";
import { Chip, GlassButton } from "@/components/gestion/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useRunMutation } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import type { MenuCategory } from "@/lib/menu-data";
import { moved } from "@/lib/move";

export function CategoryManager({
  categories,
  onClose,
}: {
  categories: MenuCategory[];
  onClose: () => void;
}) {
  const run = useRunMutation();
  const [newName, setNewName] = useState("");
  const [deleting, setDeleting] = useState<MenuCategory | null>(null);

  const move = async (index: number, delta: -1 | 1) => {
    const ids = moved(
      categories.map((category) => category.id),
      index,
      delta
    );
    await run(() => api.reorderCategories(ids));
  };

  const rename = async (category: MenuCategory, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === category.name) return;
    await run(() => api.renameCategory(category.id, trimmed), "Catégorie renommée.");
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    await run(async () => {
      await api.createCategory(trimmed);
      setNewName("");
    }, "Catégorie ajoutée.");
  };

  return (
    <Modal title="Catégories" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-g-meta text-muted">
          Dans l&rsquo;ordre où vos clients les lisent. Tapez dans un nom pour le changer.
        </p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {categories.map((category, index) => (
            <li key={category.id} className="g-plate flex items-center gap-2 p-2">
              <input
                defaultValue={category.name}
                onBlur={(event) => rename(category, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                aria-label={`Nom de la catégorie ${category.name}`}
                className={`${inputClass} min-w-0 flex-1`}
              />
              <Chip>
                {category.items.length} article{category.items.length > 1 ? "s" : ""}
              </Chip>
              <GlassButton
                variant="icon"
                disabled={index === 0}
                onClick={() => void move(index, -1)}
                aria-label={`Monter ${category.name}`}
              >
                <ChevronDownIcon className="rotate-180" />
              </GlassButton>
              <GlassButton
                variant="icon"
                disabled={index === categories.length - 1}
                onClick={() => void move(index, 1)}
                aria-label={`Descendre ${category.name}`}
              >
                <ChevronDownIcon />
              </GlassButton>
              <GlassButton
                variant="icon"
                onClick={() => setDeleting(category)}
                aria-label={`Supprimer ${category.name}`}
              >
                <TrashIcon />
              </GlassButton>
            </li>
          ))}
        </ul>

        <form onSubmit={add} className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Nouvelle catégorie">
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Entrées, pizzas, boissons…"
                data-autofocus={categories.length === 0 ? "" : undefined}
                className={inputClass}
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={!newName.trim()}
            className="g-btn g-btn-primary g-press shrink-0"
          >
            Ajouter
          </button>
        </form>
      </div>

      {deleting && (
        <ConfirmDialog
          title={`Supprimer « ${deleting.name} » ?`}
          message={
            deleting.items.length > 0
              ? `Les ${deleting.items.length} articles de cette catégorie seront également supprimés.`
              : "Cette catégorie est vide."
          }
          confirmLabel="Supprimer"
          destructive
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            void run(async () => {
              await api.deleteCategory(deleting.id);
              setDeleting(null);
            }, "Catégorie supprimée.")
          }
        />
      )}
    </Modal>
  );
}

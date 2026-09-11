"use client";

import { useState } from "react";
import { ChevronDownIcon, TrashIcon } from "@/components/gestion/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { inputClass } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
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
      <div className="flex flex-col gap-2">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className="flex items-center gap-2 rounded-2xl border border-hairline bg-background p-2"
          >
            <input
              defaultValue={category.name}
              onBlur={(event) => rename(category, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              aria-label={`Nom de la catégorie ${category.name}`}
              className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-base outline-none transition-colors focus:border-ember-2/50 focus:bg-surface lg:pointer-fine:text-sm"
            />
            <span className="w-6 shrink-0 text-center text-xs tabular-nums text-faint">
              {category.items.length}
            </span>
            <IconButton
              disabled={index === 0}
              onClick={() => void move(index, -1)}
              aria-label={`Monter ${category.name}`}
            >
              <ChevronDownIcon className="size-4 rotate-180" />
            </IconButton>
            <IconButton
              disabled={index === categories.length - 1}
              onClick={() => void move(index, 1)}
              aria-label={`Descendre ${category.name}`}
            >
              <ChevronDownIcon className="size-4" />
            </IconButton>
            <IconButton
              tone="danger"
              onClick={() => setDeleting(category)}
              aria-label={`Supprimer ${category.name}`}
            >
              <TrashIcon className="size-4" />
            </IconButton>
          </div>
        ))}

        <form onSubmit={add} className="mt-2 flex gap-2">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nouvelle catégorie"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="ember-gradient shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
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

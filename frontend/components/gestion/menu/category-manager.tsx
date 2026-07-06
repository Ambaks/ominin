"use client";

import { useState } from "react";
import { ChevronDownIcon, TrashIcon } from "@/components/gestion/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import type { MenuCategory } from "@/lib/menu-data";

export function CategoryManager({
  categories,
  onClose,
}: {
  categories: MenuCategory[];
  onClose: () => void;
}) {
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [deleting, setDeleting] = useState<MenuCategory | null>(null);

  const move = async (index: number, delta: -1 | 1) => {
    const ids = categories.map((category) => category.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    await api.reorderCategories(ids);
  };

  const rename = async (category: MenuCategory, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === category.name) return;
    await api.renameCategory(category.id, trimmed);
    toast.success("Catégorie renommée.");
  };

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    await api.createCategory(trimmed);
    setNewName("");
    toast.success("Catégorie ajoutée.");
  };

  return (
    <Modal title="Catégories" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className="flex items-center gap-1.5 rounded-xl border border-hairline bg-background p-2"
          >
            <input
              defaultValue={category.name}
              onBlur={(event) => rename(category, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="min-w-0 flex-1 bg-transparent px-2 py-1 text-base outline-none lg:text-sm"
            />
            <span className="shrink-0 text-xs tabular-nums text-faint">
              {category.items.length}
            </span>
            <button
              type="button"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label={`Monter ${category.name}`}
              className="rounded-full p-1.5 text-muted transition-colors hover:text-foreground disabled:opacity-30"
            >
              <ChevronDownIcon className="size-3.5 rotate-180" />
            </button>
            <button
              type="button"
              disabled={index === categories.length - 1}
              onClick={() => move(index, 1)}
              aria-label={`Descendre ${category.name}`}
              className="rounded-full p-1.5 text-muted transition-colors hover:text-foreground disabled:opacity-30"
            >
              <ChevronDownIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeleting(category)}
              aria-label={`Supprimer ${category.name}`}
              className="rounded-full p-1.5 text-muted transition-colors hover:text-ember-3"
            >
              <TrashIcon className="size-3.5" />
            </button>
          </div>
        ))}

        <form onSubmit={add} className="mt-1 flex gap-2">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nouvelle catégorie"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="ember-gradient shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
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
          onConfirm={async () => {
            await api.deleteCategory(deleting.id);
            setDeleting(null);
            toast.success("Catégorie supprimée.");
          }}
        />
      )}
    </Modal>
  );
}

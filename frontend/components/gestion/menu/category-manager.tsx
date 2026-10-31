"use client";

import { useState } from "react";
import { ChevronDownIcon, TrashIcon } from "@/components/gestion/icons";
import { Chip, ConfirmSheet, Field, GlassButton, Input, Sheet } from "@/components/gestion/ui";
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

  // La confirmation remplace la feuille : imbriquée, Échap fermerait les deux.
  if (deleting) {
    return (
      <ConfirmSheet
        title={`Supprimer « ${deleting.name} » ?`}
        text={
          deleting.items.length > 0
            ? `Ses ${deleting.items.length} article${deleting.items.length > 1 ? "s" : ""} disparaîtront aussi du menu, définitivement.`
            : "Cette catégorie est vide."
        }
        confirmLabel="Supprimer la catégorie"
        destructive
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          void run(async () => {
            await api.deleteCategory(deleting.id);
            setDeleting(null);
          }, "Catégorie supprimée.")
        }
      />
    );
  }

  return (
    <Sheet
      title="Catégories"
      description="Dans l'ordre où vos clients les lisent. Tapez dans un nom pour le changer."
      onClose={onClose}
      footer={<GlassButton onClick={onClose}>Fermer</GlassButton>}
    >
      <div className="flex flex-col gap-4">
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {categories.map((category, index) => (
            <li key={category.id} className="flex flex-wrap items-center gap-2">
              <Input
                key={category.name}
                defaultValue={category.name}
                onBlur={(event) => rename(category, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                aria-label={`Nom de la catégorie ${category.name}`}
                className="min-w-0 flex-1 basis-full sm:basis-0"
              />
              <Chip>
                {category.items.length} article{category.items.length > 1 ? "s" : ""}
              </Chip>
              <GlassButton
                variant="icon"
                className="ml-auto"
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
          <Field label="Nouvelle catégorie" className="flex-1">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Entrées, pizzas, boissons…"
              data-autofocus={categories.length === 0 ? "" : undefined}
            />
          </Field>
          <GlassButton type="submit" variant="primary" disabled={!newName.trim()} className="shrink-0">
            Ajouter
          </GlassButton>
        </form>
      </div>

    </Sheet>
  );
}

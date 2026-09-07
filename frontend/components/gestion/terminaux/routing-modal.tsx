"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { MenuCategory } from "@/lib/menu-data";
import { loadRouting, saveRouting, type Printer } from "@/lib/gestion/terminaux";

export function RoutingModal({
  printer,
  categories,
  onClose,
  onSaved,
}: {
  printer: Printer;
  categories: MenuCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadRouting(printer.id).then(
      (ids) => setSelected(new Set(ids)),
      () => toast.error("Impossible de charger le routage.")
    );
  }, [printer.id, toast]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (cat: MenuCategory) => {
    setSelected((prev) => {
      if (!prev) return prev;
      const ids = cat.items.map((i) => i.id);
      const allSelected = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await saveRouting(printer.id, [...selected]);
      toast.success(`Routage de ${printer.name} enregistré.`);
      onSaved();
      onClose();
    } catch {
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setBusy(false);
    }
  };

  const allItems = categories.flatMap((c) => c.items);
  const allSelected = selected != null && allItems.length > 0 && allItems.every((i) => selected.has(i.id));
  const noneSelected = selected != null && allItems.every((i) => !selected.has(i.id));

  return (
    <Modal
      title={`Produits · ${printer.name}`}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || selected == null}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
          >
            Enregistrer
          </button>
        </>
      }
    >
      {selected == null ? (
        <div aria-busy className="flex flex-col gap-3">
          <div className="shimmer h-8 rounded-xl" />
          <div className="shimmer h-8 rounded-xl" />
          <div className="shimmer h-8 rounded-xl" />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-xs text-faint">
            {noneSelected
              ? "Aucun produit sélectionné — tous les articles sortiront sur cette imprimante."
              : `${selected.size} produit${selected.size > 1 ? "s" : ""} sélectionné${selected.size > 1 ? "s" : ""} — seuls ceux-ci sortiront sur cette imprimante.`}
          </p>

          <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allSelected && !noneSelected;
              }}
              onChange={() => {
                const next = new Set<string>();
                if (!allSelected) for (const i of allItems) next.add(i.id);
                setSelected(next);
              }}
              className="accent-ember-1 size-4"
            />
            Tous les produits
          </label>

          {categories.map((cat) => {
            const catIds = cat.items.map((i) => i.id);
            const catAll = catIds.length > 0 && catIds.every((id) => selected.has(id));
            const catNone = catIds.every((id) => !selected.has(id));
            return (
              <div key={cat.id} className="flex flex-col gap-1.5">
                <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-muted">
                  <input
                    type="checkbox"
                    checked={catAll}
                    ref={(el) => {
                      if (el) el.indeterminate = !catAll && !catNone;
                    }}
                    onChange={() => toggleCategory(cat)}
                    className="accent-ember-1 size-4"
                  />
                  {cat.name}
                </label>
                <div className="ml-7 flex flex-col gap-1">
                  {cat.items.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-1 text-sm transition-colors hover:bg-surface"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className="accent-ember-1 size-4"
                      />
                      {item.name}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

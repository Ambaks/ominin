"use client";

import { EditIcon, MenuIcon, TrashIcon } from "@/components/gestion/icons";
import { useRunMutation, useToast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import * as api from "@/lib/gestion/api";
import { isItemAvailable } from "@/lib/gestion/selectors";
import { useGestionAccess } from "@/lib/gestion/store";
import { BADGE_LABELS, formatPrice, type MenuItem } from "@/lib/menu-data";

export function MenuItemCard({
  item,
  onEdit,
  onDelete,
}: {
  item: MenuItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { can } = useGestionAccess();
  const toast = useToast();
  const run = useRunMutation();
  const canEdit = can("menu.edit");
  const canAvailability = can("menu.availability");
  const available = isItemAvailable(item);
  const enVente = item.disponible !== false;

  const commitStock = async (raw: string) => {
    const trimmed = raw.trim();
    const stock = trimmed === "" ? null : Number.parseInt(trimmed, 10);
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
      toast.error("Stock invalide.");
      return;
    }
    if ((item.stock ?? null) === stock) return;
    await run(() => api.setItemStock(item.id, stock), "Stock mis à jour.");
  };

  return (
    <article
      className={`flex gap-4 rounded-2xl border border-hairline bg-surface p-4 ${
        available ? "" : "opacity-60"
      }`}
    >
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL saisie par l'utilisateur, hors remotePatterns de next/image
        <img
          src={item.image}
          alt=""
          className="size-16 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-background text-faint">
          <MenuIcon className="size-5" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium">{item.name}</h3>
            {item.detail && (
              <p className="font-display text-xs italic text-ember-1/85">
                {item.detail}
              </p>
            )}
          </div>
          <span className="shrink-0 font-display text-base text-ember-1">
            {formatPrice(item.price)}
          </span>
        </div>

        {item.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted">
            {item.description}
          </p>
        )}

        {item.badges && item.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.badges.map((badge) => (
              <span
                key={badge}
                className="ember-text rounded-full border border-ember-2/35 bg-background/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              >
                {BADGE_LABELS[badge]}
              </span>
            ))}
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-xs text-muted">
            <Toggle
              checked={enVente}
              disabled={!canAvailability}
              onChange={(checked) =>
                void run(
                  () => api.setItemAvailability(item.id, checked),
                  checked ? "Article remis en vente." : "Article retiré de la vente."
                )
              }
              label={`Disponibilité de ${item.name}`}
            />
            {enVente ? (item.stock === 0 ? "Épuisé" : "En vente") : "Retiré"}
          </label>

          <label className="flex items-center gap-1.5 text-xs text-muted">
            Stock
            <input
              key={`${item.id}-${item.stock ?? ""}`}
              defaultValue={item.stock ?? ""}
              disabled={!canAvailability}
              inputMode="numeric"
              placeholder="∞"
              onBlur={(event) => commitStock(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="w-14 rounded-lg border border-hairline bg-background px-2 py-1 text-center text-base outline-none transition-colors placeholder:text-faint focus:border-ember-2/50 disabled:opacity-40 lg:text-xs"
            />
          </label>

          {canEdit && (
            <span className="ml-auto flex gap-1">
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Modifier ${item.name}`}
                className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
              >
                <EditIcon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label={`Supprimer ${item.name}`}
                className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-3/50 hover:text-ember-3"
              >
                <TrashIcon className="size-3.5" />
              </button>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

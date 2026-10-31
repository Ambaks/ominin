"use client";

import {
  AlertIcon,
  ChevronDownIcon,
  EditIcon,
  MenuIcon,
  TrashIcon,
} from "@/components/gestion/icons";
import { Chip, GlassButton, Input, Plate, Select, Switch } from "@/components/gestion/ui";
import { useRunMutation, useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { isItemAvailable } from "@/lib/gestion/selectors";
import { useGestionAccess } from "@/lib/gestion/store";
import type { Printer } from "@/lib/gestion/terminaux";
import { allergenLine, BADGE_LABELS, formatPrice } from "@/lib/menu/format";
import {
  hasBlockedRequiredGroup,
  isChoiceAvailable,
  type MenuItem,
} from "@/lib/menu-data";

export function MenuItemCard({
  item,
  drink = false,
  printers = [],
  printerId = null,
  canRoute = false,
  first = false,
  last = false,
  tarifs,
  closedBy,
  onMove,
  onEdit,
  onDelete,
  onPrinterChange,
}: {
  item: MenuItem;
  /** Rangé dans une catégorie de boissons : le menu n'en montre pas les allergènes. */
  drink?: boolean;
  printers?: Printer[];
  printerId?: string | null;
  canRoute?: boolean;
  /** Bornes de sa catégorie : la flèche correspondante se grise. */
  first?: boolean;
  last?: boolean;
  /** Pastilles des tarifs planifiés de cet article (TarifsInline). */
  tarifs?: React.ReactNode;
  /** Fermeture qui le coupe en ce moment : le client le voit « Plus servi ». */
  closedBy?: string;
  /** Absent, l'ordre ne se change pas d'ici. */
  onMove?: (delta: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrinterChange?: (printerId: string | null) => void;
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
      toast.error("Stock refusé. Un nombre entier, ou vide pour illimité.");
      return;
    }
    if ((item.stock ?? null) === stock) return;
    await run(() => api.setItemStock(item.id, stock), "Stock mis à jour.");
  };

  return (
    <Plate
      // La première fiche de la catégorie sert d'exemple à la visite de la Carte.
      data-visite={first ? "menu-article" : undefined}
      // min-w-0 : un nom long tient sur deux lignes au lieu d'élargir la grille.
      className="flex min-w-0 gap-4 p-4"
    >
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL saisie par l'utilisateur, hors remotePatterns de next/image
        <img src={item.image} alt="" className="size-16 shrink-0 rounded-g-card object-cover" />
      ) : (
        <div className="flex size-16 shrink-0 items-center justify-center rounded-g-card border border-hairline text-faint">
          <MenuIcon className="size-5" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* Le nom ouvre la fiche, comme le crayon : la cible naturelle au doigt. */}
            <h3 className="text-g-body font-semibold break-words">
              {canEdit ? (
                // Le crayon reste l'arrêt du clavier : le nom ne double pas la tabulation.
                <button type="button" tabIndex={-1} onClick={onEdit} className="cursor-pointer text-left">
                  <span className="line-clamp-2">{item.name}</span>
                </button>
              ) : (
                <span className="line-clamp-2">{item.name}</span>
              )}
            </h3>
            {item.detail && <p className="text-g-meta text-muted">{item.detail}</p>}
            {item.printName && (
              <p className="text-g-meta text-muted">Ticket : {item.printName}</p>
            )}
          </div>
          <span className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="g-money text-g-body font-semibold text-g-entity tabular-nums">
              {formatPrice(item.price)}
            </span>
            {!available && (
              <Chip tone="problem">
                {!enVente ? "Retiré" : item.stock === 0 ? "Épuisé" : "Options épuisées"}
              </Chip>
            )}
          </span>
        </div>

        {item.description && (
          <p className="line-clamp-2 text-g-meta text-muted break-words">{item.description}</p>
        )}

        {/* Ce qui manque encore se lit : sans allergènes, le menu renvoie le client à l'équipe. */}
        {!drink && (
          <p className="text-g-meta text-muted">
            {item.allergens === undefined
              ? "Allergènes non renseignés"
              : item.allergens.length === 0
                ? "Aucun allergène"
                : allergenLine(item.allergens)}
          </p>
        )}

        {item.badges && item.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.badges.map((badge) => (
              <Chip key={badge}>{BADGE_LABELS[badge]}</Chip>
            ))}
          </div>
        )}

        {tarifs}

        {item.options && item.options.length > 0 && (
          <div className="flex flex-col gap-2 rounded-g-card border border-hairline p-3">
            {/* Au doigt, pas d'infobulle : le geste est dit en clair. */}
            <p className="text-g-meta text-muted">
              {canAvailability
                ? "Touchez un choix pour le marquer épuisé, puis pour le remettre."
                : "Options : ✓ disponible, ✕ épuisé."}
            </p>
            {item.options.map((group) => (
              <div
                key={group.id}
                role="group"
                aria-label={`${group.name} : disponibilité`}
                className="flex flex-wrap items-center gap-1.5"
              >
                <span className="g-eyebrow mr-0.5">{group.name}</span>
                {group.choices.map((choice) => {
                  const ok = isChoiceAvailable(choice);
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={!canAvailability}
                      aria-pressed={ok}
                      aria-label={`${choice.name} : ${ok ? "disponible" : "épuisé"}`}
                      onClick={() =>
                        void run(
                          () => api.setChoiceAvailability(item.id, group.id, choice.id, !ok),
                          ok ? `${choice.name} : épuisé.` : `${choice.name} : de nouveau disponible.`
                        )
                      }
                      className={`g-press flex min-h-g-control max-w-full items-center gap-1.5 rounded-full border px-3 text-g-meta font-semibold disabled:cursor-default ${
                        ok
                          ? "border-status-signed/40 text-foreground"
                          : "g-chip-problem text-foreground"
                      }`}
                    >
                      <span aria-hidden>{ok ? "✓" : "✕"}</span>
                      <span className={`truncate ${ok ? "" : "line-through"}`}>{choice.name}</span>
                      {!ok && <span className="font-normal">épuisé</span>}
                    </button>
                  );
                })}
              </div>
            ))}
            {hasBlockedRequiredGroup(item.options) && (
              <p className="text-g-meta text-muted">
                Tous les choix d&apos;un groupe obligatoire sont épuisés&nbsp;: vos
                clients ne peuvent plus commander cet article.
              </p>
            )}
          </div>
        )}

        {closedBy && (
          <p className="flex items-start gap-1.5 text-g-meta">
            <AlertIcon className="size-4 shrink-0 text-ember-3" />
            <span>Fermé en ce moment ({closedBy})&nbsp;: vos clients le voient «&nbsp;Plus servi&nbsp;».</span>
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <span className="flex min-h-g-control items-center gap-2 text-g-label text-muted">
            <Switch
              checked={enVente}
              disabled={!canAvailability}
              onChange={(checked) =>
                void run(
                  () => api.setItemAvailability(item.id, checked),
                  checked ? "Article remis en vente." : "Article retiré de la vente."
                )
              }
              aria-label={`${item.name} en vente`}
            />
            {enVente ? (item.stock === 0 ? "Épuisé" : "En vente") : "Retiré"}
          </span>

          <label className="flex items-center gap-1.5 text-g-label text-muted">
            Stock
            <span className="w-24 shrink-0">
              <Input
                key={`${item.id}-${item.stock ?? ""}`}
                numeric
                inputMode="numeric"
                defaultValue={item.stock ?? ""}
                disabled={!canAvailability}
                placeholder="∞"
                aria-label={`Stock de ${item.name}`}
                onBlur={(event) => commitStock(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
            </span>
          </label>

          {printers.length > 0 && (
            <label className="flex items-center gap-1.5 text-g-label text-muted">
              Imprimante
              <Select
                value={printerId ?? ""}
                disabled={!canRoute}
                aria-label={`Imprimante de ${item.name}`}
                onChange={(e) => onPrinterChange?.(e.target.value || null)}
              >
                <option value="">—</option>
                {printers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </label>
          )}

          {canEdit && (
            <span className="ml-auto flex gap-1.5">
              {onMove && (
                <>
                  <GlassButton
                    variant="icon"
                    disabled={first}
                    onClick={() => onMove(-1)}
                    aria-label={`Monter ${item.name}`}
                  >
                    <ChevronDownIcon className="rotate-180" />
                  </GlassButton>
                  <GlassButton
                    variant="icon"
                    disabled={last}
                    onClick={() => onMove(1)}
                    aria-label={`Descendre ${item.name}`}
                  >
                    <ChevronDownIcon />
                  </GlassButton>
                </>
              )}
              <GlassButton variant="icon" onClick={onEdit} aria-label={`Modifier ${item.name}`}>
                <EditIcon />
              </GlassButton>
              <GlassButton variant="icon" onClick={onDelete} aria-label={`Supprimer ${item.name}`}>
                <TrashIcon />
              </GlassButton>
            </span>
          )}
        </div>
      </div>
    </Plate>
  );
}

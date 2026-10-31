"use client";

import { Chip, Plate } from "@/components/gestion/ui";
import { etapeArticles } from "@/lib/gestion/formules";
import type { Etape } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import type { MenuCategory } from "@/lib/menu-data";
import { etapeIncomplete } from "./etape-draft";

/** Choix cités sous une étape avant « … ». */
const NAMES_SHOWN = 3;

/**
 * « Ce que voit le client » : la tuile de la formule telle que le menu QR la
 * dessine (nom, prix en pastille, une ligne par étape), mise à jour pendant
 * que le gérant compose. La meilleure explication d'une étape, c'est de la voir.
 */
export function FormulePreview({
  name,
  price,
  etapes,
  categories,
  schedule,
  disponible,
}: {
  name: string;
  price: number | null;
  etapes: Etape[];
  categories: MenuCategory[];
  /** « Lun.–ven., 11 h 30 – 14 h 30 », ou rien si toujours proposée. */
  schedule?: string;
  disponible: boolean;
}) {
  const incomplete = etapes.some((etape) => etapeIncomplete(etape, categories));
  return (
    <div className="flex flex-col gap-2">
      <p className="g-eyebrow g-orders">Ce que voit le client</p>
      <Plate className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-g-axis font-semibold uppercase tracking-wider text-muted">Formule</p>
            <p className="font-display text-g-h2 break-words">{name.trim() || "Sans nom"}</p>
          </div>
          <span className="ember-gradient shrink-0 rounded-full px-3 py-1 text-g-label font-semibold text-background tabular-nums">
            {price === null ? "— €" : formatPrice(price)}
          </span>
        </div>

        {etapes.length === 0 ? (
          <p className="text-g-meta text-muted">
            Aucun choix pour l&rsquo;instant : ajoutez ce que le client choisit.
          </p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {etapes.map((etape, index) => {
              const choices = etapeArticles(etape, categories);
              const defaut = etape.defaut;
              const named = choices.slice(0, NAMES_SHOWN).map((choice) => choice.name);
              return (
                <li key={etape.id} className="flex flex-col gap-0.5 border-t border-hairline pt-2 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-g-body font-semibold">
                      {index + 1} · {etape.name}
                    </span>
                    <span className="text-g-meta text-muted tabular-nums">
                      {choices.length === 0
                        ? "aucun choix"
                        : `${choices.length} choix`}
                    </span>
                    {!etape.obligatoire && <Chip>facultatif</Chip>}
                    {etapeIncomplete(etape, categories) && <Chip tone="problem">À compléter</Chip>}
                  </div>
                  {named.length > 0 && (
                    <p className="truncate text-g-meta text-muted">
                      {named.join(", ")}
                      {choices.length > NAMES_SHOWN && "…"}
                    </p>
                  )}
                  {defaut && (
                    <p className="text-g-meta text-muted">
                      Proposé d&rsquo;office : {choices.find((choice) => choice.itemId === defaut)?.name}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {(schedule || !disponible || incomplete) && (
          <div className="flex flex-wrap gap-1.5 border-t border-hairline pt-3">
            {schedule && <Chip>{schedule}</Chip>}
            {!disponible && <Chip tone="problem">Retirée de la vente</Chip>}
            {incomplete && disponible && (
              <Chip tone="problem">Pas proposée tant qu&rsquo;une étape est vide</Chip>
            )}
          </div>
        )}
      </Plate>
    </div>
  );
}

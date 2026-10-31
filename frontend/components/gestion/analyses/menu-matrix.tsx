"use client";

import { useState } from "react";
import { ListPager, RankedList } from "@/components/gestion/ui";
import type { MatrixRow, Quadrant } from "@/lib/gestion/analyses";
import { ANALYSES, LIST_PAGE_SIZES } from "@/lib/gestion/constants";
import { formatPrice } from "@/lib/menu/format";
import { Card } from "./parts";

const QUADRANTS: { id: Quadrant; title: string; action: string }[] = [
  { id: "vedette", title: "Vedettes", action: "à protéger" },
  { id: "a_ajuster", title: "Populaires, marge faible", action: "prix ou portion à revoir" },
  { id: "a_pousser", title: "Rentables, peu vendus", action: "à mettre en avant" },
  { id: "a_revoir", title: "Peu vendus, marge faible", action: "à retravailler ou retirer" },
];

/*
 * La carte tient en mémoire d'un coup : la classer demande tous ses articles, et
 * elle ne grandit pas comme une liste de commandes. Le pager découpe l'affichage.
 */
function Quadrant({ title, action, rows }: { title: string; action: string; rows: MatrixRow[] }) {
  const [pageSize, setPageSize] = useState<number>(LIST_PAGE_SIZES[0]);
  const [shown, setShown] = useState<number>(LIST_PAGE_SIZES[0]);
  const visible = rows.slice(0, shown);
  return (
    <Card title={title} sub={`${rows.length} · ${action}`}>
      {rows.length === 0 ? (
        <p className="text-g-meta text-muted">—</p>
      ) : (
        <>
          <RankedList
            size="bar"
            entity="money"
            label={title}
            items={visible.map((row) => ({
              label: row.name,
              value: `×${row.units}`,
              amount: row.units,
              meta: `${row.unit_cost == null ? "≈ " : ""}${formatPrice(row.margin)}`,
            }))}
          />
          <ListPager
            shown={visible.length}
            total={rows.length}
            pageSize={pageSize}
            loading={false}
            onPageSize={(size) => {
              setPageSize(size);
              setShown(size);
            }}
            onMore={() => setShown((count) => count + pageSize)}
          />
        </>
      )}
    </Card>
  );
}

export function MenuMatrix({ rows, tooFew }: { rows: readonly MatrixRow[]; tooFew: number }) {
  return (
    <div className="grid gap-g-gap lg:grid-cols-2">
      {QUADRANTS.map((quadrant) => (
        <Quadrant
          key={quadrant.id}
          title={quadrant.title}
          action={quadrant.action}
          rows={rows.filter((row) => row.quadrant === quadrant.id).sort((a, b) => b.units - a.units)}
        />
      ))}
      {tooFew > 0 && (
        <p className="text-g-meta text-muted lg:col-span-2">
          {tooFew} article{tooFew > 1 ? "s" : ""} sous {ANALYSES.minItemUnits} ventes : trop tôt pour les classer.
        </p>
      )}
    </div>
  );
}

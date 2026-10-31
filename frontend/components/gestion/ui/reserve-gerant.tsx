"use client";

import { LockIcon } from "@/components/gestion/icons";
import { useGestion } from "@/lib/gestion/store";
import { Plate } from "./plate";

/**
 * Ce qu'un employé voit à la place d'un écran du gérant : qui peut le faire,
 * et quoi lui demander. `ask` complète « Demandez à … de » (« modifier la
 * carte »). Sans `name`, le prénom du gérant vient du store.
 */
export function ReserveGerant({ ask, name }: { ask: string; name?: string | null }) {
  return name === undefined ? <FromStore ask={ask} /> : <Body ask={ask} name={name} />;
}

function FromStore({ ask }: { ask: string }) {
  const state = useGestion();
  const gerant = state?.members.find((member) => member.role === "gerant");
  return <Body ask={ask} name={gerant?.displayName ?? null} />;
}

function Body({ ask, name }: { ask: string; name: string | null }) {
  return (
    <Plate className="flex flex-col items-center gap-3 px-5 py-6 text-center sm:flex-row sm:text-left">
      <span className="g-problem flex shrink-0 text-g-entity *:size-6">
        <LockIcon />
      </span>
      <span className="grid gap-1">
        <b className="font-semibold">Réservé au gérant</b>
        <span className="text-muted">
          {name ? `Demandez à ${name} de ${ask}.` : `Demandez au gérant de ${ask}.`}
        </span>
      </span>
    </Plate>
  );
}

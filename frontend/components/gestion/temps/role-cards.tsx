"use client";

import { useField } from "@/components/gestion/ui";
import { ROLE_TAGLINES, PICKUP_ROLE_TAGLINES } from "@/lib/gestion/constants";
import { isPickupShop, roleLabels } from "@/lib/gestion/selectors";
import { useGestion } from "@/lib/gestion/store";
import type { Role } from "@/lib/gestion/types";

/*
 * Le choix d'un rôle, expliqué là où on le choisit : trois cartes, la phrase
 * de chaque rôle et ses trois gestes du quotidien. En boutique à emporter,
 * le serveur est le comptoir et le cuisinier la préparation.
 */

const ROLES: Role[] = ["serveur", "cuisinier", "gerant"];

const GESTES: Record<Role, string[]> = {
  serveur: ["Encaisse les additions", "Sert et libère les tables", "Pointe son arrivée"],
  cuisinier: ["Voit les commandes en cuisine", "Marque un plat épuisé", "Sort les tickets"],
  gerant: ["Modifie la carte et les prix", "Gère l'équipe et le planning", "Lit les paiements"],
};

const PICKUP_GESTES: Record<Role, string[]> = {
  serveur: ["Prend en charge les commandes", "Encaisse au comptoir", "Remet les retraits"],
  cuisinier: ["Voit ce qu'il y a à produire", "Marque un article épuisé", "Suit les quantités du jour"],
  gerant: GESTES.gerant,
};

export function RoleCards({
  value,
  onChange,
  disabled,
  label = "Rôle",
}: {
  value: Role;
  onChange: (role: Role) => void;
  disabled?: boolean;
  label?: string;
}) {
  const state = useGestion();
  const pickup = isPickupShop(state);
  const labels = roleLabels(state);
  const taglines = pickup ? PICKUP_ROLE_TAGLINES : ROLE_TAGLINES;
  const gestes = pickup ? PICKUP_GESTES : GESTES;
  // Dans un Field, le groupe reprend l'étiquette et l'indication du champ.
  const field = useField();

  return (
    <div
      role="radiogroup"
      id={field?.id}
      aria-label={field ? undefined : label}
      aria-describedby={field?.describedBy}
      className="grid gap-2 sm:grid-cols-3"
    >
      {ROLES.map((role) => {
        const selected = value === role;
        return (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(role)}
            className={`g-press flex flex-col gap-2 rounded-g-card border p-4 text-left disabled:cursor-wait ${
              selected ? "border-ember-2/60 bg-surface-raised" : "border-hairline bg-background/40"
            }`}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-g-body font-semibold">{labels[role]}</span>
              <span
                aria-hidden
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                  selected ? "border-ember-2" : "border-hairline"
                }`}
              >
                {selected && <span className="ember-gradient size-2.5 rounded-full" />}
              </span>
            </span>
            <span className="text-g-meta text-muted">{taglines[role]}</span>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-g-meta">
              {gestes[role].map((geste) => (
                <li key={geste} className="flex items-start gap-1.5">
                  <span aria-hidden className="mt-1.75 size-1.5 shrink-0 rounded-full bg-g-entity g-orders" />
                  {geste}
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}

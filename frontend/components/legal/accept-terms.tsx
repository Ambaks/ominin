"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LEGAL_PATHS } from "@/lib/legal/constants";
import {
  fetchContract,
  isSignable,
  type ContractScope,
  type ContractState,
  type SignableContract,
} from "@/lib/legal/client";

/*
 * Case d'acceptation du contrat. La case est l'interface, pas la garantie :
 * les routes de paiement réécrivent la même vérification côté serveur et
 * refusent sans elle. Ce que la case apporte, c'est le consentement éclairé —
 * une case décochée par défaut, distincte de tout autre accord, et des liens
 * qui ouvrent le texte dans un onglet, donc consultable et enregistrable
 * (art. 1127-1 code civil).
 */

/** État brut, y compris inutilisable — ce dont le verrou a besoin pour décider. */
export function useContractState({
  enabled = true,
  scope = "etablissement",
}: { enabled?: boolean; scope?: ContractScope } = {}) {
  const [state, setState] = useState<ContractState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!enabled) return;
    fetchContract(scope)
      .then(setState)
      .catch(() => setError("Conditions indisponibles. Rechargez la page."));
  }, [enabled, scope]);

  useEffect(reload, [reload]);
  return { state, error, reload };
}

/*
 * Contrat prêt à être signé, ou rien. Les écrans de vente n'ont pas à
 * distinguer « pas encore chargé » de « textes non publiés » : dans les deux
 * cas il n'y a rien à faire signer, et leur bouton reste désarmé.
 */
export function useContract(
  options: { enabled?: boolean; scope?: ContractScope } = {}
) {
  const { state, error } = useContractState(options);
  return {
    contract: isSignable(state) ? state : null,
    contractError:
      error ??
      (state && !state.published
        ? "Conditions indisponibles pour le moment. Réessayez plus tard."
        : null),
  };
}

function DocLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline decoration-hairline underline-offset-2 transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  );
}

export function AcceptTerms({
  contract,
  checked,
  onChange,
  commitment,
  trainingOptOut,
  onTrainingOptOut,
  disabled,
}: {
  contract: SignableContract | null;
  checked: boolean;
  onChange: (value: boolean) => void;
  /**
   * Rappel chiffré de ce qui est engagé, affiché au-dessus de la case. Le
   * second clic du « double clic » ne vaut que si le premier montrait le prix.
   */
  commitment?: React.ReactNode;
  /** Absent ⇒ le choix de licence n'est pas proposé ici (déjà fait ailleurs). */
  trainingOptOut?: boolean;
  onTrainingOptOut?: (value: boolean) => void;
  disabled?: boolean;
}) {
  if (!contract) {
    return (
      <p className="text-xs text-faint">Chargement des conditions…</p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface/60 p-4">
      {commitment && (
        <div className="text-sm leading-relaxed text-foreground">
          {commitment}
        </div>
      )}
      <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-muted">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
          required
          className="mt-0.5 size-4 shrink-0 accent-[var(--ember-2)]"
        />
        <span>
          J’ai lu et j’accepte les{" "}
          <DocLink href={LEGAL_PATHS.cgv}>conditions générales de vente</DocLink>{" "}
          (version {contract.versions.cgv}) et l’
          <DocLink href={LEGAL_PATHS.dpa}>accord de sous-traitance</DocLink>{" "}
          (version {contract.versions.dpa}).
        </span>
      </label>

      {onTrainingOptOut && (
        <label className="flex cursor-pointer items-start gap-2.5 border-t border-hairline pt-3 text-xs leading-relaxed text-muted">
          <input
            type="checkbox"
            checked={trainingOptOut ?? false}
            onChange={(event) => onTrainingOptOut(event.target.checked)}
            disabled={disabled}
            className="mt-0.5 size-4 shrink-0 accent-[var(--ember-2)]"
          />
          <span>
            Je refuse que les données personnelles de mes clients, une fois
            anonymisées, servent à améliorer et entraîner les modèles d’Ominin.
            Mes données d’exploitation restent couvertes par les conditions.{" "}
            <DocLink href={LEGAL_PATHS.dpa}>En savoir plus</DocLink>
          </span>
        </label>
      )}
    </div>
  );
}

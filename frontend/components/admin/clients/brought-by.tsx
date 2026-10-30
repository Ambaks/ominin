"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { fetchBroughtBy } from "@/lib/admin/commerciaux";

/** Null tant que la réponse n'est pas là : rien ne s'affiche, plutôt qu'un faux « fondateurs ». */
export function useBroughtBy(): Map<string, string> | null {
  const toast = useToast();
  const [broughtBy, setBroughtBy] = useState<Map<string, string> | null>(null);

  useEffect(() => {
    fetchBroughtBy()
      .then(setBroughtBy)
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.")
      );
    // toast est stable (contexte) ; la liste ne se charge qu'une fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return broughtBy;
}

export const broughtByLabel = (
  broughtBy: Map<string, string> | null,
  clientId: string
): string | null =>
  broughtBy && `Ramené par ${broughtBy.get(clientId) ?? "les fondateurs"}`;

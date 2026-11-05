"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmSheet } from "@/components/gestion/ui";
import { useRunMutation } from "@/components/ui/toast";
import { removeRestaurant } from "@/lib/commercial/api";
import { spaceHref } from "./shell";
import { ghostButton } from "./ui";

/* Retire le restaurant du tableau de bord et le libère ; son passage reste visible des autres sur la carte. */
export function RemoveRestaurant({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const run = useRunMutation();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setConfirming(true)} className={ghostButton}>
        Supprimer ce restaurant
      </button>
      {confirming && (
        <ConfirmSheet
          title="Supprimer ce restaurant"
          text={`${name} quitte ton tableau de bord et redevient libre pour tous les commerciaux. Ton passage reste visible sur la carte.`}
          confirmLabel="Supprimer"
          destructive
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            void run(async () => {
              setConfirming(false);
              await removeRestaurant(id);
              router.push(spaceHref("/tableau"));
            }, "Restaurant retiré")
          }
        />
      )}
    </>
  );
}

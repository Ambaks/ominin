"use client";

import { useParams } from "next/navigation";
import { RemiseView } from "@/components/gestion/remise/remise-view";
import { GlassButton, Mesh } from "@/components/gestion/ui";

/*
 * Un code de retrait scanné à l'appareil photo du téléphone : la remise,
 * seule à l'écran — sans l'espace de gestion (GestionShell), qui chargeait
 * pour chaque scan un mois de commandes. Sans le shell, la page pose
 * elle-même l'aura. Le scanner de l'espace montre la même remise sans
 * quitter l'application.
 */
export default function RemisePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <Mesh />
      <main className="relative z-1 mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <RemiseView
          orderId={id}
          actions={(manual) => (
            // Collé au bas de l'écran, la remise à faire comprise : rien ne se
            // cache sous une longue commande ni sur un petit téléphone.
            <div className="sticky bottom-0 -mx-5 mt-auto flex flex-col gap-3 border-t border-hairline bg-background px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              {manual?.action}
              <GlassButton href="/gestion/commandes" variant={manual ? "secondary" : "primary"} className="w-full">
                Voir les commandes
              </GlassButton>
            </div>
          )}
        />
      </main>
    </>
  );
}

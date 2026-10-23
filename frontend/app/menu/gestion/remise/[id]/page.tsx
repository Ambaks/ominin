"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FOCUS_RING, RemiseView } from "@/components/gestion/remise/remise-view";

/*
 * Un code de retrait scanné à l'appareil photo du téléphone : la remise,
 * seule à l'écran — sans l'espace de gestion (GestionShell), qui chargeait
 * pour chaque scan un mois de commandes. Le scanner de l'espace montre la
 * même remise sans quitter l'application.
 */
export default function RemisePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <RemiseView
        orderId={id}
        actions={(manual) => (
          <>
            {manual?.action}
            <Link
              href="/gestion/commandes"
              className={`flex min-h-11 items-center justify-center rounded-full border border-hairline px-5 text-sm font-semibold ${FOCUS_RING}`}
            >
              Voir les commandes
            </Link>
          </>
        )}
      />
    </main>
  );
}

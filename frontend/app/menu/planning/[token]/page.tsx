import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanningPublic } from "@/components/gestion/temps/planning-public";
import { createPublicClient } from "@/lib/supabase/public";
import { addDays, weekStart } from "@/lib/gestion/temps";

/*
 * Le planning d'un serveur, ouvert par le lien que son gérant lui a envoyé.
 * Pas de compte, pas de connexion : le jeton de l'adresse suffit, et la
 * fonction qui répond ne rend que ses créneaux — et ses heures, si Ominin
 * les a ouvertes au restaurant. Rien n'est indexé : un planning nominatif
 * n'a pas à se retrouver dans un moteur.
 */

export const metadata: Metadata = {
  title: "Mon planning",
  robots: { index: false, follow: false },
};

export interface PlanningPayload {
  name: string;
  etablissement: string;
  /** Le restaurant montre-t-il les heures (total prévu, badgeages) sur le lien ? */
  hours: boolean;
  shifts: { id: string; starts_at: string; ends_at: string; note: string | null }[];
  entries: { id: string; started_at: string; ended_at: string | null }[];
}

export default async function PlanningPage({
  params,
}: PageProps<"/menu/planning/[token]">) {
  const { token } = await params;
  const start = weekStart(new Date());
  const { data } = await createPublicClient().rpc("staff_planning", {
    p_token: token,
    p_from: start.toISOString(),
    p_to: addDays(start, 7).toISOString(),
  });
  const payload = data as unknown as PlanningPayload | null;
  if (!payload) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-10 lg:py-14">
      <div>
        <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
          {payload.etablissement}
        </p>
        <h1 className="mt-1 font-display text-2xl font-medium tracking-tight lg:text-3xl">
          {payload.name}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Votre semaine. Conservez ce lien, il reste le vôtre.
        </p>
      </div>
      <PlanningPublic payload={payload} start={start.toISOString()} />
    </main>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OFFRE_LABELS } from "@/lib/gestion/constants";
import type { Offre } from "@/lib/gestion/types";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Bienvenue — Ominin",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage({
  searchParams,
}: PageProps<"/onboarding">) {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("memberships")
    .select("etablissement_id")
    .limit(1)
    .maybeSingle();

  // Déjà rattaché à un établissement (invitation ou onboarding passé).
  if (membership) redirect("/gestion");

  // Offre choisie sur la landing, transportée par ?plan= tout au long du funnel.
  const { plan } = await searchParams;
  const initialOffre =
    typeof plan === "string" && plan in OFFRE_LABELS
      ? (plan as Offre)
      : undefined;

  return <OnboardingForm initialOffre={initialOffre} />;
}

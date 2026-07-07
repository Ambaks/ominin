import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Bienvenue — Ominin",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("memberships")
    .select("etablissement_id")
    .limit(1)
    .maybeSingle();

  // Déjà rattaché à un établissement (invitation ou onboarding passé).
  if (membership) redirect("/gestion");

  return <OnboardingForm />;
}

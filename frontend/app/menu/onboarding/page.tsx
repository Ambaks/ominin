import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Offre } from "@/lib/gestion/types";
import { parseQuote } from "@/lib/quote";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";
import { StaffPending } from "./staff-pending";

export const metadata: Metadata = {
  title: "Bienvenue — Ominin",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage({
  searchParams,
}: PageProps<"/menu/onboarding">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: membership } = await supabase
    .from("memberships")
    .select("etablissement_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) redirect("/gestion");

  if (user.user_metadata?.profile === "staff") {
    return <StaffPending />;
  }

  // parseQuote ne retient qu'une offre publiée sur la landing : son id est
  // donc une valeur d'Offre.
  const quote = parseQuote(await searchParams);

  return (
    <OnboardingForm
      initialOffre={quote?.plan as Offre | undefined}
      initialTables={quote?.tables}
      starter={quote && { omilink: quote.omilink, square: quote.square }}
    />
  );
}

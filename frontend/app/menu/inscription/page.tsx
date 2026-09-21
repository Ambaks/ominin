import type { Metadata } from "next";
import { parseQuote, quoteQuery } from "@/lib/quote";
import { InscriptionTabs } from "./inscription-tabs";

export const metadata: Metadata = {
  title: "Créer un compte — Ominin",
  robots: { index: false, follow: false },
};

export default async function InscriptionPage({
  searchParams,
}: PageProps<"/menu/inscription">) {
  const params = await searchParams;
  // Devis composé sur /devis (offre, tables, branchements) : revalidé ici,
  // il repart tel quel vers l'onboarding.
  const quote = parseQuote(params);
  return (
    <InscriptionTabs
      quoteQuery={quote ? quoteQuery(quote) : undefined}
      authError={params.error === "auth"}
    />
  );
}

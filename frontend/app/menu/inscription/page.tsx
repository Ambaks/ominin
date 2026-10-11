import type { Metadata } from "next";
import { decodeSetup, SETUP_PARAM, withSetup } from "@/lib/composer";
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
  // Devis composé sur /devis ou /composer (offre, tables, branchements, et
  // les réponses du composeur) : revalidé ici, il repart vers l'onboarding.
  const quote = parseQuote(params);
  return (
    <InscriptionTabs
      quoteQuery={
        quote ? withSetup(quoteQuery(quote), decodeSetup(params[SETUP_PARAM])) : undefined
      }
      authError={params.error === "auth"}
    />
  );
}

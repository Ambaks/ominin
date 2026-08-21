import type { Metadata } from "next";
import { InscriptionTabs } from "./inscription-tabs";

export const metadata: Metadata = {
  title: "Créer un compte — Ominin",
  robots: { index: false, follow: false },
};

export default async function InscriptionPage({
  searchParams,
}: PageProps<"/menu/inscription">) {
  const { error, plan } = await searchParams;
  const chosenPlan = typeof plan === "string" ? plan : undefined;
  return (
    <InscriptionTabs
      chosenPlan={chosenPlan}
      authError={error === "auth"}
    />
  );
}

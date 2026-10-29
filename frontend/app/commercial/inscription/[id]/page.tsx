import { SignupQuestionnaire } from "@/components/commercial/signup/questionnaire";

/*
 * Le questionnaire d'inscription d'un restaurant, ouvert par le QR du
 * commercial ou sur son téléphone. Public : son id est le jeton.
 */
export default async function InscriptionPage({ params }: PageProps<"/commercial/inscription/[id]">) {
  const { id } = await params;
  const hubriseManagerUrl = process.env.HUBRISE_MANAGER_URL;
  if (!hubriseManagerUrl) throw new Error("HUBRISE_MANAGER_URL manquant.");
  return <SignupQuestionnaire id={id} hubriseManagerUrl={hubriseManagerUrl} />;
}

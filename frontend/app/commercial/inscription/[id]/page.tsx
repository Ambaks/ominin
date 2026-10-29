import { SignupQuestionnaire } from "@/components/commercial/signup/questionnaire";

/*
 * Le questionnaire d'inscription d'un restaurant, ouvert par le QR du
 * commercial ou sur son téléphone. Public : son id est le jeton.
 */
export default async function InscriptionPage({ params }: PageProps<"/commercial/inscription/[id]">) {
  const { id } = await params;
  return <SignupQuestionnaire id={id} hubriseManagerUrl={process.env.HUBRISE_MANAGER_URL ?? null} />;
}

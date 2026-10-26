import { LinkRequestForm } from "@/components/commercial/link-request-form";

export default async function CommercialConnexionPage({
  searchParams,
}: PageProps<"/commercial/connexion">) {
  const { error } = await searchParams;
  return <LinkRequestForm authError={error === "auth"} />;
}

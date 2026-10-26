import { NewRestaurantScreen } from "@/components/commercial/space/new-restaurant";

export default async function NouveauRestaurantPage({
  searchParams,
}: PageProps<"/commercial/espace/restaurants/nouveau">) {
  const { nom } = await searchParams;
  return <NewRestaurantScreen initialName={typeof nom === "string" ? nom : ""} />;
}

import { RestaurantScreen } from "@/components/commercial/space/restaurant";

export default async function RestaurantPage({ params }: PageProps<"/commercial/espace/restaurants/[id]">) {
  const { id } = await params;
  return <RestaurantScreen id={id} />;
}

import { KitNav } from "@/components/landing-kit/nav";
import { nav } from "@/lib/shop-landing-data";
import { ShopWordmark } from "./wordmark";

export function ShopNav() {
  return <KitNav wordmark={<ShopWordmark className="text-base sm:text-lg" />} links={nav.links} login={nav.login} cta={nav.cta} />;
}

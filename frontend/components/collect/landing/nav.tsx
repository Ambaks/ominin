import { KitNav } from "@/components/landing-kit/nav";
import { nav, signupCta } from "@/lib/collect-landing-data";
import { CollectWordmark } from "./wordmark";

export function CollectNav() {
  return (
    <KitNav
      wordmark={<CollectWordmark className="text-base sm:text-lg" />}
      links={nav.links}
      login={nav.login}
      cta={signupCta}
    />
  );
}

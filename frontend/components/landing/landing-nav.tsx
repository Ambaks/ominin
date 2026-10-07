import { KitNav } from "@/components/landing-kit/nav";
import { brand, nav, signupCta } from "@/lib/landing-data";

export function LandingNav() {
  return (
    <KitNav
      wordmark={<span className="ember-text font-display text-base font-semibold sm:text-lg">{brand}</span>}
      links={nav.links}
      login={nav.login}
      cta={signupCta}
    />
  );
}

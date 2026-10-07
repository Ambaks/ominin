import { KitFinalCta } from "@/components/landing-kit/final-cta";
import { finalCta, signupCta } from "@/lib/collect-landing-data";
import { contactEmail } from "@/lib/landing-data";

export function CollectFinalCta() {
  return (
    <KitFinalCta
      id={finalCta.id}
      title={finalCta.title}
      subtitle={finalCta.subtitle}
      primary={signupCta}
      secondary={{ label: finalCta.contactLabel, href: `mailto:${contactEmail}` }}
      microcopy={finalCta.microcopy}
    />
  );
}

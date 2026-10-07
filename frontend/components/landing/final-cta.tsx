import { KitFinalCta } from "@/components/landing-kit/final-cta";
import { contactEmail, demoCta, finalCta } from "@/lib/landing-data";

export function FinalCta() {
  return (
    <KitFinalCta
      id={finalCta.id}
      title={finalCta.title}
      subtitle={finalCta.subtitle}
      primary={demoCta}
      secondary={{ label: finalCta.contactLabel, href: `mailto:${contactEmail}` }}
      microcopy={finalCta.microcopy}
    />
  );
}

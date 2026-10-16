"use client";

import { KitFinalCta } from "@/components/landing-kit/final-cta";
import { useLanguage } from "@/lib/portal/language";
import { finalCta } from "@/lib/portal-data";

/* Le portail se referme sur l'appel au sur-mesure, dans le bloc braise du kit. */
export function PortalFinalCta() {
  const { t } = useLanguage();

  return (
    <KitFinalCta
      id="contact"
      title={t(finalCta.titleLead)}
      subtitle={t(finalCta.body)}
      primary={{ label: t(finalCta.cta.label), href: finalCta.cta.href }}
      secondary={{ label: t(finalCta.secondary.label), href: finalCta.secondary.href }}
      microcopy={finalCta.microcopy.map(t)}
    />
  );
}

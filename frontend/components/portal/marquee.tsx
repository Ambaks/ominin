"use client";

import { Marquee } from "@/components/landing-kit/marquee";
import { useLanguage } from "@/lib/portal/language";
import { marquee } from "@/lib/portal-data";

export function PortalMarquee() {
  const { t } = useLanguage();
  return <Marquee words={marquee.map(t)} />;
}

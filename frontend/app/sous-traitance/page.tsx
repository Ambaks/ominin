import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL_PATHS } from "@/lib/legal/constants";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Accord de sous-traitance (RGPD) — Ominin",
  description:
    "L'accord de sous-traitance au sens de l'art. 28 du RGPD : traitements confiés à Ominin, durée, sécurité, sous-traitants ultérieurs et sort des données.",
  alternates: { canonical: `${siteUrl}${LEGAL_PATHS.dpa}` },
};

export const dynamic = "force-dynamic";

export default function SousTraitancePage() {
  return <LegalPage doc="dpa" />;
}

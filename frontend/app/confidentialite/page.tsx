import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL_PATHS } from "@/lib/legal/constants";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Ominin",
  description:
    "Quelles données Ominin collecte, pourquoi, combien de temps elles sont conservées, avec qui elles sont partagées et comment exercer vos droits.",
  alternates: { canonical: `${siteUrl}${LEGAL_PATHS.confidentialite}` },
};

export const dynamic = "force-dynamic";

export default function ConfidentialitePage() {
  return <LegalPage doc="confidentialite" />;
}

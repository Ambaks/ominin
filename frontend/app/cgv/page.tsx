import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL_PATHS } from "@/lib/legal/constants";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conditions générales de vente — Ominin",
  description:
    "Les conditions générales de vente des offres Ominin : abonnement, commission, durée, résiliation et responsabilités.",
  // Le même texte est servi sur tous les hôtes produits : une seule adresse
  // canonique, sur le domaine principal.
  alternates: { canonical: `${siteUrl}${LEGAL_PATHS.cgv}` },
};

/*
 * Rendu à la demande : la version en vigueur dépend de la date du jour, pas
 * de celle du déploiement. Une version publiée en préavis doit prendre effet
 * le jour dit, sans qu'il faille redéployer.
 */
export const dynamic = "force-dynamic";

export default function CgvPage() {
  return <LegalPage doc="cgv" />;
}

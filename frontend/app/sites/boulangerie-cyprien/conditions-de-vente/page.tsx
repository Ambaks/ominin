import type { Metadata } from "next";
import Link from "next/link";
import { LegalText, type LegalSection } from "@/components/sites/cyprien/legal";
import { PageHero } from "@/components/sites/cyprien/ui";
import { contact, cyprienHref, legal, orderPath, pickupShop, telHref } from "@/lib/sites/cyprien";

export const metadata: Metadata = {
  title: "Conditions de vente",
  description: "Conditions de vente de la commande en ligne de la Boulangerie Cyprien : paiement en ligne, retrait en boutique.",
};

const sections: LegalSection[] = [
  {
    id: "vendeur",
    title: "Vendeur",
    body: (
      <p>
        Les produits sont vendus par {legal.company} ({legal.form}), nom commercial {legal.brand}, {legal.seat},{" "}
        {legal.rcs}.
      </p>
    ),
  },
  {
    id: "commande",
    title: "Commande",
    body: (
      <p>
        La commande se passe en ligne, sur la <Link href={cyprienHref(orderPath)}>page de commande</Link> : vous
        choisissez vos produits et le créneau de retrait, puis vous validez et payez. Gâteaux et entremets se
        commandent à l’avance.
      </p>
    ),
  },
  {
    id: "prix",
    title: "Prix",
    body: <p>Les prix sont indiqués en euros, toutes taxes comprises. Le prix applicable est celui affiché au moment de la commande.</p>,
  },
  {
    id: "paiement",
    title: "Paiement",
    body: <p>La commande se paie en ligne, par carte bancaire, au moment où elle est passée.</p>,
  },
  {
    id: "retrait",
    title: "Retrait",
    body: (
      <p>
        La commande se retire à la boutique {pickupShop.name}, {pickupShop.street}, {pickupShop.city}, au créneau
        choisi lors de la commande. Les commandes passées sur ce site ne sont pas livrées.
      </p>
    ),
  },
  {
    id: "retractation",
    title: "Droit de rétractation",
    body: (
      <p>
        Conformément à l’article L221-28 du Code de la consommation, le droit de rétractation ne s’applique pas aux
        denrées périssables, qui se détériorent ou se périment rapidement : c’est le cas de nos produits.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Une question, une réclamation",
    body: (
      <p>
        Écrivez-nous à <a href={`mailto:${contact.email}`}>{contact.email}</a> ou appelez la boutique au{" "}
        <a href={telHref(contact.phone)}>{contact.phone}</a>.
      </p>
    ),
  },
  {
    id: "droit",
    title: "Droit applicable",
    body: <p>Les présentes conditions sont soumises au droit français.</p>,
  },
];

export default function ConditionsDeVentePage() {
  return (
    <>
      <PageHero
        eyebrow="Commande en ligne"
        title={["Conditions", <em key="e">de vente</em>]}
        intro="Commander en ligne chez Cyprien, en quelques règles simples."
      />
      <LegalText sections={sections} />
    </>
  );
}

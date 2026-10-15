import type { Metadata } from "next";
import Link from "next/link";
import { LegalText, type LegalSection } from "@/components/sites/cyprien/legal";
import { PageHero } from "@/components/sites/cyprien/ui";
import { siteUrl } from "@/lib/site";
import { contact, cyprienHref, legal, telHref } from "@/lib/sites/cyprien";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales et données personnelles du site de la Boulangerie Cyprien (CO’PAINS, Toulouse).",
};

const sections: LegalSection[] = [
  {
    id: "editeur",
    title: "Éditeur",
    body: (
      <dl>
        <div>
          <dt>Société</dt>
          <dd>
            {legal.company}, {legal.form}
          </dd>
        </div>
        <div>
          <dt>Nom commercial</dt>
          <dd>{legal.brand}</dd>
        </div>
        <div>
          <dt>Siège social</dt>
          <dd>{legal.seat}</dd>
        </div>
        <div>
          <dt>Immatriculation</dt>
          <dd>{legal.rcs}</dd>
        </div>
        <div>
          <dt>TVA intracommunautaire</dt>
          <dd>{legal.vat}</dd>
        </div>
        <div>
          <dt>Directeur de la publication</dt>
          <dd>{legal.publisher}</dd>
        </div>
        <div>
          <dt>Contact</dt>
          <dd>
            <a href={`mailto:${contact.email}`}>{contact.email}</a> · <a href={telHref(contact.phone)}>{contact.phone}</a>
          </dd>
        </div>
      </dl>
    ),
  },
  {
    id: "hebergement",
    title: "Hébergement",
    body: <p>Le site est hébergé par {legal.host}.</p>,
  },
  {
    id: "conception",
    title: "Conception",
    body: (
      <>
        <p>
          Conception du site et commande en ligne : <a href={siteUrl}>Ominin</a>.
        </p>
        <p>Photographies : Boulangerie Cyprien.</p>
      </>
    ),
  },
  {
    id: "propriete",
    title: "Propriété intellectuelle",
    body: (
      <p>
        Les marques « CYPRIEN » et « CYPRIEN C BOULANGERIE &amp; PATISSERIE 100% ARTISANALE », le cachet, les textes
        et les photographies de ce site appartiennent à {legal.company}. Toute reproduction sans accord écrit préalable
        est interdite.
      </p>
    ),
  },
  {
    id: "donnees",
    title: "Données personnelles",
    body: (
      <>
        <p>
          Ce site ne dépose aucun cookie de mesure d’audience ni de publicité : c’est pourquoi aucune bannière ne vous
          demande votre consentement.
        </p>
        <p>
          Lorsque vous commandez en ligne, vos nom, numéro de téléphone et le contenu de votre commande servent
          uniquement à préparer votre commande et à vous la remettre. Ils ne sont ni vendus ni cédés. Les données de
          carte bancaire sont traitées par le prestataire de paiement et ne sont jamais conservées par {legal.company}.
        </p>
        <p>
          Vous pouvez demander l’accès à vos données, leur rectification ou leur suppression en écrivant à{" "}
          <a href={`mailto:${contact.email}`}>{contact.email}</a>. Vous pouvez aussi adresser une réclamation à la CNIL
          (<a href="https://www.cnil.fr">cnil.fr</a>).
        </p>
      </>
    ),
  },
  {
    id: "vente",
    title: "Commande en ligne",
    body: (
      <p>
        Les commandes passées sur ce site sont régies par nos{" "}
        <Link href={cyprienHref("/conditions-de-vente")}>conditions de vente</Link>.
      </p>
    ),
  },
];

export default function MentionsLegalesPage() {
  return (
    <>
      <PageHero
        eyebrow="Informations"
        title={["Mentions", <em key="e">légales</em>]}
        intro="Qui édite ce site, qui l’héberge, et ce que nous faisons de vos données."
      />
      <LegalText sections={sections} />
    </>
  );
}

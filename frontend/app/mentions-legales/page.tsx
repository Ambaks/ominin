import type { Metadata } from "next";
import {
  LegalShell,
  legalHeadingClass,
  legalLabelClass,
} from "@/components/legal/legal-page";
import { contactEmail } from "@/lib/landing-data";
import {
  LEGAL_PATHS,
  editor,
  editorLegalName,
  hosts,
} from "@/lib/legal/constants";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales — Ominin",
  description:
    "Éditeur, statut, identification, directeur de la publication et hébergeurs du site Ominin.",
  alternates: { canonical: `${siteUrl}${LEGAL_PATHS.mentions}` },
};

/*
 * Page non versionnée : elle décrit l'éditeur, pas un engagement contractuel.
 * Elle reprend la coquille des documents pour rester du même texte à l'œil,
 * mais sans empreinte ni date d'effet.
 *
 * SIREN, RCS et adresse viennent de l'environnement et peuvent manquer tant
 * que l'immatriculation n'est pas faite : une mention obligatoire absente est
 * une infraction, une mention visiblement à compléter est un oubli qu'on
 * voit. On rend donc l'un plutôt que l'autre — jamais une ligne vide.
 */
const MISSING = "à compléter";

function Row({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const filled = value.trim().length > 0;
  return (
    <div className="grid gap-1 border-b border-hairline py-3 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:gap-5 print:border-black/25">
      <dt className={`${legalLabelClass} sm:pt-1`}>{label}</dt>
      <dd className="text-[15px] leading-7 text-muted">
        {!filled ? (
          <span className="font-semibold text-ember-3">« {MISSING} »</span>
        ) : href ? (
          <a href={href} className="transition-colors hover:text-foreground">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

export default function MentionsLegalesPage() {
  return (
    <LegalShell
      title="Mentions légales"
      lead="Qui édite ce site, qui l'héberge, et comment nous joindre."
      meta="Mentions obligatoires — art. 6-III de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique."
      current="mentions"
    >
      <section id="editeur" className="scroll-mt-8 break-inside-avoid">
        <h2 className={legalHeadingClass}>Éditeur du site</h2>
        <dl className="mt-4">
          <Row label="Éditeur" value={editorLegalName} />
          <Row label="Statut" value={editor.status} />
          <Row label="Adresse" value={editor.address} />
          <Row label="SIREN" value={editor.siren} />
          <Row label="RCS" value={editor.rcs} />
          <Row label="TVA" value={editor.vatMention} />
          <Row label="Directeur de la publication" value={editor.name} />
          <Row
            label="Contact"
            value={contactEmail}
            href={`mailto:${contactEmail}`}
          />
        </dl>
      </section>

      <section id="hebergement" className="scroll-mt-8 break-inside-avoid">
        <h2 className={legalHeadingClass}>Hébergement</h2>
        <p className="mt-4 text-[15px] leading-7 text-muted">
          Le site et les applications Ominin sont hébergés par les prestataires
          suivants, chacun joignable à l&apos;adresse indiquée.
        </p>
        <ul className="mt-6 space-y-6">
          {hosts.map((host) => (
            <li key={host.name}>
              <p className="text-[15px] font-medium leading-7">{host.name}</p>
              <p className="text-sm leading-relaxed text-muted">{host.role}</p>
              <p className="mt-1 text-sm leading-relaxed text-faint">
                {host.address}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </LegalShell>
  );
}

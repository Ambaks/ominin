import { redirect } from "next/navigation";
import { CommercialShell } from "@/components/commercial/shell";
import { SignForm } from "@/components/commercial/sign-form";
import { SignedHeading } from "@/components/commercial/signed-heading";
import {
  LegalArticles,
  legalBodyClass,
  legalLabelClass,
} from "@/components/legal/legal-page";
import {
  parisDateTime,
  signatureRecord,
  signatureStatement,
} from "@/lib/commercial/record";
import { contactEmail } from "@/lib/landing-data";
import {
  latestCommercialSignature,
  publishedCommercialVersion,
  type CommercialSignature,
} from "@/lib/legal/commercial";
import { versionInForce } from "@/lib/legal/documents";
import { frenchDate } from "@/lib/legal/format";
import { shortHash } from "@/lib/legal/hash";
import { LegalVersionError, type LegalDocument } from "@/lib/legal/types";
import { commercialPrefix } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Ancre du bloc de signature, cible du lien « Aller à la signature ». */
const SIGN_ANCHOR = "signer";

function ContactLink() {
  return (
    <a href={`mailto:${contactEmail}`} className="underline">
      {contactEmail}
    </a>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
      <h1 className="font-display text-xl font-medium">{title}</h1>
      <div className={`mt-2 ${legalBodyClass}`}>{children}</div>
    </div>
  );
}

function Signed({
  signature,
  superseded,
}: {
  signature: CommercialSignature;
  /** Une version plus récente existe mais n'est pas encore ouverte à la signature. */
  superseded: boolean;
}) {
  const { document } = signature;
  return (
    <div className="flex flex-col gap-12">
      <section className="rounded-2xl border border-ember-2/30 bg-surface p-5 sm:p-6 print:border-black/40">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ember-2">
          Contrat signé
        </p>
        <SignedHeading>{document.title}</SignedHeading>
        <p className="mt-2 text-sm text-muted">
          Signé le {parisDateTime(signature.acceptedAt)} (heure de Paris).
          Votre exemplaire PDF vous est envoyé par e-mail ; vous pouvez aussi
          le télécharger ici.
        </p>
        <a
          href="/api/commercial/contrat"
          className="ember-gradient mt-4 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-background print:hidden"
        >
          Télécharger mon exemplaire (PDF)
        </a>
        {superseded && (
          <p className="mt-2 text-sm text-muted">
            Une nouvelle version du contrat sera bientôt proposée à la
            signature ; celle-ci reste en vigueur d’ici là.
          </p>
        )}
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {signatureRecord(signature).map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted">{label}</dt>
              <dd
                className={`min-w-0 ${label === "Empreinte SHA-256" ? "break-all font-mono text-xs leading-5" : "break-words"}`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {signatureStatement(signature)}
        </p>
        <div className="mt-5 border-t border-hairline pt-4 text-sm leading-relaxed text-muted print:hidden">
          <p className="font-medium text-foreground">Prochaine étape</p>
          <p className="mt-1">
            L’article 2.5 demande votre avis de situation SIRENE (Insee) à la
            signature : envoyez-le à <ContactLink />. Il se télécharge
            gratuitement sur le site de l’Insee avec votre SIRET.
          </p>
        </div>
      </section>
      <LegalArticles document={document} />
    </div>
  );
}

/** Les engagements qui comptent, rédigés avec la version. Le contrat seul fait foi. */
function Essentials({ document }: { document: LegalDocument }) {
  if (!document.essentials) return null;
  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
      <h2 className="font-display text-lg font-medium">L’essentiel</h2>
      <ul className={`mt-3 ml-5 list-disc space-y-2 marker:text-ember-2 ${legalBodyClass}`}>
        {document.essentials.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Ce résumé aide à la lecture ; seul le contrat ci-dessous, version{" "}
        {document.version}, vous engage.
      </p>
      <a
        href={`#${SIGN_ANCHOR}`}
        className="mt-4 inline-flex rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
      >
        Aller à la signature ↓
      </a>
    </section>
  );
}

/*
 * Garde serveur (le proxy la double), puis l'espace : le contrat à signer, ou
 * le contrat signé. La fiche se lit par le compte que l'invitation lui a
 * rattaché (lib/commercial/access.ts), jamais par l'adresse e-mail.
 */
export default async function CommercialEspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect(`${commercialPrefix}/connexion`);
  const email = user.email.toLowerCase();

  const { data: commercial, error } = await supabase
    .from("commerciaux")
    .select("id, email, first_name, last_name, siret, address, phone")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!commercial) {
    return (
      <CommercialShell email={email}>
        <Notice title="Espace réservé">
          Cet espace est réservé aux commerciaux invités par Ominin. Si vous
          pensez qu’il s’agit d’une erreur, écrivez-nous à <ContactLink />.
        </Notice>
      </CommercialShell>
    );
  }

  const admin = createAdminClient();
  const signature = await latestCommercialSignature(admin, commercial.id);
  const current = versionInForce("commercial").version;
  if (signature?.document.version === current) {
    return (
      <CommercialShell email={email}>
        <Signed signature={signature} superseded={false} />
      </CommercialShell>
    );
  }

  let published: Awaited<ReturnType<typeof publishedCommercialVersion>>;
  try {
    published = await publishedCommercialVersion(admin);
  } catch (cause) {
    if (!(cause instanceof LegalVersionError)) throw cause;
    console.error("[commercial]", cause.message);
    return (
      <CommercialShell email={email}>
        {signature ? (
          <Signed signature={signature} superseded />
        ) : (
          <Notice title="Contrat bientôt disponible">
            Le contrat n’est pas encore ouvert à la signature. Réessayez un peu
            plus tard, ou écrivez-nous à <ContactLink />.
          </Notice>
        )}
      </CommercialShell>
    );
  }
  const { document, hash } = published;

  return (
    <CommercialShell email={email}>
      <div className="mb-10">
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
          {document.title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">{document.lead}</p>
        <p className="mt-5 text-xs text-muted">
          Version {document.version} · empreinte {shortHash(hash)}
        </p>
        {signature && (
          <p className="mt-3 text-sm text-muted">
            Vous avez signé la version {signature.document.version} le{" "}
            {frenchDate(signature.acceptedAt)}. Elle reste celle qui vous
            engage tant que vous ne signez pas celle-ci ;{" "}
            <a href="/api/commercial/contrat" className="underline">
              télécharger son exemplaire (PDF)
            </a>
            .
          </p>
        )}
      </div>
      <SignForm
        key={document.version}
        version={document.version}
        email={commercial.email}
        anchor={SIGN_ANCHOR}
        initial={{
          firstName: commercial.first_name ?? "",
          lastName: commercial.last_name ?? "",
          siret: commercial.siret ?? "",
          address: commercial.address ?? "",
          phone: commercial.phone ?? "",
        }}
        essentials={<Essentials document={document} />}
      >
        <p className={legalLabelClass}>Le contrat</p>
        <LegalArticles document={document} />
      </SignForm>
    </CommercialShell>
  );
}
